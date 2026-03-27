"""Balance computation logic. All amounts are integer minor units."""


def compute_displayed_balance(seed_balance_minor: int, transaction_amounts: list[int]) -> int:
    """Compute displayed balance from seed + sum of signed transaction amounts.

    Args:
        seed_balance_minor: The account's seed balance (accounts.balance_minor).
        transaction_amounts: List of signed amounts from active transactions
            where applies_to_balance=True and date >= opened_at.

    Returns:
        Displayed balance in minor units.
    """
    return seed_balance_minor + sum(transaction_amounts)


def compute_balance_delta(amount_minor: int, tx_type: str) -> int:
    """Compute the signed delta a transaction applies to an account balance.

    The frontend sends amount_minor as a positive integer + type (debit/credit).
    This function returns the signed value to store and to apply as a balance delta.

    Args:
        amount_minor: Positive integer from the request.
        tx_type: "debit" or "credit".

    Returns:
        Negative for debit, positive for credit.
    """
    if tx_type == "debit":
        return -abs(amount_minor)
    return abs(amount_minor)
