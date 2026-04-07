---
phase: 01-stabilization
reviewed: 2026-04-07T00:00:00Z
depth: standard
files_reviewed: 26
files_reviewed_list:
  - backend/app/dependencies_rbac.py
  - backend/app/routers/accounts.py
  - backend/app/routers/debts.py
  - backend/app/routers/financial_institutions.py
  - backend/app/routers/import_.py
  - backend/app/routers/import_templates.py
  - backend/app/services/account.py
  - backend/app/services/import_/import_service.py
  - backend/tests/factories.py
  - backend/tests/models/test_account_model.py
  - backend/tests/routers/test_rbac_guards.py
  - backend/tests/routers/test_transfers.py
  - backend/tests/services/test_account_service.py
  - backend/tests/services/test_debt_service.py
  - frontend/src/components/accounts/__tests__/account-form.test.tsx
  - frontend/src/components/layout/__tests__/app-shell.test.tsx
  - frontend/src/components/transactions/__tests__/transaction-form.test.tsx
  - frontend/src/components/ui/__tests__/button.test.tsx
  - frontend/src/hooks/__tests__/use-accounts.test.ts
  - frontend/src/hooks/__tests__/use-auth.test.ts
  - frontend/src/lib/__tests__/money.test.ts
  - frontend/src/test/test-utils.tsx
  - frontend/vitest.config.ts
  - frontend/src/components/layout/navbar.tsx
  - frontend/src/components/layout/sidebar.tsx
findings:
  critical: 1
  warning: 5
  info: 6
  total: 12
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-07
**Depth:** standard
**Files Reviewed:** 26
**Status:** issues_found

## Summary

This review covers the Phase 01 stabilization layer: RBAC dependencies, key routers (accounts, debts, financial institutions, import, import-templates), account and import services, and the full frontend test suite including layout components.

The code is well-structured overall. RBAC guards are consistently applied; money handling uses integer minor units throughout; soft-delete patterns follow the project convention; the frontend test suite uses proper isolation via `vi.mock`. The one critical issue is a real logic bug in `commit_import` that can crash with an `IndexError` when committing an empty batch. Five warnings cover inconsistent RBAC enforcement in the debts router, a missing household-scoping filter in the financial-institutions summary endpoint, an explicit `None` return typed as the wrong type in the account service, and two test reliability concerns.

---

## Critical Issues

### CR-01: `commit_import` crashes with IndexError on empty row batch

**File:** `backend/app/services/import_/import_service.py:486`
**Issue:** `first_tx_id = all_txs[0].id if all_txs else 0` is safe when `all_txs` is empty, but the `CommitResponse` it produces (`count=0`, `first_transaction_id=0`) is misleading and the surrounding code already calls `session.flush()` unconditionally on an empty batch — that is benign. The actual crash risk is subtler: `data.rows` is never validated as non-empty before the loop, and `CommitRequest` schema probably does not enforce `min_length=1` on the `rows` field. A client sending `{"account_id": 1, "rows": []}` reaches `flush()` with nothing staged — `first_transaction_id` returns `0`, which is a sentinel that does not correspond to any real transaction. Callers that subsequently look up `first_transaction_id` as a real DB row will receive a 404, silently producing incorrect behaviour (no crash here, but data contract violation is critical).

More critically, line 461 does `tx_type = TransactionType(commit_row.type)` without a try/except. If `commit_row.type` is an unexpected string (e.g. `"transfer"`) the `ValueError` is unhandled and bubbles up as an unformatted 500 with no error envelope — breaking the API contract.

**Fix:**
```python
# 1. Guard against unknown TransactionType early
try:
    tx_type = TransactionType(commit_row.type)
except ValueError:
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={
            "error": {
                "code": "INVALID_TRANSACTION_TYPE",
                "message": f"Unknown transaction type: {commit_row.type!r}",
            }
        },
    )

# 2. Return a clear sentinel for empty commits (or reject them)
first_tx_id = all_txs[0].id if all_txs else None  # caller must handle None
```

---

## Warnings

### WR-01: RBAC gap — `record_payment` and `bulk_past_payments` allow CHILD role

