"""Unit tests for budget guard — budget_guard.py (Plan 03-02, TDD RED)."""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.budget_guard import check_budget, get_or_create_usage, record_usage


HOUSEHOLD_ID = uuid.uuid4()


def _make_usage(tokens_used: int, monthly_limit: int | None) -> MagicMock:
    """Create a mock AIUsageTracking instance — avoids SQLAlchemy ORM __new__ pitfalls."""
    usage = MagicMock()
    usage.household_id = HOUSEHOLD_ID
    usage.year_month = "2026-04"
    usage.tokens_used = tokens_used
    usage.monthly_limit = monthly_limit
    usage.updated_at = datetime.now(timezone.utc)
    return usage


class TestCheckBudget:
    @pytest.mark.asyncio
    async def test_returns_true_when_limit_is_none(self) -> None:
        """D-03: None monthly_limit = unlimited."""
        usage = _make_usage(tokens_used=999999, monthly_limit=None)
        with patch("app.ai.budget_guard.get_or_create_usage", new=AsyncMock(return_value=usage)):
            session = AsyncMock(spec=AsyncSession)
            result = await check_budget(session, HOUSEHOLD_ID)
        assert result is True

    @pytest.mark.asyncio
    async def test_returns_true_when_under_limit(self) -> None:
        usage = _make_usage(tokens_used=100, monthly_limit=500000)
        with patch("app.ai.budget_guard.get_or_create_usage", new=AsyncMock(return_value=usage)):
            session = AsyncMock(spec=AsyncSession)
            result = await check_budget(session, HOUSEHOLD_ID)
        assert result is True

    @pytest.mark.asyncio
    async def test_returns_false_when_at_limit(self) -> None:
        usage = _make_usage(tokens_used=500000, monthly_limit=500000)
        with patch("app.ai.budget_guard.get_or_create_usage", new=AsyncMock(return_value=usage)):
            session = AsyncMock(spec=AsyncSession)
            result = await check_budget(session, HOUSEHOLD_ID)
        assert result is False

    @pytest.mark.asyncio
    async def test_returns_false_when_over_limit(self) -> None:
        usage = _make_usage(tokens_used=600000, monthly_limit=500000)
        with patch("app.ai.budget_guard.get_or_create_usage", new=AsyncMock(return_value=usage)):
            session = AsyncMock(spec=AsyncSession)
            result = await check_budget(session, HOUSEHOLD_ID)
        assert result is False


class TestRecordUsage:
    @pytest.mark.asyncio
    async def test_executes_atomic_update(self) -> None:
        """Atomic UPDATE increment — RESEARCH.md Pitfall 4 mitigation."""
        session = AsyncMock(spec=AsyncSession)
        session.execute = AsyncMock()

        await record_usage(session, HOUSEHOLD_ID, tokens=1500)

        # Must call session.execute (not update via ORM object — which would be non-atomic)
        session.execute.assert_called_once()
        # The call arg should be an Update clause
        call_arg = session.execute.call_args[0][0]
        # Verify it's an UPDATE statement (SQLAlchemy Update object)
        from sqlalchemy.sql.dml import Update
        assert isinstance(call_arg, Update)


class TestGetOrCreateUsage:
    @pytest.mark.asyncio
    async def test_creates_row_when_not_found(self) -> None:
        session = AsyncMock(spec=AsyncSession)
        # Simulate no existing row
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        session.execute = AsyncMock(return_value=mock_result)
        session.flush = AsyncMock()
        session.add = MagicMock()

        result = await get_or_create_usage(session, HOUSEHOLD_ID)

        session.add.assert_called_once()
        session.flush.assert_called_once()
        from app.models.ai_usage_tracking import AIUsageTracking
        assert isinstance(result, AIUsageTracking)
        assert result.tokens_used == 0
        assert result.monthly_limit is None  # starts unlimited

    @pytest.mark.asyncio
    async def test_returns_existing_row(self) -> None:
        usage = _make_usage(tokens_used=5000, monthly_limit=500000)
        session = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = usage
        session.execute = AsyncMock(return_value=mock_result)

        result = await get_or_create_usage(session, HOUSEHOLD_ID)

        # No add/flush when existing row found
        assert result.tokens_used == 5000
        session.add.assert_not_called()

    @pytest.mark.asyncio
    async def test_uses_select_for_update(self) -> None:
        """RESEARCH.md Pitfall 4: SELECT FOR UPDATE prevents race condition."""
        session = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = _make_usage(0, None)
        session.execute = AsyncMock(return_value=mock_result)

        await get_or_create_usage(session, HOUSEHOLD_ID)

        # Verify SELECT FOR UPDATE was used (check the compiled query string)
        call_arg = session.execute.call_args[0][0]
        compiled = str(call_arg.compile(compile_kwargs={"literal_binds": True}))
        assert "FOR UPDATE" in compiled
