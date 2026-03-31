from app.services.import_.amount_parser import normalize_arabic_numerals, parse_amount_to_minor


def test_arabic_indic_normalization():
    assert normalize_arabic_numerals("١٢٣٤") == "1234"


def test_arabic_decimal_separator():
    assert normalize_arabic_numerals("١٬٢٥٠٫٠٠") == "1,250.00"


def test_simple_positive():
    assert parse_amount_to_minor("1250.00") == 125000


def test_simple_negative_dash():
    assert parse_amount_to_minor("-1250.00") == -125000


def test_dr_suffix():
    assert parse_amount_to_minor("1,250.00 DR") == -125000


def test_cr_suffix():
    assert parse_amount_to_minor("1,250.00 CR") == 125000


def test_parentheses_negative():
    assert parse_amount_to_minor("(1,250.00)") == -125000


def test_thousands_comma():
    assert parse_amount_to_minor("10,000.00") == 1000000


def test_european_format_dot_thousands():
    assert parse_amount_to_minor("1.250,00") == 125000


def test_arabic_indic_amount():
    assert parse_amount_to_minor("١٬٢٥٠٫٠٠") == 125000


def test_three_decimal_kwd():
    assert parse_amount_to_minor("1.250", currency_exponent=3) == 1250


def test_empty_returns_none():
    assert parse_amount_to_minor("") is None


def test_whitespace_returns_none():
    assert parse_amount_to_minor("   ") is None


def test_text_only_returns_none():
    assert parse_amount_to_minor("N/A") is None
