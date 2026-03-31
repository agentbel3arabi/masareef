# Phase 2: Import & Templates — Design Spec

**Date:** 2026-03-31
**Status:** Approved
**Phase:** 2 — Import & Templates
**Roadmap ref:** `docs/05-roadmap.md` → Phase 2

---

## Overview

Phase 2 builds the primary user onramp for Masareef. Since Egypt has no Open Banking/Plaid, users manually download bank statements as PDF, CSV, or Excel files. This phase delivers a 3-step import wizard backed by a format-agnostic parsing pipeline, duplicate detection, and a reusable template system.

---

## Scope Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scanned PDF OCR | Detect only — show upgrade prompt | Full OCR pipeline deferred to Phase 14 (Landing AI) |
| Wizard state | Single-page, client-side state machine | Import is a transient session; no bookmarking value |
| Column mapping UI | Dropdowns with fuzzy auto-suggest | Simpler than drag-and-drop; fuzzy matching provides same UX benefit |
| Built-in presets | HSBC CC PDF only | Only verified preset; template system handles other banks |
| Navigation entry | Sidebar + Account Detail shortcut | Sidebar for discoverability; shortcut for experienced users |
| PDF library | Evaluate before building | pdfplumber / tabula-py / camelot / PyMuPDF tested against real HSBC CC statement |
| Rate limits | Configurable via env vars | Hard-coded limits create ops friction |

---

## Unit Breakdown

### Unit 2A — Backend Parsing Pipeline (`feature/2a-import-backend`)

**Goal:** All parsing, detection, deduplication, and import endpoints. No template system.

**Implementation sequence:**

1. **PDF library evaluation** — test pdfplumber, tabula-py, camelot, PyMuPDF against HSBC CC statement; write decision record in `docs/superpowers/plans/` before writing any parser code
2. **Encoding service** — `services/import_/encoding.py` (chardet detection, Windows-1256 fallback)
3. **Amount parser** — `services/import_/amount_parser.py` (Arabic-Indic numeral normalization, DR/CR/parentheses negation, varied thousands/decimal separators)
4. **CSV parser** — `services/import_/csv_parser.py` (pandas read_csv, detected encoding, column mapping)
5. **Excel parser** — `services/import_/excel_parser.py` (openpyxl, sheet selection, column mapping)
6. **PDF parser** — `services/import_/pdf_parser.py` (text extraction using winning library; scanned detection: chars/page < 50 → return scanned flag)
7. **HSBC CC preset** — `services/import_/presets/hsbc_cc.py` (card variant detection via page 1 header: CASHBACK/EVOLUTION/PLATINUM/PREMIER; X-range column bucketing; multi-page support)
8. **Preset registry** — `services/import_/presets/registry.py` (ordered detect() loop; built-in presets first)
9. **Fuzzy header mapper** — `services/import_/header_mapper.py` (rapidfuzz; confidence ≥ 0.7 → auto-suggest; below threshold → blank dropdown)
10. **Row validator** — `services/import_/row_validator.py` (date format validation, amount parseability, required fields)
11. **Duplicate checker** — `services/import_/duplicate_checker.py` (load existing transaction hashes for account in one query; O(1) per row check; hash key: account_id + date + amount_minor + description)
12. **Parse endpoint** — `routers/import_.py` → `POST /api/v1/import/parse`
13. **Commit endpoint** — `POST /api/v1/import/commit` (atomic: INSERT rows + UPDATE account balance; generate import_batch_id UUID; queue AI categorization background task — **stub in Phase 2, implemented in Phase 9**)
14. **Presets list endpoint** — `GET /api/v1/import/presets`
15. **Rate limiting** — slowapi on import router; limits read from `settings.import_parse_rate_limit` and `settings.import_commit_rate_limit`

**Config additions (`config.py`):**
```python
import_parse_rate_limit: int = Field(default=20, description="Parse requests per minute per user")
import_commit_rate_limit: int = Field(default=5, description="Commit requests per minute per user")
```
Set via `IMPORT_PARSE_RATE_LIMIT` / `IMPORT_COMMIT_RATE_LIMIT` env vars.

---

### Unit 2B — Template System (`feature/2b-import-templates`)

**Goal:** Persist and reuse column mappings. Account-linked auto-apply.

**Implementation sequence:**

1. `ImportTemplate` + `AccountImportTemplate` SQLAlchemy models
2. Alembic migration
3. Pydantic schemas — `schemas/import_template.py`
4. Template CRUD router — `routers/import_templates.py`:
   - `GET /api/v1/import/templates` — list all for household
   - `POST /api/v1/import/templates` — create from successful mapping
   - `PUT /api/v1/import/templates/{id}` — update
   - `DELETE /api/v1/import/templates/{id}` — delete (unlinks from accounts)
   - `POST /api/v1/import/templates/{id}/link/{account_id}` — link as default
   - `DELETE /api/v1/import/templates/{id}/link/{account_id}` — unlink

