from __future__ import annotations

from datetime import date
from uuid import UUID

from pydantic import BaseModel


class TransferCreate(BaseModel):
    from_account_id: int
    to_account_id: int
    amount_minor: int  # Source amount in minor units
    date: date
    description: str = ""
    notes: str | None = None
    fx_rate_minor_units: int | None = None  # Required for cross-currency


class TransferResponse(BaseModel):
    transfer_id: UUID
    debit_transaction_id: int
    credit_transaction_id: int
    source_amount: int
    target_amount: int


class TransferListItem(BaseModel):
    transfer_id: UUID
    date: date
    description: str
    from_account: dict
    to_account: dict
    source_amount: int
    target_amount: int
    fx_rate_minor_units: int | None = None
