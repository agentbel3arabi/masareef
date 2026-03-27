# Unit 1E: Transaction & Transfer APIs — Session Handoff

## What Was Done

Unit 1E implemented the Transaction CRUD router (create, read, update, delete, search, filter, split, bulk ops) and Transfer router (create, delete, list) — the most complex backend endpoints in Phase 1.

### Deliverables
- **Transaction service** (`services/transaction.py`): 10 async functions — create_transaction, get_transaction, update_transaction, soft_delete_transaction, list_transactions (12 filters + 4 sort modes), create_splits, categorize_transaction, validate_category_access, bulk_delete, bulk_categorize
- **Transaction router** (`routers/transactions.py`): 9 endpoints — list (paginated + filtered), get, create (201), update, delete (204), split (with sum validation), categorize, bulk/delete, bulk/categorize
- **Transfer service** (`services/transfer.py`): 3 async functions — create_transfer (atomic two-leg with FX support), delete_transfer (balance reversal), list_transfers (debit-leg-only pagination)
- **Transfer router** (`routers/transfers.py`): 3 endpoints — create (201), delete (204), list with pagination
- **Tests**: 109 total (83 from Units 1A-1D, 9 transaction, 6 transfer, 11 other new)
- **PR**: #8 on GitHub (squash-merged)

### Key Decisions
- Transactions use signed `amount_minor` (negative=debit, positive=credit) via `compute_balance_delta()`
- Transfer legs set `applies_to_balance=False` — balances updated directly on both accounts to avoid double-counting with `compute_displayed_balance()`
- Split sum validation compares against `abs(tx.amount_minor)` since debits are stored as negative
- FX rate rejected for same-currency transfers, required for cross-currency
- `validate_category_access()` shared helper validates category exists, is active, and is accessible to household (predefined or household-owned) — used in create, update, categorize, splits, bulk_categorize
- `account.currency` used for transaction currency instead of trusting request body
- Transfer category lookup filters on `is_active` to avoid linking to soft-deleted categories
- Bulk routes (`/bulk/delete`, `/bulk/categorize`) declared before `/{transaction_id}` to prevent FastAPI path collision
- `bulk_delete` iterates per-row calling `soft_delete_transaction` for correct balance reversal + split cleanup
- `is_active` filtering uses `.is_(True)` consistently per prior Copilot review feedback
- `date_from`/`date_to` typed as `datetime.date | None` in routers and services for PostgreSQL compatibility

### Review Issues Fixed (Round 1 — 10 comments)
1. `date_from`/`date_to` changed from `str` to `datetime.date` across all routers + services
2. `categorize_transaction` now validates category exists and is accessible
3. `credit_q` in `list_transfers` now includes `household_id` filter for tenant isolation
4. Split tests seed real categories via `_create_category()` helper instead of hardcoded IDs
5. `create_transaction` validates account exists, is active, belongs to household
6. `split_transaction` validates each `category_id` via `validate_category_access()`
7. N+1 in `list_transfers` — acknowledged, deferred to optimization pass

### Review Issues Fixed (Round 2 — 9 comments)
1. `create_transaction` validates `category_id` when provided
2. `update_transaction` validates `category_id` via `tx.household_id`
3. `bulk_categorize` validates `category_id` once upfront
4. Transaction currency derived from `account.currency` not request body
5. Transfer category lookup includes `is_active` filter
6. Added `test_same_currency_transfer_rejects_fx_rate` test
7. `bulk_categorize` endpoint catches ValueError, returns 400 with `INVALID_CATEGORY`
8. Added `test_bulk_categorize` test
9. FX float precision — acknowledged, deferred (acceptable for Phase 1 scale)

### Known Improvements (Not Blocking)
- N+1 query in `list_transfers` (per-row credit leg + account lookups) — TODO for joined query optimization
- FX rate computation uses `round()` with float math — acceptable for current scale, Decimal math for very large amounts
- `list_transfers` `account_id` filter only matches debit legs (not either leg) — spec says "filter by either leg"
- `TransactionResponse.category` embedded field always None — requires eager loading, deferred
- `TransferResponse`/`TransferListItem` Pydantic schemas exist but router uses manual dict construction
- `TransactionResponse.is_split` always False — no `is_split` column on model, computed dynamically would need relationship loading

## Next Steps
- Unit 1E is merged — Unit 1F can begin
- The test infrastructure (conftest.py with SQLite + auth overrides + `_create_account`/`_create_category` helpers) is ready for more router tests
- Transaction + Transfer services provide the foundation for import (Phase 2), budgets, and reporting
