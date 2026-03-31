"""Fuzzy header-to-field mapper using rapidfuzz.

Maps CSV/Excel column headers to canonical import fields:
date, description, debit, credit, balance.
"""

from rapidfuzz import fuzz

# Canonical aliases per field (lowercase). Add new aliases as banks are discovered.
_FIELD_ALIASES: dict[str, list[str]] = {
    "date": [
        "date",
        "transaction date",
        "trans date",
        "value date",
        "booking date",
        "posting date",
        "تاريخ",
    ],
    "description": [
        "description",
        "narration",
        "details",
        "merchant",
        "memo",
        "particulars",
        "narrative",
        "البيان",
        "الوصف",
        "تفاصيل",
    ],
    "debit": [
        "debit",
        "withdrawal",
        "dr",
        "amount dr",
        "debit amount",
        "paid out",
        "withdrawals",
        "withdrawal amt",
        "سحب",
        "مدين",
    ],
    "credit": [
        "credit",
        "deposit",
        "cr",
        "amount cr",
        "credit amount",
        "paid in",
        "deposits",
        "deposit amt",
        "إيداع",
        "دائن",
    ],
    "balance": [
        "balance",
        "running balance",
        "available balance",
        "ledger balance",
        "رصيد",
    ],
}

_CONFIDENCE_THRESHOLD = 0.70


def get_auto_suggest(
    headers: list[str],
    threshold: float = _CONFIDENCE_THRESHOLD,
) -> dict[str, str]:
    """Return {field: best_matching_header} for confident matches only.

    Fields with no match above `threshold` are omitted from the result.
    """
    result: dict[str, str] = {}
    headers_lower = [(h, h.lower()) for h in headers]

    for field, aliases in _FIELD_ALIASES.items():
        best_header: str | None = None
        best_score: float = 0.0

        for header, header_lower in headers_lower:
            for alias in aliases:
                score = fuzz.ratio(header_lower, alias) / 100.0
                if score > best_score:
                    best_score = score
                    best_header = header

        if best_header is not None and best_score >= threshold:
            result[field] = best_header

    return result
