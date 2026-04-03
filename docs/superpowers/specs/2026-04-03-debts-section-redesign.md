# Debts Section Redesign — Design Spec

**Date:** 2026-04-03
**Branch:** feature/phase-3d-4-frontend-integration
**Approach:** Modify in place — keep working backend, redesign frontend UX, add missing backend features

## Context

The Debts section was built across Phases 3A–3D. The backend (amortization engine, payment recording, auto-match, P2P splits, RBAC) is sound. The frontend UX is the problem: the loan creation flow is tedious, card expand shows the wrong data, there's no balance-impact awareness, no payment frequency options, no cross-linking between Accounts and Debts, and BNPL accounts don't have a clear home.

This redesign addresses all of these issues while maintaining backward compatibility with existing data.

---

## 1. Tab Structure & Navigation

### Current → New

| Current (5 tabs) | New (3 tabs) |
|---|---|
| Loans | **Loans** |
| Card Installments | **Installments** (Card + BNPL + Store combined) |
| Financing Apps | _(merged into Installments)_ |
| Store Installments | _(merged into Installments)_ |
| P2P | **P2P** |

### Page Header

- **Title:** "Debts & Installments" / "الديون والأقساط"
- **Navbar actions** (via `useNavbarActions` context): Manage button (bulk mode)
- **FAB** (floating action button, bottom-end): context-sensitive `+` based on active tab:
  - Loans tab → opens Add Loan form
  - Installments tab → opens Add Installment form
  - P2P tab → opens Add P2P Debt form

### BNPL Accounts

- BNPL (`financing_app`) accounts **remain visible** on the Accounts grid page for account management (edit name, adjust credit limit, delete)
- BNPL account cards have a **distinct visual style** — different from credit cards (see Section 5 for details)
- BNPL account detail page: FAB opens a **speed dial** (two options): "Add Installment" (pre-linked to account) and "Record Payment". Not "Add Transaction" — BNPL accounts don't have standalone transactions.
- Transaction list on BNPL detail page shows installment charges and payments as they auto-create
- Installment plans are **managed** in Debts → Installments → BNPL section

---

## 2. Loans Tab — Card Expand & Quick Actions

### Loan Card (Collapsed)

Same as current: name, institution, APR badge, periodic payment amount, remaining amount, progress bar.

### Loan Card (Expanded)

Clicking a loan card expands it inline. The expanded view focuses on the **next actionable payment**, not the beginning of the amortization history:

```
┌─────────────────────────────────────────────────┐
│ Car Loan - CIB              Active   14.50% APR │
│ CIB                                             │
│                            Quarterly: 35,250 EGP│
├─────────────────────────────────────────────────┤
│ Principal: 500,000  │ Payment: 35,250           │
│ Start: Jan 2025     │ Tenure: 60 months         │
├─────────────────────────────────────────────────┤
│ ██████████████░░░░░░░░░░░░░░░░░░░░  25% paid   │
│                         Remaining: 529,500 EGP  │
├─────────────────────────────────────────────────┤
│ NEXT PAYMENT                                    │
│ #16 — Apr 15, 2026          ⚠ Overdue / Upcoming│
│ 11,750 EGP (Principal: 6,258 + Interest: 5,492)│
│                                                 │
│  [ Record Payment ]   [ Match Found — Review ]  │
├─────────────────────────────────────────────────┤
│  [ Edit ]  [ Delete ]       View Full Details → │
└─────────────────────────────────────────────────┘
```

**Behaviors:**

- **Next payment first:** Shows the first unpaid installment (overdue or upcoming)
- **Match-first flow:** If the loan has a linked account and a matching transaction is found, show "Match Found — Review" alongside "Record Payment"
- **Record Payment:** Opens pre-filled form (amount from schedule, date from schedule, linked account pre-selected)
- **"Match Found — Review":** Shows matched transaction details inline — user confirms with one click
- **"View Full Details →":** Navigates to loan detail page
- **Edit / Delete:** Standard shared button pattern (Edit opens form sheet, Delete opens confirmation dialog)

---

## 3. Bank Loan Form & Post-Creation Flow

### Loan Form (FormSheet)

