from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.database import async_session_factory, engine


def test_engine_is_async():
    assert isinstance(engine, AsyncEngine)


def test_session_factory_produces_async_session():
    session = async_session_factory()
    assert isinstance(session, AsyncSession)
    # Clean up — don't leave an unclosed session
