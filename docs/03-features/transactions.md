# Feature: Transactions

## Purpose
Transactions are the atomic unit of financial data. Every money movement — spending, income, transfer leg, debt payment, Gam3eya contribution — is a transaction. The system supports manual entry, import, AI categorization, splits, filtering, and bulk operations.

## Behavior

### Amount Convention
- `amount_minor` is **signed**: negative for debit (money out), positive for credit (money in)
- `type` field stores `debit` or `credit` explicitly for clarity
- All amounts in minor units (piasters/cents)

### Balance Impact
- `applies_to_balance = true` (default) — transaction affects the account's displayed balance
- `applies_to_balance = false` — informational only (e.g., transfer legs where balance is updated atomically)
- Balance delta applied at creation: `UPDATE accounts SET balance = balance + amount_minor`
- Reversed on delete: `UPDATE accounts SET balance = balance - amount_minor`

### Linking
A transaction can optionally link to:
- **Category** via `category_id` — what it was for
- **Transfer** via `transfer_id` — UUID linking two legs of a transfer
- **Gam3eya** via `gam3eya_id` — contribution or payout
- **Asset** via `asset_id` — purchase, maintenance, insurance, etc.
- **Import batch** via `import_batch_id` — which import session created it

### Splits
A single transaction can be split across multiple categories. When split:
- Parent transaction retains full `amount_minor`
- `transaction_splits` rows allocate portions to categories
- Sum of split amounts must equal parent's `abs(amount_minor)`
- Reports use split allocations instead of parent category

### AI Categorization
- After creation (manual or import), uncategorized transactions queue for AI
- AI assigns `category_id`, sets `ai_categorized = true`, records `ai_confidence`
- Confidence tiers determine UX: auto-assign (>95%), suggest (75-95%), ask (<75%)
- User corrections create/update `categorization_rules` for future matching

## UI Reference Designs

| Screen | HTML Reference | Stitch Prompt |
|--------|---------------|---------------|
| Account Detail | [07-account-detail.html](../stitch-designs/html/07-account-detail.html) | [07-account-detail.md](../stitch-prompts/07-account-detail.md) |
| All Transactions | [07b-transactions-global.html](../stitch-designs/html/07b-transactions-global.html) | [07b-transactions-global.md](../stitch-prompts/07b-transactions-global.md) |
| Transaction Form | [21-transaction-form.html](../stitch-designs/html/21-transaction-form.html) | [21-transaction-form.md](../stitch-prompts/21-transaction-form.md) |

> These are layout references, not pixel-perfect specs. See [design-tokens.md](../guides/09-design-tokens.md) for canonical colors, fonts, and spacing.

## API Endpoints

### `GET /api/v1/transactions`
Paginated list with filtering. Core query endpoint for the entire app.

**Query params:**

| Param | Type | Notes |
|-------|------|-------|
| account_id | int | Filter to single account |
| page | int | Default 1 |
| page_size | int | Default 50, max 100 |
| q | string | Full-text search on description + notes |
| type | debit/credit | |
| category_id | int | |
| date_from | YYYY-MM-DD | |
| date_to | YYYY-MM-DD | |
| amount_min | int | Signed minor units |
| amount_max | int | Signed minor units |
| has_category | bool | Filter uncategorized |
| asset_id | int | Transactions linked to an asset |
| sort | string | `date`, `-date` (default), `amount`, `-amount` |

**Response:**
```json
{
  "data": [
    {
      "id": 42,
      "account_id": 1,
      "date": "2026-03-20",
      "description": "Carrefour City Stars",
      "amount_minor": -125000,
      "currency": "EGP",
      "type": "debit",
      "category": { "id": 2, "name_en": "Groceries", "name_ar": "بقالة", "color": "#EF4444" },
      "is_split": false,
      "transfer_id": null,
      "asset_id": null,
      "ai_categorized": true,
      "ai_confidence": 0.97
    }
  ],
  "meta": {
    "total": 347,
    "page": 1,
    "page_size": 50
  }
}
```

### `GET /api/v1/transactions/{id}`
Single transaction with splits (if any), linked transfer counterpart, and debt payment info.

### `POST /api/v1/transactions`
Create a single transaction.

**Request:**
```json
{
  "account_id": 1,
  "date": "2026-03-20",
  "description": "Carrefour City Stars",
  "amount_minor": 125000,
  "type": "debit",
  "currency": "EGP",
  "category_id": 2,
  "notes": "Weekly groceries",
  "gam3eya_id": null,
  "asset_id": null
}
```

Backend computes signed amount: if `type = debit`, store as `-125000`.

### `PUT /api/v1/transactions/{id}`
Update transaction. Recomputes balance delta (old amount reversed, new applied).

### `DELETE /api/v1/transactions/{id}`
Soft delete. Reverses balance impact if `applies_to_balance = true`.

### `POST /api/v1/transactions/{id}/categorize`
Assign or change category.

**Request:**
```json
{ "category_id": 5 }
```

If changing an AI-assigned category, creates a `categorization_rule` from the correction.

### `POST /api/v1/transactions/{id}/split`
Split transaction across categories.

**Request:**
```json
{
  "splits": [
    { "category_id": 2, "amount_minor": 80000, "notes": "Food" },
    { "category_id": 7, "amount_minor": 45000, "notes": "Cleaning supplies" }
  ]
}
```

**Validation:** Split sum must equal parent's `abs(amount_minor)`.

### `POST /api/v1/transactions/bulk/delete`
Bulk soft-delete.

**Request:**
```json
{ "ids": [42, 43, 44] }
```

### `POST /api/v1/transactions/bulk/categorize`
Bulk category assignment.

**Request:**
```json
{ "ids": [42, 43, 44], "category_id": 5 }
```

### `GET /api/v1/transactions/{id}/page`
Utility: returns the page number containing this transaction for a given page_size. Used for deep-link highlighting (e.g., after import, navigate to the first imported transaction).

## Acceptance Criteria
- [ ] Manual transaction creation correctly updates account balance
- [ ] Edit recomputes balance delta (reverses old, applies new)
- [ ] Delete reverses balance impact
- [ ] Full-text search matches description and notes
- [ ] All 7 filter dimensions work independently and combined
- [ ] Pagination returns correct totals and page boundaries
- [ ] Splits validate sum equals parent amount
- [ ] Reports use split allocations when present
- [ ] AI categorization runs async after creation
- [ ] User correction of AI category creates a categorization rule
- [ ] Bulk operations handle 100+ items atomically
- [ ] Transfer legs excluded from income/expense reports (`WHERE transfer_id IS NULL`)
- [ ] Deep-link highlighting works (navigate to correct page, flash the row)
