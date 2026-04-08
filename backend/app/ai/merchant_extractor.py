"""First-significant-token heuristic for merchant name extraction.

Strips noise tokens (numbers, dates, payment network names) and returns
uppercased merchant name. See RESEARCH.md D-06 for design rationale.
"""

import re

# Matches: 4+ digit sequences, date-like patterns (d/m/y), alphanumeric codes
_NOISE_PATTERN = re.compile(
    r"\b(\d{4,}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|[A-Z]{2,3}\d+|\d+[A-Z]{2,3})\b",
    re.IGNORECASE,
)

# Payment network names and generic terminal identifiers to skip
_BLOCKLIST = frozenset(
    [
        "VISA",
        "MASTERCARD",
        "AMEX",
        "VALU",
        "ATM",
        "POS",
        "DEBIT",
        "CREDIT",
        "MADA",
        "MEEZA",
        "FAWRY",
    ]
)


def extract_merchant_name(description: str, max_tokens: int = 1) -> str:
    """Return the most significant merchant name token(s) from a transaction description.

    Args:
        description: Raw transaction description string.
        max_tokens: Maximum number of significant tokens to return (default 1).

    Returns:
        Uppercased merchant name, or empty string if no significant token found.
    """
    if not description:
        return ""

    # Strip numeric noise and code tokens
    cleaned = _NOISE_PATTERN.sub("", description).strip()

    # Split into tokens of meaningful length (3+ chars)
    tokens = [t for t in cleaned.split() if len(t) >= 3]

    # Skip blocklisted payment network tokens (Pitfall 3 from RESEARCH.md)
    significant = [t for t in tokens if t.upper() not in _BLOCKLIST]

    if not significant:
        # Fall back to any remaining non-blocklisted tokens (length >= 2)
        significant = [t for t in cleaned.split() if len(t) >= 2 and t.upper() not in _BLOCKLIST]

    return " ".join(significant[:max_tokens]).upper()
