from datetime import date

from pydantic import BaseModel, Field

from app.models.enums import AccountType


class AccountCreate(BaseModel):
    name: str
    name_ar: str | None = None
    type: AccountType
    currency: str = Field(max_length=3)
    institution_id: int | None = None
    # minor units, positive for assets, positive for "amount owed" on CC/BNPL
    opening_balance: int = 0
    opened_at: date | None = None
    iban: str | None = None
    account_number: str | None = None
    account_tier: str | None = None
    branch: str | None = None
    credit_limit: int | None = None
    billing_cycle_day: int | None = Field(default=None, ge=1, le=31)
    payment_due_day: int | None = Field(default=None, ge=1, le=31)


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
    opened_at: date | None = None
    # currency and type are immutable after creation


class InstitutionEmbed(BaseModel):
    id: int
    slug: str
    name_en: str
    name_ar: str
    type: str
    logo_url: str | None = None

    model_config = {"from_attributes": True}


class AccountResponse(BaseModel):
    id: int
    name: str
    name_ar: str | None = None
    type: str
    currency: str
    displayed_balance_minor: int = 0
    institution: InstitutionEmbed | None = None
    iban_last4: str | None = None
    account_tier: str | None = None
    credit_limit: int | None = None
    billing_cycle_day: int | None = None
    payment_due_day: int | None = None
    opened_at: date | None = None
    is_active: bool = True
    last_transaction_date: date | None = None

    model_config = {"from_attributes": True}


class AccountDetailResponse(AccountResponse):
    """Full detail — includes IBAN, account_number, branch."""

    iban: str | None = None
    account_number: str | None = None
    branch: str | None = None


class ReconcileRequest(BaseModel):
    actual_balance: int  # Minor units
    reconciliation_date: date | None = None
    notes: str | None = None
