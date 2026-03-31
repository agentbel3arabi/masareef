"""HSBC Credit Card PDF preset.

Detection: scans page 1 header for card variant keywords.
Extraction: X-range column bucketing with pdfplumber positional words.

⚠️  X-ranges in HSBC_CC_PDF_CONFIG are starting estimates.
Calibrate against a real HSBC CC PDF before going to production.
See calibration note in Task 12 of the implementation plan.
"""

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

# ⚠️  Calibrate these X-ranges from a real HSBC CC PDF (see plan Task 12 note)
HSBC_CC_PDF_CONFIG = PdfColumnConfig(
    date_x_range=(30.0, 90.0),
    description_x_range=(90.0, 340.0),
    debit_x_range=(340.0, 420.0),
    credit_x_range=(420.0, 500.0),
    balance_x_range=(500.0, 580.0),
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

    def parse(self, content: bytes, currency: str = "EGP") -> list[ParsedRow]:
        """Extract transactions from HSBC CC PDF using X-range column bucketing."""
        config = self.get_pdf_config()
        rows: list[ParsedRow] = []
        row_index = 0

        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                words = (
                    page.extract_words(
                        x_tolerance=config.x_tolerance,
                        y_tolerance=config.y_tolerance,
                    )
                    or []
                )

                # Group words into columns by X position, rows by Y proximity
                date_cols: dict[float, list[str]] = {}
                desc_cols: dict[float, list[str]] = {}
                debit_cols: dict[float, list[str]] = {}
                credit_cols: dict[float, list[str]] = {}

                for word in words:
                    x0: float = word["x0"]
                    # Snap Y to nearest tolerance bucket
                    y = round(word["top"] / config.y_tolerance) * config.y_tolerance
                    text: str = word["text"]

                    if config.date_x_range[0] <= x0 <= config.date_x_range[1]:
                        date_cols.setdefault(y, []).append(text)
                    elif config.description_x_range[0] <= x0 <= config.description_x_range[1]:
                        desc_cols.setdefault(y, []).append(text)
                    elif config.debit_x_range[0] <= x0 <= config.debit_x_range[1]:
                        debit_cols.setdefault(y, []).append(text)
                    elif config.credit_x_range[0] <= x0 <= config.credit_x_range[1]:
                        credit_cols.setdefault(y, []).append(text)

                # Build rows from Y positions that have a date
                for y in sorted(date_cols):
                    date_text = " ".join(date_cols[y])
                    desc_text = " ".join(desc_cols.get(y, []))
                    debit_text = " ".join(debit_cols.get(y, []))
                    credit_text = " ".join(credit_cols.get(y, []))

                    # Skip rows with no amount (headers, section labels, etc.)
                    if not (debit_text or credit_text):
                        continue

                    row = validate_row(
                        row_index=row_index,
                        date_raw=date_text,
                        description=desc_text,
                        debit_raw=debit_text,
                        credit_raw=credit_text,
                        date_format="DD/MM/YYYY",
                        currency=currency,
                    )
                    rows.append(row)
                    row_index += 1

        return rows
