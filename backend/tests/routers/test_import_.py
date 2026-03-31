import io
import json
from unittest.mock import patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_parse_returns_needs_mapping_for_csv(client: AsyncClient):
    csv_bytes = b"Date,Description,Debit,Credit\n15/03/2026,MERCHANT,100.00,\n"
    resp = await client.post(
        "/api/v1/import/parse",
        data={"account_id": "1", "currency": "EGP"},
        files={"file": ("statement.csv", io.BytesIO(csv_bytes), "text/csv")},
    )
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["result_type"] == "needs_mapping"
    assert "Date" in body["headers"]


@pytest.mark.asyncio
async def test_parse_with_column_mapping_returns_complete(client: AsyncClient):
    csv_bytes = b"Date,Description,Debit,Credit\n15/03/2026,CARREFOUR,1250.00,\n"
    mapping = json.dumps({"date": "Date", "description": "Description", "debit": "Debit"})
    resp = await client.post(
        "/api/v1/import/parse",
        data={"account_id": "1", "currency": "EGP", "column_mapping": mapping},
        files={"file": ("statement.csv", io.BytesIO(csv_bytes), "text/csv")},
    )
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["result_type"] == "complete"
    assert body["total_rows"] == 1
    assert body["valid_rows"] == 1


@pytest.mark.asyncio
async def test_parse_scanned_pdf_returns_scanned(client: AsyncClient):
    with patch("app.services.import_.import_service.is_scanned", return_value=True):
        resp = await client.post(
            "/api/v1/import/parse",
            data={"account_id": "1", "currency": "EGP"},
            files={"file": ("statement.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
        )
    assert resp.status_code == 200
    assert resp.json()["data"]["result_type"] == "scanned"


@pytest.mark.asyncio
async def test_parse_unsupported_format_returns_400(client: AsyncClient):
    resp = await client.post(
        "/api/v1/import/parse",
        data={"account_id": "1", "currency": "EGP"},
        files={"file": ("document.docx", io.BytesIO(b"data"), "application/octet-stream")},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_commit_inserts_transactions(client: AsyncClient, db_session):
    from app.models.account import Account
    from app.models.enums import AccountType
    from tests.conftest import TEST_HOUSEHOLD_ID

    # Seed an account
    acct = Account(
        household_id=TEST_HOUSEHOLD_ID,
        name="Test Account",
        type=AccountType.BANK_ACCOUNT,
        currency="EGP",
        balance_minor=0,
    )
    db_session.add(acct)
    await db_session.flush()
    await db_session.commit()

    payload = {
        "account_id": acct.id,
        "rows": [
            {
                "date": "2026-03-15",
                "description": "CARREFOUR",
                "amount_minor": -125000,
                "currency": "EGP",
                "type": "debit",
                "apply_to_balance": True,
            }
        ],
    }
    resp = await client.post("/api/v1/import/commit", json=payload)
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["count"] == 1
    assert body["balance_delta"] == -125000
    assert "batch_id" in body

    # Verify transaction was actually persisted in DB
    from sqlalchemy import select

    from app.models.transaction import Transaction

    result = await db_session.execute(select(Transaction).where(Transaction.account_id == acct.id))
    txs = result.scalars().all()
    assert len(txs) == 1
    assert txs[0].amount_minor == -125000
    assert txs[0].description == "CARREFOUR"


@pytest.mark.asyncio
async def test_commit_empty_rows_returns_422(client: AsyncClient):
    payload = {"account_id": 1, "rows": []}
    resp = await client.post("/api/v1/import/commit", json=payload)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_presets(client: AsyncClient):
    resp = await client.get("/api/v1/import/presets")
    assert resp.status_code == 200
    presets = resp.json()["data"]["presets"]
    assert any(p["id"] == "hsbc_cc" for p in presets)
