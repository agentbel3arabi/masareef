import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.models.account import Account
from app.schemas.account import AccountCreate, AccountResponse, AccountUpdate, ReconcileRequest
from app.schemas.common import ErrorDetail, ErrorResponse, PaginationMeta, SuccessResponse
from app.services import account as account_service
from app.services import installment as installment_service

router = APIRouter(prefix="/api/v1/accounts", tags=["accounts"])


def _account_to_response(account: Account, displayed_balance: int) -> AccountResponse:
    """Build an AccountResponse from an Account ORM object."""
    # SQLite stores enum values as plain strings; PostgreSQL returns AccountType enum instances
    acct_type = account.type
    return AccountResponse(
        id=account.id,
        name=account.name,
        type=acct_type.value if hasattr(acct_type, "value") else acct_type,
        currency=account.currency,
        balance_minor=account.balance_minor,
        displayed_balance_minor=displayed_balance,
        institution=account.institution,
        credit_limit=account.credit_limit,
        billing_cycle_day=account.billing_cycle_day,
        payment_due_day=account.payment_due_day,
        opened_at=account.opened_at,
        is_active=account.is_active,
    )


@router.get("")
async def list_accounts(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    accounts, total = await account_service.list_accounts(session, household_id, page, page_size)
    # TODO: batch balance computation to avoid N+1 queries
    items = []
    for acct in accounts:
        displayed = await account_service.compute_displayed_balance(session, acct)
        items.append(_account_to_response(acct, displayed))
    return SuccessResponse(
        data=[item.model_dump() for item in items],
        meta=PaginationMeta(total=total, page=page, page_size=page_size),
    )


@router.get("/net-worth")
async def get_net_worth(
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    data = await account_service.compute_net_worth(session, household_id)
    return SuccessResponse(data=data)


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


@router.get("/{account_id}/obligations")
async def get_account_obligations(
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
    data = await installment_service.get_account_obligations(session, household_id, account_id)
    return SuccessResponse(data=data)
