# Debts Section Complete — Design Spec

**Date:** 2026-04-02
**Scope:** Complete the debts section (`/debts` page) to production quality across all debt types
**Branch:** `feature/phase-3-debts-complete` (cut from current `feature/phase-3d-4-frontend-integration`)

## Background

Phase 3 was built across sub-phases 3A→3D. The debts section is functional but has tracked gaps: payment recording doesn't affect account balances, the installment model lacks interest rate tracking, P2P custom splits UI is incomplete, detail pages lack edit/delete actions, RBAC is only on debts/persons routers, and several smaller issues.

This milestone addresses every gap to make the `/debts` section production-complete.

## Approach

Vertical feature slices — each unit delivers a complete, testable feature top-to-bottom (backend + frontend). Four units total.

---

## Unit 1: Payment→Account Auto-Transaction

### Problem

When a debt payment is recorded, it creates a `DebtPayment` record but does NOT create a transaction on any account. Account balances are unaffected. Payments exist in isolation from the transaction ledger.

### Design

#### Backend

**Schema change — `PaymentCreate`:**
- Add `account_id: int` (required) — the account money flows from/to
- Add `link_existing_transaction_id: int | None = None` — for matching to an existing transaction (auto-match flow)
- Remove `transaction_id` from public API (becomes internal, set by service)

**Service change — `record_payment()`:**

After creating the `DebtPayment`, determine the transaction path:

1. **Match path** (`link_existing_transaction_id` provided): Validate the transaction exists, belongs to the household, and is on the specified `account_id`. Link the payment to it. Do NOT create a new transaction.

2. **Auto-create path** (no match): Call `create_transaction()` with:
   - `account_id` = provided account
   - `amount_minor` = payment amount (unsigned)
   - `type` = determined by debt type and direction (see table below)
   - `description` = auto-generated from debt name/person name
   - `date` = payment date
   - `category_id` = new predefined "Debt Payment" category

Then set `debt_payment.transaction_id = new_transaction.id`.

**Transaction direction logic:**

| Debt Type | Payment Action | Transaction Type | Description Template |
|-----------|---------------|-----------------|---------------------|
| bank_loan | You pay installment | debit | "Loan payment: {debt.name}" |
| personal_borrowed | You repay what you owe | debit | "Debt repayment to {person.name}" |
| personal_lent | Someone repays what they owe you | credit | "Debt collection from {person.name}" |

**P2P creation auto-transaction:**

When creating a P2P debt, also auto-create an initial transaction representing the original money movement:
- `personal_lent`: debit from selected account (you gave money)
- `personal_borrowed`: credit to selected account (you received money)

Schema change — `DebtCreate`: Add `account_id: int` as required for P2P types (`personal_lent`, `personal_borrowed`). Optional for `bank_loan` (bank loans already have `linked_account_id` which serves a different purpose — identifying where to look for match suggestions).

**New predefined categories:**

Add to seed data:
- "Debt Payment" / `"سداد دين"` — Type: EXPENSE, Predefined: true (used for outgoing payments: loan installments, P2P repayments you make)
- "Debt Collection" / `"تحصيل دين"` — Type: INCOME, Predefined: true (used for incoming payments: P2P repayments received from others)

#### Frontend

**`record-payment-form.tsx`:** Add account selector dropdown. Filter to active accounts matching the debt's currency. Required field. When auto-match suggestions are available (Unit 4), the "Use this" button pre-fills amount/date and sets `link_existing_transaction_id`.

**`p2p-debt-form.tsx`:** Add account selector — "Which account did this money leave/enter?" Required. Label changes based on type: "Source account" for lent, "Destination account" for borrowed.

#### Acceptance Criteria

- [ ] Recording a loan payment creates a debit transaction on the selected account
- [ ] Recording a P2P repayment creates correct debit/credit based on direction
- [ ] Creating a P2P lent debt creates a debit transaction on the selected account
- [ ] Creating a P2P borrowed debt creates a credit transaction on the selected account
- [ ] Account balance (computed from transactions) reflects all debt payments
- [ ] Linking to an existing transaction (match flow) does NOT create a duplicate
- [ ] "Debt Payment" (expense) and "Debt Collection" (income) predefined categories appear in category list
- [ ] Outgoing debt payments use "Debt Payment" category; incoming P2P repayments use "Debt Collection" category
- [ ] household_id scoping enforced on all new transaction creation paths
- [ ] Existing tests updated, new tests for auto-transaction creation

