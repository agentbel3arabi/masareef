"""Pydantic response models for dashboard aggregation endpoints."""

from typing import Literal

from pydantic import BaseModel


class StatCardTrend(BaseModel):
    direction: Literal["up", "down", "flat"]
    absolute_delta: int  # minor units
    percentage: float | None  # None when previous period was 0


class StatCardItem(BaseModel):
    label: str
    value_minor: int
    currency: str
    trend: StatCardTrend | None = None
    count: int | None = None  # for "Active Debts" card (count, not money)


class StatCardsData(BaseModel):
    net_worth: StatCardItem
    spending: StatCardItem
    active_debts: StatCardItem
    upcoming_payments: StatCardItem


class IncomeVsExpensesMonth(BaseModel):
    month: str  # "2026-01" format
    income_minor: int
    expenses_minor: int
    currency: str


class SpendingByCategory(BaseModel):
    category_id: int | None  # None for "Other" bucket
    category_name: str
    category_name_ar: str | None = None
    category_color: str | None = None
    amount_minor: int  # absolute positive
    percentage: float  # 0-100
    currency: str


class NetWorthTrendPoint(BaseModel):
    month: str  # "2026-01" format
    accounts_minor: int
    debts_minor: int  # positive number representing debt amount
    net_worth_minor: int  # accounts - debts
    currency: str
