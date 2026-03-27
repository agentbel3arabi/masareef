import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from app.schemas.common import (
    ErrorDetail,
    ErrorResponse,
    PaginationMeta,
    SuccessResponse,
)
from app.services import category as category_service

router = APIRouter(prefix="/api/v1/categories", tags=["categories"])


@router.get("")
async def list_categories(
    type: str | None = None,
    active_only: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    categories, total = await category_service.list_categories(
        session, household_id, type, active_only, page, page_size
    )
    items = [CategoryResponse.model_validate(cat).model_dump() for cat in categories]
    return SuccessResponse(
        data=items,
        meta=PaginationMeta(total=total, page=page, page_size=page_size),
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    category = await category_service.create_category(session, household_id, data)
    return SuccessResponse(data=CategoryResponse.model_validate(category).model_dump())


@router.put("/{category_id}")
async def update_category(
    category_id: int,
    data: CategoryUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    category = await category_service.get_category(session, household_id, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Category not found")
            ).model_dump(),
        )
    category = await category_service.update_category(session, category, data)
    return SuccessResponse(data=CategoryResponse.model_validate(category).model_dump())


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    category = await category_service.get_category(session, household_id, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Category not found")
            ).model_dump(),
        )
    try:
        await category_service.soft_delete_category(session, category)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ErrorResponse(error=ErrorDetail(code="FORBIDDEN", message=str(e))).model_dump(),
        )
