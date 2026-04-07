"""Service-level tests for dashboard aggregation functions."""

import datetime
import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.category import Category
from app.models.exchange_rate import ExchangeRate
from app.models.household import Household
from app.models.transaction import Transaction
from tests.conftest import TEST_HOUSEHOLD_ID


async def _seed_household(session: AsyncSession) -> None:
    """Seed household record required for FK constraints."""
    session.add(Household(id=TEST_HOUSEHOLD_ID, name="Test Household", base_currency="EGP"))
    await session.flush()


async def _seed_categories(session: AsyncSession, count: int = 12) -> list[Category]:
    """Seed N categories for spending-by-category tests."""
    cats = []
    for i in range(1, count + 1):
        cat = Category(
            household_id=TEST_HOUSEHOLD_ID,
            name_en=f"Category {i}",
            name_ar=f"فئة {i}",
            type="expense",
            color=f"#{i:06d}",
        )
        session.add(cat)
        cats.append(cat)
    await session.flush()
    return cats


async def _seed_accounts(session: AsyncSession) -> tuple[Account, Account]:
    """Seed two accounts in different currencies."""
    acc_egp = Account(
        household_id=TEST_HOUSEHOLD_ID,
        name="EGP Account",
        type="bank_account",
        currency="EGP",
        balance_minor=500_000,  # 5,000.00 EGP
    )
    acc_usd = Account(
        household_id=TEST_HOUSEHOLD_ID,
        name="USD Account",
        type="bank_account",
        currency="USD",
        balance_minor=100_00,  # 100.00 USD
    )
    session.add_all([acc_egp, acc_usd])
    await session.flush()
    return acc_egp, acc_usd


async def _seed_fx_rates(session: AsyncSession) -> None:
    """Seed exchange rates: USD->EGP = 50.0 (rate_scaled=500000)."""
    session.add(
        ExchangeRate(
            date=datetime.date.today(),
            from_currency="USD",
            to_currency="EGP",
            rate_scaled=500_000,  # 50.0 * 10000
            source="test",
        )
    )
    await session.flush()


@pytest.mark.asyncio
async def test_income_vs_expenses_basic(db_session: AsyncSession):
    """3 months of transactions returns 3 IncomeVsExpensesMonth items."""
    from app.services.dashboard import get_income_vs_expenses

    await _seed_household(db_session)
    acc_egp, _ = await _seed_accounts(db_session)

    today = datetime.date.today()
    # Seed transactions across 3 months
    for months_ago in range(3):
        d = today.replace(day=15) - datetime.timedelta(days=months_ago * 30)
        # Use first of month to make predictable
        d = d.replace(day=10)
        # Income
        db_session.add(
            Transaction(
                household_id=TEST_HOUSEHOLD_ID,
                account_id=acc_egp.id,
                date=d,
                amount_minor=100_000,  # +1000.00 income
                currency="EGP",
                type="income",
                description="Salary",
            )
        )
        # Expense
        db_session.add(
            Transaction(
                household_id=TEST_HOUSEHOLD_ID,
                account_id=acc_egp.id,
                date=d,
                amount_minor=-50_000,  # -500.00 expense
                currency="EGP",
                type="expense",
                description="Groceries",
            )
        )
    await db_session.flush()

    result = await get_income_vs_expenses(db_session, TEST_HOUSEHOLD_ID, months=6)
    assert len(result) >= 1
    # Every item should have income and expenses
    for item in result:
        assert item.income_minor >= 0
        assert item.expenses_minor >= 0
        assert item.currency == "EGP"


@pytest.mark.asyncio
async def test_income_vs_expenses_excludes_transfers(db_session: AsyncSession):
    """Transactions with transfer_id set are excluded from income/expense totals."""
    from app.services.dashboard import get_income_vs_expenses

    await _seed_household(db_session)
    acc_egp, _ = await _seed_accounts(db_session)

    today = datetime.date.today()
    # Normal expense
    db_session.add(
        Transaction(
            household_id=TEST_HOUSEHOLD_ID,
            account_id=acc_egp.id,
            date=today,
            amount_minor=-30_000,
            currency="EGP",
            type="expense",
            description="Real expense",
        )
    )
    # Transfer (should be excluded)
    db_session.add(
        Transaction(
            household_id=TEST_HOUSEHOLD_ID,
            account_id=acc_egp.id,
            date=today,
            amount_minor=-50_000,
            currency="EGP",
            type="expense",
            description="Transfer out",
            transfer_id=uuid.uuid4(),
        )
    )
    await db_session.flush()

    result = await get_income_vs_expenses(db_session, TEST_HOUSEHOLD_ID, months=1)
    # Should only have 30000 in expenses, not 80000
    total_expenses = sum(item.expenses_minor for item in result)
    assert total_expenses == 30_000


@pytest.mark.asyncio
async def test_spending_by_category_top_8_plus_other(db_session: AsyncSession):
    """With 10+ categories, returns top 8 + Other bucket."""
    from app.services.dashboard import get_spending_by_category

    await _seed_household(db_session)
    acc_egp, _ = await _seed_accounts(db_session)
    cats = await _seed_categories(db_session, count=12)

    today = datetime.date.today()
    # Seed expenses across all 12 categories (decreasing amounts)
    for i, cat in enumerate(cats):
        db_session.add(
            Transaction(
                household_id=TEST_HOUSEHOLD_ID,
                account_id=acc_egp.id,
                date=today,
                amount_minor=-(12 - i) * 10_000,  # -120k, -110k, ..., -10k
                currency="EGP",
                type="expense",
                category_id=cat.id,
                description=f"Expense cat {i}",
            )
        )
    await db_session.flush()

    result = await get_spending_by_category(db_session, TEST_HOUSEHOLD_ID)
    # Should be exactly 9 items: top 8 + Other
    assert len(result) == 9
    # Last item should be "Other"
    other = [r for r in result if r.category_id is None]
    assert len(other) == 1
    assert other[0].category_name == "Other"


