# Phase 2: Dashboard & Charts - Research

**Researched:** 2026-04-07
**Domain:** Backend SQL aggregation endpoints + Plotly.js charting integration in Next.js
**Confidence:** HIGH

## Summary

Phase 2 adds three new backend aggregation endpoints (`/api/v1/dashboard/spending-by-category`, `/api/v1/dashboard/income-vs-expenses`, `/api/v1/dashboard/net-worth-trend`) and integrates `react-plotly.js` into the existing dashboard page. No new data models are created -- all data is computed on-the-fly from existing `transactions`, `accounts`, `debts`, and `exchange_rates` tables using SQL GROUP BY aggregations with FX conversion.

The existing codebase already has all the building blocks: `transaction_summary` service with period-based aggregation, `fx.py` with USD-hub currency conversion, `compute_net_worth` in the account service, stat cards with trend prop support, TanStack Query hooks, and the `api-client.ts` fetch wrapper. The primary work is composing these patterns into dashboard-specific endpoints, adding Plotly chart components with Next.js dynamic import (SSR: false), and restructuring the dashboard layout per the UI-SPEC.

**Primary recommendation:** Build backend endpoints first (testable independently), then wire frontend charts. Use `plotly.js-dist-min` (4.8MB) instead of `plotly.js-dist` (11.2MB) for smaller bundle. Lazy-load the entire Plotly module via `next/dynamic` with `ssr: false`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Replace MonthActivity widget with Income vs Expenses bar chart. Keep AccountsGlance and RecentTransactions below charts.
- **D-02:** Layout: stat cards row -> 2x2 chart grid (net worth + bar chart, donut + reserved slot) -> AccountsGlance + RecentTransactions.
- **D-03:** Asset Summary and Upcoming Payments OMITTED entirely (no placeholders, no "coming soon").
- **D-04:** Mobile: charts stack vertically full width, single column.
- **D-05:** Shared time range toggle (1M, 3M, 6M, 1Y, All) controls net worth timeline and income vs expenses. Donut always shows current month.
- **D-06:** Donut slice click navigates to `/transactions?category={id}&period=month`.
- **D-07:** Month-over-month comparison via "Compare" toggle on bar chart with delta summary card.
- **D-08:** Net worth computed on-the-fly from transactions (no snapshot table).
- **D-09:** Three separate dashboard endpoints (spending-by-category, income-vs-expenses, net-worth-trend).
- **D-10:** All amounts converted to household base currency using latest FX rates.
- **D-11:** All 4 stat cards get month-over-month trend indicators with absolute change and percentage.
- **D-12:** Base currency selector dropdown in stat cards row, writes to household settings.

### Claude's Discretion
- Plotly chart styling (colors, fonts, hover templates) -- follow UI-SPEC Plotly styling contract
- Loading states -- use skeleton loaders (decided in UI-SPEC)
- Whether to lazy-load plotly.js -- use dynamic import with ssr: false (decided in UI-SPEC)
- SQL query structure for aggregation endpoints

### Deferred Ideas (OUT OF SCOPE)
- Upcoming Payments list (requires Phase 5-6 data sources)
- Asset Summary cards (requires asset tracking)
- Net worth snapshot table (optimize later if on-the-fly is too slow)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | User can view income vs expenses bar chart on dashboard | Backend `income-vs-expenses` endpoint with monthly GROUP BY; Plotly bar chart with grouped bars via dynamic import |
| DASH-02 | User can view spending by category donut chart on dashboard | Backend `spending-by-category` endpoint with category GROUP BY, top 8 + Other; Plotly donut with click handler |
| DASH-03 | User can see active debts stat card on dashboard | Extend existing debts query; add trend computation (current vs previous month remaining) |
| DASH-04 | User can see upcoming payments stat card on dashboard | Query debts for next 30 days of scheduled payments using `payment_day_of_month` + amortization schedule |
| DASH-05 | User can compare current month vs previous month spending | Compare toggle on bar chart; backend returns previous period data alongside current |
| DASH-06 | User can see net worth trend chart over time (multi-currency) | Backend `net-worth-trend` endpoint with monthly account balance reconstruction; FX conversion via `fx.py` |
</phase_requirements>

