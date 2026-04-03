# Debts Section Complete — Implementation Plan

> ✅ **STATUS: PHASE 3 COMPLETE** — This plan was executed during Phase 3D. Remaining items not covered here are addressed in Phase 3.5 UX polish sprint.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the `/debts` section to production quality — every debt payment auto-creates a transaction on the selected account, installment plans track interest rates, P2P gets custom splits UI, detail pages get edit/delete, and RBAC extends to all routers.

**Architecture:** Four vertical units. Unit 1 changes the payment recording flow to auto-create transactions (the biggest architectural change). Unit 2 adds `annual_rate_bps` to installment plans. Unit 3 adds `name_ar` to accounts, P2P custom splits UI, edit/delete wiring on detail pages, and provider autocomplete. Unit 4 extends RBAC to all routers, adds bulk FX to person balances, credit utilization to debts endpoint, and auto-match suggestions UI.

**Tech Stack:** FastAPI + SQLAlchemy (async) + Pydantic V2 backend; Next.js 16 + TanStack Query + shadcn/ui + next-intl frontend; Alembic for DB migrations; pytest + httpx for backend tests.

**Design Spec:** `docs/superpowers/specs/2026-04-02-debts-section-complete-design.md`

---

## File Map

### Unit 1: Payment→Account Auto-Transaction
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `backend/app/schemas/debt.py` | Add `account_id` to `PaymentCreate` and `DebtCreate` |
| Modify | `backend/app/services/debt.py` | Auto-create transaction in `record_payment()` and `create_p2p_debt()` |
| Modify | `backend/app/routers/debts.py` | Pass `account_id` and `household_id` through to service |
| Modify | `backend/app/seed.py` | Add "Debt Payment" and "Debt Collection" predefined categories |
| Modify | `backend/tests/routers/test_debts.py` | New tests for auto-transaction creation |
| Modify | `frontend/src/lib/types/debts.ts` | Add `account_id` to `PaymentCreate` and `DebtCreateInput` |
| Modify | `frontend/src/components/debts/record-payment-form.tsx` | Add account selector |
| Modify | `frontend/src/components/debts/p2p-debt-form.tsx` | Add account selector |
| Modify | `frontend/src/messages/en.json` | New i18n keys |
| Modify | `frontend/src/messages/ar.json` | New i18n keys |

### Unit 2: Installment Plans Completion
| Action | File | Responsibility |
|--------|------|---------------|
| Create | `backend/alembic/versions/006_add_installment_rate.py` | Migration: add `annual_rate_bps` to `installment_plans` |
| Modify | `backend/app/models/installment_plan.py` | Add `annual_rate_bps` column |
| Modify | `backend/app/schemas/installment.py` | Add `annual_rate_bps` to create/update/response |
| Modify | `backend/app/routers/installments.py` | Include `annual_rate_bps` in response mapping |
| Modify | `backend/tests/routers/test_installments.py` | Test rate field round-trips |
| Modify | `frontend/src/lib/types/debts.ts` | Add `annual_rate_bps` to installment types |
| Modify | `frontend/src/components/debts/installment-form.tsx` | Add rate input field |
| Modify | `frontend/src/messages/en.json` | Rate label keys |
| Modify | `frontend/src/messages/ar.json` | Rate label keys |

### Unit 3: P2P Completion & Detail Page Polish
| Action | File | Responsibility |
|--------|------|---------------|
| Create | `backend/alembic/versions/007_add_account_name_ar.py` | Migration: add `name_ar` to `accounts` |
| Modify | `backend/app/models/account.py` | Add `name_ar` column |
| Modify | `backend/app/schemas/account.py` | Add `name_ar` to create/update/response |
| Modify | `backend/app/routers/debts.py` | Return `payment_count` on delete |
| Modify | `backend/tests/routers/test_debts.py` | Test delete returns payment_count |
| Modify | `frontend/src/components/debts/p2p-debt-form.tsx` | Add custom splits mode |
| Modify | `frontend/src/components/debts/loan-detail-content.tsx` | Add edit/delete buttons |
| Modify | `frontend/src/components/debts/p2p-detail-content.tsx` | Add edit/delete buttons |
| Modify | `frontend/src/components/debts/installment-form.tsx` | Provider autocomplete for financing_app type |
| Modify | `frontend/src/messages/en.json` | Custom splits, delete warning, provider keys |
| Modify | `frontend/src/messages/ar.json` | Custom splits, delete warning, provider keys |

### Unit 4: Cross-Cutting Polish
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `backend/app/routers/accounts.py` | Add RBAC guards |
| Modify | `backend/app/routers/transactions.py` | Add RBAC guards |
| Modify | `backend/app/routers/transfers.py` | Add RBAC guards |
| Modify | `backend/app/routers/categories.py` | Add RBAC guards |
| Modify | `backend/app/routers/installments.py` | Add RBAC guards |
| Modify | `backend/app/services/person.py` | Add FX to bulk balances |
| Modify | `backend/app/schemas/debt.py` | Add `credit_utilization_percent` to `DebtResponse` |
| Modify | `backend/app/routers/debts.py` | Compute credit utilization in list/get |
| Create | `backend/tests/routers/test_rbac.py` | RBAC tests for all routers |
| Modify | `frontend/src/components/debts/loan-detail-content.tsx` | Auto-match suggestions UI |
| Modify | `frontend/src/components/debts/record-payment-form.tsx` | Hidden `link_existing_transaction_id` field |
| Modify | `frontend/src/lib/types/debts.ts` | Add `link_existing_transaction_id` to `PaymentCreate` |
| Modify | `frontend/src/messages/en.json` | Match suggestions, RBAC error keys |
| Modify | `frontend/src/messages/ar.json` | Match suggestions, RBAC error keys |

---

## Unit 1: Payment→Account Auto-Transaction

### Task 1.1: Add Predefined Debt Categories to Seed Data

**Files:**
- Modify: `backend/app/seed.py`

- [ ] **Step 1: Add the two new categories to PREDEFINED_CATEGORIES**

In `backend/app/seed.py`, append to the `PREDEFINED_CATEGORIES` list:

```python
    # Debt categories
    {
        "name_en": "Debt Payment",
        "name_ar": "سداد دين",
        "type": "expense",
        "icon": "banknote",
        "color": "#dc2626",
        "sort_order": 130,
    },
    {
        "name_en": "Debt Collection",
        "name_ar": "تحصيل دين",
        "type": "income",
        "icon": "hand-coins",
        "color": "#16a34a",
        "sort_order": 131,
    },
```

- [ ] **Step 2: Run existing tests to verify nothing breaks**

Run: `cd backend && uv run pytest tests/ -x -q`
Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/app/seed.py
git commit -m "feat(debts): add Debt Payment and Debt Collection predefined categories"
```

---

### Task 1.2: Update PaymentCreate Schema — Add account_id

**Files:**
- Modify: `backend/app/schemas/debt.py`
- Test: `backend/tests/schemas/test_debt_schemas.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/schemas/test_debt_schemas.py`:

```python
def test_payment_create_requires_account_id():
    """PaymentCreate must require account_id."""
    from app.schemas.debt import PaymentCreate

    # Missing account_id should fail
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError, match="account_id"):
        PaymentCreate(date="2026-04-01", amount_minor=100000)


def test_payment_create_with_account_id():
    from app.schemas.debt import PaymentCreate

    p = PaymentCreate(date="2026-04-01", amount_minor=100000, account_id=1)
    assert p.account_id == 1
    assert p.link_existing_transaction_id is None


