# Phase 3B: P2P Debts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the debt system to support P2P debts (personal_lent, personal_borrowed) with 3 repayment modes (lump_sum, equal_splits, custom_splits), split schedule management, payment recording against splits, person card balance computation with multi-currency FX conversion, and settlement detection.

**Architecture:** Extends the existing `debt` service/router/schema triad from Phase 3A. The `DebtCreate` schema widens from `Literal["bank_loan"]` to accept P2P types. A new `create_p2p_debt` service function handles split generation. Person service gains `compute_person_balances` for per-currency net balance aggregation with FX conversion through the existing `exchange_rates` table. A new `P2PDebtSplitResponse` schema and `/debts/{id}/splits` endpoint expose the split schedule.

**Tech Stack:** Python 3.12, FastAPI (async def), Pydantic V2, SQLAlchemy async, pytest + httpx, SQLite in-memory for tests

**Spec Reference:** `docs/superpowers/specs/2026-04-01-phase3-debts-installments-design.md` §4 (Sub-Phase 3B: P2P Debts)

**Phase 3A Handoff:** `docs/superpowers/handoff/phase-3-unit-3A.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `backend/app/schemas/debt.py` | Modify | Widen `DebtCreate.type` to accept P2P types, add `P2PDebtCreateFields`, add `SplitInput`, add `P2PDebtSplitResponse` |
| `backend/app/schemas/person.py` | Modify | Add `CurrencyBalance`, `PersonBalances`, extend `PersonResponse` with balance fields |
| `backend/app/services/debt.py` | Modify | Add `create_p2p_debt`, `_generate_equal_splits`, `_generate_lump_sum_split`, `get_splits`, `record_p2p_payment`; extend `record_payment` for P2P |
| `backend/app/services/person.py` | Modify | Add `compute_person_balances` with multi-currency aggregation + FX |
| `backend/app/routers/debts.py` | Modify | Wire P2P creation in `create_debt`, add `GET /{id}/splits` endpoint |
| `backend/app/routers/persons.py` | Modify | Enrich person responses with computed balances |
| `backend/tests/services/test_p2p_splits.py` | Create | Unit tests for split generation logic (equal/custom/lump_sum) |
| `backend/tests/services/test_person_balances.py` | Create | Unit tests for balance computation + FX conversion |
| `backend/tests/routers/test_p2p_debts.py` | Create | Integration tests for P2P debt endpoints |

---

## Task 1: Extend Debt Schemas for P2P Types

**Files:**
- Modify: `backend/app/schemas/debt.py`

- [ ] **Step 1: Write the test — verify P2P schema accepts personal_lent**

```python
# backend/tests/schemas/test_debt_schemas.py
import pytest
from datetime import date
from app.schemas.debt import DebtCreate, SplitInput, P2PDebtSplitResponse


class TestDebtCreateP2P:
    def test_personal_lent_lump_sum_accepted(self):
        data = DebtCreate(
            type="personal_lent",
            name="Loan to Ahmed",
            principal_minor=500000,
            currency="EGP",
            annual_rate_percent=0,
            tenure_months=1,
            start_date=date(2024, 6, 1),
            person_id=1,
            repayment_mode="lump_sum",
            due_date=date(2024, 7, 1),
        )
        assert data.type == "personal_lent"
        assert data.repayment_mode == "lump_sum"

    def test_personal_borrowed_equal_splits_accepted(self):
        data = DebtCreate(
            type="personal_borrowed",
            name="Borrowed from Sara",
            principal_minor=1200000,
            currency="EGP",
            annual_rate_percent=0,
            tenure_months=6,
            start_date=date(2024, 6, 1),
            person_id=2,
            repayment_mode="equal_splits",
            split_count=6,
        )
        assert data.type == "personal_borrowed"
        assert data.split_count == 6

    def test_custom_splits_with_split_input(self):
        splits = [
            SplitInput(amount_minor=300000, due_date=date(2024, 7, 1)),
            SplitInput(amount_minor=200000, due_date=date(2024, 8, 1)),
        ]
        data = DebtCreate(
            type="personal_lent",
            name="Custom split debt",
            principal_minor=500000,
            currency="EGP",
            annual_rate_percent=0,
            tenure_months=2,
            start_date=date(2024, 6, 1),
            person_id=1,
            repayment_mode="custom_splits",
            splits=splits,
        )
        assert len(data.splits) == 2
        assert data.splits[0].amount_minor == 300000

    def test_bank_loan_type_still_accepted(self):
        data = DebtCreate(
            type="bank_loan",
            name="Car Loan",
            principal_minor=5000000,
            currency="EGP",
            annual_rate_percent=14.5,
            tenure_months=60,
            start_date=date(2024, 1, 1),
        )
        assert data.type == "bank_loan"

    def test_p2p_split_response_schema(self):
        resp = P2PDebtSplitResponse(
            id=1,
            debt_id=10,
            amount_minor=100000,
            due_date=date(2024, 7, 1),
            paid=False,
            payment_id=None,
            status="upcoming",
        )
        assert resp.status == "upcoming"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/schemas/test_debt_schemas.py -v`
Expected: FAIL — `SplitInput` and `P2PDebtSplitResponse` do not exist, `DebtCreate.type` rejects "personal_lent"

- [ ] **Step 3: Implement schema changes**

Replace the content of `backend/app/schemas/debt.py`:

```python
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class SplitInput(BaseModel):
    """User-provided split for custom_splits repayment mode."""

    amount_minor: int = Field(gt=0)
    due_date: date


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


class DebtUpdate(BaseModel):
    name: str | None = None
    institution: str | None = None
    linked_account_id: int | None = None
    notes: str | None = None


class DebtResponse(BaseModel):
    id: int
    type: str
    person_id: int | None = None
    linked_account_id: int | None = None
    name: str
    institution: str | None = None
    principal_minor: int
    currency: str
    annual_rate_bps: int
    tenure_months: int
    start_date: date
    monthly_payment_minor: int
    repayment_mode: str | None = None
    due_date: date | None = None
    status: Literal["active", "paid_off"]
    notes: str | None = None
    is_active: bool
    total_paid_minor: int = 0
    remaining_minor: int = 0

    model_config = {"from_attributes": True}


class PaymentCreate(BaseModel):
    date: date
    amount_minor: int = Field(gt=0)
    transaction_id: int | None = None
    notes: str | None = None


