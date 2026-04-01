import pytest


@pytest.mark.asyncio
async def test_create_person_returns_201(client):
    response = await client.post(
        "/api/v1/persons",
        json={
            "name": "Ahmed Ali",
            "name_ar": "أحمد علي",
            "relationship": "family",
            "phone": "+201234567890",
        },
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == "Ahmed Ali"
    assert data["name_ar"] == "أحمد علي"
    assert data["relationship"] == "family"
    assert data["id"] is not None


@pytest.mark.asyncio
async def test_create_person_minimal(client):
    """Only name is required."""
    response = await client.post(
        "/api/v1/persons",
        json={"name": "Sara"},
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == "Sara"
    assert data["relationship"] is None


@pytest.mark.asyncio
async def test_list_persons_returns_paginated(client):
    await client.post("/api/v1/persons", json={"name": "Person A"})
    await client.post("/api/v1/persons", json={"name": "Person B"})
    response = await client.get("/api/v1/persons")
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert "meta" in body
    assert body["meta"]["total"] >= 2


@pytest.mark.asyncio
async def test_get_person_by_id(client):
    create_resp = await client.post("/api/v1/persons", json={"name": "Test"})
    person_id = create_resp.json()["data"]["id"]
    response = await client.get(f"/api/v1/persons/{person_id}")
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Test"


@pytest.mark.asyncio
async def test_get_person_not_found(client):
    response = await client.get("/api/v1/persons/99999")
    assert response.status_code == 404
    assert response.json()["detail"]["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_update_person(client):
    create_resp = await client.post("/api/v1/persons", json={"name": "Old Name"})
    person_id = create_resp.json()["data"]["id"]
    response = await client.put(
        f"/api/v1/persons/{person_id}",
        json={"name": "New Name", "relationship": "friend"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "New Name"
    assert response.json()["data"]["relationship"] == "friend"


@pytest.mark.asyncio
async def test_delete_person_soft_deletes(client):
    create_resp = await client.post("/api/v1/persons", json={"name": "To Delete"})
    person_id = create_resp.json()["data"]["id"]
    delete_resp = await client.delete(f"/api/v1/persons/{person_id}")
    assert delete_resp.status_code == 204
    # Should not appear in list
    list_resp = await client.get("/api/v1/persons")
    ids = [p["id"] for p in list_resp.json()["data"]]
    assert person_id not in ids


@pytest.mark.asyncio
async def test_delete_person_with_active_debt_fails(client, db_session):
    """Cannot delete a person who has active debts."""
    from datetime import date

    from app.models.debt import Debt
    from app.models.person import Person
    from tests.conftest import TEST_HOUSEHOLD_ID

    person = Person(household_id=TEST_HOUSEHOLD_ID, name="Has Debt")
    db_session.add(person)
    await db_session.flush()

    debt = Debt(
        household_id=TEST_HOUSEHOLD_ID,
        type="personal_lent",
        person_id=person.id,
        name="Lent to friend",
        principal_minor=500000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=1,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=500000,
        status="active",
    )
    db_session.add(debt)
    await db_session.commit()

    response = await client.delete(f"/api/v1/persons/{person.id}")
    assert response.status_code == 409
    assert response.json()["detail"]["error"]["code"] == "PERSON_HAS_ACTIVE_DEBTS"
