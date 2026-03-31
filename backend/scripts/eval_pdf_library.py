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