class PaymentResponse(BaseModel):
    id: int
    debt_id: int
    date: date
    amount_minor: int
    principal_minor: int | None = None
    interest_minor: int | None = None
    transaction_id: int | None = None
    notes: str | None = None

    model_config = {"from_attributes": True}


class ScheduleRow(BaseModel):
    payment_number: int
    date: date
    payment_minor: int
    principal_minor: int
    interest_minor: int
    remaining_minor: int
    status: Literal["paid", "overdue", "upcoming"]


class MatchSuggestion(BaseModel):
    transaction_id: int
    date: date
    amount_minor: int
    description: str
    score: float = Field(ge=0.0, le=1.0)


class P2PDebtSplitResponse(BaseModel):
    id: int
    debt_id: int
    amount_minor: int
    due_date: date
    paid: bool
    payment_id: int | None = None
    status: Literal["paid", "overdue", "upcoming"]

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/schemas/test_debt_schemas.py -v`
Expected: 5 PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/debt.py backend/tests/schemas/test_debt_schemas.py
git commit -m "feat(debts): widen DebtCreate for P2P types, add SplitInput and P2PDebtSplitResponse schemas"
```

---

## Task 2: P2P Split Generation Logic (Service Layer)

**Files:**
- Create: `backend/tests/services/test_p2p_splits.py`
- Modify: `backend/app/services/debt.py`

- [ ] **Step 1: Write the failing tests for split generation**

```python
# backend/tests/services/test_p2p_splits.py
import pytest
from datetime import date

from app.services.debt import generate_equal_splits, generate_lump_sum_split


class TestGenerateEqualSplits:
    def test_even_division(self):
        """1,200,000 / 6 = 200,000 each."""
        splits = generate_equal_splits(
            principal_minor=1200000,
            split_count=6,
            start_date=date(2024, 6, 1),
        )
        assert len(splits) == 6
        assert all(s["amount_minor"] == 200000 for s in splits)
        assert splits[0]["due_date"] == date(2024, 7, 1)
        assert splits[5]["due_date"] == date(2024, 12, 1)

    def test_remainder_absorbed_by_last_split(self):
        """1,000,000 / 3 = 333,333 + 333,333 + 333,334."""
        splits = generate_equal_splits(
            principal_minor=1000000,
            split_count=3,
            start_date=date(2024, 6, 1),
        )
        assert len(splits) == 3
        total = sum(s["amount_minor"] for s in splits)
        assert total == 1000000
        assert splits[0]["amount_minor"] == 333333
        assert splits[1]["amount_minor"] == 333333
        assert splits[2]["amount_minor"] == 333334

    def test_single_split(self):
        """split_count=1 means single payment."""
        splits = generate_equal_splits(
            principal_minor=500000,
            split_count=1,
            start_date=date(2024, 6, 1),
        )
        assert len(splits) == 1
        assert splits[0]["amount_minor"] == 500000
        assert splits[0]["due_date"] == date(2024, 7, 1)

    def test_dates_are_monthly(self):
        splits = generate_equal_splits(
            principal_minor=400000,
            split_count=4,
            start_date=date(2024, 11, 15),
        )
        assert splits[0]["due_date"] == date(2024, 12, 15)
        assert splits[1]["due_date"] == date(2025, 1, 15)
        assert splits[2]["due_date"] == date(2025, 2, 15)
        assert splits[3]["due_date"] == date(2025, 3, 15)


class TestGenerateLumpSumSplit:
    def test_single_split_at_due_date(self):
        splits = generate_lump_sum_split(
            principal_minor=500000,
            due_date=date(2024, 12, 31),
        )
        assert len(splits) == 1
        assert splits[0]["amount_minor"] == 500000
        assert splits[0]["due_date"] == date(2024, 12, 31)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/services/test_p2p_splits.py -v`
Expected: FAIL — `generate_equal_splits` and `generate_lump_sum_split` do not exist

- [ ] **Step 3: Implement split generation functions**

Add to the bottom of `backend/app/services/debt.py` (before the private helpers section):

```python
from dateutil.relativedelta import relativedelta


def generate_equal_splits(
    principal_minor: int,
    split_count: int,
    start_date: date,
) -> list[dict]:
    """Generate N equal monthly splits. Last split absorbs rounding remainder.

    Pure computation — no DB access.
    """
    base_amount = principal_minor // split_count
    remainder = principal_minor - (base_amount * split_count)
    splits = []
    for i in range(split_count):
        amount = base_amount + (remainder if i == split_count - 1 else 0)
        due = start_date + relativedelta(months=i + 1)
        splits.append({"amount_minor": amount, "due_date": due})
    return splits


def generate_lump_sum_split(
    principal_minor: int,
    due_date: date,
) -> list[dict]:
    """Single split at the given due date.

    Pure computation — no DB access.
    """
    return [{"amount_minor": principal_minor, "due_date": due_date}]
```

Also add the `relativedelta` import at the top of `backend/app/services/debt.py`:

```python
from dateutil.relativedelta import relativedelta
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/services/test_p2p_splits.py -v`
Expected: 5 PASS

- [ ] **Step 5: Run existing debt tests to confirm no regression**

Run: `cd backend && uv run pytest tests/routers/test_debts.py tests/services/test_amortization.py -v`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/debt.py backend/tests/services/test_p2p_splits.py
git commit -m "feat(debts): add pure split generation functions for P2P debts"
```

---

## Task 3: P2P Debt Creation Service

**Files:**
- Modify: `backend/app/services/debt.py`
- Create: `backend/tests/routers/test_p2p_debts.py` (start with creation tests)

- [ ] **Step 1: Write integration tests for P2P debt creation (all 3 modes)**

```python
# backend/tests/routers/test_p2p_debts.py
import pytest
from tests.conftest import TEST_HOUSEHOLD_ID
from app.models.person import Person


def _create_p2p_payload(person_id: int, **overrides):
    payload = {
        "type": "personal_lent",
        "name": "Loan to Ahmed",
        "principal_minor": 600000,
        "currency": "EGP",
        "annual_rate_percent": 0,
        "tenure_months": 6,
        "start_date": "2024-06-01",
        "person_id": person_id,
        "repayment_mode": "equal_splits",
        "split_count": 6,
    }
    payload.update(overrides)
    return payload


async def _create_person(client, name="Ahmed Ali"):
    resp = await client.post("/api/v1/persons", json={"name": name})
    return resp.json()["data"]["id"]


