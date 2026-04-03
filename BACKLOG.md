# Backlog

Centralized tracker for deferred features, tech debt, bugs, new ideas, and backend dependencies.
Completed items are archived in [`docs/backlog-archive.md`](docs/backlog-archive.md).

**Active items:** 48 | **By phase:** Phase 3.5 (9) · Phase 4 (21) · Phase 5+ (6) · Unscheduled (12)

---

## Summary

| ID | Item | Category | Target | Priority | Status |
|----|------|----------|--------|----------|--------|
| BL-001 | Net worth card green color for negative values | bug | Phase 3.5 | Critical | ⏳ Open |
| BL-002 | Credit card available balance green for negative | bug | Phase 3.5 | Critical | ⏳ Open |
| BL-003 | Transaction form missing account selector | bug | Phase 3.5 | Critical | ⏳ Open |
| BL-004 | Category dropdown shows raw `__uncategorized__` | bug | Phase 3.5 | Critical | ⏳ Open |
| BL-005 | Date format standardization (dd/mm/yyyy) | bug | Phase 3.5 | Critical | ⏳ Open |
| BL-006 | Account balance trend indicator (up/down arrow) | backend-dep | Phase 3.5 | Low | ⏳ Open |
| BL-007 | Account last activity date | backend-dep | Phase 3.5 | Low | ⏳ Open |
| BL-008 | Default account for new transaction | backend-dep | Phase 3.5 | Low | ⏳ Open |
| BL-009 | Monthly spending stat card on Dashboard | backend-dep | Phase 4 | High | ⏳ Open |
| BL-010 | Active debts stat card on Dashboard | backend-dep | Phase 4 | High | ⏳ Open |
| BL-011 | Upcoming payments stat card on Dashboard | backend-dep | Phase 4 | High | ⏳ Open |
| BL-012 | Chart — Income vs Expenses (bar) on Dashboard | backend-dep | Phase 4 | High | ⏳ Open |
| BL-013 | Chart — Spending by Category (donut) on Dashboard | backend-dep | Phase 4 | High | ⏳ Open |
| BL-014 | Account stats (income/expenses/avg this month) | backend-dep | Phase 4 | Medium | ⏳ Open |
| BL-015 | Accurate period totals on Transactions page | backend-dep | Phase 4 | Medium | ⏳ Open |
| BL-016 | Currency conversion for net worth (USD/SAR) | backend-dep | Phase 4 | Medium | ⏳ Open |
| BL-017 | CC statement cycle (billing dates, min payment) | backend-dep | Phase 4 | Medium | ⏳ Open |
| BL-018 | Transaction posting status (pending/posted) | backend-dep | Phase 4 | Medium | ⏳ Open |
| BL-019 | Delete loan and linked transactions cascade | deferred | Phase 4 | Medium | ⏳ Open |
| BL-020 | Dashboard Plotly charts implementation | deferred | Phase 4 | High | ⏳ Open |
| BL-021 | BNPL bulk payment backend (installment_plan_id) | deferred | Phase 4 | High | ⏳ Open |
| BL-022 | Credit card installment auto-progression backend | deferred | Phase 4 | Medium | ⏳ Open |
| BL-023 | Accounts page utilization formula update | deferred | Phase 4 | Medium | ⏳ Open |
| BL-024 | BNPL account detail FAB speed dial | deferred | Phase 4 | Low | ⏳ Open |
| BL-025 | Account Statements button backend | backend-dep | Phase 5 — Gam3eya | Low | ⏳ Open |
| BL-026 | Scanned PDF OCR import (Premium) | deferred | Phase 14 — Scanned PDF | Medium | ⏳ Open |
| BL-027 | N+1 FX queries in compute_persons_balances_bulk | tech-debt | Phase 4 | Low | ⏳ Open |
| BL-028 | N+1 query in list_accounts (balance per account) | tech-debt | Phase 4 | Low | ⏳ Open |
| BL-029 | N+1 query in list_transfers (per-row credit leg) | tech-debt | Phase 4 | Low | ⏳ Open |
| BL-030 | Sync httpx.get in JWKS cache (blocks event loop) | tech-debt | Phase 4 | High | ⏳ Open |
| BL-031 | FX transfer amount computed with float division | tech-debt | Phase 4 | Medium | ⏳ Open |
| BL-032 | RBAC guards on remaining routers | deferred | Phase 10 — Multi-User | Medium | ⏳ Open |
| BL-033 | Frontend auth middleware (route protection) | deferred | Phase 13 — Settings & Polish | Medium | ⏳ Open |
| BL-034 | Frontend test infrastructure | tech-debt | Unscheduled | Medium | ⏳ Open |
| BL-035 | Partial payment tracking on P2P splits | deferred | Unscheduled | Low | ⏳ Open |
| BL-036 | P2P debt edit (person, repayment mode, splits) | deferred | Unscheduled | Low | ⏳ Open |
| BL-037 | P2P custom split amounts per installment | deferred | Unscheduled | Low | ⏳ Open |
| BL-038 | Cross-page PDF transaction duplicate detection | tech-debt | Unscheduled | Low | ⏳ Open |
| BL-039 | list_transfers account_id filter matches both legs | tech-debt | Unscheduled | Low | ⏳ Open |
| BL-040 | TransactionResponse.is_split computed dynamically | tech-debt | Unscheduled | Low | ⏳ Open |
| BL-041 | Category name locale-aware display (name_en/name_ar) | deferred | Unscheduled | Low | ⏳ Open |
| BL-042 | Transaction/transfer mutation error toast feedback | deferred | Unscheduled | Low | ⏳ Open |
| BL-043 | Import template format field unconstrained string | tech-debt | Unscheduled | Low | ⏳ Open |
| BL-044 | Generic[T] response typing (uses Any) | tech-debt | Unscheduled | Low | ⏳ Open |
| BL-045 | APScheduler job persistence | deferred | Phase 11 — Notifications | Low | ⏳ Open |
| BL-046 | Category hierarchy reporting aggregation | deferred | Phase 7 — Budgets & Savings Goals | Medium | ⏳ Open |
| BL-047 | Transaction → debt cross-link in UI | backend-dep | Phase 3.5 | Low | ⏳ Open |
| BL-048 | Debt remaining calculation uses principal not actual | tech-debt | Unscheduled | Low | ⏳ Open |

