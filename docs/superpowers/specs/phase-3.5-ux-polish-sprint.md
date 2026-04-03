# Phase 3.5 — Polish Sprint Execution Plan

> **Goal**: Fix all critical/high/medium UX issues found in the post-Phase 3 browser audit before starting Phase 4 (Dashboard & Charts).
> **Estimated effort**: 2–3 days
> **Branch**: `feature/phase-3.5-polish-sprint`
> **Base**: `main`

---

## Prerequisites

Before starting any unit, read:
- `CLAUDE.md` (always)
- `docs/guides/09-design-tokens.md` (all frontend work)
- `docs/superpowers/handoff/` — most recent handoff note
- This file (`phase-3.5-execution-plan.md`)

---

## Unit 1 — Critical Bug Fixes

**Priority**: MUST complete first. These are user-facing bugs that break trust.

### 1.1 Net Worth card: fix green color for negative values
- **File**: Find the Net Worth card component (likely in `frontend/src/app/dashboard/` or a shared component)
- **What**: When net worth is negative, the card background is green (misleading). It must:
  - Show **red/destructive** background when value < 0
  - Show **green/success** background when value ≥ 0
- **Token**: Use `--destructive` / `--success` from design tokens
- **Test**: Verify on Dashboard and Accounts page net worth summary bar

### 1.2 Credit card "Available" balance: fix green color for negative
- **File**: Credit card component in the Accounts page
- **What**: When "AVAILABLE" balance is negative (e.g., -100,324.98), it displays in green. It must:
  - Show **red** text when Available < 0
  - Show **green** text when Available ≥ 0
- **Test**: Check with HSBC Premier card which has negative available balance

### 1.3 Transaction form: add Account selector
- **File**: New Transaction form/dialog component
- **What**: Add an Account dropdown field to the New Transaction form. Requirements:
  - Place it after the Expense/Income toggle and before the Date field
  - Populate with all active accounts (same list as the filter dropdown on Transactions page)
  - **Default**: Pre-select the account from the user's most recent transaction (query last transaction's `account_id`). If no previous transactions, show "Select account" placeholder.
  - Field is **required** — form cannot submit without it
  - Show account name + institution as label (e.g., "HSBC EGP · HSBC")
- **Backend check**: Verify the create transaction endpoint already accepts `account_id` — if not, add it

### 1.4 Category dropdown: fix raw `__uncategorized__` display
- **File**: New Transaction form, Category combobox
- **What**: Default category shows `__uncategorized__` (raw internal value). Change to:
  - Display text: **"Uncategorized"** (or "Select category")
  - Ensure the value sent to backend remains correct
- **Also check**: Any other dropdowns showing raw enum/internal values

### 1.5 Date format standardization — dd/mm/yyyy everywhere
- **Scope**: Global change across the entire frontend
- **What**: Standardize ALL date displays and inputs to **dd/mm/yyyy** format
- **Locations to fix** (search the entire frontend):
  1. **Dashboard** recent transactions: currently "Apr 3, 2026" → change to "03/04/2026"
  2. **Transaction table**: currently "2026-04-03" → change to "03/04/2026"
  3. **Transfer table**: check and fix
  4. **Debt detail pages**: check and fix
  5. **All date input fields**: currently show mm/dd/yyyy placeholder → change to dd/mm/yyyy
  6. **Account detail page**: check date displays
- **Implementation approach**:
  - Create a shared `formatDate()` utility in `frontend/src/lib/utils.ts` (or similar) that formats dates as dd/mm/yyyy
  - Use `next-intl` date formatting configured for `en-EG` locale or custom format
  - Replace ALL direct date formatting calls with this utility
  - For date inputs, set the HTML `lang` attribute or use a custom date picker component that shows dd/mm/yyyy
- **Test**: Check every page that shows a date

---

## Unit 2 — Form UX Improvements

### 2.1 Convert Add Account form from modal to side sheet
- **What**: Replace the center modal dialog with a right-side sliding sheet (same pattern as Add Loan, Add Transaction, Add Installment)
- **Why**: Ahmed's decision — all forms should use side sheets for consistency
- **Match**: Use the same sheet component and width as the debt forms

