import pytest

from app.models.category import Category


@pytest.mark.asyncio
async def test_list_categories_returns_paginated(client):
    response = await client.get("/api/v1/categories")
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert "meta" in body


@pytest.mark.asyncio
async def test_create_custom_category(client):
    response = await client.post(
        "/api/v1/categories",
        json={
            "name_en": "Kids School Fees",
            "name_ar": "مصاريف مدرسة",
            "type": "expense",
            "icon": "graduation-cap",
            "color": "#3B82F6",
        },
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name_en"] == "Kids School Fees"
    assert data["is_predefined"] is False


@pytest.mark.asyncio
async def test_update_custom_category(client):
    create_resp = await client.post(
        "/api/v1/categories",
        json={
            "name_en": "Old Name",
            "type": "expense",
        },
    )
    cat_id = create_resp.json()["data"]["id"]
    update_resp = await client.put(
        f"/api/v1/categories/{cat_id}",
        json={
            "name_en": "New Name",
        },
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["name_en"] == "New Name"


@pytest.mark.asyncio
async def test_delete_custom_category(client):
    create_resp = await client.post(
        "/api/v1/categories",
        json={
            "name_en": "Temp",
            "type": "expense",
        },
    )
    cat_id = create_resp.json()["data"]["id"]
    delete_resp = await client.delete(f"/api/v1/categories/{cat_id}")
    assert delete_resp.status_code == 204


@pytest.mark.asyncio
async def test_update_predefined_category_restricts_fields(client, db_session):
    """Predefined categories only allow icon and color updates."""
    cat = Category(
        household_id=None,
        name_en="Groceries",
        name_ar="بقالة",
        type="expense",
        is_predefined=True,
        sort_order=1,
        icon="cart",
        color="#FF0000",
    )
    db_session.add(cat)
    await db_session.commit()
    cat_id = cat.id

    # Try to update name_en and icon — only icon should change
    update_resp = await client.put(
        f"/api/v1/categories/{cat_id}",
        json={"name_en": "Renamed", "icon": "basket"},
    )
    assert update_resp.status_code == 200
    data = update_resp.json()["data"]
    assert data["name_en"] == "Groceries"  # name should NOT change
    assert data["icon"] == "basket"  # icon should change


@pytest.mark.asyncio
async def test_delete_predefined_category_fails(client, db_session):
    """Predefined categories cannot be deleted -- should return 403."""
    cat = Category(
        household_id=None,
        name_en="Salary",
        name_ar="راتب",
        type="income",
        is_predefined=True,
        sort_order=1,
    )
    db_session.add(cat)
    await db_session.commit()
    cat_id = cat.id

    delete_resp = await client.delete(f"/api/v1/categories/{cat_id}")
    assert delete_resp.status_code == 403
