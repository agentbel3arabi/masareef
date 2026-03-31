# Backend Code Review Report

## Summary

The backend codebase is well-structured overall: routers are thin and delegate to service functions, Pydantic V2 `model_dump()` is used consistently, soft-delete is implemented across all user-facing tables, all routes are correctly prefixed with `/api/v1/`, and household scoping is applied throughout. Money values are stored as integer minor units with no float leakage into the DB layer.

However, the audit surfaced **2 critical issues** (one blocking the event loop in the auth path, one using float arithmetic for money), **11 warnings** (schema type safety gaps, a router that contains business logic, inconsistent comparisons, and N+1 query patterns), and **7 suggestions** (further N+1 fixes, minor refactoring opportunities, and formatting hygiene).

---

## Findings

### Critical

- **`app/dependencies.py:40`** — `_fetch_jwks()` calls `httpx.get()` (a synchronous blocking call) from within the async request lifecycle. When the JWKS cache is cold or stale, this blocks the entire asyncio event loop for the duration of the HTTP round-trip to Supabase, degrading all concurrent requests to a standstill.
  **Recommendation:** Replace with `httpx.AsyncClient` and make `_fetch_jwks` an `async def`, or use `anyio.to_thread.run_sync` as a short-term workaround.

- **`app/services/transfer.py:50`** — FX target-amount calculation uses Python float division: `round(source_amount * data.fx_rate_minor_units / 10000)`. The `/` operator produces a `float` intermediate, which may introduce floating-point rounding errors for large transfer amounts (e.g. multi-million EGP transfers with a scaled rate).
  **Recommendation:** Use integer arithmetic: `(source_amount * data.fx_rate_minor_units + 5000) // 10000` (or plain `//` with a documented rounding policy) so no floating-point values are ever produced.

---

### Warning

- **`app/schemas/account.py:8`** — `type: str` in `AccountCreate` accepts any arbitrary string instead of being constrained to valid `AccountType` values (`bank_account`, `credit_card`, etc.). Invalid account types silently pass through Pydantic validation and reach the database layer.
  **Recommendation:** Change to `type: AccountType` (importing `AccountType` from `app.models.enums`) so Pydantic rejects invalid values at the boundary.

- **`app/schemas/transaction.py:11,24`** — `type: str` in both `TransactionCreate` and `TransactionUpdate` is unconstrained. Any string passes validation and is forwarded to `compute_balance_delta`, which raises an unhandled `ValueError` internally if the value is neither `"debit"` nor `"credit"`. The `ValueError` is caught in the router and returns a generic `VALIDATION_ERROR`, but the root cause should be validated at schema level.
  **Recommendation:** Change to `type: TransactionType` (or `Literal["debit", "credit"]`) in both schemas.

- **`app/schemas/category.py:9`** — `type: str` in `CategoryCreate` accepts any string. An invalid type (e.g. `"foo"`) passes schema validation, reaches the DB, and causes a silent column comparison against a non-existent enum value.
  **Recommendation:** Change to `type: CategoryType`.