| Field | Type | Notes |
|-------|------|-------|
| Loan name | text | required |
| Institution | text | optional |
| Currency | select | default EGP, only on create |
| Principal amount | number | required |
| Annual interest rate (%) | number | optional, default 0 |
| Tenure (months) | number | required |
| Payment frequency | select | `monthly` / `quarterly` / `semi_annual` / `annual` — default `monthly` |
| Start date | date | required |
| Payment day of month | select (1-28) | defaults from start date's day, user can override |
| Linked bank account | select | filtered to bank accounts in same currency |
| Notes | textarea | optional |

### Live Preview

Appears below the form fields once principal + tenure + rate + frequency are filled:

```
┌──────────────────────────────────────────┐
│ Quarterly Payment: 35,250 EGP            │
│ Total Cost: 705,000 EGP                  │
│ Total Interest: 205,000 EGP              │
│ Payment day: 15th of each quarter        │
└──────────────────────────────────────────┘
```

The label dynamically adjusts based on payment frequency: "Monthly Payment", "Quarterly Payment", "Semi-Annual Payment", "Annual Payment".

### Post-Creation Flow

1. Loan is created immediately (API call)
2. Form closes
3. **If start date is in the past** → redirect to loan detail page with a **"Setup Past Payments" banner**

### Setup Past Payments Banner

Shown once for newly created loans with past installments. All past installments are **pre-checked**. Grouped by balance impact based on the linked account's effective cutoff date (`max(opened_at, last_reconciliation_date)`):

```
┌─────────────────────────────────────────────────────────┐
│ Setup Past Payments                                     │
│                                                         │
│ This loan started 12 months ago. Select which           │
│ installments have been paid:                            │
│                                                         │
│ ── Before opening balance (Jan 15, 2025) ──────────── │
│ ⓘ These are for history only — won't affect balance    │
│                                                         │
│ ☑ #1  — Feb 15, 2025   11,750 EGP                     │
│ ☑ #2  — Mar 15, 2025   11,750 EGP                     │
│ ☑ #3  — Apr 15, 2025   11,750 EGP                     │
│                                                         │
│ ── After opening balance ──────────────────────────── │
│ ⚠ These will reduce your CIB Savings balance by        │
│   70,500 EGP                                            │
│                                                         │
│ ☑ #4  — May 15, 2025   11,750 EGP                     │
│ ☑ #5  — Jun 15, 2025   11,750 EGP                     │
│ ☑ #12 — Jan 15, 2026   11,750 EGP                     │
│                                                         │
│ Unchecked installments will be marked as overdue.       │
│                                                         │
│           [ Confirm 12 Payments ]  [ Skip for Now ]     │
└─────────────────────────────────────────────────────────┘
```

**Behaviors:**

- **Before opening balance:** grayed out styling, info message. Auto-created transactions set `applies_to_balance = false`
- **After opening balance:** normal styling, warning with total impact amount. Transactions set `applies_to_balance = true`
- **Uncheck any row** → that installment becomes overdue
- **"Skip for Now"** → dismisses banner, user records payments manually later
- **No linked account selected** → all past payments shown without balance-impact grouping; payments recorded as debt payments only (no auto-created transactions)

---

## 4. Record Payment Flow (Match-First)

### Step 1 — Check for Matches (automatic, if linked account exists)

```
┌─────────────────────────────────────────────────────────┐
│ Record Payment — Car Loan #16                           │
│ Expected: 11,750 EGP — Due: Apr 15, 2026               │
│                                                         │
│ ── Matching Transaction Found ─────────────────────── │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Apr 16, 2026  LOAN REPAYMENT CIB                   │ │
│ │ -11,750.00 EGP          CIB Savings    95% match   │ │
│ │                                                     │ │
│ │        [ Confirm This Match ]                       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Multiple matches shown ranked by score.                 │
│                                                         │
│ ── Or Enter Manually ─────────────────────────────── │
│ [ Enter payment details manually ]                      │
└─────────────────────────────────────────────────────────┘
```

**If user confirms a match:**
- Debt payment created, linked to existing transaction (`link_existing_transaction_id`)
- No new transaction created (avoids double-counting)
- Form closes, UI refreshes

**If no match or user clicks "Enter manually":**

### Step 2 — Pre-Filled Form

| Field | Pre-filled value |
|-------|-----------------|
| Date | Schedule date (e.g., Apr 15, 2026) |
| Amount | Expected payment from amortization |
| Account | Linked account |
| Notes | empty |

