"""RBAC tests for P2P debt endpoints.

child → 403 on all P2P endpoints
viewer → 403 on POST/PUT/DELETE, 200 on GET
member/admin → full access
"""

import uuid

import pytest
from sqlalchemy import select as sa_select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_household_id
from app.dependencies_rbac import get_member_role
from app.main import app
from app.models import Account, Debt, Household, HouseholdMember, Person
from app.models.enums import DebtType, HouseholdRole


def _make_user_id() -> uuid.UUID:
    return uuid.uuid4()


def _make_household_id() -> uuid.UUID:
    return uuid.uuid4()


async def _seed_member(
    session: AsyncSession,
    household_id: uuid.UUID,
    user_id: uuid.UUID,
    role: HouseholdRole,
) -> None:
    """Seed household + member with the given role."""
    existing = await session.execute(sa_select(Household.id).where(Household.id == household_id))
    if existing.scalar_one_or_none() is None:
        session.add(Household(id=household_id, name="Test HH", base_currency="EGP"))
        await session.flush()

    session.add(
        HouseholdMember(
            household_id=household_id,
            user_id=user_id,
            role=role,
            display_name=f"User-{role.value}",
        )
    )
    await session.flush()


async def _seed_p2p_debt(session: AsyncSession, household_id: uuid.UUID) -> int:
    """Seed a person + P2P debt, return debt id."""
    import datetime as dt

    person = Person(household_id=household_id, name="Friend")
    session.add(person)
    await session.flush()

    debt = Debt(
        household_id=household_id,
        type=DebtType.PERSONAL_LENT,
        name="Test P2P",
        person_id=person.id,
        principal_minor=10_000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=0,
        start_date=dt.date.today(),
        monthly_payment_minor=0,
    )
    session.add(debt)
    await session.flush()
    return debt.id


