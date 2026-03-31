import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.dependencies import get_current_user, get_db_session, get_household_id
from app.main import app

# Import all models so Base.metadata knows about every table
from app.models import (  # noqa: F401
    Account,
    AccountImportTemplate,  # noqa: F401
    Base,  # noqa: F401
    Category,
    ExchangeRate,
    Household,
    HouseholdMember,
    ImportTemplate,  # noqa: F401
    Transaction,
    TransactionSplit,
)

TEST_USER_ID = uuid.uuid4()
TEST_HOUSEHOLD_ID = uuid.uuid4()

# In-memory SQLite for fast tests
test_engine = create_async_engine("sqlite+aiosqlite://", echo=False)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(autouse=True)
async def setup_database():
    """Create all tables before each test, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_db_session():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def override_get_current_user() -> uuid.UUID:
    return TEST_USER_ID


async def override_get_household_id() -> uuid.UUID:
    return TEST_HOUSEHOLD_ID


@pytest.fixture(autouse=True)
def override_deps():
    """Override auth and DB dependencies for all tests."""
    app.dependency_overrides[get_db_session] = override_get_db_session
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_household_id] = override_get_household_id
    yield
    app.dependency_overrides.clear()


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
async def db_session():
    """Yield a test DB session for direct ORM seeding in tests."""
    async with TestSessionLocal() as session:
        yield session
