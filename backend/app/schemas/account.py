from datetime import date

from pydantic import BaseModel, Field

from app.models.enums import AccountType


class AccountCreate(BaseModel):
    name: str
    name_ar: str | None = None
    type: AccountType
    currency: str = Field(max_length=3)
    initial_balance: int = 0  # Minor units, integer only
    institution_id: int | None = None
    iban: str | None = None
    account_number: str | None = None
    account_tier: str | None = None
    branch: str | None = None
    credit_limit: int | None = None
    billing_cycle_day: int | None = Field(default=None, ge=1, le=31)
    payment_due_day: int | None = Field(default=None, ge=1, le=31)
    opened_at: date | None = None


class AccountUpdate(BaseModel):
    name: str | None = None
    name_ar: str | None = None
    institution_id: int | None = None
    iban: str | None = None
    account_number: str | None = None
    account_tier: str | None = None
    branch: str | None = None
    credit_limit: int | None = None
    billing_cycle_day: int | None = Field(default=None, ge=1, le=31)
    payment_due_day: int | None = Field(default=None, ge=1, le=31)
    # currency and type are immutable after creation


class AccountResponse(BaseModel):
    id: int
    name: str
    name_ar: str | None = None
    type: str
    currency: str
    balance_minor: int
    displayed_balance_minor: int
    institution_id: int | None = None
    iban: str | None = None
    account_number: str | None = None
    account_tier: str | None = None
    branch: str | None = None
    credit_limit: int | None = None
    billing_cycle_day: int | None = None
    payment_due_day: int | None = None
    opened_at: date | None = None
    is_active: bool
    last_transaction_date: date | None = None

    model_config = {"from_attributes": True}


class ReconcileRequest(BaseModel):
    actual_balance: int  # Minor units
    notes: str | None = None
