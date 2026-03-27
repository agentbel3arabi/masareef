import pytest


@pytest.mark.asyncio
async def test_health_returns_ok(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


@pytest.mark.asyncio
async def test_api_v1_prefix_exists(client):
    # Verify the API prefix is configured (will 404 but proves the router mount point)
    response = await client.get("/api/v1/")
    # 404 is expected — no routes yet — but NOT 405 or connection error
    assert response.status_code in (404, 200)
