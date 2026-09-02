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
from app.services import transaction_summary as summary_service

router = APIRouter(prefix="/api/v1/transactions", tags=["transactions"])


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _tx_to_response(tx: Transaction, debt_id: int | None = None) -> TransactionResponse:
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
        debt_id=debt_id,
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
# Last-used-account — must be declared BEFORE /{transaction_id} to avoid collision
# ---------------------------------------------------------------------------


@router.get("/last-used-account")
async def get_last_used_account(
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    """Return the account_id of the most recently created transaction."""
    from sqlalchemy import select

    stmt = (
        select(Transaction.account_id)
        .where(
            Transaction.household_id == household_id,
            Transaction.is_active.is_(True),
        )
        .order_by(Transaction.created_at.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="No transactions found")
            ).model_dump(),
        )
    return SuccessResponse(data={"account_id": row})


# ---------------------------------------------------------------------------
# Summary route — must be declared BEFORE /{transaction_id} to avoid collision
# ---------------------------------------------------------------------------


@router.get("/summary")
async def get_transaction_summary(
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    period: str = Query("month", pattern="^(month|quarter|year|custom)$"),
    start_date: datetime.date | None = Query(None),
    end_date: datetime.date | None = Query(None),
    account_id: int | None = Query(None),
    category_id: int | None = Query(None),
    type: str | None = Query(None, pattern="^(income|expense)$"),
    currency: str = Query("EGP"),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    """Return aggregated income/expense totals for a period."""
    try:
        result = await summary_service.get_transaction_summary(
            session,
            household_id,
            period=period,
            start_date=start_date,
            end_date=end_date,
            account_id=account_id,
            category_id=category_id,
            type=type,
            currency=currency,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error=ErrorDetail(code="VALIDATION_ERROR", message=str(e))
            ).model_dump(),
        )
    return SuccessResponse(data=result.model_dump())


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
    needs_review: bool = Query(
        False, description="Filter to AI-categorized transactions with confidence < 0.95"
    ),  # noqa: E501
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
        needs_review=needs_review,
        sort=sort,
        page=page,
        page_size=page_size,
    )

    # Batch fetch debt_id per transaction via debt_payments
    from sqlalchemy import select as sa_select

    from app.models.debt_payment import DebtPayment

    tx_ids = [tx.id for tx in rows]
    if tx_ids:
        debt_stmt = sa_select(DebtPayment.transaction_id, DebtPayment.debt_id).where(
            DebtPayment.transaction_id.in_(tx_ids),
        )
        debt_result = await session.execute(debt_stmt)
        debt_map: dict[int, int] = {row.transaction_id: row.debt_id for row in debt_result}
    else:
        debt_map = {}

    items = [_tx_to_response(tx, debt_id=debt_map.get(tx.id)).model_dump() for tx in rows]
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
    try:
        tx = await transaction_service.update_transaction(session, tx, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error=ErrorDetail(code="VALIDATION_ERROR", message=str(e))
            ).model_dump(),
        )
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
    try:
        await transaction_service.soft_delete_transaction(session, tx)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error=ErrorDetail(code="SYSTEM_TRANSACTION", message=str(e))
            ).model_dump(),
        )


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