### 2.2 Add required field markers to ALL forms
- **Scope**: Every form in the app
- **What**: Add red asterisk (*) next to labels of required fields
- **Implementation**:
  - Create a shared `<FormLabel>` component (or extend existing) that accepts a `required` prop and renders `*` in red
  - Apply to all forms: Add Account, New Transaction, Add Loan, Add Installment, Add P2P Debt, Add Person, New Transfer
- **Required fields per form** (verify against backend validation):
  - Add Account: Name, Type, Currency
  - New Transaction: Account, Date, Description, Amount
  - Add Loan: Loan Name, Lender, Currency, Principal Amount, Interest Rate, Start Date, Term Months, Monthly Payment
  - Add Installment: Plan Name, Total Amount, Monthly Payment, Number of Months, Start Month, Source Account
  - New Transfer: From Account, To Account, Amount, Date
  - Add Person: Name

### 2.3 Fix raw enum values in form dropdowns
- **Installment Type dropdown**: `credit_card` → "Credit Card", `bnpl` → "BNPL", etc.
  - Create a mapping object for human-readable installment type labels
- **Any other dropdowns** showing raw enum values — search for snake_case values in select/combobox options
- **Pattern**: Create a shared `formatEnumLabel()` utility that converts snake_case to Title Case, with override map for special cases (BNPL, P2P, etc.)

### 2.4 Fix "Opening Balance" label for Credit Cards
- **File**: Add Account form
- **What**: When account type is "Credit Card", change "Opening Balance" label to "Current Balance Due"
- **Implementation**: Conditionally render label based on selected account type

### 2.5 Fix truncated filter labels ("Max amoun", "Min amoun")
- **Files**: Transaction page filters, Account detail page filters
- **What**: "Max amount" and "Min amount" are truncated due to CSS
- **Fix**: Either:
  - Increase the min-width of these input fields, OR
  - Use shorter labels: "Min" and "Max" with a group label "Amount range", OR
  - Ensure placeholder text isn't clipped (check `text-overflow`, `overflow`, width constraints)
- **Test on**: Transactions page and Account detail page

### 2.6 Add inline form validation
- **What**: Show validation errors inline below each field (not just on submit)
- **Implementation**:
  - Use the existing form library's validation (React Hook Form, Zod, or native)
  - Show red border + error message below invalid fields
  - Validate on blur (when user leaves a field) and on submit
  - Error messages: "This field is required", "Amount must be greater than 0", "Please select an account"
- **Apply to**: All forms (Add Account, New Transaction, Add Loan, Add Installment, Add Person, New Transfer)

---

## Unit 3 — Placeholder & Status Text Cleanup

### 3.1 Replace "Coming in Phase X" with subtle icon indicator
- **Dashboard**: "Monthly Income" and "Monthly Spending" cards
  - Remove "Coming in Phase 2" text
  - Show the "—" value with a small **clock icon** (🕐 or Lucide `clock` icon) next to it
  - No text — just the icon to hint "coming soon"
- **Dashboard**: "Income vs Expenses" and "Spending by Category" chart placeholders
  - Remove "Charts coming in Phase 4" text
  - Show the chart icon (already there) with a subtle **lock icon** overlay or small clock badge
  - Keep the card outline but make it more muted (lower opacity or dashed border)

### 3.2 Fix inconsistent stat card behavior
- **Transactions page**: Income, Expenses, Net Flow cards show "—" with NO context
  - Add the same subtle clock icon as Dashboard
- **Account Detail page**: Income This Month, Expenses This Month, Avg. Transaction show "—" with "Coming soon" text
  - Replace "Coming soon" text with the clock icon (matching Dashboard pattern)
- **Goal**: All placeholder stats across the app should look identical

### 3.3 Clean up disabled sidebar items
- **Budgets** and **Gam3eya**: currently grayed out text
  - Add a small lock or clock icon next to the label
  - Add a tooltip on hover: "Coming soon"
  - Keep them visible but clearly indicate they're planned features

---

## Unit 4 — Account Card Enhancements

