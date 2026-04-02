"""Foreign exchange conversion via USD hub currency (stub)."""
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession

RATE_SCALE = 10_000

@dataclass
class FXResult:
    total_base_minor: int
    base_currency: str
    fx_warnings: list[str]

async def get_latest_rates(
    session: AsyncSession,
    currencies: set[str],
) -> dict[str, int]:
    raise NotImplementedError("Stub")

async def convert_to_base(
    session: AsyncSession,
    balances: dict[str, int],
    base_currency: str,
) -> FXResult:
    raise NotImplementedError("Stub")
