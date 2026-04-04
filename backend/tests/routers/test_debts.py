import pytest


async def _create_test_account(client, name="Test Account", currency="EGP"):
    resp = await client.post(
        "/api/v1/accounts",
        json={"name": name, "type": "bank_account", "currency": currency},
    )
    return resp.json()["data"]["id"]


def _create_loan_payload(**overrides):
    payload = {
        "type": "bank_loan",
        "name": "Car Loan - CIB",
        "institution": "CIB",
        "principal_minor": 50000000,
        "currency": "EGP",
        "annual_rate_percent": 14.5,
        "tenure_months": 60,
        "start_date": "2024-01-01",
    }
    payload.update(overrides)
    return payload


@pytest.mark.asyncio
async def test_create_bank_loan_returns_201(client):
    response = await client.post("/api/v1/debts", json=_create_loan_payload())
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == "Car Loan - CIB"
    assert data["type"] == "bank_loan"
    assert data["annual_rate_bps"] == 1450
    assert data["monthly_payment_minor"] > 0
    assert data["status"] == "active"


@pytest.mark.asyncio
async def test_create_zero_rate_loan(client):
    response = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(
            name="0% Loan",
            principal_minor=1200000,
            annual_rate_percent=0,
            tenure_months=12,
        ),
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["annual_rate_bps"] == 0
    assert data["monthly_payment_minor"] == 100000


@pytest.mark.asyncio
async def test_create_loan_with_linked_bank_account(client):
    """Bank loan can link to a bank account."""
    acct_resp = await client.post(
        "/api/v1/accounts",
        json={"name": "CIB Savings", "type": "bank_account", "currency": "EGP"},
    )
    acct_id = acct_resp.json()["data"]["id"]
    response = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(linked_account_id=acct_id),
    )
    assert response.status_code == 201
    assert response.json()["data"]["linked_account_id"] == acct_id


@pytest.mark.asyncio
async def test_create_loan_with_wrong_account_type_fails(client):
    """Bank loan must link to bank_account, not credit_card."""
    acct_resp = await client.post(
        "/api/v1/accounts",
        json={"name": "My CC", "type": "credit_card", "currency": "EGP"},
    )
    acct_id = acct_resp.json()["data"]["id"]
    response = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(linked_account_id=acct_id),
    )
    assert response.status_code == 422
    assert "INVALID_ACCOUNT_TYPE" in response.json()["detail"]["error"]["code"]


@pytest.mark.asyncio
async def test_list_debts_returns_paginated(client):
    await client.post("/api/v1/debts", json=_create_loan_payload(name="Loan A"))
    await client.post("/api/v1/debts", json=_create_loan_payload(name="Loan B"))
    response = await client.get("/api/v1/debts")
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] >= 2


@pytest.mark.asyncio
async def test_list_debts_filter_by_type(client):
    await client.post("/api/v1/debts", json=_create_loan_payload())
    response = await client.get("/api/v1/debts?type=bank_loan")
    assert response.status_code == 200
    assert all(d["type"] == "bank_loan" for d in response.json()["data"])


@pytest.mark.asyncio
async def test_get_debt_by_id(client):
    create_resp = await client.post("/api/v1/debts", json=_create_loan_payload())
    debt_id = create_resp.json()["data"]["id"]
    response = await client.get(f"/api/v1/debts/{debt_id}")
    assert response.status_code == 200
    assert response.json()["data"]["id"] == debt_id


