# HSBC Egypt PDF Structure Analysis

Generated: 2026-03-19

---

## TL;DR

| Statement Type | Parseable with pdfjs? | Approach |
|---|---|---|
| **Credit Cards** (all 4 types) | ✅ YES — clean English text | Coordinate-based column parser |
| **Account Statements** | ❌ NO — custom Arabic fonts (all years) | Redirect to CSV export |

---

## Credit Card Statements

### Tested files
- Cashback: `090226_statements.pdf`, `090326_statements.pdf`
- Evolution: `040625_statements.pdf`
- Platinum: `040625_statements.pdf`
- Premier: `040625_statements.pdf`

### Font situation
All CC statements use standard embedded fonts (`g_d0_f1`, etc) — **zero Type3/EX fonts**.
Text extraction works perfectly.

### Page layout (A4, 595×842pt)

```
y752  Header: "ACCOUNT STATEMENT"
y736  Name + address (lines y736-y704)
y712  Card Number (x422), Card Type (x422)
y688  Statement Date (x424)
y670  Credit Limit (x422)
y660  Page No (x474)
y646  "(EGP)" currency label

y638/636/634  Column headers:
              [x52] Posting Date  [x96] Transaction Date  [x270] Transaction Details  [x498] Amount

y622  OPENING BALANCE row: [x150]"OPENING BALANCE"  [x497]amount

y610→y384  Transaction rows (see below)

y384  Account Summary section
y372  Headers: Opening balance / Payments+Credits / New charges+debits / Closing balance
y360  Values (sum row)

y348  Cashback Summary OR Rewards Points Summary (card-dependent) + Payment Summary
y332  Minimum Payment Due amount
y326  "Current Minimum Payment Due" label
y312  Due date

y220  PAYMENT SLIP (ignore — user-facing tearoff)
```

### Transaction row structure

Each transaction occupies 1-2 lines:

**Line 1 (the data row):**
```
[x60-61]  Posting Date  — "25MAY", "01JUN", "14JAN"
[x110-112] Transaction Date — "21MAY", "01JUN", "12JAN"
[x150]    Description start — merchant name / payment reference
[x215]    City (optional)
[x252]    Country sub-code (optional)
[x264]    Period separator "." (optional)
[x317]    Foreign currency code (e.g. "SAR", "USD") — only for FX transactions
[x425-429] Foreign currency amount — only for FX transactions
[x497-509] EGP Amount — number only, "CR" suffix means credit
```

**Line 2 (continuation, optional):**
- Installment info: `"6TH OF 12 INSTALLMENT"` or `"7TH OF 24 INSTALLMENT"`
- Long description overflow

**Supplementary cardholder separator:**
```
[x150]  Card number (16 digits, spaces: "4263 5582 0338 2545")
[x230]  Cardholder name
```
Then that cardholder's transactions follow.

### Date format
`DDMON` — e.g. `25MAY`, `01JUN`, `14JAN`
Year = statement year (infer from Statement Date header)
Edge case: December transactions on a January statement → year is prior year.

### Amount format
- `1,260.00` — debit (charge)
- `1,260.00 CR` — credit (payment / refund)
- For FX: `SAR 35.00` then `451.18` (EGP equivalent)

### Account Summary (bottom of page 1, last page repeated)
```
Opening balance  -  Payments/Credits  +  New charges/debits  =  Closing balance
```
All 4 values appear on y360 (or similar), at x122-250-393-533 (approximate).

### Per-card-type differences
| Card type | Extra section |
|---|---|
| Cashback | Cashback Summary: "Total Cashback to be Credited" |
| Platinum | Rewards Points Summary: Air Miles Opening/Earned/Total |
| Premier | Rewards Points Summary: My Rewards Opening/Earned/Total |
| Evolution | None |

### Installment detail pages
Platinum and Premier may have a final page listing active installment plans:
```
Start date | End date | Amount | Outstanding principal balance | Interest Balance
```

### Multi-currency transactions
When a foreign currency is charged:
```
[x317] "SAR"  [x425] "35.00"  [x505] "451.18"   ← EGP charged
```
The EGP equivalent at x497-509 is always present.

---

## Account Statements

### Tested files
2023-11, 2024-01, 2024-08, 2025-03, 2025-04 (latest)

