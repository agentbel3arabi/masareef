from app.services.balance import compute_displayed_balance, compute_balance_delta


def test_compute_displayed_balance_basic():
    """seed + sum of active transactions = displayed balance."""
    seed_balance = 1000000  # 10,000.00 EGP
    transaction_amounts = [-50000, -30000, 200000]  # -500, -300, +2000
    result = compute_displayed_balance(seed_balance, transaction_amounts)
    assert result == 1000000 + (-50000) + (-30000) + 200000
    assert result == 1120000


def test_compute_displayed_balance_no_transactions():
    result = compute_displayed_balance(500000, [])
    assert result == 500000


def test_compute_displayed_balance_negative_result():
    """Credit card with more charges than seed."""
    result = compute_displayed_balance(0, [-500000, -300000])
    assert result == -800000


def test_compute_balance_delta_debit():
    """Debit transaction: amount stored as negative, delta is negative."""
    delta = compute_balance_delta(amount_minor=125000, tx_type="debit")
    assert delta == -125000


def test_compute_balance_delta_credit():
    """Credit transaction: amount stored as positive, delta is positive."""
    delta = compute_balance_delta(amount_minor=125000, tx_type="credit")
    assert delta == 125000


def test_compute_balance_delta_reversal():
    """Reversing a debit returns positive delta."""
    original_delta = compute_balance_delta(amount_minor=125000, tx_type="debit")
    reversal = -original_delta
    assert reversal == 125000