@pytest.mark.asyncio
async def test_create_p2p_lent_equal_splits(client):
    person_id = await _create_person(client)
    payload = _create_p2p_payload(person_id)
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["type"] == "personal_lent"
    assert data["person_id"] == person_id
    assert data["repayment_mode"] == "equal_splits"
    assert data["status"] == "active"
    assert data["annual_rate_bps"] == 0


@pytest.mark.asyncio
async def test_create_p2p_borrowed_lump_sum(client):
    person_id = await _create_person(client, "Sara")
    payload = _create_p2p_payload(
        person_id,
        type="personal_borrowed",
        name="Borrowed from Sara",
        repayment_mode="lump_sum",
        due_date="2024-12-31",
        split_count=None,
    )
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["type"] == "personal_borrowed"
    assert data["repayment_mode"] == "lump_sum"
    assert data["due_date"] == "2024-12-31"


@pytest.mark.asyncio
async def test_create_p2p_custom_splits(client):
    person_id = await _create_person(client, "Omar")
    payload = _create_p2p_payload(
        person_id,
        name="Custom split debt",
        principal_minor=500000,
        repayment_mode="custom_splits",
        split_count=None,
        splits=[
            {"amount_minor": 300000, "due_date": "2024-07-01"},
            {"amount_minor": 200000, "due_date": "2024-08-01"},
        ],
    )
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["type"] == "personal_lent"
    assert data["repayment_mode"] == "custom_splits"


@pytest.mark.asyncio
async def test_create_p2p_custom_splits_sum_mismatch_fails(client):
    person_id = await _create_person(client, "Bad Splits")
    payload = _create_p2p_payload(
        person_id,
        principal_minor=500000,
        repayment_mode="custom_splits",
        split_count=None,
        splits=[
            {"amount_minor": 300000, "due_date": "2024-07-01"},
            {"amount_minor": 100000, "due_date": "2024-08-01"},
        ],
    )
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 422
    assert "SPLITS_SUM_MISMATCH" in response.json()["detail"]["error"]["code"]


@pytest.mark.asyncio
async def test_create_p2p_without_person_fails(client):
    payload = _create_p2p_payload(
        person_id=None,
        type="personal_lent",
    )
    # person_id is None — must be rejected
    payload["person_id"] = None
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 422
    assert "PERSON_REQUIRED" in response.json()["detail"]["error"]["code"]


@pytest.mark.asyncio
async def test_create_p2p_with_nonexistent_person_fails(client):
    payload = _create_p2p_payload(person_id=99999)
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 404
    assert "PERSON_NOT_FOUND" in response.json()["detail"]["error"]["code"]


@pytest.mark.asyncio
async def test_equal_splits_requires_split_count(client):
    person_id = await _create_person(client)
    payload = _create_p2p_payload(
        person_id,
        repayment_mode="equal_splits",
        split_count=None,
    )
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 422
    assert "SPLIT_COUNT_REQUIRED" in response.json()["detail"]["error"]["code"]


@pytest.mark.asyncio
async def test_lump_sum_requires_due_date(client):
    person_id = await _create_person(client)
    payload = _create_p2p_payload(
        person_id,
        repayment_mode="lump_sum",
        split_count=None,
        due_date=None,
    )
    response = await client.post("/api/v1/debts", json=payload)
    assert response.status_code == 422
    assert "DUE_DATE_REQUIRED" in response.json()["detail"]["error"]["code"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/routers/test_p2p_debts.py -v`
Expected: FAIL — P2P debt types not wired in router

- [ ] **Step 3: Implement create_p2p_debt service function**

Add to `backend/app/services/debt.py` after `create_bank_loan`:

```python
from app.models.p2p_debt_split import P2PDebtSplit
from app.models.person import Person
from app.schemas.debt import SplitInput


async def create_p2p_debt(
    session: AsyncSession,
    household_id: uuid.UUID,
    data: DebtCreate,
) -> Debt:
    """Create a P2P debt with splits based on repayment mode."""
    # Validate person_id is provided and exists
    if not data.person_id:
        raise ValueError("PERSON_REQUIRED")

    person_q = select(Person).where(
        Person.id == data.person_id,
        Person.household_id == household_id,
        Person.is_active.is_(True),
    )
    person = (await session.execute(person_q)).scalar_one_or_none()
    if not person:
        raise ValueError("PERSON_NOT_FOUND")

    # Validate repayment mode requirements
    mode = data.repayment_mode
    if mode == "lump_sum" and not data.due_date:
        raise ValueError("DUE_DATE_REQUIRED")
    if mode == "equal_splits" and not data.split_count:
        raise ValueError("SPLIT_COUNT_REQUIRED")
    if mode == "custom_splits":
        if not data.splits:
            raise ValueError("SPLITS_REQUIRED")
        splits_total = sum(s.amount_minor for s in data.splits)
        if splits_total != data.principal_minor:
            raise ValueError("SPLITS_SUM_MISMATCH")

    # P2P debts are always 0% interest; monthly_payment is principal / tenure
    monthly_payment = data.principal_minor // data.tenure_months

    debt_type = DebtType.PERSONAL_LENT if data.type == "personal_lent" else DebtType.PERSONAL_BORROWED
    repayment_mode_enum = None
    if mode:
        from app.models.enums import RepaymentMode

        repayment_mode_enum = RepaymentMode(mode)

    debt = Debt(
        household_id=household_id,
        type=debt_type,
        person_id=data.person_id,
        name=data.name,
        institution=data.institution,
        principal_minor=data.principal_minor,
        currency=data.currency,
        annual_rate_bps=0,
        tenure_months=data.tenure_months,
        start_date=data.start_date,
        monthly_payment_minor=monthly_payment,
        repayment_mode=repayment_mode_enum,
        due_date=data.due_date,
        linked_account_id=data.linked_account_id,
        notes=data.notes,
        status=DebtStatus.ACTIVE,
    )
    session.add(debt)
    await session.flush()

    # Generate splits based on mode
    raw_splits: list[dict] = []
    if mode == "lump_sum":
        raw_splits = generate_lump_sum_split(data.principal_minor, data.due_date)
    elif mode == "equal_splits":
        raw_splits = generate_equal_splits(data.principal_minor, data.split_count, data.start_date)
    elif mode == "custom_splits":
        raw_splits = [{"amount_minor": s.amount_minor, "due_date": s.due_date} for s in data.splits]

    for s in raw_splits:
        split = P2PDebtSplit(
            debt_id=debt.id,
            amount_minor=s["amount_minor"],
            due_date=s["due_date"],
        )
        session.add(split)
    await session.flush()

    return debt
```

- [ ] **Step 4: Wire P2P creation into the router**

In `backend/app/routers/debts.py`, modify the `create_debt` endpoint's body (lines 114–126):

Replace:
```python
    try:
        if data.type == "bank_loan":
            debt = await debt_service.create_bank_loan(session, household_id, data)
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=ErrorResponse(
                    error=ErrorDetail(
                        code="UNSUPPORTED_DEBT_TYPE",
                        message=f"Debt type '{data.type}' is not supported in this phase",
                    )
                ).model_dump(),
            )
    except ValueError as e:
        err_code = str(e)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorResponse(error=ErrorDetail(code=err_code, message=err_code)).model_dump(),
        )
