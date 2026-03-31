"""Excel bank statement parser using openpyxl."""

import datetime
import io

import openpyxl

from app.schemas.import_ import ParsedRow
from app.services.import_.row_validator import validate_row


def get_sheet_names(raw_bytes: bytes) -> list[str]:
    """Return sheet names from an XLSX/XLS file."""
    wb = openpyxl.load_workbook(io.BytesIO(raw_bytes), read_only=True, data_only=True)
    return list(wb.sheetnames)


def get_headers(raw_bytes: bytes, sheet_name: str | None = None, skip_rows: int = 0) -> list[str]:
    """Return column headers (first data row after skip_rows)."""
    wb = openpyxl.load_workbook(io.BytesIO(raw_bytes), read_only=True, data_only=True)
    ws = wb[sheet_name] if sheet_name and sheet_name in wb.sheetnames else wb.active
    if ws is None:
        return []
    all_rows = list(ws.iter_rows(values_only=True))
    if not all_rows or skip_rows >= len(all_rows):
        return []
    return [str(c) if c is not None else "" for c in all_rows[skip_rows]]


def parse_excel(
    raw_bytes: bytes,
    column_mapping: dict[str, str],
    sheet_name: str | None = None,
    skip_rows: int = 0,
    date_format: str = "DD/MM/YYYY",
    currency: str = "EGP",
    currency_exponent: int = 2,
) -> list[ParsedRow]:
    """Parse an Excel file into ParsedRow list using the provided column mapping."""
    wb = openpyxl.load_workbook(io.BytesIO(raw_bytes), read_only=True, data_only=True)
    ws = wb[sheet_name] if sheet_name and sheet_name in wb.sheetnames else wb.active
    if ws is None:
        return []

    all_rows = list(ws.iter_rows(values_only=True))
    if not all_rows or skip_rows >= len(all_rows):
        return []

    headers = [str(c) if c is not None else "" for c in all_rows[skip_rows]]
    data_rows = all_rows[skip_rows + 1 :]

    def col_idx(field: str) -> int:
        header = column_mapping.get(field, "")
        return headers.index(header) if header in headers else -1

    date_idx = col_idx("date")
    desc_idx = col_idx("description")
    debit_idx = col_idx("debit")
    credit_idx = col_idx("credit")
    amount_idx = col_idx("amount")

    def cell_str(row_data: tuple, idx: int) -> str:
        if idx < 0 or idx >= len(row_data):
            return ""
        val = row_data[idx]
        if val is None:
            return ""
        if isinstance(val, datetime.datetime):
            return val.strftime("%d/%m/%Y")
        if isinstance(val, datetime.date):
            return val.strftime("%d/%m/%Y")
        return str(val)

    rows: list[ParsedRow] = []
    for idx, row_data in enumerate(data_rows):
        date_raw = cell_str(row_data, date_idx)
        desc_raw = cell_str(row_data, desc_idx)

        if amount_idx >= 0:
            row = validate_row(
                idx,
                date_raw,
                desc_raw,
                cell_str(row_data, amount_idx),
                "",
                date_format,
                currency,
                currency_exponent,
            )
        else:
            row = validate_row(
                idx,
                date_raw,
                desc_raw,
                cell_str(row_data, debit_idx),
                cell_str(row_data, credit_idx),
                date_format,
                currency,
                currency_exponent,
            )
        rows.append(row)

    return rows
