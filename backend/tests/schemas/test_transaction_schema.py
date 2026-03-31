from datetime import date

import pytest
from pydantic import ValidationError

from app.schemas.category import CategoryCreate
from app.schemas.transaction import SplitItem, TransactionCreate
from app.schemas.transfer import TransferCreate


def test_transaction_create_requires_amount_minor_integer():
    data = TransactionCreate(
        account_id=1,
        date=date(2026, 3, 20),
        description="Test transaction",
        amount_minor=125000,
        type="debit",
    )
    assert data.amount_minor == 125000


def test_transaction_create_rejects_float_amount():
    with pytest.raises(ValidationError):
        TransactionCreate(
            account_id=1,
            date=date(2026, 3, 20),
            amount_minor=1250.50,  # type: ignore[arg-type]
            type="debit",
        )


def test_split_item_amount_must_be_positive():
    split = SplitItem(category_id=2, amount_minor=80000)
    assert split.amount_minor == 80000


def test_transfer_create_requires_two_accounts():
    data = TransferCreate(
        from_account_id=1,
        to_account_id=3,
        amount_minor=500000,
        date=date(2026, 3, 20),
    )
    assert data.from_account_id != data.to_account_id


def test_category_create_requires_name_en():
    data = CategoryCreate(
        name_en="Kids School",
        type="expense",
    )
    assert data.name_en == "Kids School"
