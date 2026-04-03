import pytest


async def _create_test_account(client, name="Test Account", currency="EGP"):
    resp = await client.post(
        "/api/v1/accounts",
        json={"name": name, "type": "bank_account", "currency": currency},
    )
    return resp.json()["data"]["id"]


def _create_p2p_payload(person_id: int, **overrides):
    payload = {
        "type": "personal_lent",
        "name": "Loan to Ahmed",
        "principal_minor": 600000,
        "currency": "EGP",
        "annual_rate_percent": 0,
        "tenure_months": 6,
        "start_date": "2024-06-01",
        "person_id": person_id,
        "repayment_mode": "equal_splits",
        "split_count": 6,
    }
    payload.update(overrides)
    return payload


async def _create_person(client, name="Ahmed Ali"):
    resp = await client.post("/api/v1/persons", json={"name": name})
    return resp.json()["data"]["id"]


@pytest.mark.asyncio
async def test_create_p2p_lent_equal_splits(client):
    acct_id = await _create_test_account(client)
    person_id = await _create_person(client)
    payload = _create_p2p_payload(person_id, account_id=acct_id)
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["type"] == "personal_lent"
    assert data["person_id"] == person_id
    assert data["repayment_mode"] == "equal_splits"
    assert data["status"] == "active"
    assert data["annual_rate_bps"] == 0


@pytest.mark.asyncio
async def test_create_p2p_borrowed_lump_sum(client):
    acct_id = await _create_test_account(client)
    person_id = await _create_person(client, "Sara")
    payload = _create_p2p_payload(
        person_id,
        type="personal_borrowed",
        name="Borrowed from Sara",
        repayment_mode="lump_sum",
        due_date="2024-12-31",
        split_count=None,
        account_id=acct_id,
    )
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["type"] == "personal_borrowed"
    assert data["repayment_mode"] == "lump_sum"
    assert data["due_date"] == "2024-12-31"


@pytest.mark.asyncio
async def test_create_p2p_custom_splits(client):
    acct_id = await _create_test_account(client)
    person_id = await _create_person(client, "Omar")
    payload = _create_p2p_payload(
        person_id,
        name="Custom split debt",
        principal_minor=500000,
        repayment_mode="custom_splits",
        split_count=None,
        account_id=acct_id,
        splits=[
            {"amount_minor": 300000, "due_date": "2024-07-01"},
            {"amount_minor": 200000, "due_date": "2024-08-01"},
        ],
    )
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["type"] == "personal_lent"
    assert data["repayment_mode"] == "custom_splits"


@pytest.mark.asyncio
async def test_create_p2p_custom_splits_sum_mismatch_fails(client):
    acct_id = await _create_test_account(client)
    person_id = await _create_person(client, "Bad Splits")
    payload = _create_p2p_payload(
        person_id,
        principal_minor=500000,
        repayment_mode="custom_splits",
        split_count=None,
        account_id=acct_id,
        splits=[
            {"amount_minor": 300000, "due_date": "2024-07-01"},
            {"amount_minor": 100000, "due_date": "2024-08-01"},
        ],
    )
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 422
    assert "SPLITS_SUM_MISMATCH" in response.json()["detail"]["error"]["code"]


@pytest.mark.asyncio
async def test_create_p2p_without_person_fails(client):
    acct_id = await _create_test_account(client)
    payload = _create_p2p_payload(
        person_id=0,  # placeholder, overridden below
        type="personal_lent",
        account_id=acct_id,
    )
    payload["person_id"] = None
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 422
    assert "PERSON_REQUIRED" in response.json()["detail"]["error"]["code"]


@pytest.mark.asyncio
async def test_create_p2p_with_nonexistent_person_fails(client):
    acct_id = await _create_test_account(client)
    payload = _create_p2p_payload(person_id=99999, account_id=acct_id)
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 404
    assert "PERSON_NOT_FOUND" in response.json()["detail"]["error"]["code"]


@pytest.mark.asyncio
async def test_equal_splits_requires_split_count(client):
    acct_id = await _create_test_account(client)
    person_id = await _create_person(client)
    payload = _create_p2p_payload(
        person_id,
        repayment_mode="equal_splits",
        split_count=None,
        account_id=acct_id,
    )
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 422
    assert "SPLIT_COUNT_REQUIRED" in response.json()["detail"]["error"]["code"]


