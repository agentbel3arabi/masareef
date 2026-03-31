#!/usr/bin/env python3
"""
HSBC PDF Parser Library Comparison
===================================
Tests pdfplumber, pymupdf, and pypdf against one file from each HSBC PDF type.
Outputs:
  - output/{library}_{file_key}.csv  — extracted transactions (CC) or raw text sample (Account)
  - output/REPORT.md                 — evaluation report

Test files (one per category):
  Account     : Accounts/0302_26_statements.pdf          (Feb 2026 — newest)
  CC Cashback : Credit Cards/Cashback/090326_statements.pdf
  CC Evolution: Credit Cards/Evolution/050326_statements.pdf
  CC Platinum : Credit Cards/Platinum/090226_statements.pdf
  CC Premier  : Credit Cards/Premier/090326_statements.pdf
"""

import csv
import io
import re
import sys
import time
import traceback
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

# ── Paths ────────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent
OUTPUT_DIR = SCRIPT_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

TEST_FILES: dict[str, Path] = {
    "account":    DATA_DIR / "Accounts/0302_26_statements.pdf",
    "cashback":   DATA_DIR / "Credit Cards/Cashback/090326_statements.pdf",
    "evolution":  DATA_DIR / "Credit Cards/Evolution/050326_statements.pdf",
    "platinum":   DATA_DIR / "Credit Cards/Platinum/090226_statements.pdf",
    "premier":    DATA_DIR / "Credit Cards/Premier/090326_statements.pdf",
}
CC_TYPES = {"cashback", "evolution", "platinum", "premier"}

# ── Data structures ──────────────────────────────────────────────────────────

@dataclass
class Transaction:
    posting_date: str = ""
    txn_date: str = ""
    description: str = ""
    amount: str = ""
    direction: str = ""   # "debit" or "credit"
    fx_currency: str = ""
    fx_amount: str = ""

@dataclass
class FileResult:
    library: str
    file_key: str
    success: bool
    error: str = ""
    elapsed_ms: float = 0.0
    page_count: int = 0
    total_chars: int = 0
    arabic_decode_score: float = 0.0   # 0-1: fraction of chars that are Arabic/numeric
    transactions: list[Transaction] = field(default_factory=list)
    raw_text_sample: str = ""          # first 800 chars for inspection

# ── Coordinate-based CC transaction parser (shared logic) ───────────────────

DATE_RE = re.compile(r"^\d{2}[A-Z]{3}$")
AMOUNT_RE = re.compile(r"^[\d,]+\.\d{2}(CR)?$")
FX_CURRENCY_RE = re.compile(r"^[A-Z]{3}$")

# X-position buckets from ANALYSIS.md (A4 595pt wide)
X_POSTING_DATE    = (45,  85)
X_TXN_DATE        = (90, 140)
X_DESCRIPTION     = (140, 430)
X_FX_CURRENCY     = (295, 340)
X_FX_AMOUNT       = (400, 450)
X_AMOUNT          = (460, 530)

# Y bounds (pdfplumber "top" = distance from page top, 0=top, 842=bottom for A4)
# Page 1:  header ends ~190 (column headers at top≈199), transactions 213-427,
#          Account Summary starts top≈452, payment slip top≈614
# Page 2+: short header top≈182, transactions start top≈193, go to ~580+
# Unified filter: skip the header block (<190) and the very bottom legal area (>800)
# The DATE_RE gate naturally rejects header/summary rows that lack a valid posting date.
Y_MIN = 190
Y_MAX = 800

def in_range(val: float, rng: tuple[float, float]) -> bool:
    return rng[0] <= val <= rng[1]


def bucket_word(x: float, text: str) -> str:
    """Assign a word to a column bucket by its x position."""
    if in_range(x, X_POSTING_DATE):
        return "posting_date"
    if in_range(x, X_TXN_DATE):
        return "txn_date"
    if in_range(x, X_FX_CURRENCY) and FX_CURRENCY_RE.match(text):
        return "fx_currency"
    if in_range(x, X_FX_AMOUNT) and AMOUNT_RE.match(text):
        return "fx_amount"
    # pymupdf tokenizes "500.00CR" as two words: "500.00" + "CR".
    # Detect the standalone "CR" suffix so we can flip direction to credit.
    if in_range(x, X_AMOUNT) and text == "CR":
        return "credit_flag"
    if in_range(x, X_AMOUNT) and (AMOUNT_RE.match(text) or AMOUNT_RE.match(text + "00")):
        return "amount"
    if in_range(x, X_DESCRIPTION):
        return "description"
    return "other"


