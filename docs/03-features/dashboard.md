# Feature: Dashboard

## Purpose
The dashboard is the home screen — a single-glance financial health overview. It surfaces the most important numbers (net worth, monthly spending, debt load, upcoming payments) and visualizations (trends, category breakdown) without requiring navigation. Designed for the "open app, scan numbers in 2 seconds, close app" use case.

## Layout

```
┌─────────────────────────────────────────────────┐
│  Stat Cards Row (4 cards)                       │
│  [Net Worth] [This Month Spent] [Debts] [Due]   │
├────────────────────────┬────────────────────────┤
│  Net Worth Timeline    │  Income vs Expenses    │
│  (Area Chart)          │  (Bar Chart)           │
├────────────────────────┼────────────────────────┤
│  Spending by Category  │  Upcoming Payments     │
│  (Donut Chart)         │  (List)                │
├────────────────────────┴────────────────────────┤
│  Asset Summary (horizontal cards)               │
└─────────────────────────────────────────────────┘
```

Mobile: single column, stat cards scroll horizontally, charts stack vertically.

## Stat Cards

### 1. Net Worth
```
Total: 1,250,000 EGP
       ▲ 45,000 this month (+3.7%)
```
- Sum of all account balances + asset values - debt remaining
- Multi-currency: converted to base currency via latest FX rates
- Green arrow = increased since last month, red = decreased

### 2. This Month Spent
```
Spent: 28,500 EGP
       ▼ 3,200 vs last month (-10.1%)
```
- Sum of debit transactions this calendar month
- Excludes transfers (`WHERE transfer_id IS NULL`)
- Comparison against same metric last month

### 3. Active Debts
```
4 active debts
Remaining: 850,000 EGP
```
- Count of all active debts (loans + installments + P2P)
- Total remaining balance across all debts in base currency

### 4. Upcoming 30 Days
```
Due: 32,250 EGP
5 payments in next 30 days
```
- Aggregated amount due in the next 30 days
- Sources: debt payments, installments, Gam3eya contributions, P2P splits
- Tapping opens the upcoming payments list

### Base Currency Selector
Dropdown in the stat cards row to switch base currency. All amounts recalculate. Persists to household `base_currency` setting.

## Charts

### Net Worth Timeline (Plotly Area Chart)
- **X axis:** months
- **Y axis:** net worth in base currency
- **Time range toggle:** 1M, 3M, 6M, 1Y, All
- **Composition:** stacked areas showing accounts (blue), assets (green), debts (red, negative)
- **Hover:** shows breakdown per component for that month
- **Data source:** monthly snapshots computed from transaction history + asset value history + debt remaining

### Income vs Expenses (Plotly Bar Chart)
- **X axis:** last 6 months
- **Y axis:** amount in base currency
- **Bars:** income (green) vs expenses (red) side by side per month
- **Excludes:** transfers
- **Hover:** shows exact amounts + delta from previous month

