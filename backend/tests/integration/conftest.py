"""
Integration test fixtures.

Uses the real Supabase database. Requires these env vars:
  DATABASE_URL              — asyncpg connection string (with statement_cache_size=0)
  SUPABASE_URL              — for admin API calls
  SUPABASE_SERVICE_ROLE_KEY — to create test users without email confirmation
  SUPABASE_JWT_SECRET       — to validate JWTs in the app

Each test session creates a dedicated Supabase Auth user for integration tests and
deletes that auth user after the session.
"""

import os
import pathlib
import uuid
from collections.abc import AsyncGenerator, Generator

import pytest
import pytest_asyncio

# Load .env before app imports so Settings() finds DATABASE_URL/SUPABASE_* when
# running locally without manually exporting env vars.
from dotenv import load_dotenv

load_dotenv(pathlib.Path(__file__).parent.parent.parent / ".env")

from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def clear_app_dependency_overrides() -> Generator[None, None, None]:
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
                delete_resp = await client.delete(
                    f"{supabase_url}/auth/v1/admin/users/{user_id}",
                    headers={
                        "apikey": service_role_key,
                        "Authorization": f"Bearer {service_role_key}",
                    },
                )
                delete_resp.raise_for_status()


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def api_client(test_auth_token: str) -> AsyncGenerator[AsyncClient, None]:
    """HTTPX async client pointed at the FastAPI app with auth header injected."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {test_auth_token}"},
    ) as client:
        yield client
