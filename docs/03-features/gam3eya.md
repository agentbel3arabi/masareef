# Feature: Gam3eya (جمعية) — Rotating Savings Clubs

## Purpose
A Gam3eya is an Egyptian/MENA rotating savings club where a group of people each contribute a fixed amount monthly. The total pool is paid out to one member each month on a rotating basis. It's a cultural alternative to savings accounts — widely used across all income levels in Egypt.

Masareef tracks Gam3eyas as a first-class entity: contributions, payout schedules, transaction linking, and cash flow impact.

## How a Gam3eya Works

**Example:** 10 people, each contributes 1,000 EGP/month, for 10 months.
- Total pool per month: 10,000 EGP
- Each month, one person receives the full 10,000 EGP
- Your payout month is agreed at the start (e.g., month 5)
- Before your payout: you're saving (net negative cash flow)
- After your payout: you're repaying (net negative cash flow continues)
- At the end: total contributed = total received = 10,000 EGP (zero interest)

**Financial effect:**
- Months 1–4: pay 1,000/month, receive nothing → -4,000 EGP
- Month 5: pay 1,000, receive 10,000 → +9,000 EGP (net +5,000)
- Months 6–10: pay 1,000/month, receive nothing → back to 0 EGP net

## Payout Modes

### Single Payout
User receives the full pool in one month. Most common.
- `payout_month` = 1-based offset (e.g., 5 = fifth month of the cycle)

### Split Payout
Some Gam3eyas allow splitting the payout across multiple months (e.g., half in month 3, half in month 7). Used for larger Gam3eyas or when a member negotiates a custom schedule.
- `payout_month` = null
- Payout defined via `gam3eya_payout_splits` table
- Each split: month offset + amount
- Sum of splits must equal `total_months × monthly_contribution_minor`

## Behavior

### Payment Schedule
Generated from Gam3eya parameters:
```
For each month (1 to total_months):
  date = start_month + (month - 1) months
  type = "contribution" (always)
  amount = monthly_contribution_minor

  If month == payout_month (single) or month in split offsets:
    Also show payout row for that month
```

### Payment Status
Each scheduled contribution has a status derived from linked transactions:

| Status | Condition |
|--------|-----------|
| `paid` | Transaction exists with `gam3eya_id = this gam3eya` AND month matches AND `type = debit` |
| `overdue` | Month is past AND no matching transaction found |
| `upcoming` | Month is in the future |

Payout status (for payout month):

| Status | Condition |
|--------|-----------|
| `received` | Transaction exists with `gam3eya_id` AND `type = credit` for payout month |
| `pending` | Payout month reached but no transaction recorded |
| `upcoming` | Payout month is in the future |

### Transaction Linking
Contributions and payouts are regular transactions with `gam3eya_id` set:
- **Contribution:** debit transaction from linked account, `gam3eya_id = X`
- **Payout:** credit transaction to linked account, `gam3eya_id = X`
- Auto-assigned to "Savings" category
- `applies_to_balance = true` (affects account balance)

### Gam3eya Lifecycle
```
Active → contributions tracked monthly
  → Payout received at designated month(s)
  → After total_months elapsed → mark as "completed"
  → Or user manually marks completed
```

### Net Position
At any point in the cycle:
```
Total contributed = SUM(contribution transactions)
Total received = SUM(payout transactions)
Net position = total_received - total_contributed

Before payout month: net position is negative (you've paid in, not received yet)
After payout month: net position trends back toward zero
At cycle end: net position = 0
```

## UI Reference Designs

| Screen | HTML Reference | Stitch Prompt |
|--------|---------------|---------------|
| Gam3eya | [12-gam3eya.html](../stitch-designs/html/12-gam3eya.html) | [12-gam3eya.md](../stitch-prompts/12-gam3eya.md) |

> These are layout references, not pixel-perfect specs. See [design-tokens.md](../guides/09-design-tokens.md) for canonical colors, fonts, and spacing.

## API Endpoints

### `GET /api/v1/gam3eyas`
List all Gam3eyas grouped by status.

**Query params:** `status` (active/completed)

**Response:**
```json
{
  "data": {
    "active": [
      {
        "id": 1,
        "name": "Office Gam3eya",
        "monthly_contribution_minor": 100000,
        "currency": "EGP",
        "total_months": 10,
        "payout_month": 5,
        "start_month": "2026-01-01",
        "linked_account": { "id": 1, "name": "CIB Savings" },
        "status": "active",
        "months_paid": 3,
        "months_remaining": 7,
        "total_contributed_minor": 300000,
        "total_received_minor": 0,
        "net_position_minor": -300000,
        "next_due_date": "2026-04-01",
        "payout_date": "2026-05-01"
      }
    ],
    "completed": [...]
  }
}
```