---

## Phase 3.5 — UX Polish Sprint

### BL-001: Net worth card green color for negative values
- **Category:** bug
- **Origin:** Phase 3.5 UX Polish Sprint spec, Unit 1.1
- **Priority:** Critical
- **Context:** When net worth is negative, the card background is green (misleading). Must show red/destructive background when value < 0 and green/success when >= 0. Affects Dashboard and Accounts page net worth summary bar.
- **Acceptance:** Negative net worth displays with destructive color; positive with success color.
- **Status:** ⏳ Open

### BL-002: Credit card available balance green for negative
- **Category:** bug
- **Origin:** Phase 3.5 UX Polish Sprint spec, Unit 1.2
- **Priority:** Critical
- **Context:** When credit card "AVAILABLE" balance is negative (e.g., -100,324.98), it displays in green. Must show red text when Available < 0.
- **Acceptance:** Negative available balance renders in red/destructive; positive in green/success.
- **Status:** ⏳ Open

### BL-003: Transaction form missing account selector
- **Category:** bug
- **Origin:** Phase 3.5 UX Polish Sprint spec, Unit 1.3
- **Priority:** Critical
- **Context:** The New Transaction form has no Account dropdown. Users cannot select which account a transaction belongs to from the global transactions page. Needs an account selector after the Expense/Income toggle, defaulting to the most recent transaction's account.
- **Acceptance:** Transaction form includes a required account selector populated with active accounts; default pre-selects last used account.
- **Status:** ⏳ Open

### BL-004: Category dropdown shows raw `__uncategorized__`
- **Category:** bug
- **Origin:** Phase 3.5 UX Polish Sprint spec, Unit 1.4
- **Priority:** Critical
- **Context:** Default category in the New Transaction form shows the raw internal value `__uncategorized__` instead of a human-readable label like "Uncategorized" or "Select category".
- **Acceptance:** Category dropdown displays "Uncategorized" or "Select category" instead of raw internal value.
- **Status:** ⏳ Open

