from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel


class ExchangeRateItem(BaseModel):
    from_currency: str = "USD"
    to_currency: str
    rate_scaled: int
    rate_display: float  # Convenience: rate_scaled / 10000

    model_config = {"from_attributes": True}


class ExchangeRatesResponse(BaseModel):
    base: str = "USD"
    date: date
    rates: list[ExchangeRateItem]
    last_fetched: datetime | None = None
    is_stale: bool = False


class ManualRateRequest(BaseModel):
    date: date
    from_currency: str = "USD"
    to_currency: str
    rate: float  # User-friendly float — backend converts to rate_scaled
