import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from app.schemas.common import PaginationMeta, SuccessResponse

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
    q = select(Category).where(
        (Category.household_id == household_id) | (Category.household_id.is_(None))
    )
    count_q = select(func.count(Category.id)).where(
        (Category.household_id == household_id) | (Category.household_id.is_(None))
    )

    if active_only:
        q = q.where(Category.is_active == True)  # noqa: E712
        count_q = count_q.where(Category.is_active == True)  # noqa: E712
    if type:
        q = q.where(Category.type == type)
        count_q = count_q.where(Category.type == type)

    total = (await session.execute(count_q)).scalar_one()
    q = q.order_by(Category.sort_order).offset((page - 1) * page_size).limit(page_size)
    result = await session.execute(q)
    categories = result.scalars().all()

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
    category = Category(
        household_id=household_id,
        name_en=data.name_en,
        name_ar=data.name_ar,
        type=data.type,
        icon=data.icon,
        color=data.color,
        is_predefined=False,
    )
    session.add(category)
    await session.flush()
    return SuccessResponse(data=CategoryResponse.model_validate(category).model_dump())


@router.put("/{category_id}")
async def update_category(
    category_id: int,
    data: CategoryUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    q = select(Category).where(
        Category.id == category_id,
        Category.is_active == True,  # noqa: E712
        (Category.household_id == household_id) | (Category.household_id.is_(None)),
    )
    result = await session.execute(q)
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    update_data = data.model_dump(exclude_unset=True)

    # Predefined categories: only icon and color are editable
    if category.is_predefined:
        allowed = {"icon", "color"}
        update_data = {k: v for k, v in update_data.items() if k in allowed}

    for field, value in update_data.items():
        setattr(category, field, value)
    await session.flush()

    return SuccessResponse(data=CategoryResponse.model_validate(category).model_dump())


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    q = select(Category).where(
        Category.id == category_id,
        Category.is_active == True,  # noqa: E712
        (Category.household_id == household_id) | (Category.household_id.is_(None)),
    )
    result = await session.execute(q)
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    if category.is_predefined:
        raise HTTPException(status_code=403, detail="Cannot delete predefined categories")

    category.is_active = False
    await session.flush()
