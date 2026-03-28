"""
Integration test fixtures.

Uses the real Supabase database. Requires these env vars:
  DATABASE_URL              — asyncpg connection string (with statement_cache_size=0)
  SUPABASE_URL              — for admin API calls
  SUPABASE_SERVICE_ROLE_KEY — to create test users without email confirmation
  SUPABASE_JWT_SECRET       — to validate JWTs in the app

Each test session creates an isolated household and cleans up after itself.
"""
import os
import pathlib
import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from dotenv import load_dotenv
from httpx import ASGITransport, AsyncClient

from app.main import app

# Load .env into os.environ so fixtures can read SUPABASE_URL etc. when running locally
load_dotenv(pathlib.Path(__file__).parent.parent.parent / ".env")


@pytest.fixture(autouse=True)
def clear_app_dependency_overrides() -> None:
    """Remove unit-test dependency overrides so real auth and DB run in integration tests."""
    from app.main import app as _app
    _app.dependency_overrides.clear()
    yield
    _app.dependency_overrides.clear()


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


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def test_auth_token(supabase_url: str, service_role_key: str) -> AsyncGenerator[str, None]:
    """
    Create a test user via Supabase Admin API and return their access token.
    Cleans up the user after the test session.
    """
    test_email = f"test-integration-{uuid.uuid4().hex[:8]}@masareef-test.invalid"
    test_password = f"TestPass-{uuid.uuid4().hex[:12]}!"
    user_id: str | None = None

    try:
        async with AsyncClient() as client:
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
    finally:
        if user_id is not None:
            async with AsyncClient() as client:
                await client.delete(
                    f"{supabase_url}/auth/v1/admin/users/{user_id}",
                    headers={
                        "apikey": service_role_key,
                        "Authorization": f"Bearer {service_role_key}",
                    },
                )


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def api_client(test_auth_token: str) -> AsyncGenerator[AsyncClient, None]:
    """HTTPX async client pointed at the FastAPI app with auth header injected."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {test_auth_token}"},
    ) as client:
        yield client