### Spending by Category (Plotly Donut Chart)
- **Current month** spending grouped by category
- **Top 8 categories** shown individually, rest grouped as "Other"
- **Legend:** category name + percentage + amount
- **Colors:** from category color field
- **Click:** drills into transaction list filtered by that category
- **Excludes:** transfers, debt payments (these aren't "spending")

### Upcoming Payments (List)
- Next 30 days of scheduled payments
- Each row: date, description, amount, type badge (debt/installment/gam3eya/p2p/recurring)
- Sorted by date ascending
- Overdue items pinned to top with red highlight
- Tapping a row navigates to the source entity (debt detail, Gam3eya, etc.)

### Asset Summary (Horizontal Cards)
- One card per asset type that has assets
- Each card: type icon, total value in base currency, value change % since purchase
- Tapping navigates to assets page filtered by that type
- Only shown if user has at least one asset

## UI Reference Designs

| Screen | HTML Reference | Stitch Prompt |
|--------|---------------|---------------|
| Dashboard | [05-dashboard.html](../stitch-designs/html/05-dashboard.html) | [05-dashboard.md](../stitch-prompts/05-dashboard.md) |

> These are layout references, not pixel-perfect specs. See [design-tokens.md](../guides/09-design-tokens.md) for canonical colors, fonts, and spacing.

## API Endpoint

### `GET /api/v1/dashboard`
Single endpoint returning all dashboard data. Avoids multiple round trips.

**Query params:** `base_currency` (optional, defaults to household setting)

**Response:**
```json
{
  "data": {
    "base_currency": "EGP",
    "rates_available": true,

    "stat_cards": {
      "net_worth_minor": 125000000,
      "net_worth_delta_minor": 4500000,
      "net_worth_delta_percent": 3.7,
      "this_month_spent_minor": 2850000,
      "last_month_spent_minor": 3170000,
      "spent_delta_minor": -320000,
      "spent_delta_percent": -10.1,
      "active_debts_count": 4,
      "debts_remaining_minor": 85000000,
      "upcoming_30d_total_minor": 3225000,
      "upcoming_30d_count": 5
    },

    "net_worth_timeline": [
      {
        "month": "2025-10",
        "accounts_minor": 95000000,
        "assets_minor": 45000000,
        "debts_minor": -25000000,
        "net_worth_minor": 115000000
      }
    ],

    "monthly_income_expense": [
      {
        "month": "2025-10",
        "income_minor": 3500000,
        "expenses_minor": 2900000
      }
    ],

    "category_breakdown": [
      {
        "category_id": 2,
        "name_en": "Groceries",
        "name_ar": "بقالة",
        "color": "#F97316",
        "amount_minor": 480000,
        "percentage": 16.8
      }
    ],

    "upcoming_payments": [
      {
        "date": "2026-04-01",
        "description": "Office Gam3eya",
        "amount_minor": 100000,
        "currency": "EGP",
        "type": "gam3eya",
        "source_id": 1,
        "is_overdue": false
      }
    ],

    "asset_summary": [
      {
        "type": "real_estate",
        "count": 1,
        "total_value_minor": 350000000,
        "total_change_percent": 40.0
      },
      {
        "type": "gold",
        "count": 2,
        "total_value_minor": 12500000,
        "total_change_percent": 50.0
      }
    ]
  }
}
```

## Data Computation Notes

### Net Worth
```
accounts_total = SUM(displayed_balance) for all active accounts, converted to base
assets_total = SUM(current_value_minor) for all active assets, converted to base
debts_total = SUM(remaining) for all active debts, converted to base
net_worth = accounts_total + assets_total - debts_total
```

### Net Worth Timeline
Built retrospectively from transaction history:
```
For each month going back N months:
  account_balances_at_month_end = reconstruct from transaction sums
  asset_values_at_month_end = from asset_value_history (latest entry ≤ month end)
  debt_remaining_at_month_end = principal - SUM(payments through month end)
```

### This Month Spent
```
SUM(ABS(amount_minor))
WHERE type = 'debit'
  AND date BETWEEN first_of_month AND today
  AND transfer_id IS NULL
  AND is_active = true
```

### Category Breakdown
Same filter as "This Month Spent" but grouped by category_id. Split transactions use split allocations.

## Acceptance Criteria
- [ ] Net worth includes accounts + assets - debts, all converted to base currency
- [ ] Net worth delta shows change since previous month end
- [ ] This month spent excludes transfers
- [ ] Active debts count includes loans, installments, and P2P
- [ ] Upcoming 30 days aggregates all payment sources (debts, installments, Gam3eya, P2P, recurring)
- [ ] Base currency selector recalculates all amounts and persists choice
- [ ] Missing FX rates show warning, affected items excluded from totals
- [ ] Net worth timeline supports 1M/3M/6M/1Y/All range toggle
- [ ] Net worth timeline shows stacked composition (accounts/assets/debts)
- [ ] Income vs expenses chart shows last 6 months, excludes transfers
- [ ] Category donut shows top 8 + "Other", clickable to filtered transaction list
- [ ] Upcoming payments list sorted by date, overdue items pinned to top with red highlight
- [ ] Asset summary only shown when user has at least one asset
- [ ] Single API call returns all dashboard data (no waterfall requests)
- [ ] Dashboard loads within 500ms for typical dataset (< 5,000 transactions)
- [ ] Mobile layout: stat cards horizontal scroll, charts stack vertically
