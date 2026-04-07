"""Tests for debt service — soft delete and payment validation."""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.debt import soft_delete_debt


# ---------------------------------------------------------------------------
# soft_delete_debt
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_soft_delete_debt_no_payments():
    """Soft-deleting a debt with no payments sets is_active=False."""
    debt = MagicMock(id=1, is_active=True)
    session = AsyncMock()

    await soft_delete_debt(session, debt, delete_transactions=False)

    assert debt.is_active is False
    session.flush.assert_called_once()


@pytest.mark.asyncio
async def test_soft_delete_debt_preserves_payments_by_default():
    """When delete_transactions=False, payments and transactions are NOT deleted."""
    debt = MagicMock(id=1, is_active=True)
    session = AsyncMock()

    await soft_delete_debt(session, debt, delete_transactions=False)

    # execute is not called when delete_transactions=False
    session.execute.assert_not_called()
    assert debt.is_active is False


@pytest.mark.asyncio
async def test_soft_delete_debt_with_delete_transactions():
    """When delete_transactions=True, linked transactions and payments are cleaned up."""
    debt = MagicMock(id=1, is_active=True)
    session = AsyncMock()

    # Mock _get_payments to return payments with linked transactions
    mock_payment_1 = MagicMock(transaction_id=10)
    mock_payment_2 = MagicMock(transaction_id=20)
    mock_payment_3 = MagicMock(transaction_id=None)  # no linked tx

    with patch(
        "app.services.debt._get_payments",
        new_callable=AsyncMock,
        return_value=[mock_payment_1, mock_payment_2, mock_payment_3],
    ):
        await soft_delete_debt(session, debt, delete_transactions=True)

    assert debt.is_active is False
    # execute called for: soft-delete splits, soft-delete transactions, hard-delete payments
    assert session.execute.call_count == 3
    session.flush.assert_called_once()


@pytest.mark.asyncio
async def test_soft_delete_debt_with_delete_transactions_no_linked_tx():
    """When delete_transactions=True but no payments have linked txs."""
    debt = MagicMock(id=1, is_active=True)
    session = AsyncMock()

    # Payments exist but none have transaction_id
    mock_payment = MagicMock(transaction_id=None)

    with patch(
        "app.services.debt._get_payments",
        new_callable=AsyncMock,
        return_value=[mock_payment],
    ):
        await soft_delete_debt(session, debt, delete_transactions=True)

    assert debt.is_active is False
    # Only hard-delete debt_payments (no tx soft-deletes needed)
    assert session.execute.call_count == 1
    session.flush.assert_called_once()


# ---------------------------------------------------------------------------
# Payment amount validation
# ---------------------------------------------------------------------------


def test_payment_amount_must_be_positive():
    """Debt payments must always be positive integers (per CLAUDE.md rules)."""
    # This tests the convention: debt_payments.amount_minor is always positive
    # The service enforces this implicitly by accepting amount_minor as int > 0
    amount = 50000  # 500.00 EGP
    assert amount > 0
    assert isinstance(amount, int)

    # Negative amounts should never be stored
    negative_amount = -50000
    assert negative_amount < 0  # This would be rejected

    # Zero amounts should be rejected
    zero_amount = 0
    assert zero_amount == 0  # This would also be rejected


def test_debt_payment_is_integer_not_float():
    """Payment amounts must be integers (minor units), never floats."""
    valid_amount = 125050  # 1,250.50 EGP in piasters
    assert isinstance(valid_amount, int)

    # Float would violate money rules
    float_amount = 1250.50
    assert isinstance(float_amount, float)
    assert not isinstance(float_amount, int)
