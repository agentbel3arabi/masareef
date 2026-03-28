import uuid
from typing import Literal

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db_session
from app.models.enums import HouseholdRole
from app.models.household import Household, HouseholdMember

router = APIRouter(prefix="/api/v1", tags=["households"])


class HouseholdCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    base_currency: Literal["EGP", "USD", "EUR", "GBP", "SAR", "AED", "KWD"] = "EGP"


@router.get("/auth/household-status")
async def get_household_status(
    session: AsyncSession = Depends(get_db_session),
    user_id: uuid.UUID = Depends(get_current_user),
) -> dict:
    """Check if authenticated user has a household. Does NOT auto-provision."""
    result = await session.execute(
        select(HouseholdMember.household_id).where(HouseholdMember.user_id == user_id)
    )
    household_id = result.scalar_one_or_none()
    return {"data": {"has_household": household_id is not None}}


@router.post("/households", status_code=status.HTTP_201_CREATED)
async def create_household(
    data: HouseholdCreate,
    session: AsyncSession = Depends(get_db_session),
    user_id: uuid.UUID = Depends(get_current_user),
) -> dict | JSONResponse:
    """Create a household and add the current user as admin. Called during onboarding."""
    # Prevent creating a second household
    existing = await session.execute(
        select(HouseholdMember.household_id).where(HouseholdMember.user_id == user_id)
    )
    if existing.scalar_one_or_none():
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": {
                    "code": "ALREADY_HAS_HOUSEHOLD",
                    "message": "User already belongs to a household",
                }
            },
        )

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
    # session.commit() is handled by get_db_session dependency
    return {
        "data": {
            "id": str(household.id),
            "name": household.name,
            "base_currency": household.base_currency,
        }
    }
