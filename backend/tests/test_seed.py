from app.seed import CURRENCIES, PREDEFINED_CATEGORIES, SAMPLE_EXCHANGE_RATES


def test_predefined_categories_count():
    assert len(PREDEFINED_CATEGORIES) == 20


def test_predefined_categories_have_required_fields():
    for cat in PREDEFINED_CATEGORIES:
        assert "name_en" in cat
        assert "name_ar" in cat
        assert "type" in cat
        assert "icon" in cat
        assert "color" in cat
        assert cat["type"] in ("expense", "income", "special")


def test_expense_categories_count():
    expenses = [c for c in PREDEFINED_CATEGORIES if c["type"] == "expense"]
    assert len(expenses) == 13


def test_income_categories_count():
    incomes = [c for c in PREDEFINED_CATEGORIES if c["type"] == "income"]
    assert len(incomes) == 4


def test_special_categories_count():
    specials = [c for c in PREDEFINED_CATEGORIES if c["type"] == "special"]
    assert len(specials) == 3


def test_currencies_has_seven_entries():
    assert len(CURRENCIES) == 7


def test_currencies_egp_is_default():
    assert "EGP" in CURRENCIES
    assert CURRENCIES["EGP"]["exponent"] == 2


def test_currencies_kwd_has_three_decimals():
    assert "KWD" in CURRENCIES
    assert CURRENCIES["KWD"]["exponent"] == 3


def test_sample_exchange_rates_all_usd_based():
    for rate in SAMPLE_EXCHANGE_RATES:
        assert rate["from_currency"] == "USD"
