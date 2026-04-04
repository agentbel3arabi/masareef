from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class InstallmentCreate(BaseModel):
    type: Literal["credit_card", "store", "financing_app"]
    name: str
    merchant_name: str | None = None
    source_account_id: int | None = None
    linked_account_id: int | None = None
    total_amount_minor: int = Field(gt=0)
    monthly_amount_minor: int = Field(gt=0)
    total_months: int = Field(gt=0)
    start_month: date
    currency: str = Field(min_length=3, max_length=3)
    annual_rate_bps: int = 0
    payment_day_of_month: int | None = Field(default=None, ge=1, le=28)
    notes: str | None = None


class InstallmentUpdate(BaseModel):
    name: str | None = None
    merchant_name: str | None = None
    linked_account_id: int | None = None
    annual_rate_bps: int | None = None
    notes: str | None = None


class InstallmentResponse(BaseModel):
    id: int
    type: str
    name: str
    merchant_name: str | None = None
    source_account_id: int | None = None
    linked_account_id: int | None = None
    total_amount_minor: int
    monthly_amount_minor: int
    total_months: int
    start_month: date
    currency: str
    annual_rate_bps: int
    payment_day_of_month: int | None = None
    notes: str | None = None
    status: Literal["active", "completed"]
    months_paid: int
    remaining_months: int
    remaining_minor: int
    is_active: bool

    model_config = {"from_attributes": True}


class FinancingAppDetail(BaseModel):
    account_id: int
    name: str
    name_ar: str | None = None
    credit_limit_minor: int
    balance_minor: int
    available_minor: int
    utilization_percent: float
    active_plans_count: int
    monthly_commitment_minor: int


class FinancingAppsTotals(BaseModel):
    total_limit_minor: int
    total_used_minor: int
    total_available_minor: int
    total_monthly_minor: int
    total_remaining_minor: int


class FinancingAppsSummaryResponse(BaseModel):
    apps: list[FinancingAppDetail]
    totals: FinancingAppsTotals


class ObligationDebt(BaseModel):
    id: int
    type: str
    name: str
    monthly_payment_minor: int
    remaining_minor: int
    status: str


class ObligationInstallment(BaseModel):
    id: int
    type: str
    name: str
    merchant_name: str | None = None
    monthly_amount_minor: int
    remaining_minor: int
    remaining_months: int
    status: str


class AccountObligationsResponse(BaseModel):
    debts: list[ObligationDebt]
    installments: list[ObligationInstallment]
