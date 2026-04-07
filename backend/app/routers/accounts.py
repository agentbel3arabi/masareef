import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.dependencies_rbac import get_member_role, require_role
from app.models.enums import HouseholdRole
from app.schemas.account import (
    AccountCreate,
    AccountUpdate,
    ReconcileRequest,
)
from app.schemas.common import ErrorDetail, ErrorResponse, PaginationMeta, SuccessResponse, Warning
from app.services import account as account_service
from app.services import installment as installment_service

router = APIRouter(prefix="/api/v1/accounts", tags=["accounts"])


@router.get("")
async def list_accounts(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    items, total = await account_service.list_accounts_with_stats(
        session, household_id, page, page_size
    )
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
    result = await account_service.get_account_detail(session, household_id, account_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Account not found")
            ).model_dump(),
        )
    return SuccessResponse(data=result)


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
        iban_warnings = await account_service.check_iban_duplicate(session, household_id, data.iban)
        warnings.extend(iban_warnings)

    account = await account_service.create_account(session, household_id, data)
    displayed = await account_service.compute_displayed_balance(session, account)
    resp = account_service._build_account_dict(account, displayed)

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
    resp = account_service._build_account_dict(account, displayed)

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