### Font situation — BLOCKER
Every account statement (across all years 2023–2025) uses custom Arabic font encoding:
- **Older statements (≤2024)**: Type3 fonts named `EXxxxxxx` — 80+ variants, no character maps
- **Newer statements (2025)**: Custom embedded fonts named `g_d2_fN` — different encoding, same result

pdfjs extracts garbage characters for ALL meaningful content (dates, amounts, descriptions).

### What IS readable
Only isolated English structural words are readable:
- `"Date"` at x72 (left column header)
- `"This is a system generated statement and does not require attestation"` (footer)
- Some partial header words

### What is NOT readable
- Transaction dates (Arabic-Indic numerals + Arabic month names)
- Transaction descriptions (Arabic merchant names)
- Debit/credit amounts (Arabic-Indic numerals)
- Account balance

### Column position evidence (for future reference)
Even though text is garbled, these x-positions recur as amount columns:
- **x435-454**: likely Debit column
- **x516-540**: likely Credit column
- **x339-366**: likely Transaction Date range (RTL direction)

### Attempted approaches
- pdfjs text extraction: ❌ garbled
- Type3 font workaround: ❌ no character maps available
- Standard font reuse: ❌ custom encoding, not standard Unicode

### Viable paths for v2
1. **Python `pdfplumber` / `pymupdf`** — better Arabic ToUnicode table handling
2. **Tesseract OCR** on rasterized pages — works but slow, needs Arabic language pack
3. **Google Vision API / AWS Textract** — cloud OCR, highest accuracy for Arabic PDFs

### v1 Decision
Show a clear user-facing message when account PDF parsing returns 0 valid rows:
> "This statement uses Arabic formatting that can't be read automatically.
> Please export your statement as CSV from HSBC Online Banking."

---

## Implementation Plan for Credit Card Parser

### Detection (which preset to use)
Read from header:
- `"CASHBACK CREDIT CARD"` at x422, y704 → Cashback preset
- `"VISA GOLD"` → Evolution preset
- `"VISA PLATINUM"` → Platinum preset
- `"HSBC PREMIER"` → Premier preset

### Key extraction steps

1. **Parse header** (page 1 only)
   - Card Number: x422, y712
   - Statement Date: x424, y688 → parse `DDMONYYYY` → full date
   - Credit Limit: x422, y670
   - Currency: always EGP from `(EGP)` label

2. **Find transaction rows**
   - Skip lines where y > 640 (header area) and y < 384 (summary area)
   - A transaction row has an item at x60-61 with text matching `[0-9]{2}[A-Z]{3}`
   - Adjacent line at x150 with no date = description continuation or installment info

3. **Parse transaction row**
   - Posting date = cell at x≈60
   - Transaction date = cell at x≈110
   - Description = cell at x≈150 (join with continuation line if present)
   - Amount = cell at x≈497-509 (strip " CR" suffix → mark as credit)
   - If cell at x≈317 exists → foreign currency transaction, record original amount too

4. **Detect cardholder sections**
   - A line at x≈150 matching 16-digit card pattern = new cardholder section
   - Line at x≈230 = cardholder name

5. **Parse summary**
   - Find "OPENING BALANCE" → opening amount at x≈497
   - Find "Account Summary" section → extract closing balance

6. **Multi-page handling**
   - Page 2+ start with: `[x150]"Posting Date"` header
   - Skip continuation/legal text lines (no date pattern)
   - Last page may be installment detail (start date / end date / amounts)

---

## File Inventory

### Account Statements (12 files)
```
021123_statements.pdf  — Nov 2023
010224_statements.pdf  — Feb 2024  (filename = MMYY)
030523_statements.pdf  — May 2023
030823_statements.pdf  — Aug 2023
010824_statements.pdf  — Aug 2024  (different naming)
020524_statements.pdf  — May 2024
031124_statements.pdf  — Nov 2024
030225_statements.pdf  — Feb 2025
030525_statements.pdf  — May 2025
030825_statements.pdf  — Aug 2025
031125_statements.pdf  — Nov 2025
0302_26_statements.pdf — Feb 2026  (different naming)
300425_statements.pdf  — Apr 2025  (different naming)
```

### Credit Card Statements
```
Cashback/  — 2 files (Feb+Mar 2026)
Evolution/ — 11 files (Jun 2025 → Mar 2026)
Platinum/  — 9 files (May 2025 → Mar 2026)
Premier/   — 10 files (May 2025 → Mar 2026)
```