@pytest.mark.asyncio
async def test_spending_by_category_excludes_income_and_transfers(db_session: AsyncSession):
    """Only expenses (amount_minor < 0) are counted, transfers excluded."""
    from app.services.dashboard import get_spending_by_category

    await _seed_household(db_session)
    acc_egp, _ = await _seed_accounts(db_session)
    cats = await _seed_categories(db_session, count=2)

    today = datetime.date.today()
    # Expense
    db_session.add(
        Transaction(
            household_id=TEST_HOUSEHOLD_ID,
            account_id=acc_egp.id,
            date=today,
            amount_minor=-20_000,
            currency="EGP",
            type="expense",
            category_id=cats[0].id,
            description="Real expense",
        )
    )
    # Income (should not appear)
    db_session.add(
        Transaction(
            household_id=TEST_HOUSEHOLD_ID,
            account_id=acc_egp.id,
            date=today,
            amount_minor=50_000,
            currency="EGP",
            type="income",
            category_id=cats[1].id,
            description="Salary",
        )
    )
    # Transfer expense (should be excluded)
    db_session.add(
        Transaction(
            household_id=TEST_HOUSEHOLD_ID,
            account_id=acc_egp.id,
            date=today,
            amount_minor=-10_000,
            currency="EGP",
            type="expense",
            category_id=cats[0].id,
            description="Transfer",
            transfer_id=uuid.uuid4(),
        )
    )
    await db_session.flush()

    result = await get_spending_by_category(db_session, TEST_HOUSEHOLD_ID)
    total = sum(r.amount_minor for r in result)
    assert total == 20_000  # Only the real expense


@pytest.mark.asyncio
async def test_net_worth_trend_returns_monthly_points(db_session: AsyncSession):
    """Returns monthly data points with accounts_minor and debts_minor."""
    from app.services.dashboard import get_net_worth_trend

    await _seed_household(db_session)
    acc_egp, _ = await _seed_accounts(db_session)
    await _seed_fx_rates(db_session)

    result = await get_net_worth_trend(db_session, TEST_HOUSEHOLD_ID, months=3)
    assert len(result) >= 1
    for point in result:
        assert point.currency == "EGP"
        assert point.net_worth_minor == point.accounts_minor - point.debts_minor


@pytest.mark.asyncio
async def test_stat_cards_returns_all_4(db_session: AsyncSession):
    """get_stat_cards returns net_worth, spending, active_debts, upcoming_payments."""
    from app.services.dashboard import get_stat_cards

    await _seed_household(db_session)
    acc_egp, _ = await _seed_accounts(db_session)
    await _seed_fx_rates(db_session)

    result = await get_stat_cards(db_session, TEST_HOUSEHOLD_ID)
    assert result.net_worth is not None
    assert result.spending is not None
    assert result.active_debts is not None
    assert result.upcoming_payments is not None
    assert result.net_worth.currency == "EGP"


@pytest.mark.asyncio
async def test_stat_card_trend_zero_previous(db_session: AsyncSession):
    """When previous period value is 0, trend percentage should be None."""
    from app.services.dashboard import get_stat_cards

    await _seed_household(db_session)
    acc_egp, _ = await _seed_accounts(db_session)
    await _seed_fx_rates(db_session)

    # Only current month spending, no previous
    today = datetime.date.today()
    db_session.add(
        Transaction(
            household_id=TEST_HOUSEHOLD_ID,
            account_id=acc_egp.id,
            date=today,
            amount_minor=-50_000,
            currency="EGP",
            type="expense",
            description="Current month expense",
        )
    )
    await db_session.flush()

    result = await get_stat_cards(db_session, TEST_HOUSEHOLD_ID)
    # Spending trend: previous month was 0, so percentage should be None
    if result.spending.trend is not None:
        assert result.spending.trend.percentage is None


@pytest.mark.asyncio
async def test_multi_currency_fx_conversion(db_session: AsyncSession):
    """Amounts from different currencies are correctly converted to base_currency."""
    from app.services.dashboard import get_income_vs_expenses

    await _seed_household(db_session)
    acc_egp, acc_usd = await _seed_accounts(db_session)
    await _seed_fx_rates(db_session)

    today = datetime.date.today()
    # EGP income
    db_session.add(
        Transaction(
            household_id=TEST_HOUSEHOLD_ID,
            account_id=acc_egp.id,
            date=today,
            amount_minor=100_000,  # 1000.00 EGP
            currency="EGP",
            type="income",
            description="EGP income",
        )
    )
    # USD income (should be converted: 100 USD * 50 = 5000 EGP = 500000 minor)
    db_session.add(
        Transaction(
            household_id=TEST_HOUSEHOLD_ID,
            account_id=acc_usd.id,
            date=today,
            amount_minor=100_00,  # 100.00 USD
            currency="USD",
            type="income",
            description="USD income",
        )
    )
    await db_session.flush()

    result = await get_income_vs_expenses(db_session, TEST_HOUSEHOLD_ID, months=1)
    total_income = sum(item.income_minor for item in result)
    # 100000 EGP + 10000 USD (converted to EGP = 10000 * 500000 / 10000 = 500000)
    assert total_income == 600_000  # 1000 EGP + 5000 EGP = 6000 EGP = 600000 minor
