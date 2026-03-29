"""Unit tests for /api/v1/auth/household-status and /api/v1/households endpoints."""

import pytest

from app.models.enums import HouseholdRole
from app.models.household import Household, HouseholdMember
from tests.conftest import TEST_USER_ID


@pytest.mark.asyncio
async def test_household_status_no_household(client):
    """Fresh user with no household → has_household: false."""
    resp = await client.get("/api/v1/auth/household-status")
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["has_household"] is False


@pytest.mark.asyncio
async def test_household_status_with_household(client, db_session):
    """User with a household → has_household: true."""
    household = Household(name="Test Home", base_currency="EGP")
    db_session.add(household)
    await db_session.flush()
    member = HouseholdMember(
        household_id=household.id,
        user_id=TEST_USER_ID,
        role=HouseholdRole.ADMIN,
        display_name="Owner",
    )
    db_session.add(member)
    await db_session.commit()

    resp = await client.get("/api/v1/auth/household-status")
    assert resp.status_code == 200
    assert resp.json()["data"]["has_household"] is True


@pytest.mark.asyncio
async def test_create_household_returns_201(client):
    """POST /api/v1/households creates household and returns data."""
    resp = await client.post(
        "/api/v1/households",
        json={"name": "My Household", "base_currency": "EGP"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["data"]["name"] == "My Household"
    assert body["data"]["base_currency"] == "EGP"
    assert "id" in body["data"]


@pytest.mark.asyncio
async def test_create_household_conflict(client):
    """Creating a second household returns 409."""
    # Create first
    resp = await client.post(
        "/api/v1/households",
        json={"name": "First Household", "base_currency": "EGP"},
    )
    assert resp.status_code == 201

    # Try to create second
    resp = await client.post(
        "/api/v1/households",
        json={"name": "Second Household", "base_currency": "USD"},
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "ALREADY_HAS_HOUSEHOLD"
