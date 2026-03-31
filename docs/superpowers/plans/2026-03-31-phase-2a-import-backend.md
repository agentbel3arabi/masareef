# Phase 2A: Import Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete backend import parsing pipeline — encoding detection, CSV/Excel/PDF parsers, HSBC CC preset, fuzzy header mapping, duplicate detection, and the parse + commit API endpoints.

**Architecture:** Format-agnostic parsing pipeline organized in `services/import_/`. The `import_service.py` orchestrator runs the decision tree (detect format → try preset → return needs_mapping or rows). The router is a thin HTTP layer. Balance is NOT updated on account model (it is computed dynamically from seed + transactions). The parse endpoint is stateless — the frontend re-sends the file with column_mapping on the second call.

**Tech Stack:** FastAPI, pdfplumber (PDF extraction, swappable after evaluation), pandas (CSV), openpyxl (Excel), rapidfuzz (fuzzy header matching), chardet (encoding detection), slowapi (rate limiting), pytest + aiosqlite (tests)

---

## File Map

**New files:**
- `backend/app/schemas/import_.py` — ParsedRow, CommitRow, CommitRequest, CommitResponse, NeedsMappingResponse, ScannedResponse, ParseCompleteResponse, PresetInfo
- `backend/app/services/import_/__init__.py`
- `backend/app/services/import_/encoding.py` — chardet wrapper
- `backend/app/services/import_/amount_parser.py` — Arabic numerals, DR/CR, separators
- `backend/app/services/import_/header_mapper.py` — rapidfuzz field→column suggestion
- `backend/app/services/import_/row_validator.py` — per-row date + amount validation → ParsedRow
- `backend/app/services/import_/csv_parser.py` — pandas CSV parse with column mapping
- `backend/app/services/import_/excel_parser.py` — openpyxl parse with sheet selection
- `backend/app/services/import_/pdf_parser.py` — pdfplumber text extract + scanned detection
- `backend/app/services/import_/duplicate_checker.py` — hash-set dedup, one query
- `backend/app/services/import_/import_service.py` — orchestrator: parse_upload + commit_import
- `backend/app/services/import_/presets/__init__.py`
- `backend/app/services/import_/presets/base.py` — BankPreset ABC + PdfColumnConfig
- `backend/app/services/import_/presets/registry.py` — detect_preset() loop
- `backend/app/services/import_/presets/hsbc_cc.py` — HSBC CC PDF preset
- `backend/app/routers/import_.py` — parse + commit + presets endpoints
- `backend/scripts/eval_pdf_library.py` — PDF library evaluation script
- `backend/tests/services/import_/__init__.py`
- `backend/tests/services/import_/test_encoding.py`
- `backend/tests/services/import_/test_amount_parser.py`
- `backend/tests/services/import_/test_header_mapper.py`
- `backend/tests/services/import_/test_row_validator.py`
- `backend/tests/services/import_/test_csv_parser.py`
- `backend/tests/services/import_/test_excel_parser.py`
- `backend/tests/services/import_/test_pdf_parser.py`
- `backend/tests/services/import_/test_hsbc_cc_preset.py`
- `backend/tests/services/import_/test_duplicate_checker.py`
- `backend/tests/routers/test_import_.py`

**Modified files:**
- `backend/pyproject.toml` — add 7 new dependencies
- `backend/app/config.py` — add import_parse_rate_limit + import_commit_rate_limit
- `backend/app/main.py` — register import router + slowapi middleware

---

## Task 1: Create branch and add dependencies

- [ ] **Create the feature branch**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef
git checkout -b feature/2a-import-backend
```

- [ ] **Add all new backend dependencies**

```bash
cd backend
uv add chardet pandas openpyxl pdfplumber rapidfuzz slowapi python-multipart
```

Expected: `uv.lock` updated, all packages installed.

- [ ] **Verify import**

```bash
uv run python -c "import chardet, pandas, openpyxl, pdfplumber, rapidfuzz, slowapi; print('all ok')"
```

Expected output: `all ok`

- [ ] **Commit**

```bash
git add backend/pyproject.toml backend/uv.lock
git commit -m "chore(import): add chardet, pandas, openpyxl, pdfplumber, rapidfuzz, slowapi, python-multipart"
```

---

## Task 2: PDF Library Evaluation (research)

This task determines which PDF extraction library to use. **Complete before Task 11.**

- [ ] **Create the evaluation script**

Create `backend/scripts/eval_pdf_library.py`:

```python
#!/usr/bin/env python
"""PDF library evaluation script.

Usage:
    cd backend
    uv run python scripts/eval_pdf_library.py path/to/hsbc_statement.pdf

Evaluates pdfplumber vs PyMuPDF (tabula-py and camelot require Java/Ghostscript
and are not practical for containerised deployment — they are noted but not tested).
"""
import sys
import time

if len(sys.argv) < 2:
    print("Usage: python scripts/eval_pdf_library.py <pdf_path>")
    sys.exit(1)

pdf_path = sys.argv[1]


def test_pdfplumber(path: str) -> None:
    import pdfplumber

    t = time.time()
    with pdfplumber.open(path) as pdf:
        pages = len(pdf.pages)
        chars = sum(len(p.extract_text() or "") for p in pdf.pages)
        words = sum(len(p.extract_words() or []) for p in pdf.pages)
    elapsed = time.time() - t
    print(f"pdfplumber : {pages} pages | {chars} chars | {words} words | {elapsed:.3f}s")
    print("  → positional word extraction available (extract_words with x0/top coords)")


def test_pymupdf(path: str) -> None:
    try:
        import fitz  # PyMuPDF

        t = time.time()
        doc = fitz.open(path)
        pages = len(doc)
        chars = sum(len(page.get_text()) for page in doc)
        elapsed = time.time() - t
        print(f"PyMuPDF    : {pages} pages | {chars} chars | {elapsed:.3f}s")
        print("  → word bbox extraction available via page.get_words()")
    except ImportError:
        print("PyMuPDF    : not installed (uv add pymupdf to test)")


def note_tabula() -> None:
    print("tabula-py  : SKIPPED — requires Java JRE (not practical for Docker)")


def note_camelot() -> None:
    print("camelot    : SKIPPED — requires Ghostscript (not practical for Docker)")


print("=" * 60)
print(f"Evaluating: {pdf_path}")
print("=" * 60)
for fn in [test_pdfplumber, test_pymupdf, note_tabula, note_camelot]:
    try:
        fn(pdf_path)  # type: ignore[call-arg]
    except Exception as e:
        print(f"  ERROR: {e}")
print("=" * 60)
print("Decision: pdfplumber is default. Switch to PyMuPDF only if char count")
print("is significantly higher AND word coordinate extraction is equivalent.")
```

- [ ] **Run the evaluation on your HSBC CC PDF**

```bash
cd backend
uv run python scripts/eval_pdf_library.py /path/to/your/hsbc_statement.pdf
```

- [ ] **Write decision record**

Create `docs/superpowers/plans/pdf-library-decision.md`:

```markdown
# PDF Library Decision

**Date:** YYYY-MM-DD
**Evaluated:** pdfplumber, PyMuPDF (tabula-py and camelot excluded: require Java/Ghostscript)

## Results

| Library    | Pages | Chars | Words | Time  | Notes |
|------------|-------|-------|-------|-------|-------|
| pdfplumber | X     | X     | X     | Xs    | ...   |
| PyMuPDF    | X     | X     | n/a   | Xs    | ...   |

## Decision

**Winner: [pdfplumber / PyMuPDF]**

Reason: [1-2 sentences]

## Impact on Plan 2A

