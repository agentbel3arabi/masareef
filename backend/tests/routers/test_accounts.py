import pytest


@pytest.mark.asyncio
async def test_create_account_returns_201(client):
    response = await client.post(
        "/api/v1/accounts",
        json={
            "name": "CIB Savings",
            "type": "bank_account",
            "currency": "EGP",
            "initial_balance": 1000000,
        },
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == "CIB Savings"
    assert data["balance_minor"] == 1000000
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
            "initial_balance": 1000000,
        },
    )
    account_id = create_resp.json()["data"]["id"]
    recon_resp = await client.post(
        f"/api/v1/accounts/{account_id}/reconcile",
        json={"actual_balance": 1200000},
    )
    assert recon_resp.status_code == 200
    assert recon_resp.json()["data"]["discrepancy"] == 200000