def parse_transactions_from_words(
    pages_words: list[list[dict]],
) -> list[Transaction]:
    """
    Parse CC transactions from word-level coordinate data.
    Each word dict must have keys: x0, top (or y), text.
    Works with both pdfplumber and pymupdf word formats.
    """
    Y_TOL = 3.0  # points — words within this y-distance are on the same line

    def snap_y(y: float) -> float:
        return round(y / Y_TOL) * Y_TOL

    # Collect all words across pages into (page_idx, snapped_y, x0, text)
    rows: dict[tuple[int, float], list[tuple[float, str]]] = defaultdict(list)

    for page_idx, words in enumerate(pages_words):
        for w in words:
            x0 = w["x0"]
            y = snap_y(w.get("top", w.get("y0", 0)))
            text = w["text"].strip()
            if not text or y < Y_MIN or y > Y_MAX:
                continue
            rows[(page_idx, y)].append((x0, text))

    # Sort rows by page then y (top-to-bottom)
    sorted_keys = sorted(rows.keys(), key=lambda k: (k[0], k[1]))

    transactions: list[Transaction] = []
    current: Optional[Transaction] = None
    desc_words: list[str] = []

    def flush():
        nonlocal current, desc_words
        if current and current.posting_date:
            current.description = " ".join(desc_words).strip()
            transactions.append(current)
        current = None
        desc_words = []

    for key in sorted_keys:
        word_list = sorted(rows[key], key=lambda w: w[0])  # left to right
        bucketed: dict[str, list[str]] = defaultdict(list)
        for x, text in word_list:
            bucket = bucket_word(x, text)
            bucketed[bucket].append(text)

        # A row starts a new transaction if it has a valid posting date
        posting_date_text = " ".join(bucketed.get("posting_date", []))
        if DATE_RE.match(posting_date_text):
            flush()
            current = Transaction()
            current.posting_date = posting_date_text
            current.txn_date = " ".join(bucketed.get("txn_date", []))
            desc_words = bucketed.get("description", [])
            amount_text = " ".join(bucketed.get("amount", []))
            if amount_text:
                if amount_text.endswith("CR"):
                    current.direction = "credit"
                    current.amount = amount_text[:-2]
                else:
                    # Default to debit; credit_flag may override below
                    current.direction = "debit"
                    current.amount = amount_text
            # pymupdf splits "500.00CR" → "500.00" + standalone "CR" word;
            # the credit_flag bucket catches that "CR" and marks the transaction credit.
            if bucketed.get("credit_flag"):
                current.direction = "credit"
            fx_curr = " ".join(bucketed.get("fx_currency", []))
            fx_amt = " ".join(bucketed.get("fx_amount", []))
            if fx_curr:
                current.fx_currency = fx_curr
            if fx_amt:
                current.fx_amount = fx_amt
        elif current and bucketed.get("description"):
            # Continuation line (installment info or long description)
            cont = " ".join(bucketed["description"])
            # Skip supplementary cardholder separator lines (16-digit card)
            if not re.match(r"^[\d ]{16,}$", cont):
                desc_words.append(cont)
            # Check if this continuation line has the amount (sometimes amount
            # is on a second line in older statements)
            if not current.amount:
                amount_text = " ".join(bucketed.get("amount", []))
                if amount_text:
                    if amount_text.endswith("CR"):
                        current.direction = "credit"
                        current.amount = amount_text[:-2]
                    else:
                        current.direction = "debit"
                        current.amount = amount_text
                    if bucketed.get("credit_flag"):
                        current.direction = "credit"

    flush()
    return transactions


def score_arabic(text: str) -> float:
    """Fraction of non-whitespace chars that are Arabic or Arabic-looking."""
    if not text:
        return 0.0
    non_ws = [c for c in text if not c.isspace()]
    if not non_ws:
        return 0.0
    arabic = sum(1 for c in non_ws if "\u0600" <= c <= "\u06ff" or
                 "\u0660" <= c <= "\u0669" or   # Arabic-Indic digits
                 "\ufb50" <= c <= "\ufdff" or    # Arabic Presentation Forms-A
                 "\ufe70" <= c <= "\ufeff")      # Arabic Presentation Forms-B
    return arabic / len(non_ws)


# ── Library implementations ──────────────────────────────────────────────────

