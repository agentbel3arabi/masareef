import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.dependencies_rbac import get_member_role
from app.models.enums import DebtType, HouseholdRole
from app.schemas.common import ErrorDetail, ErrorResponse, PaginationMeta, SuccessResponse
from app.schemas.debt import (
    DebtCreate,
    DebtResponse,
    DebtUpdate,
    MatchSuggestion,
    P2PDebtSplitResponse,
    PaymentCreate,
    PaymentResponse,
    ScheduleRow,
)
from app.services import debt as debt_service

router = APIRouter(prefix="/api/v1/debts", tags=["debts"])


def _check_p2p_read(debt, role: HouseholdRole) -> None:
    """Block CHILD from reading P2P debts."""
    if debt.type in (DebtType.PERSONAL_LENT, DebtType.PERSONAL_BORROWED):
        if role == HouseholdRole.CHILD:
            raise HTTPException(status_code=403, detail="Children cannot access P2P debts")


def _check_p2p_write(debt, role: HouseholdRole) -> None:
    """Block CHILD+VIEWER from mutating P2P debts, VIEWER from all mutations."""
    if debt.type in (DebtType.PERSONAL_LENT, DebtType.PERSONAL_BORROWED):
        if role in (HouseholdRole.CHILD, HouseholdRole.VIEWER):
            raise HTTPException(status_code=403, detail="Insufficient permissions for P2P debts")
    elif role == HouseholdRole.VIEWER:
        raise HTTPException(status_code=403, detail="Viewers cannot modify debts")


def _debt_to_response(debt, total_paid: int = 0, remaining: int | None = None) -> DebtResponse:
    """Map Debt ORM object to DebtResponse schema.

    remaining: outstanding principal balance from compute_debt_totals.
               Defaults to principal_minor when no payments recorded yet.
    """
    d_type = debt.type
    d_status = debt.status
    d_mode = debt.repayment_mode
    remaining_minor = remaining if remaining is not None else debt.principal_minor
    return DebtResponse(
        id=debt.id,
        type=d_type.value if hasattr(d_type, "value") else d_type,
        person_id=debt.person_id,
        linked_account_id=debt.linked_account_id,
        name=debt.name,
        institution=debt.institution,
        principal_minor=debt.principal_minor,
        currency=debt.currency,
        annual_rate_bps=debt.annual_rate_bps,
        tenure_months=debt.tenure_months,
        start_date=debt.start_date,
        monthly_payment_minor=debt.monthly_payment_minor,
        repayment_mode=d_mode.value if hasattr(d_mode, "value") else d_mode,
        due_date=debt.due_date,
        status=d_status.value if hasattr(d_status, "value") else d_status,
        notes=debt.notes,
        is_active=debt.is_active,
        total_paid_minor=total_paid,
        remaining_minor=remaining_minor,
    )


def _payment_to_response(payment) -> PaymentResponse:
    return PaymentResponse(
        id=payment.id,
        debt_id=payment.debt_id,
        date=payment.date,
        amount_minor=payment.amount_minor,
        principal_minor=payment.principal_minor,
        interest_minor=payment.interest_minor,
        transaction_id=payment.transaction_id,
        notes=payment.notes,
    )


@router.get("")
async def list_debts(
    type: str | None = Query(None),
    status: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    if role == HouseholdRole.CHILD and type in ("personal_lent", "personal_borrowed"):
        raise HTTPException(status_code=403, detail="Children cannot access P2P debts")
    # CHILD users must never see P2P debts even in unfiltered lists
    exclude = (
        ["personal_lent", "personal_borrowed"]
        if role == HouseholdRole.CHILD and type is None
        else None
    )
    debts, total = await debt_service.list_debts(
        session, household_id, type, status, page, page_size, exclude_types=exclude
    )
    totals = await debt_service.batch_compute_debt_totals(
        session, [(d.id, d.principal_minor) for d in debts]
    )
    items = [_debt_to_response(d, *totals[d.id]).model_dump() for d in debts]
    return SuccessResponse(
        data=items,
        meta=PaginationMeta(total=total, page=page, page_size=page_size),
    )


@router.get("/{debt_id}")
async def get_debt(
    debt_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    debt = await debt_service.get_debt(session, household_id, debt_id)
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Debt not found")
            ).model_dump(),
        )
    _check_p2p_read(debt, role)
    paid, remaining = await debt_service.compute_debt_totals(session, debt.id, debt.principal_minor)
    return SuccessResponse(data=_debt_to_response(debt, paid, remaining).model_dump())


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_debt(
    data: DebtCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    if data.type in ("personal_lent", "personal_borrowed"):
        if role == HouseholdRole.CHILD:
            raise HTTPException(status_code=403, detail="Children cannot create P2P debts")
        if role == HouseholdRole.VIEWER:
            raise HTTPException(status_code=403, detail="Viewers cannot create debts")
    try:
        if data.type == "bank_loan":
            debt = await debt_service.create_bank_loan(session, household_id, data)
        elif data.type in ("personal_lent", "personal_borrowed"):
            debt = await debt_service.create_p2p_debt(session, household_id, data)
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=ErrorResponse(
                    error=ErrorDetail(
                        code="UNSUPPORTED_DEBT_TYPE",
                        message=f"Debt type '{data.type}' is not supported",
                    )
                ).model_dump(),
            )
    except ValueError as e:
        err_code = str(e)
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        if err_code == "PERSON_NOT_FOUND":
            status_code = status.HTTP_404_NOT_FOUND
        raise HTTPException(
            status_code=status_code,
            detail=ErrorResponse(error=ErrorDetail(code=err_code, message=err_code)).model_dump(),
        )
    return SuccessResponse(data=_debt_to_response(debt).model_dump())


