import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.schemas.common import ErrorDetail, ErrorResponse, PaginationMeta, SuccessResponse
from app.schemas.installment import InstallmentCreate, InstallmentResponse, InstallmentUpdate
from app.services import installment as installment_service

router = APIRouter(prefix="/api/v1/installments", tags=["installments"])


def _plan_to_response(plan) -> InstallmentResponse:
    """Build an InstallmentResponse with computed status fields."""
    computed = installment_service.compute_installment_status(plan)
    plan_type = plan.type.value if hasattr(plan.type, "value") else plan.type
    return InstallmentResponse(
        id=plan.id,
        type=plan_type,
        name=plan.name,
        merchant_name=plan.merchant_name,
        source_account_id=plan.source_account_id,
        linked_account_id=plan.linked_account_id,
        total_amount_minor=plan.total_amount_minor,
        monthly_amount_minor=plan.monthly_amount_minor,
        total_months=plan.total_months,
        start_month=plan.start_month,
        currency=plan.currency,
        annual_rate_bps=plan.annual_rate_bps,
        status=computed["status"],
        months_paid=computed["months_paid"],
        remaining_months=computed["remaining_months"],
        remaining_minor=computed["remaining_minor"],
        is_active=plan.is_active,
    )


@router.get("")
async def list_installments(
    type: str | None = Query(None),
    status: str | None = Query(None, alias="status"),
    source_account_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    plans, total = await installment_service.list_installments(
        session,
        household_id,
        installment_type=type,
        status_filter=status,
        source_account_id=source_account_id,
        page=page,
        page_size=page_size,
    )
    items = [_plan_to_response(p).model_dump() for p in plans]
    return SuccessResponse(
        data=items,
        meta=PaginationMeta(total=total, page=page, page_size=page_size),
    )


@router.get("/{plan_id}")
async def get_installment(
    plan_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    plan = await installment_service.get_installment(session, household_id, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Installment plan not found")
            ).model_dump(),
        )
    return SuccessResponse(data=_plan_to_response(plan).model_dump())


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_installment(
    data: InstallmentCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    try:
        plan = await installment_service.create_installment(session, household_id, data)
    except ValueError as e:
        err_code = str(e)
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        if err_code == "ACCOUNT_NOT_FOUND":
            status_code = status.HTTP_404_NOT_FOUND
        raise HTTPException(
            status_code=status_code,
            detail=ErrorResponse(error=ErrorDetail(code=err_code, message=err_code)).model_dump(),
        )
    return SuccessResponse(data=_plan_to_response(plan).model_dump())


@router.put("/{plan_id}")
async def update_installment(
    plan_id: int,
    data: InstallmentUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    plan = await installment_service.get_installment(session, household_id, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Installment plan not found")
            ).model_dump(),
        )
    try:
        plan = await installment_service.update_installment(session, plan, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(error=ErrorDetail(code=str(e), message=str(e))).model_dump(),
        )
    return SuccessResponse(data=_plan_to_response(plan).model_dump())


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_installment(
    plan_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> None:
    plan = await installment_service.get_installment(session, household_id, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Installment plan not found")
            ).model_dump(),
        )
    await installment_service.soft_delete_installment(session, plan)


@router.post("/{plan_id}/complete")
async def complete_installment(
    plan_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    plan = await installment_service.get_installment(session, household_id, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Installment plan not found")
            ).model_dump(),
        )
    plan = await installment_service.complete_installment(session, plan)
    return SuccessResponse(data=_plan_to_response(plan).model_dump())