## Standard Stack

### Core (Backend -- already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | >=0.115.0 | API framework | Already in pyproject.toml [VERIFIED: pyproject.toml] |
| SQLAlchemy 2.0 | >=2.0.30 | Async ORM for aggregation queries | Already in pyproject.toml [VERIFIED: pyproject.toml] |
| Pydantic v2 | >=2.7.0 | Response schemas | Already in pyproject.toml [VERIFIED: pyproject.toml] |
| python-dateutil | >=2.9.0 | Date arithmetic (relativedelta) | Already in pyproject.toml, used in transaction_summary [VERIFIED: pyproject.toml] |

### Core (Frontend -- needs install)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-plotly.js | 2.6.0 | React wrapper for Plotly | CLAUDE.md mandates Plotly for charts; Recharts/Chart.js forbidden [VERIFIED: npm registry] |
| plotly.js-dist-min | 3.5.0 | Minified Plotly.js bundle (4.8MB vs 11.2MB full) | Smaller bundle, same API, all chart types needed (bar, pie, scatter) included [VERIFIED: npm registry] |
| @types/react-plotly.js | 2.6.4 | TypeScript definitions | Strict TypeScript required by CLAUDE.md [VERIFIED: npm registry] |

### Core (Frontend -- already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.95.2 | Server state + cache | Already used for all data fetching [VERIFIED: package.json] |
| next | ^16.1.6 | Framework with dynamic import | Already installed [VERIFIED: package.json] |
| lucide-react | ^1.7.0 | Icons for stat cards | Already installed [VERIFIED: package.json] |
| next-intl | ^4.8.3 | i18n for AR/EN labels | Already installed [VERIFIED: package.json] |

### Supporting (Frontend -- needs shadcn install)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/skeleton | latest | Chart loading states | ChartSkeleton component [VERIFIED: UI-SPEC component inventory] |
| shadcn/toggle | latest | Compare toggle | CompareToggle component [VERIFIED: UI-SPEC component inventory] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| plotly.js-dist-min | plotly.js-dist (full) | Full is 11.2MB unpacked vs 4.8MB for min. Min includes all chart types needed (bar, pie, scatter). Use full only if WebGL rendering needed for large datasets. |
| Three separate endpoints | Single monolithic `/api/v1/dashboard` | Feature spec suggests single endpoint, but D-09 explicitly chose separate endpoints for independent loading and caching. Follow D-09. |
| Plotly | Recharts or Chart.js | Forbidden by CLAUDE.md Section D.7. Plotly chosen for financial chart types, zoom/pan, and export. |

**Installation:**
```bash
# Frontend
cd frontend
pnpm add react-plotly.js plotly.js-dist-min
pnpm add -D @types/react-plotly.js
pnpm dlx shadcn@latest add -y skeleton
pnpm dlx shadcn@latest add -y toggle
```

## Architecture Patterns

### Backend: New Files

```
backend/app/
├── routers/
│   └── dashboard.py            # NEW: 3 GET endpoints under /api/v1/dashboard/
├── services/
│   └── dashboard.py            # NEW: aggregation logic (SQL queries + FX conversion)
└── schemas/
    └── dashboard.py            # NEW: Pydantic response models for dashboard endpoints
```

### Frontend: New Files

