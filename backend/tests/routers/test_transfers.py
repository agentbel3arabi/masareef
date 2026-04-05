import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _create_accounts(client) -> tuple[int, int]:
    """Create Bank (1M EGP) and Cash (0 EGP) accounts. Return (bank_id, cash_id)."""
    r1 = await client.post(
        "/api/v1/accounts",
        json={
            "name": "Bank",
            "type": "bank_account",
            "currency": "EGP",
            "opening_balance": 1000000,
        },
    )
    assert r1.status_code == 201, r1.text
    r2 = await client.post(
        "/api/v1/accounts",
        json={
            "name": "Cash",
            "type": "cash_wallet",
            "currency": "EGP",
            "opening_balance": 0,
        },
    )
    assert r2.status_code == 201, r2.text
    return r1.json()["data"]["id"], r2.json()["data"]["id"]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_same_currency_transfer(client):
    """Transfer 500000 EGP between same-currency accounts; expect 201 and correct amounts."""
    bank_id, cash_id = await _create_accounts(client)
    resp = await client.post(
        "/api/v1/transfers",
        json={
            "from_account_id": bank_id,
            "to_account_id": cash_id,
            "amount_minor": 500000,
            "date": "2024-01-15",
        },
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()["data"]
    assert data["source_amount"] == 500000
    assert data["target_amount"] == 500000
    assert "transfer_id" in data
    assert "debit_transaction_id" in data
    assert "credit_transaction_id" in data


@pytest.mark.asyncio
async def test_transfer_updates_both_balances(client):
    """After 500000 transfer: Bank should be 500000, Cash should be 500000."""
    bank_id, cash_id = await _create_accounts(client)
    resp = await client.post(
        "/api/v1/transfers",
        json={
            "from_account_id": bank_id,
            "to_account_id": cash_id,
            "amount_minor": 500000,
            "date": "2024-01-15",
        },
    )
    assert resp.status_code == 201, resp.text

    bank_resp = await client.get(f"/api/v1/accounts/{bank_id}")
    assert bank_resp.status_code == 200
    assert bank_resp.json()["data"]["displayed_balance_minor"] == 500000

    cash_resp = await client.get(f"/api/v1/accounts/{cash_id}")
    assert cash_resp.status_code == 200
    assert cash_resp.json()["data"]["displayed_balance_minor"] == 500000


@pytest.mark.asyncio
async def test_transfer_to_same_account_fails(client):
    """Transfer with from_account_id == to_account_id should return 400."""
    bank_id, _ = await _create_accounts(client)
    resp = await client.post(
        "/api/v1/transfers",
        json={
            "from_account_id": bank_id,
            "to_account_id": bank_id,
            "amount_minor": 100000,
            "date": "2024-01-15",
        },
    )
    assert resp.status_code == 400
    body = resp.json()
    assert body["detail"]["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_delete_transfer_reverses_both_balances(client):
    """Delete a transfer; both account balances should return to original values."""
    bank_id, cash_id = await _create_accounts(client)

    # Create transfer
    create_resp = await client.post(
        "/api/v1/transfers",
        json={
            "from_account_id": bank_id,
            "to_account_id": cash_id,
            "amount_minor": 500000,
            "date": "2024-01-15",
        },
    )
    assert create_resp.status_code == 201
    transfer_id = create_resp.json()["data"]["transfer_id"]

    # Delete it
    del_resp = await client.delete(f"/api/v1/transfers/{transfer_id}")
    assert del_resp.status_code == 204

    # Check balances restored
    bank_resp = await client.get(f"/api/v1/accounts/{bank_id}")
    assert bank_resp.json()["data"]["displayed_balance_minor"] == 1000000

    cash_resp = await client.get(f"/api/v1/accounts/{cash_id}")
    assert cash_resp.json()["data"]["displayed_balance_minor"] == 0


@pytest.mark.asyncio
async def test_list_transfers(client):
    """Create one transfer; listing transfers should return total >= 1."""
    bank_id, cash_id = await _create_accounts(client)
    create_resp = await client.post(
        "/api/v1/transfers",
        json={
            "from_account_id": bank_id,
            "to_account_id": cash_id,
            "amount_minor": 200000,
            "date": "2024-01-20",
        },
    )
    assert create_resp.status_code == 201

    list_resp = await client.get("/api/v1/transfers")
    assert list_resp.status_code == 200
    body = list_resp.json()
    assert body["meta"]["total"] >= 1
    assert len(body["data"]) >= 1
    # Verify the item structure
    item = body["data"][0]
    assert "transfer_id" in item
    assert "from_account" in item
    assert "to_account" in item
    assert "source_amount" in item
    assert "target_amount" in item


@pytest.mark.asyncio
async def test_same_currency_transfer_rejects_fx_rate(client):
    """Providing fx_rate for same-currency transfer should return 400."""
    from_id, to_id = await _create_accounts(client)
    resp = await client.post(
        "/api/v1/transfers",
        json={
            "from_account_id": from_id,
            "to_account_id": to_id,
            "amount_minor": 500000,
            "date": "2026-03-20",
            "fx_rate_minor_units": 485000,
        },
    )
    assert resp.status_code == 400
