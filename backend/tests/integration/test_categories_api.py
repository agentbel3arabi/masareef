"""Integration tests for /api/v1/categories endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_categories(api_client: AsyncClient) -> None:
    """GET /api/v1/categories returns 200 with seeded predefined categories."""
    resp = await api_client.get("/api/v1/categories")
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    # Exactly 18 predefined categories are seeded (12 expense + 3 income + 3 special)
    assert body["meta"]["total"] >= 18


@pytest.mark.asyncio
async def test_filter_categories_by_type(api_client: AsyncClient) -> None:
    """GET /api/v1/categories?type=expense returns only expense categories."""
    resp = await api_client.get("/api/v1/categories", params={"type": "expense"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["meta"]["total"] >= 1
    for cat in body["data"]:
        assert cat["type"] == "expense"


@pytest.mark.asyncio
async def test_predefined_categories_have_bilingual_names(api_client: AsyncClient) -> None:
    """All predefined categories have both name_en and name_ar."""
    resp = await api_client.get("/api/v1/categories")
    assert resp.status_code == 200
    for cat in resp.json()["data"]:
        if cat["is_predefined"]:
            assert cat["name_en"], f"Category {cat['id']} missing name_en"
            assert cat["name_ar"], f"Category {cat['id']} missing name_ar"
