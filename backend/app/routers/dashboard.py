"""Dashboard aggregation API endpoints."""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.dependencies_rbac import get_member_role
from app.models.enums import HouseholdRole
from app.schemas.common import SuccessResponse
from app.services import dashboard as dashboard_service

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/income-vs-expenses")
async def get_income_vs_expenses(
    months: int = Query(6, ge=1, le=60),
    base_currency: str = Query("EGP", max_length=3),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    """Return monthly income and expense totals grouped by month."""
    result = await dashboard_service.get_income_vs_expenses(
        session, household_id, months=months, base_currency=base_currency
    )
    data = [item.model_dump() for item in result]
    return SuccessResponse(data=data)


@router.get("/spending-by-category")
async def get_spending_by_category(
    base_currency: str = Query("EGP", max_length=3),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    """Return top 8 spending categories + Other for the current month."""
    result = await dashboard_service.get_spending_by_category(
        session, household_id, base_currency=base_currency
    )
    data = [item.model_dump() for item in result]
    return SuccessResponse(data=data)


@router.get("/net-worth-trend")
async def get_net_worth_trend(
    months: int = Query(6, ge=1, le=60),
    base_currency: str = Query("EGP", max_length=3),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    """Return monthly net worth data points."""
    result = await dashboard_service.get_net_worth_trend(
        session, household_id, months=months, base_currency=base_currency
    )
    data = [item.model_dump() for item in result]
    return SuccessResponse(data=data)


@router.get("/stat-cards")
async def get_stat_cards(
    base_currency: str = Query("EGP", max_length=3),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    """Return all 4 stat card values with month-over-month deltas."""
    result = await dashboard_service.get_stat_cards(
        session, household_id, base_currency=base_currency
    )
    return SuccessResponse(data=result.model_dump())
