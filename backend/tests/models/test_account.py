from sqlalchemy import inspect

from app.models.account import Account


def test_account_table_name():
    assert Account.__tablename__ == "accounts"


def test_account_has_required_columns():
    mapper = inspect(Account)
    column_names = {c.key for c in mapper.column_attrs}
    required = {
        "id",
        "household_id",
        "name",
        "type",
        "currency",
        "institution_id",
        "iban",
        "account_number",
        "account_tier",
        "branch",
        "balance_minor",
        "credit_limit",
        "billing_cycle_day",
        "payment_due_day",
        "opened_at",
        "is_active",
        "created_at",
        "updated_at",
    }
    assert required.issubset(column_names)


def test_account_balance_minor_is_bigint():
    col = Account.__table__.c.balance_minor
    assert str(col.type) == "BIGINT"


def test_account_balance_minor_default_is_zero():
    col = Account.__table__.c.balance_minor
    assert col.server_default.arg == "0"


def test_account_credit_limit_is_nullable():
    col = Account.__table__.c.credit_limit
    assert col.nullable is True


def test_account_has_household_fk():
    col = Account.__table__.c.household_id
    fk_targets = {fk.target_fullname for fk in col.foreign_keys}
    assert "households.id" in fk_targets
