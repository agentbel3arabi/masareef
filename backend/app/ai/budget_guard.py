"""Token budget guard — enforces monthly AI token limits per household.

Uses SELECT FOR UPDATE to prevent race conditions when multiple background tasks
check the budget concurrently (RESEARCH.md Pitfall 4 mitigation).
"""

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_usage_tracking import AIUsageTracking

logger = logging.getLogger(__name__)


def _current_year_month() -> str:
    """Return current UTC month as 'YYYY-MM' string."""
    return datetime.now(timezone.utc).strftime("%Y-%m")


async def get_or_create_usage(
    session: AsyncSession, household_id: uuid.UUID
) -> AIUsageTracking:
    """Get or create the current month's usage row for a household.

    Uses SELECT FOR UPDATE to prevent race conditions (RESEARCH.md Pitfall 4).
    """
    ym = _current_year_month()
    q = (
        select(AIUsageTracking)
        .where(
            AIUsageTracking.household_id == household_id,
            AIUsageTracking.year_month == ym,
        )
        .with_for_update()  # SELECT FOR UPDATE prevents budget race condition
    )
    result = await session.execute(q)
    usage = result.scalar_one_or_none()
    if usage is None:
        usage = AIUsageTracking(
            household_id=household_id,
            year_month=ym,
            tokens_used=0,
            monthly_limit=None,  # None = unlimited until configured in Phase 7
        )
        session.add(usage)
        await session.flush()
    return usage


async def check_budget(session: AsyncSession, household_id: uuid.UUID) -> bool:
    """Returns True if household has remaining AI budget. False if exhausted.

    Returns True when monthly_limit is None (unlimited per D-03).
    """
    usage = await get_or_create_usage(session, household_id)
    if usage.monthly_limit is None:
        return True
    return usage.tokens_used < usage.monthly_limit


async def record_usage(session: AsyncSession, household_id: uuid.UUID, tokens: int) -> None:
    """Atomically increment tokens_used for current month.

    Uses UPDATE ... SET tokens_used = tokens_used + N for atomic increment
    rather than read-modify-write (RESEARCH.md Pitfall 4 mitigation).
    """
    ym = _current_year_month()
    await session.execute(
        update(AIUsageTracking)
        .where(
            AIUsageTracking.household_id == household_id,
            AIUsageTracking.year_month == ym,
        )
        .values(tokens_used=AIUsageTracking.tokens_used + tokens)
    )


async def get_usage(
    session: AsyncSession, household_id: uuid.UUID
) -> AIUsageTracking | None:
    """Get current month usage record for display. Returns None if no usage yet."""
    ym = _current_year_month()
    q = select(AIUsageTracking).where(
        AIUsageTracking.household_id == household_id,
        AIUsageTracking.year_month == ym,
    )
    result = await session.execute(q)
    return result.scalar_one_or_none()
