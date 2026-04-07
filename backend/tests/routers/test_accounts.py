import pytest


@pytest.mark.asyncio
async def test_create_account_returns_201(client):
    response = await client.post(
        "/api/v1/accounts",
        json={
            "name": "CIB Savings",
            "type": "bank_account",
            "currency": "EGP",
            "opening_balance": 1000000,
        },
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == "CIB Savings"
    assert data["displayed_balance_minor"] == 1000000


@pytest.mark.asyncio
async def test_list_accounts_returns_paginated(client):
    # Create two accounts
    await client.post(
        "/api/v1/accounts",
        json={"name": "Account A", "type": "bank_account", "currency": "EGP"},
    )
    await client.post(
        "/api/v1/accounts",
        json={"name": "Account B", "type": "cash_wallet", "currency": "EGP"},
    )
    response = await client.get("/api/v1/accounts")
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert "meta" in body
    assert body["meta"]["total"] >= 2


@pytest.mark.asyncio
async def test_get_account_not_found_returns_404(client):
    response = await client.get("/api/v1/accounts/99999")
    assert response.status_code == 404
    # FastAPI wraps HTTPException detail as {"detail": <detail_value>}
    body = response.json()
    assert "detail" in body
    assert body["detail"]["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_delete_account_soft_deletes(client):
    create_resp = await client.post(
        "/api/v1/accounts",
        json={"name": "To Delete", "type": "bank_account", "currency": "EGP"},
    )
    account_id = create_resp.json()["data"]["id"]
    delete_resp = await client.delete(f"/api/v1/accounts/{account_id}")
    assert delete_resp.status_code == 204
    # Should not appear in list
    list_resp = await client.get("/api/v1/accounts")
    ids = [a["id"] for a in list_resp.json()["data"]]
    assert account_id not in ids


@pytest.mark.asyncio
async def test_update_account(client):
    create_resp = await client.post(
        "/api/v1/accounts",
        json={"name": "Old Name", "type": "bank_account", "currency": "EGP"},
    )
    account_id = create_resp.json()["data"]["id"]
    update_resp = await client.put(
        f"/api/v1/accounts/{account_id}",
        json={"name": "New Name"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["name"] == "New Name"


@pytest.mark.asyncio
async def test_reconcile_account(client):
    create_resp = await client.post(
        "/api/v1/accounts",
        json={
            "name": "Reconcile Test",
            "type": "bank_account",
            "currency": "EGP",
            "opening_balance": 1000000,
        },
    )
    account_id = create_resp.json()["data"]["id"]
    recon_resp = await client.post(
        f"/api/v1/accounts/{account_id}/reconcile",
        json={"actual_balance": 1200000},
    )
    assert recon_resp.status_code == 200
    data = recon_resp.json()["data"]
    assert data["adjustment"] == 200000


@pytest.mark.asyncio
async def test_list_accounts_batch_balance(client):
    """List accounts returns correct displayed_balance_minor via batch computation."""
    # Create bank account with opening balance
    resp1 = await client.post(
        "/api/v1/accounts",
        json={
            "name": "Bank A",
            "type": "bank_account",
            "currency": "EGP",
            "opening_balance": 500000,
        },
    )
    assert resp1.status_code == 201
    acct1_id = resp1.json()["data"]["id"]

    # Create empty account (no opening balance)
    resp2 = await client.post(
        "/api/v1/accounts",
        json={"name": "Cash B", "type": "cash_wallet", "currency": "EGP"},
    )
    assert resp2.status_code == 201
    acct2_id = resp2.json()["data"]["id"]

    # List accounts and check balances
    list_resp = await client.get("/api/v1/accounts")
    assert list_resp.status_code == 200
    accounts = list_resp.json()["data"]
    balance_map = {a["id"]: a["displayed_balance_minor"] for a in accounts}
    assert balance_map[acct1_id] == 500000
    assert balance_map[acct2_id] == 0


@pytest.mark.asyncio
async def test_list_balance_matches_single_get(client):
    """Balance in list endpoint matches single-account GET endpoint."""
    create_resp = await client.post(
        "/api/v1/accounts",
        json={
            "name": "Consistency Check",
            "type": "bank_account",
            "currency": "EGP",
            "opening_balance": 750000,
        },
    )
    acct_id = create_resp.json()["data"]["id"]

    # Add a transaction via the transaction endpoint
    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": acct_id,
            "date": "2026-01-15",
            "description": "Salary",
            "amount_minor": 200000,
            "currency": "EGP",
            "type": "credit",
        },
    )

    # Get single account balance
    single_resp = await client.get(f"/api/v1/accounts/{acct_id}")
    single_balance = single_resp.json()["data"]["displayed_balance_minor"]

    # Get list account balance
    list_resp = await client.get("/api/v1/accounts")
    list_balance = next(
        a["displayed_balance_minor"]
        for a in list_resp.json()["data"]
        if a["id"] == acct_id
    )

    assert list_balance == single_balance