```

With:
```python
    try:
        if data.type == "bank_loan":
            debt = await debt_service.create_bank_loan(session, household_id, data)
        elif data.type in ("personal_lent", "personal_borrowed"):
            debt = await debt_service.create_p2p_debt(session, household_id, data)
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=ErrorResponse(
                    error=ErrorDetail(
                        code="UNSUPPORTED_DEBT_TYPE",
                        message=f"Debt type '{data.type}' is not supported",
                    )
                ).model_dump(),
            )
    except ValueError as e:
        err_code = str(e)
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        if err_code == "PERSON_NOT_FOUND":
            status_code = status.HTTP_404_NOT_FOUND
        raise HTTPException(
            status_code=status_code,
            detail=ErrorResponse(error=ErrorDetail(code=err_code, message=err_code)).model_dump(),
        )
```

- [ ] **Step 5: Run P2P creation tests**

Run: `cd backend && uv run pytest tests/routers/test_p2p_debts.py -v`
Expected: 8 PASS

- [ ] **Step 6: Run full test suite to confirm no regression**

Run: `cd backend && uv run pytest tests/ -v --tb=short`
Expected: All PASS (existing + new)

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/debt.py backend/app/routers/debts.py backend/tests/routers/test_p2p_debts.py
git commit -m "feat(debts): implement P2P debt creation with 3 repayment modes"
```

---

## Task 4: Splits Endpoint and P2P Payment Recording

**Files:**
- Modify: `backend/app/services/debt.py`
- Modify: `backend/app/routers/debts.py`
- Modify: `backend/tests/routers/test_p2p_debts.py` (add split + payment tests)

- [ ] **Step 1: Write tests for GET splits endpoint and P2P payment recording**

Append to `backend/tests/routers/test_p2p_debts.py`:

```python
@pytest.mark.asyncio
async def test_get_splits_for_equal_splits_debt(client):
    person_id = await _create_person(client, "Split Person")
    payload = _create_p2p_payload(
        person_id,
        principal_minor=600000,
        split_count=3,
        tenure_months=3,
    )
    create_resp = await client.post("/api/v1/debts", json=payload)
    debt_id = create_resp.json()["data"]["id"]

    response = await client.get(f"/api/v1/debts/{debt_id}/splits")
    assert response.status_code == 200
    splits = response.json()["data"]
    assert len(splits) == 3
    assert all(s["amount_minor"] == 200000 for s in splits)
    assert all(s["paid"] is False for s in splits)
    assert all(s["status"] in ("overdue", "upcoming") for s in splits)


@pytest.mark.asyncio
async def test_get_splits_for_custom_splits_debt(client):
    person_id = await _create_person(client, "Custom Person")
    payload = _create_p2p_payload(
        person_id,
        principal_minor=500000,
        repayment_mode="custom_splits",
        split_count=None,
        tenure_months=2,
        splits=[
            {"amount_minor": 300000, "due_date": "2024-07-01"},
            {"amount_minor": 200000, "due_date": "2024-08-01"},
        ],
    )
    create_resp = await client.post("/api/v1/debts", json=payload)
    debt_id = create_resp.json()["data"]["id"]

    response = await client.get(f"/api/v1/debts/{debt_id}/splits")
    assert response.status_code == 200
    splits = response.json()["data"]
    assert len(splits) == 2
    assert splits[0]["amount_minor"] == 300000
    assert splits[1]["amount_minor"] == 200000


@pytest.mark.asyncio
async def test_get_splits_for_lump_sum_debt(client):
    person_id = await _create_person(client, "Lump Person")
    payload = _create_p2p_payload(
        person_id,
        principal_minor=500000,
        repayment_mode="lump_sum",
        split_count=None,
        tenure_months=1,
        due_date="2024-12-31",
    )
    create_resp = await client.post("/api/v1/debts", json=payload)
    debt_id = create_resp.json()["data"]["id"]

    response = await client.get(f"/api/v1/debts/{debt_id}/splits")
    assert response.status_code == 200
    splits = response.json()["data"]
    assert len(splits) == 1
    assert splits[0]["amount_minor"] == 500000


@pytest.mark.asyncio
async def test_record_p2p_payment_marks_split_paid(client):
    person_id = await _create_person(client, "Pay Person")
    payload = _create_p2p_payload(
        person_id,
        principal_minor=300000,
        split_count=3,
        tenure_months=3,
    )
    create_resp = await client.post("/api/v1/debts", json=payload)
    debt_id = create_resp.json()["data"]["id"]

    # Record a payment matching the first split
    pay_resp = await client.post(
        f"/api/v1/debts/{debt_id}/payments",
        json={"date": "2024-07-01", "amount_minor": 100000},
    )
    assert pay_resp.status_code == 201
    payment = pay_resp.json()["data"]
    # P2P payments: principal_minor = amount_minor, interest_minor = 0
    assert payment["principal_minor"] == 100000
    assert payment["interest_minor"] == 0

    # Check that first split is now paid
    splits_resp = await client.get(f"/api/v1/debts/{debt_id}/splits")
    splits = splits_resp.json()["data"]
    paid_splits = [s for s in splits if s["paid"] is True]
    assert len(paid_splits) == 1
    assert paid_splits[0]["payment_id"] == payment["id"]


@pytest.mark.asyncio
async def test_p2p_debt_paid_off_after_all_splits_paid(client):
    person_id = await _create_person(client, "Full Pay")
    payload = _create_p2p_payload(
        person_id,
        principal_minor=300000,
        split_count=3,
        tenure_months=3,
    )
    create_resp = await client.post("/api/v1/debts", json=payload)
    debt_id = create_resp.json()["data"]["id"]

    # Record 3 payments
    for month in range(7, 10):
        await client.post(
            f"/api/v1/debts/{debt_id}/payments",
            json={"date": f"2024-{month:02d}-01", "amount_minor": 100000},
        )

    # Debt should now be paid_off
    debt_resp = await client.get(f"/api/v1/debts/{debt_id}")
    assert debt_resp.json()["data"]["status"] == "paid_off"


@pytest.mark.asyncio
async def test_get_splits_for_bank_loan_returns_empty(client):
    """Bank loans have no P2P splits — endpoint should return empty list."""
    create_resp = await client.post(
        "/api/v1/debts",
        json={
            "type": "bank_loan",
            "name": "Bank Loan",
            "principal_minor": 1000000,
            "currency": "EGP",
            "annual_rate_percent": 10,
            "tenure_months": 12,
            "start_date": "2024-01-01",
        },
    )
    debt_id = create_resp.json()["data"]["id"]
    response = await client.get(f"/api/v1/debts/{debt_id}/splits")
    assert response.status_code == 200
    assert response.json()["data"] == []
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/routers/test_p2p_debts.py::test_get_splits_for_equal_splits_debt tests/routers/test_p2p_debts.py::test_record_p2p_payment_marks_split_paid -v`
Expected: FAIL — `/splits` endpoint doesn't exist, P2P payment recording doesn't mark splits

