"""Dashboard aggregation business logic.

All amounts are in minor units. Multi-currency amounts are converted to
the requested base_currency via the FX hub (USD).

Month bucketing is done in Python (not SQL) for PostgreSQL + SQLite compatibility.
"""

import datetime
import uuid
from collections import defaultdict

from dateutil.relativedelta import relativedelta
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.category import Category
from app.models.debt import Debt
from app.models.debt_payment import DebtPayment
from app.models.installment_plan import InstallmentPlan
from app.models.p2p_debt_split import P2PDebtSplit
from app.models.transaction import Transaction
from app.schemas.dashboard import (
    IncomeVsExpensesMonth,
    NetWorthTrendPoint,
    SpendingByCategory,
    StatCardItem,
    StatCardsData,
    StatCardTrend,
)
from app.services.fx import convert_to_base, get_latest_rates


def _compute_trend(
    current: int,
    previous: int,
) -> StatCardTrend:
    """Compute month-over-month trend from two values."""
    if current > previous:
        direction = "up"
    elif current < previous:
        direction = "down"
    else:
        direction = "flat"

    absolute_delta = abs(current - previous)
    percentage: float | None = None
    if previous != 0:
        percentage = round(absolute_delta / abs(previous) * 100, 2)

    return StatCardTrend(
        direction=direction,
        absolute_delta=absolute_delta,
        percentage=percentage,
    )


async def get_income_vs_expenses(
    session: AsyncSession,
    household_id: uuid.UUID,
    *,
    months: int = 6,
    base_currency: str = "EGP",
) -> list[IncomeVsExpensesMonth]:
    """Monthly income and expense totals grouped by month, converted to base currency."""
    today = datetime.date.today()
    start_date = today.replace(day=1) - relativedelta(months=months - 1)

    stmt = select(
        Transaction.currency,
        Transaction.date,
        Transaction.amount_minor,
    ).where(
        Transaction.household_id == household_id,
        Transaction.is_active.is_(True),
        Transaction.transfer_id.is_(None),
        Transaction.date >= start_date,
    )

    rows = (await session.execute(stmt)).all()

    # Group by month in Python (works on both PostgreSQL and SQLite)
    month_income: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    month_expense: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for row in rows:
        month_str = row.date.strftime("%Y-%m")
        amount = int(row.amount_minor)
        if amount > 0:
            month_income[month_str][row.currency] += amount
        elif amount < 0:
            month_expense[month_str][row.currency] += abs(amount)

    all_months = sorted(set(list(month_income.keys()) + list(month_expense.keys())))

    result: list[IncomeVsExpensesMonth] = []
    for month in all_months:
        income_fx = await convert_to_base(session, dict(month_income.get(month, {})), base_currency)
        expense_fx = await convert_to_base(
            session, dict(month_expense.get(month, {})), base_currency
        )
        result.append(
            IncomeVsExpensesMonth(
                month=month,
                income_minor=income_fx.total_base_minor,
                expenses_minor=expense_fx.total_base_minor,
                currency=base_currency,
            )
        )

    return result


