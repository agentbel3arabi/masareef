"""Tests for dashboard Pydantic schemas and household PATCH endpoint."""

import pytest
from pydantic import ValidationError

from app.models.household import Household
from tests.conftest import TEST_HOUSEHOLD_ID

# -- Schema validation tests --


def test_household_update_valid():
    """HouseholdUpdate(base_currency="USD") validates successfully."""
    from app.schemas.household import HouseholdUpdate

    update = HouseholdUpdate(base_currency="USD")
    assert update.base_currency == "USD"


def test_household_update_invalid_long_currency():
    """HouseholdUpdate(base_currency="INVALID_LONG") fails max_length=3 validation."""
    from app.schemas.household import HouseholdUpdate

    with pytest.raises(ValidationError):
        HouseholdUpdate(base_currency="INVALID_LONG")  # type: ignore[arg-type]


def test_dashboard_schemas_instantiate():
    """All dashboard schema classes can be instantiated with valid data."""
    from app.schemas.dashboard import (
        IncomeVsExpensesMonth,
        NetWorthTrendPoint,
        SpendingByCategory,
        StatCardItem,
        StatCardsData,
        StatCardTrend,
    )

    trend = StatCardTrend(direction="up", absolute_delta=5000, percentage=12.5)
    assert trend.direction == "up"

    item = StatCardItem(label="Net Worth", value_minor=100000, currency="EGP", trend=trend)
    assert item.value_minor == 100000

    cards = StatCardsData(
        net_worth=StatCardItem(label="Net Worth", value_minor=100000, currency="EGP"),
        spending=StatCardItem(label="Spending", value_minor=50000, currency="EGP"),
        active_debts=StatCardItem(
            label="Active Debts", value_minor=200000, currency="EGP", count=3
        ),
        upcoming_payments=StatCardItem(
            label="Upcoming", value_minor=10000, currency="EGP", count=2
        ),
    )
    assert cards.net_worth.label == "Net Worth"

    month_data = IncomeVsExpensesMonth(
        month="2026-01", income_minor=50000, expenses_minor=30000, currency="EGP"
    )
    assert month_data.month == "2026-01"

    spending = SpendingByCategory(
        category_id=1,
        category_name="Food",
        category_name_ar="طعام",
        category_color="#FF0000",
        amount_minor=15000,
        percentage=30.0,
        currency="EGP",
    )
    assert spending.percentage == 30.0

    nw_point = NetWorthTrendPoint(
        month="2026-03",
        accounts_minor=500000,
        debts_minor=200000,
        net_worth_minor=300000,
        currency="EGP",
    )
    assert nw_point.net_worth_minor == 300000


# -- Household PATCH endpoint tests --


@pytest.mark.asyncio
async def test_patch_household_updates_base_currency(client, db_session):
    """PATCH /api/v1/households with {"base_currency": "USD"} returns 200."""
    household = Household(id=TEST_HOUSEHOLD_ID, name="Test", base_currency="EGP")
    db_session.add(household)
    await db_session.commit()

    resp = await client.patch(
        "/api/v1/households",
        json={"base_currency": "USD"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["base_currency"] == "USD"
    assert body["data"]["id"] == str(TEST_HOUSEHOLD_ID)


@pytest.mark.asyncio
async def test_patch_household_empty_body_422(client, db_session):
    """PATCH /api/v1/households with empty body returns 422."""
    household = Household(id=TEST_HOUSEHOLD_ID, name="Test", base_currency="EGP")
    db_session.add(household)
    await db_session.commit()

    resp = await client.patch(
        "/api/v1/households",
        json={},
    )
    assert resp.status_code == 422
