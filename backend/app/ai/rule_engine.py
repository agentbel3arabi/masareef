"""Rule engine for transaction categorization.

Applies contains-match rules ordered by confidence DESC, hit_count DESC.
See RESEARCH.md D-04, D-05 for threat model and design decisions.

All queries include household_id to enforce multi-tenant isolation (T-3-01).
"""

import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.categorization_rule import CategorizationRule


async def load_active_rules(
    session: AsyncSession,
    household_id: uuid.UUID,
) -> list[CategorizationRule]:
    """Load all active rules for a household, ordered by confidence DESC, hit_count DESC.

    Household-scoped query (T-3-01 mitigation).
    """
    q = (
        select(CategorizationRule)
        .where(
            CategorizationRule.household_id == household_id,
            CategorizationRule.is_active.is_(True),
        )
        .order_by(
            CategorizationRule.confidence.desc(),
            CategorizationRule.hit_count.desc(),
        )
    )
    result = await session.execute(q)
    return list(result.scalars().all())


def match_rules(
    rules: list[CategorizationRule],
    description: str,
) -> tuple[int | None, float | None, int | None]:
    """Match description against preloaded rules in memory.

    Returns (category_id, confidence, rule_id) for the first matching rule,
    or (None, None, None). Caller is responsible for incrementing hit_count.
    """
    for rule in rules:
        if rule.match_type == "contains" and rule.pattern.lower() in description.lower():
            return rule.category_id, rule.confidence, rule.id
    return None, None, None


async def increment_hit_count(
    session: AsyncSession,
    rule_id: int,
    household_id: uuid.UUID,
) -> None:
    """Atomically increment hit_count for a rule. Household-scoped (T-3-01)."""
    await session.execute(
        update(CategorizationRule)
        .where(
            CategorizationRule.id == rule_id,
            CategorizationRule.household_id == household_id,
            CategorizationRule.is_active.is_(True),
        )
        .values(hit_count=CategorizationRule.hit_count + 1)
    )


async def apply_rule_engine(
    session: AsyncSession,
    household_id: uuid.UUID,
    description: str,
) -> tuple[int | None, float | None]:
    """Match transaction description against household rules.

    Returns (category_id, confidence) for the first matching rule, or (None, None).
    Loads rules from DB and increments hit_count on match.

    Prefer match_rules() + increment_hit_count() for batch use to avoid N+1 queries.
    """
    rules = await load_active_rules(session, household_id)
    category_id, confidence, rule_id = match_rules(rules, description)
    if rule_id is not None:
        await increment_hit_count(session, rule_id, household_id)
    return category_id, confidence


async def upsert_rule(
    session: AsyncSession,
    household_id: uuid.UUID,
    pattern: str,
    match_type: str,
    category_id: int,
    confidence: float = 1.0,
) -> CategorizationRule:
    """Create or update a categorization rule for the household.

    If a rule with the same pattern+match_type already exists for this household,
    updates category_id and confidence. Otherwise creates a new rule.
    User corrections always use confidence=1.0 (D-04).
    """
    q = select(CategorizationRule).where(
        CategorizationRule.household_id == household_id,
        CategorizationRule.pattern == pattern,
        CategorizationRule.match_type == match_type,
        CategorizationRule.is_active.is_(True),
    )
    result = await session.execute(q)
    existing = result.scalar_one_or_none()

    if existing:
        existing.category_id = category_id
        existing.confidence = confidence
        return existing

    new_rule = CategorizationRule(
        household_id=household_id,
        pattern=pattern,
        match_type=match_type,
        category_id=category_id,
        confidence=confidence,
    )
    session.add(new_rule)
    return new_rule