- [ ] **Step 3: Implement get_splits service function**

Add to `backend/app/services/debt.py`:

```python
from datetime import date as date_type


async def get_splits(
    session: AsyncSession,
    debt_id: int,
) -> list[P2PDebtSplit]:
    """Return all splits for a debt, ordered by due_date."""
    q = (
        select(P2PDebtSplit)
        .where(P2PDebtSplit.debt_id == debt_id)
        .order_by(P2PDebtSplit.due_date)
    )
    result = await session.execute(q)
    return list(result.scalars().all())
```

- [ ] **Step 4: Extend record_payment to handle P2P debts and mark splits**

In `backend/app/services/debt.py`, modify the `record_payment` function. After the existing principal/interest computation block for bank loans (line ~196–200), add the P2P branch:

After the existing `elif debt.type == DebtType.BANK_LOAN:` block (for 0% bank loans), add:

```python
    else:
        # P2P debts — no interest, entire payment is principal
        principal_portion = amount_minor
        interest_portion = 0
```

Then, after creating the `DebtPayment` and `session.flush()` (around line 212), add split-marking logic:

```python
    # For P2P debts, find the earliest unpaid split and mark it paid
    if debt.type in (DebtType.PERSONAL_LENT, DebtType.PERSONAL_BORROWED):
        unpaid_q = (
            select(P2PDebtSplit)
            .where(
                P2PDebtSplit.debt_id == debt.id,
                P2PDebtSplit.paid.is_(False),
            )
            .order_by(P2PDebtSplit.due_date)
            .limit(1)
        )
        unpaid_split = (await session.execute(unpaid_q)).scalar_one_or_none()
        if unpaid_split:
            unpaid_split.paid = True
            unpaid_split.payment_id = payment.id
            await session.flush()
```

- [ ] **Step 5: Add the splits endpoint to the router**

Add to `backend/app/routers/debts.py`, after the existing imports add `P2PDebtSplitResponse` to the debt schema import:

```python
from app.schemas.debt import (
    DebtCreate,
    DebtResponse,
    DebtUpdate,
    MatchSuggestion,
    P2PDebtSplitResponse,
    PaymentCreate,
    PaymentResponse,
    ScheduleRow,
)
```

Add the endpoint after the `mark_debt_paid` endpoint:

```python
@router.get("/{debt_id}/splits")
async def get_splits(
    debt_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    debt = await debt_service.get_debt(session, household_id, debt_id)
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Debt not found")
            ).model_dump(),
        )
    splits = await debt_service.get_splits(session, debt.id)
    today = date.today()
    items = []
    for s in splits:
        if s.paid:
            split_status = "paid"
        elif s.due_date <= today:
            split_status = "overdue"
        else:
            split_status = "upcoming"
        items.append(
            P2PDebtSplitResponse(
                id=s.id,
                debt_id=s.debt_id,
                amount_minor=s.amount_minor,
                due_date=s.due_date,
                paid=s.paid,
                payment_id=s.payment_id,
                status=split_status,
            ).model_dump()
        )
    return SuccessResponse(data=items)
```

Also add the `date` import at the top of the router if not already present:

```python
from datetime import date
```

- [ ] **Step 6: Run all P2P tests**

Run: `cd backend && uv run pytest tests/routers/test_p2p_debts.py -v`
Expected: All 15 tests PASS

- [ ] **Step 7: Run full suite for regression**

Run: `cd backend && uv run pytest tests/ -v --tb=short`
Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add backend/app/services/debt.py backend/app/routers/debts.py backend/tests/routers/test_p2p_debts.py
git commit -m "feat(debts): add splits endpoint, P2P payment recording with split marking"
```

---

## Task 5: Person Balance Computation with FX Conversion

**Files:**
- Modify: `backend/app/services/person.py`
- Modify: `backend/app/schemas/person.py`
- Create: `backend/tests/services/test_person_balances.py`

- [ ] **Step 1: Write tests for balance computation**

```python
# backend/tests/services/test_person_balances.py
import pytest
import uuid
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.debt import Debt
from app.models.debt_payment import DebtPayment
from app.models.enums import DebtStatus, DebtType
from app.models.exchange_rate import ExchangeRate
from app.models.person import Person
from app.services.person import compute_person_balances
from tests.conftest import TEST_HOUSEHOLD_ID


@pytest.mark.asyncio
async def test_single_currency_lent_no_payments(db_session: AsyncSession):
    """Person owes us 500k EGP, no payments made."""
    person = Person(household_id=TEST_HOUSEHOLD_ID, name="Ahmed")
    db_session.add(person)
    await db_session.flush()

    debt = Debt(
        household_id=TEST_HOUSEHOLD_ID,
        type=DebtType.PERSONAL_LENT,
        person_id=person.id,
        name="Lent to Ahmed",
        principal_minor=500000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=1,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=500000,
        status=DebtStatus.ACTIVE,
    )
    db_session.add(debt)
    await db_session.commit()

    balances = await compute_person_balances(db_session, TEST_HOUSEHOLD_ID, person.id)
    assert len(balances.by_currency) == 1
    assert balances.by_currency["EGP"] == 500000  # they owe us 500k


