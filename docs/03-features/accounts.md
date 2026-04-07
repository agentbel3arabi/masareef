# Feature: Accounts

## Purpose
Accounts are the foundation of all financial tracking. Every transaction, debt, transfer, and asset links to an account. Users manage bank accounts, credit cards, cash wallets, digital wallets, and financing app accounts across multiple currencies.

## Account Types

| Type | Balance Semantics | Special Fields |
|------|------------------|----------------|
| `bank_account` | Positive = funds available | institution |
| `credit_card` | Negative = owed amount | credit_limit, billing_cycle_day, payment_due_day |
| `cash_wallet` | Positive = cash on hand | — |
| `digital_wallet` | Positive = balance (Vodafone Cash, Fawry, etc.) | institution |
| `financing_app` | Negative = owed amount | credit_limit, billing_cycle_day, institution (app name) |

> **Financing apps** (ValU, Souhoola, Sympl, Forsa, Tru, etc.) are Egyptian BNPL platforms. They behave like credit cards — credit limit, negative balance = owed, utilization tracking. See [financing-apps.md](./financing-apps.md) for full spec.

## Behavior

### Balance Calculation
- `displayed_balance_minor = seed_balance_minor + SUM(transactions WHERE applies_to_balance = true AND date >= opened_at)`
- Seed balance (`accounts.balance_minor`) is set at creation and only updated via:
  - Reconciliation (user action)
  - Atomic SQL during transfers and imports
- Never overwritten by raw transaction deltas

### Credit Card Specifics
- Balance stored as **negative integer** (owed amount in minor units)
- Available credit = `credit_limit + balance`
- Billing cycle: statement generated on `billing_cycle_day`, due on `payment_due_day`

### Credit Card Utilization

**Calculation (all amounts in minor units):**
- `used_credit_minor = max(0, -displayed_balance_minor)` — negative balance means you owe money; zero/positive means fully paid or overpaid
- `utilization = (used_credit_minor / credit_limit_minor) * 100`

**Color thresholds:**
- Green: <50% utilized
- Amber: 50–80% utilized
- Red: >80% utilized

**Display:** Progress bar on account cards (`credit_card` and `financing_app` types only), shown when `credit_limit` is set.

### Deferred: Credit Card Statement Cycle (Phase 3)

The following features are deferred to Phase 3 (Debts & Installments):
- Statement generation date
- Current balance vs statement balance distinction
- Minimum payment calculation
- Payment reminder integration
- Transaction pending vs posted state

### Multi-Currency
- Each account has an explicit `currency` code
- Net worth dashboard aggregates across currencies using exchange rates
- No implicit currency — every amount is tagged

## UI Reference Designs

| Screen | HTML Reference | Stitch Prompt |
|--------|---------------|---------------|
| Accounts Grid | [06-accounts.html](../stitch-designs/html/06-accounts.html) | [06-accounts.md](../stitch-prompts/06-accounts.md) |
| Account Detail | [07-account-detail.html](../stitch-designs/html/07-account-detail.html) | [07-account-detail.md](../stitch-prompts/07-account-detail.md) |

> These are layout references, not pixel-perfect specs. See [design-tokens.md](../guides/09-design-tokens.md) for canonical colors, fonts, and spacing.

## API Endpoints

### `GET /api/v1/accounts`
List all active accounts for the household with computed balances.

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "CIB Savings",
      "type": "bank_account",
      "currency": "EGP",
      "balance_minor": 1500000,
      "displayed_balance_minor": 2350000,
      "institution": "CIB",
      "is_active": true,
      "opened_at": "2024-01-15"
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "page_size": 50
  }
}
```

### `GET /api/v1/accounts/{id}`
Single account with full details including credit card fields.

### `POST /api/v1/accounts`
Create a new account.

**Request:**
```json
{
  "name": "HSBC Credit Card",
  "type": "credit_card",
  "currency": "EGP",
  "initial_balance": -450000,
  "institution": "HSBC",
  "credit_limit": 10000000,
  "billing_cycle_day": 15,
  "opened_at": "2023-06-01"
}
```

### `PUT /api/v1/accounts/{id}`
Update account details. Cannot change currency (would invalidate transaction history).

### `DELETE /api/v1/accounts/{id}`
Soft delete. Sets `is_active = false`. Transactions remain for historical reporting.

### `POST /api/v1/accounts/{id}/reconcile`
Reconcile account balance against actual bank balance.

**Request:**
```json
{
  "actual_balance": 2400000,
  "notes": "Matched with March statement"
}
```

Creates a reconciliation record and adjusts seed balance to correct discrepancy.

### `GET /api/v1/accounts/{id}/balance-history`
Returns balance history for an account over a time period.

**Query params:** `period` (optional, e.g., 'month')

### `GET /api/v1/accounts/{id}/obligations`
Returns debts and installment plans linked to the specified account.

### `GET /api/v1/accounts/net-worth`
Aggregated net worth across all accounts, grouped by currency, with optional base currency conversion.

**Query params:** `base_currency` (optional, defaults to household setting)

**Response:**
```json
{
  "data": {
    "by_currency": [
      { "currency": "EGP", "assets": 5000000, "liabilities": 1200000, "net_worth": 3800000 }
    ],
    "total_in_base": 3800000,
    "base_currency": "EGP"
  }
}
```

## Acceptance Criteria
- [ ] User can create accounts of all 5 types with correct validation (bank_account, credit_card, cash_wallet, digital_wallet, financing_app)
- [ ] Credit card shows available credit, not just balance
- [ ] Displayed balance recalculates correctly after transaction CRUD
- [ ] Reconciliation adjusts seed balance and logs discrepancy
- [ ] Net worth aggregates across currencies when exchange rates available
- [ ] Soft delete hides account from UI but preserves transaction history
- [ ] Cannot change account currency after creation
- [ ] Arabic account names display correctly in RTL layout
