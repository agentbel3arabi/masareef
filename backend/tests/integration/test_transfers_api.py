"""Integration tests for /api/v1/transfers endpoints."""

from datetime import date

import pytest
import pytest_asyncio
from httpx import AsyncClient


@pytest_asyncio.fixture
async def two_accounts(api_client: AsyncClient) -> tuple[int, int]:
    """Create two accounts for transfer tests."""
    acc1 = await api_client.post(
        "/api/v1/accounts",
        json={"name": "Transfer From", "type": "bank_account", "currency": "EGP"},
    )
    assert acc1.status_code == 201
    acc2 = await api_client.post(
        "/api/v1/accounts",
        json={"name": "Transfer To", "type": "cash_wallet", "currency": "EGP"},
    )
    assert acc2.status_code == 201
    return acc1.json()["data"]["id"], acc2.json()["data"]["id"]


@pytest.mark.asyncio
async def test_list_transfers(api_client: AsyncClient) -> None:
    """GET /api/v1/transfers returns 200 with envelope."""
    resp = await api_client.get("/api/v1/transfers")
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert "meta" in body
    assert isinstance(body["data"], list)


@pytest.mark.asyncio
async def test_create_transfer(api_client: AsyncClient, two_accounts) -> None:
    """POST /api/v1/transfers creates a transfer between two accounts."""
    from_id, to_id = two_accounts
    payload = {
        "from_account_id": from_id,
        "to_account_id": to_id,
        "amount_minor": 100000,
        "date": str(date.today()),
        "description": "Integration test transfer",
    }
    resp = await api_client.post("/api/v1/transfers", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    assert "transfer_id" in body["data"]
    assert body["data"]["source_amount"] == 100000
    assert isinstance(body["data"]["debit_transaction_id"], int)
    assert isinstance(body["data"]["credit_transaction_id"], int)
