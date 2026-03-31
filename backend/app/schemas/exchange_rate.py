from __future__ import annotations

from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal

from pydantic import BaseModel, field_validator


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
    rate: float  # User-friendly float input — backend converts via rate_scaled

    @field_validator("rate")
    @classmethod
    def rate_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("rate must be a positive number")
        return v

    @property
    def rate_scaled(self) -> int:
        """Convert user-supplied rate to scaled integer (rate × 10 000), using ROUND_HALF_UP."""
        return int(
            (Decimal(str(self.rate)) * 10_000).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        )