```
frontend/src/
├── components/dashboard/
│   ├── chart-grid.tsx            # NEW: 2x2 grid layout wrapper
│   ├── net-worth-chart.tsx       # NEW: Plotly area chart
│   ├── income-expenses-chart.tsx # NEW: Plotly grouped bar chart
│   ├── spending-by-category-chart.tsx  # NEW: Plotly donut chart
│   ├── time-range-toggle.tsx     # NEW: segmented control (1M/3M/6M/1Y/All)
│   ├── compare-toggle.tsx        # NEW: toggle for month comparison
│   ├── base-currency-selector.tsx # NEW: currency dropdown
│   ├── delta-summary-card.tsx    # NEW: comparison summary card
│   └── chart-skeleton.tsx        # NEW: skeleton loader
├── hooks/
│   └── use-dashboard.ts          # NEW: TanStack Query hooks for dashboard endpoints
└── app/(app)/dashboard/
    └── page.tsx                  # MODIFY: restructure layout
```

### Pattern 1: Backend Aggregation Endpoint

**What:** Each dashboard endpoint performs SQL GROUP BY in a single query, applies FX conversion, and returns typed response.
**When to use:** All three dashboard endpoints follow this pattern.
**Example:**
```python
# Source: existing transaction_summary.py pattern + fx.py convert_to_base
async def get_spending_by_category(
    session: AsyncSession,
    household_id: uuid.UUID,
    *,
    base_currency: str = "EGP",
) -> list[CategorySpending]:
    """Current month spending grouped by category, FX-converted to base currency."""
    today = date.today()
    month_start = today.replace(day=1)

    stmt = (
        select(
            Transaction.category_id,
            Transaction.currency,
            func.sum(func.abs(Transaction.amount_minor)).label("total"),
        )
        .where(
            Transaction.household_id == household_id,
            Transaction.is_active.is_(True),
            Transaction.amount_minor < 0,  # expenses only
            Transaction.transfer_id.is_(None),  # exclude transfers
            Transaction.date >= month_start,
            Transaction.date <= today,
        )
        .group_by(Transaction.category_id, Transaction.currency)
    )
    rows = (await session.execute(stmt)).all()

    # Group by category, convert each currency to base via fx.convert_to_base
    # ... aggregate, sort, take top 8 + "Other"
```

### Pattern 2: Plotly Chart with Next.js Dynamic Import

