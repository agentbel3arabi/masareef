# Feature: Debt & Installment Management

## Purpose
Tracks all forms of debt common in Egyptian/MENA financial life: bank loans with amortization schedules, credit card installment plans, store installment plans (interest-free), financing app installments (BNPL), and peer-to-peer debts between family and friends. The debt system integrates with forecasting (cash flow projections), dashboard (upcoming payments), and transactions (payment linking).

## Debt Types

| Type | Schema Value | Interest | Use Case |
|------|-------------|----------|----------|
| Bank Loan | `bank_loan` | Yes (annualRateBps) | Car loans, personal loans, mortgages |
| P2P Lent | `personal_lent` | No | Money you lent to someone |
| P2P Borrowed | `personal_borrowed` | No | Money you borrowed from someone |
| Credit Card Installment | `credit_card` (installment_plans) | Usually 0% | Bank CC installment programs |
| Store Installment | `store` (installment_plans) | Usually 0% | Retailer installment plans (B.TECH, Jumia, etc.) |
| Financing App Installment | `financing_app` (installment_plans) | 0% or fees | BNPL: ValU, Souhoola, Sympl, Forsa, Tru, etc. |

> Financing apps have their own dedicated spec: [financing-apps.md](./financing-apps.md). The debts page has **5 tabs**: Loans | Card Installments | Financing Apps | Store Installments | P2P.

## Bank Loans

### Amortization Engine
Calculates fixed monthly payment using the standard PMT formula:

```
Monthly Rate = annualRateBps / (10000 × 12)

If rate > 0:
  Payment = Principal × (rate × (1 + rate)^months) / ((1 + rate)^months - 1)
If rate = 0:
  Payment = Principal / months

Result rounded up to nearest minor unit.
```

**Amortization schedule** generated on-demand from loan parameters:
- Each row: payment number, date, total payment, principal portion, interest portion, remaining balance
- Interest = remaining balance × monthly rate
- Principal = payment - interest
- Final payment absorbs rounding error

### Payment Tracking
Payments are recorded in `debt_payments` table with optional link to a transaction:
- `amount_minor` — total payment (always positive)
- `principal_minor` / `interest_minor` — breakdown for amortized loans
- `transaction_id` — optional link to a bank transaction (for matching)

### Installment Status
Each scheduled payment in the amortization has a status:

| Status | Condition |
|--------|-----------|
| `paid` | Confirmed debt_payment record exists for this period |
| `overdue` | Past due date with no confirmed payment |
| `upcoming` | Future date |

### Auto-Match Suggestions
For loans with `linked_account_id`, the system suggests transaction matches:
- Query transactions on the linked account near the due date (±5 days)
- Amount within 5% of expected payment
- Show as "Match?" suggestions in the loan detail view
- User confirms → creates debt_payment linked to that transaction

## P2P Debts

### Person Management (create first, then add debts)
Persons must be created **before** attaching debts. A person is a contact — not an auto-created side effect.

**Person record fields:**
- `name` — full name (required)
- `name_ar` — Arabic name (optional)
- `phone` — phone number (optional)
- `email` — email address (optional)
- `relationship` — optional enum: `family`, `friend`, `colleague`, `business`, `other`
- `notes` — free text

**Flow:** Settings → People → Add Person → fill details → Save. Then: Debts → P2P → Add Debt → select person from list.

### P2P Debt Structure
Each P2P debt supports flexible repayment scheduling:

**Core fields:**
- `person_id` — link to existing person (required)
- `type` — `personal_lent` or `personal_borrowed`
- `principal_minor` — total amount
- `currency` — debt currency (can differ per debt — same person may owe you EGP and USD)
- `start_date` — when the debt was created
- `due_date` — optional single payout date (full amount due at once)

**Repayment modes:**

| Mode | Behavior |
|------|----------|
| **Lump sum** | Single `due_date`, full amount due at once. No splits. |
| **Equal splits** | `split_count` equal payments. System auto-generates dates (monthly from start_date). Each split = principal / split_count. |
| **Custom splits** | User defines each payment: amount + date. Stored in `p2p_debt_splits` table. Sum must equal principal. |

**`p2p_debt_splits` table:**

> **Data Model:** See [02-data-models.md](../02-data-models.md) → Debt Management section for the `p2p_debt_splits` table schema.

### Person Card Display
Each person card shows:
- Person name, relationship badge, contact info
- **Per-currency balances:**
  ```
  EGP: You owe Ahmed 15,000 | Ahmed owes you 5,000 | Net: You owe 10,000
  USD: Ahmed owes you $200 | Net: Ahmed owes $200
  ```
