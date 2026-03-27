from app.services.money import CURRENCIES, format_amount, major_to_minor, minor_to_major


def test_format_amount_egp():
    assert format_amount(125000, "EGP") == "1,250.00"


def test_format_amount_kwd_three_decimals():
    assert format_amount(125000, "KWD") == "125.000"


def test_format_amount_zero():
    assert format_amount(0, "EGP") == "0.00"


def test_format_amount_negative():
    assert format_amount(-50000, "EGP") == "-500.00"


def test_minor_to_major_egp():
    assert minor_to_major(125000, "EGP") == 1250.00


def test_minor_to_major_kwd():
    assert minor_to_major(125000, "KWD") == 125.000


def test_major_to_minor_egp():
    assert major_to_minor(1250.00, "EGP") == 125000


def test_major_to_minor_kwd():
    assert major_to_minor(125.0, "KWD") == 125000


def test_currencies_dict_has_seven():
    assert len(CURRENCIES) == 7


def test_format_amount_unknown_currency_defaults_to_two():
    # Unknown currencies fall back to 2 decimal places
    assert format_amount(125000, "XYZ") == "1,250.00"