### BL-005: Date format standardization (dd/mm/yyyy)
- **Category:** bug
- **Origin:** Phase 3.5 UX Polish Sprint spec, Unit 1.5
- **Priority:** Critical
- **Context:** Date displays are inconsistent across the app: "Apr 3, 2026" on Dashboard, "2026-04-03" in transaction tables. All dates must standardize to dd/mm/yyyy format (Egyptian convention). Requires a shared `formatDate()` utility.
- **Acceptance:** Every date display and date input across the entire frontend uses dd/mm/yyyy format consistently.
- **Status:** ⏳ Open

### BL-006: Account balance trend indicator (up/down arrow)
- **Category:** backend-dep
- **Origin:** backend-dependencies.md #19; Phase 3.5 UX Polish Sprint spec, Unit 4.5
- **Priority:** Low
- **Context:** Accounts page shows no trend indicator (up/down arrow) next to balance. Needs `GET /api/v1/accounts/{id}/balance-history?period=month` to compare current balance to start-of-month.
- **Acceptance:** Account cards show a green up-arrow or red down-arrow next to the balance based on month-over-month change.
- **Status:** ⏳ Open

### BL-007: Account last activity date
- **Category:** backend-dep
- **Origin:** backend-dependencies.md #20; Phase 3.5 UX Polish Sprint spec, Unit 4.4
- **Priority:** Low
- **Context:** Account cards have no last activity indicator. Needs the most recent transaction date per account. May be derivable client-side from existing data or via a lightweight query.
- **Acceptance:** Account cards show "Last activity: X days ago" or "No transactions yet" below the balance.
- **Status:** ⏳ Open

### BL-047: Transaction to debt cross-link in UI
- **Category:** backend-dep
- **Origin:** backend-dependencies.md #21; Phase 3.5 UX Polish Sprint spec, Unit 5.2
- **Priority:** Low
- **Context:** Transactions linked to debts need `debt_id` exposed in the transaction response to enable navigation from the transaction table to the debt detail page.
- **Acceptance:** Transactions linked to debts show a clickable pill/badge that navigates to the debt detail page.
- **Status:** ⏳ Open

### BL-008: Default account for new transaction
- **Category:** backend-dep
- **Origin:** backend-dependencies.md #22
- **Priority:** Low
- **Context:** Transaction form should pre-select the account from the user's most recent transaction. Needs a query for the last transaction's `account_id` for the household.
- **Acceptance:** New Transaction form pre-selects the most recently used account.
- **Status:** ⏳ Open

---

## Phase 4 — Dashboard & Charts

### BL-009: Monthly spending stat card on Dashboard
- **Category:** backend-dep
- **Origin:** backend-dependencies.md #1
- **Priority:** High
- **Context:** Dashboard "Monthly Spending" stat card shows placeholder. Needs `GET /api/v1/transactions/summary?period=month` endpoint.
- **Acceptance:** Dashboard card displays actual monthly spending from transaction data.
- **Status:** ⏳ Open

### BL-010: Active debts stat card on Dashboard
- **Category:** backend-dep
- **Origin:** backend-dependencies.md #2
- **Priority:** High
- **Context:** Dashboard "Active Debts" stat card shows placeholder. Backend debts module is ready (`GET /api/v1/debts`); wiring to dashboard pending.
- **Acceptance:** Dashboard card displays count and total of active debts.
- **Status:** ⏳ Open

### BL-011: Upcoming payments stat card on Dashboard
- **Category:** backend-dep
- **Origin:** backend-dependencies.md #3
- **Priority:** High
- **Context:** Dashboard "Upcoming Payments" stat card shows placeholder. Needs `GET /api/v1/debts/upcoming` or a forecasting endpoint.
- **Acceptance:** Dashboard card displays upcoming debt payments for the current period.
- **Status:** ⏳ Open

### BL-012: Chart — Income vs Expenses (bar) on Dashboard
- **Category:** backend-dep
- **Origin:** backend-dependencies.md #4
- **Priority:** High
- **Context:** Dashboard income vs expenses bar chart is a placeholder. Needs `GET /api/v1/transactions/summary?group_by=month` endpoint.
- **Acceptance:** Plotly bar chart renders monthly income vs expenses for the trailing 6-12 months.
- **Status:** ⏳ Open

### BL-013: Chart — Spending by Category (donut) on Dashboard
- **Category:** backend-dep
- **Origin:** backend-dependencies.md #5
- **Priority:** High
- **Context:** Dashboard spending by category donut chart is a placeholder. Needs `GET /api/v1/transactions/summary?group_by=category` endpoint.
- **Acceptance:** Plotly donut chart renders current month spending broken down by category.
- **Status:** ⏳ Open