def test_payment_create_with_link_existing():
    from app.schemas.debt import PaymentCreate

    p = PaymentCreate(
        date="2026-04-01",
        amount_minor=100000,
        account_id=1,
        link_existing_transaction_id=42,
    )
    assert p.link_existing_transaction_id == 42
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/schemas/test_debt_schemas.py -x -q -k "payment_create"`
Expected: FAIL — `account_id` not in schema.

- [ ] **Step 3: Update the schema**

In `backend/app/schemas/debt.py`, replace the `PaymentCreate` class:

```python
class PaymentCreate(BaseModel):
    date: date
    amount_minor: int = Field(gt=0)
    account_id: int
    link_existing_transaction_id: int | None = None
    notes: str | None = None
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/schemas/test_debt_schemas.py -x -q -k "payment_create"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/debt.py backend/tests/schemas/test_debt_schemas.py
git commit -m "feat(debts): add account_id and link_existing_transaction_id to PaymentCreate"
```

---

### Task 1.3: Update DebtCreate Schema — Add account_id for P2P

**Files:**
- Modify: `backend/app/schemas/debt.py`
- Test: `backend/tests/schemas/test_debt_schemas.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/schemas/test_debt_schemas.py`:

```python
def test_debt_create_p2p_has_account_id():
    from app.schemas.debt import DebtCreate

    d = DebtCreate(
        type="personal_lent",
        name="Lent to Ahmed",
        principal_minor=500000,
        currency="EGP",
        tenure_months=1,
        start_date="2026-04-01",
        person_id=1,
        repayment_mode="lump_sum",
        due_date="2026-05-01",
        account_id=5,
    )
    assert d.account_id == 5
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/schemas/test_debt_schemas.py::test_debt_create_p2p_has_account_id -x -q`
Expected: FAIL — `account_id` not in schema.

- [ ] **Step 3: Update the schema**

In `backend/app/schemas/debt.py`, add to `DebtCreate`:

```python
class DebtCreate(BaseModel):
    type: Literal["bank_loan", "personal_lent", "personal_borrowed"]
    name: str
    institution: str | None = None
    principal_minor: int = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3)
    annual_rate_percent: float = Field(ge=0, default=0)
    tenure_months: int = Field(gt=0)
    start_date: date
    linked_account_id: int | None = None
    notes: str | None = None
    # P2P fields
    person_id: int | None = None
    repayment_mode: str | None = None
    due_date: date | None = None
    split_count: int | None = Field(default=None, gt=0)
    splits: list[SplitInput] | None = None
    # Account for auto-transaction (required for P2P, optional for bank_loan)
    account_id: int | None = None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && uv run pytest tests/schemas/test_debt_schemas.py::test_debt_create_p2p_has_account_id -x -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/debt.py backend/tests/schemas/test_debt_schemas.py
git commit -m "feat(debts): add account_id to DebtCreate for P2P auto-transaction"
```

---

### Task 1.4: Update record_payment Service — Auto-Create Transaction

**Files:**
- Modify: `backend/app/services/debt.py`
- Test: `backend/tests/routers/test_debts.py`

- [ ] **Step 1: Write the failing test for loan payment auto-transaction**

Add to `backend/tests/routers/test_debts.py`:

```python
@pytest.mark.asyncio
async def test_record_payment_creates_transaction(client):
    """Recording a payment should auto-create a debit transaction on the account."""
    # Create account
    acct = await client.post(
        "/api/v1/accounts",
        json={"name": "CIB", "type": "bank_account", "currency": "EGP"},
    )
    acct_id = acct.json()["data"]["id"]

    # Create loan
    loan = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(
            principal_minor=1200000,
            annual_rate_percent=0,
            tenure_months=12,
        ),
    )
    debt_id = loan.json()["data"]["id"]

    # Record payment with account_id
    resp = await client.post(
        f"/api/v1/debts/{debt_id}/payments",
        json={"date": "2026-04-01", "amount_minor": 100000, "account_id": acct_id},
    )
    assert resp.status_code == 201
    payment = resp.json()["data"]
    assert payment["transaction_id"] is not None

    # Verify the transaction was created
    tx_resp = await client.get(f"/api/v1/transactions/{payment['transaction_id']}")
    assert tx_resp.status_code == 200
    tx = tx_resp.json()["data"]
    assert tx["account_id"] == acct_id
    assert tx["amount_minor"] == -100000  # debit = negative


@pytest.mark.asyncio
async def test_record_payment_link_existing_transaction(client):
    """When link_existing_transaction_id is provided, link to it instead of creating new."""
    acct = await client.post(
        "/api/v1/accounts",
        json={"name": "CIB", "type": "bank_account", "currency": "EGP"},
    )
    acct_id = acct.json()["data"]["id"]

    # Create a transaction manually
    tx = await client.post(
        "/api/v1/transactions",
        json={
            "account_id": acct_id,
            "date": "2026-04-01",
            "description": "Loan payment",
            "amount_minor": 100000,
            "type": "debit",
        },
    )
    tx_id = tx.json()["data"]["id"]

    # Create loan
    loan = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(
            principal_minor=1200000,
            annual_rate_percent=0,
            tenure_months=12,
        ),
    )
    debt_id = loan.json()["data"]["id"]

    # Record payment linking to existing transaction
    resp = await client.post(
        f"/api/v1/debts/{debt_id}/payments",
        json={
            "date": "2026-04-01",
            "amount_minor": 100000,
            "account_id": acct_id,
            "link_existing_transaction_id": tx_id,
        },
    )
    assert resp.status_code == 201
    payment = resp.json()["data"]
    assert payment["transaction_id"] == tx_id
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/routers/test_debts.py -x -q -k "record_payment_creates_transaction or record_payment_link_existing"`
Expected: FAIL — `account_id` not accepted / no transaction created.

- [ ] **Step 3: Update the service**

In `backend/app/services/debt.py`, update the `record_payment` function signature and add transaction creation logic. Add these imports at the top:

```python
from app.models.enums import AccountType, CategoryType, DebtStatus, DebtType, RepaymentMode, TransactionType
from app.schemas.transaction import TransactionCreate
from app.services.transaction import create_transaction
```

Replace the `record_payment` function signature:

```python
async def record_payment(
    session: AsyncSession,
    household_id: uuid.UUID,
    debt: Debt,
    payment_date: date,
    amount_minor: int,
    account_id: int,
    link_existing_transaction_id: int | None = None,
    notes: str | None = None,
) -> DebtPayment:
```

After the `DebtPayment` is created and flushed (after line `await session.flush()` on the payment creation), and before the P2P split marking logic, add the transaction creation:

```python
    # --- Auto-create or link transaction ---
    if link_existing_transaction_id is not None:
        # Match path: validate and link to existing transaction
        existing_tx = await session.get(Transaction, link_existing_transaction_id)
        if (
            existing_tx is None
            or not existing_tx.is_active
            or existing_tx.household_id != household_id
            or existing_tx.account_id != account_id
        ):
            raise ValueError("TRANSACTION_NOT_FOUND")
        payment.transaction_id = existing_tx.id
        await session.flush()
    else:
        # Auto-create path: create a new transaction
        tx_type, tx_description = _payment_transaction_details(debt, notes)
        debt_category_id = await _get_debt_category_id(
            session, tx_type
        )
        tx_data = TransactionCreate(
            account_id=account_id,
            date=payment_date,
            description=tx_description,
            amount_minor=amount_minor,
            type=tx_type,
            category_id=debt_category_id,
            notes=notes,
        )
        new_tx = await create_transaction(session, household_id, tx_data)
        payment.transaction_id = new_tx.id
        await session.flush()
```

Add these helper functions before `record_payment`:

```python
def _payment_transaction_details(
    debt: Debt,
    notes: str | None,
) -> tuple[str, str]:
    """Return (transaction_type, description) for auto-created payment transaction."""
    if debt.type == DebtType.PERSONAL_LENT:
        # Someone is paying you back — money comes in
        return TransactionType.CREDIT, f"Debt collection: {debt.name}"
    else:
        # You are paying (bank_loan or personal_borrowed) — money goes out
        return TransactionType.DEBIT, f"Debt payment: {debt.name}"


async def _get_debt_category_id(
    session: AsyncSession,
    tx_type: str,
) -> int | None:
    """Find the predefined Debt Payment or Debt Collection category."""
    from app.models.category import Category

    target_name = "Debt Collection" if tx_type == TransactionType.CREDIT else "Debt Payment"
    q = select(Category).where(
        Category.is_predefined.is_(True),
        Category.name_en == target_name,
    )
    cat = (await session.execute(q)).scalar_one_or_none()
    return cat.id if cat else None
```

- [ ] **Step 4: Update the router to pass new parameters**

In `backend/app/routers/debts.py`, update the `record_payment` endpoint (line ~285):

```python
    try:
        payment = await debt_service.record_payment(
            session,
            household_id,
            debt,
            data.date,
            data.amount_minor,
            data.account_id,
            data.link_existing_transaction_id,
            data.notes,
        )
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/routers/test_debts.py -x -q -k "record_payment_creates_transaction or record_payment_link_existing"`
Expected: PASS

- [ ] **Step 6: Run full test suite to check for regressions**

Run: `cd backend && uv run pytest tests/ -x -q`
Expected: Some existing payment tests may fail because they don't pass `account_id`. Fix them in the next step.

- [ ] **Step 7: Fix existing payment tests**

All existing tests that call `POST /api/v1/debts/{id}/payments` need `account_id`. Create a helper in `test_debts.py`:

```python
async def _create_test_account(client, name="Test Account", currency="EGP"):
    resp = await client.post(
        "/api/v1/accounts",
        json={"name": name, "type": "bank_account", "currency": currency},
    )
    return resp.json()["data"]["id"]
