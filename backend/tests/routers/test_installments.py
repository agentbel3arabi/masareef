# backend/tests/routers/test_installments.py
import pytest


def _cc_payload(**overrides):
    """Factory for a valid CC installment creation payload."""
    payload = {
        "type": "credit_card",
        "name": "iPhone 16 Pro",
        "merchant_name": "B.TECH",
        "source_account_id": None,  # must be set per test
        "total_amount_minor": 5400000,
        "monthly_amount_minor": 450000,
        "total_months": 12,
        "start_month": "2026-05-01",  # Future date to ensure "active" status
        "currency": "EGP",
    }
    payload.update(overrides)
    return payload


async def _create_account(client, *, account_type="credit_card", credit_limit=10000000):
    """Helper: create an account via API and return its ID."""
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
async def test_create_cc_installment_returns_201(client):
    acct_id = await _create_account(client, account_type="credit_card")
    payload = _cc_payload(source_account_id=acct_id)
    resp = await client.post("/api/v1/installments", json=payload)
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["type"] == "credit_card"
    assert data["name"] == "iPhone 16 Pro"
    assert data["source_account_id"] == acct_id
    assert data["status"] == "active"
    assert "months_paid" in data
    assert "remaining_minor" in data


@pytest.mark.asyncio
async def test_list_installments_returns_paginated(client):
    acct_id = await _create_account(client)
    await client.post(
        "/api/v1/installments",
        json=_cc_payload(source_account_id=acct_id, name="Plan A"),
    )
    await client.post(
        "/api/v1/installments",
        json=_cc_payload(source_account_id=acct_id, name="Plan B"),
    )
    resp = await client.get("/api/v1/installments")
    assert resp.status_code == 200
    body = resp.json()
    assert body["meta"]["total"] >= 2
    assert len(body["data"]) >= 2


@pytest.mark.asyncio
async def test_list_filters_by_type(client):
    cc_id = await _create_account(client, account_type="credit_card")
    await client.post(
        "/api/v1/installments",
        json=_cc_payload(source_account_id=cc_id, name="CC Plan"),
    )
    await client.post(
        "/api/v1/installments",
        json={
            "type": "store",
            "name": "Store Plan",
            "merchant_name": "IKEA",
            "total_amount_minor": 800000,
            "monthly_amount_minor": 133334,
            "total_months": 6,
            "start_month": "2026-05-01",
            "currency": "EGP",
        },
    )
    resp = await client.get("/api/v1/installments?type=store")
    assert resp.status_code == 200
    assert resp.json()["meta"]["total"] == 1
    assert resp.json()["data"][0]["name"] == "Store Plan"


@pytest.mark.asyncio
async def test_get_installment_by_id(client):
    acct_id = await _create_account(client)
    create_resp = await client.post(
        "/api/v1/installments",
        json=_cc_payload(source_account_id=acct_id),
    )
    plan_id = create_resp.json()["data"]["id"]
    resp = await client.get(f"/api/v1/installments/{plan_id}")
    assert resp.status_code == 200
    assert resp.json()["data"]["id"] == plan_id


@pytest.mark.asyncio
async def test_get_nonexistent_returns_404(client):
    resp = await client.get("/api/v1/installments/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_installment(client):
    acct_id = await _create_account(client)
    create_resp = await client.post(
        "/api/v1/installments",
        json=_cc_payload(source_account_id=acct_id),
    )
    plan_id = create_resp.json()["data"]["id"]
    resp = await client.put(f"/api/v1/installments/{plan_id}", json={"name": "Updated Name"})
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "Updated Name"


@pytest.mark.asyncio
async def test_delete_installment_soft_deletes(client):
    acct_id = await _create_account(client)
    create_resp = await client.post(
        "/api/v1/installments",
        json=_cc_payload(source_account_id=acct_id),
    )
    plan_id = create_resp.json()["data"]["id"]
    del_resp = await client.delete(f"/api/v1/installments/{plan_id}")
    assert del_resp.status_code == 204
    list_resp = await client.get("/api/v1/installments")
    ids = [p["id"] for p in list_resp.json()["data"]]
    assert plan_id not in ids


@pytest.mark.asyncio
async def test_complete_installment(client):
    acct_id = await _create_account(client)
    create_resp = await client.post(
        "/api/v1/installments",
        json=_cc_payload(source_account_id=acct_id),
    )
    plan_id = create_resp.json()["data"]["id"]
    resp = await client.post(f"/api/v1/installments/{plan_id}/complete")
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "completed"


@pytest.mark.asyncio
async def test_cc_with_wrong_account_type_returns_422(client):
    bank_id = await _create_account(client, account_type="bank_account", credit_limit=0)
    payload = _cc_payload(source_account_id=bank_id)
    resp = await client.post("/api/v1/installments", json=payload)
    assert resp.status_code == 422
    assert resp.json()["detail"]["error"]["code"] == "INVALID_ACCOUNT_TYPE"


@pytest.mark.asyncio
async def test_fa_without_source_returns_422(client):
    payload = {
        "type": "financing_app",
        "name": "Air Conditioner",
        "total_amount_minor": 1500000,
        "monthly_amount_minor": 125000,
        "total_months": 12,
        "start_month": "2026-05-01",
        "currency": "EGP",
    }
    resp = await client.post("/api/v1/installments", json=payload)
    assert resp.status_code == 422
    assert resp.json()["detail"]["error"]["code"] == "SOURCE_ACCOUNT_REQUIRED"


@pytest.mark.asyncio
async def test_create_store_installment_without_source(client):
    payload = {
        "type": "store",
        "name": "Washing Machine",
        "merchant_name": "B.TECH",
        "total_amount_minor": 1200000,
        "monthly_amount_minor": 100000,
        "total_months": 12,
        "start_month": "2026-05-01",
        "currency": "EGP",
    }
    resp = await client.post("/api/v1/installments", json=payload)
    assert resp.status_code == 201
    assert resp.json()["data"]["source_account_id"] is None
