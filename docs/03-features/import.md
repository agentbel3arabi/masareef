# Feature: Bank Statement Import

## Purpose
Import is the primary onramp for new users. Since Egypt has no Open Banking/Plaid, users manually download bank statements as PDF, CSV, or Excel files. The import pipeline must auto-detect bank format, parse transactions, check for duplicates, and let users confirm before committing — all in 3 clicks.

## Supported Formats

| Format | Library | Use Case |
|--------|---------|----------|
| CSV | pandas + chardet | Most Egyptian bank exports |
| Excel (.xlsx/.xls) | openpyxl | Some banks and Google Sheets exports |
| PDF (text-based) | pdfplumber | HSBC CC statements, other bank PDFs |
| PDF (scanned) | Landing AI ADE API | Scanned bank statements (premium only) |

## Import Flow

```
Step 1: Upload
  User drags file → frontend sends to /api/v1/import/parse

Step 2: Detection
  Backend detects:
  - File type (CSV/Excel/PDF)
  - Encoding (UTF-8 or Windows-1256 for Arabic)
  - Bank preset (header signature matching)
  - For Excel: sheet names (user picks if multiple)
  - For PDF (text-based): bank format + card variant (HSBC CC)
  - For PDF (scanned): detected via pdfplumber text extraction failure
    → Route to Landing AI OCR pipeline (premium only)
    → Free users see upgrade prompt

Step 3: Parse
  If preset detected → auto-map columns
  If not detected → return headers, user maps columns manually
  Parse all rows → validate dates/amounts → mark status per row

Step 4: Duplicate Check
  Compare parsed rows against existing transactions:
  Key: (account_id, date, amount_minor, description)
  Mark duplicates with status = "duplicate", selected = false

Step 5: Preview
  Return parsed rows to frontend for review
  User can toggle per-row: include/exclude, applies_to_balance

Step 6: Confirm
  Frontend sends confirmed rows to /api/v1/import/commit
  Atomic: insert all rows + update account balance

Step 7: AI Categorize (async)
  Background task runs AI categorization on imported transactions
  Results appear as suggestions in the transaction list
```

## Egyptian Bank Export Reality

Most Egyptian banks primarily provide **PDF statements only**. CSV/Excel export is rare and inconsistent. The import system must not assume any specific bank provides CSV.

| Bank | PDF Statement | CSV/Excel Export | Notes |
|------|:------------:|:----------------:|-------|
| HSBC Egypt | Yes | No (accounts) | Credit card statements: PDF only |
| CIB | Yes | Possible (web UI) | Format varies, unverified at scale |
| Credit Agricole Egypt | Yes | Possible (web UI) | UTF-8 encoding when available |
| NBE (National Bank of Egypt) | Yes | No | PDF only |
| QNB Alahli | Yes | No | PDF only |
| Banque Misr | Yes | No | PDF only |
| Alex Bank | Yes | No | PDF only |

**Implication:** The import system is template-driven, not preset-dependent. Users map columns once and save as a reusable template. Built-in presets are a convenience for verified formats, not a requirement.

## Two-Layer Import System

### Layer 1: Built-in Presets (verified formats)
Small set of presets verified against real bank statements. Auto-detected when possible.

| Preset | Format | Detection | Status |
|--------|--------|-----------|--------|
| HSBC CC | PDF (text) | Page header: "CASHBACK", "EVOLUTION", "PLATINUM", "PREMIER" | Verified |
| Generic CSV | CSV | Fallback — show column mapper | Always available |
| Generic Excel | Excel | Fallback — show column mapper + sheet selector | Always available |

More presets added only after verification against real exported files. Never ship unverified presets.

### Layer 2: User Templates (saved column mappings)
Users create their own import templates by mapping columns once, then reusing.

**Template creation flow:**
```
1. User uploads CSV/Excel for the first time
2. System shows column mapper UI (drag headers to fields)
3. User maps: Date, Description, Debit, Credit, Balance (optional)
4. User configures: date format, encoding, skip header rows
5. Import completes successfully
6. System prompts: "Save this mapping as a template?"
   → User names it (e.g., "CIB Savings CSV")
   → Optionally links it to a specific account (auto-applied on next upload to this account)
7. Next upload to the same account → template auto-applied, skip column mapping step
```

