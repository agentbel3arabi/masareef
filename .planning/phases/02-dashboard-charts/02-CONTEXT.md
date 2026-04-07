# Phase 2: Dashboard & Charts - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers Plotly-powered spending charts, stat cards with trend indicators, and net worth visualization on the existing dashboard page. It adds new backend aggregation endpoints (`/api/v1/dashboard/*`), integrates `react-plotly.js` into the frontend, and restructures the dashboard layout to accommodate charts alongside existing widgets. No new data models are created — all chart data is computed on-the-fly from existing transactions, accounts, debts, and FX services.

</domain>

<decisions>
## Implementation Decisions

### Chart Layout & Placement
- **D-01:** Replace MonthActivity widget with the Income vs Expenses bar chart. Keep AccountsGlance and RecentTransactions — they move below the charts section.
- **D-02:** Dashboard layout follows the feature spec: stat cards row → 2x2 chart grid (net worth timeline + bar chart, donut + upcoming payments slot) → AccountsGlance + RecentTransactions.
- **D-03:** Asset Summary section and Upcoming Payments list are **omitted entirely** until their data sources exist (Phase 4-5). No placeholders, no "coming soon" — just don't render them.
- **D-04:** Mobile layout: charts stack vertically at full width. Same scroll order as desktop but single column. Matches existing mobile pattern.

### Chart Interactivity
- **D-05:** One shared time range toggle at the top of the charts section (1M, 3M, 6M, 1Y, All). Both net worth timeline and income vs expenses bar chart respond to it. Donut chart always shows current month.
- **D-06:** Clicking a donut chart slice navigates to `/transactions?category={id}&period=month` — reuses existing transactions page with filters.
- **D-07:** Month-over-month comparison (DASH-05) implemented as a "Compare" toggle on the bar chart. When enabled, highlights current vs previous month with a summary delta card above the chart.

### Data Scope & Aggregation
- **D-08:** Historical net worth computed **on-the-fly from transactions** — for each month in the requested range, replay transaction sums up to that month's end. No new snapshot table. Can optimize with caching later if performance requires it.
- **D-09:** New dedicated dashboard endpoints, each optimized for its chart:
  - `GET /api/v1/dashboard/spending-by-category?period=month&base_currency=EGP`
  - `GET /api/v1/dashboard/income-vs-expenses?months=6&base_currency=EGP`
  - `GET /api/v1/dashboard/net-worth-trend?months=6`
- **D-10:** All chart amounts converted to household's base currency using latest FX rates. The base currency selector controls this. Consistent with existing net worth computation.

### Stat Card Evolution
- **D-11:** All 4 stat cards get month-over-month trend indicators (▲/▼ with absolute change and percentage). Backend comparison data comes from the new dashboard endpoints.
- **D-12:** Build a base currency selector dropdown in the stat cards row. Switches base currency for all dashboard values. Writes to household settings. Essential for multi-currency users.

### Claude's Discretion
- Plotly chart styling (colors, fonts, hover template formatting) — follow Stitch design reference and design tokens
- Loading states for charts (skeleton, spinner, or Plotly's built-in loading)
- Whether to lazy-load plotly.js or include in main bundle (performance trade-off)
- Exact SQL query structure for aggregation endpoints

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Feature Specification
- `docs/03-features/dashboard.md` — Full dashboard feature spec: layout, stat cards, all 4 chart definitions, data sources, mobile behavior
- `docs/03-features/exchange-rates.md` — FX rate service used for multi-currency conversion in charts

### Design Reference
- `docs/stitch-designs/html/05-dashboard.html` — Stitch dashboard design screen (layout, component hierarchy, visual reference)
- `docs/stitch-designs/screenshots/05-dashboard.png` — Visual sanity check
- `docs/guides/09-design-tokens.md` — Authoritative design tokens (colors, spacing, typography for chart styling)
- `docs/stitch-screen-map.md` — Maps features to Stitch screens

### Architecture & Data
- `docs/01-architecture.md` — System design, API patterns, tech choices
- `docs/02-data-models.md` — Table schemas for transactions, accounts, debts (data sources for aggregation)
- `CLAUDE.md` §D — API conventions (response envelope, pagination, error format), money rules (BIGINT minor units)

### Existing Code
- `backend/app/services/transaction_summary.py` — Existing period aggregation logic (extend pattern for new endpoints)
- `backend/app/services/balance.py` — Balance computation logic
- `backend/app/services/fx.py` — FX rate conversion service
- `backend/app/routers/transaction_summary.py` — Existing summary endpoint pattern
- `frontend/src/app/(app)/dashboard/page.tsx` — Current dashboard page (restructure)
- `frontend/src/components/dashboard/` — Existing dashboard widgets (AccountsGlance, MonthActivity, RecentTransactions, GettingStartedCard)
- `frontend/src/components/shared/stat-card.tsx` — StatCard component (already supports trend prop)
- `frontend/src/hooks/use-accounts.ts` — useNetWorth hook (existing)
- `frontend/src/hooks/use-transaction-summary.ts` — useTransactionSummary hook (existing)

### Testing
- `docs/guides/08-testing.md` — Test strategy, fixtures, coverage requirements

### Codebase Analysis
- `.planning/codebase/CONVENTIONS.md` — Current coding patterns
- `.planning/codebase/STRUCTURE.md` — Directory and module organization

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **StatCard component** (`frontend/src/components/shared/stat-card.tsx`): Already supports `trend` prop with direction + text — enhance to show percentage
- **MoneyDisplay component** (`frontend/src/components/shared/money-display.tsx`): Handles amount formatting with colorization — use in chart tooltips
- **useTransactionSummary hook**: Fetches period-based income/expense totals — pattern to follow for new dashboard hooks
- **useNetWorth hook**: Fetches point-in-time net worth — extend or create new hook for trend data
- **transaction_summary service**: SQL aggregation pattern (GROUP BY with signed amounts) — reuse for new endpoints
- **FX service** (`backend/app/services/fx.py`): Currency conversion utilities — used for multi-currency chart values
- **formatAmount / formatAmountAr** (`frontend/src/lib/money.ts`): Locale-aware money formatting

### Established Patterns
- **TanStack Query** for all server state — new dashboard hooks follow same pattern (query keys, stale time)
- **Response envelope**: `{ "data": {...}, "meta": {...} }` — all new endpoints follow this
- **Dependency injection**: `get_db_session`, `get_household_id` — all new endpoints use these
- **Service-layer isolation**: Business logic in services, HTTP handling in routers

### Integration Points
- **Dashboard page** (`frontend/src/app/(app)/dashboard/page.tsx`): Main restructuring target — replace MonthActivity, add chart grid
- **react-plotly.js**: Not installed yet — needs `pnpm add react-plotly.js plotly.js-dist` with dynamic import (SSR: false)
- **Router registration** (`backend/app/main.py`): New dashboard router needs to be registered here
- **Navigation**: Dashboard is already the home page (`/dashboard`) — no nav changes needed

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User wants the feature spec layout closely followed, with charts replacing (not supplementing) redundant widgets.

</specifics>

<deferred>
## Deferred Ideas

- **Upcoming Payments list** — Requires debt payment scheduling + Gam3eya (Phase 5-6). Omit from dashboard until data sources exist.
- **Asset Summary cards** — Requires asset tracking (not in current milestone). Omit entirely.
- **Net worth snapshot table** — If on-the-fly computation becomes too slow, add a `net_worth_snapshots` table with a background job. Evaluate after Phase 2 is live.

</deferred>

---

*Phase: 02-dashboard-charts*
*Context gathered: 2026-04-07*