@pytest.mark.asyncio
async def test_lent_minus_borrowed_net(db_session: AsyncSession):
    """Lent 500k, borrowed 200k in EGP → net = +300k (they owe us)."""
    person = Person(household_id=TEST_HOUSEHOLD_ID, name="Sara")
    db_session.add(person)
    await db_session.flush()

    lent = Debt(
        household_id=TEST_HOUSEHOLD_ID,
        type=DebtType.PERSONAL_LENT,
        person_id=person.id,
        name="Lent to Sara",
        principal_minor=500000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=1,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=500000,
        status=DebtStatus.ACTIVE,
    )
    borrowed = Debt(
        household_id=TEST_HOUSEHOLD_ID,
        type=DebtType.PERSONAL_BORROWED,
        person_id=person.id,
        name="Borrowed from Sara",
        principal_minor=200000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=1,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=200000,
        status=DebtStatus.ACTIVE,
    )
    db_session.add_all([lent, borrowed])
    await db_session.commit()

    balances = await compute_person_balances(db_session, TEST_HOUSEHOLD_ID, person.id)
    assert balances.by_currency["EGP"] == 300000


@pytest.mark.asyncio
async def test_partial_payments_reduce_balance(db_session: AsyncSession):
    """Lent 600k, they paid 200k → net = +400k."""
    person = Person(household_id=TEST_HOUSEHOLD_ID, name="Khaled")
    db_session.add(person)
    await db_session.flush()

    debt = Debt(
        household_id=TEST_HOUSEHOLD_ID,
        type=DebtType.PERSONAL_LENT,
        person_id=person.id,
        name="Lent to Khaled",
        principal_minor=600000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=6,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=100000,
        status=DebtStatus.ACTIVE,
    )
    db_session.add(debt)
    await db_session.flush()

    payment = DebtPayment(
        debt_id=debt.id,
        date=date(2024, 2, 1),
        amount_minor=200000,
        principal_minor=200000,
        interest_minor=0,
    )
    db_session.add(payment)
    await db_session.commit()

    balances = await compute_person_balances(db_session, TEST_HOUSEHOLD_ID, person.id)
    assert balances.by_currency["EGP"] == 400000


@pytest.mark.asyncio
async def test_multi_currency_balances(db_session: AsyncSession):
    """Lent 500k EGP + 1000 USD → separate currency entries."""
    person = Person(household_id=TEST_HOUSEHOLD_ID, name="Multi")
    db_session.add(person)
    await db_session.flush()

    debt_egp = Debt(
        household_id=TEST_HOUSEHOLD_ID,
        type=DebtType.PERSONAL_LENT,
        person_id=person.id,
        name="EGP loan",
        principal_minor=500000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=1,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=500000,
        status=DebtStatus.ACTIVE,
    )
    debt_usd = Debt(
        household_id=TEST_HOUSEHOLD_ID,
        type=DebtType.PERSONAL_LENT,
        person_id=person.id,
        name="USD loan",
        principal_minor=100000,
        currency="USD",
        annual_rate_bps=0,
        tenure_months=1,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=100000,
        status=DebtStatus.ACTIVE,
    )
    db_session.add_all([debt_egp, debt_usd])
    await db_session.commit()

    balances = await compute_person_balances(db_session, TEST_HOUSEHOLD_ID, person.id)
    assert balances.by_currency["EGP"] == 500000
    assert balances.by_currency["USD"] == 100000


@pytest.mark.asyncio
async def test_paid_off_debts_excluded(db_session: AsyncSession):
    """Paid-off debts are still active (is_active=True) but status=paid_off; they should still be counted."""
    person = Person(household_id=TEST_HOUSEHOLD_ID, name="Paid Off")
    db_session.add(person)
    await db_session.flush()

    debt = Debt(
        household_id=TEST_HOUSEHOLD_ID,
        type=DebtType.PERSONAL_LENT,
        person_id=person.id,
        name="Paid off loan",
        principal_minor=500000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=1,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=500000,
        status=DebtStatus.ACTIVE,
    )
    db_session.add(debt)
    await db_session.flush()

    # Record full payment
    payment = DebtPayment(
        debt_id=debt.id,
        date=date(2024, 2, 1),
        amount_minor=500000,
        principal_minor=500000,
        interest_minor=0,
    )
    db_session.add(payment)
    debt.status = DebtStatus.PAID_OFF
    await db_session.commit()

    balances = await compute_person_balances(db_session, TEST_HOUSEHOLD_ID, person.id)
    # Lent 500k, paid 500k → net = 0
    assert balances.by_currency.get("EGP", 0) == 0


@pytest.mark.asyncio
async def test_soft_deleted_debts_excluded(db_session: AsyncSession):
    """Soft-deleted debts should NOT count toward balances."""
    person = Person(household_id=TEST_HOUSEHOLD_ID, name="Deleted")
    db_session.add(person)
    await db_session.flush()

    debt = Debt(
        household_id=TEST_HOUSEHOLD_ID,
        type=DebtType.PERSONAL_LENT,
        person_id=person.id,
        name="Deleted loan",
        principal_minor=500000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=1,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=500000,
        status=DebtStatus.ACTIVE,
        is_active=False,
    )
    db_session.add(debt)
    await db_session.commit()

    balances = await compute_person_balances(db_session, TEST_HOUSEHOLD_ID, person.id)
    assert balances.by_currency.get("EGP", 0) == 0
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/services/test_person_balances.py -v`
Expected: FAIL — `compute_person_balances` does not exist

- [ ] **Step 3: Add balance schemas to person.py**

Modify `backend/app/schemas/person.py`:

```python
from pydantic import BaseModel, Field

from app.models.enums import PersonRelationship


class PersonCreate(BaseModel):
    name: str = Field(min_length=1)
    name_ar: str | None = None
    phone: str | None = None
    email: str | None = None
    relationship: PersonRelationship | None = None
    notes: str | None = None


class PersonUpdate(BaseModel):
    name: str | None = None
    name_ar: str | None = None
    phone: str | None = None
    email: str | None = None
    relationship: PersonRelationship | None = None
    notes: str | None = None


class CurrencyBalance(BaseModel):
    currency: str
    net_minor: int  # positive = they owe you, negative = you owe them


class PersonBalances(BaseModel):
    by_currency: dict[str, int] = {}  # currency → net_minor
    total_base_minor: int = 0  # converted to household base currency
    base_currency: str = "EGP"
    fx_warnings: list[str] = []  # currencies with no available rate


