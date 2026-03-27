import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session


@pytest.mark.asyncio
async def test_get_db_session_yields_async_session():
    session_gen = get_db_session()
    session = await session_gen.__anext__()
    assert isinstance(session, AsyncSession)
    # Clean up
    try:
        await session_gen.__anext__()
    except StopAsyncIteration:
        pass
