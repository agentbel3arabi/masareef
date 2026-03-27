# Feature: Budgets & Savings Goals

## Purpose
Budgets let users set spending limits per category and track against them. Savings goals let users save toward specific targets with progress tracking. Together they answer: "Am I spending within my means?" and "Am I on track to afford what I want?"

## Budgets

### Envelope Model
Inspired by YNAB's zero-based budgeting — every unit of income is assigned a job. Users allocate amounts to categories at the start of each period. As transactions come in, spent amounts are computed in real-time against allocations.

### Budget Structure
A budget covers a time period with per-category allocations:
- **Period types:** monthly (most common), weekly, yearly
- **Per-category allocation:** "I want to spend max 5,000 EGP on groceries this month"
- **Optional overall cap:** total budget limit across all categories
- **Currency:** single currency per budget (matches household base currency)

### Spent Computation
Spent amount per category is computed at query time — no denormalization:
```sql
SELECT category_id, SUM(ABS(amount_minor))
FROM transactions
WHERE household_id = :hid
  AND date BETWEEN budget.start_date AND budget.end_date
  AND type = 'debit'
  AND transfer_id IS NULL
  AND is_active = true
GROUP BY category_id
```

Split transactions use split allocations instead of parent category.

### Budget States per Category

| State | Condition | Visual |
|-------|-----------|--------|
| Under budget | spent < 80% of allocated | Green progress bar |
| Warning | spent 80–100% of allocated | Amber progress bar |
| Over budget | spent > allocated | Red progress bar + overage amount |
| Unallocated | category has spending but no allocation | Grey, shown separately |

### Rollover (Optional)
Users can enable rollover per category:
- **Under budget:** unused amount carries forward to next period
- **Over budget:** overage deducted from next period's allocation
- Disabled by default — each period starts fresh

### Auto-Suggest
After one month of data, system can suggest budget allocations:
```
"Based on your last 3 months, you average 4,800 EGP on groceries.
 Suggested allocation: 5,000 EGP"
```
User accepts with one tap or adjusts.

### Recurring Budgets
Users can set a budget as recurring — auto-creates next period's budget when current one ends. Allocations carry over; spent resets to zero.

## UI Reference Designs

| Screen | HTML Reference | Stitch Prompt |
|--------|---------------|---------------|
| Budgets | [15-budgets.html](../stitch-designs/html/15-budgets.html) | [15-budgets.md](../stitch-prompts/15-budgets.md) |
| Savings Goals | *(screenshot pending)* | [15b-savings-goals.md](../stitch-prompts/15b-savings-goals.md) |

> These are layout references, not pixel-perfect specs. See [design-tokens.md](../guides/09-design-tokens.md) for canonical colors, fonts, and spacing.

## API Endpoints — Budgets

### `GET /api/v1/budgets`
List budgets with summary status.

