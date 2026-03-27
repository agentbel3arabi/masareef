import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.dependencies import get_current_user, get_household_id, get_db_session
from app.main import app


TEST_USER_ID = uuid.uuid4()
TEST_HOUSEHOLD_ID = uuid.uuid4()


async def override_get_current_user() -> uuid.UUID:
    return TEST_USER_ID


async def override_get_household_id() -> uuid.UUID:
    return TEST_HOUSEHOLD_ID


@pytest.fixture(autouse=True)
def override_auth_deps():
    """Override auth dependencies for all router tests."""
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_household_id] = override_get_household_id
    yield
    app.dependency_overrides.clear()


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
