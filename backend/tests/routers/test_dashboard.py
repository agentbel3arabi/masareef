"""Router-level integration tests for dashboard endpoints."""

import datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.exchange_rate import ExchangeRate
from app.models.household import Household
from app.models.transaction import Transaction
from tests.conftest import TEST_HOUSEHOLD_ID


async def _seed_minimal_data(db_session: AsyncSession) -> None:
    """Seed minimal data so dashboard endpoints don't error on empty tables."""
    db_session.add(Household(id=TEST_HOUSEHOLD_ID, name="Test", base_currency="EGP"))
    await db_session.flush()

    acc = Account(
        household_id=TEST_HOUSEHOLD_ID,
        name="Main",
        type="bank_account",
        currency="EGP",
        balance_minor=100_000,
    )
    db_session.add(acc)
    await db_session.flush()

    db_session.add(
        ExchangeRate(
            date=datetime.date.today(),
            from_currency="USD",
            to_currency="EGP",
            rate_scaled=500_000,
            source="test",
        )
    )

    db_session.add(
        Transaction(
            household_id=TEST_HOUSEHOLD_ID,
            account_id=acc.id,
            date=datetime.date.today(),
            amount_minor=-10_000,
            currency="EGP",
            type="expense",
            description="Test expense",
        )
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_income_vs_expenses_returns_200(client, db_session):
    """GET /api/v1/dashboard/income-vs-expenses returns 200 with data key."""
    await _seed_minimal_data(db_session)
    resp = await client.get("/api/v1/dashboard/income-vs-expenses")
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert isinstance(body["data"], list)


@pytest.mark.asyncio
async def test_spending_by_category_returns_200(client, db_session):
    """GET /api/v1/dashboard/spending-by-category returns 200 with data key."""
    await _seed_minimal_data(db_session)
    resp = await client.get("/api/v1/dashboard/spending-by-category")
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert isinstance(body["data"], list)


@pytest.mark.asyncio
async def test_net_worth_trend_returns_200(client, db_session):
    """GET /api/v1/dashboard/net-worth-trend returns 200 with data key."""
    await _seed_minimal_data(db_session)
    resp = await client.get("/api/v1/dashboard/net-worth-trend")
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert isinstance(body["data"], list)


@pytest.mark.asyncio
async def test_stat_cards_returns_200(client, db_session):
    """GET /api/v1/dashboard/stat-cards returns 200 with data key."""
    await _seed_minimal_data(db_session)
    resp = await client.get("/api/v1/dashboard/stat-cards")
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    # Should have all 4 stat card keys
    data = body["data"]
    assert "net_worth" in data
    assert "spending" in data
    assert "active_debts" in data
    assert "upcoming_payments" in data


@pytest.mark.asyncio
async def test_months_param_validation_zero(client, db_session):
    """months=0 returns 422."""
    await _seed_minimal_data(db_session)
    resp = await client.get("/api/v1/dashboard/income-vs-expenses?months=0")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_months_param_validation_over_60(client, db_session):
    """months=61 returns 422."""
    await _seed_minimal_data(db_session)
    resp = await client.get("/api/v1/dashboard/income-vs-expenses?months=61")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_base_currency_param_validation(client, db_session):
    """base_currency too long returns 422."""
    await _seed_minimal_data(db_session)
    resp = await client.get("/api/v1/dashboard/income-vs-expenses?base_currency=TOOLONG")
    assert resp.status_code == 422
