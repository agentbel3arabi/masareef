# Unit 1J: Integration Tests & CI Validation — Session Handoff

## What Was Done

Unit 1J added a full integration test suite (15 tests) covering all Phase 1 API endpoints, wired them into CI with a second job that uses real Supabase credentials, and fixed several pre-existing CI failures discovered during the process.

### Deliverables

**New test files (`backend/tests/integration/`)**:
- `__init__.py` — package marker
- `conftest.py` — session-scoped fixtures: Supabase Admin API creates a real test user, yields authenticated `api_client`, auto-cleans up user after session; `load_dotenv()` enables local runs; `clear_app_dependency_overrides` autouse fixture prevents unit-test SQLite/auth stubs from leaking into integration tests
- `test_accounts_api.py` — 6 tests: list, create, get, delete, 404, unauthenticated 401
- `test_transactions_api.py` — 4 tests: list, create, delete (soft-delete verified), filter (seeds data first)
- `test_transfers_api.py` — 2 tests: list, create
- `test_categories_api.py` — 3 tests: list (>=18 predefined), filter by type, bilingual names

**CI (`backend.yml`)**:
- Added `integration-tests` job gated on `needs: test`, injects 6 GitHub secrets
- Fixed `Run tests` step to add `--ignore=tests/integration` (unit-test job was collecting integration tests and failing with placeholder env vars)
- Fixed `SUPABASE_JWT_SECRET` env var name (was incorrectly set as `JWT_SECRET`)

**Infrastructure fixes**:
- `backend/pyproject.toml`: `asyncio_default_test_loop_scope = "session"` — prevents event loop mismatch when session-scoped async fixtures are used with function-scoped tests
- `backend/app/database.py`: `NullPool` when `APP_ENV=testing` — prevents asyncpg connection pool contamination between tests
- `backend/app/dependencies.py`: added `# type: ignore[return-value]` on `_jwks_cache` return (pre-existing pyright error)
- `backend/tests/schemas/test_transaction_schema.py`: added `description` field to `TransactionCreate` call (broke when `description` was made required)
- `backend/tests/routers/test_transactions.py`: changed `balance_minor` to `displayed_balance_minor` in 2 tests (broke when balance computation moved to dynamic)

**GitHub secrets** (set via `gh secret set`):
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_DATABASE_URL`, `JWT_SECRET` — all set from `backend/.env`

### Key Decisions

- **`NullPool` in testing** — asyncpg connection pool contamination across tests is a known issue; `NullPool` gives each request a fresh connection with no pooling, solving inter-test interference without modifying production behavior
- **`asyncio_default_test_loop_scope = "session"`** — required for session-scoped async fixtures (`api_client`, `test_auth_token`) to be accessible from function-scoped tests without "attached to a different loop" errors
- **`clear_app_dependency_overrides` autouse fixture** — unit tests use `autouse=True` to override auth with a mock user; without this fixture, integration tests would silently bypass real auth and return 200 for unauthenticated requests
- **`load_dotenv()` at module import** — enables local integration test runs with just `APP_ENV=testing uv run pytest tests/integration/ -v` without manually sourcing `.env`
- **Test user `.invalid` TLD** — uses `@masareef-test.invalid` (RFC 2606) to prevent accidental email delivery

### Known Gaps (Not Blocking)

- **Node.js 20 deprecation warning** — the `integration-tests` job uses `actions/checkout@v4`, `setup-python@v5`, `setup-uv@v3` (older versions than the `test` job). These emit a deprecation warning but work fine until Sept 2026. Can be upgraded to match `test` job versions in a chore PR.
- **No PATCH/UPDATE endpoint tests** — accounts/transactions don't have update endpoints yet (future phase), so no tests for those
- **No cross-household isolation tests** — RLS enforcement is tested implicitly by household provisioning, but no explicit "user A cannot see user B's data" test yet

## PRs Merged

- **PR #14** — Integration Tests & CI (`feature/unit-1J-integration-tests`) — merged ✅
- **PR #15** — UAT bug fixes (`fix/unit-1J-uat-findings`) — merged ✅

## UAT Findings & Fixes (PR #15)

Phase 1 UAT uncovered 5 issues, all fixed and merged:

1. **Category shows "uncategorized"** — `Transaction` model was missing a SQLAlchemy `relationship` to `Category`. Added `lazy="selectin"` relationship and `CategoryEmbedded` to `_tx_to_response()`. Also fixed transfer auto-categorization (backend was assigning the "Transfer" category but it was never surfaced in the response).
2. **No delete/edit on transactions** — Added `useUpdateTransaction()` hook, delete confirmation dialog, and edit dialog with pre-filled form to `transaction-row.tsx`.
3. **financing_app not differentiated from bank account** — Extended credit limit display guard to `type === "credit_card" || type === "financing_app"` in `account-card.tsx`.
4. **No delete on transfers** — Added `useDeleteTransfer()` hook and delete confirmation dialog to the transfers table.
5. **Edit form amount pre-fill bug** — `formatAmount()` was used as the initial input value (returns `"1,250.00 EGP"`, incompatible with `<input type="number">`). Fixed to use `(abs / 10^exponent).toFixed(exponent)`.

## Local Integration Test Run

```bash
cd backend
APP_ENV=testing uv run pytest tests/integration/ -v --tb=short
# 15 passed in ~35s
```

## State at Handoff

- main branch: commit `fix: UAT findings — category display, delete/edit actions, account type differentiation (#15)`
- 110 unit tests passing, 15 integration tests passing, CI ✅
- Servers running: backend :8000, frontend :3000

## Next Steps

- Phase 1 fully complete and UAT-verified
- Next: Phase 2 planning (import pipeline, AI categorization, debts/installments per roadmap)