User can adjust any field. On submit:
- New transaction auto-created on the selected account
- Debt payment created and linked to that transaction
- `applies_to_balance` computed from date vs account cutoff

### P2P Debts

- No match-first step (typically no linked account)
- Form opens directly with amount pre-filled from next unpaid split
- Account select shows all accounts in the debt's currency

---

## 5. Installments Tab (Card + BNPL + Store)

### Layout — Three Collapsible Sections, Grouped by Account

```
▼ Credit Card Installments
  ┌── HSBC Visa ──────────────────────────────────┐
  │ 3 active plans │ 4,500 EGP/mo │ 85% utilized  │
  │ Credit limit: 100,000 EGP                     │
  ├────────────────────────────────────────────────┤
  │ iPhone 16 Pro    6/12    2,250 EGP/mo          │
  │ Samsung TV       3/24    1,500 EGP/mo          │
  │ Gym Membership   9/12      750 EGP/mo          │
  └────────────────────────────────────────────────┘

▼ BNPL
  ┌── ValU ───────────────────────────────────────┐
  │ 2 active plans │ 2,800 EGP/mo │ 62% utilized  │
  │ Credit limit: 50,000 EGP                      │
  ├────────────────────────────────────────────────┤
  │ Washing Machine   4/12   1,500 EGP/mo          │
  │ Laptop            2/18   1,300 EGP/mo          │
  └────────────────────────────────────────────────┘

▼ Store Installments
  ┌── B.TECH ─────────────────────────────────────┐
  │ 1 active plan │ 900 EGP/mo                     │
  ├────────────────────────────────────────────────┤
  │ AC Unit          5/18    900 EGP/mo             │
  └────────────────────────────────────────────────┘
```

### Account-Level Card

- Account name
- Active plan count + total monthly commitment
- Utilization % (for credit cards and BNPL with credit limits)
- Credit limit (when applicable)

### Plan Rows

- Plan name, progress (X of Y paid), periodic amount
- Click → expands to show next payment + quick action (same pattern as loan cards)

### BNPL Visual Distinction

BNPL accounts and cards use a **distinct visual style** separate from credit cards:

| Element | Credit Card | BNPL |
|---------|------------|------|
| Type badge | "Credit Card" — default badge color | "BNPL" — distinct accent color (violet/purple) |
| Icon | `CreditCard` (lucide) | `Smartphone` or `Wallet` (lucide) |
| Card accent | Standard border | Start-side border stripe in BNPL accent color |
| Utilization bar | Standard green/amber/red | Same thresholds, BNPL accent color family |
| Section header | Plain | BNPL accent background tint |

Exact color defined as design token `--color-bnpl` for consistency across all surfaces.

### Credit Card Installment Auto-Progression

Credit card installments **do not require manual payment recording**. They are automatically included in the monthly statement and paid via the normal credit card bill.

- **Progress tracking:** `months_elapsed / total_months` — computed on read, no `debt_payment` records needed
- **No "Record Payment" button** on credit card installment plans
- Backend: cron or on-read computation marks elapsed months as "paid"

### BNPL Payment

BNPL installments **do require manual payment recording**. The FAB on the BNPL account detail page is a **speed dial** with two options:
- "Add Installment" — create a new plan linked to this account
- "Record Payment" — record a payment for a single plan

On the Installments tab itself, the FAB opens "Add Installment" and the BNPL section header has a dedicated "Bulk Pay" button (see Section 11).

For bulk payments across multiple BNPL apps, see Section 10.

---

## 6. Credit Card ↔ Debts Integration

### Credit Card on Accounts Grid

- Standard card: name, balance, available credit, utilization bar
- **Installment summary badge:** "3 plans · 4,500/mo" — clicking navigates to Debts → Installments tab filtered to this card

### Credit Card Utilization Formula

```
used = remaining_installment_total
     + cycle_spending (transactions this billing cycle)
     - payments_this_cycle
     - cashback_this_cycle

utilization = used / credit_limit × 100
```

Color thresholds: green <50%, amber 50-80%, red >80%.

### Credit Card Account Detail Page

**Installments summary section** at the top (below header stats):

