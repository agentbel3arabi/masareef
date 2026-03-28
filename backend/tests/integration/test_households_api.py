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
    assert body["detail"]["error"]["code"] == "ALREADY_HAS_HOUSEHOLD"
