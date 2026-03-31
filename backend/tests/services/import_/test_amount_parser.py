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


def test_kwd_comma_decimal_not_treated_as_thousands():
    """1,250 with KWD exponent=3 should parse as 1.250 KWD = 1250 fils, not 1250 KWD."""
    result = parse_amount_to_minor("1,250", currency_exponent=3)
    assert result == 1250  # 1.250 KWD = 1250 fils


def test_kwd_thousands_still_works():
    """1,250,000 with KWD should still be treated as thousands separator."""
    result = parse_amount_to_minor("1,250,000", currency_exponent=3)
    assert result == 1_250_000_000  # 1,250,000.000 KWD = 1,250,000,000 fils
