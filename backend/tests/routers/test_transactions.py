import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _create_account(client) -> int:
    """Create a test account and return its id."""
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


async def _create_tx(client, account_id: int, amount_minor: int = 50000) -> dict:
    """Create a debit transaction and return response data."""
    resp = await client.post(
        "/api/v1/transactions",
        json={
            "account_id": account_id,
            "date": "2024-01-15",
            "description": "Test Transaction",
            "amount_minor": amount_minor,
            "type": "debit",
            "currency": "EGP",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_transaction_debit(client):
    """Create a debit tx (amount_minor=50000); stored amount should be -50000."""
    account_id = await _create_account(client)
    resp = await client.post(
        "/api/v1/transactions",
        json={
            "account_id": account_id,
            "date": "2024-01-15",
            "description": "Grocery run",
            "amount_minor": 50000,
            "type": "debit",
            "currency": "EGP",
        },
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["type"] == "debit"
    # Service stores debit as negative signed amount
    assert data["amount_minor"] == -50000


@pytest.mark.asyncio
async def test_create_transaction_updates_balance(client):
    """Create a debit 50000 on account with initial_balance=1000000.

    Balance should drop to 950000.
    """
    account_id = await _create_account(client)
    await _create_tx(client, account_id, amount_minor=50000)

    acct_resp = await client.get(f"/api/v1/accounts/{account_id}")
    assert acct_resp.status_code == 200
    balance = acct_resp.json()["data"]["balance_minor"]
    assert balance == 950000


@pytest.mark.asyncio
async def test_delete_transaction_reverses_balance(client):
    """Delete a debit tx; account balance should be restored to initial 1000000."""
    account_id = await _create_account(client)
    tx = await _create_tx(client, account_id, amount_minor=50000)
    tx_id = tx["id"]

    del_resp = await client.delete(f"/api/v1/transactions/{tx_id}")
    assert del_resp.status_code == 204

    acct_resp = await client.get(f"/api/v1/accounts/{account_id}")
    balance = acct_resp.json()["data"]["balance_minor"]
    assert balance == 1000000


@pytest.mark.asyncio
async def test_list_transactions_with_filters(client):
    """Create a tx with description 'Carrefour'; listing with q=Carrefour should return >= 1."""
    account_id = await _create_account(client)
    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": account_id,
            "date": "2024-01-15",
            "description": "Carrefour Shopping",
            "amount_minor": 30000,
            "type": "debit",
            "currency": "EGP",
        },
    )

    list_resp = await client.get("/api/v1/transactions", params={"q": "Carrefour"})
    assert list_resp.status_code == 200
    body = list_resp.json()
    assert body["meta"]["total"] >= 1
    assert any("Carrefour" in item["description"] for item in body["data"])


@pytest.mark.asyncio
async def test_split_transaction(client):
    """Split a 100000-minor debit into two categories totalling 100000; expect 200."""
    account_id = await _create_account(client)
    tx = await _create_tx(client, account_id, amount_minor=100000)
    tx_id = tx["id"]

    split_resp = await client.post(
        f"/api/v1/transactions/{tx_id}/split",
        json={
            "splits": [
                {"category_id": 1, "amount_minor": 60000},
                {"category_id": 2, "amount_minor": 40000},
            ]
        },
    )
    assert split_resp.status_code == 200
    data = split_resp.json()["data"]
    assert len(data) == 2


@pytest.mark.asyncio
async def test_split_validation_sum_mismatch(client):
    """Split amounts that don't sum to tx amount should return 400."""
    account_id = await _create_account(client)
    tx = await _create_tx(client, account_id, amount_minor=100000)
    tx_id = tx["id"]

    split_resp = await client.post(
        f"/api/v1/transactions/{tx_id}/split",
        json={
            "splits": [
                {"category_id": 1, "amount_minor": 60000},
                {"category_id": 2, "amount_minor": 30000},  # sum = 90000 ≠ 100000
            ]
        },
    )
    assert split_resp.status_code == 400
    body = split_resp.json()
    assert body["detail"]["error"]["code"] == "SPLIT_SUM_MISMATCH"


@pytest.mark.asyncio
async def test_bulk_delete(client):
    """Create 3 transactions, bulk delete all; response deleted count should be 3."""
    account_id = await _create_account(client)
    ids = []
    for _ in range(3):
        tx = await _create_tx(client, account_id, amount_minor=10000)
        ids.append(tx["id"])

    bulk_resp = await client.post(
        "/api/v1/transactions/bulk/delete",
        json={"ids": ids},
    )
    assert bulk_resp.status_code == 200
    assert bulk_resp.json()["data"]["deleted"] == 3
