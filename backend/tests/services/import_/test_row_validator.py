import datetime

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