```
┌─────────────────────────────────────────────────────────┐
│ Installment Plans                          View All →   │
│                                                         │
│ 3 active plans │ 4,500 EGP/month commitment             │
│                                                         │
│ iPhone 16 Pro     6/12    2,250 EGP/mo                  │
│ Samsung TV        3/24    1,500 EGP/mo                  │
│ Gym Membership    9/12      750 EGP/mo                  │
│                                                         │
│ Next billing cycle: Apr 15 — these installments will    │
│ be included in your statement automatically.            │
└─────────────────────────────────────────────────────────┘
```

- **"View All →"** navigates to Debts → Installments tab filtered to this card
- FAB remains "Add Transaction" (normal credit card behavior)

### Bank Account Detail Page

For bank accounts with linked loans:

```
┌─────────────────────────────────────────────────────────┐
│ Linked Loans                                            │
│                                                         │
│ Car Loan - CIB    Next: Apr 15   11,750 EGP/mo         │
│ Home Loan - HSBC  Next: Apr 20   18,500 EGP/mo         │
│                                                         │
│                                   View Details →        │
└─────────────────────────────────────────────────────────┘
```

---

## 7. P2P Tab Redesign

### Layout

**Summary cards** at top: Total Lent | Total Borrowed | Net Balance

**People list** below — each person card shows:
- Avatar (initials) + name + relationship badge
- Per-currency balance summary
- Net balance
- Active debt count
- Expand → shows individual debts with quick actions

### Expanded Person Card

```
┌─────────────────────────────────────────────────────────┐
│ AH  Ahmed Hassan                         Family         │
│     EGP: You lent 15,000 · He paid 5,000               │
│     Net: He owes you 10,000 EGP                         │
│     2 active debts                                      │
├─────────────────────────────────────────────────────────┤
│ Loan to Ahmed — 10,000 EGP          Active  50% paid   │
│ Next split: 2,500 EGP due May 1     [ Record Payment ] │
│                                                         │
│ Laptop money — 5,000 EGP            Active  100% paid  │
│ Fully paid                           [ Mark Settled ]   │
│                                                         │
│ [ Add Debt for Ahmed ]           View Person Details →  │
└─────────────────────────────────────────────────────────┘
```

### P2P Debt Form (FormSheet)

| Field | Type | Notes |
|-------|------|-------|
| Person | autocomplete select | Search existing. **"+ Add new person"** at bottom opens inline sub-form |
| → Inline sub-form | name (req), name_ar, phone, relationship | Saves person, auto-selects |
| Direction | toggle | "I lent" / "I borrowed" |
| Amount | number | required |
| Currency | select | default EGP |
| Start date | date | required |
| Repayment mode | radio | Lump sum / Equal splits / Custom splits |
| → Lump sum | due date | single date |
| → Equal splits | split count | auto-generates monthly dates |
| → Custom splits | rows: amount + date | must sum to principal |
| Notes | textarea | optional |

### FAB on P2P Tab

Opens "Add P2P Debt" form.

### Record Payment on P2P

- No match-first step (typically no linked account)
- Form opens with amount pre-filled from next unpaid split
- Account select shows all accounts in debt's currency

### Person Detail Page

Accessible via "View Person Details →":
- Person info (name, phone, email, relationship)
- All debts with this person, both directions
- Per-currency balance breakdown
- Total net in base currency
- Edit person / delete person (only if no active debts)

---

## 8. Shared Button Consistency

### Rule

Every action that appears on more than one page must use the exact same component, icon, label pattern, and size.

### Standardized Action Buttons

| Action | Icon | Label Pattern | Variant | Size | Used On |
|--------|------|--------------|---------|------|---------|
| Primary add (FAB) | `Plus` h-6 w-6 | none (icon only) | gradient primary circle | h-14 w-14 fixed | All data pages |
| Manage | `Settings` | "{section}.manage" | `outline` `sm` | navbar | All list pages |
| Edit | `Pencil` | "actions.edit" | `ghost` `icon` | inline | All detail/expanded cards |
| Delete | `Trash2` | "actions.delete" | `ghost` `icon` destructive | inline | All detail/expanded cards |
| Record Payment | `CircleDollarSign` | "debts.actions.recordPayment" | `default` `sm` | inline | Loan/BNPL/P2P cards |
| Mark Settled | `CheckCircle2` | "debts.actions.markPaid" | `outline` `sm` | inline | Debt detail pages |
| View Details | text link | "{section}.viewDetails →" | link style | inline | Expanded cards |

### Implementation

