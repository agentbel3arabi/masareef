# Feature: Cash Flow Forecasting & Debt Payoff

## Purpose
Projects the household's financial future 12 months ahead by aggregating all known recurring income, expenses, debt payments, installments, and Gam3eya contributions. Answers: "Will I run out of money?" and "When will I be debt-free?"

## Cash Flow Projection

### Data Sources
The forecast engine combines all predictable money movements:

| Source | Type | How It's Projected |
|--------|------|-------------------|
| Recurring rules (salary, rent, subscriptions) | Income/Expense | Repeat at configured frequency (monthly/weekly) |
| Bank loan payments | Expense | From amortization schedule (monthly_payment_minor) |
| Credit card installments | Expense | monthly_amount_minor until start_month + total_months |
| Store installments | Expense | Same as CC installments |
| Gam3eya contributions | Expense | monthly_contribution_minor for remaining months |
| Gam3eya payouts | Income | Payout amount at payout_month(s) |
| P2P debt splits (incoming) | Income | Split amounts at due_dates for personal_lent |
| P2P debt splits (outgoing) | Expense | Split amounts at due_dates for personal_borrowed |
| Estimated non-recurring expenses | Expense | Monthly average from historical spending (see below) |

### Non-Recurring Expense Estimation
Recurring rules only capture predictable fixed costs (salary, rent, loan payments). But users also spend on groceries, dining, shopping, fuel, and other variable expenses every month. Without accounting for these, the forecast overstates available cash.

**Approach:** Compute a rolling average of non-recurring spending per category from the last N months (default 3), and project it forward.

```
For each expense category NOT covered by a recurring rule:
  avg_monthly = SUM(debit transactions in category, last 3 months) / 3
  If avg_monthly > threshold (e.g., 5% of total monthly expenses):
    Include as projected expense item with source = "estimated"
```

**What counts as non-recurring:**
- Transactions in categories that have no matching recurring rule
- Excludes: transfers, debt payments already captured, Gam3eya contributions already captured
- Example: Groceries (avg 4,800/month), Dining (avg 1,200/month), Fuel (avg 900/month)

**Display in UI:**
- Estimated items shown with a dashed border or "~" prefix to distinguish from confirmed recurring
- Tooltip: "Estimated from your 3-month average spending in this category"
- User can override: pin a custom amount or exclude a category from estimation

**Configuration per household:**
- `forecast_include_estimates` (boolean, default true) — toggle estimation on/off
- `forecast_lookback_months` (int, default 3) — how many months to average
- `forecast_min_threshold_percent` (int, default 5) — minimum % of total to include

### Algorithm
```
For each month (1 to projection_months):
  1. Opening balance = previous month's closing balance
     (Month 1: opening = SUM of all account balances in base currency)

  2. Collect all income items for this month:
     - Recurring rules WHERE type = income AND active AND within date range
     - Gam3eya payouts WHERE payout month matches
     - P2P lent splits WHERE due_date falls in this month
     Convert each to base currency via latest FX rates

  3. Collect all expense items for this month:
     - Recurring rules WHERE type = expense AND active AND within date range
     - Debt payments from amortization schedules
     - Installment monthly amounts (active plans only)
     - Gam3eya contributions for active Gam3eyas
     - P2P borrowed splits WHERE due_date falls in this month
     - Estimated non-recurring: avg monthly spend per uncovered category
     Convert each to base currency via latest FX rates

  4. Closing balance = opening + total_income - total_expenses
  5. Flag is_negative = true if closing < 0
  6. Store itemized breakdown for drill-down
```

### Multi-Currency Handling
All amounts converted to household's base currency using latest exchange rates:
```
converted = amount_minor × (USD→base_rate) / (USD→source_rate)
```
If any required FX rate is missing, that item shows with a warning icon and is excluded from totals.

### Negative Balance Alert
If any projected month has a negative closing balance:
- Dashboard shows alert banner: "Your balance may go negative in {month}"
- Forecasting page highlights the month in red
- Tooltip explains which expenses push it negative

## Debt Payoff Projection

### Per-Debt Timeline
For each active debt (bank loans, P2P with splits, installments):
```
remaining_balance = principal - total_paid
For each future month:
  Apply scheduled payment (amortization row or split amount)
  remaining_balance -= payment_principal
  If remaining_balance <= 0: payoff_date = this month, break
```

### Debt-Free Date
The date when ALL debts reach zero:
```
debt_free_date = MAX(payoff_date) across all active debts
```

### Interest Saved Calculation
For bank loans, if user makes extra payments:
```
original_total_interest = SUM(interest portions from full amortization schedule)
actual_total_interest = SUM(interest paid so far + projected remaining interest)
interest_saved = original_total_interest - actual_total_interest
```

## Scenario Planning (Future Enhancement)

What-if simulations the user can toggle:
- "What if I get a 10% raise?" → adjust salary recurring rule
- "What if EGP devalues 20%?" → adjust FX rates
- "What if I pay 2x on my car loan?" → adjust payment amount
- "What if I add a new installment plan?" → add hypothetical expense

Each scenario creates a temporary projection overlay — not saved, just visualized against the base forecast.

## UI Reference Designs

| Screen | HTML Reference | Stitch Prompt |
|--------|---------------|---------------|
| Forecasting | [16-forecasting.html](../stitch-designs/html/16-forecasting.html) | [16-forecasting.md](../stitch-prompts/16-forecasting.md) |

> These are layout references, not pixel-perfect specs. See [design-tokens.md](../guides/09-design-tokens.md) for canonical colors, fonts, and spacing.

## API Endpoints