```

Update every existing test that records a payment to first create an account and include `"account_id": acct_id` in the payment payload.

- [ ] **Step 8: Run full test suite**

Run: `cd backend && uv run pytest tests/ -x -q`
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add backend/app/services/debt.py backend/app/routers/debts.py backend/tests/routers/test_debts.py
git commit -m "feat(debts): auto-create transaction when recording a debt payment"
```

---

### Task 1.5: P2P Creation Auto-Transaction

**Files:**
- Modify: `backend/app/services/debt.py` (the `create_p2p_debt` function)
- Test: `backend/tests/routers/test_debts.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/routers/test_debts.py`:

```python
@pytest.mark.asyncio
async def test_create_p2p_lent_creates_debit_transaction(client):
    """Creating a P2P lent debt should create a debit transaction (money leaves your account)."""
    acct_id = await _create_test_account(client)
    person = await client.post(
        "/api/v1/persons",
        json={"name": "Ahmed"},
    )
    person_id = person.json()["data"]["id"]

    resp = await client.post(
        "/api/v1/debts",
        json={
            "type": "personal_lent",
            "name": "Lent to Ahmed",
            "principal_minor": 500000,
            "currency": "EGP",
            "tenure_months": 1,
            "start_date": "2026-04-01",
            "person_id": person_id,
            "repayment_mode": "lump_sum",
            "due_date": "2026-05-01",
            "account_id": acct_id,
        },
    )
    assert resp.status_code == 201

    # Verify a debit transaction was created
    txs = await client.get(f"/api/v1/transactions?account_id={acct_id}")
    tx_list = txs.json()["data"]
    assert len(tx_list) == 1
    assert tx_list[0]["amount_minor"] == -500000  # debit


@pytest.mark.asyncio
async def test_create_p2p_borrowed_creates_credit_transaction(client):
    """Creating a P2P borrowed debt should create a credit transaction (money enters your account)."""
    acct_id = await _create_test_account(client)
    person = await client.post(
        "/api/v1/persons",
        json={"name": "Sara"},
    )
    person_id = person.json()["data"]["id"]

    resp = await client.post(
        "/api/v1/debts",
        json={
            "type": "personal_borrowed",
            "name": "Borrowed from Sara",
            "principal_minor": 300000,
            "currency": "EGP",
            "tenure_months": 1,
            "start_date": "2026-04-01",
            "person_id": person_id,
            "repayment_mode": "lump_sum",
            "due_date": "2026-05-01",
            "account_id": acct_id,
        },
    )
    assert resp.status_code == 201

    txs = await client.get(f"/api/v1/transactions?account_id={acct_id}")
    tx_list = txs.json()["data"]
    assert len(tx_list) == 1
    assert tx_list[0]["amount_minor"] == 300000  # credit


@pytest.mark.asyncio
async def test_create_p2p_without_account_id_fails(client):
    """P2P debt creation must require account_id."""
    person = await client.post("/api/v1/persons", json={"name": "Test"})
    person_id = person.json()["data"]["id"]

    resp = await client.post(
        "/api/v1/debts",
        json={
            "type": "personal_lent",
            "name": "Test",
            "principal_minor": 100000,
            "currency": "EGP",
            "tenure_months": 1,
            "start_date": "2026-04-01",
            "person_id": person_id,
            "repayment_mode": "lump_sum",
            "due_date": "2026-05-01",
        },
    )
    assert resp.status_code == 422
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/routers/test_debts.py -x -q -k "create_p2p_lent_creates or create_p2p_borrowed_creates or create_p2p_without_account"`
Expected: FAIL

- [ ] **Step 3: Update create_p2p_debt service**

In `backend/app/services/debt.py`, update `create_p2p_debt` to accept `household_id` and `account_id`, validate account_id is required, and create a transaction:

```python
async def create_p2p_debt(
    session: AsyncSession,
    household_id: uuid.UUID,
    data: DebtCreate,
) -> Debt:
    """Create a P2P debt with splits and auto-create initial transaction."""
    if not data.person_id:
        raise ValueError("PERSON_REQUIRED")
    if not data.account_id:
        raise ValueError("ACCOUNT_ID_REQUIRED")

    # ... existing person validation and split logic unchanged ...

    # After debt and splits are created and flushed, create the initial transaction
    if data.type == "personal_lent":
        tx_type = TransactionType.DEBIT
        tx_desc = f"Lent to: {debt.name}"
    else:
        tx_type = TransactionType.CREDIT
        tx_desc = f"Borrowed from: {debt.name}"

    debt_category_id = await _get_debt_category_id(session, tx_type)
    tx_data = TransactionCreate(
        account_id=data.account_id,
        date=data.start_date,
        description=tx_desc,
        amount_minor=data.principal_minor,
        type=tx_type,
        category_id=debt_category_id,
    )
    await create_transaction(session, household_id, tx_data)

    return debt
```

- [ ] **Step 4: Update the router to validate P2P account_id**

In `backend/app/routers/debts.py`, in `create_debt`, add validation before calling `create_p2p_debt`:

```python
        elif data.type in ("personal_lent", "personal_borrowed"):
            if not data.account_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=ErrorResponse(
                        error=ErrorDetail(
                            code="ACCOUNT_ID_REQUIRED",
                            message="P2P debts require account_id",
                        )
                    ).model_dump(),
                )
            debt = await debt_service.create_p2p_debt(session, household_id, data)
```

- [ ] **Step 5: Fix existing P2P tests**

Existing P2P creation tests need `account_id`. Update them to create an account first and pass it.

- [ ] **Step 6: Run full test suite**

