"""Tests for Phase 3.75 Unit 2 — account & transaction enrichments."""

import pytest


async def _create_account(client, name="Test"):
    resp = await client.post(
        "/api/v1/accounts",
        json={
            "name": name,
            "type": "bank_account",
            "currency": "EGP",
            "opening_balance": 1000000,
        },
    )
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


async def _create_transaction(client, account_id, amount=50000, tx_type="debit"):
    resp = await client.post(
        "/api/v1/transactions",
        json={
            "account_id": account_id,
            "date": "2026-04-01",
            "description": "Test tx",
            "amount_minor": amount,
            "type": tx_type,
        },
    )
    assert resp.status_code == 201
    return resp.json()["data"]


# ---- Task 2.1: last_transaction_date on AccountResponse ----


@pytest.mark.asyncio
async def test_account_response_includes_last_transaction_date_none(client):
    """AccountResponse includes last_transaction_date field (None when no txs)."""
    await _create_account(client, "Empty Account")
    resp = await client.get("/api/v1/accounts")
    assert resp.status_code == 200
    accounts = resp.json()["data"]
    assert len(accounts) >= 1
    acct = accounts[0]
    assert "last_transaction_date" in acct
    assert acct["last_transaction_date"] is None


@pytest.mark.asyncio
async def test_last_transaction_date_populated_after_transaction(client):
    """last_transaction_date populated after creating a transaction."""
    acct_id = await _create_account(client, "With Txs")
    await _create_transaction(client, acct_id)
    resp = await client.get("/api/v1/accounts")
    assert resp.status_code == 200
    accounts = resp.json()["data"]
    acct = next(a for a in accounts if a["id"] == acct_id)
    assert acct["last_transaction_date"] == "2026-04-01"


# ---- Task 2.2: balance-history endpoint ----


@pytest.mark.asyncio
async def test_balance_history_returns_correct_shape(client):
    """balance-history endpoint returns correct shape and 200."""
    acct_id = await _create_account(client, "History Account")
    await _create_transaction(client, acct_id, amount=10000, tx_type="debit")
    resp = await client.get(f"/api/v1/accounts/{acct_id}/balance-history")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "current_balance" in data
    assert "period_start_balance" in data
    assert "change" in data
    assert "change_direction" in data
    assert "period" in data
    assert data["period"] == "month"


@pytest.mark.asyncio
async def test_balance_history_no_transactions_unchanged(client):
    """balance-history with no transactions shows unchanged."""
    acct_id = await _create_account(client, "Unchanged Account")
    resp = await client.get(f"/api/v1/accounts/{acct_id}/balance-history")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["change"] == 0
    assert data["change_direction"] == "unchanged"
    assert data["current_balance"] == data["period_start_balance"]


@pytest.mark.asyncio
async def test_balance_history_not_found(client):
    """balance-history returns 404 for non-existent account."""
    resp = await client.get("/api/v1/accounts/99999/balance-history")
    assert resp.status_code == 404


# ---- Task 2.3: last-used-account endpoint ----


@pytest.mark.asyncio
async def test_last_used_account_returns_account_id(client):
    """last-used-account returns most recent account_id."""
    acct_id = await _create_account(client, "Recent Account")
    await _create_transaction(client, acct_id)
    resp = await client.get("/api/v1/transactions/last-used-account")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["account_id"] == acct_id


@pytest.mark.asyncio
async def test_last_used_account_returns_404_when_no_transactions(client):
    """last-used-account returns 404 when no transactions."""
    resp = await client.get("/api/v1/transactions/last-used-account")
    assert resp.status_code == 404


# ---- Task 2.4: debt_id on TransactionResponse ----


@pytest.mark.asyncio
async def test_transaction_response_includes_debt_id_none(client):
    """TransactionResponse includes debt_id field (None for normal txs)."""
    acct_id = await _create_account(client, "Debt Test Account")
    tx = await _create_transaction(client, acct_id)
    assert "debt_id" in tx
    assert tx["debt_id"] is None