---

### Unit 2C — Frontend Wizard (`feature/2c-import-wizard`)

**Goal:** Complete 3-step import wizard + sidebar nav + account detail shortcut.

**Implementation sequence:**

1. Sidebar nav entry — Import link between Transfers and Settings
2. Account Detail import button — "Import" action button navigates to `/import?accountId={id}`
3. Wizard page — `app/(app)/import/page.tsx` (state machine, reads `accountId` from searchParams)
4. Upload step — `components/import/upload-step.tsx`
5. Column mapping step — `components/import/mapping-step.tsx`
6. Preview step — `components/import/preview-step.tsx`
7. Scanned PDF prompt — `components/import/scanned-prompt.tsx`
8. Import summary bar — `components/import/import-summary-bar.tsx`
9. TanStack Query mutations — `hooks/use-import.ts`
10. Post-commit: navigate to `/accounts/{id}` with first imported transaction highlighted

---

## Data Flow

### Wizard State Machine

```typescript
type WizardState =
  | { step: "upload" }
  | { step: "mapping"; headers: string[]; sheetNames?: string[]; autoSuggest: Record<FieldKey, string>; file: File; accountId: number }
  | { step: "preview"; rows: ParsedRow[]; stats: { valid: number; duplicate: number; error: number }; accountId: number }
  | { step: "scanned" }
  | { step: "done"; batchId: string; firstTransactionId: number }
```

### Parse Flow (two-pass, stateless backend)

```
User uploads file
  → POST /api/v1/import/parse (file + account_id, no column_mapping)
  → Backend detects:
      preset matched  → parse fully → deduplicate → return rows     → step: preview
      scanned PDF     → return {scanned: true}                       → step: scanned
      no preset       → return {needs_mapping, headers, auto_suggest} → step: mapping

User confirms mapping (step: mapping)
  → POST /api/v1/import/parse (same File object + account_id + column_mapping)
  → Backend parses with mapping → deduplicate → return rows          → step: preview

User commits (step: preview)
  → POST /api/v1/import/commit (account_id + selected rows)
  → Backend: atomic INSERT + balance UPDATE + queue AI categorization
  → Frontend: navigate to /accounts/{id}                             → step: done
```

File is kept in React state as a `File` object. Re-sending on second parse call is acceptable — typical bank statements are under 2MB.

### Backend Parse Endpoint Decision Tree

```
receive file
  ├── detect encoding (chardet)
  ├── detect format (CSV / Excel / PDF by MIME + extension)
  │   PDF
  │   ├── text extraction (winning library from evaluation)
  │   ├── chars/page < 50 → return {scanned: true}
  │   └── try presets in registry order
  │       ├── HSBC CC match → parse with preset → deduplicate → return rows
  │       └── no match → return {needs_mapping, headers, auto_suggest}
  │   CSV / Excel
  │   ├── try presets in registry order
  │   │   └── match → parse with preset → deduplicate → return rows
  │   └── no match → extract headers, run fuzzy mapper
  │       └── return {needs_mapping, headers, auto_suggest}
  └── if column_mapping in request → parse with explicit mapping → deduplicate → return rows
```

---

## Backend Service Layout

```
backend/app/services/import_/
├── __init__.py
├── encoding.py          # chardet detection, decode bytes → str
├── amount_parser.py     # Arabic numerals, DR/CR/parens, varied separators
├── header_mapper.py     # fuzzy match headers → field mapping with confidence scores
├── csv_parser.py        # pandas read_csv + column mapping
├── excel_parser.py      # openpyxl, sheet selection, column mapping
├── pdf_parser.py        # text extraction (winning library), scanned detection
├── duplicate_checker.py # set-based hash lookup, one DB query per import
├── row_validator.py     # per-row validation, assigns status: valid/duplicate/error
└── presets/
    ├── __init__.py
    ├── base.py          # BankPreset ABC
    ├── registry.py      # ordered preset list, detect() loop
    └── hsbc_cc.py       # HSBC CC PDF parser
```

All parsers return `list[ParsedRow]` — a single shared Pydantic model. The endpoint layer is format-agnostic.

---

## Frontend File Layout