If pdfplumber: proceed with Task 11 as written.
If PyMuPDF: in Task 11, replace `pdfplumber.open()` with `fitz.open()` and
`page.extract_words()` with `page.get_words()`. Column bucketing logic is identical.
```

- [ ] **Commit**

```bash
git add backend/scripts/eval_pdf_library.py docs/superpowers/plans/pdf-library-decision.md
git commit -m "docs(import): pdf library evaluation script and decision record"
```

---

## Task 3: Config additions and import schemas

- [ ] **Write failing test for config**

```python
# Add to backend/tests/test_config.py (after existing tests)
def test_import_rate_limit_defaults():
    from app.config import Settings
    import os
    # Ensure env vars not set
    os.environ.pop("IMPORT_PARSE_RATE_LIMIT", None)
    os.environ.pop("IMPORT_COMMIT_RATE_LIMIT", None)
    s = Settings(
        SUPABASE_URL="http://x",
        SUPABASE_ANON_KEY="x",
        SUPABASE_SERVICE_ROLE_KEY="x",
        SUPABASE_JWT_SECRET="x",
        DATABASE_URL="sqlite+aiosqlite://",
    )
    assert s.import_parse_rate_limit == 20
    assert s.import_commit_rate_limit == 5
```

- [ ] **Run test to see it fail**

```bash
cd backend && uv run pytest tests/test_config.py::test_import_rate_limit_defaults -v
```

Expected: `FAILED` — `Settings` has no attribute `import_parse_rate_limit`

- [ ] **Add settings to `backend/app/config.py`**

```python
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_JWT_SECRET: str
    DATABASE_URL: str
    DIRECT_DATABASE_URL: str | None = None

    # App
    APP_ENV: str = "development"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Import rate limits (requests per minute per user)
    import_parse_rate_limit: int = Field(default=20)
    import_commit_rate_limit: int = Field(default=5)

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
```

- [ ] **Run test to see it pass**

```bash
cd backend && uv run pytest tests/test_config.py::test_import_rate_limit_defaults -v
```

Expected: `PASSED`

- [ ] **Create `backend/app/schemas/import_.py`**

```python
"""Pydantic schemas for the import pipeline."""
import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ParsedRow(BaseModel):
    row_index: int
    date: datetime.date | None = None
    description: str = ""
    debit_raw: str = ""
    credit_raw: str = ""
    amount_minor: int | None = None
    currency: str = "EGP"
    type: str = "debit"  # "debit" | "credit"
    status: str = "valid"  # "valid" | "duplicate" | "error"
    error_message: str | None = None
    selected: bool = True
    apply_to_balance: bool = True
    original_currency: str | None = None
    original_amount_minor: int | None = None
    fx_rate: int | None = None


class NeedsMappingResponse(BaseModel):
    result_type: Literal["needs_mapping"] = "needs_mapping"
    headers: list[str]
    sheet_names: list[str] = []
    selected_sheet: str | None = None
    auto_suggest: dict[str, str] = {}  # {field_name: suggested_header}


class ScannedResponse(BaseModel):
    result_type: Literal["scanned"] = "scanned"
    scanned: bool = True


class ParseCompleteResponse(BaseModel):
    result_type: Literal["complete"] = "complete"
    rows: list[ParsedRow]
    detected_preset: str | None = None
    total_rows: int
    valid_rows: int
    error_rows: int
    duplicate_rows: int


class CommitRow(BaseModel):
    date: datetime.date
    description: str = ""
    amount_minor: int
    currency: str
    type: str  # "debit" | "credit"
    apply_to_balance: bool = True
    original_currency: str | None = None
    original_amount_minor: int | None = None
    fx_rate: int | None = None


class CommitRequest(BaseModel):
    account_id: int
    rows: list[CommitRow] = Field(min_length=1)


class CommitResponse(BaseModel):
    batch_id: str
    count: int
    first_transaction_id: int
    balance_delta: int


class PresetInfo(BaseModel):
    id: str
    name: str
    name_ar: str
    formats: list[str]
```

- [ ] **Commit**

```bash
git add backend/app/config.py backend/app/schemas/import_.py backend/tests/test_config.py
git commit -m "feat(import): add rate limit config + import schemas"
```

---

## Task 4: Encoding service

- [ ] **Create `backend/tests/services/import_/__init__.py`** (empty file)

- [ ] **Write failing tests**

Create `backend/tests/services/import_/test_encoding.py`:

```python
import pytest
from app.services.import_.encoding import decode_bytes, detect_encoding


def test_detect_utf8_returns_utf8():
    raw = "CARREFOUR CITY STARS 1,250.00".encode("utf-8")
    enc = detect_encoding(raw)
    assert "utf" in enc.lower()


def test_detect_windows1256():
    raw = "سوبر ماركت".encode("windows-1256")
    enc = detect_encoding(raw)
    assert enc == "windows-1256"


def test_decode_utf8_round_trip():
    original = "CARREFOUR CITY STARS 1,250.00"
    raw = original.encode("utf-8")
    text, enc = decode_bytes(raw)
    assert text == original


def test_decode_arabic_windows1256():
    original = "سوبر ماركت"
    raw = original.encode("windows-1256")
    text, enc = decode_bytes(raw)
    assert "سوبر" in text
    assert enc == "windows-1256"


def test_decode_fallback_on_undecodable():
    # Bytes that cannot be decoded as detected encoding → fallback
    raw = b"\xff\xfe\xfd"
    text, enc = decode_bytes(raw)
    assert isinstance(text, str)  # must not raise
```

- [ ] **Run tests to see them fail**

```bash
cd backend && uv run pytest tests/services/import_/test_encoding.py -v
```

Expected: `ERROR` — module `app.services.import_.encoding` not found

- [ ] **Create `backend/app/services/import_/__init__.py`** (empty file)

- [ ] **Create `backend/app/services/import_/encoding.py`**

```python
"""Encoding detection for bank statement files (handles Windows-1256 Arabic CSVs)."""
import chardet


def detect_encoding(raw_bytes: bytes) -> str:
    """Return best-guess encoding. Normalises Windows-1256 variants. Falls back to utf-8."""
    result = chardet.detect(raw_bytes)
    encoding = (result.get("encoding") or "utf-8").lower()
    if encoding in ("windows-1256", "cp1256"):
        return "windows-1256"
    return encoding


def decode_bytes(raw_bytes: bytes) -> tuple[str, str]:
    """Decode raw bytes. Returns (text, encoding_used). Never raises."""
    encoding = detect_encoding(raw_bytes)
    try:
        return raw_bytes.decode(encoding), encoding
    except (UnicodeDecodeError, LookupError):
        return raw_bytes.decode("utf-8", errors="replace"), "utf-8"
```

- [ ] **Run tests to see them pass**

```bash
cd backend && uv run pytest tests/services/import_/test_encoding.py -v
```

Expected: 5 PASSED

- [ ] **Commit**

```bash
git add backend/app/services/import_/__init__.py backend/app/services/import_/encoding.py \
        backend/tests/services/import_/__init__.py backend/tests/services/import_/test_encoding.py
git commit -m "feat(import): encoding service with chardet + Windows-1256 support"
```

---

## Task 5: Amount parser

- [ ] **Write failing tests**

Create `backend/tests/services/import_/test_amount_parser.py`:

```python
import pytest
from app.services.import_.amount_parser import normalize_arabic_numerals, parse_amount_to_minor


def test_arabic_indic_normalization():
    assert normalize_arabic_numerals("١٢٣٤") == "1234"


def test_arabic_decimal_separator():
    assert normalize_arabic_numerals("١٬٢٥٠٫٠٠") == "1,250.00"


def test_simple_positive():
    assert parse_amount_to_minor("1250.00") == 125000


def test_simple_negative_dash():
    assert parse_amount_to_minor("-1250.00") == -125000


def test_dr_suffix():
    assert parse_amount_to_minor("1,250.00 DR") == -125000