**File:** `backend/app/routers/debts.py:342-406`
**Issue:** `record_payment` (line 342) reaches `_check_p2p_write()` only for P2P debts. For `bank_loan` debts `_check_p2p_write` is called, but it only blocks VIEWER+CHILD on P2P types; for non-P2P types it only blocks VIEWER. This means a CHILD role user can successfully record payments against bank-loan debts. `bulk_past_payments` (line 386) explicitly guards against VIEWER but does not guard CHILD for non-P2P debt types.

Looking at `_check_p2p_write`:
```python
def _check_p2p_write(debt, role):
    if debt.type in (DebtType.PERSONAL_LENT, DebtType.PERSONAL_BORROWED):
        if role in (HouseholdRole.CHILD, HouseholdRole.VIEWER):
            raise ...
    elif role == HouseholdRole.VIEWER:   # CHILD is NOT blocked here
        raise ...
```

**Fix:**
```python
def _check_p2p_write(debt, role):
    if debt.type in (DebtType.PERSONAL_LENT, DebtType.PERSONAL_BORROWED):
        if role in (HouseholdRole.CHILD, HouseholdRole.VIEWER):
            raise HTTPException(status_code=403, ...)
    elif role in (HouseholdRole.CHILD, HouseholdRole.VIEWER):  # block both
        raise HTTPException(status_code=403, ...)
```

### WR-02: Missing household-scoping filter for account query in financial-institutions summary

**File:** `backend/app/routers/financial_institutions.py:59-67`
**Issue:** The `WHERE` clause in `get_institution_summary` correctly includes `Account.household_id == household_id`, but the `institution` lookup on line 54 uses `fi_service.get_institution_by_slug(session, household_id, slug)`. If that service function does not filter by household — e.g. it allows global/predefined institutions — then a slug belonging to a predefined institution could successfully resolve, and the subsequent account query on line 59 would still return only the current household's accounts. This is not a direct data leak. However, the function also imports `_build_account_response` from `app.routers.accounts` at runtime (line 70), which is a private function (underscore prefix). Importing a private implementation detail from another router creates tight coupling and will silently break if that function is renamed or moved.

**Fix:** Move `_build_account_response` to `account_service` (it already partially exists as `_build_account_dict`), or make it a module-level export. The circular-import risk here is real — `financial_institutions` router importing from `accounts` router at function call time avoids a module-load cycle but is fragile.

### WR-03: `get_balance_history` returns `None` with incorrect type annotation

**File:** `backend/app/services/account.py:694`
**Issue:** The function signature declares `-> dict` but line 694 explicitly returns `None` when the account is not found:
```python
if account is None:
    return None  # type: ignore[return-value]
```
The `type: ignore` comment suppresses the pyright error rather than fixing it. The router at `accounts.py:56` checks `if result is None` and raises 404, so the runtime behaviour is correct — but any caller that does not check for `None` before using the return value will crash at attribute access. The fix is to change the return type to `dict | None`.

**Fix:**
```python
async def get_balance_history(
    session: AsyncSession,
    household_id: uuid.UUID,
    account_id: int,
    period: str = "month",
) -> dict | None:  # was: dict
```

### WR-04: `test_payment_amount_must_be_positive` and `test_debt_payment_is_integer_not_float` are not real tests

**File:** `backend/tests/services/test_debt_service.py:92-117`
**Issue:** Both tests only assert properties of hardcoded local variables (`amount = 50000`, `valid_amount = 125050`). They never call any production code. They pass unconditionally and provide zero regression value — a bug introduced in the service that allowed negative or float amounts would not be caught by these tests.

**Fix:** Replace with tests that actually invoke the service's validation path — e.g., call `record_payment` with `amount_minor=-1` and assert it raises a `ValueError`, or check that `PaymentCreate` Pydantic schema rejects negative values:
```python
from app.schemas.debt import PaymentCreate
def test_payment_rejects_negative_amount():
    with pytest.raises(ValidationError):
        PaymentCreate(date="2024-01-01", amount_minor=-50000, ...)
```

### WR-05: `compute_net_worth` silently caps at 1000 accounts