@pytest.mark.asyncio
async def test_child_cannot_list_p2p_debts(db_session: AsyncSession, client) -> None:
    """Child role gets 403 when listing debts filtered to P2P type."""
    household_id = _make_household_id()
    user_id = _make_user_id()
    await _seed_member(db_session, household_id, user_id, HouseholdRole.CHILD)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: household_id
    app.dependency_overrides.pop(get_member_role, None)

    try:
        resp = await client.get("/api/v1/debts", params={"type": "personal_lent"})
        assert resp.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_child_cannot_create_p2p_debt(db_session: AsyncSession, client) -> None:
    """Child role gets 403 when creating a P2P debt."""
    household_id = _make_household_id()
    user_id = _make_user_id()
    await _seed_member(db_session, household_id, user_id, HouseholdRole.CHILD)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: household_id
    app.dependency_overrides.pop(get_member_role, None)

    try:
        resp = await client.post(
            "/api/v1/debts",
            json={
                "type": "personal_lent",
                "name": "Blocked",
                "principal_minor": 1000,
                "currency": "EGP",
                "tenure_months": 1,
                "start_date": "2025-01-01",
                "person_id": 1,
            },
        )
        assert resp.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_viewer_can_list_p2p_debts(db_session: AsyncSession, client) -> None:
    """Viewer role can GET P2P debts (200)."""
    household_id = _make_household_id()
    user_id = _make_user_id()
    await _seed_member(db_session, household_id, user_id, HouseholdRole.VIEWER)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: household_id
    app.dependency_overrides.pop(get_member_role, None)

    try:
        resp = await client.get("/api/v1/debts", params={"type": "personal_lent"})
        assert resp.status_code == 200
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_viewer_cannot_create_p2p_debt(db_session: AsyncSession, client) -> None:
    """Viewer role gets 403 when creating a P2P debt."""
    household_id = _make_household_id()
    user_id = _make_user_id()
    await _seed_member(db_session, household_id, user_id, HouseholdRole.VIEWER)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: household_id
    app.dependency_overrides.pop(get_member_role, None)

    try:
        resp = await client.post(
            "/api/v1/debts",
            json={
                "type": "personal_lent",
                "name": "Blocked",
                "principal_minor": 1000,
                "currency": "EGP",
                "tenure_months": 1,
                "start_date": "2025-01-01",
                "person_id": 1,
            },
        )
        assert resp.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_viewer_cannot_delete_debt(db_session: AsyncSession, client) -> None:
    """Viewer role gets 403 when deleting a debt."""
    household_id = _make_household_id()
    user_id = _make_user_id()
    await _seed_member(db_session, household_id, user_id, HouseholdRole.VIEWER)
    debt_id = await _seed_p2p_debt(db_session, household_id)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: household_id
    app.dependency_overrides.pop(get_member_role, None)

    try:
        resp = await client.delete(f"/api/v1/debts/{debt_id}")
        assert resp.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_member_can_create_p2p_debt(db_session: AsyncSession, client) -> None:
    """Member role can create P2P debts (not 403)."""
    household_id = _make_household_id()
    user_id = _make_user_id()
    await _seed_member(db_session, household_id, user_id, HouseholdRole.MEMBER)
    person = Person(household_id=household_id, name="Target")
    db_session.add(person)
    await db_session.flush()
    acct = Account(household_id=household_id, name="Test Acct", type="bank_account", currency="EGP", balance_minor=0)
    db_session.add(acct)
    await db_session.flush()
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: household_id
    app.dependency_overrides.pop(get_member_role, None)

    try:
        resp = await client.post(
            "/api/v1/debts",
            json={
                "type": "personal_lent",
                "name": "Allowed",
                "principal_minor": 1000,
                "currency": "EGP",
                "tenure_months": 1,
                "start_date": "2025-01-01",
                "person_id": person.id,
                "repayment_mode": "lump_sum",
                "due_date": "2025-02-01",
                "account_id": acct.id,
            },
        )
        assert resp.status_code in (201, 200)
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_child_cannot_get_p2p_debt(db_session: AsyncSession, client) -> None:
    """Child role gets 403 when reading a specific P2P debt."""
    household_id = _make_household_id()
    user_id = _make_user_id()
    await _seed_member(db_session, household_id, user_id, HouseholdRole.CHILD)
    debt_id = await _seed_p2p_debt(db_session, household_id)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: household_id
    app.dependency_overrides.pop(get_member_role, None)

    try:
        resp = await client.get(f"/api/v1/debts/{debt_id}")
        assert resp.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_child_cannot_get_p2p_amortization(db_session: AsyncSession, client) -> None:
    """Child role gets 403 on amortization for P2P debt."""
    household_id = _make_household_id()
    user_id = _make_user_id()
    await _seed_member(db_session, household_id, user_id, HouseholdRole.CHILD)
    debt_id = await _seed_p2p_debt(db_session, household_id)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: household_id
    app.dependency_overrides.pop(get_member_role, None)

    try:
        resp = await client.get(f"/api/v1/debts/{debt_id}/amortization")
        assert resp.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_child_cannot_list_p2p_payments(db_session: AsyncSession, client) -> None:
    """Child role gets 403 on payments list for P2P debt."""
    household_id = _make_household_id()
    user_id = _make_user_id()
    await _seed_member(db_session, household_id, user_id, HouseholdRole.CHILD)
    debt_id = await _seed_p2p_debt(db_session, household_id)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: household_id
    app.dependency_overrides.pop(get_member_role, None)

    try:
        resp = await client.get(f"/api/v1/debts/{debt_id}/payments")
        assert resp.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_viewer_cannot_record_payment(db_session: AsyncSession, client) -> None:
    """Viewer role gets 403 when recording a payment on a P2P debt."""
    household_id = _make_household_id()
    user_id = _make_user_id()
    await _seed_member(db_session, household_id, user_id, HouseholdRole.VIEWER)
    debt_id = await _seed_p2p_debt(db_session, household_id)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: household_id
    app.dependency_overrides.pop(get_member_role, None)

    try:
        resp = await client.post(
            f"/api/v1/debts/{debt_id}/payments",
            json={"date": "2025-01-15", "amount_minor": 500, "account_id": 1},
        )
        assert resp.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_viewer_cannot_mark_paid(db_session: AsyncSession, client) -> None:
    """Viewer role gets 403 when marking a P2P debt as paid."""
    household_id = _make_household_id()
    user_id = _make_user_id()
    await _seed_member(db_session, household_id, user_id, HouseholdRole.VIEWER)
    debt_id = await _seed_p2p_debt(db_session, household_id)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: household_id
    app.dependency_overrides.pop(get_member_role, None)

    try:
        resp = await client.post(f"/api/v1/debts/{debt_id}/mark-paid")
        assert resp.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_child_cannot_get_p2p_splits(db_session: AsyncSession, client) -> None:
    """Child role gets 403 on splits for P2P debt."""
    household_id = _make_household_id()
    user_id = _make_user_id()
    await _seed_member(db_session, household_id, user_id, HouseholdRole.CHILD)
    debt_id = await _seed_p2p_debt(db_session, household_id)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: household_id
    app.dependency_overrides.pop(get_member_role, None)

    try:
        resp = await client.get(f"/api/v1/debts/{debt_id}/splits")
        assert resp.status_code == 403
    finally:
        app.dependency_overrides.clear()