class PersonResponse(BaseModel):
    id: int
    name: str
    name_ar: str | None = None
    phone: str | None = None
    email: str | None = None
    relationship: PersonRelationship | None = None
    notes: str | None = None
    is_active: bool
    balances: PersonBalances | None = None

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Implement compute_person_balances**

Add to `backend/app/services/person.py`:

```python
from datetime import date as date_type

from sqlalchemy import case, literal_column

from app.models.debt_payment import DebtPayment
from app.models.enums import DebtStatus, DebtType
from app.models.exchange_rate import ExchangeRate
from app.schemas.person import PersonBalances


async def compute_person_balances(
    session: AsyncSession,
    household_id: uuid.UUID,
    person_id: int,
) -> PersonBalances:
    """Compute per-currency net balances for a person across all their P2P debts.

    Algorithm per currency:
        lent_total = SUM(principal_minor) WHERE type=personal_lent
        borrowed_total = SUM(principal_minor) WHERE type=personal_borrowed
        lent_paid = SUM(debt_payments.amount_minor) for lent debts
        borrowed_paid = SUM(debt_payments.amount_minor) for borrowed debts
        net = (lent_total - lent_paid) - (borrowed_total - borrowed_paid)
        Positive = they owe you, Negative = you owe them.
    """
    # Query: for each currency, get lent_principal, borrowed_principal
    from sqlalchemy import and_

    debt_q = (
        select(
            Debt.currency,
            func.coalesce(
                func.sum(
                    case(
                        (Debt.type == DebtType.PERSONAL_LENT, Debt.principal_minor),
                        else_=literal_column("0"),
                    )
                ),
                0,
            ).label("lent_total"),
            func.coalesce(
                func.sum(
                    case(
                        (Debt.type == DebtType.PERSONAL_BORROWED, Debt.principal_minor),
                        else_=literal_column("0"),
                    )
                ),
                0,
            ).label("borrowed_total"),
        )
        .where(
            Debt.household_id == household_id,
            Debt.person_id == person_id,
            Debt.is_active.is_(True),
            Debt.type.in_([DebtType.PERSONAL_LENT, DebtType.PERSONAL_BORROWED]),
        )
        .group_by(Debt.currency)
    )
    debt_rows = (await session.execute(debt_q)).all()

    if not debt_rows:
        return PersonBalances()

    # Query: for each currency, get lent_paid and borrowed_paid
    payment_q = (
        select(
            Debt.currency,
            func.coalesce(
                func.sum(
                    case(
                        (Debt.type == DebtType.PERSONAL_LENT, DebtPayment.amount_minor),
                        else_=literal_column("0"),
                    )
                ),
                0,
            ).label("lent_paid"),
            func.coalesce(
                func.sum(
                    case(
                        (Debt.type == DebtType.PERSONAL_BORROWED, DebtPayment.amount_minor),
                        else_=literal_column("0"),
                    )
                ),
                0,
            ).label("borrowed_paid"),
        )
        .join(Debt, and_(DebtPayment.debt_id == Debt.id))
        .where(
            Debt.household_id == household_id,
            Debt.person_id == person_id,
            Debt.is_active.is_(True),
            Debt.type.in_([DebtType.PERSONAL_LENT, DebtType.PERSONAL_BORROWED]),
        )
        .group_by(Debt.currency)
    )
    payment_rows = (await session.execute(payment_q)).all()
    payment_map = {row.currency: (row.lent_paid, row.borrowed_paid) for row in payment_rows}

    by_currency: dict[str, int] = {}
    for row in debt_rows:
        lent_paid, borrowed_paid = payment_map.get(row.currency, (0, 0))
        net = (row.lent_total - lent_paid) - (row.borrowed_total - borrowed_paid)
        if net != 0:
            by_currency[row.currency] = net

    return PersonBalances(by_currency=by_currency)
```

- [ ] **Step 5: Run balance tests**

Run: `cd backend && uv run pytest tests/services/test_person_balances.py -v`
Expected: 7 PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/person.py backend/app/schemas/person.py backend/tests/services/test_person_balances.py
git commit -m "feat(persons): implement per-currency balance computation for P2P debts"
```

---

## Task 6: Wire Person Balances into Endpoints

**Files:**
- Modify: `backend/app/routers/persons.py`
- Modify: `backend/tests/routers/test_p2p_debts.py` (add balance integration test)

- [ ] **Step 1: Write integration test for person response with balances**

Append to `backend/tests/routers/test_p2p_debts.py`:

```python
@pytest.mark.asyncio
async def test_person_response_includes_balances(client):
    """After creating a P2P debt, person GET includes balance data."""
    person_id = await _create_person(client, "Balance Person")
    payload = _create_p2p_payload(
        person_id,
        principal_minor=500000,
        split_count=5,
        tenure_months=5,
    )
    await client.post("/api/v1/debts", json=payload)

    response = await client.get(f"/api/v1/persons/{person_id}")
    assert response.status_code == 200
    data = response.json()["data"]
    assert "balances" in data
    assert data["balances"]["by_currency"]["EGP"] == 500000