**Query params:** `period` (monthly/weekly/yearly), `active_only` (default true)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "March 2026",
      "period": "monthly",
      "start_date": "2026-03-01",
      "end_date": "2026-03-31",
      "currency": "EGP",
      "total_allocated_minor": 2500000,
      "total_spent_minor": 1830000,
      "remaining_minor": 670000,
      "percent_used": 73.2,
      "categories_over_budget": 1,
      "is_active": true
    }
  ],
  "meta": {
    "total": 3,
    "page": 1,
    "page_size": 50
  }
}
```

### `GET /api/v1/budgets/{id}`
Single budget with per-category breakdown.

**Response:**
```json
{
  "data": {
    "budget": { "..." : "..." },
    "categories": [
      {
        "category_id": 2,
        "category_name_en": "Groceries",
        "category_name_ar": "بقالة",
        "allocated_minor": 500000,
        "spent_minor": 480000,
        "remaining_minor": 20000,
        "percent_used": 96.0,
        "state": "warning",
        "transactions_count": 12
      },
      {
        "category_id": 8,
        "category_name_en": "Education",
        "category_name_ar": "تعليم",
        "allocated_minor": 300000,
        "spent_minor": 350000,
        "remaining_minor": -50000,
        "percent_used": 116.7,
        "state": "over_budget",
        "transactions_count": 3
      }
    ],
    "unallocated_spending": [
      {
        "category_id": 10,
        "category_name_en": "Telecommunications",
        "spent_minor": 25000,
        "transactions_count": 2
      }
    ]
  }
}
```

### `POST /api/v1/budgets`
Create a new budget with allocations.

**Request:**
```json
{
  "name": "March 2026",
  "period": "monthly",
  "start_date": "2026-03-01",
  "end_date": "2026-03-31",
  "currency": "EGP",
  "total_amount_minor": 2500000,
  "is_recurring": true,
  "categories": [
    { "category_id": 1, "allocated_minor": 400000 },
    { "category_id": 2, "allocated_minor": 500000 },
    { "category_id": 3, "allocated_minor": 200000 }
  ]
}
```

### `PUT /api/v1/budgets/{id}`
Update budget name, dates, or overall cap.

### `PUT /api/v1/budgets/{id}/allocations`
Update per-category allocations within a budget.

**Request:**
```json
{
  "categories": [
    { "category_id": 2, "allocated_minor": 600000 },
    { "category_id": 8, "allocated_minor": 250000 }
  ]
}
```

### `DELETE /api/v1/budgets/{id}`
Soft delete. Historical data preserved for reporting.

### `GET /api/v1/budgets/suggest`
Auto-suggest allocations based on spending history.

**Query params:** `months` (lookback window, default 3)

**Response:**
```json
{
  "data": {
    "suggestions": [
      { "category_id": 2, "category_name_en": "Groceries", "avg_spent_minor": 480000, "suggested_minor": 500000 },
      { "category_id": 3, "category_name_en": "Transportation", "avg_spent_minor": 195000, "suggested_minor": 200000 }
    ],
    "total_suggested_minor": 2350000,
    "based_on_months": 3
  }
}
```

---

## Savings Goals

### Behavior
A savings goal tracks progress toward a financial target:
- **Target amount:** how much to save (e.g., 100,000 EGP for emergency fund)
- **Current amount:** how much saved so far
- **Target date:** optional deadline
- **Linked account:** optional savings account that tracks this goal
- **Progress:** current / target as percentage

### Funding a Goal
Two approaches:
1. **Manual update:** user updates `current_minor` directly (e.g., after transferring to savings)
2. **Account-linked:** if goal is linked to an account, `current_minor` is a **computed value** — it equals the linked account's `displayed_balance`. The stored `current_minor` column is ignored when `linked_account_id` is set; the API always returns the live account balance instead.

> **Implementation:** This is NOT a trigger or background sync. The `GET /api/v1/savings-goals` endpoint computes current amount at query time: `IF linked_account_id IS NOT NULL THEN current = account.displayed_balance ELSE current = savings_goals.current_minor`. The `current_minor` column is only authoritative for non-linked goals.

### Goal States

| State | Condition |
|-------|-----------|
| On track | projected to reach target by target_date (based on monthly savings rate) |
| Behind | projected to miss target_date at current rate |
| Completed | current ≥ target |
| No deadline | no target_date set — progress shown as percentage only |

### Monthly Savings Rate
Computed from goal history:
```
rate = (current_minor - initial) / months_since_creation
months_to_goal = (target_minor - current_minor) / rate
projected_date = today + months_to_goal
```

## API Endpoints — Savings Goals

### `GET /api/v1/savings-goals`
List all goals with progress.

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Emergency Fund",
      "target_minor": 10000000,
      "current_minor": 3500000,
      "currency": "EGP",
      "percent_complete": 35.0,
      "target_date": "2026-12-31",
      "state": "on_track",
      "monthly_rate_minor": 450000,
      "projected_completion": "2026-11-15",
      "linked_account": { "id": 4, "name": "CIB Savings" },
      "icon": "shield",
      "color": "#22C55E"
    }
  ],
  "meta": {
    "total": 4,
    "page": 1,
    "page_size": 50
  }
}
```

### `POST /api/v1/savings-goals`
Create a new savings goal.

**Request:**
```json
{
  "name": "Vacation Fund",
  "target_minor": 5000000,
  "current_minor": 0,
  "currency": "EGP",
  "target_date": "2026-08-01",
  "linked_account_id": 4,
  "icon": "plane",
  "color": "#3B82F6"
}
```

### `PUT /api/v1/savings-goals/{id}`
Update goal details (name, target, date, icon, color).

### `POST /api/v1/savings-goals/{id}/update-progress`
Manually update current amount.

**Request:**
```json
{
  "current_minor": 4200000,
  "notes": "Added March savings"
}
```

### `POST /api/v1/savings-goals/{id}/complete`
Mark goal as completed (celebration animation triggers in UI).

### `DELETE /api/v1/savings-goals/{id}`
Delete goal. No cascade effects — goals don't own transactions.

## Acceptance Criteria

### Budgets
- [ ] Monthly, weekly, yearly budget periods supported
- [ ] Per-category allocation with real-time spent computation
- [ ] Spent excludes transfers (WHERE transfer_id IS NULL)
- [ ] Split transactions allocate to split categories, not parent
- [ ] States: under budget (green), warning at 80% (amber), over budget (red)
- [ ] Unallocated spending shown separately (categories with spending but no allocation)
- [ ] Optional overall cap across all categories
- [ ] Recurring budget auto-creates next period on expiry
- [ ] Rollover: optional per-category carry-forward (under/over)
- [ ] Auto-suggest based on 3-month spending average
- [ ] Budget deletion preserves historical data

### Savings Goals
- [ ] Goal with target amount, optional deadline, optional linked account
- [ ] Account-linked goals auto-update current from account balance
- [ ] Manual progress update for non-linked goals
- [ ] Monthly savings rate computed from history
- [ ] Projected completion date calculated from current rate
- [ ] States: on_track, behind, completed, no_deadline
- [ ] Completion triggers celebration animation in UI
- [ ] Multiple concurrent goals supported
