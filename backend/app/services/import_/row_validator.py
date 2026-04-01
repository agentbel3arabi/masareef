"""Per-row validation. Converts raw strings to a typed ParsedRow."""

import datetime

from app.schemas.import_ import ParsedRow
from app.services.import_.amount_parser import parse_amount_to_minor

_DATE_FORMAT_MAP: dict[str, str] = {
    "DD/MM/YYYY": "%d/%m/%Y",
    "MM/DD/YYYY": "%m/%d/%Y",
    "YYYY-MM-DD": "%Y-%m-%d",
    "DD-MM-YYYY": "%d-%m-%Y",
    "DD.MM.YYYY": "%d.%m.%Y",
    "YYYY/MM/DD": "%Y/%m/%d",
    # Day + 3-letter month abbreviation (no year) — used by HSBC CC PDFs
    # e.g. "04JUN", "12MAY". Year is inferred from context.
    "DDMMM": "%d%b",
}

_AUTO_DETECT_VALUES = {"auto-detect", "auto detect", "auto", ""}


def _infer_year(dt: datetime.datetime) -> datetime.date:
    """Replace strptime's default year-1900 placeholder with a sensible calendar year.

    Uses the current year; rolls back one year if the resulting date is more than
    60 days in the future (handles Jan statements parsed in December, etc.).
    """
    today = datetime.date.today()
    guessed = dt.replace(year=today.year).date()
    if guessed > today + datetime.timedelta(days=60):
        guessed = dt.replace(year=today.year - 1).date()
    return guessed


def _try_format(raw: str, fmt: str) -> datetime.date | None:
    try:
        dt = datetime.datetime.strptime(raw, fmt)
        if dt.year == 1900:
            return _infer_year(dt)
        return dt.date()
    except (ValueError, AttributeError):
        return None


def _parse_date(raw: str, date_format: str) -> datetime.date | None:
    raw_stripped = raw.strip()
    if not raw_stripped:
        return None

    if date_format.lower() in _AUTO_DETECT_VALUES:
        for fmt in _DATE_FORMAT_MAP.values():
            result = _try_format(raw_stripped, fmt)
            if result is not None:
                return result
        return None

    fmt = _DATE_FORMAT_MAP.get(date_format, date_format)
    return _try_format(raw_stripped, fmt)


def validate_row(
    row_index: int,
    date_raw: str,
    description: str,
    debit_raw: str,
    credit_raw: str,
    date_format: str,
    currency: str,
    currency_exponent: int = 2,
    single_amount: bool = False,
) -> ParsedRow:
    """Validate and normalise a raw row into a ParsedRow with status.

    Args:
        single_amount: Set to True when the value comes from a single signed
            amount column (positive = credit, negative = debit). When False
            (default), the value is treated as a debit column entry and is
            always stored as a negative amount.
    """
    parsed_date = _parse_date(date_raw, date_format)
    if parsed_date is None:
        return ParsedRow(
            row_index=row_index,
            description=description,
            status="error",
            error_message=f"Cannot parse date: '{date_raw}' with format {date_format}",
        )

    amount_minor: int | None = None
    row_type = "debit"

    if debit_raw and debit_raw.strip():
        val = parse_amount_to_minor(debit_raw, currency_exponent)
        if val is not None:
            if single_amount:
                # Preserve sign: negative = debit, positive = credit
                amount_minor = val
                row_type = "credit" if val > 0 else "debit"
            else:
                amount_minor = -abs(val)  # debit column → always negative
                row_type = "debit"

    if credit_raw and credit_raw.strip():
        val = parse_amount_to_minor(credit_raw, currency_exponent)
        if val is not None:
            amount_minor = abs(val)  # credits always positive
            row_type = "credit"
            # Note: if both debit_raw and credit_raw are non-empty, credit wins.
            # This is intentional — typical bank CSV formats use separate debit/credit
            # columns where only one is populated per row. If both are present,
            # treating the row as a credit is the safer assumption (avoids double-counting).

    if amount_minor is None:
        return ParsedRow(
            row_index=row_index,
            date=parsed_date,
            description=description,
            debit_raw=debit_raw,
            credit_raw=credit_raw,
            status="error",
            error_message=f"Cannot parse amount from debit='{debit_raw}' credit='{credit_raw}'",
        )

    return ParsedRow(
        row_index=row_index,
        date=parsed_date,
        description=description.strip(),
        debit_raw=debit_raw,
        credit_raw=credit_raw,
        amount_minor=amount_minor,
        currency=currency,
        type=row_type,
        status="valid",
    )
