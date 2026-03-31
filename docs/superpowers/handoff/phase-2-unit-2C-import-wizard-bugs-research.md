# Session Handoff Note — Phase 2, Unit 2C: Import Wizard Bug Fixes + PDF Library Research

**Date:** 2026-03-31
**PR:** TBD (branch not yet pushed)
**Branch:** `feature/2c-import-wizard`

---

## 1. What Was Completed

### Bug Fixes (5 issues from manual testing)

**Modified files:**
- `frontend/src/components/layout/sidebar.tsx` — Added `/import` to the Finance section filter so Import appears in the sidebar
- `frontend/src/app/(app)/accounts/page.tsx` — Added Import button (Upload icon) to the accounts list page toolbar, navigates to `/import?accountId={id}` in account detail context
- `frontend/src/components/import/upload-step.tsx` — Fixed account dropdown: replaced `<SelectValue>` with inline render showing Wallet icon + account name after selection
- `backend/app/services/import_/import_service.py` — Wrapped `is_scanned()` call in try/except; exceptions treated as non-scanned (fixes PDF parsing crash on well-formed PDFs)
- `frontend/src/app/(app)/import/page.tsx` — Catches `ApiError` with `code === "UNSUPPORTED_FORMAT"` and shows specific toast instead of generic parse-failed message
- `frontend/messages/en.json` + `frontend/messages/ar.json` — Added `import.errors.unsupportedFormat` key

### PDF Library Research

**New files:**
- `data/.gitignore` — Excludes `*.pdf` (personal financial documents, never commit)
- `data/HSBC/ANALYSIS.md` — PDF coordinate analysis for all 4 HSBC CC types
- `data/HSBC/comparison/compare_pdf_libs.py` — Comparison script (pdfplumber vs pymupdf vs pypdf)
- `data/HSBC/comparison/output/REPORT.md` — Evaluation report
- `data/HSBC/comparison/output/{library}__{type}.csv` — 15 extracted transaction CSVs

---

## 2. Key Decisions & Rationale

- **`is_scanned()` in try/except** — The function uses pdfplumber to count text words; if the PDF has unusual structure it can raise exceptions. Treating exception as "not scanned" lets the parse continue and produce a proper `UNSUPPORTED_FORMAT` error rather than a 500.

- **`UNSUPPORTED_FORMAT` vs generic error** — The backend raises `UNSUPPORTED_FORMAT` when no preset recognizes the PDF. Frontend now distinguishes this from a true parse crash so the user knows to try a different file.

- **pdfplumber chosen over pymupdf for production** — Both extract identical transaction counts (23/71/2/1 per CC type) and directions. pdfplumber's `extract_words()` API is cleaner and merges adjacent glyphs (e.g. "500.00CR" stays one word vs pymupdf splits it). Production `pdf_parser.py` already uses pdfplumber; no change needed.

- **pymupdf CR-split fix** — pymupdf tokenizes "500.00CR" as two words: "500.00" + "CR". Added `credit_flag` bucket in `bucket_word()`: standalone "CR" at x∈X_AMOUNT range returns "credit_flag" instead of "other", so the transaction direction is flipped to credit correctly.

- **Arabic account statements unreadable** — All 3 libraries return arabic_score=0.000 for HSBC account statements. The fonts are Type3/custom encoding (`EXxxxxxx`, `g_d2_fN`) with no ToUnicode table. No Python PDF library can decode this — would require OCR (Tesseract Arabic). This is a known limitation tracked in Phase 2D scope.

---

## 3. Known Gaps / Deferred

- **Arabic account statement import** — All 3 tested libraries fail to decode custom-font Arabic text. Deferred to a future phase (likely Phase 3) requiring OCR (Tesseract + Arabic language pack).
- **Evolution (1 tx) and Platinum (2 tx) counts look low** — These are genuinely sparse statements (those particular monthly statements had few transactions). Verified correct by coordinate inspection.
- **pypdf regex extractor extracts 0 CC transactions** — pypdf plain text output uses line breaks between columns making the regex approach unreliable. pypdf is not a viable option for CC parsing without coordinates.

---

## 4. What's Next

The `feature/2c-import-wizard` branch is ready to push and PR. It contains:
1. The Phase 2C plan implementation (import templates, persistence, 6 API endpoints) — already committed in previous sessions
2. The 5 bug fixes above
3. The PDF library research

Next unit: Phase 2D or Phase 3 per roadmap.

---

## 5. PRs Merged

- No PR yet — branch needs to be pushed and PR opened.

---

## 6. Test Status

- Backend: 228 unit tests passing (verified in previous session)
- Frontend: TypeScript clean, no build errors
- CI: not yet run (branch not pushed)

---

## 7. Notes / Surprises

- **pdfplumber Y-coordinate system** — pdfplumber uses `top` = distance from page top (0=top, 842=bottom for A4). ANALYSIS.md originally used bottom-origin PDF coordinates, causing the Y filter to be inverted. Correct Y_MIN=190, Y_MAX=800 — DATE_RE gate rejects headers/summary rows naturally.
- **`data/` directory** — Not in `.gitignore` at repo root. Added `data/.gitignore` to exclude PDFs specifically. The comparison outputs (CSVs, REPORT.md) are committed as research artifacts.
- **pymupdf install name** — Package is `pymupdf` on PyPI but imported as `fitz`. Version 1.27.2.2 was used for comparison.
