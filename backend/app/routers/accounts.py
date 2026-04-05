import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.dependencies_rbac import get_member_role, require_role
from app.models.account import Account
from app.models.enums import HouseholdRole
from app.models.transaction import Transaction
from app.schemas.account import (
    AccountCreate,
    AccountDetailResponse,
    AccountResponse,
    AccountUpdate,
    InstitutionEmbed,
    MonthlyStats,
    ReconcileRequest,
)
from app.schemas.common import ErrorDetail, ErrorResponse, PaginationMeta, SuccessResponse, Warning
from app.services import account as account_service
from app.services import installment as installment_service

router = APIRouter(prefix="/api/v1/accounts", tags=["accounts"])


async def _build_account_response(
    session: AsyncSession,
    account: Account,
    displayed_balance: int,
    last_transaction_date: "datetime.date | None" = None,
    monthly_stats: "MonthlyStats | None" = None,
    *,
    detail: bool = False,
    institution_embed: "InstitutionEmbed | None" = None,
) -> dict:
    """Build account response dict with optional institution embed.

    If institution_embed is not provided, it will be fetched from the DB.
    Callers should pre-load institutions in bulk for list endpoints.
    """
    if institution_embed is None and account.institution_id is not None:
        from app.services.financial_institution import get_institution_by_id

        inst = await get_institution_by_id(
            session,
            account.household_id,
            account.institution_id,
        )
        if inst:
            institution_embed = InstitutionEmbed.model_validate(inst)

    # Compute IBAN last 4
    iban_last4 = account.iban[-4:] if account.iban else None

    # SQLite stores enum values as plain strings; PostgreSQL returns AccountType enum instances
    acct_type = account.type
    type_str = acct_type.value if hasattr(acct_type, "value") else acct_type

    base_data = {
        "id": account.id,
        "name": account.name,
        "name_ar": account.name_ar,
        "type": type_str,
        "currency": account.currency,
        "displayed_balance_minor": displayed_balance,
        "institution": institution_embed,
        "iban_last4": iban_last4,
        "account_tier": account.account_tier,
        "credit_limit": account.credit_limit,
        "billing_cycle_day": account.billing_cycle_day,
        "payment_due_day": account.payment_due_day,
        "opened_at": account.opened_at,
        "is_active": account.is_active,
        "last_transaction_date": last_transaction_date,
        "monthly_stats": monthly_stats,
    }

    if detail:
        resp = AccountDetailResponse(
            **base_data,
            iban=account.iban,
            account_number=account.account_number,
            branch=account.branch,
        )
    else:
        resp = AccountResponse(**base_data)

    return resp.model_dump()


