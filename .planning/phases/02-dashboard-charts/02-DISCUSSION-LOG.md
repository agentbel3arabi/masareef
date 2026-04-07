# Phase 2: Dashboard & Charts - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 02-dashboard-charts
**Areas discussed:** Chart layout & placement, Chart interactivity, Data scope & aggregation, Stat card evolution

---

## Chart Layout & Placement

### Widget Coexistence

| Option | Description | Selected |
|--------|-------------|----------|
| Replace widgets with charts | MonthActivity becomes bar chart. AccountsGlance stays. RecentTransactions moves below charts. | ✓ |
| Charts above, widgets below | Keep all existing widgets as-is. Add charts section above them. | |
| Tabbed sections | Dashboard has tabs: Overview (charts) and Activity (widgets). | |

**User's choice:** Replace widgets with charts
**Notes:** Feature spec layout followed closely. MonthActivity replaced by Income vs Expenses bar chart.

### Placeholder Sections

| Option | Description | Selected |
|--------|-------------|----------|
| Omit until data exists | Don't render Asset Summary or Upcoming Payments until features are built. | ✓ |
| Show empty states | Render sections with 'Coming soon' messages. | |
| Show with available data only | Upcoming Payments uses debt data; Asset Summary omitted. | |

**User's choice:** Omit until data exists
**Notes:** Cleaner dashboard — no dead UI.

### Mobile Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Stack vertically | Charts stack full-width. User scrolls through stat cards → charts → widgets. | ✓ |
| Horizontal carousel | Charts in swipeable carousel to save vertical space. | |
| You decide | Claude picks based on Stitch design reference. | |

**User's choice:** Stack vertically
**Notes:** Matches existing mobile pattern.

---

## Chart Interactivity

### Time Range Toggle

| Option | Description | Selected |
|--------|-------------|----------|
| Shared toggle for all charts | One period selector at top. Both net worth and bar chart respond. Donut always current month. | ✓ |
| Per-chart toggles | Each chart has its own time range control. | |
| Fixed periods per chart | No toggles. Simplest v1. | |

**User's choice:** Shared toggle for all charts
**Notes:** Donut chart always shows current month regardless of toggle.

### Donut Drill-Down

| Option | Description | Selected |
|--------|-------------|----------|
| Navigate to transactions | Click slice → /transactions?category=X&period=month. Reuses existing page. | ✓ |
| Inline expansion | Click slice → shows top transactions below donut. | |
| No drill-down in v1 | Hover only, no click action. | |

**User's choice:** Navigate to transactions
**Notes:** Feature spec behavior.

### Month Comparison

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle on bar chart | Compare toggle overlays previous period data as lighter bars. Summary delta above. | ✓ |
| Separate comparison view | Dedicated Compare Months card with two month pickers. | |
| Stat card trends only | Month-over-month shown as ▲/▼ on stat cards only. | |

**User's choice:** Toggle on bar chart
**Notes:** Highlights current vs previous month with delta summary.

---

## Data Scope & Aggregation

### Net Worth History

| Option | Description | Selected |
|--------|-------------|----------|
| Compute on-the-fly from transactions | Replay transaction sums per month. No new tables. | ✓ |
| Monthly snapshot table | New table + background job for fast reads. | |
| You decide | Claude picks based on data volume. | |

**User's choice:** Compute on-the-fly from transactions
**Notes:** Can optimize with caching later if performance requires it.

### Aggregation Endpoints

| Option | Description | Selected |
|--------|-------------|----------|
| New /dashboard/* endpoints | Dedicated endpoints: spending-by-category, income-vs-expenses, net-worth-trend. | ✓ |
| Extend existing endpoint | Add group_by to transaction-summary. | |
| Single dashboard endpoint | One GET /api/v1/dashboard returns everything. | |

**User's choice:** New /dashboard/* endpoints
**Notes:** Clean separation, each optimized for its chart.

### Multi-Currency Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Convert all to base currency | All values in household base currency using latest FX rates. | ✓ |
| Show per-currency breakdown | Stacked segments per currency in charts. | |
| You decide | Claude determines based on FX service. | |

**User's choice:** Convert all to base currency
**Notes:** Consistent with existing net worth computation.

---

## Stat Card Evolution

### Trend Indicators

| Option | Description | Selected |
|--------|-------------|----------|
| All 4 cards with trends | Each card shows ▲/▼ with absolute change and percentage vs last month. | ✓ |
| Only spending and income | Trends on two most useful cards only. | |
| You decide | Claude determines which cards benefit. | |

**User's choice:** All 4 cards with trends
**Notes:** Backend comparison data comes from new dashboard endpoints.

### Base Currency Selector

| Option | Description | Selected |
|--------|-------------|----------|
| Build it | Dropdown in stat cards row. Switches base currency for all dashboard values. | ✓ |
| Defer to Settings phase | Use household default. No selector on dashboard. | |
| You decide | Claude determines based on effort. | |

**User's choice:** Build it
**Notes:** Essential for multi-currency users. Writes to household settings.

---

## Claude's Discretion

- Plotly chart styling (colors, fonts, hover templates)
- Loading states for charts
- Plotly.js lazy-loading strategy
- SQL query structure for aggregation endpoints

## Deferred Ideas

- Upcoming Payments list (needs Phase 5-6 data)
- Asset Summary cards (not in current milestone)
- Net worth snapshot table (optimize later if needed)
