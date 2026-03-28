"""Integration tests for /api/v1/transactions endpoints."""

from datetime import date

import pytest
import pytest_asyncio
from httpx import AsyncClient


@pytest_asyncio.fixture
async def test_account_id(api_client: AsyncClient) -> int:
    """Create a throwaway account for transaction tests."""
    resp = await api_client.post(
        "/api/v1/accounts",
        json={"name": "Tx Test Account", "type": "bank_account", "currency": "EGP"},
    )
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


@pytest.mark.asyncio
async def test_list_transactions(api_client: AsyncClient, test_account_id: int) -> None:
    """GET /api/v1/transactions returns 200 with envelope."""
    resp = await api_client.get("/api/v1/transactions", params={"account_id": test_account_id})
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert "meta" in body


@pytest.mark.asyncio
async def test_create_transaction(api_client: AsyncClient, test_account_id: int) -> None:
    """POST /api/v1/transactions creates a transaction."""
    payload = {
        "account_id": test_account_id,
        "date": str(date.today()),
        "description": "Test Purchase",
        "amount_minor": 50000,
        "type": "debit",
        "currency": "EGP",
    }
    resp = await api_client.post("/api/v1/transactions", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["data"]["account_id"] == test_account_id
    assert "id" in body["data"]
    assert body["data"]["description"] == "Test Purchase"
    assert body["data"]["currency"] == "EGP"
    assert body["data"]["type"] == "debit"


@pytest.mark.asyncio
async def test_delete_transaction(api_client: AsyncClient, test_account_id: int) -> None:
    """DELETE /api/v1/transactions/{id} soft-deletes and returns 204."""
    create_resp = await api_client.post(
        "/api/v1/transactions",
        json={
            "account_id": test_account_id,
            "date": str(date.today()),
            "description": "To be deleted",
            "amount_minor": 10000,
            "type": "debit",
            "currency": "EGP",
        },
    )
    assert create_resp.status_code == 201
    tx_id = create_resp.json()["data"]["id"]

    del_resp = await api_client.delete(f"/api/v1/transactions/{tx_id}")
    assert del_resp.status_code == 204

    # Verify soft-delete: transaction no longer appears in account's list
    list_resp = await api_client.get("/api/v1/transactions", params={"account_id": test_account_id})
    assert list_resp.status_code == 200
    ids = [tx["id"] for tx in list_resp.json()["data"]]
    assert tx_id not in ids


@pytest.mark.asyncio
async def test_transaction_filters(api_client: AsyncClient, test_account_id: int) -> None:
    """Query params (type) filter results correctly."""
    # Seed a debit transaction first so the filter has something to match
    await api_client.post(
        "/api/v1/transactions",
        json={
            "account_id": test_account_id,
            "date": str(date.today()),
            "description": "Filter Test",
            "amount_minor": 25000,
            "type": "debit",
            "currency": "EGP",
        },
    )
    resp = await api_client.get(
        "/api/v1/transactions",
        params={"account_id": test_account_id, "type": "debit", "page": 1, "page_size": 10},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert "meta" in body
    assert isinstance(body["data"], list)
    assert len(body["data"]) >= 1
    for tx in body["data"]:
        assert tx["type"] == "debit"
