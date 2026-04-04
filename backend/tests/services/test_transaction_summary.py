"""Tests for the transaction summary service."""

import datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction
from app.services.transaction_summary import get_transaction_summary
from tests.conftest import TEST_HOUSEHOLD_ID


async def _seed_account(session: AsyncSession) -> int:
    """Create a test account and return its id."""
    acct = Account(
        household_id=TEST_HOUSEHOLD_ID,
        name="Test",
        type="bank_account",
        currency="EGP",
        balance_minor=1000000,
    )
    session.add(acct)
    await session.flush()
    return acct.id


async def _seed_tx(
    session: AsyncSession,
    account_id: int,
    amount_minor: int,
    date: datetime.date,
    *,
    tx_type: str = "debit",
    is_active: bool = True,
    currency: str = "EGP",
    category_id: int | None = None,
) -> Transaction:
    """Create a transaction directly via ORM."""
    tx = Transaction(
        household_id=TEST_HOUSEHOLD_ID,
        account_id=account_id,
        date=date,
        description="Test",
        amount_minor=amount_minor,
        currency=currency,
        type=tx_type,
        is_active=is_active,
        category_id=category_id,
    )
    session.add(tx)
    await session.flush()
    return tx


@pytest.mark.asyncio
async def test_basic_summary_income_and_expenses(db_session: AsyncSession):
    """Sum positive amounts as income, absolute negative amounts as expenses."""
    acct_id = await _seed_account(db_session)
    # Income: +200000 (2000.00 EGP)
    await _seed_tx(db_session, acct_id, 200000, datetime.date(2026, 4, 3), tx_type="credit")
    # Expense: -50000 (-500.00 EGP)
    await _seed_tx(db_session, acct_id, -50000, datetime.date(2026, 4, 5), tx_type="debit")
    # Expense: -30000 (-300.00 EGP)
    await _seed_tx(db_session, acct_id, -30000, datetime.date(2026, 4, 10), tx_type="debit")
    await db_session.commit()

    result = await get_transaction_summary(
        db_session,
        TEST_HOUSEHOLD_ID,
        period="custom",
        start_date=datetime.date(2026, 4, 1),
        end_date=datetime.date(2026, 4, 30),
    )

    assert result.total_income == 200000
    assert result.total_expenses == 80000  # abs(-50000) + abs(-30000)
    assert result.net_flow == 200000 - 80000
    assert result.transaction_count == 3
    assert result.currency == "EGP"


@pytest.mark.asyncio
async def test_account_filter(db_session: AsyncSession):
    """Filtering by account_id should only include that account's transactions."""
    acct1 = await _seed_account(db_session)
    acct2_obj = Account(
        household_id=TEST_HOUSEHOLD_ID,
        name="Other",
        type="bank_account",
        currency="EGP",
        balance_minor=0,
    )
    db_session.add(acct2_obj)
    await db_session.flush()
    acct2 = acct2_obj.id

    await _seed_tx(db_session, acct1, -50000, datetime.date(2026, 4, 5), tx_type="debit")
    await _seed_tx(db_session, acct2, -70000, datetime.date(2026, 4, 5), tx_type="debit")
    await db_session.commit()

    result = await get_transaction_summary(
        db_session,
        TEST_HOUSEHOLD_ID,
        period="custom",
        start_date=datetime.date(2026, 4, 1),
        end_date=datetime.date(2026, 4, 30),
        account_id=acct1,
    )

    assert result.total_expenses == 50000
    assert result.transaction_count == 1


@pytest.mark.asyncio
async def test_empty_result(db_session: AsyncSession):
    """No transactions in range returns zeroes."""
    result = await get_transaction_summary(
        db_session,
        TEST_HOUSEHOLD_ID,
        period="custom",
        start_date=datetime.date(2026, 4, 1),
        end_date=datetime.date(2026, 4, 30),
    )

    assert result.total_income == 0
    assert result.total_expenses == 0
    assert result.net_flow == 0
    assert result.transaction_count == 0


@pytest.mark.asyncio
async def test_excludes_soft_deleted(db_session: AsyncSession):
    """Soft-deleted transactions must be excluded."""
    acct_id = await _seed_account(db_session)
    await _seed_tx(db_session, acct_id, -50000, datetime.date(2026, 4, 5), tx_type="debit")
    await _seed_tx(
        db_session,
        acct_id,
        -30000,
        datetime.date(2026, 4, 6),
        tx_type="debit",
        is_active=False,
    )
    await db_session.commit()

    result = await get_transaction_summary(
        db_session,
        TEST_HOUSEHOLD_ID,
        period="custom",
        start_date=datetime.date(2026, 4, 1),
        end_date=datetime.date(2026, 4, 30),
    )

    assert result.total_expenses == 50000
    assert result.transaction_count == 1


@pytest.mark.asyncio
async def test_currency_filter(db_session: AsyncSession):
    """Currency filter should only include transactions in the requested currency."""
    acct_id = await _seed_account(db_session)
    await _seed_tx(
        db_session, acct_id, 200000, datetime.date(2026, 4, 3), tx_type="credit", currency="EGP"
    )
    await _seed_tx(
        db_session, acct_id, 100000, datetime.date(2026, 4, 5), tx_type="credit", currency="USD"
    )
    await db_session.commit()

    result_egp = await get_transaction_summary(
        db_session,
        TEST_HOUSEHOLD_ID,
        period="custom",
        start_date=datetime.date(2026, 4, 1),
        end_date=datetime.date(2026, 4, 30),
        currency="EGP",
    )
    assert result_egp.total_income == 200000
    assert result_egp.transaction_count == 1
    assert result_egp.currency == "EGP"

    result_usd = await get_transaction_summary(
        db_session,
        TEST_HOUSEHOLD_ID,
        period="custom",
        start_date=datetime.date(2026, 4, 1),
        end_date=datetime.date(2026, 4, 30),
        currency="USD",
    )
    assert result_usd.total_income == 100000
    assert result_usd.transaction_count == 1
    assert result_usd.currency == "USD"


@pytest.mark.asyncio
async def test_category_filter(db_session: AsyncSession):
    """Filtering by category_id should only include that category's transactions."""
    acct_id = await _seed_account(db_session)

    cat1 = Category(
        household_id=TEST_HOUSEHOLD_ID,
        name_en="Food",
        type="expense",
        icon="utensils",
    )
    cat2 = Category(
        household_id=TEST_HOUSEHOLD_ID,
        name_en="Transport",
        type="expense",
        icon="car",
    )
    db_session.add_all([cat1, cat2])
    await db_session.flush()

    await _seed_tx(
        db_session,
        acct_id,
        -50000,
        datetime.date(2026, 4, 5),
        tx_type="debit",
        category_id=cat1.id,
    )
    await _seed_tx(
        db_session,
        acct_id,
        -30000,
        datetime.date(2026, 4, 6),
        tx_type="debit",
        category_id=cat1.id,
    )
    await _seed_tx(
        db_session,
        acct_id,
        -20000,
        datetime.date(2026, 4, 7),
        tx_type="debit",
        category_id=cat2.id,
    )
    await db_session.commit()

    result = await get_transaction_summary(
        db_session,
        TEST_HOUSEHOLD_ID,
        period="custom",
        start_date=datetime.date(2026, 4, 1),
        end_date=datetime.date(2026, 4, 30),
        category_id=cat1.id,
    )

    assert result.total_expenses == 80000  # 50000 + 30000
    assert result.transaction_count == 2
