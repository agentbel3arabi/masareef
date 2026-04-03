"""Transaction HTTP router. No business logic — delegates to transaction_service."""

import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.dependencies_rbac import get_member_role, require_role
from app.models.enums import HouseholdRole
from app.models.transaction import Transaction
from app.schemas.common import ErrorDetail, ErrorResponse, PaginationMeta, SuccessResponse
from app.schemas.transaction import (
    BulkCategorizeRequest,
    BulkDeleteRequest,
    CategorizeRequest,
    CategoryEmbedded,
    SplitRequest,
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)
from app.services import transaction as transaction_service

router = APIRouter(prefix="/api/v1/transactions", tags=["transactions"])


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _tx_to_response(tx: Transaction) -> TransactionResponse:
    """Build a TransactionResponse from an ORM Transaction object."""
    tx_type = tx.type
    return TransactionResponse(
        id=tx.id,
        account_id=tx.account_id,
        date=tx.date,
        description=tx.description or "",
        amount_minor=tx.amount_minor,
        currency=tx.currency,
        type=tx_type.value if hasattr(tx_type, "value") else tx_type,
        category=CategoryEmbedded.model_validate(tx.category) if tx.category else None,
        transfer_id=tx.transfer_id,
        asset_id=tx.asset_id,
        ai_categorized=tx.ai_categorized,
        ai_confidence=tx.ai_confidence,
        notes=tx.notes,
    )


def _not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=ErrorResponse(
            error=ErrorDetail(code="NOT_FOUND", message="Transaction not found")
        ).model_dump(),
    )


# ---------------------------------------------------------------------------
# Bulk routes — must be declared BEFORE /{transaction_id} to avoid collision
# ---------------------------------------------------------------------------


@router.post("/bulk/delete")
async def bulk_delete_transactions(
    data: BulkDeleteRequest,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
) -> SuccessResponse:
    """Bulk soft-delete transactions by id list."""
    deleted = await transaction_service.bulk_delete(session, household_id, data.ids)
    return SuccessResponse(data={"deleted": deleted})


@router.post("/bulk/categorize")
async def bulk_categorize_transactions(
    data: BulkCategorizeRequest,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
) -> SuccessResponse:
    """Bulk categorize transactions."""
    try:
        updated = await transaction_service.bulk_categorize(
            session, household_id, data.ids, data.category_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error=ErrorDetail(code="INVALID_CATEGORY", message=str(e))
            ).model_dump(),
        )
    return SuccessResponse(data={"updated": updated})


# ---------------------------------------------------------------------------
# Collection routes
# ---------------------------------------------------------------------------


@router.get("")
async def list_transactions(
    account_id: int | None = Query(None),
    q: str | None = Query(None, description="Full-text search on description and notes"),
    type: str | None = Query(None, description="Filter by 'debit' or 'credit'"),
    category_id: int | None = Query(None),
    date_from: datetime.date | None = Query(None, description="ISO date, inclusive"),
    date_to: datetime.date | None = Query(None, description="ISO date, inclusive"),
    amount_min: int | None = Query(None),
    amount_max: int | None = Query(None),
    has_category: bool | None = Query(None),
    asset_id: int | None = Query(None),
    sort: str = Query("-date", description="Sort order: -date | date | -amount | amount"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    """List transactions with optional filters and pagination."""
    rows, total = await transaction_service.list_transactions(
        session,
        household_id,
        account_id=account_id,
        q_search=q,
        tx_type=type,
        category_id=category_id,
        date_from=date_from,
        date_to=date_to,
        amount_min=amount_min,
        amount_max=amount_max,
        has_category=has_category,
        asset_id=asset_id,
        sort=sort,
        page=page,
        page_size=page_size,
    )
    items = [_tx_to_response(tx).model_dump() for tx in rows]
    return SuccessResponse(
        data=items,
        meta=PaginationMeta(total=total, page=page, page_size=page_size),
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_transaction(
    data: TransactionCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
) -> SuccessResponse:
    """Create a new transaction and update the account balance."""
    try:
        tx = await transaction_service.create_transaction(session, household_id, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error=ErrorDetail(code="VALIDATION_ERROR", message=str(e))
            ).model_dump(),
        )
    return SuccessResponse(data=_tx_to_response(tx).model_dump())


# ---------------------------------------------------------------------------
# Item routes
# ---------------------------------------------------------------------------


@router.get("/{transaction_id}")
async def get_transaction(
    transaction_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    """Get a single transaction by id."""
    tx = await transaction_service.get_transaction(session, household_id, transaction_id)
    if not tx:
        raise _not_found()
    return SuccessResponse(data=_tx_to_response(tx).model_dump())


@router.put("/{transaction_id}")
async def update_transaction(
    transaction_id: int,
    data: TransactionUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
) -> SuccessResponse:
    """Update transaction fields; recalculates balance delta when amount/type changes."""
    tx = await transaction_service.get_transaction(session, household_id, transaction_id)
    if not tx:
        raise _not_found()
    tx = await transaction_service.update_transaction(session, tx, data)
    return SuccessResponse(data=_tx_to_response(tx).model_dump())


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
) -> None:
    """Soft-delete a transaction and reverse its balance contribution."""
    tx = await transaction_service.get_transaction(session, household_id, transaction_id)
    if not tx:
        raise _not_found()
    await transaction_service.soft_delete_transaction(session, tx)


@router.post("/{transaction_id}/split")
async def split_transaction(
    transaction_id: int,
    data: SplitRequest,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
) -> SuccessResponse:
    """Replace splits for a transaction. Split amounts must sum to abs(amount_minor)."""
    tx = await transaction_service.get_transaction(session, household_id, transaction_id)
    if not tx:
        raise _not_found()

    split_total = sum(item.amount_minor for item in data.splits)
    tx_abs = abs(int(tx.amount_minor))
    if split_total != tx_abs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error=ErrorDetail(
                    code="SPLIT_SUM_MISMATCH",
                    message=(
                        f"Split amounts sum to {split_total} but transaction amount is {tx_abs}"
                    ),
                )
            ).model_dump(),
        )

    # Validate all category IDs exist and are accessible to the household
    try:
        for item in data.splits:
            await transaction_service.validate_category_access(
                session, item.category_id, household_id
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error=ErrorDetail(code="INVALID_CATEGORY", message=str(e))
            ).model_dump(),
        )

    splits = await transaction_service.create_splits(session, transaction_id, data.splits)

    result = [
        {
            "id": s.id,
            "transaction_id": s.transaction_id,
            "category_id": s.category_id,
            "amount_minor": s.amount_minor,
            "notes": s.notes,
        }
        for s in splits
    ]
    return SuccessResponse(data=result)


@router.post("/{transaction_id}/categorize")
async def categorize_transaction(
    transaction_id: int,
    data: CategorizeRequest,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
) -> SuccessResponse:
    """Set the category on a single transaction."""
    tx = await transaction_service.get_transaction(session, household_id, transaction_id)
    if not tx:
        raise _not_found()
    try:
        await transaction_service.categorize_transaction(
            session, tx, data.category_id, household_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error=ErrorDetail(code="VALIDATION_ERROR", message=str(e))
            ).model_dump(),
        )
    return SuccessResponse(data=_tx_to_response(tx).model_dump())
