"""Category business logic. No HTTP awareness."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


async def list_categories(
    session: AsyncSession,
    household_id: uuid.UUID,
    type: str | None = None,
    active_only: bool = True,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Category], int]:
    """List categories visible to a household (predefined + custom)."""
    base_filter = (Category.household_id == household_id) | (Category.household_id.is_(None))
    q = select(Category).where(base_filter)
    count_q = select(func.count(Category.id)).where(base_filter)

    if active_only:
        q = q.where(Category.is_active.is_(True))
        count_q = count_q.where(Category.is_active.is_(True))
    if type:
        q = q.where(Category.type == type)
        count_q = count_q.where(Category.type == type)

    total = (await session.execute(count_q)).scalar_one()
    q = q.order_by(Category.sort_order).offset((page - 1) * page_size).limit(page_size)
    result = await session.execute(q)
    return list(result.scalars().all()), total


async def get_category(
    session: AsyncSession,
    household_id: uuid.UUID,
    category_id: int,
) -> Category | None:
    """Get a single active category by ID (predefined or household-owned)."""
    q = select(Category).where(
        Category.id == category_id,
        Category.is_active.is_(True),
        (Category.household_id == household_id) | (Category.household_id.is_(None)),
    )
    result = await session.execute(q)
    return result.scalar_one_or_none()


async def create_category(
    session: AsyncSession,
    household_id: uuid.UUID,
    data: CategoryCreate,
) -> Category:
    """Create a custom (non-predefined) category."""
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
    return category


async def update_category(
    session: AsyncSession,
    category: Category,
    data: CategoryUpdate,
) -> Category:
    """Update category fields. Predefined categories: only icon and color."""
    update_data = data.model_dump(exclude_unset=True)

    if category.is_predefined:
        allowed = {"icon", "color"}
        update_data = {k: v for k, v in update_data.items() if k in allowed}

    for field, value in update_data.items():
        setattr(category, field, value)
    await session.flush()
    return category


async def soft_delete_category(
    session: AsyncSession,
    category: Category,
) -> None:
    """Soft delete a category. Raises ValueError for predefined categories."""
    if category.is_predefined:
        raise ValueError("Cannot delete predefined categories")
    category.is_active = False
    await session.flush()