---

## Unit 2: Installment Plans Completion

### Problem

The `installment_plans` table has no `annual_rate_bps` column. Users cannot track interest rates on credit card or financing app installments.

### Design

#### Backend

**DB Migration:** Add `annual_rate_bps INTEGER NOT NULL DEFAULT 0` to `installment_plans` table.

**Schema updates:**
- `InstallmentCreate`: add `annual_rate_bps: int = 0`
- `InstallmentResponse`: add `annual_rate_bps: int`
- `InstallmentUpdate`: add `annual_rate_bps: int | None`

**Service:** No calculation changes. The rate is informational/display only. Accurate interest amortization for installments is out of scope — this field tracks the stated rate so users know if a plan has fees.

#### Frontend

**`installment-form.tsx`:** Add "Annual interest rate %" number input. Show for all installment types. Default to 0. Disabled on edit (matches bank loan form pattern).

**Display:** Show rate on installment plan rows and any detail views where it's relevant.

#### i18n

- `installments.annualRate` / `installments.annualRateLabel` in EN/AR

#### Acceptance Criteria

- [ ] Migration adds `annual_rate_bps` column with default 0
- [ ] Existing installment plans unaffected (default 0)
- [ ] Create installment with rate → rate persisted and returned in response
- [ ] Rate displayed in installment form and plan rows
- [ ] Rate field disabled on edit
- [ ] EN + AR translations for rate field

---

## Unit 3: P2P Completion & Detail Page Polish

### Problem

Multiple frontend gaps: P2P custom splits UI missing, edit/delete not wired to detail pages, financing app provider names have no Arabic support, no provider autocomplete.

### Design

#### Backend

**DB Migration:** Add `name_ar TEXT` (nullable) to `accounts` table.

**Schema updates:**
- `AccountCreate`: add `name_ar: str | None = None`
- `AccountUpdate`: add `name_ar: str | None = None`
- `AccountResponse`: add `name_ar: str | None`

**P2P edit verification:** Verify `PUT /api/v1/debts/{id}` handles P2P-specific fields (person_id, repayment_mode, split regeneration). If not, extend the service.

**Delete guard:** When soft-deleting a debt that has recorded payments, include `payment_count` in the response so the UI can show a warning. Do not block the delete — just inform.

#### Frontend

**P2P custom splits UI (`p2p-debt-form.tsx`):** Add `custom_splits` repayment mode. Renders a dynamic list:
- Each row: amount input + date input + remove button
- "Add split" button appends a row
- Validation: sum of split amounts must equal principal
- Backend already accepts `splits: [{amount_minor, due_date}]` in `DebtCreate`

**Edit/delete on detail pages:**
- `loan-detail-content.tsx`: Add Edit and Delete buttons in page header. Edit opens `bank-loan-form.tsx` in edit mode. Delete opens `DeleteConfirmation`.
- `p2p-detail-content.tsx`: Same pattern with `p2p-debt-form.tsx`.
- Installment tab rows: Add inline edit/delete actions (icon buttons) that open the installment form in edit mode or the delete confirmation.

**Provider autocomplete (`installment-form.tsx`):** When `type=financing_app`, replace the plain name input with a combobox. Suggested providers: ValU, Souhoola, Sympl, Forsa, Tru, Contact, Shahry. Free text still allowed — suggestions, not constraints.

**`name_ar` in account forms:** Add Arabic name field to account create/edit forms. In the financing apps tab, display `name_ar` when locale is Arabic, falling back to `name`.

#### i18n

- Custom splits: "Add split", "Remove split", "Split amount", "Split date", "Total must equal principal"
- Delete warning: "This debt has {count} recorded payments. Are you sure?"
- Provider autocomplete: "Select provider" / "Or type a name"

#### Acceptance Criteria

