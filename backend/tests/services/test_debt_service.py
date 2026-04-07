"""Tests for debt service — soft delete and payment validation."""

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
    """PaymentCreate schema rejects negative and zero amounts."""
    from pydantic import ValidationError

    from app.schemas.debt import PaymentCreate

    # Negative amount must be rejected
    with pytest.raises(ValidationError):
        PaymentCreate(date="2024-01-01", amount_minor=-50000, account_id=1)

    # Zero amount must be rejected
    with pytest.raises(ValidationError):
        PaymentCreate(date="2024-01-01", amount_minor=0, account_id=1)

    # Positive amount must be accepted
    valid = PaymentCreate(date="2024-01-01", amount_minor=50000, account_id=1)
    assert valid.amount_minor == 50000


def test_debt_payment_is_integer_not_float():
    """PaymentCreate schema rejects float amounts."""
    from pydantic import ValidationError

    from app.schemas.debt import PaymentCreate

    # Float that is not a whole number should be rejected by gt=0 int field
    with pytest.raises(ValidationError):
        PaymentCreate(date="2024-01-01", amount_minor=1250.50, account_id=1)  # type: ignore[arg-type]

    # Valid integer amount works
    valid = PaymentCreate(date="2024-01-01", amount_minor=125050, account_id=1)
    assert isinstance(valid.amount_minor, int)
