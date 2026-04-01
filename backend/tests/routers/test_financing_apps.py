# backend/tests/routers/test_financing_apps.py
import pytest


async def _create_fa_account(client, *, name="ValU", credit_limit=5000000):
    resp = await client.post(
        "/api/v1/accounts",
        json={
            "name": name,
            "type": "financing_app",
            "currency": "EGP",
            "initial_balance": 0,
            "credit_limit": credit_limit,
            "institution": name,
        },
    )
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


async def _create_fa_plan(client, *, source_account_id, name="Purchase", total=1800000, monthly=150000, months=12):
    resp = await client.post(
        "/api/v1/installments",
        json={
            "type": "financing_app",
            "name": name,
            "merchant_name": "B.TECH",
            "source_account_id": source_account_id,
            "total_amount_minor": total,
            "monthly_amount_minor": monthly,
            "total_months": months,
            "start_month": "2026-01-01",  # Future date to ensure "active" status
            "currency": "EGP",
        },
    )
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


@pytest.mark.asyncio
async def test_financing_apps_summary_with_plans(client):
    valu_id = await _create_fa_account(client, name="ValU", credit_limit=5000000)
    souhoola_id = await _create_fa_account(client, name="Souhoola", credit_limit=3000000)
    await _create_fa_plan(client, source_account_id=valu_id, name="iPhone", total=1800000, monthly=150000, months=12)
    await _create_fa_plan(client, source_account_id=valu_id, name="Fridge", total=1200000, monthly=100000, months=12)
    await _create_fa_plan(client, source_account_id=souhoola_id, name="AC", total=1500000, monthly=125000, months=12)

    resp = await client.get("/api/v1/financing-apps/summary")
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert len(body["apps"]) == 2
    assert "totals" in body
    # Both apps should have plans
    app_names = {a["name"] for a in body["apps"]}
    assert "ValU" in app_names
    assert "Souhoola" in app_names
    # ValU has 2 plans
    valu = next(a for a in body["apps"] if a["name"] == "ValU")
    assert valu["active_plans_count"] == 2
    assert valu["monthly_commitment_minor"] == 250000  # 150000 + 100000
    # Totals
    assert body["totals"]["total_limit_minor"] == 8000000  # 5M + 3M
    assert body["totals"]["total_monthly_minor"] == 375000  # 150k + 100k + 125k


@pytest.mark.asyncio
async def test_financing_apps_summary_empty(client):
    resp = await client.get("/api/v1/financing-apps/summary")
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["apps"] == []
    assert body["totals"]["total_limit_minor"] == 0


@pytest.mark.asyncio
async def test_financing_apps_summary_remaining_computation(client):
    fa_id = await _create_fa_account(client, name="TestApp", credit_limit=10000000)
    # Plan: 2,400,000 total / 200,000 per month / 12 months
    await _create_fa_plan(client, source_account_id=fa_id, total=2400000, monthly=200000, months=12)
    resp = await client.get("/api/v1/financing-apps/summary")
    body = resp.json()["data"]
    app_detail = body["apps"][0]
    # Since we use a future date, the plan should be active
    assert app_detail["active_plans_count"] == 1
    assert body["totals"]["total_remaining_minor"] >= 0
