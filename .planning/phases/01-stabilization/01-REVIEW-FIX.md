---
phase: 01-stabilization
fixed_at: 2026-04-07T00:00:00Z
review_path: .planning/phases/01-stabilization/01-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-04-07
**Source review:** .planning/phases/01-stabilization/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: `commit_import` crashes with unhandled ValueError on unknown TransactionType

**Files modified:** `backend/app/services/import_/import_service.py`
**Commit:** 42140a7
**Applied fix:** Wrapped `TransactionType(commit_row.type)` in a try/except block that raises a properly formatted `HTTPException` with status 422 and an `INVALID_TRANSACTION_TYPE` error code when an unknown transaction type string is provided. This prevents unhandled `ValueError` from bubbling up as an unformatted 500 error.

### WR-01: RBAC gap -- `_check_p2p_write` allows CHILD role for non-P2P debts

**Files modified:** `backend/app/routers/debts.py`
**Commit:** 98778c1
**Applied fix:** Changed the `elif` branch in `_check_p2p_write` to block both `CHILD` and `VIEWER` roles for non-P2P debt mutations (was only blocking `VIEWER`). Updated the docstring to reflect the corrected behavior. This closes the RBAC gap where a CHILD user could record payments against bank-loan debts.

### WR-02: Private function import coupling -- financial_institutions imports non-existent `_build_account_response`

**Files modified:** `backend/app/routers/financial_institutions.py`
**Commit:** 7bf9c28
**Applied fix:** Removed the broken deferred import of `_build_account_response` from `app.routers.accounts` (which does not exist and would crash at runtime). Replaced the `await _build_account_response(session, acct, displayed)` call with the synchronous `account_service._build_account_dict(acct, displayed)`, which is the actual function used by the accounts router. This eliminates the cross-router coupling and fixes a runtime ImportError.

### WR-03: `get_balance_history` returns None with incorrect type annotation

**Files modified:** `backend/app/services/account.py`
**Commit:** 4d02f2c
**Applied fix:** Changed return type annotation from `-> dict` to `-> dict | None` and removed the `# type: ignore[return-value]` suppression comment on the `return None` line. The function legitimately returns `None` when the account is not found, and the type signature now reflects this.

### WR-04: `test_payment_amount_must_be_positive` and `test_debt_payment_is_integer_not_float` are not real tests

**Files modified:** `backend/tests/services/test_debt_service.py`
**Commit:** 2ff1590
**Applied fix:** Replaced both no-op tests (which only asserted properties of hardcoded local variables) with real tests that validate against the `PaymentCreate` Pydantic schema. The new `test_payment_amount_must_be_positive` verifies that negative and zero `amount_minor` values raise `ValidationError` (testing the `Field(gt=0)` constraint). The new `test_debt_payment_is_integer_not_float` verifies that float values are rejected by the schema.

### WR-05: `compute_net_worth` silently caps at 1000 accounts

**Files modified:** `backend/app/services/account.py`
**Commit:** a582326
**Applied fix:** Replaced the `list_accounts(session, household_id, page=1, page_size=1000)` call with a direct SQLAlchemy query that fetches all active accounts for the household without any pagination limit. This eliminates the silent 1000-account cap that could produce incorrect net worth calculations for large households.

---

_Fixed: 2026-04-07_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