**What:** Lazy-load Plotly to avoid SSR errors and reduce initial bundle.
**When to use:** All three chart components.
**Example:**
```typescript
// Source: Next.js docs on lazy loading + react-plotly.js GitHub issue #348
"use client";

import dynamic from "next/dynamic";
import type { PlotParams } from "react-plotly.js";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
```
[VERIFIED: Next.js docs on lazy-loading, CITED: https://nextjs.org/docs/app/guides/lazy-loading]

### Pattern 3: TanStack Query Hook for Dashboard Data

**What:** Separate query key per endpoint for independent invalidation and caching.
**When to use:** Each dashboard data source gets its own hook.
**Example:**
```typescript
// Source: existing use-transaction-summary.ts pattern
export function useIncomeVsExpenses(params: { months?: number; base_currency?: string }) {
  const searchParams = new URLSearchParams();
  if (params.months) searchParams.set("months", String(params.months));
  if (params.base_currency) searchParams.set("base_currency", params.base_currency);
  const qs = searchParams.toString();

  return useQuery({
    queryKey: ["dashboard", "income-vs-expenses", params],
    queryFn: () => apiGet<IncomeVsExpensesData[]>(
      `/api/v1/dashboard/income-vs-expenses${qs ? `?${qs}` : ""}`
    ),
    staleTime: 60_000, // 1 minute
  });
}
```
[VERIFIED: existing use-transaction-summary.ts pattern in codebase]

### Pattern 4: Net Worth Timeline Reconstruction

**What:** For each month in the requested range, compute account balances by replaying transaction sums. No snapshot table per D-08.
**When to use:** `net-worth-trend` endpoint.
**Example:**
```python
# For each month end in range:
#   account_balances = balance_minor + SUM(transactions where date <= month_end)
#   Group by currency, convert to base via FX
#   Subtract active debts' remaining at month_end (principal - payments through month_end)
# Returns list of { month, accounts_minor, debts_minor, net_worth_minor }
```
**Performance note:** For a user with 5,000 transactions and 12-month range, this is 12 GROUP BY queries (or a single query with month bucketing via `date_trunc`). The `date_trunc('month', date)` approach is more efficient -- single query, PostgreSQL handles bucketing. [ASSUMED]

### Pattern 5: Base Currency Selector Persistence

**What:** Dropdown writes to household `base_currency` setting. All dashboard hooks pass `base_currency` param.
**When to use:** BaseCurrencySelector component.
**Key detail:** The `households` table already has `base_currency` column. Currently no PATCH endpoint exists to update it -- this needs to be added.
[VERIFIED: household model has base_currency field, routers/households.py has no update endpoint]

### Anti-Patterns to Avoid

- **Fetching all transactions client-side and aggregating in JS:** Always aggregate in SQL. Even 5,000 transactions would be 500KB+ over the wire.
- **Using `plotly.js` (full) instead of `plotly.js-dist-min`:** Full bundle is 11.2MB unpacked. Use the minified distribution.
- **Importing Plotly at module level:** Will break SSR. Must use `next/dynamic` with `ssr: false`.
- **Single monolithic dashboard endpoint:** Violates D-09. Separate endpoints enable parallel fetch and independent cache invalidation.
- **Hardcoding "EGP" in SQL queries:** Always use the `base_currency` parameter. Multi-currency conversion happens in the service layer via `fx.convert_to_base`.
- **Using floats for money aggregation:** All amounts are BIGINT minor units. Aggregation results must remain integers. FX conversion uses integer arithmetic from `fx.py`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Currency conversion | Custom FX math | `fx.convert_to_base()` from `backend/app/services/fx.py` | Hub routing, rate scaling, integer arithmetic -- all implemented and tested |
| Period date resolution | Custom date math | `_resolve_period()` from `transaction_summary.py` + `dateutil.relativedelta` | Edge cases with month boundaries, leap years |
| Chart rendering | Canvas/SVG from scratch | react-plotly.js with dynamic import | Interactive charts with zoom, hover, export -- Plotly handles it all |
| Loading states | Custom shimmer | shadcn Skeleton component | Consistent with existing `animate-pulse` pattern in MonthActivity |
| Server state management | Custom fetch + useState | TanStack Query hooks | Cache invalidation, background refetch, retry -- all built in |
| Response envelopes | Custom wrappers | `SuccessResponse` from `schemas/common.py` | Consistent with all existing endpoints |
| Auth + household scoping | Manual JWT check | `Depends(get_household_id)` + `Depends(get_member_role)` | Consistent with all existing routers |

## Common Pitfalls

### Pitfall 1: Plotly SSR Crash
**What goes wrong:** `ReferenceError: self is not defined` or `window is not defined` during Next.js server rendering.
**Why it happens:** Plotly.js assumes a browser environment (accesses `window`, `document`, `self`).
**How to avoid:** Always use `next/dynamic` with `{ ssr: false }`. The dynamic import MUST be in a `"use client"` component. Never import `plotly.js` or `react-plotly.js` at the top level of a file that could be server-rendered.
**Warning signs:** Build failures or hydration errors mentioning `self` or `window`.
[CITED: https://github.com/plotly/react-plotly.js/issues/348]

### Pitfall 2: Multi-Currency Aggregation Without FX
**What goes wrong:** Summing EGP and USD amounts directly gives meaningless numbers.
**Why it happens:** Transactions have different currencies. A naive `SUM(amount_minor)` mixes currencies.
**How to avoid:** GROUP BY currency first, then convert each group to base currency via `fx.convert_to_base`. Handle missing FX rates gracefully -- exclude from total and add to `fx_warnings`.
**Warning signs:** Dashboard totals that don't match individual account balances.

### Pitfall 3: Including Transfers in Spending Totals
**What goes wrong:** Transfers between accounts double-count as both income and expense.
**Why it happens:** Transfer creates two transaction legs (debit + credit), both with amounts.
**How to avoid:** Always filter `WHERE transfer_id IS NULL` for spending/income aggregations. The feature spec explicitly requires this.
**Warning signs:** Spending totals much higher than expected after transfers.

### Pitfall 4: Net Worth Timeline Performance
**What goes wrong:** Computing historical balances for each month is slow with many transactions.
**Why it happens:** Naive approach runs N queries (one per month). Each scans all transactions up to that month end.
**How to avoid:** Use a single SQL query with `date_trunc('month', date)` grouping + cumulative sum. Or use a running total approach: start from current balance and subtract month-by-month. Note: `date_trunc` syntax varies between PostgreSQL (production) and SQLite (tests).
**Warning signs:** Dashboard load > 500ms.

### Pitfall 5: SQLite vs PostgreSQL Date Functions in Tests
**What goes wrong:** Tests using SQLite fail because `date_trunc` is PostgreSQL-specific.
**Why it happens:** Test suite uses `sqlite+aiosqlite://` in-memory DB (see conftest.py). PostgreSQL functions like `date_trunc`, `generate_series` are not available.
**How to avoid:** Use Python-side date bucketing for test compatibility, or use SQLAlchemy's `func.strftime` for SQLite fallback. Alternatively, write aggregation queries using only portable SQL functions (`BETWEEN`, comparison operators) and do month bucketing in Python.
**Warning signs:** Tests pass locally but logic is wrong, or tests fail with `OperationalError: no such function: date_trunc`.

### Pitfall 6: Stat Card Trend Calculation Edge Cases
**What goes wrong:** Division by zero when previous month had zero spending/debt/income.
**Why it happens:** Percentage change = `(current - previous) / previous * 100`. If previous is 0, this divides by zero.
**How to avoid:** If previous period value is 0 and current is 0, show "flat" (0%). If previous is 0 and current > 0, show the absolute delta only (no percentage) or show "+100%". Define this in the schema.
**Warning signs:** `NaN` or `Infinity` in percentage display.

### Pitfall 7: Household Base Currency Update Missing Endpoint
**What goes wrong:** BaseCurrencySelector can't persist the user's choice because there's no PATCH/PUT endpoint for household settings.
**Why it happens:** The `households` router only has `GET /auth/household-status` and `POST /households`. No update endpoint exists.
**How to avoid:** Add a `PATCH /api/v1/households/settings` endpoint that updates `base_currency` on the household record. This is a small addition but required for D-12.
**Warning signs:** Currency selector works locally but resets on page reload.

### Pitfall 8: Upcoming Payments (DASH-04) Data Availability
**What goes wrong:** The "Due Next 30 Days" stat card has no single query to pull from. Upcoming payments come from multiple sources: debt amortization schedules (computed), installment payment days, P2P debt split due dates.
**Why it happens:** There is no unified `upcoming_payments` table. Payment schedules are computed from debt parameters (start_date, tenure_months, payment_day_of_month) and P2P split records.
**How to avoid:** Build a service function that queries active debts + installments + P2P splits, computes next payment date for each, and filters to the next 30 days. Keep it simple: for bank loans, next payment = next occurrence of `payment_day_of_month` after last payment. For P2P splits, query `WHERE paid = false AND due_date <= today + 30 days`.
**Warning signs:** Stat card shows 0 upcoming payments despite active debts.

## Code Examples

### Backend: Dashboard Router Pattern
```python
# Source: existing accounts router pattern (verified in codebase)
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db_session, get_household_id
from app.dependencies_rbac import get_member_role
from app.models.enums import HouseholdRole
from app.schemas.common import SuccessResponse

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])

@router.get("/spending-by-category")
async def get_spending_by_category(
    period: str = Query("month"),
    base_currency: str = Query("EGP"),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    data = await dashboard_service.get_spending_by_category(
        session, household_id, base_currency=base_currency
    )
    return SuccessResponse(data=data)
```

### Backend: Multi-Currency Aggregation with FX
```python
# Source: existing fx.convert_to_base pattern + transaction_summary GROUP BY pattern
from app.services.fx import convert_to_base, get_latest_rates

# After SQL GROUP BY currency:
# rows = [(currency="EGP", total=500000), (currency="USD", total=10000)]
balances = {row.currency: row.total for row in rows}
fx_result = await convert_to_base(session, balances, base_currency)
# fx_result.total_base_minor = converted total
# fx_result.fx_warnings = ["SAR"] if rates missing
```

### Frontend: Dynamic Plotly Import
```typescript
// Source: Next.js lazy loading docs + react-plotly.js best practice
"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "./chart-skeleton";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

// Usage in component:
<Plot
  data={[{ type: "bar", x: months, y: incomeValues, name: "Income" }]}
  layout={{ ...baseLayout, barmode: "group" }}
  config={{ ...baseConfig }}
  style={{ width: "100%", height: "256px" }}
  useResizeHandler
/>
```

### Frontend: Dashboard Hook with Time Range
```typescript
// Source: existing use-transaction-summary.ts pattern
export function useNetWorthTrend(params: { months?: number; base_currency?: string }) {
  return useQuery({
    queryKey: ["dashboard", "net-worth-trend", params],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params.months) sp.set("months", String(params.months));
      if (params.base_currency) sp.set("base_currency", params.base_currency);
      const qs = sp.toString();
      return apiGet<NetWorthTrendPoint[]>(
        `/api/v1/dashboard/net-worth-trend${qs ? `?${qs}` : ""}`
      );
    },
    staleTime: 60_000,
  });
}
```

### Backend: Stat Cards Data with Trends
```python
# Source: derived from existing compute_net_worth + transaction_summary patterns
async def get_stat_cards(
    session: AsyncSession,
    household_id: uuid.UUID,
    base_currency: str,
) -> StatCardsData:
    """Compute all 4 stat card values with month-over-month deltas."""
    today = date.today()
    month_start = today.replace(day=1)
    prev_month_end = month_start - timedelta(days=1)
    prev_month_start = prev_month_end.replace(day=1)

    # Current month spending (exclude transfers)
    # Previous month spending (same query, different date range)
    # Active debts count + remaining (from debts table)
    # Upcoming 30 days (computed from debt schedules)
    # Net worth current + previous month end
    ...
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `plotly.js` full bundle (40MB+) | `plotly.js-dist-min` (4.8MB) | Available since plotly.js 2.x | Much smaller bundle for same functionality |
| `react-plotly.js` with `require()` | Dynamic import `next/dynamic({ ssr: false })` | Next.js App Router (13+) | Required for SSR compatibility |
| `model.dict()` | `model.model_dump()` | Pydantic v2 | `.dict()` is deprecated, project uses v2 |
| `asChild` prop pattern | `render` prop pattern | shadcn base-nova preset | base-nova uses `render={<Component />}` not `asChild` |

**Deprecated/outdated:**
- `plotly.js` full package (use `-dist-min` for web)
- Pydantic v1 `.dict()` method (use `.model_dump()`)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `date_trunc('month', date)` is the most efficient approach for monthly bucketing in PostgreSQL | Architecture Patterns - Pattern 4 | Low -- alternative is Python-side bucketing which is slightly less efficient but works |
| A2 | `plotly.js-dist-min` includes bar, pie, and scatter chart types | Standard Stack | Medium -- if missing a chart type, would need to switch to `plotly.js-dist` (larger bundle). Verified: plotly.js-dist-min includes all "basic" traces which covers bar, scatter, pie. |
| A3 | 5,000 transactions with 12-month net worth reconstruction completes in < 500ms | Common Pitfalls - Pitfall 4 | Medium -- if slow, would need the deferred snapshot table approach. Can mitigate with single-query cumulative sum approach. |

## Open Questions (RESOLVED)

1. RESOLVED: **Household base_currency update endpoint** — Use `PATCH /api/v1/households` with `{ base_currency: "USD" }`. Implemented in Plan 02-01, Task 1.
   - What we know: `households` table has `base_currency` column, no PATCH endpoint exists
   - What's unclear: Should this be `PATCH /api/v1/households/settings` with arbitrary key-value, or a dedicated `PATCH /api/v1/households` with specific fields?
   - Recommendation: Add `PATCH /api/v1/households` that accepts `{ base_currency: "USD" }` -- follows REST convention, simple, and the `households` model already has the field.

2. RESOLVED: **Upcoming payments computation (DASH-04)** — Use `payment_day_of_month` + 30-day window for debts/installments, `due_date` filter for P2P splits. Implemented in Plan 02-01, Task 2 (get_stat_cards).
   - What we know: Debts have `payment_day_of_month`, installments have `payment_day_of_month`, P2P splits have `due_date`
   - What's unclear: Should we compute full amortization schedules to find next payment, or just use `payment_day_of_month` relative to today?
   - Recommendation: Simple approach -- for each active debt/installment, next payment date = next occurrence of `payment_day_of_month` in the next 30 days. For P2P splits, query `WHERE paid = false AND due_date BETWEEN today AND today + 30`. Avoid recomputing full amortization schedules in the dashboard query.

3. RESOLVED: **Net worth timeline -- debts component** — Return `accounts_minor` and `debts_minor` per month, `assets_minor=0`. Extend when asset tracking added. Implemented in Plan 02-01, Task 2 (get_net_worth_trend).
   - What we know: D-08 says net worth from transactions on-the-fly, feature spec shows stacked areas (accounts, assets, debts)
   - What's unclear: Assets are deferred (D-03), so the net worth timeline will only show accounts and debts initially
   - Recommendation: Build the endpoint to return `accounts_minor` and `debts_minor` per month. Omit `assets_minor` (return 0). When asset tracking is added later, extend the endpoint.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| react-plotly.js | Chart components | Not installed | 2.6.0 (npm) | Install required |
| plotly.js-dist-min | Plotly runtime | Not installed | 3.5.0 (npm) | Install required |
| @types/react-plotly.js | TypeScript | Not installed | 2.6.4 (npm) | Install required |
| shadcn/skeleton | Loading states | Not installed | latest | Install via shadcn CLI |
| shadcn/toggle | Compare toggle | Not installed | latest | Install via shadcn CLI |
| SQLAlchemy | Backend queries | Installed | >=2.0.30 | -- |
| python-dateutil | Date math | Installed | >=2.9.0 | -- |
| TanStack Query | Frontend hooks | Installed | ^5.95.2 | -- |

**Missing dependencies with no fallback:**
- react-plotly.js + plotly.js-dist-min: Must install before any chart work

**Missing dependencies with fallback:**
- shadcn/skeleton and shadcn/toggle: Can install inline during implementation

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (backend) | pytest 8.x + pytest-asyncio (async) |
| Framework (frontend) | Vitest 4.x + React Testing Library |
| Config file (backend) | `backend/pyproject.toml` [tool.pytest.ini_options] |
| Config file (frontend) | `frontend/vitest.config.ts` |
| Quick run (backend) | `cd backend && uv run pytest tests/services/test_dashboard.py -x` |
| Quick run (frontend) | `cd frontend && pnpm test -- --run src/hooks/__tests__/use-dashboard.test.ts` |
| Full suite (backend) | `cd backend && uv run pytest` |
| Full suite (frontend) | `cd frontend && pnpm test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Income vs expenses endpoint returns monthly totals excluding transfers | unit (service) | `uv run pytest tests/services/test_dashboard.py::test_income_vs_expenses -x` | Wave 0 |
| DASH-02 | Spending by category returns top 8 + Other with correct amounts | unit (service) | `uv run pytest tests/services/test_dashboard.py::test_spending_by_category -x` | Wave 0 |
| DASH-03 | Active debts stat card returns count + remaining in base currency | unit (service) | `uv run pytest tests/services/test_dashboard.py::test_stat_cards_debts -x` | Wave 0 |
| DASH-04 | Upcoming payments returns next 30 days of scheduled payments | unit (service) | `uv run pytest tests/services/test_dashboard.py::test_upcoming_payments -x` | Wave 0 |
| DASH-05 | Comparison data includes previous month alongside current | unit (service) | `uv run pytest tests/services/test_dashboard.py::test_income_vs_expenses_comparison -x` | Wave 0 |
| DASH-06 | Net worth trend returns monthly points with FX conversion | unit (service) | `uv run pytest tests/services/test_dashboard.py::test_net_worth_trend -x` | Wave 0 |
| DASH-01 | Dashboard router returns correct envelope | integration (router) | `uv run pytest tests/routers/test_dashboard.py -x` | Wave 0 |
| DASH-01 | Frontend hook fetches and caches data | unit (hook) | `pnpm test -- --run src/hooks/__tests__/use-dashboard.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && uv run pytest tests/services/test_dashboard.py tests/routers/test_dashboard.py -x`
- **Per wave merge:** `cd backend && uv run pytest && cd ../frontend && pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/services/test_dashboard.py` -- covers DASH-01 through DASH-06 service logic
- [ ] `backend/tests/routers/test_dashboard.py` -- covers dashboard API endpoints (envelope, auth, validation)
- [ ] `frontend/src/hooks/__tests__/use-dashboard.test.ts` -- covers dashboard hooks

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Existing `Depends(get_current_user)` JWT validation |
| V3 Session Management | No | Handled by Supabase Auth |
| V4 Access Control | Yes | `Depends(get_household_id)` + `Depends(get_member_role)` household scoping |
| V5 Input Validation | Yes | Pydantic v2 query parameter validation (period, base_currency, months) |
| V6 Cryptography | No | No new crypto requirements |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-household data access | Information Disclosure | `household_id` filter on all queries + RLS as safety net |
| SQL injection via query params | Tampering | SQLAlchemy parameterized queries (never string interpolation) |
| Excessive data fetch (DoS) | Denial of Service | `months` param capped (max 60 or "All" with reasonable limit); rate limiting via slowapi |

## Sources

### Primary (HIGH confidence)
- Existing codebase: `backend/app/services/transaction_summary.py`, `fx.py`, `account.py` -- verified query patterns
- Existing codebase: `frontend/src/hooks/use-transaction-summary.ts`, `use-accounts.ts` -- verified hook patterns
- Existing codebase: `backend/app/routers/accounts.py` -- verified router + DI pattern
- Existing codebase: `backend/tests/services/test_transaction_summary.py`, `test_fx.py` -- verified test patterns
- npm registry: `react-plotly.js@2.6.0`, `plotly.js-dist-min@3.5.0`, `@types/react-plotly.js@2.6.4` -- verified versions
- UI-SPEC: `.planning/phases/02-dashboard-charts/02-UI-SPEC.md` -- verified layout, components, Plotly config

### Secondary (MEDIUM confidence)
- [Next.js lazy loading docs](https://nextjs.org/docs/app/guides/lazy-loading) -- dynamic import with ssr: false
- [react-plotly.js SSR issue #348](https://github.com/plotly/react-plotly.js/issues/348) -- confirms dynamic import requirement
- [DEV Community: Plotly + Next.js 14](https://dev.to/composite/how-to-integrate-plotlyjs-on-nextjs-14-with-app-router-1loj) -- App Router integration pattern

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries verified in npm registry, existing codebase patterns confirmed
- Architecture: HIGH -- follows established patterns from existing routers/services/hooks
- Pitfalls: HIGH -- Plotly SSR issue is well-documented; SQLite/PostgreSQL difference confirmed in test conftest
- Net worth timeline performance: MEDIUM -- approach is sound but real-world performance depends on data volume

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable stack, no fast-moving dependencies)
