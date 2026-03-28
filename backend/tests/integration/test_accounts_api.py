"""Integration tests for /api/v1/accounts endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_accounts_empty_or_present(api_client: AsyncClient) -> None:
    """GET /api/v1/accounts returns 200 with data/meta envelope."""
    resp = await api_client.get("/api/v1/accounts")
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert "meta" in body
    assert isinstance(body["data"], list)


@pytest.mark.asyncio
async def test_create_account(api_client: AsyncClient) -> None:
    """POST /api/v1/accounts creates an account and returns it."""
    payload = {
        "name": "Integration Test Account",
        "type": "bank_account",
        "currency": "EGP",
        "initial_balance": 0,
    }
    resp = await api_client.post("/api/v1/accounts", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["data"]["name"] == "Integration Test Account"
    assert body["data"]["currency"] == "EGP"
    assert "id" in body["data"]


@pytest.mark.asyncio
async def test_get_account(api_client: AsyncClient) -> None:
    """GET /api/v1/accounts/{id} returns the account."""
    # Create first
    create_resp = await api_client.post(
        "/api/v1/accounts",
        json={"name": "Fetch Test", "type": "cash_wallet", "currency": "USD"},
    )
    assert create_resp.status_code == 201
    account_id = create_resp.json()["data"]["id"]

    resp = await api_client.get(f"/api/v1/accounts/{account_id}")
    assert resp.status_code == 200
    assert resp.json()["data"]["id"] == account_id


@pytest.mark.asyncio
async def test_delete_account(api_client: AsyncClient) -> None:
    """DELETE /api/v1/accounts/{id} soft-deletes and returns 204."""
    create_resp = await api_client.post(
        "/api/v1/accounts",
        json={"name": "Delete Test", "type": "cash_wallet", "currency": "EGP"},
    )
    assert create_resp.status_code == 201
    account_id = create_resp.json()["data"]["id"]

    del_resp = await api_client.delete(f"/api/v1/accounts/{account_id}")
    assert del_resp.status_code == 204

    # Should no longer appear in list
    list_resp = await api_client.get("/api/v1/accounts")
    ids = [a["id"] for a in list_resp.json()["data"]]
    assert account_id not in ids


@pytest.mark.asyncio
async def test_get_nonexistent_account(api_client: AsyncClient) -> None:
    """GET /api/v1/accounts/999999 returns 404."""
    resp = await api_client.get("/api/v1/accounts/999999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_unauthenticated_request() -> None:
    """Requests without auth token return 401."""
    from httpx import ASGITransport, AsyncClient

    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/accounts")
        assert resp.status_code == 401
