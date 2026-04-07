---
phase: 02-dashboard-charts
plan: 02
subsystem: frontend
tags: [dashboard, hooks, components, types, i18n, plotly]
dependency_graph:
  requires: [02-01]
  provides: [dashboard-types, dashboard-hooks, dashboard-ui-components, apiPatch]
  affects: [frontend]
tech_stack:
  added: [react-plotly.js, plotly.js-dist-min, "@types/react-plotly.js"]
  patterns: [TanStack Query hooks with staleTime, base-ui Select with null guard, CSS logical properties]
key_files:
  created:
    - frontend/src/lib/types/dashboard.ts
    - frontend/src/hooks/use-dashboard.ts
    - frontend/src/hooks/__tests__/use-dashboard.test.tsx
    - frontend/src/components/dashboard/chart-skeleton.tsx
    - frontend/src/components/dashboard/time-range-toggle.tsx
    - frontend/src/components/dashboard/compare-toggle.tsx
    - frontend/src/components/dashboard/base-currency-selector.tsx
    - frontend/src/components/dashboard/delta-summary-card.tsx
    - frontend/src/components/ui/skeleton.tsx
    - frontend/src/components/ui/toggle.tsx
  modified:
    - frontend/src/lib/api-client.ts
    - frontend/src/hooks/use-households.ts
    - frontend/src/components/shared/stat-card.tsx
    - frontend/messages/en.json
    - frontend/messages/ar.json
    - frontend/package.json
    - frontend/pnpm-lock.yaml
decisions:
  - "Renamed test file from .ts to .tsx because it contains JSX (QueryClientProvider wrapper)"
  - "Used null guard in BaseCurrencySelector onValueChange to handle base-ui Select string|null type"
  - "Used deterministic skeleton bar heights instead of Math.random() to avoid hydration mismatches"
metrics:
  duration: 510s
  completed: "2026-04-07T20:21:29Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 10
  files_modified: 7
---

# Phase 02 Plan 02: Frontend Infra & Dashboard Primitives Summary

TanStack Query hooks for all 4 dashboard endpoints, TypeScript types mirroring backend schemas, 5 new dashboard UI components, apiPatch utility, household settings mutation, and 27 i18n keys in en/ar.

## Task Execution

### Task 1: Install dependencies + types + apiPatch + dashboard hooks + household mutation + hook tests
**Commit:** `9d92580`

- Installed react-plotly.js, plotly.js-dist-min, @types/react-plotly.js
- Added shadcn skeleton and toggle components (both already use CSS logical properties)
- Added `apiPatch` function to api-client.ts following existing apiPut pattern
- Created `dashboard.ts` types: StatCardTrend, StatCardItem, StatCardsData, IncomeVsExpensesMonth, SpendingByCategory, NetWorthTrendPoint
- Created 4 TanStack Query hooks: useIncomeVsExpenses, useSpendingByCategory, useNetWorthTrend, useStatCards -- all with `["dashboard", ...]` query keys and 60s staleTime
- Added useUpdateHouseholdSettings mutation to use-households.ts with apiPatch and cache invalidation for household/dashboard/net-worth/accounts
- Created 8 stub tests for all 4 dashboard hooks verifying correct endpoints and query params

### Task 2: Supporting UI components + i18n
**Commit:** `b016a2a`

- ChartSkeleton: area/bar/donut variants with animate-pulse Skeleton
- TimeRangeToggle: segmented 1M/3M/6M/1Y/All control with role="radiogroup", exports timeRangeToMonths utility
- CompareToggle: aria-pressed button for month-over-month comparison
- BaseCurrencySelector: shadcn Select dropdown with 7 currencies (EGP/USD/EUR/GBP/SAR/AED/KWD)
- DeltaSummaryCard: current vs previous month delta with trend icons and percentage
- Enhanced StatCard: added `percentChange?: number | null` to trend prop with display
- Added 27 i18n keys to both en.json and ar.json (baseCurrency, compare, timeRange.*, empty states, error messages)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test file extension .ts -> .tsx**
- **Found during:** Task 1 verification
- **Issue:** Test file used JSX (QueryClientProvider) but had .ts extension, causing parse errors in vitest/oxc
- **Fix:** Renamed to .tsx
- **Files modified:** frontend/src/hooks/__tests__/use-dashboard.test.tsx

**2. [Rule 1 - Bug] base-ui Select onValueChange type mismatch**
- **Found during:** Task 2 verification
- **Issue:** base-ui Select's onValueChange passes `string | null` but component prop expected `string`
- **Fix:** Added null guard: `onValueChange={(v) => { if (v) onChange(v); }}`
- **Files modified:** frontend/src/components/dashboard/base-currency-selector.tsx

**3. [Rule 1 - Bug] Deterministic skeleton bar heights**
- **Found during:** Task 2 implementation
- **Issue:** Plan used `Math.random()` for skeleton bar heights which causes SSR hydration mismatches
- **Fix:** Used deterministic formula `40 + i * 10` and `30 + i * 8` instead
- **Files modified:** frontend/src/components/dashboard/chart-skeleton.tsx

## Verification Results

- TypeScript: 0 errors (`pnpm exec tsc --noEmit`)
- Tests: 102 passed, 0 failed (including 8 new dashboard hook tests)
- Lint: 0 errors, 17 pre-existing warnings (none in new files)
- Physical directional CSS check: clean (all new components use logical properties)

## Known Stubs

None -- all components are fully implemented building blocks ready for assembly in Plan 03.

## Self-Check: PASSED

All 10 created files verified on disk. Both commit hashes (9d92580, b016a2a) found in git log.