@pytest.mark.asyncio
async def test_get_debt_not_found(client):
    response = await client.get("/api/v1/debts/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_debt(client):
    create_resp = await client.post("/api/v1/debts", json=_create_loan_payload())
    debt_id = create_resp.json()["data"]["id"]
    response = await client.put(
        f"/api/v1/debts/{debt_id}",
        json={"name": "Updated Loan Name"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Updated Loan Name"


@pytest.mark.asyncio
async def test_delete_debt_soft_deletes(client):
    create_resp = await client.post("/api/v1/debts", json=_create_loan_payload())
    debt_id = create_resp.json()["data"]["id"]
    delete_resp = await client.delete(f"/api/v1/debts/{debt_id}")
    assert delete_resp.status_code == 204
    list_resp = await client.get("/api/v1/debts")
    ids = [d["id"] for d in list_resp.json()["data"]]
    assert debt_id not in ids


@pytest.mark.asyncio
async def test_delete_debt_with_payments_returns_204(client):
    acct_id = await _create_test_account(client)
    loan = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(
            principal_minor=1200000,
            annual_rate_percent=0,
            tenure_months=12,
        ),
    )
    debt_id = loan.json()["data"]["id"]
    await client.post(
        f"/api/v1/debts/{debt_id}/payments",
        json={"date": "2026-04-01", "amount_minor": 100000, "account_id": acct_id},
    )
    resp = await client.delete(f"/api/v1/debts/{debt_id}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_get_amortization_schedule(client):
    create_resp = await client.post("/api/v1/debts", json=_create_loan_payload())
    debt_id = create_resp.json()["data"]["id"]
    response = await client.get(f"/api/v1/debts/{debt_id}/amortization")
    assert response.status_code == 200
    schedule = response.json()["data"]
    assert len(schedule) == 60
    assert schedule[-1]["remaining_minor"] == 0


@pytest.mark.asyncio
async def test_record_payment(client):
    acct_id = await _create_test_account(client)
    create_resp = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(
            principal_minor=1200000,
            annual_rate_percent=0,
            tenure_months=12,
        ),
    )
    debt_id = create_resp.json()["data"]["id"]
    pay_resp = await client.post(
        f"/api/v1/debts/{debt_id}/payments",
        json={"date": "2024-02-01", "amount_minor": 100000, "account_id": acct_id},
    )
    assert pay_resp.status_code == 201
    payment = pay_resp.json()["data"]
    assert payment["amount_minor"] == 100000
    assert payment["principal_minor"] == 100000
    assert payment["interest_minor"] == 0


@pytest.mark.asyncio
async def test_payment_updates_totals(client):
    acct_id = await _create_test_account(client)
    create_resp = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(
            principal_minor=300000,
            annual_rate_percent=0,
            tenure_months=3,
        ),
    )
    debt_id = create_resp.json()["data"]["id"]
    # Record 3 payments
    for month in range(2, 5):
        await client.post(
            f"/api/v1/debts/{debt_id}/payments",
            json={"date": f"2024-0{month}-01", "amount_minor": 100000, "account_id": acct_id},
        )
    # Debt should be paid off
    debt_resp = await client.get(f"/api/v1/debts/{debt_id}")
    assert debt_resp.json()["data"]["status"] == "paid_off"


@pytest.mark.asyncio
async def test_payment_exceeding_remaining_fails(client):
    acct_id = await _create_test_account(client)
    create_resp = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(
            principal_minor=100000,
            annual_rate_percent=0,
            tenure_months=1,
        ),
    )
    debt_id = create_resp.json()["data"]["id"]
    response = await client.post(
        f"/api/v1/debts/{debt_id}/payments",
        json={"date": "2024-02-01", "amount_minor": 200000, "account_id": acct_id},
    )
    assert response.status_code == 422
    assert "PAYMENT_EXCEEDS_REMAINING" in response.json()["detail"]["error"]["code"]


@pytest.mark.asyncio
async def test_list_payments(client):
    acct_id = await _create_test_account(client)
    create_resp = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(
            principal_minor=600000,
            annual_rate_percent=0,
            tenure_months=6,
        ),
    )
    debt_id = create_resp.json()["data"]["id"]
    await client.post(
        f"/api/v1/debts/{debt_id}/payments",
        json={"date": "2024-02-01", "amount_minor": 100000, "account_id": acct_id},
    )
    response = await client.get(f"/api/v1/debts/{debt_id}/payments")
    assert response.status_code == 200
    assert len(response.json()["data"]) == 1


@pytest.mark.asyncio
async def test_mark_paid(client):
    create_resp = await client.post("/api/v1/debts", json=_create_loan_payload())
    debt_id = create_resp.json()["data"]["id"]
    response = await client.post(f"/api/v1/debts/{debt_id}/mark-paid")
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "paid_off"


@pytest.mark.asyncio
async def test_record_payment_creates_transaction(client):
    """Recording a payment should auto-create a debit transaction on the account."""
    acct = await client.post(
        "/api/v1/accounts",
        json={"name": "CIB", "type": "bank_account", "currency": "EGP"},
    )
    acct_id = acct.json()["data"]["id"]
    loan = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(principal_minor=1200000, annual_rate_percent=0, tenure_months=12),
    )
    debt_id = loan.json()["data"]["id"]
    resp = await client.post(
        f"/api/v1/debts/{debt_id}/payments",
        json={"date": "2026-04-01", "amount_minor": 100000, "account_id": acct_id},
    )
    assert resp.status_code == 201
    payment = resp.json()["data"]
    assert payment["transaction_id"] is not None
    tx_resp = await client.get(f"/api/v1/transactions/{payment['transaction_id']}")
    assert tx_resp.status_code == 200
    tx = tx_resp.json()["data"]
    assert tx["account_id"] == acct_id
    assert tx["amount_minor"] == -100000  # debit = negative