@pytest.mark.asyncio
async def test_person_list_includes_balances(client):
    """List persons also includes balance data."""
    person_id = await _create_person(client, "List Balance")
    payload = _create_p2p_payload(
        person_id,
        principal_minor=300000,
        split_count=3,
        tenure_months=3,
    )
    await client.post("/api/v1/debts", json=payload)

    response = await client.get("/api/v1/persons")
    assert response.status_code == 200
    persons = response.json()["data"]
    person_data = next(p for p in persons if p["id"] == person_id)
    assert person_data["balances"]["by_currency"]["EGP"] == 300000
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && uv run pytest tests/routers/test_p2p_debts.py::test_person_response_includes_balances -v`
Expected: FAIL — `balances` not in person response

- [ ] **Step 3: Update persons router to include balances**

Replace `backend/app/routers/persons.py`:

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.schemas.common import ErrorDetail, ErrorResponse, PaginationMeta, SuccessResponse
from app.schemas.person import PersonCreate, PersonResponse, PersonUpdate
from app.services import person as person_service

router = APIRouter(prefix="/api/v1/persons", tags=["persons"])


async def _person_to_response(
    session: AsyncSession,
    household_id: uuid.UUID,
    person,
) -> dict:
    """Map Person ORM object to PersonResponse dict with computed balances."""
    balances = await person_service.compute_person_balances(
        session, household_id, person.id
    )
    resp = PersonResponse(
        id=person.id,
        name=person.name,
        name_ar=person.name_ar,
        phone=person.phone,
        email=person.email,
        relationship=person.relationship,
        notes=person.notes,
        is_active=person.is_active,
        balances=balances,
    )
    return resp.model_dump()


@router.get("")
async def list_persons(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    persons, total = await person_service.list_persons(session, household_id, page, page_size)
    items = [await _person_to_response(session, household_id, p) for p in persons]
    return SuccessResponse(
        data=items,
        meta=PaginationMeta(total=total, page=page, page_size=page_size),
    )


@router.get("/{person_id}")
async def get_person(
    person_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    person = await person_service.get_person(session, household_id, person_id)
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Person not found")
            ).model_dump(),
        )
    return SuccessResponse(data=await _person_to_response(session, household_id, person))


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_person(
    data: PersonCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    person = await person_service.create_person(session, household_id, data)
    return SuccessResponse(data=await _person_to_response(session, household_id, person))


@router.put("/{person_id}")
async def update_person(
    person_id: int,
    data: PersonUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    person = await person_service.get_person(session, household_id, person_id)
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Person not found")
            ).model_dump(),
        )
    person = await person_service.update_person(session, person, data)
    return SuccessResponse(data=await _person_to_response(session, household_id, person))


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_person(
    person_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> None:
    person = await person_service.get_person(session, household_id, person_id)
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Person not found")
            ).model_dump(),
        )
    if await person_service.has_active_debts(session, person.id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorResponse(
                error=ErrorDetail(
                    code="PERSON_HAS_ACTIVE_DEBTS",
                    message="Cannot delete person with active debts",
                )
            ).model_dump(),
        )
    await person_service.soft_delete_person(session, person)
```

- [ ] **Step 4: Run balance integration tests**

Run: `cd backend && uv run pytest tests/routers/test_p2p_debts.py::test_person_response_includes_balances tests/routers/test_p2p_debts.py::test_person_list_includes_balances -v`
Expected: 2 PASS

- [ ] **Step 5: Run all person tests to confirm no regression**

Run: `cd backend && uv run pytest tests/routers/test_persons.py -v`
Expected: All 8 PASS (existing tests still work with new balances field)

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/persons.py backend/tests/routers/test_p2p_debts.py
git commit -m "feat(persons): wire balance computation into person endpoints"
```

---

## Task 7: Filter P2P Debts in List Endpoint

**Files:**
- Modify: `backend/tests/routers/test_p2p_debts.py`

- [ ] **Step 1: Write test for filtering debts by P2P type**

Append to `backend/tests/routers/test_p2p_debts.py`:

```python
@pytest.mark.asyncio
async def test_list_debts_filter_by_personal_lent(client):
    person_id = await _create_person(client, "Filter Test")
    # Create bank loan
    await client.post(
        "/api/v1/debts",
        json={
            "type": "bank_loan",
            "name": "Bank Loan",
            "principal_minor": 1000000,
            "currency": "EGP",
            "annual_rate_percent": 10,
            "tenure_months": 12,
            "start_date": "2024-01-01",
        },
    )
    # Create P2P debt
    await client.post(
        "/api/v1/debts",
        json=_create_p2p_payload(person_id, type="personal_lent"),
    )

    # Filter by personal_lent
    response = await client.get("/api/v1/debts?type=personal_lent")
    assert response.status_code == 200
    debts = response.json()["data"]
    assert len(debts) >= 1
    assert all(d["type"] == "personal_lent" for d in debts)

    # Filter by bank_loan should not include P2P
    response2 = await client.get("/api/v1/debts?type=bank_loan")
    assert all(d["type"] == "bank_loan" for d in response2.json()["data"])
```

- [ ] **Step 2: Run test to verify it passes (existing list_debts already supports type filter)**

Run: `cd backend && uv run pytest tests/routers/test_p2p_debts.py::test_list_debts_filter_by_personal_lent -v`
Expected: PASS (the filter was implemented in 3A)

- [ ] **Step 3: Commit**

```bash
git add backend/tests/routers/test_p2p_debts.py
git commit -m "test(debts): add P2P type filter integration test"
```

---

## Task 8: Lint, Type Check, Full Test Suite

**Files:**
- All modified files

- [ ] **Step 1: Run ruff lint**

Run: `cd backend && uv run ruff check .`
Expected: Clean (no errors)

- [ ] **Step 2: Run ruff format check**

Run: `cd backend && uv run ruff format --check .`
Expected: Clean. If not, run `uv run ruff format .` to fix, then re-check.

- [ ] **Step 3: Run pyright**

Run: `cd backend && uv run pyright`
Expected: 0 errors

- [ ] **Step 4: Run full test suite**

Run: `cd backend && uv run pytest tests/ -v --tb=short`
Expected: All tests PASS

- [ ] **Step 5: Fix any issues found in steps 1-4, then re-run**

If any issues: fix, re-run the specific check, then re-run full suite.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix(debts): lint and type check fixes for Phase 3B"
```

---

## Spec Coverage Checklist

| Spec Requirement (§4) | Task |
|---|---|
| P2P debt creation (personal_lent, personal_borrowed) | Task 3 |
| Lump sum mode (due_date required) | Task 3 |
| Equal splits mode (split_count, auto-generate) | Task 2 + 3 |
| Custom splits mode (user-provided splits, sum validation) | Task 1 + 3 |
| GET /debts/{id}/splits endpoint | Task 4 |
| Split status derivation (paid/overdue/upcoming) | Task 4 |
| Person balance computation (per-currency net) | Task 5 |
| Partial payment handling in balances | Task 5 |
| Soft-deleted debts excluded from balances | Task 5 |
| Person response includes balances | Task 6 |
| P2P payment recording (principal only, no interest) | Task 4 |
| Split marking on payment | Task 4 |
| Paid-off detection after all splits paid | Task 4 |
| List debts filter by P2P type | Task 7 |
| Lint + type check + full suite | Task 8 |

**Deferred to later (per spec):**
- FX conversion to base currency (`total_base_minor`) — requires exchange rate seeding and household base currency lookup; can be added as a follow-up within 3B or deferred
- Privacy controls (child/viewer role filtering) — requires role-aware dependency injection not yet built
- Settlement notifications — Phase 3D/later
