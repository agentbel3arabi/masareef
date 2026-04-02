"""RBAC tests for person endpoints.

child → 403 on all person endpoints
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
from app.models import Household, HouseholdMember, Person
from app.models.enums import HouseholdRole


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


@pytest.mark.asyncio
async def test_child_cannot_list_persons(db_session: AsyncSession, client) -> None:
    household_id = _make_household_id()
    user_id = _make_user_id()
    await _seed_member(db_session, household_id, user_id, HouseholdRole.CHILD)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: household_id
    app.dependency_overrides.pop(get_member_role, None)

    try:
        resp = await client.get("/api/v1/persons")
        assert resp.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_child_cannot_create_person(db_session: AsyncSession, client) -> None:
    household_id = _make_household_id()
    user_id = _make_user_id()
    await _seed_member(db_session, household_id, user_id, HouseholdRole.CHILD)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: household_id
    app.dependency_overrides.pop(get_member_role, None)

    try:
        resp = await client.post("/api/v1/persons", json={"name": "Blocked"})
        assert resp.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_viewer_can_list_persons(db_session: AsyncSession, client) -> None:
    household_id = _make_household_id()
    user_id = _make_user_id()
    await _seed_member(db_session, household_id, user_id, HouseholdRole.VIEWER)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: household_id
    app.dependency_overrides.pop(get_member_role, None)

    try:
        resp = await client.get("/api/v1/persons")
        assert resp.status_code == 200
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_viewer_cannot_create_person(db_session: AsyncSession, client) -> None:
    household_id = _make_household_id()
    user_id = _make_user_id()
    await _seed_member(db_session, household_id, user_id, HouseholdRole.VIEWER)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: household_id
    app.dependency_overrides.pop(get_member_role, None)

    try:
        resp = await client.post("/api/v1/persons", json={"name": "Blocked"})
        assert resp.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_viewer_cannot_delete_person(db_session: AsyncSession, client) -> None:
    household_id = _make_household_id()
    user_id = _make_user_id()
    await _seed_member(db_session, household_id, user_id, HouseholdRole.VIEWER)
    person = Person(household_id=household_id, name="Target")
    db_session.add(person)
    await db_session.flush()
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: household_id
    app.dependency_overrides.pop(get_member_role, None)

    try:
        resp = await client.delete(f"/api/v1/persons/{person.id}")
        assert resp.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_member_can_create_person(db_session: AsyncSession, client) -> None:
    household_id = _make_household_id()
    user_id = _make_user_id()
    await _seed_member(db_session, household_id, user_id, HouseholdRole.MEMBER)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: household_id
    app.dependency_overrides.pop(get_member_role, None)

    try:
        resp = await client.post("/api/v1/persons", json={"name": "Allowed"})
        assert resp.status_code in (200, 201)
    finally:
        app.dependency_overrides.clear()