- [ ] Custom splits mode creates a P2P debt with user-defined per-split amounts and dates
- [ ] Split amounts must sum to principal (validation error if not)
- [ ] Edit button on loan detail opens pre-filled bank loan form
- [ ] Edit button on P2P detail opens pre-filled P2P form
- [ ] Delete on any detail page shows confirmation dialog with payment count warning
- [ ] Financing app form shows provider autocomplete with known providers
- [ ] `name_ar` field on account create/edit forms
- [ ] Arabic locale shows `name_ar` for financing app provider names
- [ ] Migration adds `name_ar` column to accounts
- [ ] EN + AR translations for all new UI strings

---

## Unit 4: Cross-Cutting Polish

### Problem

RBAC only covers debts/persons routers. Bulk person balances skip FX conversion. Credit utilization not in main debts endpoint. Auto-match suggestions UI not built. i18n gaps may remain.

### Design

#### Backend

**RBAC extension:** Apply `get_member_role` + `require_role` guards to:

| Router | Child Can View | Child Can Mutate |
|--------|---------------|-----------------|
| accounts | Yes | No |
| transactions | Yes | No |
| transfers | No (view own only, if applicable) | No |
| categories | Yes | No (custom categories) |
| installments | Yes | No |

Same `require_role(role, ["admin", "partner"])` pattern from debts/persons routers.

**Bulk person balances FX:** Extend `compute_persons_balances_bulk()` to include `total_net_in_base` per person. Port the FX conversion logic from the single-person endpoint.

**Credit utilization in debts endpoint:** For debts with `linked_account_id` pointing to a credit card account, include `credit_utilization_percent` in `DebtResponse`. Compute as `abs(account.balance_minor) / account.credit_limit * 100` when `credit_limit > 0`.

#### Frontend

**Auto-match suggestions UI (`loan-detail-content.tsx`):**

When the record payment form is open on a loan with `linked_account_id`:
1. Fetch `GET /api/v1/debts/{id}/match-suggestions`
2. Show a "Suggested matches" section below the payment form
3. Each suggestion row: date, description, amount, "Use this" button
4. "Use this" pre-fills payment form (amount, date) and sets `link_existing_transaction_id`
5. If no suggestions found, show subtle "No matching transactions found" text

**Payment form update for match flow:** `record-payment-form.tsx` needs a hidden `link_existing_transaction_id` field. When set (from match suggestion), the account selector auto-fills from the matched transaction's account and becomes read-only. Submit sends `link_existing_transaction_id` instead of triggering auto-create.

**i18n audit:** Scan all `/components/debts/` files for hardcoded English. Add missing keys:
- Match suggestions: "Suggested matches", "Use this", "No matches found"
- RBAC errors: "You don't have permission to perform this action"
- Any remaining gaps discovered during implementation

#### Testing

- Backend: new tests for RBAC guards on all extended routers, bulk FX computation, credit utilization in debts response, match-vs-create payment path
- Manual UAT checklist for full end-to-end flows

#### Acceptance Criteria

- [ ] Child role cannot create/edit/delete accounts, transactions, transfers, categories, installments
- [ ] Child role CAN view accounts, transactions, categories, installments
- [ ] Bulk person list includes `total_net_in_base` with FX conversion
- [ ] Debts with linked credit card accounts show `credit_utilization_percent`
- [ ] Loan detail shows match suggestions when recording a payment
- [ ] "Use this" on a match pre-fills the payment form and links to existing transaction
- [ ] No hardcoded English remains in debt components
- [ ] All new strings have EN + AR translations

---

## Unit Dependencies

```
Unit 1 (Payment→Account) ← independent, do first
Unit 2 (Installments)    ← independent of Unit 1
Unit 3 (P2P + Polish)    ← depends on Unit 1 (P2P form has account selector from Unit 1)
Unit 4 (Cross-cutting)   ← depends on Unit 1 (match suggestions reference auto-create flow)
```

Units 1 and 2 can run in parallel. Unit 3 and 4 depend on Unit 1.

## Out of Scope

- Dashboard integration ("Active Debts" stat card, "Upcoming Payments" widget) — Phase 4
- Debt data in forecasting/cash flow — future phase
- Payment due notifications — future phase
- Frontend automated tests — project doesn't have them yet
- Interest amortization calculations for installment plans — rate field is informational only
- Partial split payments for P2P (splits remain binary paid/unpaid)