def run_pdfplumber(path: Path, file_key: str) -> FileResult:
    import pdfplumber

    result = FileResult(library="pdfplumber", file_key=file_key, success=False)
    t0 = time.perf_counter()
    try:
        with pdfplumber.open(path) as pdf:
            result.page_count = len(pdf.pages)
            full_text = ""
            pages_words: list[list[dict]] = []

            for page in pdf.pages:
                page_text = page.extract_text() or ""
                full_text += page_text + "\n"
                if file_key in CC_TYPES:
                    words = page.extract_words(x_tolerance=5, y_tolerance=3) or []
                    # pdfplumber word format: {x0, top, x1, bottom, text}
                    pages_words.append([{"x0": w["x0"], "top": w["top"], "text": w["text"]} for w in words])

            result.total_chars = len(full_text)
            result.raw_text_sample = full_text[:800]
            result.arabic_decode_score = score_arabic(full_text[:2000])

            if file_key in CC_TYPES:
                result.transactions = parse_transactions_from_words(pages_words)

            result.success = True
    except Exception as e:
        result.error = f"{type(e).__name__}: {e}\n{traceback.format_exc()[-400:]}"
    result.elapsed_ms = (time.perf_counter() - t0) * 1000
    return result


def run_pymupdf(path: Path, file_key: str) -> FileResult:
    import fitz

    result = FileResult(library="pymupdf", file_key=file_key, success=False)
    t0 = time.perf_counter()
    try:
        doc = fitz.open(str(path))
        result.page_count = doc.page_count
        full_text = ""
        pages_words: list[list[dict]] = []

        for page in doc:
            page_text = page.get_text("text")
            full_text += page_text + "\n"
            if file_key in CC_TYPES:
                # pymupdf get_text("words") returns:
                # (x0, y0, x1, y1, word, block_no, line_no, word_no)
                words = page.get_text("words") or []
                pages_words.append([{"x0": w[0], "top": w[1], "text": w[4]} for w in words])

        result.total_chars = len(full_text)
        result.raw_text_sample = full_text[:800]
        result.arabic_decode_score = score_arabic(full_text[:2000])

        if file_key in CC_TYPES:
            result.transactions = parse_transactions_from_words(pages_words)

        result.success = True
        doc.close()
    except Exception as e:
        result.error = f"{type(e).__name__}: {e}\n{traceback.format_exc()[-400:]}"
    result.elapsed_ms = (time.perf_counter() - t0) * 1000
    return result


def run_pypdf(path: Path, file_key: str) -> FileResult:
    """pypdf: text-only (no coordinate access) — tests raw extraction quality."""
    import pypdf

    result = FileResult(library="pypdf", file_key=file_key, success=False)
    t0 = time.perf_counter()
    try:
        reader = pypdf.PdfReader(str(path))
        result.page_count = len(reader.pages)
        full_text = ""
        for page in reader.pages:
            full_text += (page.extract_text() or "") + "\n"

        result.total_chars = len(full_text)
        result.raw_text_sample = full_text[:800]
        result.arabic_decode_score = score_arabic(full_text[:2000])

        # For CC files: attempt regex-based transaction extraction from plain text
        # (no coordinates available)
        if file_key in CC_TYPES:
            result.transactions = _pypdf_regex_extract(full_text)

        result.success = True
    except Exception as e:
        result.error = f"{type(e).__name__}: {e}\n{traceback.format_exc()[-400:]}"
    result.elapsed_ms = (time.perf_counter() - t0) * 1000
    return result


def _pypdf_regex_extract(text: str) -> list[Transaction]:
    """
    Fallback regex extractor for pypdf (no coordinates).
    Pattern: posting_date txn_date description [fx_curr fx_amt] egp_amt [CR]
    """
    DATE_PAT = r"\d{2}[A-Z]{3}"
    AMT_PAT = r"[\d,]+\.\d{2}"
    FX_PAT = r"[A-Z]{3}"

    # Match lines like: 25MAY 21MAY MERCHANT NAME ... 1,260.00
    line_re = re.compile(
        rf"^({DATE_PAT})\s+({DATE_PAT})\s+(.+?)\s+"
        rf"(?:({FX_PAT})\s+({AMT_PAT})\s+)?"
        rf"({AMT_PAT})(CR)?$",
        re.MULTILINE,
    )
    transactions = []
    for m in line_re.finditer(text):
        tx = Transaction(
            posting_date=m.group(1),
            txn_date=m.group(2),
            description=m.group(3).strip(),
            fx_currency=m.group(4) or "",
            fx_amount=m.group(5) or "",
            amount=m.group(6),
            direction="credit" if m.group(7) else "debit",
        )
        transactions.append(tx)
    return transactions