@pytest.mark.asyncio
async def test_create_p2p_lent_creates_debit_transaction(client):
    acct_id = await _create_test_account(client)
    person = await client.post("/api/v1/persons", json={"name": "Ahmed"})
    person_id = person.json()["data"]["id"]
    resp = await client.post(
        "/api/v1/debts",
        json={
            "type": "personal_lent",
            "name": "Lent to Ahmed",
            "principal_minor": 500000,
            "currency": "EGP",
            "tenure_months": 1,
            "start_date": "2026-04-01",
            "person_id": person_id,
            "repayment_mode": "lump_sum",
            "due_date": "2026-05-01",
            "account_id": acct_id,
        },
    )
    assert resp.status_code == 201
    txs = await client.get(f"/api/v1/transactions?account_id={acct_id}")
    tx_list = txs.json()["data"]
    assert len(tx_list) == 1
    assert tx_list[0]["amount_minor"] == -500000


@pytest.mark.asyncio
async def test_bulk_past_payments_returns_201(client):
    acct_id = await _create_test_account(client)
    resp = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(
            linked_account_id=acct_id,
            start_date="2024-01-01",
            tenure_months=24,
            principal_minor=2400000,
            annual_rate_percent=0,
        ),
    )
    assert resp.status_code == 201
    debt_id = resp.json()["data"]["id"]

    bulk_resp = await client.post(
        f"/api/v1/debts/{debt_id}/bulk-past-payments",
        json={"installment_numbers": [1, 2, 3], "account_id": acct_id},
    )
    assert bulk_resp.status_code == 201
    data = bulk_resp.json()["data"]
    assert data["recorded_count"] == 3
    assert "balance_affecting_count" in data
    assert "history_only_count" in data
    assert data["balance_affecting_count"] + data["history_only_count"] == 3
    assert data["total_balance_impact_minor"] > 0


