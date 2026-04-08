"""Unit tests for merchant name extraction — pure functions, no DB."""

from app.ai.merchant_extractor import extract_merchant_name


def test_extracts_first_significant_token():
    """CARREFOUR CITY STARS 0284 → CARREFOUR (noise number stripped)."""
    assert extract_merchant_name("CARREFOUR CITY STARS 0284") == "CARREFOUR"


def test_skips_blocklisted_visa_prefix():
    """VISA CARREFOUR CITY STARS → CARREFOUR (VISA is blocklisted)."""
    assert extract_merchant_name("VISA CARREFOUR CITY STARS") == "CARREFOUR"


def test_skips_pos_and_date_noise():
    """POS 20260320 UBER EATS → starts with UBER (POS blocked, date stripped)."""
    result = extract_merchant_name("POS 20260320 UBER EATS")
    assert result.startswith("UBER")


def test_skips_atm_prefix():
    """ATM WITHDRAWAL → WITHDRAWAL (ATM is blocklisted)."""
    assert extract_merchant_name("ATM WITHDRAWAL") == "WITHDRAWAL"


def test_all_noise_returns_empty():
    """1234567890 → '' (all noise tokens)."""
    assert extract_merchant_name("1234567890") == ""


def test_empty_string_returns_empty():
    """'' → ''."""
    assert extract_merchant_name("") == ""


def test_skips_mastercard_debit():
    """MASTERCARD DEBIT STARBUCKS CAIRO → STARBUCKS."""
    assert extract_merchant_name("MASTERCARD DEBIT STARBUCKS CAIRO") == "STARBUCKS"


def test_arabic_description_returns_uppercased():
    """Arabic description — returns first Arabic token(s) uppercased."""
    result = extract_merchant_name("كارفور سيتي ستارز")
    # Arabic text is returned — just verify it's non-empty and uppercased
    assert len(result) > 0
    assert result == result.upper()


def test_merchant_name_uppercased():
    """Result is always uppercased."""
    result = extract_merchant_name("starbucks cairo mall")
    assert result == result.upper()


def test_max_tokens_limit():
    """Default max_tokens=2 limits output."""
    result = extract_merchant_name("UBER EATS DELIVERY SERVICE")
    tokens = result.split()
    assert len(tokens) <= 2