- **Total in base currency:** all per-currency nets converted via latest FX rate
  ```
  Total (in EGP): You owe Ahmed 7,060 EGP
  ```
- List of all debts with status (active/paid_off) and progress bars

**Net balance computation per person per currency:**
```
For each currency:
  lent_total = SUM(principal_minor) WHERE type = personal_lent AND currency = X
  borrowed_total = SUM(principal_minor) WHERE type = personal_borrowed AND currency = X
  lent_paid = SUM(debt_payments.amount_minor) for lent debts in currency X
  borrowed_paid = SUM(debt_payments.amount_minor) for borrowed debts in currency X

  net = (lent_total - lent_paid) - (borrowed_total - borrowed_paid)
  Positive net = they owe you. Negative net = you owe them.

Total in base currency:
  SUM(net_per_currency × latest_fx_rate_to_base)
```

### Privacy
P2P debt data is culturally sensitive in MENA. Additional access controls:
- `child` role cannot see P2P debts
- `viewer` role sees P2P debts in their household but cannot create/edit
- Only `admin` and `member` roles can manage P2P debts

### Settlement
When a P2P debt is fully repaid:
- User records final payment (or marks all splits as paid)
- System marks debt as `paid_off`
- Net balance per person per currency recalculates automatically

## Credit Card Installments

### Egyptian Installment Culture
Egyptian banks widely offer 0% interest installment plans on credit cards. A single credit card may have 5-10 concurrent installment plans. This is a first-class feature, not an edge case.

### Per-Card Tracking
- Each plan links to a credit card account via `source_account_id`
- **Monthly commitment** per card = SUM(monthly_amount_minor) for all active plans
- **Credit utilization** = total committed / credit limit
- Dashboard shows utilization percentage per card

### Plan Lifecycle
```
Active → user records payments monthly (or auto-detected from transactions)
  → After total_months elapsed → mark as "completed"
  → Or user manually marks completed early (e.g., early payoff)
```

## Store Installments

### Behavior
Same as credit card installments but with:
- `type = "store"` and `merchant_name` (e.g., "B.TECH", "Jumia", "IKEA")
- Optional `linked_account_id` for the account charged monthly
- No credit card association required
- Common in Egypt: 0% interest, 6-36 month terms

## UI Reference Designs

| Screen | HTML Reference | Stitch Prompt |
|--------|---------------|---------------|
| Debts — Loans | [10-debts-loans.html](../stitch-designs/html/10-debts-loans.html) | [10-debts-loans.md](../stitch-prompts/10-debts-loans.md) |
| Card Installments | [10b-card-installments.html](../stitch-designs/html/10b-card-installments.html) | [10b-debts-card-installments.md](../stitch-prompts/10b-debts-card-installments.md) |
| Store Installments | [10c-store-installments.html](../stitch-designs/html/10c-store-installments.html) | [10c-debts-store-installments.md](../stitch-prompts/10c-debts-store-installments.md) |
| P2P Debts | [11-p2p-debts.html](../stitch-designs/html/11-p2p-debts.html) | [11-debts-p2p.md](../stitch-prompts/11-debts-p2p.md) |

> These are layout references, not pixel-perfect specs. See [design-tokens.md](../guides/09-design-tokens.md) for canonical colors, fonts, and spacing.

## API Endpoints

### Debts

#### `GET /api/v1/debts`
All debts for the household with payment summaries.

**Query params:** `type` (bank_loan/personal_lent/personal_borrowed), `status` (active/paid_off)

**Response:**
```json
{
  "data": {
    "bank_loans": [
      {
        "id": 1,
        "name": "Car Loan - CIB",
        "institution": "CIB",
        "principal_minor": 50000000,
        "currency": "EGP",
        "annual_rate_bps": 1450,
        "tenure_months": 60,
        "start_date": "2025-01-15",
        "monthly_payment_minor": 1175000,
        "status": "active",
        "total_paid_minor": 14100000,
        "remaining_minor": 35900000,
        "has_overdue": false,
        "next_due_date": "2026-04-15"
      }
    ],
    "personal_debts": [
      {
        "id": 5,
        "type": "personal_lent",
        "person": { "id": 1, "name": "Ahmed" },
        "principal_minor": 1000000,
        "currency": "EGP",
        "total_paid_minor": 500000,
        "remaining_minor": 500000,
        "status": "active"
      }
    ],
    "persons": [...],
    "accounts": [...]
  }
}
```

#### `POST /api/v1/debts`
Create a new debt.

**Request (bank loan):**
```json
{
  "type": "bank_loan",
  "name": "Car Loan",
  "institution": "CIB",
  "principal_minor": 50000000,
  "currency": "EGP",
  "annual_rate_percent": 14.5,
  "tenure_months": 60,
  "start_date": "2025-01-15",
  "linked_account_id": 1
}
```
Backend computes `monthly_payment_minor` via amortization formula and stores it.

