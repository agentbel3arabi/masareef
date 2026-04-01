import pytest


async def _create_account(client, *, account_type="bank_account", credit_limit=None):
    resp = await client.post(
        "/api/v1/accounts",
        json={
            "name": f"Test {account_type}",
            "type": account_type,
            "currency": "EGP",
            "initial_balance": 0,
            "credit_limit": credit_limit,
        },
    )
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


@pytest.mark.asyncio
async def test_bank_account_shows_linked_debts(client):
    bank_id = await _create_account(client, account_type="bank_account")
    # Create a bank loan linked to this account
    await client.post(
        "/api/v1/debts",
        json={
            "type": "bank_loan",
            "name": "Car Loan",
            "institution": "CIB",
            "principal_minor": 50000000,
            "currency": "EGP",
            "annual_rate_percent": 14.5,
            "tenure_months": 60,
            "start_date": "2024-01-01",
            "linked_account_id": bank_id,
        },
    )
    resp = await client.get(f"/api/v1/accounts/{bank_id}/obligations")
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert len(body["debts"]) == 1
    assert body["debts"][0]["name"] == "Car Loan"
    assert body["installments"] == []


@pytest.mark.asyncio
async def test_credit_card_shows_linked_installments(client):
    cc_id = await _create_account(client, account_type="credit_card", credit_limit=10000000)
    await client.post(
        "/api/v1/installments",
        json={
            "type": "credit_card",
            "name": "iPhone Plan",
            "merchant_name": "B.TECH",
            "source_account_id": cc_id,
            "total_amount_minor": 5400000,
            "monthly_amount_minor": 450000,
            "total_months": 12,
            "start_month": "2024-06-01",
            "currency": "EGP",
        },
    )
    resp = await client.get(f"/api/v1/accounts/{cc_id}/obligations")
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["debts"] == []
    assert len(body["installments"]) == 1
    assert body["installments"][0]["name"] == "iPhone Plan"
    assert "remaining_minor" in body["installments"][0]
    assert "remaining_months" in body["installments"][0]


@pytest.mark.asyncio
async def test_account_with_no_obligations(client):
    acct_id = await _create_account(client, account_type="bank_account")
    resp = await client.get(f"/api/v1/accounts/{acct_id}/obligations")
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["debts"] == []
    assert body["installments"] == []