### BL-014: Account stats (income/expenses/avg this month)
- **Category:** backend-dep
- **Origin:** backend-dependencies.md #6, #7, #8
- **Priority:** Medium
- **Context:** Account Detail page shows placeholder dashes for "Income this month", "Expenses this month", and "Avg. Transaction". All three need `GET /api/v1/accounts/{id}/stats?period=month`.
- **Acceptance:** Account detail page shows computed income, expenses, and average transaction amount for the current month.
- **Status:** ⏳ Open

### BL-015: Accurate period totals on Transactions page
- **Category:** backend-dep
- **Origin:** backend-dependencies.md #10
- **Priority:** Medium
- **Context:** Transactions page Income/Expenses/Net Flow cards show dashes. Needs `GET /api/v1/transactions/summary` respecting active filters.
- **Acceptance:** Transaction page stat cards display accurate totals that update when filters change.
- **Status:** ⏳ Open

### BL-016: Currency conversion for net worth (USD/SAR)
- **Category:** backend-dep
- **Origin:** backend-dependencies.md #11, #12
- **Priority:** Medium
- **Context:** Accounts page net worth and assets/liabilities summaries cannot convert across currencies. Needs exchange rates integration via `/api/v1/exchange-rates` and base conversion logic.
- **Acceptance:** Net worth card can display totals converted to a user-selected base currency.
- **Status:** ⏳ Open

### BL-017: CC statement cycle (billing dates, min payment)
- **Category:** backend-dep
- **Origin:** backend-dependencies.md #23; Phase 1.5 deferred items; Phase 3 spec Section 11.1
- **Priority:** Medium
- **Context:** Credit card statement balance, minimum payment, and billing dates are not tracked. Needs `GET /api/v1/accounts/{id}/statement` and schema additions for statement_date, min_payment, billing_cycle. Originally deferred from Phase 1.5 to Phase 3, then re-deferred to Phase 4.
- **Acceptance:** Credit card accounts track and display statement cycle information.
- **Status:** ⏳ Open

### BL-018: Transaction posting status (pending/posted)
- **Category:** backend-dep
- **Origin:** backend-dependencies.md #24; Phase 1.5 deferred items; Phase 3 spec Section 11.2
- **Priority:** Medium
- **Context:** Transactions have no `posting_status` field (pending/posted) for credit card reconciliation. Originally deferred from Phase 1.5 to Phase 3, then re-deferred to Phase 4.
- **Acceptance:** Transactions support a posting_status field; CC transactions can be marked as pending or posted.
- **Status:** ⏳ Open

### BL-019: Delete loan and linked transactions cascade
- **Category:** deferred
- **Origin:** Phase 3D-4 handoff, Section 3
- **Priority:** Medium
- **Context:** Delete dialog shows "Coming soon" for the "Delete loan and all linked transactions" option. Implementing requires cascading soft-delete of linked payment transactions with correct balance reversal logic.
- **Acceptance:** User can delete a loan and optionally soft-delete all linked payment transactions; account balances are correctly reversed.
- **Status:** ⏳ Open

### BL-020: Dashboard Plotly charts implementation
- **Category:** deferred
- **Origin:** Phase 1.75 design spec (Out of Scope); multiple handoff notes
- **Priority:** High
- **Context:** Dashboard has chart placeholder areas but no actual Plotly charts. Full chart implementation with react-plotly.js is core Phase 4 scope. Requires BL-012 and BL-013 backend endpoints.
- **Acceptance:** Dashboard renders interactive Plotly charts for income vs expenses and spending by category.
- **Status:** ⏳ Open

### BL-021: BNPL bulk payment backend (installment_plan_id)
- **Category:** deferred
- **Origin:** Phase 3D-4 handoff, Section 3 (Copilot review)
- **Priority:** High
- **Context:** The `bulk_payment` endpoint uses `debt_id` but BNPL plans are `installment_plans`. The BNPL bulk payment wizard frontend selects InstallmentResponse items, but the backend operates on the debts table. Fixing requires: (1) new `record_installment_payment` service, (2) payment tracking for installment_plans (currently only months_paid), (3) updated schema with `installment_plan_id`.
- **Acceptance:** BNPL bulk payment wizard correctly records payments against installment_plans with proper payment tracking.
- **Status:** ⏳ Open

