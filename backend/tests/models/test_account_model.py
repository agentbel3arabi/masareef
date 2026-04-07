"""Additional account model validation tests."""

from sqlalchemy import inspect

from app.models.account import Account
from app.models.enums import AccountType


def test_account_type_enum_values():
    """Account type enum contains all expected values."""
    expected = {
        "bank_account",
        "credit_card",
        "cash_wallet",
        "digital_wallet",
        "financing_app",
    }
    actual = {t.value for t in AccountType}
    assert expected.issubset(actual)


def test_account_name_is_not_nullable():
    """Account name column is required (NOT NULL)."""
    col = Account.__table__.c.name
    assert col.nullable is False


def test_account_currency_is_not_nullable():
    """Account currency column is required (NOT NULL)."""
    col = Account.__table__.c.currency
    assert col.nullable is False


def test_account_currency_max_length_is_3():
    """Currency code is stored as String(3) — ISO 4217."""
    col = Account.__table__.c.currency
    assert col.type.length == 3


def test_account_type_is_not_nullable():
    """Account type column is required (NOT NULL)."""
    col = Account.__table__.c.type
    assert col.nullable is False


def test_account_is_active_defaults_to_true():
    """is_active column defaults to True (soft delete pattern)."""
    col = Account.__table__.c.is_active
    assert col.server_default.arg == "1" or str(col.server_default.arg) in ("true", "1")


def test_account_household_id_is_not_nullable():
    """household_id is required for multi-tenant scoping."""
    col = Account.__table__.c.household_id
    assert col.nullable is False


def test_account_has_institution_fk():
    """Account has optional FK to financial_institutions."""
    col = Account.__table__.c.institution_id
    fk_targets = {fk.target_fullname for fk in col.foreign_keys}
    assert "financial_institutions.id" in fk_targets
    assert col.nullable is True


def test_account_opened_at_is_nullable():
    """opened_at date is optional."""
    col = Account.__table__.c.opened_at
    assert col.nullable is True


def test_account_has_name_ar_column():
    """Arabic name column exists and is optional."""
    mapper = inspect(Account)
    column_names = {c.key for c in mapper.column_attrs}
    assert "name_ar" in column_names
    col = Account.__table__.c.name_ar
    assert col.nullable is True


def test_account_has_check_constraints():
    """Account table has check constraints for billing/payment days."""
    constraint_names = {c.name for c in Account.__table__.constraints if hasattr(c, "name") and c.name}
    assert "ck_accounts_billing_cycle_day" in constraint_names
    assert "ck_accounts_payment_due_day" in constraint_names
