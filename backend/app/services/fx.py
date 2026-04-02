"""Foreign exchange conversion via USD hub currency.

Exchange rates are stored as USD → target with rate × 10,000 scaling.
All conversions route through USD: Source → USD → Target.
"""
from dataclasses import dataclass

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exchange_rate import ExchangeRate

RATE_SCALE = 10_000


@dataclass
class FXResult:
    """Result of converting multiple currency balances to a single base currency."""

    total_base_minor: int
    base_currency: str
    fx_warnings: list[str]


async def get_latest_rates(
    session: AsyncSession,
    currencies: set[str],
) -> dict[str, int]:
    """Fetch the most recent rate_scaled for each currency in the set.

    Returns a dict mapping to_currency → rate_scaled (USD → to_currency).
    Currencies not found in the exchange_rates table are omitted.
    """
    if not currencies:
        return {}

    # Subquery: max date per (from_currency, to_currency)
    max_date_sq = (
        select(
            ExchangeRate.to_currency,
            func.max(ExchangeRate.date).label("max_date"),
        )
        .where(
            ExchangeRate.from_currency == "USD",
            ExchangeRate.to_currency.in_(currencies),
        )
        .group_by(ExchangeRate.to_currency)
        .subquery()
    )

    q = (
        select(ExchangeRate.to_currency, ExchangeRate.rate_scaled)
        .join(
            max_date_sq,
            (ExchangeRate.to_currency == max_date_sq.c.to_currency)
            & (ExchangeRate.date == max_date_sq.c.max_date),
        )
        .where(
            ExchangeRate.from_currency == "USD",
            ExchangeRate.to_currency.in_(currencies),
        )
    )

    rows = (await session.execute(q)).all()
    return {row.to_currency: row.rate_scaled for row in rows}


async def convert_to_base(
    session: AsyncSession,
    balances: dict[str, int],
    base_currency: str,
) -> FXResult:
    """Convert per-currency minor-unit balances to a single base currency.

    Conversion path via USD hub:
      - Same currency → pass through
      - Source → USD: amount * RATE_SCALE / rate_scaled[source]
      - USD → Base: amount * rate_scaled[base] / RATE_SCALE
      - Source == USD → skip first hop
      - Base == USD → skip second hop

    Uses integer arithmetic only. Rounding happens via floor division (//).
    """
    if not balances:
        return FXResult(total_base_minor=0, base_currency=base_currency, fx_warnings=[])

    # Collect all non-base currencies that need FX lookup, plus base if it's not USD
    currencies_needed: set[str] = set()
    for currency in balances:
        if currency != base_currency:
            if currency != "USD":
                currencies_needed.add(currency)
            if base_currency != "USD":
                currencies_needed.add(base_currency)

    rates = await get_latest_rates(session, currencies_needed) if currencies_needed else {}

    total = 0
    warnings: list[str] = []

    for currency, amount_minor in balances.items():
        if currency == base_currency:
            total += amount_minor
            continue

        # Step 1: convert source currency to USD
        if currency == "USD":
            usd_minor = amount_minor
        else:
            source_rate = rates.get(currency)
            if source_rate is None or source_rate == 0:
                warnings.append(currency)
                continue
            usd_minor = amount_minor * RATE_SCALE // source_rate

        # Step 2: convert USD to base currency
        if base_currency == "USD":
            total += usd_minor
        else:
            base_rate = rates.get(base_currency)
            if base_rate is None or base_rate == 0:
                warnings.append(currency)
                continue
            total += usd_minor * base_rate // RATE_SCALE

    return FXResult(
        total_base_minor=total,
        base_currency=base_currency,
        fx_warnings=sorted(set(warnings)),
    )
