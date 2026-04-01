from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class DebtCreate(BaseModel):
    type: Literal["bank_loan"]  # extend to Union[Literal[...]] in 3B for P2P types
    name: str
    institution: str | None = None
    principal_minor: int = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3)
    annual_rate_percent: float = Field(ge=0, default=0)  # Backend converts to bps
    tenure_months: int = Field(gt=0)
    start_date: date
    linked_account_id: int | None = None
    notes: str | None = None
    # P2P fields (used in 3B, ignored for bank_loan)
    person_id: int | None = None
    repayment_mode: str | None = None
    due_date: date | None = None


class DebtUpdate(BaseModel):
    name: str | None = None
    institution: str | None = None
    linked_account_id: int | None = None
    notes: str | None = None


class DebtResponse(BaseModel):
    id: int
    type: str  # kept as str — service may return P2P types from DB before 3B schemas update
    person_id: int | None = None
    linked_account_id: int | None = None
    name: str
    institution: str | None = None
    principal_minor: int
    currency: str
    annual_rate_bps: int
    tenure_months: int
    start_date: date
    monthly_payment_minor: int
    repayment_mode: str | None = None
    due_date: date | None = None
    status: Literal["active", "paid_off"]
    notes: str | None = None
    is_active: bool
    total_paid_minor: int = 0
    remaining_minor: int = 0

    model_config = {"from_attributes": True}


class PaymentCreate(BaseModel):
    date: date
    amount_minor: int = Field(gt=0)
    transaction_id: int | None = None
    notes: str | None = None


class PaymentResponse(BaseModel):
    id: int
    debt_id: int
    date: date
    amount_minor: int
    principal_minor: int | None = None
    interest_minor: int | None = None
    transaction_id: int | None = None
    notes: str | None = None

    model_config = {"from_attributes": True}


class ScheduleRow(BaseModel):
    payment_number: int
    date: date
    payment_minor: int
    principal_minor: int
    interest_minor: int
    remaining_minor: int
    status: Literal["paid", "overdue", "upcoming"]


class MatchSuggestion(BaseModel):
    transaction_id: int
    date: date
    amount_minor: int
    description: str
    score: float = Field(ge=0.0, le=1.0)  # 0.0 = no match, 1.0 = exact match
