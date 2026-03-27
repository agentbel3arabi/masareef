# User Flows

Step-by-step journeys through the app. Each flow references the relevant feature file for detailed specs.

---

## Flow 1: First-Time Onboarding

**Goal:** New user goes from sign-up to seeing their first financial snapshot.

```
1. User visits masareef.app → lands on marketing page
2. Clicks "Get Started" → Supabase Auth sign-up (email/password or OAuth)
3. Email verification → redirected to onboarding wizard

4. Step 1 — Create Household
   → Enter household name ("Personal" pre-filled)
   → Select base currency (EGP default, auto-detected from locale)

5. Step 2 — Add First Account
   → Quick form: name, type, currency, initial balance
   → Suggested: "Let's start with your primary bank account"
   → Skip option available (can add later)

6. Step 3 — Import or Skip
   → "Do you have a bank statement to import?"
   → Option A: Upload CSV/Excel/PDF → import flow (see Flow 2)
   → Option B: Skip → go to dashboard

7. Step 4 — Set Preferences
   → Language: Arabic / English
   → Calendar: Gregorian / Hijri
   → Number format: Western / Arabic-Indic
   → Dark/light theme

8. Dashboard loads with whatever data exists
   → If import done: populated dashboard with transactions
   → If skipped: empty state with CTAs ("Add account", "Import statement", "Record transaction")
```

**Time to value:** Under 3 minutes from sign-up to first imported statement.

> Details: [multi-user.md](./03-features/multi-user.md), [settings.md](./03-features/settings.md)

---

## Flow 2: Import Bank Statement

**Goal:** User imports a CSV/Excel/PDF bank statement into an account.

```
1. User navigates to Import page (sidebar → Import)

2. Select target account
   → Dropdown of active accounts
   → "Add new account" link if none exist

3. Upload file
   → Drag-and-drop zone or file picker
   → Accepts: CSV, XLSX, XLS, PDF

4. System detects file type and processes:

   4a. CSV/Excel with account-linked template:
       → Template auto-applied → skip to step 6

   4b. CSV/Excel with detected bank preset:
       → "Looks like HSBC Egypt. Use this format?" → Confirm/Reject
       → If confirmed → skip to step 6

   4c. CSV/Excel with no match:
       → Show column headers from file
       → User maps: Date, Description, Debit, Credit (drag-drop or dropdowns)
       → User selects date format
       → Preview first 5 rows to verify mapping

   4d. PDF (text-based) with preset:
       → Auto-parse → skip to step 6

   4e. PDF (scanned) — Free user:
       → "This looks like a scanned document. Upgrade to Premium to import scanned statements."
       → Show upgrade CTA

   4f. PDF (scanned) — Premium user:
       → Sent to Landing AI OCR → parse → continue to step 6

5. For manual mapping: "Save this as a template?"
   → User names template (e.g., "CIB Savings CSV")
   → Toggle: "Use as default for this account"
   → Saved for next time

6. Preview parsed transactions
   → Table: date, description, debit, credit, status (valid/duplicate/error)
   → Duplicates auto-deselected with "Duplicate" badge
   → Per-row toggles: include/exclude, applies to balance
   → Summary: 47 valid, 3 duplicates, 0 errors

7. Confirm import
   → "Import 47 transactions to CIB Savings?"
   → Confirm button

8. Processing
   → Atomic insert + balance update
   → AI categorization queued in background
   → Redirect to account page with first imported transaction highlighted

9. AI categorization completes (seconds later)
   → Transactions update with category badges
   → High-confidence: auto-assigned silently
   → Medium-confidence: shown with "AI" badge
   → Low-confidence: "Uncategorized" with "Categorize" button
```

> Details: [import.md](./03-features/import.md), [categories.md](./03-features/categories.md)

---

## Flow 3: Daily Transaction Recording

**Goal:** User records a purchase they just made.

```
Quick path (< 10 seconds):
1. Dashboard or any page → "+" floating action button (mobile) or "Add Transaction" button
2. Sheet slides up with transaction form
3. Fill: amount (keypad), select account, type (debit pre-selected)
4. Optional: description, category (AI suggests after first keystroke in description)
5. Tap "Save" → toast confirmation → balance updates immediately

Full path:
1. Navigate to Transactions page
2. Click "Add Transaction"
3. Full form: date, account, type, amount, description, category, notes
4. Optional: link to asset, link to Gam3eya
5. Save → redirected to transaction list with new row highlighted
```

