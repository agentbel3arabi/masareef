import pytest
from pydantic import ValidationError

from app.schemas.account import AccountCreate, AccountResponse


def test_account_create_minimal():
    data = AccountCreate(
        name="CIB Savings",
        type="bank_account",
        currency="EGP",
    )
    assert data.name == "CIB Savings"
    assert data.initial_balance == 0


def test_account_create_with_credit_card_fields():
    data = AccountCreate(
        name="HSBC CC",
        type="credit_card",
        currency="EGP",
        initial_balance=-450000,
        credit_limit=10000000,
        billing_cycle_day=15,
    )
    assert data.credit_limit == 10000000
    assert data.billing_cycle_day == 15


def test_account_create_rejects_float_balance():
    with pytest.raises(ValidationError):
        AccountCreate(
            name="Test",
            type="bank_account",
            currency="EGP",
            initial_balance=1250.50,  # type: ignore[arg-type]
        )


def test_account_response_has_displayed_balance():
    resp = AccountResponse(
        id=1,
        name="CIB Savings",
        type="bank_account",
        currency="EGP",
        balance_minor=1500000,
        displayed_balance_minor=2350000,
        is_active=True,
    )
    assert resp.displayed_balance_minor == 2350000
