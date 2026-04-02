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
            "type": "personal_lent", "name": "Lent to Ahmed",
            "principal_minor": 500000, "currency": "EGP",
            "tenure_months": 1, "start_date": "2026-04-01",
            "person_id": person_id, "repayment_mode": "lump_sum",
            "due_date": "2026-05-01", "account_id": acct_id,
        },
    )
    assert resp.status_code == 201
    txs = await client.get(f"/api/v1/transactions?account_id={acct_id}")
    tx_list = txs.json()["data"]
    assert len(tx_list) == 1
    assert tx_list[0]["amount_minor"] == -500000


@pytest.mark.asyncio
async def test_create_p2p_without_account_id_fails(client):
    person = await client.post("/api/v1/persons", json={"name": "Test"})
    person_id = person.json()["data"]["id"]
    resp = await client.post(
        "/api/v1/debts",
        json={
            "type": "personal_lent", "name": "Test", "principal_minor": 100000,
            "currency": "EGP", "tenure_months": 1, "start_date": "2026-04-01",
            "person_id": person_id, "repayment_mode": "lump_sum", "due_date": "2026-05-01",
        },
    )
    assert resp.status_code == 422
