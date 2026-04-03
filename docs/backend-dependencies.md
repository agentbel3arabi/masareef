> **⚠️ DEPRECATED** — This file has been replaced by [`BACKLOG.md`](../BACKLOG.md).
> All items have been migrated. New backend dependency items go in `BACKLOG.md` with category `backend-dep`.
> This file is preserved for historical reference only.

# Backend Dependencies

Tracks UI elements that require backend endpoints not yet implemented. Each item maps to a future roadmap phase.

> **Updated:** after each Wave that introduces "coming soon" UI elements.
> **Reviewed at phase end:** confirm all items are mapped to a roadmap phase.
> **Input for future phases:** Phase 2+ planners MUST check this file before scoping any backend work.

| # | UI Element | Page | Backend Needed | Target Phase | Status |
|---|-----------|------|---------------|-------------|--------|
| 1 | Monthly Spending stat card | Dashboard | `GET /api/v1/transactions/summary?period=month` | Phase 2 | ⏳ Pending |
| 2 | Active Debts stat card | Dashboard | Debts module (`GET /api/v1/debts`) — backend ready, dashboard wiring pending | Phase 4 | ⏳ Pending |
| 3 | Upcoming Payments stat card | Dashboard | `GET /api/v1/debts/upcoming` or forecasting endpoint | Phase 4 | ⏳ Pending |
| 4 | Chart — Income vs Expenses (bar) | Dashboard | `GET /api/v1/transactions/summary?group_by=month` | Phase 4 | ⏳ Pending |
| 5 | Chart — Spending by Category (donut) | Dashboard | `GET /api/v1/transactions/summary?group_by=category` | Phase 4 | ⏳ Pending |
| 6 | Income this month (account stats) | Account Detail | `GET /api/v1/accounts/{id}/stats?period=month` | Phase 2 | ⏳ Pending |
| 7 | Expenses this month (account stats) | Account Detail | Same endpoint as #6 | Phase 2 | ⏳ Pending |
| 8 | Avg. Transaction (account stats) | Account Detail | Same endpoint as #6 | Phase 2 | ⏳ Pending |
| 9 | Account Statements button | Account Detail | `GET /api/v1/accounts/{id}/statements` | Phase 5+ | ⏳ Pending |
| 10 | Accurate period totals (Income/Expenses/Net) | Transactions | `GET /api/v1/transactions/summary` with active filters | Phase 2 | ⏳ Pending |
| 11 | Currency conversion — net worth in USD/SAR | Accounts | Exchange rates + base conversion via `/api/v1/exchange-rates` | Phase 2+ | ⏳ Pending |
| 12 | Currency conversion — assets/liabilities in USD/SAR | Accounts | Same as #11 | Phase 2+ | ⏳ Pending |
| 13 | "Upgrade to Premium" (disabled button in ScannedPrompt) | `/import` — scanned PDF state | OCR/scanned PDF import: `POST /api/v1/import/parse` with OCR support (or a dedicated `POST /api/v1/import/parse-scanned` endpoint) | Phase 3+ | ⏳ Pending |
| 14 | Interest rate field on installment form | Debts — installment tabs | Add `annual_rate_bps` column to `installment_plans` table + `InstallmentCreate`/`InstallmentResponse` schemas | Phase 3+ | 🔨 In Progress — Debts Complete Unit 2 |
| 15 | Credit card consumed % from actual balance | Debts — Card Installments | Card utilization should use `account.balance_minor` + committed installments vs `credit_limit` | Phase 3+ | 🔨 In Progress — Debts Complete Unit 4 |
| 16 | Financing app used/available from balance | Debts — Financing Apps | Similar to #15 — actual account balance vs credit limit for financing accounts | Phase 3+ | ✅ Done — computed in financing-apps summary endpoint |
| 17 | P2P debt amounts linked to transactions | Debts — P2P tab | Link debt payments to actual transactions for accurate tracking | Phase 3+ | 🔨 In Progress — Debts Complete Unit 1 |
| 18 | Card installment row → account detail link | Debts — Card Installments | Card name in header should link to `/accounts/{id}` detail page | Phase 3+ | ✅ Done — frontend wired in Phase 3D |
| 19 | Account balance trend indicator (↑/↓) | Accounts | `GET /api/v1/accounts/{id}/balance-history?period=month` — compare current balance to start-of-month | Phase 3.5/4 | ⏳ Pending |
| 20 | Account last activity date | Accounts | Query most recent transaction date per account — may be derivable client-side from existing data | Phase 3.5 | ⏳ Pending |
| 21 | Transaction → debt cross-link | Transactions | Transactions linked to debts need `debt_id` exposed in response to enable navigation | Phase 3.5 | ⏳ Pending |
| 22 | Default account for new transaction | Transactions | Query last transaction's `account_id` for the household to pre-select | Phase 3.5 | ⏳ Pending |
| 23 | CC statement cycle (deferred 3E) | Account Detail | Statement balance, min payment, billing dates — `GET /api/v1/accounts/{id}/statement` | Phase 4 | ⏳ Pending |
| 24 | Transaction posting status (deferred 3E) | Transactions | `posting_status` field (pending/posted) for CC reconciliation | Phase 4 | ⏳ Pending |

---

## How to Use This File

**When building frontend (Phase 1.75+):**
- Every time you add a UI element that shows `"—"`, a "Coming soon" tooltip, or a disabled button, add a row here.
- Columns: element name, page, exact endpoint needed, target phase, status.

**When planning a backend phase (Phase 2+):**
- Read this file first — it tells you exactly which endpoints the frontend is already wired up to receive.
- Prioritize endpoints that unblock the most UI elements (Phase 2 items first).
- Mark status as ✅ Done when the endpoint ships.

**Status values:** ⏳ Pending | 🔨 In Progress | ✅ Done