def test_cr_suffix():
    assert parse_amount_to_minor("1,250.00 CR") == 125000


def test_parentheses_negative():
    assert parse_amount_to_minor("(1,250.00)") == -125000


def test_thousands_comma():
    assert parse_amount_to_minor("10,000.00") == 1000000


def test_european_format_dot_thousands():
    assert parse_amount_to_minor("1.250,00") == 125000


def test_arabic_indic_amount():
    assert parse_amount_to_minor("١٬٢٥٠٫٠٠") == 125000


def test_three_decimal_kwd():
    assert parse_amount_to_minor("1.250", currency_exponent=3) == 1250


def test_empty_returns_none():
    assert parse_amount_to_minor("") is None


def test_whitespace_returns_none():
    assert parse_amount_to_minor("   ") is None


def test_text_only_returns_none():
    assert parse_amount_to_minor("N/A") is None
```

- [ ] **Run tests to see them fail**

```bash
cd backend && uv run pytest tests/services/import_/test_amount_parser.py -v
```

Expected: ERROR — module not found

- [ ] **Create `backend/app/services/import_/amount_parser.py`**

```python
"""Amount string parsing for Egyptian bank exports.

Handles: Arabic-Indic numerals, DR/CR suffixes, parentheses negation,
comma/dot as thousands or decimal separator, European format (1.234,56).
"""
import re
from decimal import Decimal, InvalidOperation

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
        text.startswith("-")
        or "DR" in text_upper
        or (text.startswith("(") and text.endswith(")"))
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
        if len(parts) == 2 and len(parts[1]) <= 2:
            # 1234,56 → decimal
            cleaned = cleaned.replace(",", ".")
        else:
            # 1,234,567 → thousands
            cleaned = cleaned.replace(",", "")

    try:
        amount = Decimal(cleaned)
    except InvalidOperation:
        return None

    minor = int(amount * (10**currency_exponent))
    return -minor if negative else minor
```

- [ ] **Run tests to see them pass**

```bash
cd backend && uv run pytest tests/services/import_/test_amount_parser.py -v
```

Expected: 13 PASSED

- [ ] **Commit**

```bash
git add backend/app/services/import_/amount_parser.py \
        backend/tests/services/import_/test_amount_parser.py
git commit -m "feat(import): amount parser — Arabic numerals, DR/CR, varied separators"
```

---

## Task 6: Header mapper (fuzzy)

- [ ] **Write failing tests**

Create `backend/tests/services/import_/test_header_mapper.py`:

```python
import pytest
from app.services.import_.header_mapper import get_auto_suggest


def test_exact_match_date():
    result = get_auto_suggest(["Date", "Description", "Debit", "Credit", "Balance"])
    assert result.get("date") == "Date"


def test_exact_match_all_fields():
    headers = ["Date", "Description", "Debit", "Credit", "Balance"]
    result = get_auto_suggest(headers)
    assert result["date"] == "Date"
    assert result["description"] == "Description"
    assert result["debit"] == "Debit"
    assert result["credit"] == "Credit"
    assert result["balance"] == "Balance"


def test_fuzzy_match_narration():
    # "Narration" should map to "description"
    result = get_auto_suggest(["Transaction Date", "Narration", "Withdrawal Amt", "Deposit Amt"])
    assert result.get("description") == "Narration"


def test_fuzzy_match_withdrawal():
    result = get_auto_suggest(["Date", "Details", "Withdrawal", "Deposit"])
    assert result.get("debit") == "Withdrawal"
    assert result.get("credit") == "Deposit"


def test_low_confidence_omitted():
    # "Ref" has no meaningful match to any field → omitted
    result = get_auto_suggest(["Ref", "XYZ_Col", "Foo"])
    assert len(result) == 0


def test_arabic_header_date():
    result = get_auto_suggest(["تاريخ", "البيان", "سحب", "إيداع"])
    assert result.get("date") == "تاريخ"
```

- [ ] **Run tests to see them fail**

```bash
cd backend && uv run pytest tests/services/import_/test_header_mapper.py -v
```

Expected: ERROR — module not found

- [ ] **Create `backend/app/services/import_/header_mapper.py`**

```python
"""Fuzzy header-to-field mapper using rapidfuzz.

Maps CSV/Excel column headers to canonical import fields:
date, description, debit, credit, balance.
"""
from rapidfuzz import fuzz