**Account-linked templates:**
- Each account can have a default import template
- When user uploads to that account, template auto-applies
- User can still override or choose a different template
- Stored in `import_templates` table (see [02-data-models.md](../02-data-models.md) → Import Templates)

### HSBC CC PDF Specifics (Built-in Preset)
- Auto-detects card variant from page 1 header text
- Uses pdfplumber positioned text extraction (x/y coordinates)
- Columns bucketed by X-range: date, description, debit, credit, balance
- Rows grouped by Y-coordinate proximity
- Handles multi-page statements
- Extracts: transaction date, posting date, description, debit/credit, original currency, original amount, FX rate, paid-by indicator

## Import Template Data Model

> **Data Model:** See [02-data-models.md](../02-data-models.md) → Import Templates section for the `import_templates` and `account_import_templates` table schemas.

### Template API Endpoints

#### `GET /api/v1/import/templates`
List all templates for the household.

#### `POST /api/v1/import/templates`
Create a new template from a successful column mapping.

**Request:**
```json
{
  "name": "CIB Savings CSV",
  "format": "csv",
  "columns": {
    "date": "Date",
    "description": "Description",
    "debit": "Debit",
    "credit": "Credit",
    "balance": "Balance"
  },
  "date_format": "DD/MM/YYYY",
  "encoding": "windows-1256",
  "skip_rows": 0,
  "link_to_account_id": 3
}
```

#### `PUT /api/v1/import/templates/{id}`
Update an existing template.

#### `DELETE /api/v1/import/templates/{id}`
Delete a template. Unlinks from any associated accounts.

#### `POST /api/v1/import/templates/{id}/link/{account_id}`
Link a template to an account as its default import template.

#### `DELETE /api/v1/import/templates/{id}/link/{account_id}`
Unlink a template from an account.

### Encoding Detection
Egyptian bank CSVs frequently use Windows-1256 (Arabic) encoding instead of UTF-8. The pipeline:
1. Read raw bytes
2. `chardet.detect()` to identify encoding
3. Decode with detected encoding (fallback to UTF-8)
4. Template stores detected encoding for reuse

## Parsed Row Structure

```json
{
  "row_index": 0,
  "date": "2026-03-15",
  "description": "CARREFOUR CITY STARS",
  "debit_raw": "1,250.00",
  "credit_raw": "",
  "amount_minor": -125000,
  "currency": "EGP",
  "type": "debit",
  "status": "valid",
  "error_message": null,
  "selected": true,
  "apply_to_balance": true,
  "original_currency": null,
  "original_amount_minor": null,
  "fx_rate": null
}
```

**Row status values:**
- `valid` — parsed successfully, ready to import
- `duplicate` — matches existing transaction (auto-deselected)
- `error` — parse failure on this row (date invalid, amount unparseable)

## Scanned PDF Processing (Premium Feature)

### Why Premium Only
Scanned PDF OCR uses the Landing AI Agentic Document Extraction (ADE) API, which costs 3 credits/page ($0.03/page). Free users are shown a clear upgrade prompt: "This looks like a scanned document. Upgrade to Premium to import scanned bank statements."

### Landing AI ADE Integration

**API:** `POST https://api.va.landing.ai/v1/ade/parse`
**Python SDK:** `pip install agentic-doc`
**Auth:** Bearer token via `VISION_AGENT_API_KEY`

**How it works:**
```python
from agentic_doc.parse import parse
from pydantic import BaseModel, Field

class BankStatementRow(BaseModel):
    date: str = Field(description="Transaction date in DD/MM/YYYY or YYYY-MM-DD")
    description: str = Field(description="Transaction description or merchant name")
    debit: float | None = Field(description="Debit/withdrawal amount, null if credit")
    credit: float | None = Field(description="Credit/deposit amount, null if debit")
    balance: float | None = Field(description="Running balance after transaction")

# Parse scanned PDF with structured extraction
results = parse("scanned_statement.pdf", extraction_model=BankStatementRow)
```

**Processing pipeline:**
1. pdfplumber attempts text extraction first (free)
2. If extracted text is empty or below threshold → PDF is scanned
3. Check user's subscription tier → reject if free
4. Send to Landing AI ADE API with Pydantic extraction model
5. ADE returns structured table chunks with row-level data
6. Map ADE output to standard `ParsedRow` format
7. Continue with normal pipeline (duplicate check → preview → commit)

