"""Role-based access control dependencies for FastAPI routers."""

import uuid
from collections.abc import Callable
from typing import Any

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db_session, get_household_id
from app.models.enums import HouseholdRole
from app.models.household import HouseholdMember


async def get_member_role(
    session: AsyncSession = Depends(get_db_session),
    user_id: uuid.UUID = Depends(get_current_user),
    household_id: uuid.UUID = Depends(get_household_id),
) -> HouseholdRole:
    """Resolve the current user's role within their household."""
    result = await session.execute(
        select(HouseholdMember.role).where(
            HouseholdMember.household_id == household_id,
            HouseholdMember.user_id == user_id,
        )
    )
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this household",
        )
    return role


def require_role(
    *allowed: HouseholdRole,
) -> Callable[..., Any]:
    """Dependency factory: raises 403 if the user's role is not in allowed set.

    Usage in a router:
        role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER))
    """

    async def _check(
        role: HouseholdRole = Depends(get_member_role),
    ) -> HouseholdRole:
        if role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role.value}' is not permitted for this action",
            )
        return role

    return _check
