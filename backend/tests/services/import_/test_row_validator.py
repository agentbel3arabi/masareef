import datetime
from unittest.mock import patch

from app.services.import_.row_validator import validate_row


def test_valid_debit_row():
    row = validate_row(0, "15/03/2026", "CARREFOUR", "1250.00", "", "DD/MM/YYYY", "EGP")
    assert row.status == "valid"
    assert row.date == datetime.date(2026, 3, 15)
    assert row.amount_minor == -125000  # debit → negative
    assert row.type == "debit"


def test_valid_credit_row():
    row = validate_row(0, "15/03/2026", "SALARY", "", "5000.00", "DD/MM/YYYY", "EGP")
    assert row.status == "valid"
    assert row.amount_minor == 500000  # credit → positive


def test_invalid_date_returns_error():
    row = validate_row(0, "NOT_A_DATE", "MERCHANT", "100.00", "", "DD/MM/YYYY", "EGP")
    assert row.status == "error"
    assert "Cannot parse date" in (row.error_message or "")


def test_invalid_amount_returns_error():
    row = validate_row(0, "15/03/2026", "MERCHANT", "N/A", "", "DD/MM/YYYY", "EGP")
    assert row.status == "error"
    assert "Cannot parse amount" in (row.error_message or "")


def test_yyyy_mm_dd_format():
    row = validate_row(0, "2026-03-15", "MERCHANT", "100.00", "", "YYYY-MM-DD", "EGP")
    assert row.date == datetime.date(2026, 3, 15)


def test_row_index_preserved():
    row = validate_row(42, "15/03/2026", "MERCHANT", "100.00", "", "DD/MM/YYYY", "EGP")
    assert row.row_index == 42


def test_single_amount_positive_is_credit():
    """Positive value in single-amount column should be stored as credit."""
    row = validate_row(
        0, "15/03/2026", "SALARY", "5000.00", "", "DD/MM/YYYY", "EGP", single_amount=True
    )
    assert row.status == "valid"
    assert row.amount_minor == 500000  # positive = credit
    assert row.type == "credit"


def test_single_amount_negative_is_debit():
    """Negative value in single-amount column should be stored as debit."""
    row = validate_row(
        0, "15/03/2026", "CARREFOUR", "-1250.00", "", "DD/MM/YYYY", "EGP", single_amount=True
    )
    assert row.status == "valid"
    assert row.amount_minor == -125000  # negative = debit
    assert row.type == "debit"


def test_ddmmm_format_parses_correctly():
    """DDMMM dates like '04JUN' should parse to the correct month/day in current or previous year.
    Fix "today" to 2025-07-01 so 04JUN → 2025-06-04 (not in future).
    """
    with patch("app.services.import_.row_validator.datetime") as mock_dt:
        # Fix "today" to 2025-07-01 so 04JUN → 2025-06-04 (not in future)
        mock_dt.date.today.return_value = datetime.date(2025, 7, 1)
        mock_dt.timedelta = datetime.timedelta
        mock_dt.datetime.strptime = datetime.datetime.strptime
        row = validate_row(0, "04JUN", "MY FAWRY", "10080.00", "", "DDMMM", "EGP")
    assert row.status == "valid"
    assert row.date is not None
    assert row.date.month == 6
    assert row.date.day == 4


def test_ddmmm_rolls_back_year_for_future_date():
    """DDMMM dates that are more than 60 days in the future use the previous year."""
    with patch("app.services.import_.row_validator.datetime") as mock_dt:
        # Fix "today" to 2025-01-15 so 04JUN → 2025-06-04 which is >60 days ahead → 2024-06-04
        mock_dt.date.today.return_value = datetime.date(2025, 1, 15)
        mock_dt.timedelta = datetime.timedelta
        mock_dt.datetime.strptime = datetime.datetime.strptime
        row = validate_row(0, "04JUN", "MY FAWRY", "10080.00", "", "DDMMM", "EGP")
    assert row.status == "valid"
    assert row.date is not None
    assert row.date.year == 2024
    assert row.date.month == 6


def test_ddmmm_credit_suffix():
    """Amount with CR suffix in DDMMM row is treated as credit."""
    with patch("app.services.import_.row_validator.datetime") as mock_dt:
        mock_dt.date.today.return_value = datetime.date(2025, 7, 1)
        mock_dt.timedelta = datetime.timedelta
        mock_dt.datetime.strptime = datetime.datetime.strptime
        row = validate_row(0, "04JUN", "CASHBACK", "", "569.42CR", "DDMMM", "EGP")
    assert row.status == "valid"
    assert row.amount_minor == 56942  # credit → positive
    assert row.type == "credit"