**Scanned PDF detection heuristic:**
- Extract text with pdfplumber
- If total character count < 50 per page average → classified as scanned
- If ratio of embedded images to text blocks > 0.8 → classified as scanned

**ADE response structure:**
```json
{
  "markdown": "| Date | Description | Debit | Credit | Balance |\n|---|---|---|---|---|\n| 15/03/2026 | CARREFOUR | 1,250.00 | | 45,230.50 |",
  "chunks": [
    {
      "type": "table",
      "markdown": "...",
      "grounding": { "box": {...}, "page": 1 }
    }
  ],
  "metadata": {
    "page_count": 3,
    "credit_usage": 9,
    "duration_ms": 4500
  }
}
```

**Table chunks** are returned as markdown tables. The pipeline:
1. Extracts table chunks from response
2. Parses markdown table rows into structured data
3. Applies amount parsing (same logic as CSV — handles Arabic numerals, varied separators)
4. Validates dates and amounts per row
5. Returns standard `ParsedRow[]` for preview

**Cost tracking:** Each parse records `credit_usage` from the ADE response metadata. The backend tracks cumulative credits used per household per billing period for usage-based billing or credit cap enforcement.

### Pricing Model for Scanned PDFs

| Tier | Scanned PDF Import | Monthly Page Limit |
|------|-------------------|-------------------|
| Free | Disabled (upgrade prompt) | 0 |
| Premium | Enabled | 100 pages/month |
| Business | Enabled | 1,000 pages/month |

Credits consumed are tracked in `app_settings` per household:
- Key: `ocr_credits_used_YYYY_MM` → cumulative pages this billing period
- Key: `ocr_credit_limit` → max pages per period (set by subscription tier)

## Amount Parsing
Handles various number formats found in Egyptian bank exports:
- Thousands separators: `,` or `.`
- Decimal separators: `.` or `,`
- Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩)
- Negative indicators: `-`, `()`, `DR`
- Credit indicators: `+`, `CR`

## UI Reference Designs

| Screen | HTML Reference | Stitch Prompt |
|--------|---------------|---------------|
| Import Upload | [08-import-upload.html](../stitch-designs/html/08-import-upload.html) | [08-import-upload.md](../stitch-prompts/08-import-upload.md) |
| Import Mapping | [08b-import-mapping.html](../stitch-designs/html/08b-import-mapping.html) | [08b-import-mapping.md](../stitch-prompts/08b-import-mapping.md) |
| Import Preview | [09-import-preview.html](../stitch-designs/html/09-import-preview.html) | [09-import-preview.md](../stitch-prompts/09-import-preview.md) |

> These are layout references, not pixel-perfect specs. See [design-tokens.md](../guides/09-design-tokens.md) for canonical colors, fonts, and spacing.

## API Endpoints

### `POST /api/v1/import/parse`
Parse and preview a file. Returns parsed rows for user review.

**Request:** `multipart/form-data`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| file | File | Yes | CSV, XLSX, XLS, or PDF |
| account_id | int | Yes | Target account |
| currency | string | Yes | Account currency |
| preset_id | string | No | Force specific bank preset |
| column_mapping | JSON | No | Manual mapping: `{"date": 0, "description": 1, "debit": 3, "credit": 4}` |
| date_format | string | No | e.g., "DD/MM/YYYY" |
| sheet_name | string | No | For Excel with multiple sheets |
| cc_variant | string | No | HSBC CC variant override |

**Response variants:**

**Needs column mapping (Excel without preset):**
```json
{
  "data": {
    "needs_mapping": true,
    "headers": ["Date", "Narration", "Withdrawal", "Deposit", "Balance"],
    "sheet_names": ["Sheet1", "Transactions"],
    "selected_sheet": "Transactions"
  }
}
```

**Needs preset confirmation (CSV auto-detected):**
```json
{
  "data": {
    "needs_confirmation": true,
    "detected_preset": { "id": "hsbc_egypt", "name": "HSBC Egypt", "name_ar": "إتش إس بي سي مصر" },
    "headers": ["Transaction Date", "Value Date", "Description", "Debit", "Credit"]
  }
}
```

**Needs CC variant confirmation (PDF):**
```json
{
  "data": {
    "needs_confirmation": true,
    "is_pdf": true,
    "is_cc": true,
    "detected_cc_variant": "cashback"
  }
}
```

