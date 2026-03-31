# backend/app/routers/households.py
import uuid
from typing import Any

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db_session
from app.schemas.household import HouseholdCreate
from app.services import household as household_service

router = APIRouter(prefix="/api/v1", tags=["households"])


@router.get("/auth/household-status")
async def get_household_status(
    session: AsyncSession = Depends(get_db_session),
    user_id: uuid.UUID = Depends(get_current_user),
) -> dict:
    """Check if authenticated user has a household. Does NOT auto-provision."""
    household_id = await household_service.get_household_for_user(session, user_id)
    return {"data": {"has_household": household_id is not None}}


@router.post("/households", status_code=status.HTTP_201_CREATED, response_model=None)
async def create_household(
    data: HouseholdCreate,
    session: AsyncSession = Depends(get_db_session),
    user_id: uuid.UUID = Depends(get_current_user),
) -> Any:
    """Create a household and add the current user as admin. Called during onboarding."""
    try:
        household = await household_service.create_household(session, user_id, data)
    except ValueError:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": {
                    "code": "ALREADY_HAS_HOUSEHOLD",
                    "message": "User already belongs to a household",
                }
            },
        )
    return {
        "data": {
            "id": str(household.id),
            "name": household.name,
            "base_currency": household.base_currency,
        }
    }