@pytest.mark.asyncio
async def test_bulk_past_payments_invalid_debt_returns_404(client):
    acct_id = await _create_test_account(client)
    resp = await client.post(
        "/api/v1/debts/99999/bulk-past-payments",
        json={"installment_numbers": [1], "account_id": acct_id},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_bulk_bnpl_payment_returns_201(client):
    acct_id = await _create_test_account(client, name="Credit Card", currency="EGP")
    debt1 = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(
            name="BNPL 1",
            principal_minor=1200000,
            tenure_months=12,
            annual_rate_percent=0,
        ),
    )
    debt2 = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(
            name="BNPL 2",
            principal_minor=600000,
            tenure_months=6,
            annual_rate_percent=0,
        ),
    )
    d1_id = debt1.json()["data"]["id"]
    d2_id = debt2.json()["data"]["id"]

    resp = await client.post(
        "/api/v1/debts/bulk-payment",
        json={
            "items": [
                {"debt_id": d1_id, "amount_minor": 100000},
                {"debt_id": d2_id, "amount_minor": 100000},
            ],
            "fee_minor": 3500,
            "account_id": acct_id,
            "date": "2026-04-03",
        },
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["payments_created"] == 2
    assert data["total_minor"] == 203500
    assert data["fee_transaction_id"] is not None


@pytest.mark.asyncio
async def test_bulk_bnpl_payment_no_fee(client):
    acct_id = await _create_test_account(client, name="Card", currency="EGP")
    debt = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(
            name="BNPL",
            principal_minor=600000,
            tenure_months=6,
            annual_rate_percent=0,
        ),
    )
    d_id = debt.json()["data"]["id"]

    resp = await client.post(
        "/api/v1/debts/bulk-payment",
        json={
            "items": [{"debt_id": d_id, "amount_minor": 100000}],
            "fee_minor": 0,
            "account_id": acct_id,
            "date": "2026-04-03",
        },
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["payments_created"] == 1
    assert data["total_minor"] == 100000
    assert data["fee_transaction_id"] is None


@pytest.mark.asyncio
async def test_bulk_bnpl_payment_invalid_debt_returns_422(client):
    acct_id = await _create_test_account(client, name="Card", currency="EGP")
    resp = await client.post(
        "/api/v1/debts/bulk-payment",
        json={
            "items": [{"debt_id": 99999, "amount_minor": 100000}],
            "fee_minor": 0,
            "account_id": acct_id,
            "date": "2026-04-03",
        },
    )
    assert resp.status_code == 422
    assert "DEBT_NOT_FOUND" in resp.json()["detail"]["error"]["code"]


@pytest.mark.asyncio
async def test_create_p2p_without_account_id_fails(client):
    person = await client.post("/api/v1/persons", json={"name": "Test"})
    person_id = person.json()["data"]["id"]
    resp = await client.post(
        "/api/v1/debts",
        json={
            "type": "personal_lent",
            "name": "Test",
            "principal_minor": 100000,
            "currency": "EGP",
            "tenure_months": 1,
            "start_date": "2026-04-01",
            "person_id": person_id,
            "repayment_mode": "lump_sum",
            "due_date": "2026-05-01",
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_loan_with_quarterly_frequency(client):
    """Quarterly loan creates correct amortization schedule."""
    resp = await client.post(
        "/api/v1/debts",
        json={
            "type": "bank_loan",
            "name": "Quarterly Loan",
            "principal_minor": 1200000,
            "currency": "EGP",
            "annual_rate_percent": 0,
            "tenure_months": 12,
            "start_date": "2025-01-15",
            "payment_frequency": "quarterly",
            "payment_day_of_month": 10,
        },
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["payment_frequency"] == "quarterly"
    assert data["payment_day_of_month"] == 10
    assert data["monthly_payment_minor"] > 0  # stores periodic payment

    sched_resp = await client.get(f"/api/v1/debts/{data['id']}/amortization")
    assert sched_resp.status_code == 200
    schedule = sched_resp.json()["data"]
    assert len(schedule) == 4  # 12 months / 3 = 4 quarterly payments
    # Payment day should be 10
    assert schedule[0]["date"].endswith("-10")


@pytest.mark.asyncio
async def test_create_loan_with_annual_frequency(client):
    """Annual loan has correct number of payments."""
    resp = await client.post(
        "/api/v1/debts",
        json={
            "type": "bank_loan",
            "name": "Annual Loan",
            "principal_minor": 3000000,
            "currency": "EGP",
            "annual_rate_percent": 0,
            "tenure_months": 36,
            "start_date": "2025-01-01",
            "payment_frequency": "annual",
        },
    )
    assert resp.status_code == 201
    sched_resp = await client.get(f"/api/v1/debts/{resp.json()['data']['id']}/amortization")
    schedule = sched_resp.json()["data"]
    assert len(schedule) == 3  # 36 / 12 = 3 annual payments


@pytest.mark.asyncio
async def test_default_payment_day_from_start_date(client):
    """When no payment_day_of_month specified, defaults from start_date."""
    resp = await client.post(
        "/api/v1/debts",
        json={
            "type": "bank_loan",
            "name": "Default Day Loan",
            "principal_minor": 1200000,
            "currency": "EGP",
            "annual_rate_percent": 0,
            "tenure_months": 12,
            "start_date": "2025-03-20",
        },
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["payment_day_of_month"] == 20  # defaulted from start_date


@pytest.mark.asyncio
async def test_delete_debt_with_transactions_soft_deletes_linked(client):
    """delete_transactions=true soft-deletes linked transactions and hard-deletes payments."""
    acct_id = await _create_test_account(client)
    loan = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(
            principal_minor=1200000,
            annual_rate_percent=0,
            tenure_months=12,
        ),
    )
    debt_id = loan.json()["data"]["id"]

    # Record a payment (auto-creates a transaction)
    pay_resp = await client.post(
        f"/api/v1/debts/{debt_id}/payments",
        json={"date": "2026-04-01", "amount_minor": 100000, "account_id": acct_id},
    )
    assert pay_resp.status_code == 201
    tx_id = pay_resp.json()["data"]["transaction_id"]
    assert tx_id is not None

    # Delete with transactions
    resp = await client.delete(f"/api/v1/debts/{debt_id}?delete_transactions=true")
    assert resp.status_code == 204

    # Debt should be gone from list
    list_resp = await client.get("/api/v1/debts")
    ids = [d["id"] for d in list_resp.json()["data"]]
    assert debt_id not in ids

    # Transaction should also be soft-deleted (not in active list)
    tx_resp = await client.get("/api/v1/transactions")
    tx_ids = [t["id"] for t in tx_resp.json()["data"]]
    assert tx_id not in tx_ids

    # Payments should be hard-deleted
    payments_resp = await client.get(f"/api/v1/debts/{debt_id}/payments")
    # Debt is soft-deleted so this returns 404
    assert payments_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_debt_without_flag_keeps_transactions(client):
    """Default delete (no flag) keeps linked transactions active."""
    acct_id = await _create_test_account(client)
    loan = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(
            principal_minor=1200000,
            annual_rate_percent=0,
            tenure_months=12,
        ),
    )
    debt_id = loan.json()["data"]["id"]

    pay_resp = await client.post(
        f"/api/v1/debts/{debt_id}/payments",
        json={"date": "2026-04-01", "amount_minor": 100000, "account_id": acct_id},
    )
    tx_id = pay_resp.json()["data"]["transaction_id"]

    # Delete without flag
    resp = await client.delete(f"/api/v1/debts/{debt_id}")
    assert resp.status_code == 204

    # Transaction should still be active
    tx_resp = await client.get("/api/v1/transactions")
    tx_ids = [t["id"] for t in tx_resp.json()["data"]]
    assert tx_id in tx_ids