- All pages use `useNavbarActions` context hook for header buttons — no inline header buttons
- No raw `<button>` elements with custom Tailwind for actions — use `Button` component from `ui/button`
- FAB pattern: identical component across all pages, only `onClick` and `aria-label` change

---

## 9. Balance Impact Logic

### Core Rule

When a debt payment auto-creates a transaction, that transaction's `applies_to_balance` flag depends on whether the payment date falls after the account's effective cutoff date.

### Cutoff Date

```python
cutoff = max(account.opened_at, account.last_reconciliation_date)
# If neither exists, cutoff = None → all transactions affect balance
```

### Logic

```
payment_date < cutoff  → applies_to_balance = false  (history only)
payment_date >= cutoff → applies_to_balance = true   (affects balance)
```

### Where This Applies

- Bulk past payment recording (Setup Past Payments banner)
- Individual payment recording via Record Payment form
- Any future auto-payment recording

### Frontend Display

- **Transaction lists:** grayed out row + tag "History only — doesn't affect balance"
- **Setup Past Payments banner:** clear grouping by cutoff (see Section 3)
- **Account detail transaction list:** same grayed styling + tag

### Backend Changes

- `record_payment` service: auto-compute `applies_to_balance` based on payment date vs account cutoff
- New helper: `get_balance_cutoff_date(account) → date | None`
- Bulk payment endpoint: applies cutoff logic per payment
- No change to `compute_displayed_balance` — it already filters on `applies_to_balance = true` and `date >= opened_at`

---

## 10. Payment Frequency

### Options

| Frequency | Value | Period Interval |
|-----------|-------|-----------------|
| Monthly | `monthly` | 1 month |
| Quarterly | `quarterly` | 3 months |
| Semi-annual | `semi_annual` | 6 months |
| Annual | `annual` | 12 months |

### Backend Changes

- New column: `payment_frequency` on `debts` table — enum, default `monthly`
- Amortization engine: interval between payments = frequency months
- PMT formula: rate per period = annual rate / (12 / frequency_months), periods = tenure_months / frequency_months
- Keep column name `monthly_payment_minor` in DB (rename is high-churn for no functional gain) — frontend label is dynamic

### Frontend Changes

- Loan form: new "Payment frequency" select dropdown after tenure, defaults to `monthly`
- All labels dynamic: "Monthly Payment" / "Quarterly Payment" / "Semi-Annual Payment" / "Annual Payment"
- Amortization table: rows spaced by frequency (quarterly = 4 rows per year, not 12)

---

## 11. BNPL Bulk Payment Wizard

### Trigger

- Dedicated "Bulk Pay" button in the Installments tab → BNPL section header
- Also accessible from BNPL account detail page

### Step 1 — Select Plans

```
┌─────────────────────────────────────────────────────────┐
│ BNPL Bulk Payment                           Step 1 of 3 │
│                                                         │
│ Select installments to pay this month:                  │
│                                                         │
│ ── ValU ────────────────────────────────────────────── │
│ ☑ Washing Machine    #4 due Apr 5     1,500 EGP        │
│ ☑ Laptop             #2 due Apr 10    1,300 EGP        │
│                                                         │
│ ── Souhoola ────────────────────────────────────────── │
│ ☑ Furniture          #6 due Apr 8     2,200 EGP        │
│                                                         │
│ Selected: 3 plans                  Subtotal: 5,000 EGP  │
│                                            [ Next → ]   │
└─────────────────────────────────────────────────────────┘
```

### Step 2 — Fees & Total

```
┌─────────────────────────────────────────────────────────┐
│ BNPL Bulk Payment                           Step 2 of 3 │
│                                                         │
│ Installments total:                        5,000 EGP    │
│ Payment fees:          [ 35        ] EGP                │
│                        ─────────────────                │
│ Total to pay:                              5,035 EGP    │
│                                                         │
│ Pay from:  [ CIB Credit Card ▼ ]                        │
│ Date:      [ 2026-04-03       ]                         │
│                                 [ ← Back ]  [ Next → ]  │
└─────────────────────────────────────────────────────────┘
```

### Step 3 — Link or Create

