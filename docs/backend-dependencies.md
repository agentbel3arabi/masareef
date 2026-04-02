# Backend Dependencies — Discovered During Phase 1.75

Tracks UI elements added during Phase 1.75 page redesign that require backend endpoints not yet implemented. Each item maps to a future roadmap phase.

> **Updated:** after each Wave that introduces "coming soon" UI elements.
> **Reviewed at phase end:** confirm all items are mapped to a roadmap phase.
> **Input for future phases:** Phase 2+ planners MUST check this file before scoping any backend work.

| # | UI Element | Page | Backend Needed | Target Phase | Status |
|---|-----------|------|---------------|-------------|--------|
| 1 | Monthly Spending stat card | Dashboard | `GET /api/v1/transactions/summary?period=month` | Phase 2 | ⏳ Pending |
| 2 | Active Debts stat card | Dashboard | Debts module (`GET /api/v1/debts`) | Phase 3 | ⏳ Pending |
| 3 | Upcoming Payments stat card | Dashboard | `GET /api/v1/debts/upcoming` or forecasting endpoint | Phase 3 | ⏳ Pending |
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
| 14 | Interest rate field on installment form | Debts — installment tabs | Add `annual_rate_bps` column to `installment_plans` table + `InstallmentCreate`/`InstallmentResponse` schemas | Phase 3+ | ⏳ Pending |
| 15 | Credit card consumed % from actual balance | Debts — Card Installments | Card utilization should use `account.balance_minor` + committed installments vs `credit_limit` | Phase 3+ | ⏳ Pending |
| 16 | Financing app used/available from balance | Debts — Financing Apps | Similar to #15 — actual account balance vs credit limit for financing accounts | Phase 3+ | ⏳ Pending |
| 17 | P2P debt amounts linked to transactions | Debts — P2P tab | Link debt payments to actual transactions for accurate tracking | Phase 3+ | ⏳ Pending |
| 18 | Card installment row → account detail link | Debts — Card Installments | Card name in header should link to `/accounts/{id}` detail page | Phase 3+ | ⏳ Pending |

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