@router.put("/{debt_id}")
async def update_debt(
    debt_id: int,
    data: DebtUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    debt = await debt_service.get_debt(session, household_id, debt_id)
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Debt not found")
            ).model_dump(),
        )
    _check_p2p_write(debt, role)
    try:
        debt = await debt_service.update_debt(session, household_id, debt, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorResponse(error=ErrorDetail(code=str(e), message=str(e))).model_dump(),
        )
    paid, remaining = await debt_service.compute_debt_totals(session, debt.id, debt.principal_minor)
    return SuccessResponse(data=_debt_to_response(debt, paid, remaining).model_dump())


@router.delete("/{debt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_debt(
    debt_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> None:
    debt = await debt_service.get_debt(session, household_id, debt_id)
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Debt not found")
            ).model_dump(),
        )
    _check_p2p_write(debt, role)
    await debt_service.soft_delete_debt(session, debt)


@router.get("/{debt_id}/amortization")
async def get_amortization(
    debt_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    debt = await debt_service.get_debt(session, household_id, debt_id)
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Debt not found")
            ).model_dump(),
        )
    _check_p2p_read(debt, role)
    schedule = await debt_service.get_amortization_schedule(session, debt)
    rows = [ScheduleRow(**row).model_dump() for row in schedule]
    return SuccessResponse(data=rows)


@router.get("/{debt_id}/payments")
async def list_payments(
    debt_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    debt = await debt_service.get_debt(session, household_id, debt_id)
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Debt not found")
            ).model_dump(),
        )
    _check_p2p_read(debt, role)
    payments = await debt_service.get_payments(session, debt.id)
    items = [_payment_to_response(p).model_dump() for p in payments]
    return SuccessResponse(data=items)


@router.post("/{debt_id}/payments", status_code=status.HTTP_201_CREATED)
async def record_payment(
    debt_id: int,
    data: PaymentCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    debt = await debt_service.get_debt(session, household_id, debt_id)
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Debt not found")
            ).model_dump(),
        )
    _check_p2p_write(debt, role)
    try:
        payment = await debt_service.record_payment(
            session, debt, data.date, data.amount_minor, data.transaction_id, data.notes
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorResponse(error=ErrorDetail(code=str(e), message=str(e))).model_dump(),
        )
    return SuccessResponse(data=_payment_to_response(payment).model_dump())


@router.get("/{debt_id}/match-suggestions")
async def get_match_suggestions(
    debt_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    debt = await debt_service.get_debt(session, household_id, debt_id)
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Debt not found")
            ).model_dump(),
        )
    _check_p2p_read(debt, role)
    suggestions = await debt_service.get_match_suggestions(session, household_id, debt)
    items = [MatchSuggestion(**s).model_dump() for s in suggestions]
    return SuccessResponse(data=items)


@router.post("/{debt_id}/mark-paid")
async def mark_debt_paid(
    debt_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    debt = await debt_service.get_debt(session, household_id, debt_id)
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Debt not found")
            ).model_dump(),
        )
    _check_p2p_write(debt, role)
    debt = await debt_service.mark_paid(session, debt)
    paid, remaining = await debt_service.compute_debt_totals(session, debt.id, debt.principal_minor)
    return SuccessResponse(data=_debt_to_response(debt, paid, remaining).model_dump())


@router.get("/{debt_id}/splits")
async def get_splits(
    debt_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    debt = await debt_service.get_debt(session, household_id, debt_id)
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Debt not found")
            ).model_dump(),
        )
    _check_p2p_read(debt, role)
    splits = await debt_service.get_splits(session, debt.id)
    today = date.today()
    items = []
    for s in splits:
        if s.paid:
            split_status = "paid"
        elif s.due_date < today:
            split_status = "overdue"
        else:
            split_status = "upcoming"
        items.append(
            P2PDebtSplitResponse(
                id=s.id,
                debt_id=s.debt_id,
                amount_minor=s.amount_minor,
                due_date=s.due_date,
                paid=s.paid,
                payment_id=s.payment_id,
                status=split_status,
            ).model_dump()
        )
    return SuccessResponse(data=items)
