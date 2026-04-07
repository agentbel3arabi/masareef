"""RBAC guard tests -- verify VIEWER role gets 403 on all mutation endpoints.

Tests cover import, import-templates, and financial-institutions routers
which are being guarded with require_role in this plan.
"""

import pytest

from app.dependencies_rbac import get_member_role
from app.main import app
from app.models.enums import HouseholdRole


@pytest.fixture
def viewer_role():
    """Override role to VIEWER for this test."""

    async def _viewer() -> HouseholdRole:
        return HouseholdRole.VIEWER

    app.dependency_overrides[get_member_role] = _viewer
    yield

    # Restore the ADMIN override that conftest sets
    async def _admin() -> HouseholdRole:
        return HouseholdRole.ADMIN

    app.dependency_overrides[get_member_role] = _admin


@pytest.fixture
def member_role():
    """Override role to MEMBER for this test."""

    async def _member() -> HouseholdRole:
        return HouseholdRole.MEMBER

    app.dependency_overrides[get_member_role] = _member
    yield

    async def _admin() -> HouseholdRole:
        return HouseholdRole.ADMIN

    app.dependency_overrides[get_member_role] = _admin


# ---------------------------------------------------------------------------
# Error envelope format verification
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_403_error_envelope_format(client, viewer_role):
    """Verify 403 response matches the error envelope: {detail: {error: {code, message}}}."""
    resp = await client.post(
        "/api/v1/import/parse",
        data={"account_id": "1", "date_format": "DD/MM/YYYY"},
        files={"file": ("test.csv", b"header\nrow", "text/csv")},
    )
    assert resp.status_code == 403
    body = resp.json()
    assert "detail" in body
    assert "error" in body["detail"]
    assert body["detail"]["error"]["code"] == "FORBIDDEN"
    assert "role" in body["detail"]["error"]["message"].lower()


# ---------------------------------------------------------------------------
# Import router (POST /parse, POST /commit)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_viewer_cannot_parse_import(client, viewer_role):
    resp = await client.post(
        "/api/v1/import/parse",
        data={"account_id": "1", "date_format": "DD/MM/YYYY"},
        files={"file": ("test.csv", b"header\nrow", "text/csv")},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_viewer_cannot_commit_import(client, viewer_role):
    resp = await client.post(
        "/api/v1/import/commit",
        json={"account_id": 1, "rows": []},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_member_can_attempt_parse_import(client, member_role):
    """MEMBER should not get 403 (may get other errors like 422, but not 403)."""
    resp = await client.post(
        "/api/v1/import/parse",
        data={"account_id": "1", "date_format": "DD/MM/YYYY"},
        files={"file": ("test.csv", b"header\nrow", "text/csv")},
    )
    assert resp.status_code != 403


# ---------------------------------------------------------------------------
# Import templates router (POST, PUT, DELETE)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_viewer_cannot_create_template(client, viewer_role):
    resp = await client.post(
        "/api/v1/import/templates",
        json={"name": "Test", "format": "csv", "columns": {}},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_viewer_cannot_update_template(client, viewer_role):
    resp = await client.put(
        "/api/v1/import/templates/1",
        json={"name": "Updated"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_viewer_cannot_delete_template(client, viewer_role):
    resp = await client.delete("/api/v1/import/templates/1")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_viewer_cannot_link_template(client, viewer_role):
    resp = await client.post("/api/v1/import/templates/1/link/1")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_viewer_cannot_unlink_template(client, viewer_role):
    resp = await client.delete("/api/v1/import/templates/1/link/1")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_viewer_can_list_templates(client, viewer_role):
    """VIEWER should be able to read templates (GET is unguarded)."""
    resp = await client.get("/api/v1/import/templates")
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Financial institutions router (POST, PUT, DELETE)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_viewer_cannot_create_institution(client, viewer_role):
    resp = await client.post(
        "/api/v1/financial-institutions",
        json={"name_en": "Test Bank", "name_ar": "بنك تجريبي", "type": "bank"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_viewer_cannot_update_institution(client, viewer_role):
    resp = await client.put(
        "/api/v1/financial-institutions/test-bank",
        json={"name_en": "Updated"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_viewer_cannot_delete_institution(client, viewer_role):
    resp = await client.delete("/api/v1/financial-institutions/test-bank")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_member_can_attempt_create_institution(client, member_role):
    """MEMBER should not get 403 (may get other errors, but not 403)."""
    resp = await client.post(
        "/api/v1/financial-institutions",
        json={"name_en": "Test Bank", "name_ar": "بنك تجريبي", "type": "bank"},
    )
    assert resp.status_code != 403