```
┌─────────────────────────────────────────────────────────┐
│ BNPL Bulk Payment                           Step 3 of 3 │
│                                                         │
│ ── Link to Existing Transaction ───────────────────── │
│ ┌───────────────────────────────────────────────────┐   │
│ │ Apr 3  MYFAWRY PAYMENT  -5,035 EGP   92% match   │   │
│ │                          [ Use This ]             │   │
│ └───────────────────────────────────────────────────┘   │
│                                                         │
│ ── Or ─────────────────────────────────────────────── │
│ [ Create new transaction ]                              │
│                                                         │
│ Summary:                                                │
│ • ValU — Washing Machine #4:  1,500 EGP                │
│ • ValU — Laptop #2:          1,300 EGP                 │
│ • Souhoola — Furniture #6:   2,200 EGP                 │
│ • Payment fees:                 35 EGP                  │
│ • Total:                     5,035 EGP                  │
│                                 [ ← Back ] [ Confirm ]  │
└─────────────────────────────────────────────────────────┘
```

### On Confirm

- One transaction created (or linked to existing)
- Multiple `debt_payment` records — one per selected plan
- Fees: separate transaction tagged "Payment Fees" category
- Balance impact logic applies (Section 9 rules)

### Backend

- New endpoint: `POST /api/v1/debts/bulk-payment`
- Accepts: list of `{debt_id, installment_number}` + `total_amount_minor` + `fee_minor` + `account_id` + optional `link_existing_transaction_id`
- Service splits total into individual debt payments based on each plan's expected amount
- Fee: stored as separate transaction with predefined "Payment Fees" category

### Linking After the Fact

- Any unlinked BNPL payment shows "Link to transaction" button in payment history
- Opens search/match view filtered to payment's account and date range

---

## Backend Schema Changes Summary

| Change | Table | Details |
|--------|-------|---------|
| New column | `debts` | `payment_day_of_month INTEGER` (1-28, nullable, defaults to start_date day) |
| New column | `debts` | `payment_frequency VARCHAR` enum: monthly/quarterly/semi_annual/annual, default monthly |
| Modify | amortization engine | Use `payment_day_of_month` for schedule dates, `payment_frequency` for interval |
| Modify | `record_payment` | Auto-compute `applies_to_balance` from date vs account cutoff |
| New helper | `get_balance_cutoff_date(account)` | Returns `max(opened_at, last_reconciliation_date)` |
| New endpoint | `POST /api/v1/debts/bulk-payment` | Bulk BNPL payment with fee handling |
| New endpoint | `POST /api/v1/debts/{id}/bulk-past-payments` | Bulk record past payments with balance-impact grouping |
| Modify | credit card installment tracking | On-read or cron: auto-progress elapsed months |

---

## Frontend Component Changes Summary

| Component | Action |
|-----------|--------|
| `debts/page.tsx` | Restructure 5 tabs → 3 tabs |
| `debts/loans-tab.tsx` | Expand shows next payment + quick actions |
| `debts/bank-loan-form.tsx` | Add payment_day_of_month, payment_frequency, live preview |
| `debts/loan-detail-content.tsx` | Add Setup Past Payments banner |
| `debts/record-payment-form.tsx` | Match-first flow, pre-filled defaults |
| `debts/installments-tab.tsx` | New: combined tab with 3 collapsible sections grouped by account |
| `debts/bnpl-bulk-payment.tsx` | New: 3-step wizard |
| `debts/p2p-tab.tsx` | Person groups with expand, inline person creation in form |
| `debts/p2p-debt-form.tsx` | Add inline person creation |
| `shared/action-button.tsx` or equivalent | Enforce consistent button patterns |
| `accounts/page.tsx` | BNPL cards with distinct visual style |
| `accounts/[id]/page.tsx` | Installments summary section for credit cards; linked loans for bank accounts; BNPL detail page with installment FAB |

---

## i18n Keys Affected

- `debts.tabs.*` — rename from 5 to 3 tab labels
- `debts.form.loan.*` — new fields: paymentDayOfMonth, paymentFrequency, livePreview labels
- `debts.form.payment.*` — match-first flow labels
- `debts.installments.*` — new combined tab labels, BNPL section
- `debts.bulkPayment.*` — new wizard step labels
- `debts.balanceImpact.*` — history-only tag, balance warning messages
- `debts.frequency.*` — monthly/quarterly/semi_annual/annual labels
- `accounts.bnpl.*` — BNPL-specific labels on account pages
- `accounts.installments.*` — installment summary section on account detail