**Optimistic update:** Balance changes instantly in the UI before server confirms.

> Details: [transactions.md](./03-features/transactions.md)

---

## Flow 4: Transfer Between Accounts

**Goal:** Move money from bank account to cash wallet (or cross-currency).

```
1. Accounts page → "Transfer" button (or from account detail → overflow menu)
2. Transfer sheet opens:
   → From account (pre-selected if opened from account)
   → To account
   → Amount
   → Date (today default)

3. If currencies differ:
   → FX rate field appears
   → System suggests latest rate from exchange_rates table
   → User can override
   → Target amount auto-calculated and displayed

4. Save → two transactions created atomically
   → Debit leg on source, credit leg on destination
   → Both balances update
   → Toast: "Transferred 5,000 EGP to Cash Wallet"
```

> Details: [transfers.md](./03-features/transfers.md)

---

## Flow 5: Managing Debts

### 5a. Add a Bank Loan
```
1. Debts page → Loans tab → "Add Loan"
2. Fill: name, institution, principal, annual rate %, tenure months, start date
3. Optional: link to account (for auto-match)
4. System computes monthly payment → displayed in form
5. Save → loan card appears with amortization schedule (collapsible)
```

### 5b. Record a Loan Payment
```
1. Loan card → "Record Payment" or auto-match suggestion appears
2. If auto-match: "We found a transaction that looks like your March payment. Link it?"
   → Confirm → debt_payment created, linked to transaction
3. If manual: enter date, amount → principal/interest auto-split by amortization engine
4. Amortization table updates → paid row turns green
```

### 5c. Add a P2P Debt
```
1. Debts page → P2P tab → select person (or create new first)
2. "Lend Money" or "Borrow Money" → form opens
3. Fill: amount, currency, start date
4. Select repayment mode:
   → Lump sum: enter single due date
   → Equal splits: enter number of payments (dates auto-generated)
   → Custom splits: add rows with amount + date each
5. Save → debt appears under person card with schedule
```

### 5d. Add an Installment
```
1. Debts page → Card Installments or Store Installments tab → "Add Plan"
2. Fill: name, merchant (store only), credit card (CC only), total amount, monthly amount, months, start month
3. Save → plan card appears with progress bar
4. Per-card utilization summary updates
```

> Details: [debts.md](./03-features/debts.md)

---

## Flow 6: Gam3eya Lifecycle

```
1. Gam3eya page → "New Gam3eya"
2. Fill: name, monthly contribution, total months, payout month (or configure splits)
3. Link to account, add notes
4. Save → Gam3eya card appears with payment schedule

Monthly cycle:
5. Reminder notification: "Office Gam3eya contribution due in 3 days"
6. User records payment → debit transaction created → schedule month turns green
7. Repeat monthly

Payout month:
8. Notification: "Your Gam3eya payout is today!"
9. User records payout → credit transaction created → net position updates

Completion:
10. After all months → system suggests marking as completed
11. Net position should be 0 → celebration animation
```

> Details: [gam3eya.md](./03-features/gam3eya.md)

---

## Flow 7: Asset Tracking

```
1. Assets page → "Add Asset"
2. Select type: real estate, gold, silver, vehicle, savings certificate, other
3. Fill type-specific fields:
   → Gold: quantity (grams), purchase price per gram
   → Vehicle: name, purchase price, purchase date
   → Real estate: name, location, price, area (sqm)
4. Save → asset card appears

Ongoing:
5. Link transactions to asset:
   → When creating transaction → "Link to asset" dropdown
   → Or from asset detail → "Link existing transaction"
6. Asset detail page shows:
   → Ownership cost vs current value (ROI)
   → Operating cost with monthly average
   → Value history chart
   → All linked transactions

Valuation update:
7. Manual: asset detail → "Update Value" → enter new value
8. Auto (gold/silver): Settings → Assets → "Fetch Prices" → all commodity assets update
```

