# Review Findings Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 6 confirmed issues surfaced by code reviews of PR #37 and PR #38 — all on branch `feature/2a-import-backend`.

**Architecture:** Targeted surgical fixes — no refactoring, no scope creep. Two backend schemas need validators added, one frontend component needs a dead import removed, one amount parser has a threshold bug, one stub comment is misleading, and one test sends a value that will violate the new schema constraint.

**Tech Stack:** Python 3.12 / FastAPI / Pydantic V2 (backend), Next.js / TypeScript (frontend), pytest / pytest-asyncio (tests)

---

## File Map

| File | Change |
|------|--------|
| `backend/app/schemas/transaction.py` | Add `Field(gt=0)` to `TransactionUpdate.amount_minor` |
| `backend/app/schemas/import_.py` | Add `Field(gt=0)` to `CommitRow.amount_minor` |
| `backend/tests/routers/test_import_.py` | Fix test to send positive amount (125000 not -125000) |
| `backend/tests/unit/test_transfer_service.py` | Fix wrong comment on line 33 |
| `backend/app/services/import_/amount_parser.py` | Fix comma-decimal threshold for 3-decimal currencies |
| `backend/app/services/import_/import_service.py` | Fix misleading background_tasks comment |
| `frontend/src/components/accounts/account-card.tsx` | Remove unused `Wallet` import |

---

## Task 1 — Fix `TransactionUpdate.amount_minor` missing `gt=0`

**Files:**
- Modify: `backend/app/schemas/transaction.py:21-25`

The `TransactionCreate.amount_minor` has `Field(gt=0)` (line 13). `TransactionUpdate` allows `None` (partial update) but must still enforce positive when provided.

- [ ] **Step 1: Verify the missing validator**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/backend
grep -n "amount_minor" app/schemas/transaction.py
```

Expected output includes `amount_minor: int | None = None` on the `TransactionUpdate` class with no Field constraint.

- [ ] **Step 2: Write failing test**

Add to `backend/tests/unit/test_schemas.py`:

```python
def test_transaction_update_rejects_zero_amount():
    from app.schemas.transaction import TransactionUpdate

    with pytest.raises(ValidationError):
        TransactionUpdate(amount_minor=0)


def test_transaction_update_rejects_negative_amount():
    from app.schemas.transaction import TransactionUpdate

    with pytest.raises(ValidationError):
        TransactionUpdate(amount_minor=-100)


def test_transaction_update_accepts_none_amount():
    from app.schemas.transaction import TransactionUpdate

    obj = TransactionUpdate(amount_minor=None)
    assert obj.amount_minor is None


def test_transaction_update_accepts_positive_amount():
    from app.schemas.transaction import TransactionUpdate

    obj = TransactionUpdate(amount_minor=1000)
    assert obj.amount_minor == 1000
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/backend
uv run pytest tests/unit/test_schemas.py::test_transaction_update_rejects_zero_amount -v
```

Expected: FAIL — `TransactionUpdate(amount_minor=0)` does not raise.

- [ ] **Step 4: Apply fix**

In `backend/app/schemas/transaction.py`, change line 24:

```python
# Before:
amount_minor: int | None = None

# After:
amount_minor: int | None = Field(default=None, gt=0)
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/backend
uv run pytest tests/unit/test_schemas.py -v
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef
git add backend/app/schemas/transaction.py backend/tests/unit/test_schemas.py
git commit -m "fix(schemas): add gt=0 to TransactionUpdate.amount_minor"
```

---

## Task 2 — Fix `CommitRow.amount_minor` missing `gt=0` + fix test

**Files:**
- Modify: `backend/app/schemas/import_.py:53`
- Modify: `backend/tests/routers/test_import_.py:119`

`CommitRow` represents an API input row — the client must always send a positive integer; the service re-signs it based on `type`. The existing router test sends `-125000` (violates the new constraint) and must be updated to `125000`.

- [ ] **Step 1: Verify the current state**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/backend
grep -n "amount_minor" app/schemas/import_.py
grep -n "amount_minor" tests/routers/test_import_.py
```

Expected: `amount_minor: int` (no Field) in schema, and `-125000` in the test.

- [ ] **Step 2: Apply schema fix**

In `backend/app/schemas/import_.py`, change line 53:

```python
# Before:
amount_minor: int

# After:
amount_minor: int = Field(gt=0)
```

- [ ] **Step 3: Fix the test**

In `backend/tests/routers/test_import_.py` line 119, change:

```python
# Before:
"amount_minor": -125000,

# After:
"amount_minor": 125000,
```

The assertion on line 140 stays the same — the service stores `-125000` (it calls `-abs(commit_row.amount_minor)` for debits), so the stored value is still `-125000`.

- [ ] **Step 4: Run the router tests**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/backend
uv run pytest tests/routers/test_import_.py -v
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef
git add backend/app/schemas/import_.py backend/tests/routers/test_import_.py
git commit -m "fix(import): add gt=0 to CommitRow.amount_minor, fix test amount sign"
```

---

## Task 3 — Fix wrong EGP amount comment in transfer service test

**Files:**
- Modify: `backend/tests/unit/test_transfer_service.py:33`

`100_000_000_00` = 10,000,000,000 minor units = **100,000,000.00 EGP** (100 million). The comment incorrectly says "1,000,000,000.00 EGP (1 billion)".

- [ ] **Step 1: Apply fix**

In `backend/tests/unit/test_transfer_service.py`, change line 33:

```python
# Before:
source = 100_000_000_00  # 1,000,000,000.00 EGP (1 billion)