# Canonical aliases per field (lowercase). Add new aliases as banks are discovered.
_FIELD_ALIASES: dict[str, list[str]] = {
    "date": [
        "date", "transaction date", "trans date", "value date",
        "booking date", "posting date", "تاريخ",
    ],
    "description": [
        "description", "narration", "details", "merchant", "memo",
        "particulars", "narrative", "البيان", "الوصف", "تفاصيل",
    ],
    "debit": [
        "debit", "withdrawal", "dr", "amount dr", "debit amount",
        "paid out", "withdrawals", "withdrawal amt", "سحب", "مدين",
    ],
    "credit": [
        "credit", "deposit", "cr", "amount cr", "credit amount",
        "paid in", "deposits", "deposit amt", "إيداع", "دائن",
    ],
    "balance": [
        "balance", "running balance", "available balance",
        "ledger balance", "رصيد",
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
```

- [ ] **Run tests to see them pass**

```bash
cd backend && uv run pytest tests/services/import_/test_header_mapper.py -v
```

Expected: 6 PASSED

- [ ] **Commit**

```bash
git add backend/app/services/import_/header_mapper.py \
        backend/tests/services/import_/test_header_mapper.py
git commit -m "feat(import): fuzzy header mapper with rapidfuzz"
```

---

## Task 7: Row validator

- [ ] **Write failing tests**

Create `backend/tests/services/import_/test_row_validator.py`:

```python
import datetime
import pytest
from app.services.import_.row_validator import validate_row


def test_valid_debit_row():
    row = validate_row(0, "15/03/2026", "CARREFOUR", "1250.00", "", "DD/MM/YYYY", "EGP")
    assert row.status == "valid"
    assert row.date == datetime.date(2026, 3, 15)
    assert row.amount_minor == -125000  # debit → negative
    assert row.type == "debit"


def test_valid_credit_row():
    row = validate_row(0, "15/03/2026", "SALARY", "", "5000.00", "DD/MM/YYYY", "EGP")
    assert row.status == "valid"
    assert row.amount_minor == 500000  # credit → positive


def test_invalid_date_returns_error():
    row = validate_row(0, "NOT_A_DATE", "MERCHANT", "100.00", "", "DD/MM/YYYY", "EGP")
    assert row.status == "error"
    assert "Cannot parse date" in (row.error_message or "")


def test_invalid_amount_returns_error():
    row = validate_row(0, "15/03/2026", "MERCHANT", "N/A", "", "DD/MM/YYYY", "EGP")
    assert row.status == "error"
    assert "Cannot parse amount" in (row.error_message or "")


def test_yyyy_mm_dd_format():
    row = validate_row(0, "2026-03-15", "MERCHANT", "100.00", "", "YYYY-MM-DD", "EGP")
    assert row.date == datetime.date(2026, 3, 15)


def test_row_index_preserved():
    row = validate_row(42, "15/03/2026", "MERCHANT", "100.00", "", "DD/MM/YYYY", "EGP")
    assert row.row_index == 42
```

- [ ] **Run tests to see them fail**

```bash
cd backend && uv run pytest tests/services/import_/test_row_validator.py -v
```

Expected: ERROR — module not found

- [ ] **Create `backend/app/services/import_/row_validator.py`**

```python
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
```

- [ ] **Run tests to see them pass**

```bash
cd backend && uv run pytest tests/services/import_/test_row_validator.py -v
```

Expected: 6 PASSED

- [ ] **Commit**

```bash
git add backend/app/services/import_/row_validator.py \
        backend/tests/services/import_/test_row_validator.py
git commit -m "feat(import): row validator — date + amount parsing with error status"
```

---

## Task 8: BankPreset ABC and registry

No tests needed for abstract base — tested via HSBC CC preset in Task 12.

- [ ] **Create `backend/app/services/import_/presets/__init__.py`** (empty)

- [ ] **Create `backend/app/services/import_/presets/base.py`**

```python
"""Abstract base class for all bank import presets."""
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class PdfColumnConfig:
    """X-coordinate column ranges for pdfplumber positional word extraction.

    ⚠️  X-ranges must be calibrated against a real bank PDF.
    Use the eval_pdf_library.py script + pdfplumber's debug visualisation to
    determine accurate ranges. Values here are illustrative starting points.
    """
    date_x_range: tuple[float, float]
    description_x_range: tuple[float, float]
    debit_x_range: tuple[float, float]
    credit_x_range: tuple[float, float]
    balance_x_range: tuple[float, float] | None = None
    y_tolerance: float = 3.0  # Group words within 3pt vertically into same row


class BankPreset(ABC):
    """Abstract base for all bank import presets."""

    @property
    @abstractmethod
    def preset_id(self) -> str:
        """Unique identifier, e.g. 'hsbc_cc'."""

    @property
    @abstractmethod
    def name(self) -> str:
        """English display name."""

    @property
    @abstractmethod
    def name_ar(self) -> str:
        """Arabic display name."""

    @property
    @abstractmethod
    def formats(self) -> list[str]:
        """Supported formats: subset of ['csv', 'excel', 'pdf']."""

    @abstractmethod
    def detect(self, content: bytes, headers: list[str] | None = None) -> bool:
        """Return True if this file matches this preset's signature."""

    def get_column_mapping(self) -> dict[str, str] | None:
        """Column header mapping for CSV/Excel. None for PDF-only presets."""
        return None

    def get_pdf_config(self) -> PdfColumnConfig | None:
        """X-range config for PDF positional extraction. None for CSV/Excel presets."""
        return None

    def get_date_format(self) -> str:
        """Expected date format string (user-facing notation)."""
        return "DD/MM/YYYY"
```

- [ ] **Create `backend/app/services/import_/presets/registry.py`**

```python
"""Preset registry. Presets are tried in order — first match wins."""
from app.services.import_.presets.base import BankPreset
from app.services.import_.presets.hsbc_cc import HsbcCcPreset

_PRESETS: list[BankPreset] = [
    HsbcCcPreset(),
]


def detect_preset(content: bytes, headers: list[str] | None = None) -> BankPreset | None:
    """Return the first preset that matches the file, or None."""
    for preset in _PRESETS:
        try:
            if preset.detect(content, headers):
                return preset
        except Exception:
            continue
    return None


def list_presets() -> list[BankPreset]:
    """Return all registered presets."""
    return list(_PRESETS)
```

- [ ] **Commit**

```bash
git add backend/app/services/import_/presets/
git commit -m "feat(import): BankPreset ABC + preset registry"
```

---

## Task 9: CSV parser

- [ ] **Write failing tests**

Create `backend/tests/services/import_/test_csv_parser.py`:

```python
import pytest
from app.services.import_.csv_parser import get_headers, parse_csv


_SAMPLE_CSV = b"""Date,Description,Debit,Credit,Balance
15/03/2026,CARREFOUR CITY STARS,1250.00,,45230.50
16/03/2026,SALARY DEPOSIT,,50000.00,95230.50
17/03/2026,ATM WITHDRAWAL,500.00,,94730.50
"""

_MAPPING = {"date": "Date", "description": "Description", "debit": "Debit", "credit": "Credit"}


def test_get_headers():
    headers = get_headers(_SAMPLE_CSV)
    assert headers == ["Date", "Description", "Debit", "Credit", "Balance"]


def test_parse_csv_debit_row():
    rows = parse_csv(_SAMPLE_CSV, _MAPPING, date_format="DD/MM/YYYY", currency="EGP")
    assert rows[0].status == "valid"
    assert rows[0].amount_minor == -125000
    assert rows[0].type == "debit"
    assert rows[0].description == "CARREFOUR CITY STARS"


def test_parse_csv_credit_row():
    rows = parse_csv(_SAMPLE_CSV, _MAPPING, date_format="DD/MM/YYYY", currency="EGP")
    assert rows[1].status == "valid"
    assert rows[1].amount_minor == 5000000
    assert rows[1].type == "credit"


def test_parse_csv_row_count():
    rows = parse_csv(_SAMPLE_CSV, _MAPPING, date_format="DD/MM/YYYY", currency="EGP")
    assert len(rows) == 3


def test_parse_csv_windows1256_encoding():
    arabic_csv = "التاريخ,البيان,المبلغ\n15/03/2026,كارفور,1250.00\n".encode("windows-1256")
    mapping = {"date": "التاريخ", "description": "البيان", "debit": "المبلغ"}
    rows = parse_csv(arabic_csv, mapping, date_format="DD/MM/YYYY", currency="EGP")
    assert rows[0].status == "valid"


def test_parse_csv_skip_rows():
    csv_with_header = b"Bank: CIB\nDate,Description,Debit,Credit\n15/03/2026,MERCHANT,100.00,\n"
    mapping = {"date": "Date", "description": "Description", "debit": "Debit"}
    rows = parse_csv(csv_with_header, mapping, date_format="DD/MM/YYYY", currency="EGP", skip_rows=1)
    assert len(rows) == 1
    assert rows[0].status == "valid"
```

- [ ] **Run tests to see them fail**

```bash
cd backend && uv run pytest tests/services/import_/test_csv_parser.py -v
```

Expected: ERROR — module not found

- [ ] **Create `backend/app/services/import_/csv_parser.py`**

```python
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
                idx, date_raw, desc_raw,
                str(row_dict.get(amount_col, "")), "",
                date_format, currency, currency_exponent,
            )
        else:
            row = validate_row(
                idx, date_raw, desc_raw,
                str(row_dict.get(debit_col, "")),
                str(row_dict.get(credit_col, "")),
                date_format, currency, currency_exponent,
            )
        rows.append(row)

    return rows
```

- [ ] **Run tests to see them pass**

```bash
cd backend && uv run pytest tests/services/import_/test_csv_parser.py -v
```

Expected: 6 PASSED

- [ ] **Commit**

```bash
git add backend/app/services/import_/csv_parser.py \
        backend/tests/services/import_/test_csv_parser.py
git commit -m "feat(import): CSV parser with encoding detection and column mapping"
```

---

## Task 10: Excel parser

- [ ] **Write failing tests**

Create `backend/tests/services/import_/test_excel_parser.py`:

```python
import io
import datetime
import pytest
import openpyxl

from app.services.import_.excel_parser import get_headers, get_sheet_names, parse_excel


def _make_xlsx(rows: list[list]) -> bytes:
    """Helper: create in-memory XLSX from a list of rows."""
    wb = openpyxl.Workbook()
    ws = wb.active
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


_XLSX_BYTES = _make_xlsx([
    ["Date", "Description", "Debit", "Credit"],
    ["15/03/2026", "CARREFOUR", 1250.00, None],
    ["16/03/2026", "SALARY", None, 50000.00],
])

_MAPPING = {"date": "Date", "description": "Description", "debit": "Debit", "credit": "Credit"}


def test_get_headers():
    headers = get_headers(_XLSX_BYTES)
    assert headers == ["Date", "Description", "Debit", "Credit"]


def test_get_sheet_names():
    sheets = get_sheet_names(_XLSX_BYTES)
    assert len(sheets) >= 1


def test_parse_debit_row():
    rows = parse_excel(_XLSX_BYTES, _MAPPING, date_format="DD/MM/YYYY", currency="EGP")
    assert rows[0].status == "valid"
    assert rows[0].amount_minor == -125000


def test_parse_credit_row():
    rows = parse_excel(_XLSX_BYTES, _MAPPING, date_format="DD/MM/YYYY", currency="EGP")
    assert rows[1].amount_minor == 5000000
    assert rows[1].type == "credit"


def test_datetime_cell_parsed():
    """Excel may return datetime objects for date cells."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Date", "Description", "Debit"])
    ws.append([datetime.datetime(2026, 3, 15), "MERCHANT", 100])
    buf = io.BytesIO()
    wb.save(buf)
    raw = buf.getvalue()
    rows = parse_excel(raw, {"date": "Date", "description": "Description", "debit": "Debit"},
                       date_format="DD/MM/YYYY", currency="EGP")
    assert rows[0].date == datetime.date(2026, 3, 15)


def test_multi_sheet_selection():
    wb = openpyxl.Workbook()
    ws1 = wb.active
    ws1.title = "Summary"
    ws1.append(["Date", "Description", "Debit"])
    ws1.append(["15/03/2026", "MERCHANT", 100])
    ws2 = wb.create_sheet("Transactions")
    ws2.append(["Date", "Description", "Debit"])
    ws2.append(["16/03/2026", "SALARY", 200])
    buf = io.BytesIO()
    wb.save(buf)
    raw = buf.getvalue()

    rows = parse_excel(raw, {"date": "Date", "description": "Description", "debit": "Debit"},
                       sheet_name="Transactions", date_format="DD/MM/YYYY", currency="EGP")
    assert len(rows) == 1
    assert rows[0].description == "SALARY"
```

- [ ] **Run tests to see them fail**

```bash
cd backend && uv run pytest tests/services/import_/test_excel_parser.py -v
```

Expected: ERROR — module not found

- [ ] **Create `backend/app/services/import_/excel_parser.py`**

```python
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
    data_rows = all_rows[skip_rows + 1:]

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
                idx, date_raw, desc_raw,
                cell_str(row_data, amount_idx), "",
                date_format, currency, currency_exponent,
            )
        else:
            row = validate_row(
                idx, date_raw, desc_raw,
                cell_str(row_data, debit_idx),
                cell_str(row_data, credit_idx),
                date_format, currency, currency_exponent,
            )
        rows.append(row)

    return rows
```

- [ ] **Run tests to see them pass**

```bash
cd backend && uv run pytest tests/services/import_/test_excel_parser.py -v
```

Expected: 6 PASSED

- [ ] **Commit**

```bash
git add backend/app/services/import_/excel_parser.py \
        backend/tests/services/import_/test_excel_parser.py
git commit -m "feat(import): Excel parser with sheet selection and datetime cell handling"
```

---

## Task 11: PDF parser and scanned detection

**Prerequisite:** Task 2 (PDF library evaluation) must be complete. Use pdfplumber unless evaluation determined otherwise.

- [ ] **Write failing tests**

Create `backend/tests/services/import_/test_pdf_parser.py`:

```python
import io
from unittest.mock import MagicMock, patch

import pytest

from app.services.import_.pdf_parser import is_scanned


def _make_mock_pdf(pages_text: list[str]):
    """Create a mock pdfplumber PDF object with specified text per page."""
    mock_pages = []
    for text in pages_text:
        page = MagicMock()
        page.extract_text.return_value = text
        page.extract_words.return_value = []
        mock_pages.append(page)
    mock_pdf = MagicMock()
    mock_pdf.pages = mock_pages
    mock_pdf.__enter__ = lambda s: s
    mock_pdf.__exit__ = MagicMock(return_value=False)
    return mock_pdf


def test_text_pdf_not_scanned():
    rich_text = "Transaction Date Description Debit Credit Balance\n" * 10
    mock_pdf = _make_mock_pdf([rich_text])
    with patch("app.services.import_.pdf_parser.pdfplumber") as mock_lib:
        mock_lib.open.return_value = mock_pdf
        result = is_scanned(b"fake_pdf")
    assert result is False


def test_scanned_pdf_detected():
    # Less than 50 chars per page on average
    mock_pdf = _make_mock_pdf(["", "   ", ""])
    with patch("app.services.import_.pdf_parser.pdfplumber") as mock_lib:
        mock_lib.open.return_value = mock_pdf
        result = is_scanned(b"fake_pdf")
    assert result is True


def test_empty_pdf_is_scanned():
    mock_pdf = _make_mock_pdf([])
    with patch("app.services.import_.pdf_parser.pdfplumber") as mock_lib:
        mock_lib.open.return_value = mock_pdf
        result = is_scanned(b"fake_pdf")
    assert result is True
```

- [ ] **Run tests to see them fail**

```bash
cd backend && uv run pytest tests/services/import_/test_pdf_parser.py -v
```

Expected: ERROR — module not found

- [ ] **Create `backend/app/services/import_/pdf_parser.py`**

```python
"""PDF text extraction and scanned-document detection.

Uses pdfplumber by default (pure Python, positional word extraction).
If the PDF library evaluation (Task 2) determined PyMuPDF is better,
replace `pdfplumber.open()` with `fitz.open()` and `page.extract_text()`
with `page.get_text()`. The scanned-detection logic is library-agnostic.
"""
import io

import pdfplumber

_SCANNED_CHARS_PER_PAGE_THRESHOLD = 50


def extract_text_pages(content: bytes) -> list[str]:
    """Extract text from each page. Returns list of page text strings."""
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        return [page.extract_text() or "" for page in pdf.pages]


def is_scanned(content: bytes) -> bool:
    """Return True if the PDF appears to be scanned (too little extractable text).

    Heuristic: if average character count per page < 50, classify as scanned.
    """
    pages = extract_text_pages(content)
    if not pages:
        return True
    avg_chars = sum(len(p) for p in pages) / len(pages)
    return avg_chars < _SCANNED_CHARS_PER_PAGE_THRESHOLD
```

- [ ] **Run tests to see them pass**

```bash
cd backend && uv run pytest tests/services/import_/test_pdf_parser.py -v
```

Expected: 3 PASSED

- [ ] **Commit**

```bash
git add backend/app/services/import_/pdf_parser.py \
        backend/tests/services/import_/test_pdf_parser.py
git commit -m "feat(import): PDF parser with pdfplumber and scanned document detection"
```

---

## Task 12: HSBC CC preset

> **Calibration note:** The X-coordinate ranges in `hsbc_cc.py` are starting estimates.
> Before shipping, run this against a real HSBC CC PDF:
>
> ```python
> import pdfplumber, io
> with pdfplumber.open("your_hsbc.pdf") as pdf:
>     words = pdf.pages[0].extract_words()
>     for w in words[:30]:
>         print(f"x0={w['x0']:.1f} x1={w['x1']:.1f} top={w['top']:.1f} text={w['text']}")
> ```
>
> Use the printed coordinates to calibrate the ranges in `HSBC_CC_PDF_CONFIG`.

- [ ] **Write failing tests**

Create `backend/tests/services/import_/test_hsbc_cc_preset.py`:

```python
from unittest.mock import MagicMock, patch

import pytest

from app.services.import_.presets.hsbc_cc import HsbcCcPreset


preset = HsbcCcPreset()


def _mock_pdf(first_page_text: str):
    page = MagicMock()
    page.extract_text.return_value = first_page_text
    page.extract_words.return_value = []
    mock_pdf = MagicMock()
    mock_pdf.pages = [page]
    mock_pdf.__enter__ = lambda s: s
    mock_pdf.__exit__ = MagicMock(return_value=False)
    return mock_pdf


def test_detect_cashback_variant():
    with patch("app.services.import_.presets.hsbc_cc.pdfplumber") as mock_lib:
        mock_lib.open.return_value = _mock_pdf("HSBC CASHBACK CREDIT CARD STATEMENT")
        assert preset.detect(b"fake_pdf") is True


def test_detect_platinum_variant():
    with patch("app.services.import_.presets.hsbc_cc.pdfplumber") as mock_lib:
        mock_lib.open.return_value = _mock_pdf("HSBC PLATINUM CREDIT CARD")
        assert preset.detect(b"fake_pdf") is True


def test_detect_premier_variant():
    with patch("app.services.import_.presets.hsbc_cc.pdfplumber") as mock_lib:
        mock_lib.open.return_value = _mock_pdf("HSBC PREMIER CREDIT CARD")
        assert preset.detect(b"fake_pdf") is True


def test_no_match_returns_false():
    with patch("app.services.import_.presets.hsbc_cc.pdfplumber") as mock_lib:
        mock_lib.open.return_value = _mock_pdf("BANK MISR STATEMENT")
        assert preset.detect(b"fake_pdf") is False


def test_detect_variant_cashback():
    with patch("app.services.import_.presets.hsbc_cc.pdfplumber") as mock_lib:
        mock_lib.open.return_value = _mock_pdf("CASHBACK REWARDS STATEMENT")
        result = preset.detect_variant(b"fake_pdf")
    assert result == "cashback"


def test_preset_metadata():
    assert preset.preset_id == "hsbc_cc"
    assert "pdf" in preset.formats
    assert preset.name_ar != ""
```

- [ ] **Run tests to see them fail**

```bash
cd backend && uv run pytest tests/services/import_/test_hsbc_cc_preset.py -v
```

Expected: ERROR — module not found

- [ ] **Create `backend/app/services/import_/presets/hsbc_cc.py`**

```python
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
                    re.search(pattern, first_page_text)
                    for pattern in _VARIANT_PATTERNS.values()
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
                words = page.extract_words(x_tolerance=3, y_tolerance=3) or []

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
```

- [ ] **Run tests to see them pass**

```bash
cd backend && uv run pytest tests/services/import_/test_hsbc_cc_preset.py -v
```

Expected: 6 PASSED

- [ ] **Commit**

```bash
git add backend/app/services/import_/presets/hsbc_cc.py \
        backend/tests/services/import_/test_hsbc_cc_preset.py
git commit -m "feat(import): HSBC CC PDF preset with card variant detection and X-range extraction"
```

---

## Task 13: Duplicate checker

- [ ] **Write failing tests**

Create `backend/tests/services/import_/test_duplicate_checker.py`:

```python
import datetime
import pytest
from app.services.import_.duplicate_checker import _make_hash, is_duplicate, mark_duplicates
from app.schemas.import_ import ParsedRow


def test_make_hash_same_inputs_same_hash():
    h1 = _make_hash(1, datetime.date(2026, 3, 15), -125000, "CARREFOUR")
    h2 = _make_hash(1, datetime.date(2026, 3, 15), -125000, "CARREFOUR")
    assert h1 == h2


def test_make_hash_different_account_different_hash():
    h1 = _make_hash(1, datetime.date(2026, 3, 15), -125000, "CARREFOUR")
    h2 = _make_hash(2, datetime.date(2026, 3, 15), -125000, "CARREFOUR")
    assert h1 != h2


def test_is_duplicate_match():
    existing = {_make_hash(1, datetime.date(2026, 3, 15), -125000, "CARREFOUR")}
    assert is_duplicate(1, datetime.date(2026, 3, 15), -125000, "CARREFOUR", existing) is True


def test_is_duplicate_no_match():
    existing = {_make_hash(1, datetime.date(2026, 3, 15), -125000, "CARREFOUR")}
    assert is_duplicate(1, datetime.date(2026, 3, 16), -125000, "CARREFOUR", existing) is False


def test_mark_duplicates_sets_status():
    existing = {_make_hash(1, datetime.date(2026, 3, 15), -125000, "CARREFOUR")}
    rows = [
        ParsedRow(row_index=0, date=datetime.date(2026, 3, 15), amount_minor=-125000,
                  description="CARREFOUR", status="valid"),
        ParsedRow(row_index=1, date=datetime.date(2026, 3, 16), amount_minor=-50000,
                  description="ATM", status="valid"),
    ]
    result = mark_duplicates(rows, 1, existing)
    assert result[0].status == "duplicate"
    assert result[0].selected is False
    assert result[1].status == "valid"


def test_mark_duplicates_skips_error_rows():
    existing = {_make_hash(1, datetime.date(2026, 3, 15), -125000, "CARREFOUR")}
    rows = [
        ParsedRow(row_index=0, date=datetime.date(2026, 3, 15), amount_minor=-125000,
                  description="CARREFOUR", status="error"),  # already error — skip dedup
    ]
    result = mark_duplicates(rows, 1, existing)
    assert result[0].status == "error"  # unchanged
```

- [ ] **Run tests to see them fail**

```bash
cd backend && uv run pytest tests/services/import_/test_duplicate_checker.py -v
```

Expected: ERROR — module not found

- [ ] **Create `backend/app/services/import_/duplicate_checker.py`**

```python
"""Duplicate transaction detection for import pipeline.

Strategy: load all existing transaction hashes for the account in one query (O(N)),
then check each parsed row in O(1). Total: one DB round trip per import session.
"""
import datetime
import hashlib

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction
from app.schemas.import_ import ParsedRow


def _make_hash(account_id: int, date: datetime.date, amount_minor: int, description: str) -> str:
    """Create a stable dedup hash for (account, date, amount, description)."""
    key = f"{account_id}|{date.isoformat()}|{amount_minor}|{description.lower().strip()}"
    return hashlib.md5(key.encode()).hexdigest()  # noqa: S324


async def load_existing_hashes(session: AsyncSession, account_id: int) -> set[str]:
    """Load all transaction dedup hashes for an account in one query."""
    result = await session.execute(
        select(Transaction.date, Transaction.amount_minor, Transaction.description)
        .where(
            Transaction.account_id == account_id,
            Transaction.is_active.is_(True),
        )
    )
    return {
        _make_hash(account_id, row.date, row.amount_minor, row.description or "")
        for row in result.all()
    }


def is_duplicate(
    account_id: int,
    date: datetime.date,
    amount_minor: int,
    description: str,
    existing_hashes: set[str],
) -> bool:
    """Check if a transaction already exists in the hash set."""
    return _make_hash(account_id, date, amount_minor, description) in existing_hashes


def mark_duplicates(
    rows: list[ParsedRow],
    account_id: int,
    existing_hashes: set[str],
) -> list[ParsedRow]:
    """Mark rows as 'duplicate' and deselect them. Mutates and returns rows."""
    for row in rows:
        if row.status != "valid":
            continue
        if row.date is not None and row.amount_minor is not None:
            if is_duplicate(account_id, row.date, row.amount_minor, row.description, existing_hashes):
                row.status = "duplicate"
                row.selected = False
    return rows
```

- [ ] **Run tests to see them pass**

```bash
cd backend && uv run pytest tests/services/import_/test_duplicate_checker.py -v
```

Expected: 6 PASSED

- [ ] **Commit**

```bash
git add backend/app/services/import_/duplicate_checker.py \
        backend/tests/services/import_/test_duplicate_checker.py
git commit -m "feat(import): duplicate checker — MD5 hash set, one DB query per import"
```

---

## Task 14: Import service (orchestrator)

- [ ] **Create `backend/app/services/import_/import_service.py`**

```python
"""Import pipeline orchestrator.

parse_upload() runs the decision tree and returns one of:
  - ScannedResponse      → frontend shows upgrade prompt
  - NeedsMappingResponse → frontend shows column mapper
  - ParseCompleteResponse → frontend shows preview table

commit_import() atomically inserts transactions. Balance is NOT updated on the
account model (balance is computed dynamically: seed + sum of transactions).
"""
import io
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.enums import TransactionType
from app.models.transaction import Transaction
from app.schemas.import_ import (
    CommitRequest,
    CommitResponse,
    NeedsMappingResponse,
    ParseCompleteResponse,
    ParsedRow,
    ScannedResponse,
)
from app.services.import_.csv_parser import get_headers as csv_headers, parse_csv
from app.services.import_.duplicate_checker import load_existing_hashes, mark_duplicates
from app.services.import_.excel_parser import (
    get_headers as excel_headers,
    get_sheet_names,
    parse_excel,
)
from app.services.import_.header_mapper import get_auto_suggest
from app.services.import_.pdf_parser import is_scanned
from app.services.import_.presets.registry import detect_preset


def _detect_format(filename: str, content_type: str | None) -> str:
    name = filename.lower()
    if name.endswith(".csv"):
        return "csv"
    if name.endswith((".xlsx", ".xls")):
        return "excel"
    if name.endswith(".pdf"):
        return "pdf"
    if content_type:
        ct = content_type.lower()
        if "csv" in ct or "text/plain" in ct:
            return "csv"
        if "spreadsheet" in ct or "excel" in ct:
            return "excel"
        if "pdf" in ct:
            return "pdf"
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={"error": {"code": "UNSUPPORTED_FORMAT",
                          "message": "Only CSV, Excel (.xlsx/.xls), and PDF are supported"}},
    )


def _complete(rows: list[ParsedRow], preset_id: str | None) -> ParseCompleteResponse:
    return ParseCompleteResponse(
        rows=rows,
        detected_preset=preset_id,
        total_rows=len(rows),
        valid_rows=sum(1 for r in rows if r.status == "valid"),
        error_rows=sum(1 for r in rows if r.status == "error"),
        duplicate_rows=sum(1 for r in rows if r.status == "duplicate"),
    )


async def parse_upload(
    raw_bytes: bytes,
    filename: str,
    account_id: int,
    currency: str,
    session: AsyncSession,
    household_id: uuid.UUID,
    column_mapping: dict[str, str] | None = None,
    date_format: str = "DD/MM/YYYY",
    sheet_name: str | None = None,
    content_type: str | None = None,
) -> ScannedResponse | NeedsMappingResponse | ParseCompleteResponse:
    """Orchestrate file parsing. Returns one of three response variants."""
    fmt = _detect_format(filename, content_type)
    existing_hashes = await load_existing_hashes(session, account_id)

    # ── PDF path ───────────────────────────────────────────────────────────
    if fmt == "pdf":
        if is_scanned(raw_bytes):
            return ScannedResponse()

        preset = detect_preset(raw_bytes)
        if preset is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"error": {
                    "code": "UNSUPPORTED_FORMAT",
                    "message": "PDF format not recognized. Supported: HSBC Credit Card PDF",
                }},
            )

        rows = preset.parse(raw_bytes, currency=currency)
        mark_duplicates(rows, account_id, existing_hashes)
        return _complete(rows, preset.preset_id)

    # ── CSV / Excel with explicit mapping (second parse call) ──────────────
    if column_mapping:
        if fmt == "csv":
            rows = parse_csv(raw_bytes, column_mapping, date_format=date_format, currency=currency)
        else:
            rows = parse_excel(
                raw_bytes, column_mapping,
                sheet_name=sheet_name, date_format=date_format, currency=currency,
            )
        mark_duplicates(rows, account_id, existing_hashes)
        return _complete(rows, None)

    # ── CSV: try preset, else needs_mapping ────────────────────────────────
    if fmt == "csv":
        headers = csv_headers(raw_bytes)
        preset = detect_preset(raw_bytes, headers)
        if preset and preset.get_column_mapping():
            rows = parse_csv(
                raw_bytes, preset.get_column_mapping(),  # type: ignore[arg-type]
                date_format=preset.get_date_format(), currency=currency,
            )
            mark_duplicates(rows, account_id, existing_hashes)
            return _complete(rows, preset.preset_id)
        auto_suggest = get_auto_suggest(headers)
        return NeedsMappingResponse(headers=headers, auto_suggest=auto_suggest)

    # ── Excel: return sheet info + headers + auto_suggest ─────────────────
    sheets = get_sheet_names(raw_bytes)
    active_sheet = sheet_name or (sheets[0] if sheets else None)
    headers = excel_headers(raw_bytes, sheet_name=active_sheet)
    auto_suggest = get_auto_suggest(headers)
    return NeedsMappingResponse(
        headers=headers,
        sheet_names=sheets,
        selected_sheet=active_sheet,
        auto_suggest=auto_suggest,
    )


async def commit_import(
    data: CommitRequest,
    session: AsyncSession,
    household_id: uuid.UUID,
) -> CommitResponse:
    """Atomically insert transactions. Does NOT update account.balance_minor
    (displayed balance is computed from seed + sum of transactions)."""
    # Verify account belongs to household
    result = await session.execute(
        select(Account).where(
            Account.id == data.account_id,
            Account.household_id == household_id,
            Account.is_active.is_(True),
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account not found")

    batch_id = uuid.uuid4()
    first_tx_id: int | None = None
    balance_delta = 0

    for commit_row in data.rows:
        tx = Transaction(
            household_id=household_id,
            account_id=data.account_id,
            date=commit_row.date,
            description=commit_row.description,
            amount_minor=commit_row.amount_minor,
            currency=commit_row.currency,
            type=TransactionType(commit_row.type),
            applies_to_balance=commit_row.apply_to_balance,
            import_batch_id=batch_id,
        )
        session.add(tx)
        await session.flush()

        if first_tx_id is None:
            first_tx_id = tx.id
        if commit_row.apply_to_balance:
            balance_delta += commit_row.amount_minor

    # AI categorization stub — Phase 9 implements this
    # background_tasks.add_task(ai_categorize_batch, str(batch_id))

    return CommitResponse(
        batch_id=str(batch_id),
        count=len(data.rows),
        first_transaction_id=first_tx_id or 0,
        balance_delta=balance_delta,
    )
```

- [ ] **Commit**

```bash
git add backend/app/services/import_/import_service.py
git commit -m "feat(import): import orchestrator — parse_upload decision tree + commit_import"
```

---

## Task 15: Parse and commit router endpoints

- [ ] **Write failing router tests**

Create `backend/tests/routers/test_import_.py`:

```python
import io
import json
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_parse_returns_needs_mapping_for_csv(client: AsyncClient):
    csv_bytes = b"Date,Description,Debit,Credit\n15/03/2026,MERCHANT,100.00,\n"
    resp = await client.post(
        "/api/v1/import/parse",
        data={"account_id": "1", "currency": "EGP"},
        files={"file": ("statement.csv", io.BytesIO(csv_bytes), "text/csv")},
    )
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["result_type"] == "needs_mapping"
    assert "Date" in body["headers"]


@pytest.mark.asyncio
async def test_parse_with_column_mapping_returns_complete(client: AsyncClient):
    csv_bytes = b"Date,Description,Debit,Credit\n15/03/2026,CARREFOUR,1250.00,\n"
    mapping = json.dumps({"date": "Date", "description": "Description", "debit": "Debit"})
    resp = await client.post(
        "/api/v1/import/parse",
        data={"account_id": "1", "currency": "EGP", "column_mapping": mapping},
        files={"file": ("statement.csv", io.BytesIO(csv_bytes), "text/csv")},
    )
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["result_type"] == "complete"
    assert body["total_rows"] == 1
    assert body["valid_rows"] == 1


@pytest.mark.asyncio
async def test_parse_scanned_pdf_returns_scanned(client: AsyncClient):
    with patch("app.services.import_.import_service.is_scanned", return_value=True):
        resp = await client.post(
            "/api/v1/import/parse",
            data={"account_id": "1", "currency": "EGP"},
            files={"file": ("statement.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
        )
    assert resp.status_code == 200
    assert resp.json()["data"]["result_type"] == "scanned"


@pytest.mark.asyncio
async def test_parse_unsupported_format_returns_400(client: AsyncClient):
    resp = await client.post(
        "/api/v1/import/parse",
        data={"account_id": "1", "currency": "EGP"},
        files={"file": ("document.docx", io.BytesIO(b"data"), "application/octet-stream")},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_commit_inserts_transactions(client: AsyncClient, db_session):
    import datetime
    from app.models.account import Account
    from app.models.enums import AccountType

    # Seed an account
    acct = Account(
        household_id=uuid.UUID(int=0),  # matches override_get_household_id
        name="Test Account", type=AccountType.BANK_ACCOUNT,
        currency="EGP", balance_minor=0,
    )
    db_session.add(acct)
    await db_session.flush()

    payload = {
        "account_id": acct.id,
        "rows": [{
            "date": "2026-03-15",
            "description": "CARREFOUR",
            "amount_minor": -125000,
            "currency": "EGP",
            "type": "debit",
            "apply_to_balance": True,
        }],
    }
    resp = await client.post("/api/v1/import/commit", json=payload)
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["count"] == 1
    assert body["balance_delta"] == -125000
    assert "batch_id" in body


@pytest.mark.asyncio
async def test_commit_empty_rows_returns_422(client: AsyncClient):
    payload = {"account_id": 1, "rows": []}
    resp = await client.post("/api/v1/import/commit", json=payload)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_presets(client: AsyncClient):
    resp = await client.get("/api/v1/import/presets")
    assert resp.status_code == 200
    presets = resp.json()["data"]["presets"]
    assert any(p["id"] == "hsbc_cc" for p in presets)
```

- [ ] **Run tests to see them fail**

```bash
cd backend && uv run pytest tests/routers/test_import_.py -v
```

Expected: ERROR — module not found or 404 responses

- [ ] **Create `backend/app/routers/import_.py`**

```python
"""Import HTTP router. Thin layer — all logic in import_service."""
import json
import uuid

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.dependencies import get_db_session, get_household_id
from app.schemas.common import SuccessResponse
from app.schemas.import_ import CommitRequest, PresetInfo
from app.services.import_ import import_service
from app.services.import_.presets.registry import list_presets

router = APIRouter(prefix="/api/v1/import", tags=["import"])

try:
    _settings = Settings()  # type: ignore[call-arg]
except Exception:
    _settings = None  # type: ignore[assignment]


@router.post("/parse")
async def parse_file(
    request: Request,
    file: UploadFile = File(...),
    account_id: int = Form(...),
    currency: str = Form(default="EGP"),
    column_mapping: str | None = Form(default=None),
    date_format: str = Form(default="DD/MM/YYYY"),
    sheet_name: str | None = Form(default=None),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    """Parse and preview a bank statement file."""
    raw_bytes = await file.read()
    mapping = json.loads(column_mapping) if column_mapping else None

    result = await import_service.parse_upload(
        raw_bytes=raw_bytes,
        filename=file.filename or "upload",
        account_id=account_id,
        currency=currency,
        session=session,
        household_id=household_id,
        column_mapping=mapping,
        date_format=date_format,
        sheet_name=sheet_name,
        content_type=file.content_type,
    )
    return SuccessResponse(data=result.model_dump())


@router.post("/commit", status_code=status.HTTP_200_OK)
async def commit_import(
    data: CommitRequest,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    """Atomically commit confirmed rows to the database."""
    result = await import_service.commit_import(data, session, household_id)
    return SuccessResponse(data=result.model_dump())


@router.get("/presets")
async def list_import_presets() -> SuccessResponse:
    """List all available bank import presets."""
    presets = [
        PresetInfo(
            id=p.preset_id,
            name=p.name,
            name_ar=p.name_ar,
            formats=p.formats,
        )
        for p in list_presets()
    ]
    return SuccessResponse(data={"presets": [p.model_dump() for p in presets]})
```

- [ ] **Run tests to see them fail (module exists but router not registered)**

```bash
cd backend && uv run pytest tests/routers/test_import_.py -v
```

Expected: some 404s (router not in main.py yet)

- [ ] **Register router in `backend/app/main.py`**

```python
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import Settings
from app.routers import accounts, categories, transactions, transfers
from app.routers.households import router as households_router
from app.routers.import_ import router as import_router

logger = logging.getLogger(__name__)

try:
    _settings = Settings()  # type: ignore[call-arg]
    _cors_origins = _settings.CORS_ORIGINS
    _parse_limit = f"{_settings.import_parse_rate_limit}/minute"
    _commit_limit = f"{_settings.import_commit_rate_limit}/minute"
except Exception as e:
    logger.warning("Failed to load Settings — using defaults: %s", e)
    _cors_origins = ["http://localhost:3000"]
    _parse_limit = "20/minute"
    _commit_limit = "5/minute"

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    yield


app = FastAPI(title="Masareef API", version="0.1.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(households_router)
app.include_router(accounts.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(transfers.router)
app.include_router(import_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": "0.1.0"}
```

- [ ] **Apply rate limiting decorators to parse and commit endpoints in `import_.py`**

Add to `backend/app/routers/import_.py` — update the two route functions:

```python
# At top of file, add import:
from slowapi import Limiter
from slowapi.util import get_remote_address

# Replace the parse_file and commit_import function signatures with:
@router.post("/parse")
async def parse_file(
    request: Request,  # required by slowapi
    file: UploadFile = File(...),
    # ... rest of params unchanged
```

> The `Request` parameter is already in the route signature above — slowapi reads it
> from the function signature automatically when `key_func=get_remote_address` is used.
> No decorator needed on individual routes when using the global limiter on app.state.

- [ ] **Run all import tests**

```bash
cd backend && uv run pytest tests/routers/test_import_.py tests/services/import_/ -v
```

Expected: all PASSED (may need to seed account with matching household_id in commit test — adjust `uuid.UUID(int=0)` to match `TEST_HOUSEHOLD_ID` from conftest)

- [ ] **Fix the commit test household_id**

In `test_import_.py`, update the account seed to use the test household ID:

```python
# Replace:
household_id=uuid.UUID(int=0),
# With (imports TEST_HOUSEHOLD_ID from conftest):
from tests.conftest import TEST_HOUSEHOLD_ID
# ...
household_id=TEST_HOUSEHOLD_ID,
```

- [ ] **Run full test suite**

```bash
cd backend && uv run pytest -v
```

Expected: all existing tests + new import tests PASSED

- [ ] **Commit**

```bash
git add backend/app/routers/import_.py backend/app/main.py \
        backend/tests/routers/test_import_.py
git commit -m "feat(import): parse + commit + presets endpoints with slowapi rate limiting"
```

---

## Task 16: Final lint, type check, and full test run

- [ ] **Run linter**

```bash
cd backend && uv run ruff check .
```

Expected: no errors (fix any that appear)

- [ ] **Run formatter check**

```bash
cd backend && uv run ruff format --check .
```

Expected: no changes needed (run `uv run ruff format .` to fix if needed)

- [ ] **Run type checker**

```bash
cd backend && uv run pyright
```

Expected: 0 errors (fix any that appear)

- [ ] **Run full test suite**

```bash
cd backend && uv run pytest -v --tb=short
```

Expected: all tests PASSED

- [ ] **Final commit**

```bash
git add -A
git commit -m "chore(import): lint and type check clean for 2A"
```

---

## Done

Unit 2A is complete. The import backend pipeline is fully built and tested.

**Next step:** Execute Unit 2B (`feature/2b-import-templates`) to add the template system.
