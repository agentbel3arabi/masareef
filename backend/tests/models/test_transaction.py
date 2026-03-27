from sqlalchemy import inspect

from app.models.transaction import Transaction, TransactionSplit


def test_transaction_table_name():
    assert Transaction.__tablename__ == "transactions"


def test_transaction_has_required_columns():
    mapper = inspect(Transaction)
    column_names = {c.key for c in mapper.column_attrs}
    required = {
        "id", "household_id", "account_id", "date", "description",
        "amount_minor", "currency", "type", "category_id",
        "import_batch_id", "notes", "exchange_rate_at_time",
        "fx_rate_minor_units", "is_active", "applies_to_balance",
        "transfer_id", "ai_categorized", "ai_confidence",
        "created_at", "updated_at",
    }
    assert required.issubset(column_names)


def test_transaction_amount_minor_is_bigint():
    col = Transaction.__table__.c.amount_minor
    assert str(col.type) == "BIGINT"


def test_transaction_applies_to_balance_default_true():
    col = Transaction.__table__.c.applies_to_balance
    assert col.server_default.arg == "true"


def test_transaction_split_table_name():
    assert TransactionSplit.__tablename__ == "transaction_splits"


def test_transaction_split_amount_minor_is_bigint():
    col = TransactionSplit.__table__.c.amount_minor
    assert str(col.type) == "BIGINT"


def test_transaction_has_account_fk():
    col = Transaction.__table__.c.account_id
    fk_targets = {fk.target_fullname for fk in col.foreign_keys}
    assert "accounts.id" in fk_targets


def test_transaction_has_category_fk():
    col = Transaction.__table__.c.category_id
    fk_targets = {fk.target_fullname for fk in col.foreign_keys}
    assert "categories.id" in fk_targets