### BL-022: Credit card installment auto-progression backend
- **Category:** deferred
- **Origin:** Phase 3D-4 handoff, Section 3 (design spec)
- **Priority:** Medium
- **Context:** The spec calls for backend cron or on-read logic to auto-mark elapsed credit card installment months as "paid". Currently the frontend computes months_elapsed / total_months on read. A proper backend mechanism is needed for consistency.
- **Acceptance:** Credit card installment progression is computed server-side, either via cron job or on-read computation.
- **Status:** ⏳ Open

### BL-023: Accounts page utilization formula update
- **Category:** deferred
- **Origin:** Phase 3D-4 handoff, Section 3 (design spec)
- **Priority:** Medium
- **Context:** The spec defines credit card utilization as: `used = remaining_installment_total + cycle_spending - payments - cashback`. Currently uses simple `displayed_balance / credit_limit`.
- **Acceptance:** Credit card utilization on Accounts page uses the comprehensive formula from the design spec.
- **Status:** ⏳ Open

### BL-024: BNPL account detail FAB speed dial
- **Category:** deferred
- **Origin:** Phase 3D-4 handoff, Section 3; debts redesign spec Section 1
- **Priority:** Low
- **Context:** BNPL account detail page spec calls for a FAB speed dial with two options: "Add Installment" and "Record Payment". Currently uses a standard FAB.
- **Acceptance:** BNPL account detail FAB shows a speed dial menu with both options.
- **Status:** ⏳ Open

### BL-027: N+1 FX queries in compute_persons_balances_bulk
- **Category:** tech-debt
- **Origin:** Phase 3D-4 handoff (Copilot review); Phase 3D-3 handoff
- **Priority:** Low
- **Context:** `compute_persons_balances_bulk()` in `backend/app/services/person.py` calls `convert_to_base()` per person inside a loop. Should prefetch FX rates once for all currencies. Pure performance optimization, no correctness issue.
- **Acceptance:** FX rates are fetched once and reused across all person balance computations.
- **Status:** ⏳ Open

### BL-028: N+1 query in list_accounts (balance per account)
- **Category:** tech-debt
- **Origin:** Phase 1D handoff, Known Improvements
- **Priority:** Low
- **Context:** `list_accounts` calls `compute_displayed_balance` per account in a loop. TODO comment exists in code. Should use a single aggregation query.
- **Acceptance:** Account listing uses a single query or batch approach for balance computation.
- **Status:** ⏳ Open

### BL-029: N+1 query in list_transfers (per-row credit leg)
- **Category:** tech-debt
- **Origin:** Phase 1E handoff, Known Improvements
- **Priority:** Low
- **Context:** `list_transfers` performs per-row credit leg + account lookups. Should use a joined query. TODO added during Phase 1E.
- **Acceptance:** Transfer listing uses joined queries to avoid N+1.
- **Status:** ⏳ Open

