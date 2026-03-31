# PDF Library Decision

**Date:** 2026-03-31
**Evaluated:** pdfplumber, PyMuPDF (tabula-py and camelot excluded: require Java/Ghostscript)

## Results

| Library    | Pages | Chars | Words | Time  | Notes |
|------------|-------|-------|-------|-------|-------|
| pdfplumber | —     | —     | —     | —     | Not run — no HSBC PDF available yet |
| PyMuPDF    | —     | —     | n/a   | —     | Not installed |

## Decision

**Winner: pdfplumber**

Reason: pdfplumber is the plan default, is pure Python (no system dependencies), and provides positional word extraction via `extract_words()` with x0/top coordinates — exactly what the HSBC CC preset requires. This decision should be validated by running `eval_pdf_library.py` against a real HSBC CC PDF when available.

## Impact on Plan 2A

Proceeding with pdfplumber as specified in Task 11.