Run: `cd backend && uv run pytest tests/ -x -q`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/debt.py backend/app/routers/debts.py backend/tests/routers/test_debts.py
git commit -m "feat(debts): auto-create transaction on P2P debt creation"
```

---

### Task 1.6: Frontend — Update Types

**Files:**
- Modify: `frontend/src/lib/types/debts.ts`

- [ ] **Step 1: Update PaymentCreate type**

```typescript
export interface PaymentCreate {
  date: string;
  amount_minor: number;
  account_id: number;
  link_existing_transaction_id?: number | null;
  notes?: string | null;
}
```

- [ ] **Step 2: Update DebtCreateInput type**

Add `account_id` field:

```typescript
export interface DebtCreateInput {
  type: DebtType;
  name: string;
  institution?: string | null;
  principal_minor: number;
  currency: string;
  annual_rate_percent?: number;
  tenure_months: number;
  start_date: string;
  linked_account_id?: number | null;
  notes?: string | null;
  person_id?: number | null;
  repayment_mode?: RepaymentMode | null;
  due_date?: string | null;
  split_count?: number | null;
  splits?: SplitInput[] | null;
  account_id?: number | null;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/types/debts.ts
git commit -m "feat(debts): add account_id to TypeScript debt/payment types"
```

---

### Task 1.7: Frontend — Add i18n Keys for Account Selector

**Files:**
- Modify: `frontend/src/messages/en.json`
- Modify: `frontend/src/messages/ar.json`

- [ ] **Step 1: Add English keys**

Under `debts.form.payment`:

```json
"selectAccount": "Select account",
"accountRequired": "Account is required"
```

Under `debts.form.p2p`:

```json
"sourceAccount": "Source account",
"destinationAccount": "Destination account",
"selectAccount": "Select account"
```

- [ ] **Step 2: Add Arabic keys**

Under `debts.form.payment`:

```json
"selectAccount": "اختر الحساب",
"accountRequired": "الحساب مطلوب"
```

Under `debts.form.p2p`:

```json
"sourceAccount": "حساب المصدر",
"destinationAccount": "حساب الوجهة",
"selectAccount": "اختر الحساب"
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/messages/en.json frontend/src/messages/ar.json
git commit -m "feat(debts): add i18n keys for account selector in payment and P2P forms"
```

---

### Task 1.8: Frontend — Account Selector in Record Payment Form

**Files:**
- Modify: `frontend/src/components/debts/record-payment-form.tsx`

- [ ] **Step 1: Add account selector state and data fetching**

Add imports:

```typescript
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useAccounts } from "@/hooks/use-accounts";
```

Update the props interface to include `debtType`:

```typescript
interface RecordPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtId: number;
  currency: string;
  debtType?: string;
  linkedAccountId?: number | null;
}
```

Add state and data fetching inside the component:

```typescript
const [accountId, setAccountId] = useState(
  props.linkedAccountId ? String(props.linkedAccountId) : ""
);
const { data: accountsData } = useAccounts();
const accounts = (accountsData?.data ?? []).filter(
  (a) => a.currency === currency && a.is_active
);
```

- [ ] **Step 2: Add the Select element to the form before the submit button**

```tsx
<div className="space-y-2">
  <Label>{t("selectAccount")} *</Label>
  <Select value={accountId} onValueChange={(v) => setAccountId(v ?? "")}>
    <SelectTrigger className="w-full">
      <SelectValue placeholder={t("selectAccount")} />
    </SelectTrigger>
    <SelectContent>
      {accounts.map((acc) => (
        <SelectItem key={acc.id} value={String(acc.id)}>
          {acc.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

- [ ] **Step 3: Update the handleSubmit to include account_id**

```typescript
mutation.mutate(
  {
    date,
    amount_minor: parseMajorToMinor(amount, CURRENCIES[currency]?.exponent ?? 2),
    account_id: parseInt(accountId, 10),
    notes: notes || null,
  },
  { onSuccess: () => { onOpenChange(false); resetFields(); } }
);
```

- [ ] **Step 4: Update callers to pass new props**

In `loan-detail-content.tsx` and `p2p-detail-content.tsx`, add `debtType` and `linkedAccountId` props to `RecordPaymentForm`:

```tsx
<RecordPaymentForm
  open={paymentOpen}
  onOpenChange={setPaymentOpen}
  debtId={debtId}
  currency={debt.currency}
  debtType={debt.type}
  linkedAccountId={debt.linked_account_id}
/>
```

- [ ] **Step 5: Reset accountId in resetFields**

```typescript
const resetFields = () => {
  setDate(new Date().toISOString().split("T")[0]);
  setAmount("");
  setNotes("");
  setAccountId(props.linkedAccountId ? String(props.linkedAccountId) : "");
};
```

- [ ] **Step 6: Verify build**

Run: `cd frontend && pnpm build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/debts/record-payment-form.tsx frontend/src/components/debts/loan-detail-content.tsx frontend/src/components/debts/p2p-detail-content.tsx
git commit -m "feat(debts): add account selector to record payment form"
```

---

### Task 1.9: Frontend — Account Selector in P2P Debt Form

**Files:**
- Modify: `frontend/src/components/debts/p2p-debt-form.tsx`

- [ ] **Step 1: Add account imports and state**

Add to imports:

```typescript
import { useAccounts } from "@/hooks/use-accounts";
```

Inside `P2PDebtFormContent`, add:

```typescript
const [accountId, setAccountId] = useState("");
const { data: accountsData } = useAccounts();
const accounts = (accountsData?.data ?? []).filter(
  (a) => a.currency === currency && a.is_active
);
```

- [ ] **Step 2: Add account selector to the form (after currency, before amount)**

```tsx
{!isEdit && (
  <div className="space-y-2">
    <Label>
      {debtType === "personal_lent" ? t("sourceAccount") : t("destinationAccount")} *
    </Label>
    <Select value={accountId} onValueChange={(v) => setAccountId(v ?? "")}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={t("selectAccount")} />
      </SelectTrigger>
      <SelectContent>
        {accounts.map((acc) => (
          <SelectItem key={acc.id} value={String(acc.id)}>
            {acc.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
```

- [ ] **Step 3: Include account_id in create mutation payload**

In the `handleSubmit` create branch, add `account_id`:

```typescript
createMutation.mutate(
  {
    // ... existing fields ...
    account_id: parseInt(accountId, 10),
  },
  { onSuccess: () => { onOpenChange(false); resetFields(); } }
);
```

- [ ] **Step 4: Reset accountId in resetFields**

```typescript
setAccountId("");
```

- [ ] **Step 5: Verify build**

Run: `cd frontend && pnpm build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/debts/p2p-debt-form.tsx
git commit -m "feat(debts): add account selector to P2P debt form"
```

---

### Task 1.10: Frontend — Invalidate Accounts on Payment/Debt Create

**Files:**
- Modify: `frontend/src/hooks/use-debts.ts`

- [ ] **Step 1: Add accounts invalidation to payment and create hooks**

In `useRecordPayment`, `useCreateDebt`, `useDeleteDebt`, and `useMarkDebtPaid` — add `queryClient.invalidateQueries({ queryKey: ["accounts"] })` inside their `onSuccess` callbacks. This ensures account balances refresh when debt operations create transactions.

- [ ] **Step 2: Verify build**

Run: `cd frontend && pnpm build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/use-debts.ts
git commit -m "feat(debts): invalidate accounts cache on debt payment/creation"
```

---

## Unit 2: Installment Plans Completion

### Task 2.1: Alembic Migration — Add annual_rate_bps to installment_plans

**Files:**
- Create: `backend/alembic/versions/006_add_installment_rate.py`

- [ ] **Step 1: Create the migration file**

```python
"""Add annual_rate_bps to installment_plans

Revision ID: phase3_002
Revises: phase3_001
Create Date: 2026-04-02

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "phase3_002"
down_revision: str | Sequence[str] | None = "phase3_001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "installment_plans",
        sa.Column("annual_rate_bps", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("installment_plans", "annual_rate_bps")
```

- [ ] **Step 2: Commit**

```bash
git add backend/alembic/versions/006_add_installment_rate.py
git commit -m "feat(installments): migration to add annual_rate_bps column"
```

---

### Task 2.2: Backend Model + Schema + Router — annual_rate_bps

**Files:**
- Modify: `backend/app/models/installment_plan.py`
- Modify: `backend/app/schemas/installment.py`
- Modify: `backend/app/routers/installments.py`
- Test: `backend/tests/routers/test_installments.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/routers/test_installments.py`:

```python
@pytest.mark.asyncio
async def test_create_installment_with_rate(client):
    """annual_rate_bps should be accepted and returned."""
    resp = await client.post(
        "/api/v1/installments",
        json={
            "type": "financing_app",
            "name": "Valu Purchase",
            "total_amount_minor": 1200000,
            "monthly_amount_minor": 110000,
            "total_months": 12,
            "start_month": "2026-01-01",
            "currency": "EGP",
            "annual_rate_bps": 2400,
        },
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["annual_rate_bps"] == 2400


@pytest.mark.asyncio
async def test_create_installment_default_rate_zero(client):
    """annual_rate_bps defaults to 0 when not provided."""
    resp = await client.post(
        "/api/v1/installments",
        json={
            "type": "store",
            "name": "IKEA Sofa",
            "total_amount_minor": 600000,
            "monthly_amount_minor": 100000,
            "total_months": 6,
            "start_month": "2026-01-01",
            "currency": "EGP",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["data"]["annual_rate_bps"] == 0
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/routers/test_installments.py -x -q -k "rate"`
Expected: FAIL — `annual_rate_bps` not in schema/response.

- [ ] **Step 3: Add column to model**

In `backend/app/models/installment_plan.py`, add after the `currency` column:

```python
    annual_rate_bps: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
```

- [ ] **Step 4: Add to schemas**

In `backend/app/schemas/installment.py`:

`InstallmentCreate` — add:
```python
    annual_rate_bps: int = 0
```

`InstallmentUpdate` — add:
```python
    annual_rate_bps: int | None = None
```

`InstallmentResponse` — add after `currency`:
```python
    annual_rate_bps: int
```

- [ ] **Step 5: Update router response mapping**

In `backend/app/routers/installments.py`, in `_plan_to_response`, add:

```python
        annual_rate_bps=plan.annual_rate_bps,
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/routers/test_installments.py -x -q`
Expected: PASS

- [ ] **Step 7: Run full test suite**

Run: `cd backend && uv run pytest tests/ -x -q`
Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add backend/app/models/installment_plan.py backend/app/schemas/installment.py backend/app/routers/installments.py backend/tests/routers/test_installments.py
git commit -m "feat(installments): add annual_rate_bps to model, schema, and response"
```

---

### Task 2.3: Frontend — Rate Field in Installment Form

**Files:**
- Modify: `frontend/src/lib/types/debts.ts`
- Modify: `frontend/src/components/debts/installment-form.tsx`
- Modify: `frontend/src/messages/en.json`
- Modify: `frontend/src/messages/ar.json`

- [ ] **Step 1: Update TypeScript types**

In `frontend/src/lib/types/debts.ts`:

`InstallmentResponse` — add:
```typescript
  annual_rate_bps: number;
```

`InstallmentCreateInput` — add:
```typescript
  annual_rate_bps?: number;
```

`InstallmentUpdateInput` — add:
```typescript
  annual_rate_bps?: number | null;
```

- [ ] **Step 2: Add i18n keys**

English (`en.json`) under `debts.form.installment`:
```json
"annualRate": "Annual Interest Rate (%)",
"annualRateHint": "0% for interest-free plans"
```

Arabic (`ar.json`) under `debts.form.installment`:
```json
"annualRate": "معدل الفائدة السنوي (%)",
"annualRateHint": "٠٪ للخطط بدون فوائد"
```

- [ ] **Step 3: Add rate input to installment form**

In `frontend/src/components/debts/installment-form.tsx`, inside `InstallmentFormContent`:

Add state:
```typescript
const [annualRate, setAnnualRate] = useState(
  initialData ? String(initialData.annual_rate_bps / 100) : "0"
);
```

Add the field in the form (after `startMonth`, inside the `!isEdit` block):

```tsx
<div className="space-y-2">
  <Label htmlFor="inst-rate">{t("annualRate")}</Label>
  <Input
    id="inst-rate"
    type="number"
    step="0.01"
    min="0"
    value={annualRate}
    onChange={(e) => setAnnualRate(e.target.value)}
    disabled={isEdit}
  />
  <p className="text-xs text-muted-foreground">{t("annualRateHint")}</p>
</div>
```

Update the create mutation payload:
```typescript
annual_rate_bps: Math.round(parseFloat(annualRate || "0") * 100),
```

- [ ] **Step 4: Verify build**

Run: `cd frontend && pnpm build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/types/debts.ts frontend/src/components/debts/installment-form.tsx frontend/src/messages/en.json frontend/src/messages/ar.json
git commit -m "feat(installments): add annual interest rate field to installment form"
```

---

## Unit 3: P2P Completion & Detail Page Polish

### Task 3.1: Migration — Add name_ar to Accounts

**Files:**
- Create: `backend/alembic/versions/007_add_account_name_ar.py`
- Modify: `backend/app/models/account.py`
- Modify: `backend/app/schemas/account.py`

- [ ] **Step 1: Create the migration**

```python
"""Add name_ar to accounts

Revision ID: phase3_003
Revises: phase3_002
Create Date: 2026-04-02

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "phase3_003"
down_revision: str | Sequence[str] | None = "phase3_002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("accounts", sa.Column("name_ar", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("accounts", "name_ar")
```

- [ ] **Step 2: Add column to Account model**

In `backend/app/models/account.py`, add after `name`:

```python
    name_ar: Mapped[str | None] = mapped_column(Text, nullable=True)
```

- [ ] **Step 3: Add to account schemas**

In `backend/app/schemas/account.py`:

`AccountCreate` — add:
```python
    name_ar: str | None = None
```

`AccountUpdate` — add:
```python
    name_ar: str | None = None
```

`AccountResponse` — add:
```python
    name_ar: str | None = None
```

- [ ] **Step 4: Run full test suite**

Run: `cd backend && uv run pytest tests/ -x -q`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add backend/alembic/versions/007_add_account_name_ar.py backend/app/models/account.py backend/app/schemas/account.py
git commit -m "feat(accounts): add name_ar column for Arabic account names"
```

---

### Task 3.2: Delete Debt Returns Payment Count

**Files:**
- Modify: `backend/app/routers/debts.py`
- Test: `backend/tests/routers/test_debts.py`

- [ ] **Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_delete_debt_with_payments_returns_200_with_count(client):
    """Deleting a debt with payments returns 200 with payment_count instead of 204."""
    acct_id = await _create_test_account(client)
    loan = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(
            principal_minor=1200000, annual_rate_percent=0, tenure_months=12,
        ),
    )
    debt_id = loan.json()["data"]["id"]

    # Record a payment
    await client.post(
        f"/api/v1/debts/{debt_id}/payments",
        json={"date": "2026-04-01", "amount_minor": 100000, "account_id": acct_id},
    )

    # Delete — should succeed but warn about payments
    resp = await client.delete(f"/api/v1/debts/{debt_id}")
    assert resp.status_code == 200
    assert resp.json()["data"]["payment_count"] == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/routers/test_debts.py -x -q -k "delete_debt_with_payments"`
Expected: FAIL — returns 204 with no body.

- [ ] **Step 3: Update delete endpoint**

In `backend/app/routers/debts.py`, change the delete endpoint to check for payments and return count:

```python
@router.delete("/{debt_id}")
async def delete_debt(
    debt_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse | None:
    debt = await debt_service.get_debt(session, household_id, debt_id)
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Debt not found")
            ).model_dump(),
        )
    _check_p2p_write(debt, role)
    payment_count = await debt_service.count_payments(session, debt.id)
    await debt_service.soft_delete_debt(session, debt)
    if payment_count > 0:
        return SuccessResponse(data={"deleted": True, "payment_count": payment_count})
    return SuccessResponse(data={"deleted": True, "payment_count": 0})
```

Add to `backend/app/services/debt.py`:

```python
async def count_payments(session: AsyncSession, debt_id: int) -> int:
    q = select(func.count(DebtPayment.id)).where(DebtPayment.debt_id == debt_id)
    return (await session.execute(q)).scalar_one()
```

- [ ] **Step 4: Fix existing delete tests** (they expect 204, now get 200)

- [ ] **Step 5: Run full test suite**

Run: `cd backend && uv run pytest tests/ -x -q`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/debts.py backend/app/services/debt.py backend/tests/routers/test_debts.py
git commit -m "feat(debts): return payment_count on debt deletion for UI warning"
```

---

### Task 3.3: Frontend — P2P Custom Splits UI

**Files:**
- Modify: `frontend/src/components/debts/p2p-debt-form.tsx`
- Modify: `frontend/src/messages/en.json`
- Modify: `frontend/src/messages/ar.json`

- [ ] **Step 1: Add i18n keys**

English under `debts.form.p2p`:
```json
"customSplits": "Custom Splits",
"addSplit": "Add Split",
"removeSplit": "Remove",
"splitAmount": "Amount",
"splitDate": "Date",
"splitsSumError": "Split amounts must equal the total"
```

Arabic under `debts.form.p2p`:
```json
"customSplits": "أقساط مخصصة",
"addSplit": "إضافة قسط",
"removeSplit": "حذف",
"splitAmount": "المبلغ",
"splitDate": "التاريخ",
"splitsSumError": "مجموع الأقساط يجب أن يساوي المبلغ الإجمالي"
```

- [ ] **Step 2: Add `custom_splits` option to repayment mode selector**

In `p2p-debt-form.tsx`, add the third SelectItem:

```tsx
<SelectItem value="custom_splits">{tRepayment("customSplits")}</SelectItem>
```

- [ ] **Step 3: Add custom splits state and UI**

Add state:
```typescript
const [customSplits, setCustomSplits] = useState<
  { amount: string; due_date: string }[]
>([{ amount: "", due_date: "" }]);
```

Add the dynamic splits form (after the repayment mode selector, inside the `!isEdit` block):

```tsx
{!isEdit && repaymentMode === "custom_splits" && (
  <div className="space-y-3">
    {customSplits.map((split, idx) => (
      <div key={idx} className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label>{t("splitAmount")}</Label>
          <Input
            type="number"
            step={String(Math.pow(10, -(CURRENCIES[currency]?.exponent ?? 2)))}
            value={split.amount}
            onChange={(e) => {
              const next = [...customSplits];
              next[idx] = { ...next[idx], amount: e.target.value };
              setCustomSplits(next);
            }}
            required
          />
        </div>
        <div className="flex-1 space-y-1">
          <Label>{t("splitDate")}</Label>
          <Input
            type="date"
            value={split.due_date}
            onChange={(e) => {
              const next = [...customSplits];
              next[idx] = { ...next[idx], due_date: e.target.value };
              setCustomSplits(next);
            }}
            required
          />
        </div>
        {customSplits.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCustomSplits(customSplits.filter((_, i) => i !== idx))}
          >
            {t("removeSplit")}
          </Button>
        )}
      </div>
    ))}
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setCustomSplits([...customSplits, { amount: "", due_date: "" }])}
    >
      {t("addSplit")}
    </Button>
  </div>
)}
```

- [ ] **Step 4: Update handleSubmit for custom_splits mode**

In the create branch of `handleSubmit`:

```typescript
const exponent = CURRENCIES[currency]?.exponent ?? 2;
const splitsPayload =
  repaymentMode === "custom_splits"
    ? customSplits.map((s) => ({
        amount_minor: parseMajorToMinor(s.amount, exponent),
        due_date: s.due_date,
      }))
    : null;

createMutation.mutate(
  {
    type: debtType,
    name: /* existing auto-name logic */,
    principal_minor: parseMajorToMinor(amount, exponent),
    currency,
    tenure_months:
      repaymentMode === "equal_splits" && splitCount
        ? parseInt(splitCount, 10)
        : repaymentMode === "custom_splits"
          ? customSplits.length
          : 1,
    start_date: new Date().toISOString().split("T")[0],
    person_id: parseInt(personId, 10),
    repayment_mode: repaymentMode,
    due_date: repaymentMode === "lump_sum" ? dueDate || null : null,
    split_count: repaymentMode === "equal_splits" ? parseInt(splitCount, 10) : null,
    splits: splitsPayload,
    notes: notes || null,
    account_id: parseInt(accountId, 10),
  },
  { onSuccess: () => { onOpenChange(false); resetFields(); } }
);
```

- [ ] **Step 5: Verify build**

Run: `cd frontend && pnpm build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/debts/p2p-debt-form.tsx frontend/src/messages/en.json frontend/src/messages/ar.json
git commit -m "feat(debts): add custom splits UI to P2P debt form"
```

---

### Task 3.4: Frontend — Edit/Delete on Loan Detail Page

**Files:**
- Modify: `frontend/src/components/debts/loan-detail-content.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { BankLoanForm } from "@/components/debts/bank-loan-form";
import { DeleteConfirmation } from "@/components/shared/delete-confirmation";
import { useDeleteDebt } from "@/hooks/use-debts";
```

- [ ] **Step 2: Add edit/delete state**

```typescript
const [editOpen, setEditOpen] = useState(false);
const [deleteOpen, setDeleteOpen] = useState(false);
const deleteMutation = useDeleteDebt();
const router = useRouter();
```

- [ ] **Step 3: Add Edit and Delete buttons to the header**

In the header `<div>` next to StatusBadge/APR badge, add:

```tsx
<Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
  <Pencil className="h-4 w-4" />
</Button>
<Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)}>
  <Trash2 className="h-4 w-4 text-destructive" />
</Button>
```

- [ ] **Step 4: Add the form and delete dialog components**

After the `RecordPaymentForm`:

```tsx
<BankLoanForm
  open={editOpen}
  onOpenChange={setEditOpen}
  initialData={debt}
/>

<DeleteConfirmation
  open={deleteOpen}
  onOpenChange={setDeleteOpen}
  title={t("deleteTitle")}
  description={t("deleteDescription")}
  onConfirm={() => {
    deleteMutation.mutate(debtId, {
      onSuccess: () => router.push("/debts"),
    });
  }}
  isPending={deleteMutation.isPending}
/>
```

- [ ] **Step 5: Add i18n keys for delete**

English under `debts.detail`:
```json
"deleteTitle": "Delete Debt",
"deleteDescription": "Are you sure you want to delete this debt? This action cannot be undone."
```

Arabic under `debts.detail`:
```json
"deleteTitle": "حذف الدين",
"deleteDescription": "هل أنت متأكد من حذف هذا الدين؟ لا يمكن التراجع عن هذا الإجراء."
```

- [ ] **Step 6: Verify build**

Run: `cd frontend && pnpm build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/debts/loan-detail-content.tsx frontend/src/messages/en.json frontend/src/messages/ar.json
git commit -m "feat(debts): add edit/delete buttons to loan detail page"
```

---

### Task 3.5: Frontend — Edit/Delete on P2P Detail Page

**Files:**
- Modify: `frontend/src/components/debts/p2p-detail-content.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { P2PDebtForm } from "@/components/debts/p2p-debt-form";
import { DeleteConfirmation } from "@/components/shared/delete-confirmation";
import { useDeleteDebt } from "@/hooks/use-debts";
```

- [ ] **Step 2: Add state**

Inside `P2PDetailContent`, add:

```typescript
const [editOpen, setEditOpen] = useState(false);
const [deleteOpen, setDeleteOpen] = useState(false);
const deleteMutation = useDeleteDebt();
const router = useRouter();
```

- [ ] **Step 3: Add Edit/Delete buttons to the header**

In the header div (next to StatusBadge and type badge), add:

```tsx
<Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
  <Pencil className="h-4 w-4" />
</Button>
<Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)}>
  <Trash2 className="h-4 w-4 text-destructive" />
</Button>
```

- [ ] **Step 4: Add form and delete dialog**

After `RecordPaymentForm`:

```tsx
<P2PDebtForm
  open={editOpen}
  onOpenChange={setEditOpen}
  initialData={debt}
/>

<DeleteConfirmation
  open={deleteOpen}
  onOpenChange={setDeleteOpen}
  title={t("deleteTitle")}
  description={t("deleteDescription")}
  onConfirm={() => {
    deleteMutation.mutate(debtId, {
      onSuccess: () => router.push("/debts"),
    });
  }}
  isPending={deleteMutation.isPending}
/>
```

- [ ] **Step 5: Verify build**

Run: `cd frontend && pnpm build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/debts/p2p-detail-content.tsx
git commit -m "feat(debts): add edit/delete buttons to P2P detail page"
```

---

### Task 3.5b: Frontend — Inline Edit/Delete on Installment Tab Rows

**Files:**
- Modify: `frontend/src/components/debts/card-installments-tab.tsx`
- Modify: `frontend/src/components/debts/store-installments-tab.tsx`
- Modify: `frontend/src/components/debts/financing-apps-tab.tsx`

- [ ] **Step 1: Add edit/delete actions to each installment row**

In each tab component that renders installment plan rows, import:

```typescript
import { Pencil, Trash2 } from "lucide-react";
import { InstallmentForm } from "@/components/debts/installment-form";
import { DeleteConfirmation } from "@/components/shared/delete-confirmation";
import { useDeleteInstallment } from "@/hooks/use-installments";
```

Add state for the selected plan being edited/deleted:

```typescript
const [editPlan, setEditPlan] = useState<InstallmentResponse | null>(null);
const [deletePlanId, setDeletePlanId] = useState<number | null>(null);
const deleteMutation = useDeleteInstallment();
```

Add icon buttons to each row:

```tsx
<Button variant="ghost" size="icon" onClick={() => setEditPlan(plan)}>
  <Pencil className="h-3.5 w-3.5" />
</Button>
<Button variant="ghost" size="icon" onClick={() => setDeletePlanId(plan.id)}>
  <Trash2 className="h-3.5 w-3.5 text-destructive" />
</Button>
```

Add the form/dialog at the bottom of the component:

```tsx
{editPlan && (
  <InstallmentForm
    open={!!editPlan}
    onOpenChange={(open) => !open && setEditPlan(null)}
    initialData={editPlan}
  />
)}
<DeleteConfirmation
  open={!!deletePlanId}
  onOpenChange={(open) => !open && setDeletePlanId(null)}
  title={t("deleteTitle")}
  description={t("deleteDescription")}
  onConfirm={() => {
    if (deletePlanId) deleteMutation.mutate(deletePlanId, {
      onSuccess: () => setDeletePlanId(null),
    });
  }}
  isPending={deleteMutation.isPending}
/>
```

- [ ] **Step 2: Add i18n keys**

English under `debts.installments`:
```json
"deleteTitle": "Delete Installment Plan",
"deleteDescription": "Are you sure you want to delete this installment plan?"
```

Arabic under `debts.installments`:
```json
"deleteTitle": "حذف خطة الأقساط",
"deleteDescription": "هل أنت متأكد من حذف خطة الأقساط هذه؟"
```

- [ ] **Step 3: Verify build**

Run: `cd frontend && pnpm build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/debts/card-installments-tab.tsx frontend/src/components/debts/store-installments-tab.tsx frontend/src/components/debts/financing-apps-tab.tsx frontend/src/messages/en.json frontend/src/messages/ar.json
git commit -m "feat(debts): add inline edit/delete to installment tab rows"
```

---

### Task 3.7: Frontend — name_ar in Account Forms and Financing Apps Tab

**Files:**
- Modify: `frontend/src/hooks/use-accounts.ts` (add `name_ar` to Account interface)
- Modify: account form component (wherever account create/edit form lives)
- Modify: `frontend/src/components/debts/financing-apps-tab.tsx`

- [ ] **Step 1: Add name_ar to Account TypeScript type**

In `frontend/src/hooks/use-accounts.ts`, add to the `Account` interface:

```typescript
  name_ar: string | null;
```

- [ ] **Step 2: Add name_ar field to account create/edit form**

Find the account form component (likely in `frontend/src/components/accounts/`). Add:

```tsx
<div className="space-y-2">
  <Label htmlFor="account-name-ar">{t("nameAr")}</Label>
  <Input
    id="account-name-ar"
    value={nameAr}
    onChange={(e) => setNameAr(e.target.value)}
    dir="rtl"
  />
</div>
```

Include `name_ar: nameAr || null` in the create/update mutation payload.

- [ ] **Step 3: Display name_ar in financing apps tab**

In `frontend/src/components/debts/financing-apps-tab.tsx`, where the app name is displayed, use the locale to choose:

```typescript
import { useLocale } from "next-intl";
// ...
const locale = useLocale();
const displayName = locale === "ar" && app.name_ar ? app.name_ar : app.name;
```

- [ ] **Step 4: Verify build**

Run: `cd frontend && pnpm build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/use-accounts.ts frontend/src/components/accounts/ frontend/src/components/debts/financing-apps-tab.tsx
git commit -m "feat(accounts): add name_ar to account forms and financing apps display"
```

---

### Task 3.6: Frontend — Provider Autocomplete for Financing Apps

**Files:**
- Modify: `frontend/src/components/debts/installment-form.tsx`

- [ ] **Step 1: Add provider suggestions constant**

```typescript
const FINANCING_PROVIDERS = [
  "ValU",
  "Souhoola",
  "Sympl",
  "Forsa",
  "Tru",
  "Contact",
  "Shahry",
];
```

- [ ] **Step 2: Replace name input with combobox when type=financing_app**

When `type === "financing_app"`, replace the plain `Input` for name with a datalist-backed input:

```tsx
<div className="space-y-2">
  <Label htmlFor="inst-name">{t("name")}</Label>
  {type === "financing_app" && !isEdit ? (
    <>
      <Input
        id="inst-name"
        list="provider-suggestions"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("selectProvider")}
        required
      />
      <datalist id="provider-suggestions">
        {FINANCING_PROVIDERS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </>
  ) : (
    <Input
      id="inst-name"
      value={name}
      onChange={(e) => setName(e.target.value)}
      required
    />
  )}
</div>
```

- [ ] **Step 3: Add i18n key**

English: `"selectProvider": "Select or type provider name"`
Arabic: `"selectProvider": "اختر أو اكتب اسم مزود التمويل"`

- [ ] **Step 4: Verify build**

Run: `cd frontend && pnpm build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/debts/installment-form.tsx frontend/src/messages/en.json frontend/src/messages/ar.json
git commit -m "feat(debts): add provider autocomplete for financing app installments"
```

---

## Unit 4: Cross-Cutting Polish

### Task 4.1: Backend — RBAC Guards on All Routers

**Files:**
- Modify: `backend/app/routers/accounts.py`
- Modify: `backend/app/routers/transactions.py`
- Modify: `backend/app/routers/transfers.py`
- Modify: `backend/app/routers/categories.py`
- Modify: `backend/app/routers/installments.py`
- Create: `backend/tests/routers/test_rbac.py`

- [ ] **Step 1: Write failing RBAC tests**

Create `backend/tests/routers/test_rbac.py`:

```python
"""RBAC tests — verify CHILD role cannot mutate resources."""

import pytest

from app.dependencies_rbac import get_member_role
from app.main import app
from app.models.enums import HouseholdRole


@pytest.fixture
def child_role():
    """Override role to CHILD for this test."""
    async def _child() -> HouseholdRole:
        return HouseholdRole.CHILD
    app.dependency_overrides[get_member_role] = _child
    yield
    # conftest's override_deps fixture will reset on teardown


@pytest.mark.asyncio
async def test_child_cannot_create_account(client, child_role):
    resp = await client.post(
        "/api/v1/accounts",
        json={"name": "Test", "type": "bank_account", "currency": "EGP"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_child_can_list_accounts(client, child_role):
    resp = await client.get("/api/v1/accounts")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_child_cannot_create_transaction(client, child_role):
    resp = await client.post(
        "/api/v1/transactions",
        json={
            "account_id": 1,
            "date": "2026-04-01",
            "description": "Test",
            "amount_minor": 1000,
            "type": "debit",
        },
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_child_can_list_transactions(client, child_role):
    resp = await client.get("/api/v1/transactions")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_child_cannot_create_transfer(client, child_role):
    resp = await client.post(
        "/api/v1/transfers",
        json={
            "from_account_id": 1,
            "to_account_id": 2,
            "amount_minor": 1000,
            "date": "2026-04-01",
        },
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_child_cannot_create_category(client, child_role):
    resp = await client.post(
        "/api/v1/categories",
        json={"name_en": "Test", "type": "expense"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_child_can_list_categories(client, child_role):
    resp = await client.get("/api/v1/categories")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_child_cannot_create_installment(client, child_role):
    resp = await client.post(
        "/api/v1/installments",
        json={
            "type": "store",
            "name": "Test",
            "total_amount_minor": 100000,
            "monthly_amount_minor": 10000,
            "total_months": 10,
            "start_month": "2026-01-01",
            "currency": "EGP",
        },
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_child_can_list_installments(client, child_role):
    resp = await client.get("/api/v1/installments")
    assert resp.status_code == 200
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/routers/test_rbac.py -x -q`
Expected: FAIL — mutation endpoints return 200/201 for child role.

- [ ] **Step 3: Add RBAC to accounts router**

In `backend/app/routers/accounts.py`, add imports:

```python
from app.dependencies_rbac import get_member_role, require_role
from app.models.enums import HouseholdRole
```

Add `role: HouseholdRole = Depends(get_member_role)` to read endpoints (list, get, net-worth).

Add `role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER))` to mutating endpoints (create, update, delete, reconcile).

- [ ] **Step 4: Add RBAC to transactions router**

Same pattern: `get_member_role` for reads, `require_role(ADMIN, MEMBER)` for create/update/delete/split/categorize/bulk operations.

- [ ] **Step 5: Add RBAC to transfers router**

`require_role(ADMIN, MEMBER)` on all endpoints (create, delete). `get_member_role` on list.

- [ ] **Step 6: Add RBAC to categories router**

`get_member_role` for list. `require_role(ADMIN, MEMBER)` for create/update/delete.

- [ ] **Step 7: Add RBAC to installments router**

`get_member_role` for list/get. `require_role(ADMIN, MEMBER)` for create/update/delete/complete.

- [ ] **Step 8: Run RBAC tests**

Run: `cd backend && uv run pytest tests/routers/test_rbac.py -x -q`
Expected: ALL PASS

- [ ] **Step 9: Run full test suite**

Run: `cd backend && uv run pytest tests/ -x -q`
Expected: ALL PASS

- [ ] **Step 10: Commit**

```bash
git add backend/app/routers/accounts.py backend/app/routers/transactions.py backend/app/routers/transfers.py backend/app/routers/categories.py backend/app/routers/installments.py backend/tests/routers/test_rbac.py
git commit -m "feat(rbac): extend role-based access control to all routers"
```

---

### Task 4.2: Backend — Bulk Person Balances FX

**Files:**
- Modify: `backend/app/services/person.py`

- [ ] **Step 1: Write failing test**

Add to an appropriate test file (or create `backend/tests/services/test_person_service.py`):

```python
@pytest.mark.asyncio
async def test_bulk_person_balances_includes_fx(client):
    """Bulk person list should include total_base_minor per person."""
    person = await client.post("/api/v1/persons", json={"name": "Ahmed"})
    person_id = person.json()["data"]["id"]

    resp = await client.get("/api/v1/persons")
    persons = resp.json()["data"]
    assert len(persons) >= 1
    ahmed = next(p for p in persons if p["id"] == person_id)
    # total_base_minor should exist in balances (even if 0 — no debts)
    assert ahmed["balances"] is not None
    assert "total_base_minor" in ahmed["balances"]
```

- [ ] **Step 2: Update compute_persons_balances_bulk**

In `backend/app/services/person.py`, import the FX service and update `compute_persons_balances_bulk` to call `convert_to_base` for each person's by-currency balances, populating `total_base_minor`, `base_currency`, and `fx_warnings`. Mirror the logic from `compute_person_balances` (single-person version).

- [ ] **Step 3: Run test**

Run: `cd backend && uv run pytest tests/ -x -q -k "bulk_person_balances"`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/person.py backend/tests/
git commit -m "feat(persons): add FX conversion to bulk person balances"
```

---

### Task 4.3: Backend — Credit Utilization in Debts Endpoint

**Files:**
- Modify: `backend/app/schemas/debt.py`
- Modify: `backend/app/routers/debts.py`

- [ ] **Step 1: Add field to DebtResponse**

In `backend/app/schemas/debt.py`, add to `DebtResponse`:

```python
    credit_utilization_percent: float | None = None
```

- [ ] **Step 2: Update _debt_to_response in router**

In `backend/app/routers/debts.py`, update `_debt_to_response` to accept an optional `credit_utilization_percent`:

```python
def _debt_to_response(
    debt, total_paid: int = 0, remaining: int | None = None,
    credit_utilization_percent: float | None = None,
) -> DebtResponse:
    # ... existing code ...
    return DebtResponse(
        # ... existing fields ...
        credit_utilization_percent=credit_utilization_percent,
    )
```

- [ ] **Step 3: Compute utilization in list and get endpoints**

In the `list_debts` and `get_debt` endpoints, after loading the debt, check if it has a `linked_account_id` and load the account to compute utilization:

```python
# In list_debts — after loading debts and totals
account_ids = [d.linked_account_id for d in debts if d.linked_account_id]
# Batch load accounts if needed, compute utilization per debt
```

For simplicity, add a helper:

```python
async def _compute_utilization(
    session: AsyncSession, household_id: uuid.UUID, linked_account_id: int | None
) -> float | None:
    if not linked_account_id:
        return None
    from app.models.account import Account
    from app.models.enums import AccountType
    acct = await session.get(Account, linked_account_id)
    if not acct or acct.type != AccountType.CREDIT_CARD or not acct.credit_limit or acct.credit_limit <= 0:
        return None
    from app.services.account import compute_displayed_balance
    displayed = await compute_displayed_balance(session, acct)
    used = abs(min(displayed, 0))
    return round(used / acct.credit_limit * 100, 1)
```

- [ ] **Step 4: Run tests**

Run: `cd backend && uv run pytest tests/ -x -q`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/debt.py backend/app/routers/debts.py
git commit -m "feat(debts): add credit_utilization_percent to debts response"
```

---

### Task 4.4: Frontend — Auto-Match Suggestions UI

**Files:**
- Modify: `frontend/src/components/debts/record-payment-form.tsx`
- Modify: `frontend/src/components/debts/loan-detail-content.tsx`
- Modify: `frontend/src/lib/types/debts.ts`
- Modify: `frontend/src/messages/en.json`
- Modify: `frontend/src/messages/ar.json`

- [ ] **Step 1: Add i18n keys**

English under `debts.form.payment`:
```json
"suggestedMatches": "Suggested Matches",
"useThis": "Use this",
"noMatches": "No matching transactions found"
```

Arabic under `debts.form.payment`:
```json
"suggestedMatches": "مطابقات مقترحة",
"useThis": "استخدم هذا",
"noMatches": "لم يتم العثور على معاملات مطابقة"
```

- [ ] **Step 2: Update RecordPaymentForm props and state**

Add props:
```typescript
interface RecordPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtId: number;
  currency: string;
  debtType?: string;
  linkedAccountId?: number | null;
  showMatchSuggestions?: boolean;
}
```

Add state:
```typescript
const [linkExistingTxId, setLinkExistingTxId] = useState<number | null>(null);
```

- [ ] **Step 3: Fetch and display match suggestions**

Import `useMatchSuggestions` from hooks. Only fetch when `showMatchSuggestions` is true:

```typescript
const { data: matchData } = useMatchSuggestions(
  showMatchSuggestions ? debtId : 0
);
const suggestions = matchData?.data ?? [];
```

Add the suggestions UI below the notes field, before submit:

```tsx
{showMatchSuggestions && suggestions.length > 0 && (
  <div className="space-y-2">
    <Label className="text-sm font-medium">{t("suggestedMatches")}</Label>
    <div className="space-y-1">
      {suggestions.map((s) => (
        <div
          key={s.transaction_id}
          className="flex items-center justify-between rounded-md border p-2 text-sm"
        >
          <div>
            <span className="font-medium">{s.date}</span>
            <span className="ms-2 text-muted-foreground">{s.description}</span>
          </div>
          <div className="flex items-center gap-2">
            <MoneyDisplay amount={s.amount_minor} currency={currency} size="sm" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAmount(formatAmountForInput(s.amount_minor, currency));
                setDate(s.date);
                setLinkExistingTxId(s.transaction_id);
                setAccountId(String(linkedAccountId ?? ""));
              }}
            >
              {t("useThis")}
            </Button>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

{showMatchSuggestions && suggestions.length === 0 && (
  <p className="text-xs text-muted-foreground">{t("noMatches")}</p>
)}
```

- [ ] **Step 4: Include link_existing_transaction_id in submit**

```typescript
mutation.mutate(
  {
    date,
    amount_minor: parseMajorToMinor(amount, CURRENCIES[currency]?.exponent ?? 2),
    account_id: parseInt(accountId, 10),
    link_existing_transaction_id: linkExistingTxId,
    notes: notes || null,
  },
  { onSuccess: () => { onOpenChange(false); resetFields(); } }
);
```

- [ ] **Step 5: When link is set, make account selector read-only**

When `linkExistingTxId` is set, disable the account selector and show a note that it's linked to an existing transaction.

- [ ] **Step 6: Update LoanDetailContent to pass showMatchSuggestions**

```tsx
<RecordPaymentForm
  open={paymentOpen}
  onOpenChange={setPaymentOpen}
  debtId={debtId}
  currency={debt.currency}
  debtType={debt.type}
  linkedAccountId={debt.linked_account_id}
  showMatchSuggestions={!!debt.linked_account_id}
/>
```

- [ ] **Step 7: Verify build**

Run: `cd frontend && pnpm build`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/debts/record-payment-form.tsx frontend/src/components/debts/loan-detail-content.tsx frontend/src/messages/en.json frontend/src/messages/ar.json
git commit -m "feat(debts): add auto-match suggestions UI for loan payments"
```

---

### Task 4.5: Final i18n Audit and Cleanup

**Files:**
- Modify: `frontend/src/messages/en.json`
- Modify: `frontend/src/messages/ar.json`

- [ ] **Step 1: Grep for hardcoded English in debt components**

Run: `grep -rn '"[A-Z][a-z]' frontend/src/components/debts/ --include='*.tsx' | grep -v 'import\|from\|console\|className\|key=\|value='`

Fix any remaining hardcoded strings by moving them to i18n.

- [ ] **Step 2: Add RBAC error messages**

English under `common`:
```json
"permissionDenied": "You don't have permission to perform this action"
```

Arabic under `common`:
```json
"permissionDenied": "ليس لديك صلاحية لتنفيذ هذا الإجراء"
```

- [ ] **Step 3: Verify build**

Run: `cd frontend && pnpm build`
Expected: build succeeds.

- [ ] **Step 4: Run backend tests one final time**

Run: `cd backend && uv run pytest tests/ -x -q`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/messages/en.json frontend/src/messages/ar.json frontend/src/components/debts/
git commit -m "chore(debts): final i18n audit — remove hardcoded strings"
```

---

## Summary

| Unit | Tasks | Backend Changes | Frontend Changes | Tests |
|------|-------|----------------|-----------------|-------|
| 1 | 1.1–1.10 | Seed categories, PaymentCreate schema, record_payment auto-tx, P2P creation auto-tx | Types, payment form + P2P form account selectors, cache invalidation | ~8 new tests |
| 2 | 2.1–2.3 | Migration, model, schema, router for annual_rate_bps | Types, rate field in installment form | ~2 new tests |
| 3 | 3.1–3.7 | Migration for name_ar, delete payment_count, P2P edit verification | Custom splits, edit/delete on detail pages + installment tab rows, provider autocomplete, name_ar in account forms + financing apps display | ~2 new tests |
| 4 | 4.1–4.5 | RBAC on 5 routers, bulk FX, credit utilization | Match suggestions UI, i18n audit | ~10 new tests |
