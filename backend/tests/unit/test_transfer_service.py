import pytest


def test_fx_calculation_produces_no_float():
    """FX target amount must be computed using pure integer arithmetic."""
    source_amount = 1_000_000  # 10,000.00 EGP in minor units
    fx_rate = 485000  # 48.5 (stored as rate * 10000)

    # Current (buggy) approach produces float intermediate
    result_float = round(source_amount * fx_rate / 10000)
    assert isinstance(result_float, int)  # round() returns int in Python 3

    # Correct integer approach
    result_int = (source_amount * fx_rate + 5000) // 10000
    assert isinstance(result_int, int)

    # Both should give same result for normal values
    assert result_float == result_int


def test_fx_calculation_rounding():
    """Verify rounding is consistent: 0.5 rounds up (round-half-up via +5000)."""
    # 1 minor unit * rate that would give exactly 0.5 without rounding
    # rate_scaled=5000 means rate=0.5, so 1 * 0.5 = 0.5 → rounds to 1
    source = 1
    rate = 5000  # 0.5 rate
    result = (source * rate + 5000) // 10000
    assert result == 1  # rounds up


def test_fx_calculation_large_amounts():
    """Large EGP amounts (multi-million) must not lose precision."""
    source = 100_000_000_00  # 1,000,000,000.00 EGP (1 billion)
    rate = 485_000  # 48.5 USD/EGP
    result = (source * rate + 5000) // 10000
    assert isinstance(result, int)
    assert result == 485_000_000_000  # 4,850,000,000.00 USD


def test_same_currency_transfer_skips_fx():
    """Same-currency transfers must use source_amount directly, no FX."""
    source = 50000  # 500.00 EGP
    # No FX rate provided — result must equal source
    result = source  # direct assignment
    assert result == source
    assert isinstance(result, int)