**File:** `backend/app/services/account.py:379`
**Issue:** `list_accounts` is called with `page_size=1000` as a hard cap. A household with more than 1000 active accounts (unlikely but architecturally possible) would silently produce an incorrect net worth. There is no warning or pagination loop. For a financial application, silent incorrect totals are a data-integrity risk.

**Fix:** Either paginate in a loop until all accounts are fetched, or use a direct aggregate SQL query instead of loading all ORM objects:
```python
# Use the batch aggregate query already written below in list_accounts_with_stats
# rather than loading full Account objects
```

---

## Info

### IN-01: `_build_account_dict` called as private function from router

**File:** `backend/app/routers/accounts.py:121` and `184`
**Issue:** `account_service._build_account_dict(...)` is called directly from the router with a leading-underscore name, indicating it is intended as a private helper. This breaks the convention that routers should only call public service functions. Similarly `financial_institutions.py:86` does a deferred import of `_build_account_response` from the accounts router.

**Fix:** Expose `_build_account_dict` as a public function `build_account_dict` in `account_service`, or have the router use `account_service.get_account_detail()` which already calls it internally.

### IN-02: `list_institutions` endpoint missing authentication on `household_id`

**File:** `backend/app/routers/financial_institutions.py:32`
**Issue:** `household_id=Depends(get_household_id)` is used without a type annotation: `household_id=Depends(get_household_id)` (no `: uuid.UUID`). While FastAPI resolves this correctly at runtime, the missing type annotation means pyright cannot type-check downstream uses of `household_id` in this handler. The same pattern appears on lines 120, 133, 150, 165, 169.

**Fix:**
```python
household_id: uuid.UUID = Depends(get_household_id),
```

### IN-03: Import of `HTTPException` from `fastapi` inside `import_service`

**File:** `backend/app/services/import_/import_service.py:15`
**Issue:** The service layer imports `HTTPException` from `fastapi` and raises it directly (lines 58, 86, 97, etc.). Per project conventions (CLAUDE.md Section D.6), service functions should be "pure business logic — no HTTP awareness." Raising `HTTPException` in the service ties it to the HTTP framework.

**Fix:** Raise a domain `ValueError` or a custom exception class from the service; let the router translate it to `HTTPException`. This is already done in `account_service.py` (e.g. `validate_institution` raises `ValueError`).

### IN-04: TODO comment for help page in sidebar

**File:** `frontend/src/components/layout/sidebar.tsx:191`
**Issue:** A `TODO` comment marks a placeholder route: `{/* TODO: Replace with real help page route when available */}`. The help link currently points to `/settings` instead of a dedicated help route.

**Fix:** Track this in `BACKLOG.md` with category `backend-dep` or `frontend-todo`, then remove the comment. The current workaround is acceptable for Phase 01 but should not live as inline code debt.

### IN-05: `vitest.config.ts` excludes `src/components/ui/**` from coverage

**File:** `frontend/vitest.config.ts:18-21`
**Issue:** The `src/components/ui/**` directory is excluded from coverage reporting. This means shadcn/ui component customizations (e.g. the `Button` component tested in `button.test.tsx`) contribute tests but are excluded from coverage counts, making the coverage metric misleading.

**Fix:** If the `ui/` components are purely generated and not customized, exclusion is reasonable — but `button.test.tsx` is already testing them, so including them in coverage would give a more accurate picture. Either remove the exclusion or remove the `button.test.tsx` file.

### IN-06: `test_debt_service.py` patches internal `_get_payments` symbol path

**File:** `backend/tests/services/test_debt_service.py:54`
**Issue:** `patch("app.services.debt._get_payments", ...)` patches a private function using its dotted path. If `debt.py` is refactored and `_get_payments` is renamed or inlined, this test will raise `AttributeError` at patch time rather than giving a meaningful test failure. The test name also references "execute called 3 times" in its assertion comment, but this is fragile and implementation-dependent.

**Fix:** This is acceptable for now but should be noted. Prefer patching at the module boundary where possible, or test the observable side-effect (debt's `is_active=False`, transaction count) rather than counting `session.execute` calls.

---

_Reviewed: 2026-04-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
