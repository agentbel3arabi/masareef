import pytest
from pydantic import ValidationError


def test_account_create_rejects_invalid_type():
    from app.schemas.account import AccountCreate
    with pytest.raises(ValidationError) as exc_info:
        AccountCreate(name="Test", type="invalid_type", currency="EGP")
    assert "type" in str(exc_info.value)


def test_account_create_accepts_valid_types():
    from app.schemas.account import AccountCreate
    from app.models.enums import AccountType
    for account_type in AccountType:
        schema = AccountCreate(name="Test", type=account_type, currency="EGP")
        assert schema.type == account_type


def test_transaction_create_rejects_invalid_type():
    from app.schemas.transaction import TransactionCreate
    import datetime
    with pytest.raises(ValidationError) as exc_info:
        TransactionCreate(
            account_id=1, date=datetime.date.today(),
            description="Test", amount_minor=1000, type="invalid",
        )
    assert "type" in str(exc_info.value)


def test_transaction_create_accepts_debit_credit():
    from app.schemas.transaction import TransactionCreate
    import datetime
    for tx_type in ("debit", "credit"):
        schema = TransactionCreate(
            account_id=1, date=datetime.date.today(),
            description="Test", amount_minor=1000, type=tx_type,
        )
        assert schema.type == tx_type


def test_category_create_rejects_invalid_type():
    from app.schemas.category import CategoryCreate
    with pytest.raises(ValidationError) as exc_info:
        CategoryCreate(name_en="Food", type="bad_type")
    assert "type" in str(exc_info.value)


def test_category_create_accepts_valid_types():
    from app.schemas.category import CategoryCreate
    from app.models.enums import CategoryType
    for cat_type in CategoryType:
        schema = CategoryCreate(name_en="Food", type=cat_type)
        assert schema.type == cat_type


def test_manual_rate_request_rejects_negative_rate():
    from app.schemas.exchange_rate import ManualRateRequest
    import datetime
    with pytest.raises(ValidationError):
        ManualRateRequest(date=datetime.date.today(), to_currency="USD", rate=-1.0)


def test_manual_rate_request_rejects_zero_rate():
    from app.schemas.exchange_rate import ManualRateRequest
    import datetime
    with pytest.raises(ValidationError):
        ManualRateRequest(date=datetime.date.today(), to_currency="USD", rate=0.0)


def test_manual_rate_request_rate_scaled_property():
    from app.schemas.exchange_rate import ManualRateRequest
    import datetime
    req = ManualRateRequest(date=datetime.date.today(), to_currency="USD", rate=48.5)
    assert req.rate_scaled == 485000  # 48.5 * 10000
    assert isinstance(req.rate_scaled, int)


def test_transaction_create_rejects_negative_amount():
    from app.schemas.transaction import TransactionCreate
    import datetime
    with pytest.raises(ValidationError):
        TransactionCreate(
            account_id=1, date=datetime.date.today(),
            description="Test", amount_minor=-100, type="debit",
        )


def test_transaction_create_rejects_zero_amount():
    from app.schemas.transaction import TransactionCreate
    import datetime
    with pytest.raises(ValidationError):
        TransactionCreate(
            account_id=1, date=datetime.date.today(),
            description="Test", amount_minor=0, type="debit",
        )


def test_transaction_create_has_no_currency_field():
    from app.schemas.transaction import TransactionCreate
    import inspect
    fields = TransactionCreate.model_fields
    assert "currency" not in fields, "currency field must not exist in TransactionCreate"