@pytest.mark.asyncio
async def test_lump_sum_requires_due_date(client):
    acct_id = await _create_test_account(client)
    person_id = await _create_person(client)
    payload = _create_p2p_payload(
        person_id,
        repayment_mode="lump_sum",
        split_count=None,
        due_date=None,
        account_id=acct_id,
    )
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 422
    assert "DUE_DATE_REQUIRED" in response.json()["detail"]["error"]["code"]


@pytest.mark.asyncio
async def test_get_splits_for_equal_splits_debt(client):
    acct_id = await _create_test_account(client)
    person_id = await _create_person(client, "Split Person")
    payload = _create_p2p_payload(
        person_id,
        principal_minor=600000,
        split_count=3,
        tenure_months=3,
        account_id=acct_id,
    )
    create_resp = await client.post("/api/v1/debts", json=payload)
    debt_id = create_resp.json()["data"]["id"]

    response = await client.get(f"/api/v1/debts/{debt_id}/splits")
    assert response.status_code == 200
    splits = response.json()["data"]
    assert len(splits) == 3
    assert all(s["amount_minor"] == 200000 for s in splits)
    assert all(s["paid"] is False for s in splits)
    assert all(s["status"] in ("overdue", "upcoming") for s in splits)


@pytest.mark.asyncio
async def test_get_splits_for_custom_splits_debt(client):
    acct_id = await _create_test_account(client)
    person_id = await _create_person(client, "Custom Person")
    payload = _create_p2p_payload(
        person_id,
        principal_minor=500000,
        repayment_mode="custom_splits",
        split_count=None,
        tenure_months=2,
        account_id=acct_id,
        splits=[
            {"amount_minor": 300000, "due_date": "2024-07-01"},
            {"amount_minor": 200000, "due_date": "2024-08-01"},
        ],
    )
    create_resp = await client.post("/api/v1/debts", json=payload)
    debt_id = create_resp.json()["data"]["id"]

    response = await client.get(f"/api/v1/debts/{debt_id}/splits")
    assert response.status_code == 200
    splits = response.json()["data"]
    assert len(splits) == 2
    assert splits[0]["amount_minor"] == 300000
    assert splits[1]["amount_minor"] == 200000


@pytest.mark.asyncio
async def test_get_splits_for_lump_sum_debt(client):
    acct_id = await _create_test_account(client)
    person_id = await _create_person(client, "Lump Person")
    payload = _create_p2p_payload(
        person_id,
        principal_minor=500000,
        repayment_mode="lump_sum",
        split_count=None,
        tenure_months=1,
        due_date="2024-12-31",
        account_id=acct_id,
    )
    create_resp = await client.post("/api/v1/debts", json=payload)
    debt_id = create_resp.json()["data"]["id"]

    response = await client.get(f"/api/v1/debts/{debt_id}/splits")
    assert response.status_code == 200
    splits = response.json()["data"]
    assert len(splits) == 1
    assert splits[0]["amount_minor"] == 500000


@pytest.mark.asyncio
async def test_record_p2p_payment_marks_split_paid(client):
    acct_id = await _create_test_account(client)
    person_id = await _create_person(client, "Pay Person")
    payload = _create_p2p_payload(
        person_id,
        principal_minor=300000,
        split_count=3,
        tenure_months=3,
        account_id=acct_id,
    )
    create_resp = await client.post("/api/v1/debts", json=payload)
    debt_id = create_resp.json()["data"]["id"]

    # Record a payment matching the first split
    pay_resp = await client.post(
        f"/api/v1/debts/{debt_id}/payments",
        json={"date": "2024-07-01", "amount_minor": 100000, "account_id": acct_id},
    )
    assert pay_resp.status_code == 201
    payment = pay_resp.json()["data"]
    # P2P payments: principal_minor = amount_minor, interest_minor = 0
    assert payment["principal_minor"] == 100000
    assert payment["interest_minor"] == 0

    # Check that first split is now paid
    splits_resp = await client.get(f"/api/v1/debts/{debt_id}/splits")
    splits = splits_resp.json()["data"]
    paid_splits = [s for s in splits if s["paid"] is True]
    assert len(paid_splits) == 1
    assert paid_splits[0]["payment_id"] == payment["id"]


