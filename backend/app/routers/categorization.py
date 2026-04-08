"""Categorization HTTP router.

Exposes:
  GET    /api/v1/categorization-rules/             — list rules (paginated)
  POST   /api/v1/categorization-rules/             — create rule manually
  PUT    /api/v1/categorization-rules/{rule_id}    — update rule pattern/category
  DELETE /api/v1/categorization-rules/{rule_id}    — soft-delete rule
  GET    /api/v1/categorization-rules/usage        — current month AI token usage
  POST   /api/v1/categorization-rules/categorize-batch  — trigger batch AI categorization
  POST   /api/v1/categorization-rules/approve-batch     — confirm AI suggestions (no rule creation)
  POST   /api/v1/categorization-rules/correct           — user correction + rule upsert

All endpoints require ADMIN or MEMBER role (household membership enforced by dependency).
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai import budget_guard
from app.dependencies import get_db_session, get_household_id
from app.dependencies_rbac import require_role
from app.models.categorization_rule import CategorizationRule
from app.models.enums import HouseholdRole
from app.schemas.categorization import (
    AIUsageResponse,
    ApproveAllRequest,
    BatchCategorizationRequest,
    BatchCategorizationResponse,
    CorrectionRequest,
    RuleCreate,
    RuleResponse,
    RuleUpdate,
)
from app.schemas.common import ErrorDetail, ErrorResponse, PaginationMeta, SuccessResponse
from app.services import categorization as categorization_service

router = APIRouter(prefix="/api/v1/categorization-rules", tags=["categorization"])


@router.post("/categorize-batch")
async def categorize_batch(
    data: BatchCategorizationRequest,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
) -> SuccessResponse:
    """Trigger batch AI categorization for a list of transaction IDs.

    Applies rule engine first, then LLM fallback for unmatched transactions.
    Budget guard caps LLM calls per household (T-3-09 DoS mitigation).
    """
    results = await categorization_service.categorize_transactions(
        session, household_id, data.transaction_ids
    )
    await session.commit()
    return SuccessResponse(data=BatchCategorizationResponse(results=results).model_dump())


@router.post("/approve-batch")
async def approve_batch(
    data: ApproveAllRequest,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
) -> SuccessResponse:
    """Confirm AI suggestions without creating rules (D-09).

    Sets ai_confidence=1.0 on approved transactions.
    Only sets confidence — never category_id (T-3-07 tamper mitigation).
    """
    count = await categorization_service.approve_batch(session, household_id, data.transaction_ids)
    await session.commit()
    return SuccessResponse(data={"approved": count})


@router.post("/correct")
async def correct_category(
    data: CorrectionRequest,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
) -> SuccessResponse:
    """Apply a user category correction and upsert a rule (D-04).

    Extracts merchant name from description and creates/updates a contains rule
    with confidence=1.0. Future transactions with matching descriptions will be
    auto-categorized by the rule engine without LLM calls.
    """
    try:
        await categorization_service.apply_correction(
            session, household_id, data.transaction_id, data.category_id
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message=str(exc))
            ).model_dump(),
        )
    await session.commit()
    return SuccessResponse(data={"ok": True})


# ---------------------------------------------------------------------------
# Rule CRUD endpoints (AICAT-04)
# ---------------------------------------------------------------------------


@router.get("/")
async def list_rules(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
) -> SuccessResponse:
    """List all active categorization rules for the household, ordered by confidence."""
    count_q = select(func.count(CategorizationRule.id)).where(
        CategorizationRule.household_id == household_id,
        CategorizationRule.is_active.is_(True),
    )
    total = (await session.execute(count_q)).scalar_one()

    q = (
        select(CategorizationRule)
        .where(
            CategorizationRule.household_id == household_id,
            CategorizationRule.is_active.is_(True),
        )
        .order_by(CategorizationRule.confidence.desc(), CategorizationRule.hit_count.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await session.execute(q)
    rules = [RuleResponse.model_validate(r).model_dump() for r in result.scalars().all()]
    return SuccessResponse(
        data=rules,
        meta=PaginationMeta(total=total, page=page, page_size=page_size),
    )


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_rule(
    data: RuleCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
) -> SuccessResponse:
    """Create a categorization rule manually (T-3-04: pattern length capped at 200)."""
    rule = CategorizationRule(
        household_id=household_id,
        pattern=data.pattern.upper(),
        match_type=data.match_type,
        category_id=data.category_id,
        confidence=1.0,
    )
    session.add(rule)
    await session.commit()
    await session.refresh(rule)
    return SuccessResponse(data=RuleResponse.model_validate(rule).model_dump())


@router.put("/{rule_id}")
async def update_rule(
    rule_id: int,
    data: RuleUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
) -> SuccessResponse:
    """Update a rule's pattern or category (T-3-12: household ownership validated)."""
    q = select(CategorizationRule).where(
        CategorizationRule.id == rule_id,
        CategorizationRule.household_id == household_id,
        CategorizationRule.is_active.is_(True),
    )
    result = await session.execute(q)
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Rule not found")
            ).model_dump(),
        )
    if data.pattern is not None:
        rule.pattern = data.pattern.upper()
    if data.category_id is not None:
        rule.category_id = data.category_id
    await session.commit()
    await session.refresh(rule)
    return SuccessResponse(data=RuleResponse.model_validate(rule).model_dump())


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(
    rule_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
) -> None:
    """Soft-delete a rule — sets is_active=False, never hard-deletes (T-3-01)."""
    q = select(CategorizationRule).where(
        CategorizationRule.id == rule_id,
        CategorizationRule.household_id == household_id,
        CategorizationRule.is_active.is_(True),
    )
    result = await session.execute(q)
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Rule not found")
            ).model_dump(),
        )
    rule.is_active = False  # soft delete — preserves audit trail
    await session.commit()


@router.get("/usage")
async def get_ai_usage(
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
) -> SuccessResponse:
    """Return current month AI token usage for the household."""
    usage = await budget_guard.get_usage(session, household_id)
    if usage is None:
        return SuccessResponse(
            data={
                "tokens_used": 0,
                "monthly_limit": None,
                "year_month": budget_guard._current_year_month(),
            }
        )
    return SuccessResponse(data=AIUsageResponse.model_validate(usage).model_dump())
