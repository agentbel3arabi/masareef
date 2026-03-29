"""Integration tests for /api/v1/auth/household-status and /api/v1/households endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_household_status_returns_true(api_client: AsyncClient) -> None:
    """Authenticated user with auto-provisioned household → has_household: true."""
    resp = await api_client.get("/api/v1/auth/household-status")
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert body["data"]["has_household"] is True


@pytest.mark.asyncio
async def test_create_household_conflict(api_client: AsyncClient) -> None:
    """Creating a second household returns 409."""
    resp = await api_client.post(
        "/api/v1/households",
        json={"name": "Second Household", "base_currency": "USD"},
    )
    assert resp.status_code == 409
    body = resp.json()
    assert body["error"]["code"] == "ALREADY_HAS_HOUSEHOLD"


@pytest.mark.xfail(
    strict=False,
    reason=(
        "requires a fresh_user_headers fixture (a second Supabase test user with no household). "
        "The current api_client fixture uses a session-scoped user that already has a household. "
        "Verify this happy path manually in UAT: sign up a new user, complete onboarding, "
        "confirm POST /api/v1/households returns 201 with name and base_currency."
    ),
)
@pytest.mark.asyncio
async def test_create_household_success(api_client: AsyncClient) -> None:
    """A fresh user can create a household and gets 201 back."""
    resp = await api_client.post(
        "/api/v1/households",
        json={"name": "My Household", "base_currency": "EGP"},
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["name"] == "My Household"
    assert data["base_currency"] == "EGP"
    assert "id" in data