### `GET /api/v1/gam3eyas/{id}`
Single Gam3eya with full payment schedule.

### `GET /api/v1/gam3eyas/{id}/schedule`
Payment schedule with per-month status.

**Response:**
```json
{
  "data": {
    "schedule": [
      {
        "month": 1,
        "date": "2026-01-01",
        "contribution": {
          "amount_minor": 100000,
          "status": "paid",
          "transaction_id": 201,
          "transaction_date": "2026-01-02"
        },
        "payout": null
      },
      {
        "month": 5,
        "date": "2026-05-01",
        "contribution": {
          "amount_minor": 100000,
          "status": "upcoming",
          "transaction_id": null,
          "transaction_date": null
        },
        "payout": {
          "amount_minor": 1000000,
          "status": "upcoming"
        }
      }
    ]
  }
}
```

### `POST /api/v1/gam3eyas`
Create a new Gam3eya.

**Request (single payout):**
```json
{
  "name": "Office Gam3eya",
  "monthly_contribution_minor": 100000,
  "currency": "EGP",
  "total_months": 10,
  "split_mode": false,
  "payout_month": 5,
  "start_month": "2026-01-01",
  "linked_account_id": 1,
  "notes": "With colleagues, organized by Mostafa"
}
```

**Request (split payout):**
```json
{
  "name": "Family Gam3eya",
  "monthly_contribution_minor": 500000,
  "currency": "EGP",
  "total_months": 12,
  "split_mode": true,
  "splits": [
    { "month_offset": 3, "amount_minor": 3000000 },
    { "month_offset": 9, "amount_minor": 3000000 }
  ],
  "start_month": "2026-01-01",
  "linked_account_id": 1
}
```
**Validation:** Split amounts must sum to `total_months × monthly_contribution`.

### `PUT /api/v1/gam3eyas/{id}`
Update Gam3eya details (name, notes, linked account). Cannot change financial parameters after contributions started.

### `DELETE /api/v1/gam3eyas/{id}`
Soft delete. Linked transactions preserved.

### `POST /api/v1/gam3eyas/{id}/record-payment`
Record a monthly contribution payment. Creates a linked transaction.

**Request:**
```json
{
  "date": "2026-04-02",
  "account_id": 1,
  "notes": "April contribution"
}
```

Backend creates a debit transaction:
- `amount_minor = -monthly_contribution_minor`
- `type = debit`
- `gam3eya_id = this gam3eya`
- `category_id = Savings category`
- `applies_to_balance = true`

### `POST /api/v1/gam3eyas/{id}/record-payout`
Record receiving the payout. Creates a linked credit transaction.

**Request:**
```json
{
  "date": "2026-05-01",
  "account_id": 1,
  "amount_minor": 1000000,
  "notes": "Payout received"
}
```

### `POST /api/v1/gam3eyas/{id}/complete`
Mark Gam3eya as completed.

## Integration Points

| System | How Gam3eya Integrates |
|--------|----------------------|
| **Forecasting** | Monthly contributions appear as expenses, payout month as income in 12-month projection |
| **Dashboard** | Upcoming Gam3eya payments included in "Upcoming 30-day Payments" |
| **Transactions** | Contributions/payouts are regular transactions with `gam3eya_id` link |
| **Notifications** | Contribution due date reminders |
| **Categories** | Auto-assigned to "Savings" category |

## Acceptance Criteria
- [ ] Single payout mode: payout_month correctly maps to the right cycle month
- [ ] Split payout mode: splits validated (sum = total pool), stored in payout_splits table
- [ ] Payment schedule generates correct dates from start_month + total_months
- [ ] Contribution status: paid/overdue/upcoming derived from linked transactions
- [ ] Payout status: received/pending/upcoming derived from linked transactions
- [ ] Record payment creates a debit transaction with gam3eya_id and Savings category
- [ ] Record payout creates a credit transaction with gam3eya_id
- [ ] Net position computed correctly at any point in cycle
- [ ] Completed Gam3eya: net position should be 0 (contributed = received)
- [ ] Cannot modify financial parameters (contribution, months, payout) after contributions started
- [ ] Gam3eya contributions appear in forecasting cash flow projection
- [ ] Multiple concurrent Gam3eyas supported per household
- [ ] Linked transactions visible in Gam3eya detail and in transaction list (filterable by gam3eya_id)
