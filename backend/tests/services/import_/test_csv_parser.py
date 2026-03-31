import pytest

from app.services.import_.csv_parser import get_headers, parse_csv


_SAMPLE_CSV = b"""Date,Description,Debit,Credit,Balance
15/03/2026,CARREFOUR CITY STARS,1250.00,,45230.50
16/03/2026,SALARY DEPOSIT,,50000.00,95230.50
17/03/2026,ATM WITHDRAWAL,500.00,,94730.50
"""

_MAPPING = {
    "date": "Date",
    "description": "Description",
    "debit": "Debit",
    "credit": "Credit",
}


def test_get_headers():
    headers = get_headers(_SAMPLE_CSV)
    assert headers == ["Date", "Description", "Debit", "Credit", "Balance"]


def test_parse_csv_debit_row():
    rows = parse_csv(
        _SAMPLE_CSV, _MAPPING, date_format="DD/MM/YYYY", currency="EGP"
    )
    assert rows[0].status == "valid"
    assert rows[0].amount_minor == -125000
    assert rows[0].type == "debit"
    assert rows[0].description == "CARREFOUR CITY STARS"


def test_parse_csv_credit_row():
    rows = parse_csv(
        _SAMPLE_CSV, _MAPPING, date_format="DD/MM/YYYY", currency="EGP"
    )
    assert rows[1].status == "valid"
    assert rows[1].amount_minor == 5000000
    assert rows[1].type == "credit"


def test_parse_csv_row_count():
    rows = parse_csv(
        _SAMPLE_CSV, _MAPPING, date_format="DD/MM/YYYY", currency="EGP"
    )
    assert len(rows) == 3


def test_parse_csv_windows1256_encoding():
    arabic_csv = "التاريخ,البيان,المبلغ\n15/03/2026,كارفور,1250.00\n".encode(
        "windows-1256"
    )
    mapping = {
        "date": "التاريخ",
        "description": "البيان",
        "debit": "المبلغ",
    }
    rows = parse_csv(
        arabic_csv, mapping, date_format="DD/MM/YYYY", currency="EGP"
    )
    assert rows[0].status == "valid"


def test_parse_csv_skip_rows():
    csv_with_header = b"Bank: CIB\nDate,Description,Debit,Credit\n15/03/2026,MERCHANT,100.00,\n"
    mapping = {
        "date": "Date",
        "description": "Description",
        "debit": "Debit",
    }
    rows = parse_csv(
        csv_with_header,
        mapping,
        date_format="DD/MM/YYYY",
        currency="EGP",
        skip_rows=1,
    )
    assert len(rows) == 1
    assert rows[0].status == "valid"
