---
phase: 02-dashboard-charts
reviewed: 2026-04-07T14:30:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - backend/app/main.py
  - backend/app/routers/dashboard.py
  - backend/app/routers/households.py
  - backend/app/schemas/dashboard.py
  - backend/app/schemas/household.py
  - backend/app/services/dashboard.py
  - backend/tests/routers/test_dashboard.py
  - backend/tests/routers/test_dashboard_schemas.py
  - backend/tests/services/test_dashboard.py
  - frontend/src/app/(app)/dashboard/page.tsx
  - frontend/src/components/dashboard/base-currency-selector.tsx
  - frontend/src/components/dashboard/chart-config.ts
  - frontend/src/components/dashboard/chart-grid.tsx
  - frontend/src/components/dashboard/chart-skeleton.tsx
  - frontend/src/components/dashboard/compare-toggle.tsx
  - frontend/src/components/dashboard/delta-summary-card.tsx
  - frontend/src/components/dashboard/income-expenses-chart.tsx
  - frontend/src/components/dashboard/net-worth-chart.tsx
  - frontend/src/components/dashboard/spending-by-category-chart.tsx
  - frontend/src/components/dashboard/time-range-toggle.tsx
  - frontend/src/components/shared/stat-card.tsx
  - frontend/src/components/ui/skeleton.tsx
  - frontend/src/components/ui/toggle.tsx
  - frontend/src/hooks/__tests__/use-dashboard.test.tsx
  - frontend/src/hooks/use-dashboard.ts
  - frontend/src/hooks/use-households.ts
  - frontend/src/lib/api-client.ts
  - frontend/src/lib/types/dashboard.ts
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-07T14:30:00Z
**Depth:** standard
**Files Reviewed:** 28
**Status:** issues_found

## Summary

Dashboard aggregation backend (service, schemas, router) and frontend (hooks, chart components, page assembly) are well-structured overall. Backend service functions are pure business logic with no HTTP awareness, schemas use Pydantic V2 correctly, and frontend charts correctly use react-plotly.js per project conventions. The main concerns are: (1) a cross-household data leak in the P2P debt splits query, (2) the net worth trend returning identical account balances for every historical month, (3) setState-during-render in the dashboard page, and (4) the "All" time range silently falling back to 6 months.

## Critical Issues

### CR-01: P2P Debt Splits Query Missing Household Scope

**File:** `backend/app/services/dashboard.py:452-457`
**Issue:** The P2P debt splits query for upcoming payments does not filter by `household_id`. Since `P2PDebtSplit` has no direct `household_id` column, the query fetches all unpaid P2P splits across all households. This leaks other households' upcoming payment amounts into the current user's stat card. Even though RLS is a safety net, the project convention (CLAUDE.md Section E Rule 3) requires every query to include `household_id` at the application layer.
**Fix:**
```python
# Join through Debt to scope by household
p2p_stmt = (
    select(P2PDebtSplit)
    .join(Debt, P2PDebtSplit.debt_id == Debt.id)
    .where(
        Debt.household_id == household_id,
        P2PDebtSplit.paid.is_(False),
        P2PDebtSplit.due_date <= cutoff,
        P2PDebtSplit.due_date >= today,
    )
)
```

## Warnings

### WR-01: Net Worth Trend Uses Current Balance for All Historical Months

**File:** `backend/app/services/dashboard.py:264-268`
**Issue:** The accounts component in `get_net_worth_trend` uses `acc.balance_minor` (the current live balance) for every historical month in the loop. This means the "accounts" line in the net worth chart is flat across all months -- it always shows today's balance. While the debts component correctly computes historical remaining principal by filtering payments by `month_end`, the accounts side does not apply the same logic. The chart is misleading because it suggests accounts held the same balance N months ago.
**Fix:** Back-calculate account balances for each historical month by subtracting transactions that occurred after that month's end date from the current balance. This mirrors the approach used for `prev_net_worth` in `get_stat_cards` (lines 350-364):
```python
# Inside the months loop, after computing month_end:
# Fetch transactions after month_end to subtract from current balance
hist_txn_stmt = (
    select(Transaction.account_id, func.sum(Transaction.amount_minor).label("net"))
    .where(
        Transaction.household_id == household_id,
        Transaction.is_active.is_(True),
        Transaction.date > month_end,
    )
    .group_by(Transaction.account_id)
)
hist_txn_rows = (await session.execute(hist_txn_stmt)).all()
hist_adjustments = {row.account_id: int(row.net) for row in hist_txn_rows}

account_balances: dict[str, int] = defaultdict(int)
for acc in accounts:
    adjusted = acc.balance_minor - hist_adjustments.get(acc.id, 0)
    account_balances[acc.currency] += adjusted
```

### WR-02: "All" Time Range Falls Back to Backend Default Silently

