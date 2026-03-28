"""
Integration test fixtures.

Uses the real Supabase database. Requires these env vars:
  DATABASE_URL             — asyncpg connection string (with statement_cache_size=0)
  SUPABASE_URL             — for admin API calls
  SUPABASE_SERVICE_ROLE_KEY — to create test users without email confirmation
  JWT_SECRET               — to sign test JWTs (or use a real Supabase token)

Each test session creates an isolated household and cleans up after itself.
"""
import os
import uuid
import pytest
import pytest_asyncio
import httpx
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture(scope="session")
def supabase_url() -> str:
    url = os.environ.get("SUPABASE_URL", "")
    if not url:
        pytest.skip("SUPABASE_URL not set — skipping integration tests")
    return url


@pytest.fixture(scope="session")
def service_role_key() -> str:
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not key:
        pytest.skip("SUPABASE_SERVICE_ROLE_KEY not set — skipping integration tests")
    return key


@pytest_asyncio.fixture(scope="session")
async def test_auth_token(supabase_url: str, service_role_key: str) -> str:
    """
    Create a test user via Supabase Admin API and return their access token.
    Cleans up the user after the test session.
    """
    test_email = f"test-integration-{uuid.uuid4().hex[:8]}@masareef-test.invalid"
    test_password = f"TestPass-{uuid.uuid4().hex[:12]}!"

    async with httpx.AsyncClient() as client:
        # Create user via Admin API
        resp = await client.post(
            f"{supabase_url}/auth/v1/admin/users",
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
            },
            json={
                "email": test_email,
                "password": test_password,
                "email_confirm": True,
            },
        )
        resp.raise_for_status()
        user_id = resp.json()["id"]

        # Sign in to get access token
        sign_in = await client.post(
            f"{supabase_url}/auth/v1/token?grant_type=password",
            headers={"apikey": service_role_key},
            json={"email": test_email, "password": test_password},
        )
        sign_in.raise_for_status()
        token = sign_in.json()["access_token"]

    yield token

    # Cleanup: delete test user
    async with httpx.AsyncClient() as client:
        await client.delete(
            f"{supabase_url}/auth/v1/admin/users/{user_id}",
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
            },
        )


@pytest_asyncio.fixture(scope="session")
async def api_client(test_auth_token: str) -> AsyncClient:
    """HTTPX async client pointed at the FastAPI app with auth header injected."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {test_auth_token}"},
    ) as client:
        yield client