# ── CSV output ────────────────────────────────────────────────────────────────

TX_FIELDS = ["posting_date", "txn_date", "description", "direction", "amount", "fx_currency", "fx_amount"]

def save_transactions_csv(result: FileResult) -> Path:
    out_path = OUTPUT_DIR / f"{result.library}__{result.file_key}.csv"
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=TX_FIELDS)
        writer.writeheader()
        for tx in result.transactions:
            writer.writerow({
                "posting_date": tx.posting_date,
                "txn_date": tx.txn_date,
                "description": tx.description,
                "direction": tx.direction,
                "amount": tx.amount,
                "fx_currency": tx.fx_currency,
                "fx_amount": tx.fx_amount,
            })
    return out_path


def save_text_sample_csv(result: FileResult) -> Path:
    """For account statements: save raw text sample as a single-column CSV."""
    out_path = OUTPUT_DIR / f"{result.library}__{result.file_key}.csv"
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["raw_text_sample"])
        writer.writerow([result.raw_text_sample])
    return out_path


# ── Report generation ─────────────────────────────────────────────────────────

def build_report(all_results: list[FileResult]) -> str:
    libs = ["pdfplumber", "pymupdf", "pypdf"]
    file_keys = list(TEST_FILES.keys())

    lines = [
        "# HSBC PDF Library Comparison Report",
        "",
        f"Generated by `compare_pdf_libs.py`",
        "",
        "## Test Matrix",
        "",
        "| File | Type | Library | Status | Time (ms) | Pages | Chars | Txns | Arabic Score |",
        "|------|------|---------|--------|-----------|-------|-------|------|--------------|",
    ]

    results_by_key: dict[str, dict[str, FileResult]] = defaultdict(dict)
    for r in all_results:
        results_by_key[r.file_key][r.library] = r

    for fk in file_keys:
        ftype = "Account" if fk == "account" else f"CC/{fk.title()}"
        for lib in libs:
            r = results_by_key[fk].get(lib)
            if r is None:
                lines.append(f"| {fk} | {ftype} | {lib} | ❌ N/A | — | — | — | — | — |")
                continue
            status = "✅" if r.success else "❌"
            txn_count = len(r.transactions) if r.file_key in CC_TYPES else "N/A"
            arabic = f"{r.arabic_decode_score:.3f}"
            lines.append(
                f"| {fk} | {ftype} | {lib} | {status} | {r.elapsed_ms:.1f} | "
                f"{r.page_count} | {r.total_chars:,} | {txn_count} | {arabic} |"
            )

    # ── Per-file deep comparison for CC files ─────────────────────────────────
    lines += ["", "---", "", "## Credit Card Transaction Counts by Library", ""]
    lines += ["| File | pdfplumber | pymupdf | pypdf (regex) | Winner |"]
    lines += ["|------|-----------|---------|---------------|--------|"]
    for fk in CC_TYPES:
        counts = {}
        for lib in libs:
            r = results_by_key[fk].get(lib)
            counts[lib] = len(r.transactions) if (r and r.success) else 0
        winner = max(counts, key=lambda k: counts[k])
        lines.append(
            f"| {fk} | {counts['pdfplumber']} | {counts['pymupdf']} | {counts['pypdf']} "
            f"| **{winner}** ({counts[winner]}) |"
        )

    # ── Account statement Arabic decode comparison ────────────────────────────
    lines += ["", "---", "", "## Account Statement: Arabic Decoding", ""]
    lines += ["| Library | Chars extracted | Arabic score | Verdict |"]
    lines += ["|---------|----------------|--------------|---------|"]
    for lib in libs:
        r = results_by_key["account"].get(lib)
        if r and r.success:
            score = r.arabic_decode_score
            chars = r.total_chars
            if score > 0.3:
                verdict = "✅ Arabic decoded"
            elif chars > 500 and score < 0.05:
                verdict = "⚠️ Latin-only garbage (custom encoding)"
            elif chars < 100:
                verdict = "❌ Nearly empty extraction"
            else:
                verdict = "⚠️ Mixed / unclear"
            lines.append(f"| {lib} | {chars:,} | {score:.3f} | {verdict} |")
        else:
            lines.append(f"| {lib} | — | — | ❌ Error |")

    # ── Transaction quality sample (first 5 from best-performing lib) ─────────
    lines += ["", "---", "", "## Sample Transactions (first 5 per CC type, best library)", ""]
    for fk in CC_TYPES:
        best_lib = max(
            libs,
            key=lambda lib: len(results_by_key[fk].get(lib, FileResult("", "", False)).transactions)
        )
        r = results_by_key[fk].get(best_lib)
        lines += [f"### {fk.title()} — {best_lib}", ""]
        lines += ["| Posting | TxnDate | Description | Dir | Amount (EGP) | FX |"]
        lines += ["|---------|---------|-------------|-----|-------------|-----|"]
        if r and r.transactions:
            for tx in r.transactions[:5]:
                fx = f"{tx.fx_currency} {tx.fx_amount}" if tx.fx_currency else ""
                desc = tx.description[:50].replace("|", "/")
                lines.append(f"| {tx.posting_date} | {tx.txn_date} | {desc} | {tx.direction} | {tx.amount} | {fx} |")
        else:
            lines.append("| — | — | (no transactions extracted) | — | — | — |")
        lines.append("")

    # ── Raw text samples for account (all 3 libs) ─────────────────────────────
    lines += ["---", "", "## Account Statement — Raw Text Samples (first 300 chars)", ""]
    for lib in libs:
        r = results_by_key["account"].get(lib)
        lines += [f"### {lib}", "", "```"]
        sample = (r.raw_text_sample[:300] if r and r.success else "(failed)").replace("```", "~~~")
        lines.append(sample)
        lines += ["```", ""]

    # ── Errors ─────────────────────────────────────────────────────────────────
    errors = [r for r in all_results if not r.success]
    if errors:
        lines += ["---", "", "## Errors", ""]
        for r in errors:
            lines += [f"### {r.library} / {r.file_key}", "", f"```", r.error[:500], "```", ""]

    # ── Recommendations ───────────────────────────────────────────────────────
    lines += [
        "---",
        "",
        "## Recommendations",
        "",
        "| Use Case | Recommended Library | Reason |",
        "|----------|---------------------|--------|",
        "| CC statement parsing (coordinate-based) | pdfplumber or pymupdf | Both support word-level coordinates; pdfplumber has cleaner API |",
        "| Arabic account statements | pymupdf (fitz) | MuPDF engine has best ToUnicode table handling for custom fonts |",
        "| Simple text extraction (no layout) | pypdf | Lightest dependency, sufficient for metadata/plain text |",
        "| Production parser | pymupdf | Fastest, best font coverage, actively maintained |",
        "",
    ]

    return "\n".join(lines)