**File:** `frontend/src/components/dashboard/time-range-toggle.tsx:19` and `frontend/src/hooks/use-dashboard.ts:14`
**Issue:** When the user selects "All", `timeRangeToMonths` returns `undefined`. In the hooks, `if (params.months)` is falsy for `undefined`, so `months` is never sent to the backend. The backend defaults to `months=6`. The user expects to see all available data but only gets 6 months. No error or indication is shown.
**Fix:** Either map "All" to the backend's maximum allowed value (60), or add a special backend parameter for "all data":
```typescript
// In time-range-toggle.tsx:
const MONTHS_MAP: Record<TimeRange, number> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "1Y": 12,
  "All": 60,  // Backend max
};
```

### WR-03: setState During Render Causes Extra Re-renders

**File:** `frontend/src/app/(app)/dashboard/page.tsx:55-58`
**Issue:** Calling `setBaseCurrency()` and `setSyncedCurrency()` directly during render (outside a `useEffect`) is a React anti-pattern. React will complete the render, then immediately re-render due to the state update. While React does handle this without infinite loops for this specific pattern, it causes a wasted render cycle and is fragile -- any change to the surrounding logic could introduce an infinite loop.
**Fix:** Use `useEffect` for the currency sync:
```tsx
useEffect(() => {
  if (initialCurrency && !syncedCurrency) {
    setBaseCurrency(initialCurrency);
    setSyncedCurrency(true);
  }
}, [initialCurrency, syncedCurrency]);
```

### WR-04: base_currency Query Parameter Not Validated Against Supported Currencies

**File:** `backend/app/routers/dashboard.py:20,35,51,66`
**Issue:** The `base_currency` parameter uses `Query("EGP", max_length=3)` which accepts any string up to 3 characters (e.g., "XYZ", "AAA"). If an unsupported currency is passed, the FX service will fail to find exchange rates and either error or produce incorrect results. The `HouseholdCreate` schema (line 10 of `household.py`) correctly uses a `Literal` type to restrict to supported currencies, but the dashboard endpoints do not.
**Fix:** Use a `Literal` type or validate against the supported currency list:
```python
from typing import Literal

SupportedCurrency = Literal["EGP", "USD", "EUR", "GBP", "SAR", "AED", "KWD"]

@router.get("/income-vs-expenses")
async def get_income_vs_expenses(
    months: int = Query(6, ge=1, le=60),
    base_currency: SupportedCurrency = Query("EGP"),
    ...
```

### WR-05: Net Worth Trend Calls convert_to_base N Times in Loop

**File:** `backend/app/services/dashboard.py:252-292`
**Issue:** `get_net_worth_trend` calls `convert_to_base` twice per month in the loop (once for accounts, once for debts). With `months=60`, that's 120 database queries for exchange rates. Additionally, the accounts balance is identical every iteration (see WR-01), so the same conversion is repeated. Even after WR-01 is fixed, the FX rates should be fetched once and reused.
**Fix:** Pre-fetch exchange rates before the loop and pass them via the `rates` parameter that `convert_to_base` already supports:
```python
# Before the loop:
from app.services.fx import get_latest_rates
rates = await get_latest_rates(session, base_currency)

# Inside the loop:
accounts_fx = await convert_to_base(session, dict(account_balances), base_currency, rates=rates)
debts_fx = await convert_to_base(session, dict(debt_balances), base_currency, rates=rates)
```

## Info

### IN-01: HouseholdUpdate Schema Accepts Any 3-Char String for base_currency

**File:** `backend/app/schemas/household.py:14`
**Issue:** `HouseholdUpdate.base_currency` is `str | None` with `max_length=3`, while `HouseholdCreate.base_currency` uses `Literal["EGP", "USD", "EUR", "GBP", "SAR", "AED", "KWD"]`. The PATCH endpoint could accept an invalid currency like "XYZ".
**Fix:** Use the same `Literal` type:
```python
class HouseholdUpdate(BaseModel):
    base_currency: Literal["EGP", "USD", "EUR", "GBP", "SAR", "AED", "KWD"] | None = None
```

### IN-02: Active Debts Stat Card Trend Is Always Flat

**File:** `backend/app/services/dashboard.py:407`
**Issue:** `debt_trend = _compute_trend(debt_remaining_total, debt_remaining_total)` always produces `direction="flat"` with `absolute_delta=0`. The trend is meaningless. Consider either omitting the trend for debts or computing an actual month-over-month change (e.g., debt remaining last month vs. this month).
**Fix:** Either set `trend=None` for the active_debts card, or compute the previous month's debt remaining using historical payment data.

### IN-03: Unused Import in Dashboard Page

**File:** `frontend/src/app/(app)/dashboard/page.tsx:4`
**Issue:** `Link` from `next/link` is imported and used on line 358, so this is actually used. However, `useAccounts` and `useNetWorth` (line 7) and `useDebts` / `useInstallments` / `useTransactions` (lines 8-10) fetch data that largely duplicates what the new dashboard hooks return. The debts count and accounts check for onboarding could potentially be derived from the `statCards` response to reduce API calls.
**Fix:** Consider deriving `hasAccounts` and `activeDebtsCount` from the stat cards data when it's available, reducing redundant network requests.

---

_Reviewed: 2026-04-07T14:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
