"""CSV bank statement parser using pandas."""

import io

import pandas as pd

from app.schemas.import_ import ParsedRow
from app.services.import_.encoding import decode_bytes
from app.services.import_.row_validator import validate_row


def get_headers(raw_bytes: bytes, skip_rows: int = 0) -> list[str]:
    """Return column headers from CSV bytes."""
    text, _ = decode_bytes(raw_bytes)
    df = pd.read_csv(io.StringIO(text), skiprows=skip_rows, dtype=str, nrows=0)
    return list(df.columns)


def parse_csv(
    raw_bytes: bytes,
    column_mapping: dict[str, str],
    date_format: str = "DD/MM/YYYY",
    skip_rows: int = 0,
    currency: str = "EGP",
    currency_exponent: int = 2,
) -> list[ParsedRow]:
    """Parse CSV bytes into ParsedRow list using the provided column mapping.

    column_mapping keys: "date", "description", "debit", "credit", "balance", "amount"
    column_mapping values: actual header names in the CSV
    """
    text, _ = decode_bytes(raw_bytes)
    df = pd.read_csv(
        io.StringIO(text),
        skiprows=skip_rows,
        dtype=str,
        keep_default_na=False,
    )
    df = df.fillna("")

    date_col = column_mapping.get("date", "")
    desc_col = column_mapping.get("description", "")
    debit_col = column_mapping.get("debit", "")
    credit_col = column_mapping.get("credit", "")
    amount_col = column_mapping.get("amount", "")  # single-amount column

    rows: list[ParsedRow] = []
    for idx, row_dict in enumerate(df.to_dict("records")):
        date_raw = str(row_dict.get(date_col, ""))
        desc_raw = str(row_dict.get(desc_col, ""))

        if amount_col:
            row = validate_row(
                idx,
                date_raw,
                desc_raw,
                str(row_dict.get(amount_col, "")),
                "",
                date_format,
                currency,
                currency_exponent,
                single_amount=True,  # preserve sign from signed amount column
            )
        else:
            row = validate_row(
                idx,
                date_raw,
                desc_raw,
                str(row_dict.get(debit_col, "")),
                str(row_dict.get(credit_col, "")),
                date_format,
                currency,
                currency_exponent,
            )
        rows.append(row)

    return rows
