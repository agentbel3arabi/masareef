import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.dependencies_rbac import get_member_role, require_role
from app.models.enums import HouseholdRole
from app.schemas.common import ErrorDetail, ErrorResponse, PaginationMeta, SuccessResponse
from app.schemas.transfer import TransferCreate
from app.services import transfer as transfer_service

router = APIRouter(prefix="/api/v1/transfers", tags=["transfers"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_transfer(
    data: TransferCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
) -> SuccessResponse:
    try:
        result = await transfer_service.create_transfer(session, household_id, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error=ErrorDetail(code="VALIDATION_ERROR", message=str(e))
            ).model_dump(),
        )
    # Serialize UUIDs to strings for JSON
    return SuccessResponse(
        data={
            "transfer_id": str(result["transfer_id"]),
            "debit_transaction_id": result["debit_transaction_id"],
            "credit_transaction_id": result["credit_transaction_id"],
            "source_amount": result["source_amount"],
            "target_amount": result["target_amount"],
        }
    )


@router.delete("/{transfer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transfer(
    transfer_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
) -> None:
    try:
        await transfer_service.delete_transfer(session, household_id, transfer_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(error=ErrorDetail(code="NOT_FOUND", message=str(e))).model_dump(),
        )


@router.get("")
async def list_transfers(
    account_id: int | None = Query(None),
    date_from: datetime.date | None = Query(None),
    date_to: datetime.date | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    items, total = await transfer_service.list_transfers(
        session,
        household_id,
        account_id=account_id,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )
    # Serialize UUIDs and dates in each item
    serialized = []
    for item in items:
        serialized.append(
            {
                **item,
                "transfer_id": str(item["transfer_id"]) if item["transfer_id"] else None,
                "date": (
                    item["date"].isoformat() if hasattr(item["date"], "isoformat") else item["date"]
                ),
            }
        )
    return SuccessResponse(
        data=serialized,
        meta=PaginationMeta(total=total, page=page, page_size=page_size),
    )
