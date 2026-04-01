from datetime import date

from pydantic import BaseModel, Field


class DebtCreate(BaseModel):
    type: str  # "bank_loan" (P2P types added in 3B)
    name: str
    institution: str | None = None
    principal_minor: int = Field(gt=0)
    currency: str = Field(max_length=3)
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
    type: str
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
    status: str
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
    status: str  # paid | overdue | upcoming


class MatchSuggestion(BaseModel):
    transaction_id: int
    date: date
    amount_minor: int
    description: str
    score: float  # 0.0–1.0