@router.get("")
async def list_accounts(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    accounts, total = await account_service.list_accounts(session, household_id, page, page_size)

    # Batch fetch last transaction date per account
    acct_ids = [a.id for a in accounts]
    if acct_ids:
        last_tx_stmt = (
            select(
                Transaction.account_id,
                func.max(Transaction.date).label("last_date"),
            )
            .where(
                Transaction.household_id == household_id,
                Transaction.is_active.is_(True),
                Transaction.account_id.in_(acct_ids),
            )
            .group_by(Transaction.account_id)
        )
        last_tx_result = await session.execute(last_tx_stmt)
        last_tx_map: dict[int, datetime.date] = {
            row.account_id: row.last_date for row in last_tx_result
        }
    else:
        last_tx_map = {}

    # Batch fetch current month stats per account
    month_stats_map: dict[int, MonthlyStats] = {}
    if acct_ids:
        month_start = datetime.date.today().replace(day=1)
        month_stats_stmt = (
            select(
                Transaction.account_id,
                func.sum(
                    func.case(
                        (Transaction.amount_minor > 0, Transaction.amount_minor),
                        else_=0,
                    )
                ).label("income"),
                func.sum(
                    func.case(
                        (Transaction.amount_minor < 0, func.abs(Transaction.amount_minor)),
                        else_=0,
                    )
                ).label("expense"),
                func.count().label("tx_count"),
            )
            .where(
                Transaction.household_id == household_id,
                Transaction.is_active.is_(True),
                Transaction.account_id.in_(acct_ids),
                Transaction.date >= month_start,
                Transaction.applies_to_balance.is_(True),
            )
            .group_by(Transaction.account_id)
        )
        month_result = await session.execute(month_stats_stmt)
        for row in month_result:
            month_stats_map[row.account_id] = MonthlyStats(
                month_income_minor=int(row.income or 0),
                month_expense_minor=int(row.expense or 0),
                month_transaction_count=int(row.tx_count or 0),
            )

    # Batch preload institutions to avoid N+1 queries
    institution_map: dict[int, InstitutionEmbed] = {}
    inst_ids = {a.institution_id for a in accounts if a.institution_id is not None}
    if inst_ids:
        from app.models.financial_institution import FinancialInstitution

        inst_stmt = select(FinancialInstitution).where(FinancialInstitution.id.in_(inst_ids))
        inst_result = await session.execute(inst_stmt)
        for inst in inst_result.scalars():
            institution_map[inst.id] = InstitutionEmbed.model_validate(inst)

    # TODO: batch balance computation to avoid N+1 queries
    items = []
    for acct in accounts:
        displayed = await account_service.compute_displayed_balance(session, acct)
        item = await _build_account_response(
            session,
            acct,
            displayed,
            last_transaction_date=last_tx_map.get(acct.id),
            monthly_stats=month_stats_map.get(acct.id),
            institution_embed=institution_map.get(acct.institution_id)
            if acct.institution_id
            else None,
        )
        items.append(item)
    return SuccessResponse(
        data=items,
        meta=PaginationMeta(total=total, page=page, page_size=page_size),
    )


@router.get("/net-worth")
async def get_net_worth(
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    data = await account_service.compute_net_worth(session, household_id)
    return SuccessResponse(data=data)


@router.get("/{account_id}/balance-history")
async def get_balance_history(
    account_id: int,
    period: str = Query("month", pattern="^(month|quarter|year)$"),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    result = await account_service.get_balance_history(session, household_id, account_id, period)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Account not found")
            ).model_dump(),
        )
    return SuccessResponse(data=result)


@router.get("/{account_id}")
async def get_account(
    account_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
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
    resp = await _build_account_response(session, account, displayed, detail=True)
    return SuccessResponse(data=resp)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_account(
    data: AccountCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
) -> SuccessResponse:
    # Validate institution assignment
    account_type_str = str(data.type.value) if hasattr(data.type, "value") else str(data.type)
    try:
        inst_warnings = await account_service.validate_institution(
            session, household_id, account_type_str, data.institution_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error=ErrorDetail(code="VALIDATION_ERROR", message=str(e))
            ).model_dump(),
        )

    # Validate IBAN format if provided
    warnings: list[dict] = list(inst_warnings)
    if data.iban:
        if not account_service.validate_iban(data.iban):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ErrorResponse(
                    error=ErrorDetail(code="INVALID_IBAN", message="IBAN format is invalid")
                ).model_dump(),
            )
        # Check IBAN duplicate
        iban_warnings = await account_service.check_iban_duplicate(session, household_id, data.iban)
        warnings.extend(iban_warnings)

    account = await account_service.create_account(session, household_id, data)
    displayed = await account_service.compute_displayed_balance(session, account)
    resp = await _build_account_response(session, account, displayed)

    if warnings:
        return SuccessResponse(
            data=resp,
            warnings=[Warning(**w).model_dump() for w in warnings],
        )
    return SuccessResponse(data=resp)


@router.put("/{account_id}")
async def update_account(
    account_id: int,
    data: AccountUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
) -> SuccessResponse:
    account = await account_service.get_account(session, household_id, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Account not found")
            ).model_dump(),
        )

    # Validate IBAN format if provided
    warnings: list[dict] = []
    update_fields = data.model_dump(exclude_unset=True)
    if "iban" in update_fields and update_fields["iban"] is not None:
        iban = update_fields["iban"]
        if not account_service.validate_iban(iban):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ErrorResponse(
                    error=ErrorDetail(code="INVALID_IBAN", message="IBAN format is invalid")
                ).model_dump(),
            )
        warnings = await account_service.check_iban_duplicate(
            session, household_id, iban, exclude_account_id=account_id
        )

    # Validate institution if being changed
    if "institution_id" in update_fields:
        account_type_str = (
            account.type.value if hasattr(account.type, "value") else str(account.type)
        )
        try:
            inst_warnings = await account_service.validate_institution(
                session, household_id, account_type_str, update_fields["institution_id"]
            )
            warnings.extend(inst_warnings)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ErrorResponse(
                    error=ErrorDetail(code="VALIDATION_ERROR", message=str(e))
                ).model_dump(),
            )

    account = await account_service.update_account(session, account, data)
    displayed = await account_service.compute_displayed_balance(session, account)
    resp = await _build_account_response(session, account, displayed)

    if warnings:
        return SuccessResponse(
            data=resp,
            warnings=[Warning(**w).model_dump() for w in warnings],
        )
    return SuccessResponse(data=resp)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
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
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
) -> SuccessResponse:
    account = await account_service.get_account(session, household_id, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Account not found")
            ).model_dump(),
        )
    result = await account_service.reconcile_account(
        session,
        household_id,
        account,
        data.actual_balance,
        reconciliation_date=data.reconciliation_date,
        notes=data.notes,
    )
    return SuccessResponse(data=result)


@router.get("/{account_id}/obligations")
async def get_account_obligations(
    account_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
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