> **Conversion:** API accepts `annual_rate_percent` (e.g., `14.5`). Backend converts to basis points for storage: `annual_rate_bps = round(annual_rate_percent × 100)` → `1450`. GET responses return both `annual_rate_bps` (canonical) and `annual_rate_percent` (convenience).

**Request (P2P — lump sum):**
```json
{
  "type": "personal_lent",
  "name": "Loan to Ahmed",
  "person_id": 1,
  "principal_minor": 1000000,
  "currency": "EGP",
  "start_date": "2026-03-01",
  "repayment_mode": "lump_sum",
  "due_date": "2026-09-01"
}
```

**Request (P2P — equal splits):**
```json
{
  "type": "personal_borrowed",
  "name": "Borrowed from Sara",
  "person_id": 3,
  "principal_minor": 3000000,
  "currency": "EGP",
  "start_date": "2026-01-01",
  "repayment_mode": "equal_splits",
  "split_count": 6
}
```
Backend auto-generates 6 monthly splits of 500,000 each (dates: Feb 1, Mar 1, ... Jul 1).

**Request (P2P — custom splits):**
```json
{
  "type": "personal_lent",
  "name": "Loan to Khaled",
  "person_id": 2,
  "principal_minor": 5000000,
  "currency": "USD",
  "start_date": "2026-03-01",
  "repayment_mode": "custom_splits",
  "splits": [
    { "amount_minor": 2000000, "due_date": "2026-04-01" },
    { "amount_minor": 1500000, "due_date": "2026-06-01" },
    { "amount_minor": 1500000, "due_date": "2026-08-01" }
  ]
}
```
**Validation:** `person_id` must reference an existing person. Split amounts must sum to `principal_minor`.

#### `PUT /api/v1/debts/{id}`
Update debt details. Cannot change principal or rate after payments exist.

#### `DELETE /api/v1/debts/{id}`
Soft delete. Payment history preserved.

#### `GET /api/v1/debts/{id}/amortization`
Full amortization schedule for a bank loan.

**Response:**
```json
{
  "data": {
    "schedule": [
      {
        "payment_number": 1,
        "date": "2025-02-15",
        "payment_minor": 1175000,
        "principal_minor": 571250,
        "interest_minor": 603750,
        "remaining_minor": 49428750,
        "status": "paid"
      },
      {
        "payment_number": 15,
        "date": "2026-04-15",
        "payment_minor": 1175000,
        "principal_minor": 625800,
        "interest_minor": 549200,
        "remaining_minor": 38250000,
        "status": "upcoming"
      }
    ]
  }
}
```

#### `GET /api/v1/debts/{id}/payments`
List all payments recorded against a debt.

#### `POST /api/v1/debts/{id}/payments`
Record a payment against a debt.

**Request:**
```json
{
  "date": "2026-03-15",
  "amount_minor": 1175000,
  "transaction_id": 42,
  "notes": "March installment"
}
```
For bank loans, backend auto-computes principal/interest split from amortization schedule.

#### `POST /api/v1/debts/{id}/bulk-past-payments`
Record multiple past payments at once for a debt (e.g., backfilling payment history).

#### `POST /api/v1/debts/bulk-payment`
Record a single payment spread across multiple debts.

#### `POST /api/v1/debts/{id}/reactivate`
Reactivate a previously paid-off debt (change status from `paid_off` back to `active`).

#### `GET /api/v1/debts/{id}/match-suggestions`
Auto-match suggestions for a loan with linked account.

**Response:**
```json
{
  "data": {
    "suggestions": [
      {
        "transaction_id": 42,
        "date": "2026-03-16",
        "amount_minor": -1175000,
        "description": "LOAN REPAYMENT CIB",
        "match_score": 0.95
      }
    ]
  }
}
```

#### `POST /api/v1/debts/{id}/mark-paid`
Mark debt as fully paid off.

### Installment Plans

#### `GET /api/v1/installments`
All installment plans grouped by type.

**Response:**
```json
{
  "data": {
    "credit_card_plans": [...],
    "store_plans": [...],
    "card_summaries": [
      {
        "account_id": 2,
        "account_name": "HSBC Visa",
        "total_monthly_minor": 450000,
        "credit_limit_minor": 10000000,
        "total_committed_minor": 8500000,
        "utilization_percent": 85
      }
    ]
  }
}
```

#### `POST /api/v1/installments`
Create an installment plan.

