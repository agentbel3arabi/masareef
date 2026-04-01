# Phase 3A Handoff — Bank Loan Foundation

**Date:** 2026-04-02  
**Phase:** 3A — Debt/Loan Foundation (Bank Loans)  
**Status:** ✅ COMPLETE — CI passing, all 282 tests pass

---

## What Was Built

Complete backend foundation for debt/loan tracking, scoped to bank loans (Phase 3B adds P2P types).

### Commits (oldest → newest)

| SHA | Description |
|-----|-------------|
| `6a92610` | 6 Phase 3 enums |
| `6a92610` | 5 SQLAlchemy models |
| `2759bdf` | Alembic migration (005) |
| `4b62947` | Amortization engine |
| `036da43` | Debt + Person Pydantic schemas |
| `af2982a` | Persons CRUD (router, service, schemas) |
| `542ae4e` | Fix: code quality findings (Literal types, Field constraints) |
| `e9aebaf` | Fix: DebtResponse.status Literal values |
| `3695688` | Debt service (15 functions) |
| `4989355` | Fix: record_payment overpayment + PAID_OFF bugs for interest-bearing loans |
| `e7f5d94` | Debts router (10 endpoints, 16 integration tests) |
| `c2ad718` | Fix: compute_debt_totals redundant DB query → NoResultFound risk |
| `606674d` | Fix: _principal_paid pyright narrowing |
| `bc15fbb` | Fix: DebtPayment.date shadows `date` import (pyright) |

### Files Created

- `backend/app/models/enums.py` — 6 new enums added: `DebtType`, `DebtStatus`, `InstallmentType`, `LifecycleStatus`, `PersonRelationship`, `RepaymentMode`
- `backend/app/models/person.py`, `debt.py`, `debt_payment.py`, `p2p_debt_split.py`, `installment_plan.py`
- `backend/alembic/versions/005_create_phase3_tables.py`
- `backend/app/services/amortization.py`
- `backend/app/schemas/person.py`, `schemas/debt.py`
- `backend/app/services/person.py`, `services/debt.py`
- `backend/app/routers/persons.py`, `routers/debts.py`
- `backend/tests/models/test_debt_models.py`
- `backend/tests/services/test_amortization.py`
- `backend/tests/routers/test_persons.py`, `tests/routers/test_debts.py`

---

## Key Decisions & Non-Obvious Choices

### 1. `DebtStatus` has only 2 values
`ACTIVE="active"` and `PAID_OFF="paid_off"`. There is no "settled" or "overdue" at the DB level. "paid", "overdue", "upcoming" are only computed schedule row statuses from the amortization engine — never stored.

### 2. `record_payment` uses `_principal_paid()` not `_total_paid()` for remaining check
**Why:** For interest-bearing loans, `amount_minor` per payment includes both principal and interest. If you compare cumulative `amount_minor` against `principal_minor`, the check fires prematurely on month ~11 of a 12-month loan. Using `sum(principal_minor)` from `debt_payments` gives the true outstanding principal balance.

Two guards:
- `remaining_principal <= 0` → reject (loan fully paid)
- `annual_rate_bps == 0 and amount_minor > remaining_principal` → reject (0% loans: every payment is pure principal)

### 3. `compute_debt_totals(session, debt_id, principal_minor)` takes `principal_minor` as param
**Why:** All 4 router callers already have the `Debt` object loaded (from `get_debt()`). Passing `principal_minor` directly eliminates a redundant SELECT and removes the `scalar_one()` → `NoResultFound` → 500 risk on concurrent soft-deletes.

### 4. Schedule row lookup in `record_payment` passes `payments=[]`
This is intentional — we want the theoretical split (what fraction of a canonical installment is interest) without contamination from recorded payment history. When `payments=[]`, all rows show `status != "paid"`, so the old `row["status"] != "paid"` filter was wrong (it would always match). Now we just match on calendar month/year.

### 5. `DebtPayment.date` uses `dt_date` alias
`from datetime import date as dt_date` — the column is named `date` which would shadow the import in Pyright's type checker. Alias fixes 2 CI pyright errors.

### 6. Enum column pattern: `create_type=False`
All SQLAlchemy enum columns use `SAEnum(EnumClass, values_callable=lambda e: [x.value for x in e], create_type=False)`. The `create_type=False` is critical — Postgres enum types are created manually in the Alembic migration, not by SQLAlchemy DDL. SQLite tests work fine since they use `VARCHAR`.

---

## Current Test Baseline

- **Unit tests (non-integration):** 282 pass, 2 deprecation warnings (FastAPI HTTP_422 rename — benign)
- **Integration tests:** 3 pre-existing failures + 2 errors (asyncpg pool cleanup in `test_transactions_api.py` and `test_transfers_api.py` — unrelated to Phase 3A)
- **Pyright:** 0 errors
- **Ruff:** clean

---

## Gaps & Known Limitations (Phase 3B)

1. **`DebtCreate.type = Literal["bank_loan"]`** — only bank_loan supported. Phase 3B adds P2P types: `personal_lent`, `personal_borrowed`; this Literal must expand to a Union.

2. **`get_match_suggestions`** — returns empty list if `debt.linked_account_id` is None. No endpoint to link/unlink account after creation other than `PUT /api/v1/debts/{id}`.

3. **`_validate_linked_account`** — only validates `BANK_ACCOUNT` type for bank loans. P2P debts don't require a linked account at all.

4. **No `DELETE` guard on debts with payments** — currently any debt can be soft-deleted even if it has recorded payments. Phase 3B may want to warn or block.

5. **`mark_paid` has no guard** — can mark an already-paid debt as paid again (idempotent, harmless).

6. **`ScheduleRow.status`** — the `Literal["paid", "overdue", "upcoming"]` in the schema matches the amortization engine's output, but the engine's "paid" detection is approximate (matches by calendar month only, not by payment `payment_number`).

---

## What's Next (Phase 3B)

- P2P debt types: `personal_lent`, `personal_borrowed` (Person-linked debts)
- `P2PDebtSplit` model population
- Debt reminders / notification triggers
- Frontend: `/debts` page, debt detail, amortization table, payment recording