async def get_spending_by_category(
    session: AsyncSession,
    household_id: uuid.UUID,
    *,
    base_currency: str = "EGP",
) -> list[SpendingByCategory]:
    """Top 8 spending categories + Other for the current month."""
    today = datetime.date.today()
    month_start = today.replace(day=1)

    stmt = (
        select(
            Transaction.category_id,
            Transaction.currency,
            Category.name_en,
            Category.name_ar,
            Category.color,
            func.sum(func.abs(Transaction.amount_minor)).label("total"),
        )
        .outerjoin(Category, Transaction.category_id == Category.id)
        .where(
            Transaction.household_id == household_id,
            Transaction.is_active.is_(True),
            Transaction.transfer_id.is_(None),
            Transaction.amount_minor < 0,
            Transaction.date >= month_start,
            Transaction.date <= today,
        )
        .group_by(
            Transaction.category_id,
            Transaction.currency,
            Category.name_en,
            Category.name_ar,
            Category.color,
        )
    )

    rows = (await session.execute(stmt)).all()

    # Aggregate per-category across currencies via FX
    cat_data: dict[int | None, dict] = {}
    cat_amounts: dict[int | None, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for row in rows:
        cat_id = row.category_id
        cat_amounts[cat_id][row.currency] += int(row.total)
        if cat_id not in cat_data:
            cat_data[cat_id] = {
                "name_en": row.name_en or "Uncategorized",
                "name_ar": row.name_ar,
                "color": row.color,
            }

    # Convert each category's amounts to base currency
    cat_totals: list[tuple[int | None, int, dict]] = []
    for cat_id, amounts in cat_amounts.items():
        fx_result = await convert_to_base(session, dict(amounts), base_currency)
        cat_totals.append((cat_id, fx_result.total_base_minor, cat_data.get(cat_id, {})))

    # Sort descending by amount
    cat_totals.sort(key=lambda x: x[1], reverse=True)

    # Top 8 + Other
    top_8 = cat_totals[:8]
    rest = cat_totals[8:]

    grand_total = sum(t[1] for t in cat_totals) or 1  # avoid division by zero

    result: list[SpendingByCategory] = []
    for cat_id, amount, info in top_8:
        result.append(
            SpendingByCategory(
                category_id=cat_id,
                category_name=info.get("name_en", "Uncategorized"),
                category_name_ar=info.get("name_ar"),
                category_color=info.get("color"),
                amount_minor=amount,
                percentage=round(amount / grand_total * 100, 2),
                currency=base_currency,
            )
        )

    if rest:
        other_total = sum(t[1] for t in rest)
        result.append(
            SpendingByCategory(
                category_id=None,
                category_name="Other",
                category_name_ar="\u0623\u062e\u0631\u0649",
                category_color=None,
                amount_minor=other_total,
                percentage=round(other_total / grand_total * 100, 2),
                currency=base_currency,
            )
        )

    return result


async def get_net_worth_trend(
    session: AsyncSession,
    household_id: uuid.UUID,
    *,
    months: int = 6,
    base_currency: str = "EGP",
) -> list[NetWorthTrendPoint]:
    """Monthly net worth data points (accounts - debts) converted to base currency."""
    today = datetime.date.today()

    # Get all active accounts
    acc_stmt = select(Account).where(
        Account.household_id == household_id,
        Account.is_active.is_(True),
    )
    accounts = (await session.execute(acc_stmt)).scalars().all()

    # Get all active debts
    debt_stmt = select(Debt).where(
        Debt.household_id == household_id,
        Debt.is_active.is_(True),
    )
    debts = (await session.execute(debt_stmt)).scalars().all()

    # Pre-fetch all debt payments
    debt_ids = [d.id for d in debts]
    payments_by_debt: dict[int, list] = defaultdict(list)
    if debt_ids:
        pay_stmt = select(DebtPayment).where(DebtPayment.debt_id.in_(debt_ids))
        payments = (await session.execute(pay_stmt)).scalars().all()
        for p in payments:
            payments_by_debt[p.debt_id].append(p)

    # Pre-fetch FX rates once for all currencies used across accounts and debts
    all_currencies: set[str] = {acc.currency for acc in accounts} | {d.currency for d in debts}
    currencies_for_fx: set[str] = set()
    for c in all_currencies:
        if c != base_currency:
            if c != "USD":
                currencies_for_fx.add(c)
            if base_currency != "USD":
                currencies_for_fx.add(base_currency)
    prefetched_rates = (
        await get_latest_rates(session, currencies_for_fx) if currencies_for_fx else {}
    )

    result: list[NetWorthTrendPoint] = []

    for i in range(months):
        # Month end date: last day of each month from oldest to newest
        month_offset = months - 1 - i
        ref_date = today.replace(day=1) - relativedelta(months=month_offset)
        # Last day of that month
        if month_offset == 0:
            month_end = today
        else:
            month_end = (ref_date + relativedelta(months=1)) - datetime.timedelta(days=1)

        month_str = ref_date.strftime("%Y-%m")

        # Accounts component: uses current balance as a historical proxy.
        # NOTE: This produces a flat accounts line across months. True historical
        # balances would require back-calculating by reversing post-month transactions,
        # which is deferred to a future enhancement.
        account_balances: dict[str, int] = defaultdict(int)
        for acc in accounts:
            account_balances[acc.currency] += acc.balance_minor

        accounts_fx = await convert_to_base(
            session, dict(account_balances), base_currency, rates=prefetched_rates
        )

        # Debts component: remaining principal as of month_end
        debt_balances: dict[str, int] = defaultdict(int)
        for debt in debts:
            paid = sum(
                p.amount_minor for p in payments_by_debt.get(debt.id, []) if p.date <= month_end
            )
            remaining = max(0, debt.principal_minor - paid)
            debt_balances[debt.currency] += remaining

        debts_fx = await convert_to_base(
            session, dict(debt_balances), base_currency, rates=prefetched_rates
        )

        result.append(
            NetWorthTrendPoint(
                month=month_str,
                accounts_minor=accounts_fx.total_base_minor,
                debts_minor=debts_fx.total_base_minor,
                net_worth_minor=accounts_fx.total_base_minor - debts_fx.total_base_minor,
                currency=base_currency,
            )
        )

    return result


async def get_stat_cards(
    session: AsyncSession,
    household_id: uuid.UUID,
    *,
    base_currency: str = "EGP",
) -> StatCardsData:
    """Compute 4 stat cards with month-over-month trends."""
    today = datetime.date.today()
    current_month_start = today.replace(day=1)
    prev_month_end = current_month_start - datetime.timedelta(days=1)
    prev_month_start = prev_month_end.replace(day=1)

    # -- Net Worth --
    acc_stmt = (
        select(Account.currency, func.sum(Account.balance_minor).label("total"))
        .where(
            Account.household_id == household_id,
            Account.is_active.is_(True),
        )
        .group_by(Account.currency)
    )
    acc_rows = (await session.execute(acc_stmt)).all()
    acc_balances = {row.currency: int(row.total) for row in acc_rows}
    acc_fx = await convert_to_base(session, acc_balances, base_currency)

    # Debts remaining
    debt_stmt = select(Debt).where(
        Debt.household_id == household_id,
        Debt.is_active.is_(True),
        Debt.status == "active",
    )
    active_debts = (await session.execute(debt_stmt)).scalars().all()

    debt_balances: dict[str, int] = defaultdict(int)
    debt_ids = [d.id for d in active_debts]
    payments_by_debt: dict[int, int] = {}
    if debt_ids:
        pay_stmt = (
            select(DebtPayment.debt_id, func.sum(DebtPayment.amount_minor).label("paid"))
            .where(DebtPayment.debt_id.in_(debt_ids))
            .group_by(DebtPayment.debt_id)
        )
        pay_rows = (await session.execute(pay_stmt)).all()
        payments_by_debt = {row.debt_id: int(row.paid) for row in pay_rows}

    for debt in active_debts:
        paid = payments_by_debt.get(debt.id, 0)
        remaining = max(0, debt.principal_minor - paid)
        debt_balances[debt.currency] += remaining

    debts_fx = await convert_to_base(session, dict(debt_balances), base_currency)

    current_net_worth = acc_fx.total_base_minor - debts_fx.total_base_minor

    # Previous month net worth estimate: subtract current month transactions from balances
    prev_txn_stmt = (
        select(Transaction.currency, func.sum(Transaction.amount_minor).label("net"))
        .where(
            Transaction.household_id == household_id,
            Transaction.is_active.is_(True),
            Transaction.date >= current_month_start,
        )
        .group_by(Transaction.currency)
    )
    prev_txn_rows = (await session.execute(prev_txn_stmt)).all()
    prev_acc_balances = dict(acc_balances)
    for row in prev_txn_rows:
        prev_acc_balances[row.currency] = prev_acc_balances.get(row.currency, 0) - int(row.net)
    prev_acc_fx = await convert_to_base(session, prev_acc_balances, base_currency)
    prev_net_worth = prev_acc_fx.total_base_minor - debts_fx.total_base_minor

    nw_trend = _compute_trend(current_net_worth, prev_net_worth)

    # -- Spending This Month --
    spending_stmt = (
        select(Transaction.currency, func.sum(func.abs(Transaction.amount_minor)).label("total"))
        .where(
            Transaction.household_id == household_id,
            Transaction.is_active.is_(True),
            Transaction.transfer_id.is_(None),
            Transaction.amount_minor < 0,
            Transaction.date >= current_month_start,
        )
        .group_by(Transaction.currency)
    )
    spending_rows = (await session.execute(spending_stmt)).all()
    spending_amounts = {row.currency: int(row.total) for row in spending_rows}
    spending_fx = await convert_to_base(session, spending_amounts, base_currency)

    # Previous month spending
    prev_spending_stmt = (
        select(Transaction.currency, func.sum(func.abs(Transaction.amount_minor)).label("total"))
        .where(
            Transaction.household_id == household_id,
            Transaction.is_active.is_(True),
            Transaction.transfer_id.is_(None),
            Transaction.amount_minor < 0,
            Transaction.date >= prev_month_start,
            Transaction.date <= prev_month_end,
        )
        .group_by(Transaction.currency)
    )
    prev_spending_rows = (await session.execute(prev_spending_stmt)).all()
    prev_spending_amounts = {row.currency: int(row.total) for row in prev_spending_rows}
    prev_spending_fx = await convert_to_base(session, prev_spending_amounts, base_currency)

    spending_trend = _compute_trend(spending_fx.total_base_minor, prev_spending_fx.total_base_minor)

    # -- Active Debts --
    debt_count = len(active_debts)
    debt_remaining_total = debts_fx.total_base_minor
    # Simple trend: same as current (no historical debt count change tracked)
    debt_trend = _compute_trend(debt_remaining_total, debt_remaining_total)

    # -- Upcoming Payments (next 30 days) --
    upcoming_total: dict[str, int] = defaultdict(int)
    upcoming_count = 0
    cutoff = today + datetime.timedelta(days=30)

    for debt in active_debts:
        if debt.payment_day_of_month is not None:
            # Compute next payment date
            try:
                next_pay = today.replace(day=debt.payment_day_of_month)
            except ValueError:
                # Day doesn't exist in this month (e.g., 31 in a 30-day month)
                next_pay = (today.replace(day=1) + relativedelta(months=1)) - datetime.timedelta(
                    days=1
                )
            if next_pay < today:
                next_pay = next_pay + relativedelta(months=1)
            if next_pay <= cutoff:
                upcoming_total[debt.currency] += debt.monthly_payment_minor
                upcoming_count += 1

    # Also check installment plans
    inst_stmt = select(InstallmentPlan).where(
        InstallmentPlan.household_id == household_id,
        InstallmentPlan.is_active.is_(True),
        InstallmentPlan.status == "active",
    )
    installments = (await session.execute(inst_stmt)).scalars().all()
    for inst in installments:
        if inst.payment_day_of_month is not None:
            try:
                next_pay = today.replace(day=inst.payment_day_of_month)
            except ValueError:
                next_pay = (today.replace(day=1) + relativedelta(months=1)) - datetime.timedelta(
                    days=1
                )
            if next_pay < today:
                next_pay = next_pay + relativedelta(months=1)
            if next_pay <= cutoff:
                upcoming_total[inst.currency] += inst.monthly_amount_minor
                upcoming_count += 1

    # Check P2P splits — join Debt to scope to this household (prevents cross-tenant leak)
    p2p_stmt = (
        select(P2PDebtSplit, Debt.currency)
        .join(Debt, P2PDebtSplit.debt_id == Debt.id)
        .where(
            Debt.household_id == household_id,
            P2PDebtSplit.paid.is_(False),
            P2PDebtSplit.due_date <= cutoff,
            P2PDebtSplit.due_date >= today,
        )
    )
    p2p_rows = (await session.execute(p2p_stmt)).all()
    for row in p2p_rows:
        upcoming_total[row.currency] += row.P2PDebtSplit.amount_minor
        upcoming_count += 1

    upcoming_fx = await convert_to_base(session, dict(upcoming_total), base_currency)

    return StatCardsData(
        net_worth=StatCardItem(
            label="Net Worth",
            value_minor=current_net_worth,
            currency=base_currency,
            trend=nw_trend,
        ),
        spending=StatCardItem(
            label="Spending This Month",
            value_minor=spending_fx.total_base_minor,
            currency=base_currency,
            trend=spending_trend,
        ),
        active_debts=StatCardItem(
            label="Active Debts",
            value_minor=debt_remaining_total,
            currency=base_currency,
            trend=debt_trend,
            count=debt_count,
        ),
        upcoming_payments=StatCardItem(
            label="Upcoming Payments",
            value_minor=upcoming_fx.total_base_minor,
            currency=base_currency,
            count=upcoming_count,
        ),
    )
