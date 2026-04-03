# Session Handoff Note — Phase 3, Unit 3D-4: Debts Section Redesign

**Date:** 2026-04-03
**PR:** #50 — feat(debts): complete debts section redesign (Phase 3D-4)
**Branch:** feature/phase-3d-4-frontend-integration

---

## 1. What Was Completed

### Backend

**New files:**
- `backend/alembic/versions/009_add_debt_payment_frequency.py` — migration adding `payment_frequency` enum and `payment_day_of_month` columns to debts table
- `backend/tests/services/test_amortization.py` — 30 tests for multi-frequency amortization engine

**Modified files:**
- `backend/app/models/enums.py` — added `PaymentFrequency` enum (monthly/quarterly/semi_annual/annual)
- `backend/app/models/debt.py` — added `payment_day_of_month` and `payment_frequency` columns
- `backend/app/schemas/debt.py` — added new fields to DebtCreate/DebtResponse with Literal types, added BulkPastPaymentRequest/Response and BulkPaymentRequest/Response schemas
- `backend/app/services/amortization.py` — `compute_periodic_payment()` with multi-frequency PMT formula, `generate_schedule()` with frequency and day-of-month support, deterministic `_dates_match_period()`, tenure divisibility validation
- `backend/app/services/debt.py` — updated `create_bank_loan` for frequency fields, added `bulk_record_past_payments()`, added `bulk_payment()`, added `reactivate_debt()`, balance-impact logic in `record_payment()` via `applies_to_balance_override`
- `backend/app/services/account.py` — added `get_balance_cutoff_date()` helper
- `backend/app/services/transaction.py` — passes `applies_to_balance` from schema to model
- `backend/app/schemas/transaction.py` — added `applies_to_balance` to TransactionCreate and TransactionResponse
- `backend/app/routers/debts.py` — added `POST /bulk-payment`, `POST /{id}/bulk-past-payments`, `POST /{id}/reactivate` endpoints; DELETE now returns 204

### Frontend

**New files:**
- `frontend/src/components/shared/fab.tsx` — reusable FAB component (extracted from transactions/transfers pattern)
- `frontend/src/components/debts/installments-tab.tsx` — combined installments tab with 3 collapsible sections (Card/BNPL/Store) grouped by account
- `frontend/src/components/debts/bnpl-bulk-payment.tsx` — 3-step BNPL bulk payment wizard
- `frontend/src/components/debts/setup-past-payments.tsx` — balance-impact aware past payment banner

**Modified files:**
- `frontend/src/app/(app)/debts/page.tsx` — restructured from 5 tabs to 3 (Loans/Installments/P2P), added FAB, useNavbarActions
- `frontend/src/components/debts/bank-loan-form.tsx` — added payment frequency, day-of-month, live preview; removed auto-record past payments (moved to setup banner); past-start redirect to detail page
- `frontend/src/components/debts/loans-tab.tsx` — loan card expand shows next payment with quick record; collapsed card navigates to detail; chevron for expand/collapse; frequency-aware labels; custom delete dialog with payment count
- `frontend/src/components/debts/loan-detail-content.tsx` — setup past payments banner integration; mark-complete dialog (record final payment or complete as-is); reactivate button for paid-off loans; custom delete dialog
- `frontend/src/components/debts/record-payment-form.tsx` — match-first flow (suggestions shown first, manual form secondary); pre-fill from schedule; score conversion to percentage; concurrent mutation prevention
- `frontend/src/components/debts/p2p-tab.tsx` — inline person creation in debt form; expanded person card with per-debt quick actions; removed inline add buttons (FAB handles)
- `frontend/src/components/debts/p2p-debt-form.tsx` — inline person creation sub-form; client-side splits sum validation; submit disabled without account_id
- `frontend/src/components/accounts/account-obligations-section.tsx` — generic title when mixed types, clickable loan rows, "View All" links
- `frontend/src/components/accounts/other-account-card.tsx` — BNPL visual distinction (violet accent, Smartphone icon, "BNPL" badge)
- `frontend/src/hooks/use-debts.ts` — added useBulkPastPayments, useBulkPayment, useReactivateDebt; fixed useMatchSuggestions return type
- `frontend/src/lib/types/debts.ts` — added PaymentFrequency type, bulk endpoint types, new fields on DebtResponse/DebtCreateInput
- `frontend/src/app/(app)/transactions/page.tsx` — replaced inline FAB with shared component
- `frontend/src/app/(app)/transfers/page.tsx` — replaced inline FAB with shared component
- `frontend/src/hooks/use-transactions.ts` — added `applies_to_balance` to Transaction interface
- `frontend/src/components/transactions/transaction-row.tsx` — "History only" tag and opacity for non-balance-affecting transactions
- `frontend/messages/en.json` / `frontend/messages/ar.json` — extensive i18n additions for all new features