**Full parse result:**
```json
{
  "data": {
    "rows": [ "..." ],
    "detected_preset": "hsbc_egypt",
    "total_rows": 50,
    "valid_rows": 47,
    "error_rows": 0,
    "duplicate_rows": 3
  }
}
```

### `POST /api/v1/import/commit`
Commit confirmed rows to the database.

**Request:**
```json
{
  "account_id": 1,
  "rows": [
    {
      "date": "2026-03-15",
      "description": "CARREFOUR CITY STARS",
      "amount_minor": -125000,
      "currency": "EGP",
      "type": "debit",
      "apply_to_balance": true
    }
  ]
}
```

**Response:**
```json
{
  "data": {
    "batch_id": "uuid-...",
    "count": 47,
    "first_transaction_id": 301,
    "balance_delta": -3450000
  }
}
```

**Atomic operation:**
1. Generate `import_batch_id` UUID
2. In single DB transaction:
   - INSERT all rows with `import_batch_id`
   - Compute `balance_delta` = SUM(amount_minor) for rows where `apply_to_balance = true`
   - UPDATE account balance
3. Queue AI categorization for uncategorized rows (background task)

### `GET /api/v1/import/presets`
List available bank presets.

**Response:**
```json
{
  "data": {
    "presets": [
      { "id": "hsbc_egypt", "name": "HSBC Egypt", "name_ar": "إتش إس بي سي مصر", "formats": ["csv"] },
      { "id": "hsbc_cc", "name": "HSBC Credit Card", "name_ar": "بطاقة إتش إس بي سي", "formats": ["pdf"] },
      { "id": "cib", "name": "CIB", "name_ar": "البنك التجاري الدولي", "formats": ["csv"] },
      { "id": "credit_agricole", "name": "Crédit Agricole Egypt", "name_ar": "كريدي أجريكول مصر", "formats": ["csv"] }
    ]
  }
}
```

## Adding New Built-in Presets
Only add presets verified against real bank exports. Each preset is a Python module in `backend/app/services/import_/presets/`:
```python
class BankPreset:
    id: str
    name: str
    name_ar: str
    formats: list[str]  # ["csv"], ["pdf"], ["csv", "excel"]

    def detect(self, content: bytes, headers: list[str] | None) -> bool:
        """Return True if this file matches this preset."""

    def get_column_mapping(self) -> dict:
        """Return column name mapping for CSV/Excel."""

    def get_pdf_config(self) -> PdfColumnConfig | None:
        """Return X-range column positions for PDF text extraction."""

    def get_date_format(self) -> str:
        """Return expected date format string."""
```

Registered in `presets/registry.py`. Detection order: built-in presets first, then account-linked user templates, then generic column mapper fallback.

## Acceptance Criteria
- [ ] CSV import handles UTF-8 and Windows-1256 encoding
- [ ] Excel import supports multi-sheet files with sheet selection
- [ ] PDF import extracts text-based bank statements via pdfplumber (free)
- [ ] Scanned PDF detected when text extraction yields < 50 chars/page
- [ ] Free users see upgrade prompt when scanned PDF detected
- [ ] Premium users: scanned PDF sent to Landing AI ADE, returns parsed rows
- [ ] OCR credits tracked per household per billing period
- [ ] Monthly page limit enforced per subscription tier
- [ ] HSBC CC PDF auto-detects card variant
- [ ] Built-in preset auto-detection works for verified presets (HSBC CC PDF)
- [ ] Manual column mapping UI works when no preset/template detected
- [ ] After successful first import, user prompted to save mapping as template
- [ ] User can name template and optionally link to account
- [ ] Account-linked template auto-applies on next upload to that account
- [ ] User can override auto-applied template and choose different one
- [ ] Templates persist across sessions (stored in DB)
- [ ] Template CRUD API works (create, update, delete, list, link/unlink)
- [ ] Duplicate detection correctly identifies existing transactions
- [ ] Duplicate rows auto-deselected but user can override
- [ ] Per-row toggle for `apply_to_balance`
- [ ] Commit is atomic — all rows inserted or none
- [ ] Account balance updates correctly after commit
- [ ] Import batch ID groups all rows from same session
- [ ] After commit, UI navigates to first imported transaction with highlight
- [ ] AI categorization runs asynchronously after commit
- [ ] Arabic amount formats (Arabic-Indic numerals, varied separators) parse correctly
- [ ] Error rows show clear, localized error messages
- [ ] Adding a new bank preset requires only one new file + registry entry
