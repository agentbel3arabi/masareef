import uuid
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db_session


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


@pytest.mark.asyncio
async def test_get_current_user_with_valid_token():
    """Test that a valid JWT extracts the user_id."""
    test_user_id = str(uuid.uuid4())
    mock_payload = {"sub": test_user_id}
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="fake-token")

    with patch("app.dependencies.decode_jwt", return_value=mock_payload):
        user_id = await get_current_user(credentials=creds)
        assert str(user_id) == test_user_id


@pytest.mark.asyncio
async def test_get_current_user_rejects_missing_token():
    """No credentials → raises HTTPException 401."""
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(credentials=None)
    assert exc_info.value.status_code == 401