@pytest.mark.asyncio
async def test_p2p_debt_paid_off_after_all_splits_paid(client):
    acct_id = await _create_test_account(client)
    person_id = await _create_person(client, "Full Pay")
    payload = _create_p2p_payload(
        person_id,
        principal_minor=300000,
        split_count=3,
        tenure_months=3,
        account_id=acct_id,
    )
    create_resp = await client.post("/api/v1/debts", json=payload)
    debt_id = create_resp.json()["data"]["id"]

    # Record 3 payments
    for month in range(7, 10):
        await client.post(
            f"/api/v1/debts/{debt_id}/payments",
            json={"date": f"2024-{month:02d}-01", "amount_minor": 100000, "account_id": acct_id},
        )

    # Debt should now be paid_off
    debt_resp = await client.get(f"/api/v1/debts/{debt_id}")
    assert debt_resp.json()["data"]["status"] == "paid_off"


@pytest.mark.asyncio
async def test_get_splits_for_bank_loan_returns_empty(client):
    """Bank loans have no P2P splits — endpoint should return empty list."""
    create_resp = await client.post(
        "/api/v1/debts",
        json={
            "type": "bank_loan",
            "name": "Bank Loan",
            "principal_minor": 1000000,
            "currency": "EGP",
            "annual_rate_percent": 10,
            "tenure_months": 12,
            "start_date": "2024-01-01",
        },
    )
    debt_id = create_resp.json()["data"]["id"]
    response = await client.get(f"/api/v1/debts/{debt_id}/splits")
    assert response.status_code == 200
    assert response.json()["data"] == []


@pytest.mark.asyncio
async def test_person_response_includes_balances(client):
    """After creating a P2P debt, person GET includes balance data."""
    acct_id = await _create_test_account(client)
    person_id = await _create_person(client, "Balance Person")
    payload = _create_p2p_payload(
        person_id,
        principal_minor=500000,
        split_count=5,
        tenure_months=5,
        account_id=acct_id,
    )
    await client.post("/api/v1/debts", json=payload)

    response = await client.get(f"/api/v1/persons/{person_id}")
    assert response.status_code == 200
    data = response.json()["data"]
    assert "balances" in data
    assert data["balances"]["by_currency"]["EGP"] == 500000


@pytest.mark.asyncio
async def test_person_list_includes_balances(client):
    """List persons also includes balance data."""
    acct_id = await _create_test_account(client)
    person_id = await _create_person(client, "List Balance")
    payload = _create_p2p_payload(
        person_id,
        principal_minor=300000,
        split_count=3,
        tenure_months=3,
        account_id=acct_id,
    )
    await client.post("/api/v1/debts", json=payload)

    response = await client.get("/api/v1/persons")
    assert response.status_code == 200
    persons = response.json()["data"]
    person_data = next(p for p in persons if p["id"] == person_id)
    assert person_data["balances"]["by_currency"]["EGP"] == 300000


@pytest.mark.asyncio
async def test_list_debts_filter_by_personal_lent(client):
    acct_id = await _create_test_account(client)
    person_id = await _create_person(client, "Filter Test")
    # Create bank loan
    await client.post(
        "/api/v1/debts",
        json={
            "type": "bank_loan",
            "name": "Bank Loan",
            "principal_minor": 1000000,
            "currency": "EGP",
            "annual_rate_percent": 10,
            "tenure_months": 12,
            "start_date": "2024-01-01",
        },
    )
    # Create P2P debt
    await client.post(
        "/api/v1/debts",
        json=_create_p2p_payload(person_id, type="personal_lent", account_id=acct_id),
    )

    # Filter by personal_lent
    response = await client.get("/api/v1/debts?type=personal_lent")
    assert response.status_code == 200
    debts = response.json()["data"]
    assert len(debts) >= 1
    assert all(d["type"] == "personal_lent" for d in debts)

    # Filter by bank_loan should not include P2P
    response2 = await client.get("/api/v1/debts?type=bank_loan")
    assert all(d["type"] == "bank_loan" for d in response2.json()["data"])


@pytest.mark.asyncio
async def test_create_p2p_without_repayment_mode_fails(client):
    acct_id = await _create_test_account(client)
    person_id = await _create_person(client, "No Mode Person")
    payload = _create_p2p_payload(person_id, type="personal_lent", account_id=acct_id)
    payload.pop("repayment_mode", None)
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 422
    assert "INVALID_REPAYMENT_MODE" in response.json()["detail"]["error"]["code"]
