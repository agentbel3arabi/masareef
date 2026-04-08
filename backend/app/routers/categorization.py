"""Categorization HTTP router.

Exposes:
  POST /api/v1/categorization-rules/categorize-batch  — trigger batch AI categorization
  POST /api/v1/categorization-rules/approve-batch     — confirm AI suggestions (no rule creation)
  POST /api/v1/categorization-rules/correct           — user correction + rule upsert

All endpoints require ADMIN or MEMBER role (household membership enforced by dependency).
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.dependencies_rbac import require_role
from app.models.enums import HouseholdRole
from app.schemas.categorization import (
    ApproveAllRequest,
    BatchCategorizationRequest,
    BatchCategorizationResponse,
    CorrectionRequest,
)
from app.schemas.common import ErrorDetail, ErrorResponse, SuccessResponse
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
    count = await categorization_service.approve_batch(
        session, household_id, data.transaction_ids
    )
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
