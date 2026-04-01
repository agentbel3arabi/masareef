"""HSBC Credit Card PDF preset.

Detection: scans page 1 header for card variant keywords.
Extraction: X-range column bucketing with pdfplumber positional words.
"""

import datetime
import io
import re

import pdfplumber

from app.schemas.import_ import ParsedRow
from app.services.import_.presets.base import BankPreset, PdfColumnConfig
from app.services.import_.row_validator import validate_row

# Card variant detection patterns (first page header)
_VARIANT_PATTERNS: dict[str, str] = {
    "cashback": r"CASHBACK",
    "evolution": r"EVOLUTION",
    "platinum": r"PLATINUM",
    "premier": r"PREMIER",
}

# Calibrated against HSBC Premier, Cashback, Evolution, Platinum PDFs.
# Two date columns exist: posting date (x0≈60) and transaction date (x0≈110).
# We extract both for deduplication; the transaction date is used as the row date.
# A single amount column at x0≈496-510 carries amounts; "CR" suffix = credit.
HSBC_CC_PDF_CONFIG = PdfColumnConfig(
    date_x_range=(50.0, 95.0),          # Posting date x0≈60; excludes header text at x0=46
    description_x_range=(140.0, 420.0), # Description x0≈150-400; skips booking date at x0≈110
    debit_x_range=(455.0, 525.0),       # Single amount column x0≈496-510
    credit_x_range=(455.0, 525.0),      # Same range; credit vs debit determined from "CR" suffix
    y_tolerance=3.0,
)


