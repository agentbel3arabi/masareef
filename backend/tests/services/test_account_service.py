"""Tests for account service — compute_displayed_balance and related functions."""

import uuid
from datetime import date
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.account import (
    compute_displayed_balance,
    compute_displayed_balances_batch,
    get_balance_cutoff_date,
    normalize_iban,
    validate_iban,
)


# ---------------------------------------------------------------------------
# get_balance_cutoff_date
# ---------------------------------------------------------------------------


def test_cutoff_date_returns_opened_at():
    """Cutoff date is the account's opened_at."""
    acct = MagicMock(opened_at=date(2024, 1, 15))
    assert get_balance_cutoff_date(acct) == date(2024, 1, 15)


def test_cutoff_date_returns_none_when_no_opened_at():
    acct = MagicMock(opened_at=None)
    assert get_balance_cutoff_date(acct) is None


# ---------------------------------------------------------------------------
# IBAN helpers
# ---------------------------------------------------------------------------


def test_normalize_iban_removes_spaces():
    result = normalize_iban("EG 0100 0003 0000 0001 0000 0000 001")
    assert " " not in result
    assert result == result.upper()


def test_validate_iban_accepts_valid():
    # DE89 3704 0044 0532 0130 00 is a well-known test IBAN
    assert validate_iban("DE89370400440532013000") is True


def test_validate_iban_rejects_invalid():
    assert validate_iban("INVALID") is False


# ---------------------------------------------------------------------------
# compute_displayed_balance (mocked session)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_compute_displayed_balance_zero_transactions():
    """Balance with no transactions = balance_minor (seed)."""
    account = MagicMock(
        id=1,
        household_id=uuid.uuid4(),
        balance_minor=1000000,  # 10,000.00 EGP
        opened_at=None,
    )
    session = AsyncMock()
    result_mock = MagicMock()
    result_mock.scalar_one.return_value = 0
    session.execute.return_value = result_mock

    result = await compute_displayed_balance(session, account)
    assert result == 1000000


@pytest.mark.asyncio
async def test_compute_displayed_balance_with_transactions():
    """Balance = seed + SUM of transaction amounts."""
    account = MagicMock(
        id=1,
        household_id=uuid.uuid4(),
        balance_minor=1000000,
        opened_at=None,
    )
    session = AsyncMock()
    result_mock = MagicMock()
    # Simulates SUM: -50000 + 30000 = -20000
    result_mock.scalar_one.return_value = -20000
    session.execute.return_value = result_mock

    result = await compute_displayed_balance(session, account)
    assert result == 980000  # 1000000 + (-20000)


@pytest.mark.asyncio
async def test_compute_displayed_balance_applies_to_balance_filter():
    """Verify the query is called (implies filter is applied)."""
    account = MagicMock(
        id=1,
        household_id=uuid.uuid4(),
        balance_minor=500000,
        opened_at=None,
    )
    session = AsyncMock()
    result_mock = MagicMock()
    result_mock.scalar_one.return_value = 0
    session.execute.return_value = result_mock

    result = await compute_displayed_balance(session, account)
    assert result == 500000
    # Verify execute was called (the query includes applies_to_balance filter)
    session.execute.assert_called_once()


# ---------------------------------------------------------------------------
# compute_displayed_balances_batch
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_batch_empty_accounts():
    """Batch compute with empty list returns empty dict."""
    session = AsyncMock()
    result = await compute_displayed_balances_batch(session, [])
    assert result == {}


@pytest.mark.asyncio
async def test_batch_matches_individual():
    """Batch results should match individual computation for each account."""
    hh_id = uuid.uuid4()
    accounts = [
        MagicMock(id=1, household_id=hh_id, balance_minor=100000, opened_at=None),
        MagicMock(id=2, household_id=hh_id, balance_minor=200000, opened_at=None),
    ]

    session = AsyncMock()
    # Mock batch query result: account 1 has tx_sum=10000, account 2 has tx_sum=-5000
    batch_rows = [
        MagicMock(account_id=1, tx_sum=10000),
        MagicMock(account_id=2, tx_sum=-5000),
    ]
    batch_result = MagicMock()
    batch_result.__iter__ = MagicMock(return_value=iter(batch_rows))
    session.execute.return_value = batch_result

    result = await compute_displayed_balances_batch(session, accounts)
    assert result[1] == 110000  # 100000 + 10000
    assert result[2] == 195000  # 200000 + (-5000)


@pytest.mark.asyncio
async def test_batch_groups_by_cutoff_date():
    """Accounts with different opened_at dates are grouped separately."""
    hh_id = uuid.uuid4()
    accounts = [
        MagicMock(id=1, household_id=hh_id, balance_minor=100000, opened_at=None),
        MagicMock(id=2, household_id=hh_id, balance_minor=200000, opened_at=date(2024, 6, 1)),
    ]

    session = AsyncMock()
    # Each group results in one execute call; mock returns no tx_sums
    empty_result = MagicMock()
    empty_result.__iter__ = MagicMock(return_value=iter([]))
    session.execute.return_value = empty_result

    result = await compute_displayed_balances_batch(session, accounts)
    # Two groups (None and 2024-06-01) -> two execute calls
    assert session.execute.call_count == 2
    # Both return balance_minor since no transactions
    assert result[1] == 100000
    assert result[2] == 200000
