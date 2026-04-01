# Session Handoff Note — Phase 3, Unit 3B: P2P Debts

**Date:** 2025-07-18
**PR:** TBD
**Branch:** `feature/phase-3b-p2p-debts`

---

## 1. What Was Completed

Extended debt system from bank-loan-only to P2P debts (personal_lent, personal_borrowed) with 3 repayment modes, split schedules, payment recording, and person balance computation.

**New files:**
- `backend/tests/schemas/test_debt_schemas.py` — 5 P2P schema validation tests
- `backend/tests/services/test_p2p_splits.py` — 5 split generation unit tests
- `backend/tests/routers/test_p2p_debts.py` — 17 integration tests (creation, splits, payments, balances, filtering)
- `backend/tests/services/test_person_balances.py` — 6 person balance computation tests

**Modified files:**
- `backend/app/schemas/debt.py` — Widened `DebtCreate.type` to include P2P types, added `SplitInput`, `P2PDebtSplitResponse`, `split_count`, `splits` fields
- `backend/app/services/debt.py` — Added `generate_equal_splits()`, `generate_lump_sum_split()`, `create_p2p_debt()`, `get_splits()`; extended `record_payment` for P2P with split-marking
- `backend/app/routers/debts.py` — Wired P2P creation, added `GET /{debt_id}/splits` endpoint
- `backend/app/schemas/person.py` — Added `CurrencyBalance`, `PersonBalances` schemas; added `balances` field to `PersonResponse`
- `backend/app/services/person.py` — Added `compute_person_balances()` with two aggregation queries (debts + payments grouped by currency)
- `backend/app/routers/persons.py` — Made `_person_to_response` async, wired balance computation into all person endpoints
- `backend/pyproject.toml` + `backend/uv.lock` — Added `python-dateutil` dependency

---

## 2. Key Decisions & Rationale

- **Cross-field validation in service, not schema** — P2P-specific validations (person_id required, repayment mode constraints, splits sum check) happen in `create_p2p_debt` service, not Pydantic validators. Keeps schema reusable across debt types.
- **Splits are scheduling aids, not payment constraints** — A split marked "paid" is a scheduling marker. Actual debt payoff tracked by total principal paid vs total principal. Payment amounts don't need to match split amounts exactly.
- **Sequential balance queries (N+1)** — `list_persons` calls `compute_person_balances` per person. Acceptable for now since households have <20 persons typically. A bulk query optimization can be added later.
- **repayment_mode as `str | None`** — Invalid strings caught via `RepaymentMode(mode)` → ValueError → 422. `None` creates debt without schedule (informal P2P debts).
- **Due-today = upcoming, not overdue** — Final review caught `<=` vs `<` bug. Fixed: splits due today are "upcoming", only past-due splits are "overdue".

---

## 3. Known Gaps / Deferred

- ~~**N+1 query in list_persons**~~ — Fixed: `compute_persons_balances_bulk()` uses 2 queries for all persons.
- ~~**repayment_mode None validation**~~ — Fixed: P2P debts now require a valid repayment_mode.
- **Partial payment tracking on splits** — Splits can only be "paid" or "unpaid" (boolean). No partial payment tracking. Adequate for MVP; may need `paid_amount` field later.
- **No P2P notification on payment** — No notification sent when a P2P payment is recorded. Target: Phase 4 (notifications).
- **No P2P debt edit** — Editing P2P debt fields (person, repayment mode, splits) not implemented. Only bank_loan edit exists. Target: future phase.

---

## 4. What's Next

- Next unit: Phase 3C or Phase 4 per roadmap
- First thing to do: Read `docs/05-roadmap.md` for next phase scope
- The P2P debt foundation is complete — future phases can build on it (notifications, reports, forecasting)

---

## 5. PRs Merged

- **PR TBD** — Phase 3B: P2P Debts — pending

---

## 6. Test Status

- Unit tests: 327 passed, 0 failed (excluding integration tests requiring Supabase)
- Integration tests: 3 failed, 2 errors (pre-existing — require real Supabase credentials)
- New Phase 3B tests: 33 tests, all passing
- Lint: ruff check clean
- Format: ruff format clean
- Type check: pyright 0 errors

---

## 7. Notes / Surprises

- Plan had counting errors (said "15 tests" for Task 4 but defined 14, said "7 tests" for Task 5 but defined 6). Implementations match actual test definitions.
- Code quality reviewers repeatedly flagged Pydantic-validated fields as unvalidated (false positives). Pydantic rejects invalid input before it reaches the service layer.
- The `has_active_debts` check in person delete now catches P2P debts too, which is correct behavior.
