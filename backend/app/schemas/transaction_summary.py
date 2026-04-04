"""Schemas for the transaction summary endpoint."""

import datetime

from pydantic import BaseModel


class TransactionSummaryPeriod(BaseModel):
    start: datetime.date
    end: datetime.date


class TransactionSummaryData(BaseModel):
    total_income: int  # minor units, positive
    total_expenses: int  # minor units, positive (absolute value of negatives)
    net_flow: int  # total_income - total_expenses
    transaction_count: int
    currency: str
    period: TransactionSummaryPeriod
