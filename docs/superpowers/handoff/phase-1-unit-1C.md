# Unit 1C: Auth & Money Services — Session Handoff

## What Was Done

Unit 1C implemented the Pydantic v2 schemas, money formatting service, balance computation service, and Supabase JWT auth dependencies — the service layer that routers (Units 1D-1E) will call.

### Deliverables
- **6 schema files**: common.py, account.py, transaction.py, transfer.py, category.py, exchange_rate.py
- **2 service files**: money.py (format_amount, minor_to_major, major_to_minor), balance.py (compute_displayed_balance, compute_balance_delta)
- **Auth dependencies**: get_current_user (JWT auth), get_household_id (household resolution), decode_jwt (mockable helper)
- **Auth test overrides**: conftest.py autouse fixture for router tests with TEST_USER_ID / TEST_HOUSEHOLD_ID
- **Tests**: 83 total (52 from Units 1A+1B, 31 new for Unit 1C)
- **Branch**: `feature/unit-1c-auth-money-services`

### Key Decisions
- Money service imports `CURRENCIES` from `app.seed` (canonical source, not redefined)
- `TransactionUpdate.date` uses `Optional[date]` instead of `date | None` because the field name shadows the type import — `|` syntax fails at runtime (Pydantic V2 + name shadowing)
- `get_current_user` uses `isinstance(credentials, HTTPAuthorizationCredentials)` instead of `if credentials:` to handle the `Depends()` marker object correctly in direct unit test calls
- `compute_balance_delta` was named differently from the plan's `apply_transaction_delta` — "compute" better conveys it's a pure calculation, not a mutation

### Review Issues Noted (Not Blocking)
1. **JWT secret uses `SUPABASE_ANON_KEY`** — the plan specifies this, but the correct key for production is a dedicated `SUPABASE_JWT_SECRET`. Fix when connecting to real Supabase.
2. **`get_current_user` has a `token: str` parameter** — this becomes a query parameter in OpenAPI docs. Should be removed before routers use it; tests should use `HTTPAuthorizationCredentials` directly.
3. **Bare `except Exception` on Settings()** — silently falls back to empty JWT secret. Should fail loudly in production.
4. **`compute_balance_delta` doesn't validate `tx_type`** — unknown types silently return positive delta. Consider adding `ValueError`.
5. **`TransferListItem.from_account/to_account` typed as `dict`** — should use a typed embedded model when transfer router is built.

## Next Steps
- Push branch and create PR
- Unit 1D (Account Router) or Unit 1E (Transaction Router) can begin after merge
- The auth dependency overrides in conftest.py are ready for router tests
- Fix JWT secret key issue (#1 above) before connecting to real Supabase
