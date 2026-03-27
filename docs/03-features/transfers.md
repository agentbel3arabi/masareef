# Feature: Transfers

## Purpose
Transfers move money between accounts. They are the only way to represent internal money movement (bank → cash, EGP account → USD account). Transfers are modeled as two linked transactions — a debit leg and a credit leg — sharing a UUID.

## Behavior

### Two-Leg Model
Every transfer creates exactly two transaction rows:
- **Debit leg** on source account: `amount_minor = -abs(amount)`, `applies_to_balance = false`
- **Credit leg** on destination account: `amount_minor = +target_amount`, `applies_to_balance = false`
- Both share the same `transfer_id` (UUID)

### Why `applies_to_balance = false`?
Balance is updated via direct SQL in the same atomic operation:
```
UPDATE accounts SET balance = balance - source_amount WHERE id = source_id;
UPDATE accounts SET balance = balance + target_amount WHERE id = target_id;
```
If transfer legs also had `applies_to_balance = true`, balance would be double-counted.

### Cross-Currency Transfers
When source and destination accounts have different currencies:
- User provides `fx_rate_minor_units` (source→target rate × 10,000)
- Target amount computed server-side: `target_amount = round(source_amount × fx_rate / 10000)`
- Both legs store the `fx_rate_minor_units` for audit trail
- Example: Transfer 10,000 EGP to USD account at rate 0.0199 → `fx_rate = 199`, target = `round(1000000 × 199 / 10000)` = 19,900 cents = $199.00

### Same-Currency Transfers
- `fx_rate_minor_units` is null
- Target amount equals source amount

### Report Exclusion
All reports and aggregations filter `WHERE transfer_id IS NULL` to prevent transfers from appearing as income or expense. Transfers are a separate category in the UI.

## UI Reference Designs

| Screen | HTML Reference | Stitch Prompt |
|--------|---------------|---------------|
| Transfer Form | [22-transfer-form.html](../stitch-designs/html/22-transfer-form.html) | [22-transfer-form.md](../stitch-prompts/22-transfer-form.md) |

> These are layout references, not pixel-perfect specs. See [design-tokens.md](../guides/09-design-tokens.md) for canonical colors, fonts, and spacing.

## API Endpoints

### `POST /api/v1/transfers`
Create a transfer between two accounts.

**Request:**
```json
{
  "from_account_id": 1,
  "to_account_id": 3,
  "amount_minor": 500000,
  "date": "2026-03-20",
  "description": "ATM withdrawal",
  "notes": "",
  "fx_rate_minor_units": null
}
```

Cross-currency example:
```json
{
  "from_account_id": 1,
  "to_account_id": 5,
  "amount_minor": 1000000,
  "date": "2026-03-20",
  "description": "Convert EGP to USD",
  "fx_rate_minor_units": 199
}
```

**Response:**
```json
{
  "transfer_id": "a1b2c3d4-...",
  "debit_transaction_id": 101,
  "credit_transaction_id": 102,
  "source_amount": 1000000,
  "target_amount": 19900
}
```

**Atomic operation:**
1. Validate both accounts exist and belong to household
2. If currencies differ, require `fx_rate_minor_units`
3. Generate `transfer_id` UUID
4. In single DB transaction:
   - INSERT debit leg
   - INSERT credit leg
   - UPDATE source account balance
   - UPDATE destination account balance

### `DELETE /api/v1/transfers/{transfer_id}`
Delete both legs and reverse both balance updates atomically.

### `GET /api/v1/transfers`
List transfers with source/destination account info. Paginated.

**Query params:** `account_id` (filter by either leg), `date_from`, `date_to`, `page`, `page_size`

**Response:**
```json
{
  "data": [
    {
      "transfer_id": "a1b2c3d4-...",
      "date": "2026-03-20",
      "description": "ATM withdrawal",
      "from_account": { "id": 1, "name": "CIB Savings", "currency": "EGP" },
      "to_account": { "id": 3, "name": "Cash Wallet", "currency": "EGP" },
      "source_amount": 500000,
      "target_amount": 500000,
      "fx_rate_minor_units": null
    }
  ],
  "meta": {
    "total": 23,
    "page": 1,
    "page_size": 50
  }
}
```

## Acceptance Criteria
- [ ] Same-currency transfer: both accounts update by exact amount
- [ ] Cross-currency transfer: target amount computed correctly from FX rate
- [ ] Both legs created atomically — no partial state on failure
- [ ] Delete reverses both balance updates atomically
- [ ] Transfers excluded from income/expense aggregations
- [ ] Transfers appear in the "Transfer" category in transaction lists
- [ ] Transfer counterpart account shown in transaction detail view
- [ ] Cannot transfer to the same account
- [ ] Cannot transfer from account with insufficient balance (warning, not hard block — user may know about pending deposits)
- [ ] FX rate required when currencies differ, rejected when currencies match
