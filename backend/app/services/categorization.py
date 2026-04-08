"""Categorization service — orchestrates rule engine + LLM fallback.

Pipeline per transaction:
  1. apply_rule_engine → exact match by pattern
  2. If no match and budget allows → LLM batch call
  3. If budget exhausted or LLM returns None → source="uncategorized"

All queries include household_id (T-3-01 mitigation).
Background task creates its own session — never reuses request session (RESEARCH.md Pitfall 1).
"""

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.budget_guard import check_budget, record_usage
from app.ai.llm_client import suggest_categories_batch
from app.ai.merchant_extractor import extract_merchant_name
from app.ai.rule_engine import increment_hit_count, load_active_rules, match_rules, upsert_rule
from app.config import Settings
from app.database import async_session_factory
from app.models.transaction import Transaction
from app.schemas.categorization import CategorizationResult
from app.services import category as category_service

logger = logging.getLogger(__name__)

# Estimated tokens per LLM categorization call (used for budget tracking)
_TOKENS_PER_CALL = 500


async def categorize_transactions(
    session: AsyncSession,
    household_id: uuid.UUID,
    transaction_ids: list[int],
) -> list[CategorizationResult]:
    """Categorize transactions via rule engine first, then LLM fallback.

    1. Load transactions scoped to household (T-3-01 mitigation).
    2. For each: apply rule engine. If match → set category + source="rule".
    3. Collect unmatched. If budget allows: batch LLM call.
    4. If budget exhausted: unmatched get source="uncategorized".

    Returns a list of CategorizationResult for ALL input transaction_ids.
    """
    if not transaction_ids:
        return []

    # Load transactions — household-scoped (T-3-01)
    q = select(Transaction).where(
        Transaction.household_id == household_id,
        Transaction.id.in_(transaction_ids),
        Transaction.is_active.is_(True),
    )
    result = await session.execute(q)
    transactions = list(result.scalars().all())

    # Load available categories (assignable — excludes system categories)
    cats, _ = await category_service.list_categories(
        session, household_id, assignable=True, page_size=200
    )
    available_categories = [{"id": c.id, "name_en": c.name_en} for c in cats]

    # Load rules once — avoids N+1 queries (one load per batch, not per transaction)
    active_rules = await load_active_rules(session, household_id)

    categorization_results: list[CategorizationResult] = []
    unmatched: list[Transaction] = []
    matched_rule_ids: list[int] = []

    for tx in transactions:
        category_id, confidence, rule_id = match_rules(active_rules, tx.description or "")
        if category_id is not None:
            tx.category_id = category_id
            tx.ai_categorized = True
            tx.ai_confidence = confidence
            if rule_id is not None:
                matched_rule_ids.append(rule_id)
            categorization_results.append(
                CategorizationResult(
                    transaction_id=tx.id,
                    category_id=category_id,
                    confidence=confidence,
                    source="rule",
                )
            )
        else:
            unmatched.append(tx)

    # Batch hit_count increments — one UPDATE per matched rule (household-scoped)
    for rule_id in matched_rule_ids:
        await increment_hit_count(session, rule_id, household_id)

    if unmatched:
        budget_ok = await check_budget(session, household_id)
        if budget_ok:
            settings = Settings()  # type: ignore[call-arg]
            batch_size = settings.AI_BATCH_SIZE
            max_concurrency = settings.AI_MAX_CONCURRENCY
            model = settings.AI_MODEL

            # Process in batches of AI_BATCH_SIZE
            for i in range(0, len(unmatched), batch_size):
                batch = unmatched[i : i + batch_size]
                batch_dicts = [
                    {"id": tx.id, "description": tx.description or ""}
                    for tx in batch
                ]
                suggestions = await suggest_categories_batch(
                    batch_dicts, available_categories, model, max_concurrency
                )
                for tx_id, suggestion in suggestions:
                    tx_obj = next((t for t in batch if t.id == tx_id), None)
                    if tx_obj is None:
                        continue
                    if suggestion is not None:
                        tx_obj.category_id = suggestion.category_id
                        tx_obj.ai_categorized = True
                        tx_obj.ai_confidence = suggestion.confidence
                        await record_usage(session, household_id, _TOKENS_PER_CALL)
                        categorization_results.append(
                            CategorizationResult(
                                transaction_id=tx_id,
                                category_id=suggestion.category_id,
                                confidence=suggestion.confidence,
                                source="ai",
                            )
                        )
                    else:
                        categorization_results.append(
                            CategorizationResult(
                                transaction_id=tx_id,
                                category_id=tx_obj.category_id,
                                confidence=None,
                                source="uncategorized",
                            )
                        )
        else:
            # Budget exhausted — mark all unmatched as uncategorized
            logger.info(
                "AI budget exhausted for household=%s; %d transactions uncategorized",
                household_id,
                len(unmatched),
            )
            for tx in unmatched:
                categorization_results.append(
                    CategorizationResult(
                        transaction_id=tx.id,
                        category_id=tx.category_id,
                        confidence=None,
                        source="uncategorized",
                    )
                )

    await session.flush()
    return categorization_results