- **`app/schemas/transaction.py:13`** — The `currency` field in `TransactionCreate` is accepted by the API but silently ignored in `transaction_service.create_transaction` (the account's currency is used instead, line 43). This makes the API contract misleading: callers believe they can specify the currency, but it has no effect.
  **Recommendation:** Remove the `currency` field from `TransactionCreate` entirely, or explicitly document and enforce that the value must match the account's currency.

- **`app/routers/households.py`** — Both `get_household_status` and `create_household` contain direct SQLAlchemy queries, ORM model instantiation, and session `flush` calls inside the router functions. This violates the project convention that routers must contain no business logic (all logic must live in service functions).
  **Recommendation:** Extract the DB logic into a new `app/services/household.py` service module and call it from the router.

- **`app/routers/households.py:17-19`** — `HouseholdCreate` is defined inline in the router file rather than in a dedicated schema module. This breaks the `schemas/` convention and makes the schema untestable in isolation.
  **Recommendation:** Move `HouseholdCreate` (and add `HouseholdResponse`) to a new `app/schemas/household.py` file.

- **`app/services/account.py:30`** — `Account.is_active == True` uses `==` for a boolean comparison instead of `Account.is_active.is_(True)`, which is the pattern used everywhere else in the codebase (lines 23, 48, 110). The `# noqa: E712` comment suppresses the linter warning rather than fixing the root cause. SQLAlchemy treats `== True` and `.is_(True)` differently in some edge cases (e.g. nullable columns).
  **Recommendation:** Replace with `Account.is_active.is_(True)` and remove the `noqa` comment.

- **`app/services/account.py:133`** — `from app.models.household import Household` is placed inside the function body of `compute_net_worth` to avoid a circular import. Deferred imports are a code smell that indicates a structural coupling problem.
  **Recommendation:** Move the import to the top of the file; if this causes a circular import, refactor the model imports to break the cycle (e.g., use `TYPE_CHECKING` guards or move the household base-currency lookup to the router layer).

- **`app/services/transaction.py:253-260` and `294-303`** — Both `bulk_delete` and `bulk_categorize` iterate over each transaction ID in a Python loop, issuing one SELECT + one UPDATE per transaction (N+1 query pattern). For bulk operations on hundreds of transactions this is significantly slower than a single `UPDATE … WHERE id IN (…)`.
  **Recommendation:** Replace the loops with single bulk-UPDATE statements using SQLAlchemy's `update()` construct with `WHERE Transaction.id.in_(ids)`.

- **`app/schemas/exchange_rate.py:29`** — `rate: float` in `ManualRateRequest` accepts a floating-point number directly from users. Although the backend converts it to an integer `rate_scaled` before persisting, accepting a `float` at the API boundary violates the "no floats for money" convention and makes the conversion lossy for inputs with many decimal places.
  **Recommendation:** Accept `rate_scaled: int` directly (removing the float input field), or at minimum document the precision limitation and add a validator that rejects values outside a safe range.

---

### Suggestion

- **`app/services/account.py:120-147`** — `compute_net_worth` calls `compute_displayed_balance` in a `for` loop, issuing one aggregate DB query per account. For households with many accounts this is an N+1 query pattern.
  **Recommendation:** Refactor to a single SQL query that sums all active transaction amounts grouped by account, then compute per-account displayed balances in Python.

- **`app/services/transfer.py:199-253`** — `list_transfers` executes N+1 queries per page: for each debit leg it issues a separate SELECT for the credit leg plus two `session.get` calls for the from/to accounts. On a page of 50 transfers this means up to 150 extra round-trips.
  **Recommendation:** Rewrite using a JOIN (or a single IN-based query) to fetch credit legs and accounts in bulk.

- **`app/dependencies.py:28-29,35-44`** — `_jwks_cache` and `_jwks_cache_time` are module-level globals mutated in `_fetch_jwks` without a threading lock. While asyncio is single-threaded by default, a uvicorn multi-worker deployment (e.g. `--workers 4`) spawns separate processes that each maintain their own cache, which is expected; however, the `global` mutation pattern is fragile if the app is ever run with threaded workers.
  **Recommendation:** Encapsulate the cache state in a class or a `functools.lru_cache`-style helper; consider adding an `asyncio.Lock` if migrating to async (see Critical finding above).

- **`app/services/money.py:14`** — `format_amount` computes `major = amount_minor / divisor` using Python's float division. For display this is safe for typical financial amounts, but for very large balances (e.g. hundreds of millions of minor units) floating-point representation may produce display artifacts (e.g. `1,000,000.00` rendered as `999,999.9999999...`).
  **Recommendation:** Use `decimal.Decimal` for the intermediate calculation: `major = Decimal(amount_minor) / Decimal(divisor)`, then format with `f"{major:,.{exponent}f}"`.

- **`app/schemas/transaction.py:11`** — `TransactionCreate.amount_minor: int` has no positivity constraint, whereas `SplitItem.amount_minor: int = Field(gt=0)` does enforce it. The service layer uses `abs()` in `compute_balance_delta` so behaviour is correct for negative inputs, but the inconsistency is confusing and a source of future bugs if `abs()` is ever removed.
  **Recommendation:** Add `amount_minor: int = Field(gt=0)` to `TransactionCreate` (and `TransactionUpdate`) to match `SplitItem` and make the invariant explicit.

- **`app/routers/categories.py:21`** — The `type` query parameter is `str | None` with no enum validation. Any string passes through to `category_service.list_categories` where it is used directly in a SQLAlchemy `WHERE type == ?` filter. While this is not a SQL injection risk (parameterized), an invalid value returns an empty list with no error, which is silently confusing.
  **Recommendation:** Change to `type: CategoryType | None = None` (or use a `Query(enum=CategoryType)`) so FastAPI validates and documents the accepted values.

- **`app/main.py:12-16`** — The module-level `try/except Exception` swallows all errors when loading `Settings` at startup, silently falling back to `["http://localhost:3000"]` for CORS origins. A misconfigured `CORS_ORIGINS` env var in production would not surface as an error, leading to hard-to-diagnose CORS rejections.
  **Recommendation:** Log the exception (e.g. `logging.warning("Settings failed to load: %s", e)`) so the fallback is visible in server logs.
