"""RBAC tests — verify CHILD role cannot mutate resources."""

import pytest

from app.dependencies_rbac import get_member_role
from app.main import app
from app.models.enums import HouseholdRole


@pytest.fixture
def child_role():
    """Override role to CHILD for this test."""

    async def _child() -> HouseholdRole:
        return HouseholdRole.CHILD

    app.dependency_overrides[get_member_role] = _child
    yield
    # Restore the ADMIN override that conftest sets
    async def _admin() -> HouseholdRole:
        return HouseholdRole.ADMIN

    app.dependency_overrides[get_member_role] = _admin


# ---------------------------------------------------------------------------
# Accounts
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_child_cannot_create_account(client, child_role):
    resp = await client.post(
        "/api/v1/accounts",
        json={"name": "Test", "type": "bank_account", "currency": "EGP"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_child_can_list_accounts(client, child_role):
    resp = await client.get("/api/v1/accounts")
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Transactions
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_child_cannot_create_transaction(client, child_role):
    resp = await client.post(
        "/api/v1/transactions",
        json={
            "account_id": 1,
            "date": "2026-04-01",
            "description": "Test",
            "amount_minor": 1000,
            "type": "debit",
        },
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_child_can_list_transactions(client, child_role):
    resp = await client.get("/api/v1/transactions")
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Transfers
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_child_cannot_create_transfer(client, child_role):
    resp = await client.post(
        "/api/v1/transfers",
        json={
            "from_account_id": 1,
            "to_account_id": 2,
            "amount_minor": 1000,
            "date": "2026-04-01",
        },
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_child_cannot_create_category(client, child_role):
    resp = await client.post(
        "/api/v1/categories",
        json={"name_en": "Test", "type": "expense"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_child_can_list_categories(client, child_role):
    resp = await client.get("/api/v1/categories")
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Installments
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_child_cannot_create_installment(client, child_role):
    resp = await client.post(
        "/api/v1/installments",
        json={
            "type": "store",
            "name": "Test",
            "total_amount_minor": 100000,
            "monthly_amount_minor": 10000,
            "total_months": 10,
            "start_month": "2026-01-01",
            "currency": "EGP",
        },
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_child_can_list_installments(client, child_role):
    resp = await client.get("/api/v1/installments")
    assert resp.status_code == 200
