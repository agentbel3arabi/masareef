"""Amount string parsing for Egyptian bank exports.

Handles: Arabic-Indic numerals, DR/CR suffixes, parentheses negation,
comma/dot as thousands or decimal separator, European format (1.234,56).
"""

import re
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

# Arabic-Indic digit → ASCII digit
_ARABIC_INDIC_MAP = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
# Arabic thousands separator (U+066C ٬) → comma, Arabic decimal (U+066B ٫) → dot
_ARABIC_PUNCT_MAP = str.maketrans("\u066c\u066b", ",.")


def normalize_arabic_numerals(text: str) -> str:
    """Replace Arabic-Indic digits and punctuation with ASCII equivalents."""
    return text.translate(_ARABIC_INDIC_MAP).translate(_ARABIC_PUNCT_MAP)


def parse_amount_to_minor(raw: str, currency_exponent: int = 2) -> int | None:
    """Parse a raw amount string to integer minor units.

    Returns None if the string cannot be parsed as a number.
    """
    if not raw or not raw.strip():
        return None

    text = normalize_arabic_numerals(raw.strip())
    text_upper = text.upper()

    # Determine sign
    negative = (
        text.startswith("-") or "DR" in text_upper or (text.startswith("(") and text.endswith(")"))
    )
    positive_override = "CR" in text_upper or text.startswith("+")
    if positive_override:
        negative = False

    # Strip everything except digits, dots, commas
    cleaned = re.sub(r"[^\d.,]", "", text)
    if not cleaned:
        return None

    # Resolve ambiguous separators
    if "." in cleaned and "," in cleaned:
        last_dot = cleaned.rfind(".")
        last_comma = cleaned.rfind(",")
        if last_dot > last_comma:
            # 1,234.56 → remove commas
            cleaned = cleaned.replace(",", "")
        else:
            # 1.234,56 → remove dots, comma → dot
            cleaned = cleaned.replace(".", "").replace(",", ".")
    elif "," in cleaned:
        parts = cleaned.split(",")
        if len(parts) == 2 and len(parts[1]) <= currency_exponent:
            # 1234,56 → decimal
            cleaned = cleaned.replace(",", ".")
        else:
            # 1,234,567 → thousands
            cleaned = cleaned.replace(",", "")

    try:
        amount = Decimal(cleaned)
    except InvalidOperation:
        return None

    quantized = amount.quantize(Decimal(10) ** -currency_exponent, rounding=ROUND_HALF_UP)
    minor = int(quantized * (10**currency_exponent))
    return -minor if negative else minor