class HsbcCcPreset(BankPreset):
    @property
    def preset_id(self) -> str:
        return "hsbc_cc"

    @property
    def name(self) -> str:
        return "HSBC Credit Card"

    @property
    def name_ar(self) -> str:
        return "بطاقة إتش إس بي سي"

    @property
    def formats(self) -> list[str]:
        return ["pdf"]

    def detect(self, content: bytes, headers: list[str] | None = None) -> bool:
        """Detect HSBC CC PDF by searching for variant keywords on page 1."""
        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                if not pdf.pages:
                    return False
                first_page_text = (pdf.pages[0].extract_text() or "").upper()
                return any(
                    re.search(pattern, first_page_text) for pattern in _VARIANT_PATTERNS.values()
                )
        except Exception:
            return False

    def detect_variant(self, content: bytes) -> str | None:
        """Return card variant key ('cashback', 'evolution', etc.) or None."""
        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                if not pdf.pages:
                    return None
                first_page_text = (pdf.pages[0].extract_text() or "").upper()
                for variant, pattern in _VARIANT_PATTERNS.items():
                    if re.search(pattern, first_page_text):
                        return variant
        except Exception:
            return None
        return None

    def get_pdf_config(self) -> PdfColumnConfig:
        return HSBC_CC_PDF_CONFIG

    # X-range for the transaction date (second date column, x0≈110).
    # Separate from the config's date_x_range (posting date) so we can capture both.
    _TXN_DATE_X: tuple[float, float] = (100.0, 140.0)

    # DDMMM dates like "04JUN" have no year; this pattern confirms the format.
    _DATE_RE = re.compile(r"^\d{2}[A-Z]{3}$")

    # "Statement Date 09JUN2025" — extract the year from the statement header.
    _STMT_DATE_RE = re.compile(r"Statement\s+Date\s+\d{2}[A-Z]{3}(\d{4})", re.IGNORECASE)

    @staticmethod
    def _extract_statement_year(pdf: "pdfplumber.PDF") -> int | None:  # type: ignore[name-defined]
        """Return the year from 'Statement Date DDMMMYYYY' on page 1 or 2, or None."""
        for page in pdf.pages[:2]:
            text = page.extract_text() or ""
            m = HsbcCcPreset._STMT_DATE_RE.search(text)
            if m:
                return int(m.group(1))
        return None

    @staticmethod
    def _resolve_ddmmm(raw: str, statement_year: int) -> str:
        """Convert a DDMMM token (e.g. '12MAY') to an ISO date string using the
        known statement year, rolling back one year if the month is after the
        statement month (handles Jan statements with Dec transactions).
        """
        try:
            dt = datetime.datetime.strptime(raw + str(statement_year), "%d%b%Y").date()
        except ValueError:
            return raw  # not a valid DDMMM; validate_row will surface the error
        # If the resolved date is more than 2 months after the statement year's end,
        # it belongs to the previous year (e.g. Dec txn in Jan statement).
        if dt > datetime.date(statement_year, 12, 31) + datetime.timedelta(days=60):
            dt = dt.replace(year=statement_year - 1)
        return dt.isoformat()

    def parse(
        self, content: bytes, currency: str = "EGP", currency_exponent: int = 2
    ) -> list[ParsedRow]:
        """Extract transactions from HSBC CC PDF using X-range column bucketing.

        Column layout (calibrated):
          x0≈60   Posting date (DDMMM)
          x0≈110  Transaction date (DDMMM) — used as the row date
          x0≈150+ Description (multiple words)
          x0≈496+ Amount (single column; "CR" suffix → credit, else debit)

        The table uses a uniform ~8.2pt row height. Every row at a distinct Y
        position is a real transaction — no deduplication is applied.
        """
        config = self.get_pdf_config()
        rows: list[ParsedRow] = []
        row_index = 0

        with pdfplumber.open(io.BytesIO(content)) as pdf:
            # Extract the statement year once; used to resolve year-less DDMMM dates.
            # Falls back to heuristic year inference in row_validator if not found.
            statement_year = self._extract_statement_year(pdf)

            for page in pdf.pages:
                words = (
                    page.extract_words(
                        x_tolerance=config.x_tolerance,
                        y_tolerance=config.y_tolerance,
                    )
                    or []
                )

                # Bucket words by X range into per-Y-position lists
                posting_cols: dict[float, list[str]] = {}  # x0≈60  (posting date)
                txn_cols: dict[float, list[str]] = {}       # x0≈110 (transaction date)
                desc_cols: dict[float, list[str]] = {}
                amount_cols: dict[float, list[str]] = {}

                for word in words:
                    x0: float = word["x0"]
                    y = round(word["top"] / config.y_tolerance) * config.y_tolerance
                    text: str = word["text"]

                    if config.date_x_range[0] <= x0 <= config.date_x_range[1]:
                        posting_cols.setdefault(y, []).append(text)
                    elif self._TXN_DATE_X[0] <= x0 <= self._TXN_DATE_X[1]:
                        txn_cols.setdefault(y, []).append(text)
                    elif config.description_x_range[0] <= x0 <= config.description_x_range[1]:
                        desc_cols.setdefault(y, []).append(text)
                    elif config.debit_x_range[0] <= x0 <= config.debit_x_range[1]:
                        amount_cols.setdefault(y, []).append(text)

                for y in sorted(posting_cols):
                    posting_text = " ".join(posting_cols[y])
                    txn_text = " ".join(txn_cols.get(y, []))
                    desc_text = " ".join(desc_cols.get(y, []))
                    amount_text = " ".join(amount_cols.get(y, []))

                    # Skip rows without a valid DDMMM posting date (headers, footers)
                    if not self._DATE_RE.match(posting_text):
                        continue
                    # Skip rows with no amount
                    if not amount_text:
                        continue

                    # Determine debit vs credit from "CR" suffix in amount text
                    if "CR" in amount_text.upper():
                        debit_raw, credit_raw = "", amount_text
                    else:
                        debit_raw, credit_raw = amount_text, ""

                    # Use the transaction date (when purchase happened) as the primary date
                    date_raw = txn_text or posting_text
                    # Resolve DDMMM to ISO using the statement year when available
                    if statement_year and self._DATE_RE.match(date_raw):
                        date_raw = self._resolve_ddmmm(date_raw, statement_year)
                        date_format = "YYYY-MM-DD"
                    else:
                        date_format = "DDMMM"

                    row = validate_row(
                        row_index=row_index,
                        date_raw=date_raw,
                        description=desc_text,
                        debit_raw=debit_raw,
                        credit_raw=credit_raw,
                        date_format=date_format,
                        currency=currency,
                        currency_exponent=currency_exponent,
                    )
                    rows.append(row)
                    row_index += 1

        return rows
