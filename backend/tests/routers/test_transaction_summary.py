"""Router-level tests for GET /api/v1/transactions/summary."""

import pytest


async def _create_account(client) -> int:
    resp = await client.post(
        "/api/v1/accounts",
        json={
            "name": "Test",
            "type": "bank_account",
            "currency": "EGP",
            "initial_balance": 1000000,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]["id"]


async def _create_tx(client, account_id: int, *, amount_minor: int, tx_type: str, date: str):
    resp = await client.post(
        "/api/v1/transactions",
        json={
            "account_id": account_id,
            "date": date,
            "description": "Test",
            "amount_minor": amount_minor,
            "type": tx_type,
            "currency": "EGP",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


@pytest.mark.asyncio
async def test_default_period_returns_200(client):
    """GET /summary with default period=month returns 200 with correct shape."""
    resp = await client.get("/api/v1/transactions/summary")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "total_income" in data
    assert "total_expenses" in data
    assert "net_flow" in data
    assert "transaction_count" in data
    assert "currency" in data
    assert "period" in data
    assert "start" in data["period"]
    assert "end" in data["period"]


@pytest.mark.asyncio
async def test_custom_period_with_transactions(client):
    """Custom period with transactions returns correct totals."""
    acct_id = await _create_account(client)
    # Create income (credit)
    await _create_tx(
        client, acct_id, amount_minor=200000, tx_type="credit", date="2026-04-10"
    )
    # Create expense (debit)
    await _create_tx(
        client, acct_id, amount_minor=50000, tx_type="debit", date="2026-04-15"
    )

    resp = await client.get(
        "/api/v1/transactions/summary",
        params={
            "period": "custom",
            "start_date": "2026-04-01",
            "end_date": "2026-04-30",
        },
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["total_income"] == 200000
    assert data["total_expenses"] == 50000
    assert data["net_flow"] == 150000
    assert data["transaction_count"] == 2


@pytest.mark.asyncio
async def test_account_filter(client):
    """account_id filter scopes results to that account."""
    acct1 = await _create_account(client)
    # Create second account
    resp = await client.post(
        "/api/v1/accounts",
        json={
            "name": "Other",
            "type": "bank_account",
            "currency": "EGP",
            "initial_balance": 0,
        },
    )
    acct2 = resp.json()["data"]["id"]

    await _create_tx(
        client, acct1, amount_minor=50000, tx_type="debit", date="2026-04-05"
    )
    await _create_tx(
        client, acct2, amount_minor=70000, tx_type="debit", date="2026-04-05"
    )

    resp = await client.get(
        "/api/v1/transactions/summary",
        params={
            "period": "custom",
            "start_date": "2026-04-01",
            "end_date": "2026-04-30",
            "account_id": acct1,
        },
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["total_expenses"] == 50000
    assert data["transaction_count"] == 1
