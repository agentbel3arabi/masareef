from sqlalchemy import inspect

from app.models.exchange_rate import ExchangeRate


def test_exchange_rate_table_name():
    assert ExchangeRate.__tablename__ == "exchange_rates"


def test_exchange_rate_has_required_columns():
    mapper = inspect(ExchangeRate)
    column_names = {c.key for c in mapper.column_attrs}
    required = {
        "id", "date", "from_currency", "to_currency",
        "rate_scaled", "is_forecast", "source", "fetched_at",
    }
    assert required.issubset(column_names)


def test_exchange_rate_rate_scaled_is_bigint():
    col = ExchangeRate.__table__.c.rate_scaled
    assert str(col.type) == "BIGINT"


def test_exchange_rate_no_household_id():
    """Exchange rates are global — no household scope."""
    mapper = inspect(ExchangeRate)
    column_names = {c.key for c in mapper.column_attrs}
    assert "household_id" not in column_names