# After:
source = 100_000_000_00  # 100,000,000.00 EGP
```

- [ ] **Step 2: Verify tests still pass**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/backend
uv run pytest tests/unit/test_transfer_service.py -v
```

Expected: all pass (comment-only change).

- [ ] **Step 3: Commit**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef
git add backend/tests/unit/test_transfer_service.py
git commit -m "fix(tests): correct EGP amount comment in test_transfer_service"
```

---

## Task 4 — Fix KWD comma-decimal threshold in amount_parser

**Files:**
- Modify: `backend/app/services/import_/amount_parser.py:57`
- Modify: `backend/tests/unit/test_amount_parser.py` (add test)

The check `len(parts[1]) <= 2` treats `"1,250"` (KWD: 1.250 KWD) as a thousands separator instead of a decimal separator, producing 1,250 KWD instead of the correct 1.250 KWD — a 1000x error. The fix is `<= currency_exponent`.

- [ ] **Step 1: Locate the test file**

```bash
ls /mnt/d/1-Study/In-progress/saas_ideas/masareef/backend/tests/unit/test_amount_parser.py
```

- [ ] **Step 2: Write failing test**

In `backend/tests/unit/test_amount_parser.py`, add:

```python
def test_kwd_comma_decimal_not_treated_as_thousands():
    """1,250 with KWD exponent=3 should parse as 1.250 KWD = 1250 fils, not 1250 KWD."""
    from app.services.import_.amount_parser import parse_amount_to_minor

    result = parse_amount_to_minor("1,250", currency_exponent=3)
    assert result == 1250  # 1.250 KWD = 1250 fils


def test_kwd_thousands_still_works():
    """1,250,000 with KWD should still be treated as thousands separator."""
    from app.services.import_.amount_parser import parse_amount_to_minor

    result = parse_amount_to_minor("1,250,000", currency_exponent=3)
    assert result == 1_250_000_000  # 1,250,000.000 KWD = 1,250,000,000 fils
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/backend
uv run pytest tests/unit/test_amount_parser.py::test_kwd_comma_decimal_not_treated_as_thousands -v
```

Expected: FAIL — current code returns 1,250,000 instead of 1,250.

- [ ] **Step 4: Apply fix**

In `backend/app/services/import_/amount_parser.py`, change line 57:

```python
# Before:
if len(parts) == 2 and len(parts[1]) <= 2:

# After:
if len(parts) == 2 and len(parts[1]) <= currency_exponent:
```

- [ ] **Step 5: Run all amount parser tests**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/backend
uv run pytest tests/unit/test_amount_parser.py -v
```

Expected: all pass, including the new KWD tests.

- [ ] **Step 6: Commit**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef
git add backend/app/services/import_/amount_parser.py backend/tests/unit/test_amount_parser.py
git commit -m "fix(import): fix comma-decimal threshold for 3-decimal currencies (KWD)"
```

---

## Task 5 — Fix misleading background_tasks stub comment

**Files:**
- Modify: `backend/app/services/import_/import_service.py:314-315`

The commented-out line `background_tasks.add_task(...)` references `background_tasks`, which is not a parameter of `commit_import`. Uncommenting it as-is would raise `NameError`. The comment must document what's actually needed.

- [ ] **Step 1: Apply fix**

In `backend/app/services/import_/import_service.py`, change lines 314-315:

```python
# Before:
    # AI categorization stub — Phase 9 implements this
    # background_tasks.add_task(ai_categorize_batch, str(batch_id))

# After:
    # AI categorization stub — Phase 9 implements this.
    # Before activating: add `background_tasks: BackgroundTasks` to this function's
    # signature and plumb it through the router call site.
    # background_tasks.add_task(ai_categorize_batch, str(batch_id))
```

- [ ] **Step 2: Verify no tests break**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/backend
uv run pytest tests/routers/test_import_.py -v
```

Expected: all pass (comment-only change).

- [ ] **Step 3: Commit**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef
git add backend/app/services/import_/import_service.py
git commit -m "fix(import): document background_tasks prerequisite in AI stub comment"
```

---

## Task 6 — Remove unused `Wallet` import from account-card.tsx

**Files:**
- Modify: `frontend/src/components/accounts/account-card.tsx:5`

`Wallet` is imported from `lucide-react` but never referenced in `account-card.tsx` — the icon is used by `OtherAccountCard` (via `typeIcons` from constants), not directly here.

- [ ] **Step 1: Apply fix**

In `frontend/src/components/accounts/account-card.tsx`, remove line 5:

```typescript
// Remove this entire line:
import { Wallet } from "lucide-react";
```

- [ ] **Step 2: Verify lint passes**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend
pnpm lint
```

Expected: no errors related to `Wallet`.

- [ ] **Step 3: Commit**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef
git add frontend/src/components/accounts/account-card.tsx
git commit -m "fix(frontend): remove unused Wallet import from account-card"
```

---

## Self-Review

**Spec coverage:** 6 confirmed issues — all have a task. Issues already fixed (circular dep, hard-delete, lint items) are correctly excluded.

**Placeholder scan:** No TBDs, all code is shown, all commands are complete.

**Type consistency:** `Field(gt=0)` on `amount_minor: int | None` in `TransactionUpdate` is `Field(default=None, gt=0)` — correct Pydantic V2 pattern for nullable field with constraint.

**One dependency:** Task 2 fixes the schema + test together because they must land atomically — if the schema fix lands alone, the test will fail CI.
