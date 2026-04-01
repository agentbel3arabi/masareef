import pytest
from tests.conftest import TEST_HOUSEHOLD_ID
from app.models.person import Person


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
    person_id = await _create_person(client)
    payload = _create_p2p_payload(person_id)
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
    person_id = await _create_person(client, "Sara")
    payload = _create_p2p_payload(
        person_id,
        type="personal_borrowed",
        name="Borrowed from Sara",
        repayment_mode="lump_sum",
        due_date="2024-12-31",
        split_count=None,
    )
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["type"] == "personal_borrowed"
    assert data["repayment_mode"] == "lump_sum"
    assert data["due_date"] == "2024-12-31"


@pytest.mark.asyncio
async def test_create_p2p_custom_splits(client):
    person_id = await _create_person(client, "Omar")
    payload = _create_p2p_payload(
        person_id,
        name="Custom split debt",
        principal_minor=500000,
        repayment_mode="custom_splits",
        split_count=None,
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
    person_id = await _create_person(client, "Bad Splits")
    payload = _create_p2p_payload(
        person_id,
        principal_minor=500000,
        repayment_mode="custom_splits",
        split_count=None,
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
    payload = _create_p2p_payload(
        person_id=None,
        type="personal_lent",
    )
    payload["person_id"] = None
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 422
    assert "PERSON_REQUIRED" in response.json()["detail"]["error"]["code"]


@pytest.mark.asyncio
async def test_create_p2p_with_nonexistent_person_fails(client):
    payload = _create_p2p_payload(person_id=99999)
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 404
    assert "PERSON_NOT_FOUND" in response.json()["detail"]["error"]["code"]


@pytest.mark.asyncio
async def test_equal_splits_requires_split_count(client):
    person_id = await _create_person(client)
    payload = _create_p2p_payload(
        person_id,
        repayment_mode="equal_splits",
        split_count=None,
    )
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 422
    assert "SPLIT_COUNT_REQUIRED" in response.json()["detail"]["error"]["code"]


@pytest.mark.asyncio
async def test_lump_sum_requires_due_date(client):
    person_id = await _create_person(client)
    payload = _create_p2p_payload(
        person_id,
        repayment_mode="lump_sum",
        split_count=None,
        due_date=None,
    )
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 422
    assert "DUE_DATE_REQUIRED" in response.json()["detail"]["error"]["code"]
