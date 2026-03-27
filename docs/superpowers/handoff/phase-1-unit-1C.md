# Unit 1C: Auth & Money Services — Session Handoff

## What Was Done

Unit 1C implemented the Pydantic v2 schemas, money formatting service, balance computation service, and Supabase JWT auth dependencies — the service layer that routers (Units 1D-1E) will call.

### Deliverables
- **6 schema files**: common.py, account.py, transaction.py, transfer.py, category.py, exchange_rate.py
- **2 service files**: money.py (format_amount, minor_to_major, major_to_minor), balance.py (compute_displayed_balance, compute_balance_delta)
- **Auth dependencies**: get_current_user (JWT via HTTPBearer), get_household_id (household resolution), decode_jwt (mockable helper)
- **Auth test overrides**: conftest.py autouse fixture for router tests with TEST_USER_ID / TEST_HOUSEHOLD_ID
- **Tests**: 83 total (52 from Units 1A+1B, 31 new for Unit 1C)
- **PR**: #5 on GitHub — CI passes, Copilot reviewed

### Key Decisions
- Money service imports `CURRENCIES` from `app.seed` (canonical source, not redefined)
- `TransactionUpdate.date` uses `import datetime` + `datetime.date` to avoid field name shadowing the type (using `from datetime import date` + `date | None` fails at runtime when a Pydantic field is also named `date`)
- `get_current_user` accepts only `HTTPAuthorizationCredentials` via `Depends(security)` — no loose `token: str` param that would pollute OpenAPI docs
- `compute_balance_delta` validates `tx_type` — raises `ValueError` for anything other than "debit" or "credit"
- JWT verification uses dedicated `SUPABASE_JWT_SECRET` setting (not the anon key)
- `TransferListItem.from_account/to_account` uses typed `TransferAccountSummary` model (id, name, currency)

### Review Issues Fixed (from Copilot + internal review)
1. ~~JWT secret uses `SUPABASE_ANON_KEY`~~ → Added `SUPABASE_JWT_SECRET` to Settings, .env.example, and CI
2. ~~`get_current_user` has a `token: str` parameter~~ → Removed; tests use `HTTPAuthorizationCredentials` directly
3. ~~`compute_balance_delta` doesn't validate `tx_type`~~ → Added `ValueError` for unknown types
4. ~~`TransferListItem` uses bare `dict`~~ → Added `TransferAccountSummary` typed model
5. ~~`uuid.UUID()` parse errors bubble as 500~~ → Catch `ValueError`/`TypeError` alongside `JWTError`
6. ~~pyright errors on `date` field shadowing~~ → Use `import datetime` + `datetime.date` pattern

### Remaining Notes (Not Blocking)
- Bare `except Exception` on `Settings()` silently falls back to empty JWT secret — works for tests but should fail loudly in production. Consider refining when deploying.
- `autouse=True` auth override applies to all tests — refine scoping when router tests are added in Units 1D-1E.

## Next Steps
- Merge PR #5 after review
- Unit 1D (Account Router) or Unit 1E (Transaction Router) can begin after merge
- The auth dependency overrides in conftest.py are ready for router tests
