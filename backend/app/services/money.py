"""Money formatting and conversion utilities. All amounts are integer minor units."""

from decimal import Decimal

from app.seed import CURRENCIES


def format_amount(amount_minor: int, currency: str) -> str:
    """Format integer minor units to human-readable string.

    Example: format_amount(125000, "EGP") -> "1,250.00"
    Example: format_amount(125000, "KWD") -> "125.000"
    """
    exponent = CURRENCIES.get(currency, {}).get("exponent", 2)
    divisor = Decimal(10**exponent)
    major = Decimal(amount_minor) / divisor
    return f"{major:,.{exponent}f}"


def minor_to_major(amount_minor: int, currency: str) -> float:
    """Convert minor units to major units as float (for display only, never for computation)."""
    exponent = CURRENCIES.get(currency, {}).get("exponent", 2)
    return amount_minor / (10**exponent)


def major_to_minor(amount_major: float, currency: str) -> int:
    """Convert major units to minor units as integer."""
    exponent = CURRENCIES.get(currency, {}).get("exponent", 2)
    return round(amount_major * (10**exponent))