```
frontend/src/
├── app/(app)/import/
│   └── page.tsx                     # wizard page, state machine
├── components/import/
│   ├── upload-step.tsx              # drag-drop zone, account selector, file type badge
│   ├── mapping-step.tsx             # column mapper dropdowns + date format + skip rows
│   ├── preview-step.tsx             # DataTable rows + per-row checkboxes + summary bar
│   ├── scanned-prompt.tsx           # upgrade prompt when scanned PDF detected
│   └── import-summary-bar.tsx       # valid / duplicate / error counts
└── hooks/
    └── use-import.ts                # TanStack Query mutations: parse + commit
```

### Column Mapper Details (`mapping-step.tsx`)

- One `<Select>` per target field: Date, Description, Debit, Credit, Balance (optional)
- Default value = auto-suggested header if confidence ≥ 0.7 (labeled "suggested")
- Below threshold → placeholder "Select column"
- Date format selector: DD/MM/YYYY | MM/DD/YYYY | YYYY-MM-DD | Auto-detect
- Skip rows number input (default 0)
- Single amount column toggle: collapses Debit + Credit into one selector with sign convention picker (+/-)

---

## Error Handling

| Scenario | HTTP | Message |
|---|---|---|
| File > 10MB | 400 | "File exceeds 10MB limit" |
| Unsupported file type | 400 | "Only CSV, Excel, and PDF are supported" |
| All rows unparseable | 422 | "No valid rows found. Check file format." |
| Scanned PDF (any user) | 200 | `{scanned: true}` — frontend shows upgrade prompt |
| Single row parse error | 200 | Row status = `error`, shown in preview table |
| Commit with 0 selected rows | 422 | "Select at least one row to import" |
| Household mismatch on account | 403 | Standard 403 envelope |
| DB failure mid-commit | 500 | Transaction rolled back; error envelope confirms rollback |

---

## Testing

```
tests/import_/
├── test_encoding.py          # UTF-8, Windows-1256, Arabic content
├── test_amount_parser.py     # Arabic-Indic numerals, DR/CR/parens, separators
├── test_header_mapper.py     # exact match, fuzzy match, low confidence → blank
├── test_csv_parser.py        # valid CSV, missing columns, empty rows, encoding variants
├── test_excel_parser.py      # single/multi-sheet, xls + xlsx
├── test_pdf_parser.py        # text-based → rows, scanned → flag
├── test_hsbc_cc_preset.py    # card variant detection, multi-page
├── test_duplicate_checker.py # exact duplicate flagged, near-duplicate not flagged
├── test_import_router.py     # parse variants, commit atomicity
└── fixtures/
    ├── sample_cib.csv
    ├── sample_nbe.xlsx
    ├── sample_hsbc_cc.pdf        # anonymised (dates/amounts changed)
    └── sample_scanned.pdf        # low-text PDF for scanned detection
```

---

## Required Reading (Unit 2C)

- `docs/stitch-designs/html/08-import-upload.html`
- `docs/stitch-designs/html/08b-import-mapping.html`
- `docs/stitch-designs/html/09-import-preview.html`
- `docs/guides/09-design-tokens.md`
- `docs/stitch-designs/stitch-project-reference.md` (if using Stitch MCP)

---

## Success Criteria

- [ ] CSV import handles UTF-8 and Windows-1256 encoding
- [ ] Excel import supports multi-sheet files with sheet selection
- [ ] PDF text extraction works for text-based bank statements
- [ ] Scanned PDF detected (< 50 chars/page) → upgrade prompt shown
- [ ] HSBC CC PDF auto-detects card variant (cashback/evolution/platinum/premier)
- [ ] Fuzzy header matching auto-suggests column mappings with confidence ≥ 0.7
- [ ] Manual column mapping works when no preset/template detected
- [ ] Duplicate detection correctly flags existing transactions
- [ ] Duplicate rows auto-deselected; user can override
- [ ] Commit is atomic — all rows inserted or none
- [ ] Account balance updates correctly after commit
- [ ] import_batch_id groups all rows from same session
- [ ] AI categorization queued as background task after commit
- [ ] Arabic amount formats parse correctly
- [ ] Error rows show per-row status in preview table
- [ ] Rate limits configurable via IMPORT_PARSE_RATE_LIMIT / IMPORT_COMMIT_RATE_LIMIT env vars
- [ ] After commit, UI navigates to Account Detail with first imported transaction
- [ ] Sidebar Import nav entry visible and functional
- [ ] Account Detail Import button pre-fills account in wizard
- [ ] Template CRUD API works (create, update, delete, list, link/unlink)
- [ ] Account-linked template auto-applies on next upload to same account
- [ ] User can override auto-applied template
- [ ] `pnpm build` + `pnpm lint` + `tsc --noEmit` pass
- [ ] `uv run pytest` passes with all import_ tests
