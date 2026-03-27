import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.schemas.account import AccountCreate, AccountResponse, AccountUpdate, ReconcileRequest
from app.schemas.common import ErrorDetail, ErrorResponse, PaginationMeta, SuccessResponse
from app.services import account as account_service

router = APIRouter(prefix="/api/v1/accounts", tags=["accounts"])


def _account_to_response(account: object, displayed_balance: int) -> AccountResponse:
    """Build an AccountResponse from an Account ORM object."""
    acct_type = account.type  # type: ignore[union-attr]
    return AccountResponse(
        id=account.id,  # type: ignore[union-attr]
        name=account.name,  # type: ignore[union-attr]
        type=acct_type.value if hasattr(acct_type, "value") else acct_type,
        currency=account.currency,  # type: ignore[union-attr]
        balance_minor=account.balance_minor,  # type: ignore[union-attr]
        displayed_balance_minor=displayed_balance,
        institution=account.institution,  # type: ignore[union-attr]
        credit_limit=account.credit_limit,  # type: ignore[union-attr]
        billing_cycle_day=account.billing_cycle_day,  # type: ignore[union-attr]
        payment_due_day=account.payment_due_day,  # type: ignore[union-attr]
        opened_at=account.opened_at,  # type: ignore[union-attr]
        is_active=account.is_active,  # type: ignore[union-attr]
    )


@router.get("")
async def list_accounts(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    accounts, total = await account_service.list_accounts(
        session, household_id, page, page_size
    )
    items = []
    for acct in accounts:
        displayed = await account_service.compute_displayed_balance(session, acct)
        items.append(_account_to_response(acct, displayed))
    return SuccessResponse(
        data=[item.model_dump() for item in items],
        meta=PaginationMeta(total=total, page=page, page_size=page_size),
    )


@router.get("/{account_id}")
async def get_account(
    account_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    account = await account_service.get_account(session, household_id, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Account not found")
            ).model_dump(),
        )
    displayed = await account_service.compute_displayed_balance(session, account)
    resp = _account_to_response(account, displayed)
    return SuccessResponse(data=resp.model_dump())


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_account(
    data: AccountCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    account = await account_service.create_account(session, household_id, data)
    displayed = await account_service.compute_displayed_balance(session, account)
    resp = _account_to_response(account, displayed)
    return SuccessResponse(data=resp.model_dump())


@router.put("/{account_id}")
async def update_account(
    account_id: int,
    data: AccountUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    account = await account_service.get_account(session, household_id, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Account not found")
            ).model_dump(),
        )
    account = await account_service.update_account(session, account, data)
    displayed = await account_service.compute_displayed_balance(session, account)
    resp = _account_to_response(account, displayed)
    return SuccessResponse(data=resp.model_dump())


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> None:
    account = await account_service.get_account(session, household_id, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Account not found")
            ).model_dump(),
        )
    await account_service.soft_delete_account(session, account)


@router.post("/{account_id}/reconcile")
async def reconcile_account(
    account_id: int,
    data: ReconcileRequest,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    account = await account_service.get_account(session, household_id, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Account not found")
            ).model_dump(),
        )
    discrepancy = await account_service.reconcile_account(
        session, account, data.actual_balance, data.notes
    )
    return SuccessResponse(data={"discrepancy": discrepancy})