async def apply_correction(
    session: AsyncSession,
    household_id: uuid.UUID,
    transaction_id: int,
    category_id: int,
) -> None:
    """Apply a user correction: update category, set confidence=1.0, upsert rule.

    Implements D-04: corrections always create/update rules with confidence=1.0.
    Household-scoped query enforces T-3-01.
    """
    q = select(Transaction).where(
        Transaction.id == transaction_id,
        Transaction.household_id == household_id,
        Transaction.is_active.is_(True),
    )
    result = await session.execute(q)
    tx = result.scalar_one_or_none()
    if tx is None:
        raise ValueError("Transaction not found")

    tx.category_id = category_id
    tx.ai_categorized = True
    tx.ai_confidence = 1.0

    merchant = extract_merchant_name(tx.description or "")
    if merchant:
        await upsert_rule(session, household_id, merchant, "contains", category_id, confidence=1.0)

    await session.flush()


async def approve_batch(
    session: AsyncSession,
    household_id: uuid.UUID,
    transaction_ids: list[int],
) -> int:
    """Mark AI suggestions as user-confirmed by setting ai_confidence=1.0.

    Per D-09 / RESEARCH.md Open Question #3: approval does NOT create rules.
    Only corrections (apply_correction) create rules.
    Household-scoped query enforces T-3-07 mitigation.
    """
    if not transaction_ids:
        return 0

    q = select(Transaction).where(
        Transaction.id.in_(transaction_ids),
        Transaction.household_id == household_id,
        Transaction.ai_categorized.is_(True),
        Transaction.is_active.is_(True),
    )
    result = await session.execute(q)
    transactions = list(result.scalars().all())

    for tx in transactions:
        tx.ai_confidence = 1.0

    await session.flush()
    return len(transactions)


async def categorize_batch_background(batch_id: str, household_id: str) -> None:
    """Background task: categorize all uncategorized transactions from an import batch.

    Creates its own DB session — never reuses request session (RESEARCH.md Pitfall 1).
    Runs after import commit completes; any errors are logged, not surfaced to user.
    """
    async with async_session_factory() as session:
        try:
            q = select(Transaction).where(
                Transaction.import_batch_id == uuid.UUID(batch_id),
                Transaction.household_id == uuid.UUID(household_id),
                Transaction.category_id.is_(None),
                Transaction.is_active.is_(True),
            )
            result = await session.execute(q)
            transactions = list(result.scalars().all())

            if not transactions:
                logger.info(
                    "No uncategorized transactions for batch=%s, household=%s",
                    batch_id,
                    household_id,
                )
                return

            tx_ids = [tx.id for tx in transactions]
            await categorize_transactions(session, uuid.UUID(household_id), tx_ids)
            await session.commit()
            logger.info(
                "Batch categorization complete for batch=%s, household=%s, count=%d",
                batch_id,
                household_id,
                len(tx_ids),
            )
        except Exception:
            logger.exception(
                "Batch categorization failed for batch=%s, household=%s",
                batch_id,
                household_id,
            )
            await session.rollback()