### BL-030: Sync httpx.get in JWKS cache (blocks event loop)
- **Category:** tech-debt
- **Origin:** Phase 2 cleanup handoff, Section 3 (Copilot audit PR #34 finding)
- **Priority:** High
- **Context:** `app/dependencies.py` used `httpx.get()` (synchronous) inside an async code path for JWKS cache retrieval, blocking the event loop on cache miss. Should use `httpx.AsyncClient`.
- **Acceptance:** JWKS fetching uses async HTTP client and does not block the event loop.
- **Status:** ⏳ Open

### BL-031: FX transfer amount computed with float division
- **Category:** tech-debt
- **Origin:** Phase 2 cleanup handoff, Section 3 (Copilot audit PR #34 finding); Phase 1E handoff
- **Priority:** Medium
- **Context:** `app/services/transfer.py` computes FX target amount with float division, violating the money rules (all monetary amounts must be integer minor units, never floats). Should use integer arithmetic with the FX rate scale factor (10,000).
- **Acceptance:** FX transfer computation uses integer math only, consistent with CLAUDE.md money rules.
- **Status:** ⏳ Open

---

## Phase 5 — Gam3eya

### BL-025: Account Statements button backend
- **Category:** backend-dep
- **Origin:** backend-dependencies.md #9; Phase 2C handoff
- **Priority:** Low
- **Context:** Account Detail page has a disabled "Account Statements" button. Needs `GET /api/v1/accounts/{id}/statements` endpoint for statement listing and download.
- **Acceptance:** Account Statements button is enabled and shows a list of imported statements for the account.
- **Status:** ⏳ Open

---

## Phase 7 — Budgets & Savings Goals

### BL-046: Category hierarchy reporting aggregation
- **Category:** deferred
- **Origin:** Phase 1.5 gap remediation design spec, Section 10
- **Priority:** Medium
- **Context:** Category hierarchy exists but reporting does not aggregate child categories into parent totals. Budget reports need category rollup to show spending at both leaf and parent levels.
- **Acceptance:** Budget and report views aggregate transactions across category hierarchies.
- **Status:** ⏳ Open

---

## Phase 10 — Multi-User & Household

### BL-032: RBAC guards on remaining routers
- **Category:** deferred
- **Origin:** Phase 3D-3 handoff, Section 3
- **Priority:** Medium
- **Context:** Only `persons.py` and `debts.py` routers have RBAC guards via `require_role()`. Other routers (accounts, transactions, transfers, categories, installments, import) are unguarded. All users in a household have full access regardless of role.
- **Acceptance:** All routers enforce role-based access control; viewer role cannot mutate data.
- **Status:** ⏳ Open

---

## Phase 11 — Notifications

### BL-045: APScheduler job persistence
- **Category:** deferred
- **Origin:** Phase 1.5 gap remediation design spec, Section 10
- **Priority:** Low
- **Context:** APScheduler is configured but jobs are not persisted. If the server restarts, scheduled jobs are lost. Becomes urgent when scheduled notifications (bill reminders, budget alerts) are introduced.
- **Acceptance:** APScheduler jobs survive server restarts via a persistent job store.
- **Status:** ⏳ Open

---

## Phase 13 — Settings & Polish

### BL-033: Frontend auth middleware (route protection)
- **Category:** deferred
- **Origin:** Phase 1F handoff, Known Gaps; Phase 1G handoff
- **Priority:** Medium
- **Context:** `middleware.ts` was never created. Unauthenticated users can access `/dashboard` and other protected routes directly. Auth redirects and locale detection should be handled by Next.js middleware.
- **Acceptance:** Unauthenticated users are redirected to login; authenticated users are redirected away from auth pages.
- **Status:** ⏳ Open

---

## Phase 14 — Scanned PDF (Premium)

### BL-026: Scanned PDF OCR import (Premium)
- **Category:** deferred
- **Origin:** Phase 2 import design spec; backend-dependencies.md #13
- **Priority:** Medium
- **Context:** Import page shows an "Upgrade to Premium" disabled button for scanned PDFs. Full OCR pipeline deferred to Phase 14. Currently only digital/text-based PDFs are supported.
- **Acceptance:** Scanned PDF bank statements can be parsed via OCR and imported like digital PDFs.
- **Status:** ⏳ Open

---

## Unscheduled

### BL-034: Frontend test infrastructure
- **Category:** tech-debt
- **Origin:** Phase 1G handoff; Phase 1H handoff; Phase 1I handoff
- **Priority:** Medium
- **Context:** No frontend test infrastructure exists. No unit or integration tests for any frontend component. Noted as a gap in every frontend handoff since Phase 1G. Needs Vitest or similar setup with React Testing Library.
- **Acceptance:** Frontend has a working test framework with example tests for at least shared components and hooks.
- **Status:** ⏳ Open

### BL-035: Partial payment tracking on P2P splits
- **Category:** deferred
- **Origin:** Phase 3B handoff, Section 3
- **Priority:** Low
- **Context:** P2P debt splits can only be "paid" or "unpaid" (boolean). No partial payment tracking exists. May need a `paid_amount` field on splits for more granular tracking.
- **Acceptance:** P2P splits support partial payment amounts, not just paid/unpaid boolean.
- **Status:** ⏳ Open

### BL-036: P2P debt edit (person, repayment mode, splits)
- **Category:** deferred
- **Origin:** Phase 3D-2 handoff, Section 3
- **Priority:** Low
- **Context:** Editing P2P debt fields (person, repayment mode, splits) is not implemented. Only bank_loan edit exists. Users must delete and recreate P2P debts to change these fields.
- **Acceptance:** P2P debts can be edited: change person, repayment mode, and split configuration.
- **Status:** ⏳ Open

### BL-037: P2P custom split amounts per installment
- **Category:** deferred
- **Origin:** Phase 3D-2 handoff, Section 3
- **Priority:** Low
- **Context:** P2P debt form supports lump-sum and equal-splits modes. Custom split amounts per installment (varying payment amounts) are not yet implemented.
- **Acceptance:** P2P debt creation supports custom (non-equal) split amounts.
- **Status:** ⏳ Open

### BL-038: Cross-page PDF transaction duplicate detection
- **Category:** tech-debt
- **Origin:** Phase 2C handoff, Section 3
- **Priority:** Low
- **Context:** If the same transaction appears at the last row of page N and first row of page N+1 in a PDF (page-overflow artifact), both will be imported. The duplicate checker won't catch it on first import. Low frequency occurrence.
- **Acceptance:** PDF parser detects and deduplicates cross-page transaction overflow artifacts.
- **Status:** ⏳ Open

### BL-039: list_transfers account_id filter matches both legs
- **Category:** tech-debt
- **Origin:** Phase 1E handoff, Known Improvements
- **Priority:** Low
- **Context:** `list_transfers` `account_id` filter only matches debit legs, not either leg. The spec says "filter by either leg" but implementation only checks debit side.
- **Acceptance:** Transfer list filtering by account_id matches transfers where the account is either the source or destination.
- **Status:** ⏳ Open

### BL-040: TransactionResponse.is_split computed dynamically
- **Category:** tech-debt
- **Origin:** Phase 1E handoff, Known Improvements
- **Priority:** Low
- **Context:** `TransactionResponse.is_split` always returns False. No `is_split` column exists on the model; computing it dynamically would require relationship loading to check for splits.
- **Acceptance:** Transaction responses correctly report whether a transaction has splits.
- **Status:** ⏳ Open

### BL-041: Category name locale-aware display (name_en/name_ar)
- **Category:** deferred
- **Origin:** Phase 1I handoff, Known Gaps
- **Priority:** Low
- **Context:** Category dropdown options always show `name_en`. Locale-aware display switching between `name_en` and `name_ar` based on the active locale is not implemented.
- **Acceptance:** Category names display in the user's active locale (Arabic shows name_ar, English shows name_en).
- **Status:** ⏳ Open

### BL-042: Transaction/transfer mutation error toast feedback
- **Category:** deferred
- **Origin:** Phase 1H handoff; Phase 1I handoff
- **Priority:** Low
- **Context:** Mutation errors for transactions and transfers are silent (no toast or error message shown to user). Success toasts were added in later phases but error feedback remains missing in some forms.
- **Acceptance:** All mutation failures show a toast notification with an actionable error message.
- **Status:** ⏳ Open

### BL-043: Import template format field unconstrained string
- **Category:** tech-debt
- **Origin:** Phase 2B handoff, Section 3
- **Priority:** Low
- **Context:** `ImportTemplateCreate.format` is an unconstrained `str`. Passing an invalid format (e.g., "pdf") succeeds at creation but silently no-ops at parse time. Should use `Literal["csv", "excel"]` or a `FileFormat` enum.
- **Acceptance:** Template format field validates against allowed values and rejects invalid formats.
- **Status:** ⏳ Open

### BL-044: Generic[T] response typing (uses Any)
- **Category:** tech-debt
- **Origin:** Phase 1.5 Wave 5 spec, deferred finding B5
- **Priority:** Low
- **Context:** API response typing uses `Any` instead of proper `Generic[T]` parameterization. Works correctly at runtime but loses type safety in the frontend API client.
- **Acceptance:** API response types use Generic[T] for proper type inference.
- **Status:** ⏳ Open

### BL-048: Debt remaining calculation uses principal not actual
- **Category:** tech-debt
- **Origin:** Phase 3C handoff, Section 3
- **Priority:** Low
- **Context:** `get_account_obligations()` uses `d.principal_minor` as remaining balance, not actual remaining after payments. Exact remaining needs summing payment history.
- **Acceptance:** Account obligations endpoint shows actual remaining balance after recorded payments.
- **Status:** ⏳ Open