# ── Main ──────────────────────────────────────────────────────────────────────

RUNNERS = [
    ("pdfplumber", run_pdfplumber),
    ("pymupdf",    run_pymupdf),
    ("pypdf",      run_pypdf),
]


def main():
    print("HSBC PDF Library Comparison")
    print("=" * 60)

    # Verify all test files exist
    missing = [k for k, p in TEST_FILES.items() if not p.exists()]
    if missing:
        print(f"ERROR: missing test files: {missing}", file=sys.stderr)
        sys.exit(1)

    all_results: list[FileResult] = []

    for file_key, pdf_path in TEST_FILES.items():
        file_size_kb = pdf_path.stat().st_size // 1024
        print(f"\n{'─'*60}")
        print(f"File: {file_key}  ({pdf_path.name}, {file_size_kb} KB)")
        print(f"{'─'*60}")

        for lib_name, runner_fn in RUNNERS:
            print(f"  [{lib_name:12s}] ", end="", flush=True)
            result = runner_fn(pdf_path, file_key)
            all_results.append(result)

            if result.success:
                txn_info = f"{len(result.transactions)} transactions" if file_key in CC_TYPES else f"arabic={result.arabic_decode_score:.3f}"
                print(f"✅  {result.elapsed_ms:6.1f}ms  |  {result.page_count}pp  |  {result.total_chars:,} chars  |  {txn_info}")
            else:
                short_err = result.error.split("\n")[0][:80]
                print(f"❌  {short_err}")

            # Save CSV
            if file_key in CC_TYPES:
                csv_path = save_transactions_csv(result)
            else:
                csv_path = save_text_sample_csv(result)
            print(f"{'':16s}→ {csv_path.name}")

    # Build report
    report_text = build_report(all_results)
    report_path = OUTPUT_DIR / "REPORT.md"
    report_path.write_text(report_text, encoding="utf-8")

    print(f"\n{'='*60}")
    print(f"Report written: {report_path}")
    print(f"CSVs in:        {OUTPUT_DIR}")
    print("Done.")


if __name__ == "__main__":
    main()
