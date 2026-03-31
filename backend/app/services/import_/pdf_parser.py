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
