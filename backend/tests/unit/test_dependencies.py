from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_fetch_jwks_is_async():
    """_fetch_jwks must be an async coroutine, not a blocking sync call."""
    import inspect

    from app.dependencies import _fetch_jwks

    assert inspect.iscoroutinefunction(_fetch_jwks), "_fetch_jwks must be async def"


@pytest.mark.asyncio
async def test_fetch_jwks_uses_async_client():
    """_fetch_jwks must use httpx.AsyncClient, not httpx.get."""
    mock_response = MagicMock()
    mock_response.json.return_value = {"keys": []}
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.dependencies.httpx.AsyncClient", return_value=mock_client):
        with patch("app.dependencies._supabase_url", "https://test.supabase.co"):
            with patch("app.dependencies._jwks_cache", None):
                with patch("app.dependencies._jwks_cache_time", 0):
                    from app.dependencies import _fetch_jwks

                    result = await _fetch_jwks()
                    assert result == {"keys": []}
                    mock_client.get.assert_awaited_once()


@pytest.mark.asyncio
async def test_fetch_jwks_returns_cache_when_fresh():
    """_fetch_jwks must return cached value without HTTP call when cache is fresh."""
    import time
    from unittest.mock import patch

    cached = {"keys": [{"kid": "test"}]}

    with patch("app.dependencies._jwks_cache", cached):
        with patch("app.dependencies._jwks_cache_time", time.time()):
            with patch("app.dependencies.httpx.AsyncClient") as mock_cls:
                from app.dependencies import _fetch_jwks

                result = await _fetch_jwks()
                assert result == cached
                mock_cls.assert_not_called()