### 4.1 Add 3-dot action menu to all account cards
- **What**: Add a `⋮` (vertical ellipsis) menu button to the top-right of every account card
- **Menu items**:
  - "View Transactions" → navigates to account detail page
  - "Edit" → opens edit form (side sheet)
  - "Transfer" → opens new transfer form with this account pre-selected
  - Divider
  - "Delete" → soft delete with confirmation dialog
- **Apply to**: Bank Account, Cash Wallet, Financing App cards
- **Credit Card**: Same menu but add "View Statement" option
- **Implementation**: Use shadcn/ui `DropdownMenu` component

### 4.2 Add hover states to account cards
- **What**: On hover, cards should show:
  - Subtle elevation increase (shadow)
  - Border color change to primary
  - Cursor: pointer
- **Implementation**: Tailwind classes: `hover:shadow-md hover:border-primary/50 transition-all cursor-pointer`
- **Apply to**: All account cards, debt cards, installment cards

### 4.3 Add account type sub-labels
- **Bank Account cards**: Show sub-text based on institution or a user-defined label (e.g., "Checking", "Savings")
  - For now, show the account type: "Bank Account" in muted text below the name
- **Cash Wallet cards**: Show "Cash" sub-label (already done)
- **Financing App cards**: Show "BNPL" badge (already done) — good

### 4.4 Add last activity indicator
- **What**: Below the balance on each card, show "Last activity: X days ago" in muted text
- **Data source**: Query the most recent transaction date for each account
- **Format**:
  - Today: "Last activity: today"
  - Yesterday: "Last activity: yesterday"
  - 2-30 days: "Last activity: X days ago"
  - 30+ days: "Last activity: dd/mm/yyyy"
  - No transactions: "No transactions yet"

### 4.5 Add balance trend indicator
- **What**: Small up/down arrow next to the balance showing direction this month
- **Implementation**:
  - Compare current balance to balance at start of month (or 30 days ago)
  - ↑ green arrow if balance increased
  - ↓ red arrow if balance decreased
  - — gray if unchanged
- **Note**: This requires a backend endpoint or calculation. If the endpoint doesn't exist yet:
  - Add a TODO comment in the component
  - Add an entry to `docs/backend-dependencies.md`
  - Show just the balance without the trend for now

### 4.6 Add warning state for negative balances
- **What**: When a bank account balance is significantly negative, show visual urgency:
  - Light red/destructive background tint on the card
  - Or red left border accent (similar to how Financing App has purple)
- **Threshold**: Any negative balance (< 0) gets the warning treatment
- **Don't apply to**: Credit cards (negative available is normal) or Financing Apps (expected to be liabilities)

### 4.7 Consistent status badges across all card types
- **What**: Cash Wallet and Financing App cards are missing the green "ACTIVE" badge that Bank Account cards have
- **Fix**: Add the same `● ACTIVE` badge to all card types
- **Apply to**: Cash Wallet, Financing App cards

---

## Unit 5 — Navigation & Cross-Linking

### 5.1 Add breadcrumb navigation to all detail pages
- **Account Detail**: Already has breadcrumb ✓
- **Loan Detail**: Add breadcrumb: "Debts > Loans > [Loan Name]"
- **Installment Detail**: Add breadcrumb: "Debts > Installments > [Plan Name]"
- **Implementation**: Create a shared `<Breadcrumb>` component using shadcn/ui breadcrumb
- **Pattern**: `[Section] > [Sub-section] > [Item Name]`

### 5.2 Link transactions to related debts
- **What**: In the transaction table, if a transaction is linked to a debt (description starts with "Debt payment:"), show a small link icon that navigates to the debt detail page
- **Implementation**: Check if transaction has a `debt_id` or if description matches "Debt payment:" pattern
- **UI**: Small pill/badge with debt name, clickable → navigates to debt detail

### 5.3 Add "View Transactions" link to Dashboard account summary
- **What**: Make the Net Worth / Assets / Liabilities summary bar on the Accounts page clickable or add explicit links
- **Dashboard Recent Transactions**: Already has "View all" ✓
- **Dashboard Active Debts card**: Make clickable → navigates to Debts page

