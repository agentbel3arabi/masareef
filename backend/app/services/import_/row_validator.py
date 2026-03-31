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
}


def _parse_date(raw: str, date_format: str) -> datetime.date | None:
    fmt = _DATE_FORMAT_MAP.get(date_format, date_format)
    try:
        return datetime.datetime.strptime(raw.strip(), fmt).date()
    except (ValueError, AttributeError):
        return None


def validate_row(
    row_index: int,
    date_raw: str,
    description: str,
    debit_raw: str,
    credit_raw: str,
    date_format: str,
    currency: str,
    currency_exponent: int = 2,
) -> ParsedRow:
    """Validate and normalise a raw row into a ParsedRow with status."""
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
            amount_minor = -abs(val)  # debits always negative
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