> Details: [assets.md](./03-features/assets.md)

---

## Flow 8: Budget Cycle

```
Month start:
1. System auto-creates next month's budget (if recurring enabled)
   → Or: Budgets page → "New Budget" → allocate per category
2. Optional: "Suggest from history" → system pre-fills based on 3-month average
3. User adjusts allocations → save

During the month:
4. Dashboard shows budget progress per category
5. Notification at 80%: "Groceries budget 80% used — 1,000 EGP remaining"
6. Notification at 100%: "Groceries over budget by 500 EGP"

Month end:
7. Budget summary: under/over per category, total surplus/deficit
8. If rollover enabled: unused amounts carry forward to next period
```

> Details: [budgets.md](./03-features/budgets.md)

---

## Flow 9: Forecasting Review

```
1. Navigate to Forecasting page
2. Cash flow chart loads: 12-month projection with income/expense bars + balance line
3. Scan for red months (negative balance)

If negative month found:
4. Click the month → drill-down shows all projected items
5. Identify: "Gam3eya payout ends in June, but car loan continues — August goes negative"
6. Options: adjust recurring rules, record expected income, plan for the gap

Debt payoff review:
7. Scroll to debt payoff section
8. Line chart shows each debt declining over time
9. "Debt-free date: January 2030"
10. Consider: extra payment on highest-interest loan → recalculate
```

> Details: [forecasting.md](./03-features/forecasting.md)

---

## Flow 10: Family Setup

```
1. Admin goes to Settings → Household
2. Clicks "Invite Member"
3. Enters spouse's email, display name "Sara", role "member"
4. System generates invite link + 6-char code
5. Admin shares code via WhatsApp

6. Sara opens link or enters code in app → signs up → joins household
7. Sara sees all shared accounts, transactions, budgets
8. Sara can create transactions, debts, record Gam3eya payments
9. Sara cannot manage members or change household settings

Adding a child:
10. Admin invites child, assigns "child" role
11. Admin links specific accounts to child (e.g., allowance account)
12. Child logs in → sees only their linked account and own transactions
```

> Details: [multi-user.md](./03-features/multi-user.md)

---

## Flow 11: AI Categorization Correction

```
1. After import, user reviews transaction list
2. Sees a transaction: "AMAZON" → AI categorized as "Shopping" (confidence 85%)
3. This was actually a grocery delivery → user clicks category → selects "Groceries"
4. System updates category AND creates a categorization rule:
   pattern: "AMAZON", match_type: "contains", category: "Groceries"
5. Next time "AMAZON" appears → rule engine catches it instantly (no AI call)
6. Over time: user corrections build a personalized rule set
7. After 1 month: >70% of recurring merchants handled by rules, AI calls decrease
```

> Details: [categories.md](./03-features/categories.md)

---

## Flow 12: Report Generation

```
1. Navigate to Reports (sidebar or dashboard CTA)
2. Select report type: Income & Expense
3. Configure: date range (Q1 2026), all accounts, all categories, EGP
4. "Generate" → report renders on screen with tables and charts
5. Review data → "Export as PDF"
6. If small: instant download
7. If large: "Generating... we'll notify you when ready"
   → Notification arrives → download link in notification
```

> Details: [reports.md](./03-features/reports.md)

---

## Edge Cases & Error States

| Scenario | Handling |
|----------|---------|
| Import file with 0 valid rows | Show error: "No valid transactions found. Check the file format." |
| FX rate missing for conversion | Show amount in original currency with warning icon |
| AI provider unreachable | Fall back to rule engine → then "Uncategorized" |
| Concurrent edits by family members | Last-write-wins with Supabase Realtime push to refresh |
| Account deletion with linked debts | Block: "This account is linked to 2 debts. Unlink first." |
| Negative account balance after transaction | Allow with warning (user may know about pending deposits) |
| Import duplicate of a manually entered transaction | Duplicate detection catches it → flagged for user decision |
| Budget period with no transactions | Show all categories as "Under Budget" with 0% spent |
| Gam3eya with all months elapsed but not marked complete | System prompts: "This Gam3eya has ended. Mark as complete?" |
| P2P debt split sum doesn't equal principal | Validation error on form submit — cannot save |
