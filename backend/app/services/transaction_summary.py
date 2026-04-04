"""Transaction summary service — aggregates income/expense totals for a period."""

import datetime
import uuid
from calendar import monthrange

from dateutil.relativedelta import relativedelta
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction
from app.schemas.transaction_summary import TransactionSummaryData, TransactionSummaryPeriod


def _resolve_period(
    period: str,
    start_date: datetime.date | None,
    end_date: datetime.date | None,
) -> tuple[datetime.date, datetime.date]:
    """Return (start, end) dates for the given period specifier."""
    today = datetime.date.today()

    if period == "custom":
        if start_date is None or end_date is None:
            raise ValueError("start_date and end_date are required for custom period")
        return start_date, end_date

    if period == "month":
        start = today.replace(day=1)
        _, last_day = monthrange(today.year, today.month)
        end = today.replace(day=last_day)
        return start, end

    if period == "quarter":
        quarter_start_month = ((today.month - 1) // 3) * 3 + 1
        start = today.replace(month=quarter_start_month, day=1)
        end = start + relativedelta(months=3) - datetime.timedelta(days=1)
        return start, end

    if period == "year":
        start = today.replace(month=1, day=1)
        end = today.replace(month=12, day=31)
        return start, end

    raise ValueError(f"Unknown period: {period}")


async def get_transaction_summary(
    session: AsyncSession,
    household_id: uuid.UUID,
    *,
    period: str = "month",
    start_date: datetime.date | None = None,
    end_date: datetime.date | None = None,
    account_id: int | None = None,
    category_id: int | None = None,
    type: str | None = None,
    currency: str = "EGP",
) -> TransactionSummaryData:
    """Aggregate transaction totals for a household within a period."""
    start, end = _resolve_period(period, start_date, end_date)

    # Build base query with required filters
    conditions = [
        Transaction.household_id == household_id,
        Transaction.is_active.is_(True),
        Transaction.date >= start,
        Transaction.date <= end,
    ]

    conditions.append(Transaction.currency == currency)

    if account_id is not None:
        conditions.append(Transaction.account_id == account_id)
    if category_id is not None:
        conditions.append(Transaction.category_id == category_id)
    if type == "income":
        conditions.append(Transaction.amount_minor > 0)
    elif type == "expense":
        conditions.append(Transaction.amount_minor < 0)

    # Single aggregate query
    stmt = select(
        func.coalesce(
            func.sum(
                case(
                    (Transaction.amount_minor > 0, Transaction.amount_minor),
                    else_=0,
                )
            ),
            0,
        ).label("total_income"),
        func.coalesce(
            func.sum(
                case(
                    (Transaction.amount_minor < 0, func.abs(Transaction.amount_minor)),
                    else_=0,
                )
            ),
            0,
        ).label("total_expenses"),
        func.count().label("transaction_count"),
    ).where(*conditions)

    result = await session.execute(stmt)
    row = result.one()

    total_income = int(row.total_income)
    total_expenses = int(row.total_expenses)

    return TransactionSummaryData(
        total_income=total_income,
        total_expenses=total_expenses,
        net_flow=total_income - total_expenses,
        transaction_count=int(row.transaction_count),
        currency=currency,
        period=TransactionSummaryPeriod(start=start, end=end),
    )