### `GET /api/v1/forecasting/cash-flow`
12-month cash flow projection.

**Query params:**
- `months` (default 12, max 24)
- `base_currency` (defaults to household setting)

**Response:**
```json
{
  "data": {
    "base_currency": "EGP",
    "starting_balance_minor": 15000000,
    "has_negative_months": true,
    "first_negative_month": "2026-08",
    "months": [
      {
        "month": "2026-04",
        "opening_balance_minor": 15000000,
        "closing_balance_minor": 12500000,
        "total_income_minor": 3500000,
        "total_expenses_minor": 6000000,
        "is_negative": false,
        "items": [
          { "name": "Salary", "amount_minor": 3000000, "type": "income", "source": "recurring", "currency": "EGP" },
          { "name": "Freelance", "amount_minor": 500000, "type": "income", "source": "recurring", "currency": "USD" },
          { "name": "Car Loan", "amount_minor": 1175000, "type": "expense", "source": "debt", "currency": "EGP" },
          { "name": "iPhone Installment", "amount_minor": 450000, "type": "expense", "source": "installment", "currency": "EGP" },
          { "name": "Office Gam3eya", "amount_minor": 100000, "type": "expense", "source": "gam3eya", "currency": "EGP" },
          { "name": "Rent", "amount_minor": 1500000, "type": "expense", "source": "recurring", "currency": "EGP" },
          { "name": "~Groceries", "amount_minor": 480000, "type": "expense", "source": "estimated", "currency": "EGP" },
          { "name": "~Dining", "amount_minor": 120000, "type": "expense", "source": "estimated", "currency": "EGP" },
          { "name": "~Fuel", "amount_minor": 90000, "type": "expense", "source": "estimated", "currency": "EGP" }
        ]
      }
    ]
  }
}
```

### `GET /api/v1/forecasting/debt-payoff`
Debt payoff timelines for all active debts.

**Response:**
```json
{
  "data": {
    "debt_free_date": "2030-01-15",
    "total_remaining_minor": 85000000,
    "base_currency": "EGP",
    "debts": [
      {
        "debt_id": 1,
        "name": "Car Loan - CIB",
        "type": "bank_loan",
        "remaining_minor": 35900000,
        "monthly_payment_minor": 1175000,
        "payoff_date": "2030-01-15",
        "total_interest_remaining_minor": 5200000,
        "trajectory": [
          { "month": "2026-04", "remaining_minor": 34725000 },
          { "month": "2026-05", "remaining_minor": 33540000 }
        ]
      },
      {
        "debt_id": 3,
        "name": "iPhone Installment",
        "type": "installment",
        "remaining_minor": 2700000,
        "monthly_payment_minor": 450000,
        "payoff_date": "2026-09-01",
        "trajectory": [
          { "month": "2026-04", "remaining_minor": 2250000 },
          { "month": "2026-05", "remaining_minor": 1800000 }
        ]
      }
    ]
  }
}
```

### `GET /api/v1/forecasting/summary`
Quick summary stats for dashboard stat cards.

**Response:**
```json
{
  "data": {
    "upcoming_30d_total_minor": 3225000,
    "upcoming_30d_count": 5,
    "debt_free_date": "2030-01-15",
    "active_debts_count": 4,
    "next_negative_month": "2026-08",
    "base_currency": "EGP",
    "upcoming_payments": [
      { "date": "2026-04-01", "description": "Office Gam3eya", "amount_minor": 100000, "type": "gam3eya" },
      { "date": "2026-04-05", "description": "Rent", "amount_minor": 1500000, "type": "recurring" },
      { "date": "2026-04-15", "description": "Car Loan - CIB", "amount_minor": 1175000, "type": "debt" },
      { "date": "2026-04-15", "description": "iPhone Installment", "amount_minor": 450000, "type": "installment" }
    ]
  }
}
```

## Charts (Plotly)

### Cash Flow Bar Chart
- X axis: months (next 12)
- Y axis: amount in base currency
- Stacked bars: income (green) vs expenses (red)
- Line overlay: closing balance trajectory
- Red highlight on negative months

### Debt Payoff Line Chart
- X axis: months (until debt-free date)
- Y axis: remaining balance
- One line per debt, different colors
- Markers at payoff dates
- Shaded area under each line

## Acceptance Criteria
- [ ] All 9 data sources correctly aggregated into monthly projection (8 fixed + estimated non-recurring)
- [ ] Multi-currency items converted to base currency via latest FX rates
- [ ] Missing FX rates flagged with warning, item excluded from totals
- [ ] Negative balance months highlighted and alert shown
- [ ] Per-month itemized breakdown available for drill-down
- [ ] Debt payoff dates correctly computed from remaining balance and payment schedule
- [ ] Debt-free date = latest payoff date across all debts
- [ ] Interest saved calculation works for loans with extra payments
- [ ] Recurring rules with end_date stop projecting after end_date
- [ ] Completed installments and Gam3eyas excluded from projection
- [ ] P2P debt splits (incoming and outgoing) included in projection
- [ ] Cash flow chart renders with income/expense bars + balance line
- [ ] Debt payoff chart renders per-debt trajectory lines
- [ ] Summary endpoint provides upcoming 30-day payments for dashboard
- [ ] Projection handles 24-month window when requested
- [ ] Non-recurring expense estimation uses rolling average from last N months
- [ ] Estimated items visually distinct from confirmed recurring (dashed / "~" prefix)
- [ ] User can override estimated amount per category or exclude category from estimation
- [ ] Estimation toggleable per household (forecast_include_estimates setting)
- [ ] Categories already covered by recurring rules excluded from estimation (no double-count)