---

## Unit 6 — Miscellaneous Polish

### 6.1 Fix mixed Arabic/English on CIB card
- **What**: CIB account card shows "حساب CIB" — mixed Arabic/English
- **Fix**: This is likely the user-entered account name. If it's seed data, update it to be consistent. If it's user data, leave it (user's choice).
- **Action**: Check if this is seed data → update to "CIB Account" or "CIB حساب" consistently

### 6.2 Add empty state designs
- **What**: When a section has no data, show a helpful empty state instead of blank space
- **Designs needed**:
  - Accounts page with no accounts: illustration + "Add your first account" CTA button
  - Transactions page with no transactions: illustration + "Record your first transaction" or "Import a bank statement"
  - Debts page with no debts: illustration + "Track your first loan or installment"
  - Dashboard with no data: onboarding wizard or "Get started" cards
- **Implementation**: Create a shared `<EmptyState>` component with props for icon, title, description, and action button
- **Icons**: Use Lucide icons (wallet, receipt, landmark, etc.)

### 6.3 FAB button label
- **What**: FAB (+) buttons on Transactions and Debts pages have no visible label
- **Fix**: Add a tooltip on hover: "Add Transaction" / "Add Debt"
- **Implementation**: Wrap FAB in shadcn/ui `Tooltip` component

### 6.4 Add success feedback after form submissions
- **What**: After successfully creating an account/transaction/debt, show a toast notification
- **Implementation**: Use the existing `sonner` toast system
- **Messages**: "Account created successfully", "Transaction saved", "Loan added", etc.
- **Also**: Close the form sheet/modal after successful submission

---

## Execution Order

Recommended order for Claude Code:

1. **Unit 1** (Critical bugs) — do this first, it's the foundation
2. **Unit 3** (Placeholder cleanup) — quick wins, high visual impact
3. **Unit 2** (Form UX) — most complex unit, takes longest
4. **Unit 4** (Card enhancements) — significant visual improvement
5. **Unit 5** (Navigation) — improves usability
6. **Unit 6** (Miscellaneous) — finishing touches

Within each unit, tasks can generally be done in order listed.

---

## Definition of Done

For each unit:
- [ ] All changes use CSS logical properties (no `pl-`, `pr-`, `ml-`, `mr-`, `left-`, `right-`)
- [ ] All changes use design tokens from `globals.css` (no hardcoded colors)
- [ ] Frontend builds successfully (`pnpm build`)
- [ ] Frontend lint passes (`pnpm lint`)
- [ ] TypeScript has no errors (`pnpm exec tsc --noEmit`)
- [ ] Visual check in browser at `http://localhost:3000`
- [ ] RTL/Arabic mode not broken

For the sprint overall:
- [ ] All 5 critical bugs fixed and verified
- [ ] All forms use side sheet pattern
- [ ] All forms have required field markers
- [ ] All dates show dd/mm/yyyy format
- [ ] All placeholder text uses consistent clock icon pattern
- [ ] Account cards enhanced with action menus, hover states, status badges
- [ ] Handoff note created at `docs/superpowers/handoff/phase-3.5-unit-1.md`

---

## Files Likely to Be Modified

### Frontend (most changes)
- `frontend/src/app/dashboard/page.tsx` (or similar)
- `frontend/src/app/accounts/page.tsx`
- `frontend/src/app/transactions/page.tsx`
- `frontend/src/app/debts/page.tsx`
- `frontend/src/components/` — various card and form components
- `frontend/src/lib/utils.ts` — shared formatDate(), formatEnumLabel() utilities
- `frontend/src/components/ui/` — may need new shared components (EmptyState, Breadcrumb, FormLabel)
- `frontend/src/app/globals.css` — possibly add new semantic tokens if needed

### Backend (minimal changes expected)
- Transaction create endpoint — verify `account_id` is accepted
- May need a "last transaction" query for the account default feature

### Docs
- `docs/backend-dependencies.md` — update if any backend work is deferred
- `docs/superpowers/handoff/phase-3.5-unit-1.md` — handoff note when done
