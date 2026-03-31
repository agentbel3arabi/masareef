import pytest
from httpx import AsyncClient

from app.models.import_template import ImportTemplate
from tests.conftest import TEST_HOUSEHOLD_ID


@pytest.mark.asyncio
async def test_list_templates_empty(client: AsyncClient):
    resp = await client.get("/api/v1/import/templates")
    assert resp.status_code == 200
    assert resp.json()["data"] == []


@pytest.mark.asyncio
async def test_create_template(client: AsyncClient):
    payload = {
        "name": "CIB CSV",
        "format": "csv",
        "columns": {"date": "Date", "debit": "Withdrawal"},
        "date_format": "DD/MM/YYYY",
        "encoding": "utf-8",
        "skip_rows": 0,
    }
    resp = await client.post("/api/v1/import/templates", json=payload)
    assert resp.status_code == 201
    body = resp.json()["data"]
    assert body["name"] == "CIB CSV"
    assert body["id"] > 0


@pytest.mark.asyncio
async def test_update_template(client: AsyncClient, db_session):
    template = ImportTemplate(
        household_id=TEST_HOUSEHOLD_ID,
        name="Old Name",
        format="csv",
        columns={"date": "Date"},
        date_format="DD/MM/YYYY",
        encoding="utf-8",
        skip_rows=0,
    )
    db_session.add(template)
    await db_session.flush()
    await db_session.commit()

    resp = await client.put(
        f"/api/v1/import/templates/{template.id}",
        json={"name": "New Name"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "New Name"


@pytest.mark.asyncio
async def test_delete_template(client: AsyncClient, db_session):
    template = ImportTemplate(
        household_id=TEST_HOUSEHOLD_ID,
        name="To Delete",
        format="csv",
        columns={"date": "Date"},
        date_format="DD/MM/YYYY",
        encoding="utf-8",
        skip_rows=0,
    )
    db_session.add(template)
    await db_session.commit()
    template_id = template.id

    resp = await client.delete(f"/api/v1/import/templates/{template_id}")
    assert resp.status_code == 204

    # Verify soft-deleted template is not returned in list
    resp = await client.get("/api/v1/import/templates")
    assert resp.status_code == 200
    ids = [t["id"] for t in resp.json()["data"]]
    assert template_id not in ids


@pytest.mark.asyncio
async def test_link_and_unlink_template(client: AsyncClient, db_session):
    from app.models.account import Account
    from app.models.enums import AccountType

    template = ImportTemplate(
        household_id=TEST_HOUSEHOLD_ID,
        name="Link Test",
        format="csv",
        columns={"date": "Date"},
        date_format="DD/MM/YYYY",
        encoding="utf-8",
        skip_rows=0,
    )
    acct = Account(
        household_id=TEST_HOUSEHOLD_ID,
        name="Test Acct",
        type=AccountType.BANK_ACCOUNT,
        currency="EGP",
        balance_minor=0,
    )
    db_session.add(template)
    db_session.add(acct)
    await db_session.flush()
    await db_session.commit()

    resp = await client.post(f"/api/v1/import/templates/{template.id}/link/{acct.id}")
    assert resp.status_code == 200

    resp = await client.delete(f"/api/v1/import/templates/{template.id}/link/{acct.id}")
    assert resp.status_code == 204
