# backend/app/services/household.py
"""Household business logic. No HTTP awareness."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import HouseholdRole
from app.models.household import Household, HouseholdMember
from app.schemas.household import HouseholdCreate


async def get_household_for_user(
    session: AsyncSession,
    user_id: uuid.UUID,
) -> uuid.UUID | None:
    """Return the household_id for a user, or None if they have no household."""
    result = await session.execute(
        select(HouseholdMember.household_id)
        .where(HouseholdMember.user_id == user_id)
        .limit(1)
    )
    return result.scalar_one_or_none()


async def create_household(
    session: AsyncSession,
    user_id: uuid.UUID,
    data: HouseholdCreate,
) -> Household:
    """Create a household and add user as ADMIN. Raises ValueError if user already has one."""
    existing = await get_household_for_user(session, user_id)
    if existing is not None:
        raise ValueError("User already belongs to a household")

    household = Household(name=data.name, base_currency=data.base_currency)
    session.add(household)
    await session.flush()

    member = HouseholdMember(
        household_id=household.id,
        user_id=user_id,
        role=HouseholdRole.ADMIN,
        display_name="Owner",
    )
    session.add(member)
    await session.flush()
    return household