**Deleted files:**
- `frontend/src/components/debts/card-installments-tab.tsx` — merged into installments-tab
- `frontend/src/components/debts/financing-apps-tab.tsx` — merged into installments-tab
- `frontend/src/components/debts/store-installments-tab.tsx` — merged into installments-tab

---

## 2. Key Decisions & Rationale

- **Modify in place, not revert+rebuild** — backend services (amortization, payment recording, matching) were sound; only frontend UX and missing backend features needed work.
- **3-tab structure** — Loans | Installments | P2P. Card/BNPL/Store merged into one "Installments" tab with collapsible sections. Reduces cognitive load.
- **BNPL stays in Accounts page** — unlike the initial spec idea of removing BNPL from accounts, we kept it because users need to manage the account itself (name, limit, delete). The detail page FAB changes to "Add Installment"/"Record Payment" instead of "Add Transaction".
- **Credit card installments auto-progress** — no manual payment recording needed. Progress = months_elapsed / total_months. This is computed on-read, not stored.
- **Payment frequency stored as DB enum** — `monthly`/`quarterly`/`semi_annual`/`annual`. The amortization engine computes period rate and number of periods from this.
- **`payment_day_of_month` defaults from start_date** — if user doesn't override, `min(start_date.day, 28)` is used. Capped at 28 to avoid month-end edge cases.
- **Balance impact via `applies_to_balance`** — reuses existing Transaction column. Cutoff = `account.opened_at` (last_reconciliation_date deferred). No schema change needed.
- **DELETE returns 204** — changed to match accounts/transactions pattern per Copilot review.

---

## 3. Known Gaps / Deferred

### From Copilot Review (must be addressed in future phases)

- **`bulk_payment` endpoint uses `debt_id` but BNPL plans are `installment_plans`** — The BNPL bulk payment wizard frontend selects `InstallmentResponse` items, but the backend endpoint operates on the `debts` table. Fixing requires: (1) new `record_installment_payment` service, (2) payment tracking for installment_plans (currently only `months_paid`), (3) updated schema with `installment_plan_id`. **Target: Phase 4 — Installment Payment Infrastructure.**

- **`compute_persons_balances_bulk` N+1 FX queries** (`backend/app/services/person.py:326`) — Calls `convert_to_base()` per person inside a loop. Should prefetch FX rates once for all currencies. Pure performance optimization, no correctness issue. **Target: Phase 4+ optimization pass.**

### From Design Spec (deferred items section)

- **Credit card installment auto-progression** — The spec calls for backend cron or on-read to auto-mark elapsed credit card installment months as "paid". Currently the frontend computes `months_elapsed / total_months` on read. A proper backend mechanism is needed for consistency. **Target: Phase 4.**

- **Accounts page utilization formula update** — The spec defines: `used = remaining_installment_total + cycle_spending - payments - cashback`. Currently uses simple `displayed_balance / credit_limit`. **Target: Phase 4.**

### Other

- **"Delete loan and transactions" option** — The delete dialog shows this option as disabled/"Coming soon". Implementing cascading soft-delete of linked transactions requires careful balance reversal logic. **Target: Phase 4.**

- **BNPL account detail FAB speed dial** — Spec calls for a speed dial (two options: Add Installment, Record Payment). Currently uses a standard FAB. **Target: Phase 4.**

---

## 4. What's Next

- **PR #50** needs to be merged after CI passes and any remaining review items are resolved
- Next phase work should consult the deferred items above, especially the installment payment infrastructure gap
- The design spec at `docs/superpowers/specs/2026-04-03-debts-section-redesign.md` remains the reference for what was planned vs. what was built

---

## 5. PRs Merged

- **PR #50** — feat(debts): complete debts section redesign (Phase 3D-4) — pending merge

---

## 6. Test Status

- Backend unit tests: 434 passed, 0 failed (1 xfailed)
- Backend integration tests: skipped (requires DB credentials in CI)
- Frontend build: passes
- Frontend lint: 0 errors
- Frontend typecheck: 0 errors
- CI: green (backend test + frontend build)

---

## 7. Notes / Surprises

- **Pyright strict typing caught real bugs** — `.value` access on str-typed SQLAlchemy enum columns, return type mismatches on `_payment_transaction_details`, string literals where `date` objects expected. The CI pyright step is valuable.
- **Two agents working in parallel can produce git conflicts** — when dispatching parallel subagents on overlapping files, one agent's commit can be based on stale state. Always verify and reconcile after parallel agent work.
- **`_dates_match_period` needed deterministic period indexing** — the original sliding-window approach (`abs(month_diff) < frequency_months`) could match payments to multiple periods. Fixed to compute period index from start_date.
- **next.config.mjs `allowedDevOrigins`** — gated behind `ALLOWED_DEV_ORIGINS` env var. Must be set in `.env.local` as a plain comma-separated string (no brackets, no quotes). Example: `ALLOWED_DEV_ORIGINS=hostname.example.com`