**Request:**
```json
{
  "type": "credit_card",
  "name": "iPhone 16 Pro",
  "source_account_id": 2,
  "total_amount_minor": 5400000,
  "monthly_amount_minor": 450000,
  "total_months": 12,
  "start_month": "2026-01-01",
  "currency": "EGP"
}
```

#### `PUT /api/v1/installments/{id}`
Update plan details.

#### `POST /api/v1/installments/{id}/complete`
Mark plan as completed (all payments done or early payoff).

### Persons (must create before adding P2P debts)

#### `GET /api/v1/persons`
List all persons with per-currency net balances and base currency total.

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Ahmed Hassan",
      "name_ar": "أحمد حسن",
      "phone": "+201234567890",
      "email": "ahmed@example.com",
      "relationship": "family",
      "balances_by_currency": [
        { "currency": "EGP", "lent_remaining": 1000000, "borrowed_remaining": 500000, "net": 500000 },
        { "currency": "USD", "lent_remaining": 20000, "borrowed_remaining": 0, "net": 20000 }
      ],
      "total_net_in_base": 1500000,
      "base_currency": "EGP",
      "active_debts_count": 3
    }
  ]
}
```

#### `POST /api/v1/persons`
Create a person record. **Must be created before adding debts.**

**Request:**
```json
{
  "name": "Ahmed Hassan",
  "name_ar": "أحمد حسن",
  "phone": "+201234567890",
  "email": "ahmed@example.com",
  "relationship": "family",
  "notes": "Brother-in-law"
}
```

#### `PUT /api/v1/persons/{id}`
Update person details (name, phone, email, relationship, notes).

#### `DELETE /api/v1/persons/{id}`
Soft delete. Fails if person has active debts — must settle or delete debts first.

### P2P Debt Splits

#### `GET /api/v1/debts/{id}/splits`
Get repayment schedule for a P2P debt with split payments.

**Response:**
```json
{
  "data": {
    "repayment_mode": "custom_splits",
    "splits": [
      { "id": 1, "amount_minor": 2000000, "due_date": "2026-04-01", "paid": true, "payment_id": 12 },
      { "id": 2, "amount_minor": 1500000, "due_date": "2026-06-01", "paid": false, "payment_id": null },
      { "id": 3, "amount_minor": 1500000, "due_date": "2026-08-01", "paid": false, "payment_id": null }
    ]
  }
}
```

## Integration Points

| System | How Debts Integrate |
|--------|-------------------|
| **Forecasting** | Monthly loan payments, installments, and P2P repayments appear in 12-month cash flow projection |
| **Dashboard** | "Active Debts" count + "Upcoming 30-day Payments" aggregate shown on stat cards |
| **Transactions** | Debt payments optionally link to transactions via `transaction_id` |
| **Notifications** | Payment due date reminders (3 days before, day of, overdue) |
| **Assets** | Car loan can link to vehicle asset; mortgage to real estate asset |

## Acceptance Criteria

### Bank Loans
- [ ] Amortization schedule correctly computed from principal, rate, tenure
- [ ] Monthly payment uses PMT formula (rounded up)
- [ ] Payment recording auto-splits into principal/interest
- [ ] Installment status: paid, overdue, upcoming — correctly derived from payments
- [ ] Auto-match suggests transactions from linked account near due date
- [ ] Cannot modify principal/rate after payments exist
- [ ] Paid-off status auto-triggers when remaining balance reaches zero

### P2P Debts
- [ ] Person must be created first — cannot create P2P debt without existing person_id
- [ ] Person record includes name, name_ar, phone, email, relationship, notes
- [ ] Relationship field: family, friend, colleague, business, other (optional)
- [ ] Three repayment modes: lump_sum (single due_date), equal_splits (auto-generated), custom_splits (user-defined)
- [ ] Equal splits: auto-generates N monthly splits from start_date, each = principal / N
- [ ] Custom splits: user defines amount + date per split, sum validated = principal
- [ ] Person card shows per-currency balances (lent_remaining, borrowed_remaining, net)
- [ ] Person card shows total net converted to base currency via latest FX rate
- [ ] Split payment status: paid/overdue/upcoming derived from debt_payments linkage
- [ ] Net balance per person per currency computed correctly across all debts
- [ ] Child role cannot access P2P debts
- [ ] Cannot delete person with active debts
- [ ] Settlement marks debt as paid_off, recalculates per-currency net

### Installments
- [ ] Multiple concurrent plans per credit card
- [ ] Per-card monthly commitment and utilization correctly computed
- [ ] Store plans work without credit card association
- [ ] Completion after total_months or manual early payoff

### Integration
- [ ] Debt payments appear in forecasting cash flow
- [ ] Upcoming payments aggregated on dashboard
- [ ] Payment due reminders trigger 3 days before due date
