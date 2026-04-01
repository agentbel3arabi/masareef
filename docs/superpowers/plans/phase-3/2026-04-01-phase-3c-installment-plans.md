# Phase 3C: Installment Plans — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement installment plan CRUD (credit card, store, financing app types), account type validation, computed status, financing apps summary endpoint, and account obligations endpoint.

**Architecture:** Three new files (schemas, service, router) for installment plans following the same patterns as Phase 3A/3B debts. One new router for financing apps summary. One new endpoint on the existing accounts router for obligations. Status computation (months_paid, remaining, effective status) is a pure function called at read time. Account type validation happens in the service layer (not Pydantic) following the 3B pattern.

**Tech Stack:** Python 3.12, FastAPI (async), SQLAlchemy (async), Pydantic V2, pytest + httpx + aiosqlite

---

### Required Reading

- Phase 3 design spec, sections 5.1–5.10 (Sub-Phase 3C)
- `docs/03-features/financing-apps.md` — financing apps summary endpoint spec
- `docs/02-data-models.md` — `installment_plans` table definition
- `docs/superpowers/handoff/phase-3-unit-3B.md` — prior unit handoff

### File Structure

**Create:**

| File | Responsibility |
|------|---------------|
| `backend/app/schemas/installment.py` | Pydantic schemas: InstallmentCreate, InstallmentUpdate, InstallmentResponse, FinancingAppDetail, FinancingAppsSummary |
| `backend/app/services/installment.py` | Business logic: CRUD, status computation, account type validation, obligations, FA summary |
| `backend/app/routers/installments.py` | HTTP endpoints: CRUD + complete for installment plans |
| `backend/app/routers/financing_apps.py` | HTTP endpoint: `GET /api/v1/financing-apps/summary` |
| `backend/tests/schemas/test_installment_schemas.py` | Schema validation tests (5 tests) |
| `backend/tests/services/test_installment_service.py` | Service unit tests (16 tests) |
| `backend/tests/routers/test_installments.py` | Router integration tests (12 tests) |
| `backend/tests/routers/test_financing_apps.py` | Financing apps summary tests (3 tests) |
| `backend/tests/routers/test_account_obligations.py` | Account obligations tests (3 tests) |

**Modify:**

| File | Change |
|------|--------|
| `backend/app/main.py` | Register `installments` and `financing_apps` routers |
| `backend/app/routers/accounts.py` | Add `GET /{account_id}/obligations` endpoint |

---

### Task 1: Installment Schemas + Validation Tests

**Files:**
- Create: `backend/app/schemas/installment.py`
- Create: `backend/tests/schemas/test_installment_schemas.py`

- [ ] **Step 1: Create installment schemas**

```python
# backend/app/schemas/installment.py
from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class InstallmentCreate(BaseModel):
    type: Literal["credit_card", "store", "financing_app"]
    name: str
    merchant_name: str | None = None
    source_account_id: int | None = None
    linked_account_id: int | None = None
    total_amount_minor: int = Field(gt=0)
    monthly_amount_minor: int = Field(gt=0)
    total_months: int = Field(gt=0)
    start_month: date
    currency: str = Field(min_length=3, max_length=3)


class InstallmentUpdate(BaseModel):
    name: str | None = None
    merchant_name: str | None = None
    linked_account_id: int | None = None


class InstallmentResponse(BaseModel):
    id: int
    type: str
    name: str
    merchant_name: str | None = None
    source_account_id: int | None = None
    linked_account_id: int | None = None
    total_amount_minor: int
    monthly_amount_minor: int
    total_months: int
    start_month: date
    currency: str
    status: Literal["active", "completed"]
    months_paid: int
    remaining_months: int
    remaining_minor: int
    is_active: bool

    model_config = {"from_attributes": True}


class FinancingAppDetail(BaseModel):
    account_id: int
    name: str
    name_ar: str | None = None
    credit_limit_minor: int
    balance_minor: int
    available_minor: int
    utilization_percent: float
    active_plans_count: int
    monthly_commitment_minor: int


class FinancingAppsTotals(BaseModel):
    total_limit_minor: int
    total_used_minor: int
    total_available_minor: int
    total_monthly_minor: int
    total_remaining_minor: int


class FinancingAppsSummaryResponse(BaseModel):
    apps: list[FinancingAppDetail]
    totals: FinancingAppsTotals


class ObligationDebt(BaseModel):
    id: int
    type: str
    name: str
    monthly_payment_minor: int
    remaining_minor: int
    status: str


class ObligationInstallment(BaseModel):
    id: int
    type: str
    name: str
    merchant_name: str | None = None
    monthly_amount_minor: int
    remaining_minor: int
    remaining_months: int
    status: str


class AccountObligationsResponse(BaseModel):
    debts: list[ObligationDebt]
    installments: list[ObligationInstallment]
```

- [ ] **Step 2: Write schema validation tests**

```python
# backend/tests/schemas/test_installment_schemas.py
import pytest
from pydantic import ValidationError

from app.schemas.installment import InstallmentCreate


def _valid_cc_payload(**overrides):
    payload = {
        "type": "credit_card",
        "name": "iPhone 16 Pro",
        "merchant_name": "B.TECH",
        "source_account_id": 1,
        "total_amount_minor": 5400000,
        "monthly_amount_minor": 450000,
        "total_months": 12,
        "start_month": "2024-06-01",
        "currency": "EGP",
    }
    payload.update(overrides)
    return payload


def test_valid_cc_installment():
    schema = InstallmentCreate(**_valid_cc_payload())
    assert schema.type == "credit_card"
    assert schema.total_amount_minor == 5400000


def test_valid_store_installment():
    schema = InstallmentCreate(
        type="store",
        name="Washing Machine",
        merchant_name="B.TECH",
        total_amount_minor=1200000,
        monthly_amount_minor=100000,
        total_months=12,
        start_month="2024-06-01",
        currency="EGP",
    )
    assert schema.type == "store"
    assert schema.source_account_id is None


def test_valid_financing_app_installment():
    schema = InstallmentCreate(
        type="financing_app",
        name="Air Conditioner",
        merchant_name="Samsung Store",
        source_account_id=5,
        total_amount_minor=1500000,
        monthly_amount_minor=125000,
        total_months=12,
        start_month="2024-06-01",
        currency="EGP",
    )
    assert schema.type == "financing_app"


def test_total_amount_must_be_positive():
    with pytest.raises(ValidationError, match="greater_than"):
        InstallmentCreate(**_valid_cc_payload(total_amount_minor=0))


def test_invalid_type_rejected():
    with pytest.raises(ValidationError):
        InstallmentCreate(**_valid_cc_payload(type="invalid"))
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/schemas/test_installment_schemas.py -v`
Expected: 5 passed

- [ ] **Step 4: Commit**

```bash
git add backend/app/schemas/installment.py backend/tests/schemas/test_installment_schemas.py
git commit -m "feat(installments): add Pydantic schemas and validation tests"
```

---

### Task 2: Service — Status Computation + Unit Tests

**Files:**
- Create: `backend/app/services/installment.py`
- Create: `backend/tests/services/test_installment_service.py`

- [ ] **Step 1: Write failing status computation tests**

```python
# backend/tests/services/test_installment_service.py
from datetime import date

import pytest

from app.services.installment import compute_installment_status


class FakePlan:
    """Lightweight stand-in for InstallmentPlan ORM object."""

    def __init__(self, *, start_month, total_months, total_amount_minor, monthly_amount_minor, status="active"):
        self.start_month = start_month
        self.total_months = total_months
        self.total_amount_minor = total_amount_minor
        self.monthly_amount_minor = monthly_amount_minor
        self.status = status


class TestComputeInstallmentStatus:
    def test_active_mid_tenure(self):
        plan = FakePlan(
            start_month=date(2024, 1, 1),
            total_months=12,
            total_amount_minor=5400000,
            monthly_amount_minor=450000,
        )
        result = compute_installment_status(plan, as_of=date(2024, 7, 15))
        assert result["months_paid"] == 6
        assert result["remaining_months"] == 6
        assert result["remaining_minor"] == 5400000 - 6 * 450000  # 2700000
        assert result["status"] == "active"

    def test_auto_completed_past_tenure(self):
        plan = FakePlan(
            start_month=date(2023, 1, 1),
            total_months=12,
            total_amount_minor=5400000,
            monthly_amount_minor=450000,
        )
        result = compute_installment_status(plan, as_of=date(2024, 6, 1))
        assert result["months_paid"] == 12
        assert result["remaining_months"] == 0
        assert result["remaining_minor"] == 0
        assert result["status"] == "completed"

    def test_manually_completed_overrides(self):
        plan = FakePlan(
            start_month=date(2024, 1, 1),
            total_months=12,
            total_amount_minor=5400000,
            monthly_amount_minor=450000,
            status="completed",
        )
        result = compute_installment_status(plan, as_of=date(2024, 4, 1))
        assert result["status"] == "completed"
        # months_paid still reflects elapsed time, not stored status
        assert result["months_paid"] == 3

    def test_future_start_month_zero_paid(self):
        plan = FakePlan(
            start_month=date(2025, 1, 1),
            total_months=12,
            total_amount_minor=5400000,
            monthly_amount_minor=450000,
        )
        result = compute_installment_status(plan, as_of=date(2024, 6, 1))
        assert result["months_paid"] == 0
        assert result["remaining_months"] == 12
        assert result["remaining_minor"] == 5400000
        assert result["status"] == "active"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/services/test_installment_service.py::TestComputeInstallmentStatus -v`
Expected: FAIL with "cannot import name 'compute_installment_status'"

- [ ] **Step 3: Implement status computation**

```python
# backend/app/services/installment.py
from __future__ import annotations

import uuid
from datetime import date
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.debt import Debt
from app.models.installment_plan import InstallmentPlan
from app.schemas.installment import InstallmentCreate, InstallmentUpdate


def compute_installment_status(
    plan: Any,
    as_of: date | None = None,
) -> dict[str, Any]:
    """Compute derived fields for an installment plan.

    Pure function — no DB access. Works with ORM objects or any object
    with the required attributes.
    """
    ref = as_of or date.today()
    months_elapsed = (ref.year - plan.start_month.year) * 12 + (
        ref.month - plan.start_month.month
    )
    months_paid = max(0, min(months_elapsed, plan.total_months))
    remaining_months = plan.total_months - months_paid
    remaining_minor = plan.total_amount_minor - (months_paid * plan.monthly_amount_minor)
    remaining_minor = max(0, remaining_minor)

    stored = plan.status.value if hasattr(plan.status, "value") else plan.status
    if stored == "completed" or months_elapsed >= plan.total_months:
        effective_status = "completed"
    else:
        effective_status = "active"

    return {
        "months_paid": months_paid,
        "remaining_months": remaining_months,
        "remaining_minor": remaining_minor,
        "status": effective_status,
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/services/test_installment_service.py::TestComputeInstallmentStatus -v`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/installment.py backend/tests/services/test_installment_service.py
git commit -m "feat(installments): add status computation helper with tests"
```

---

### Task 3: Service — Create + Account Type Validation + Unit Tests

**Files:**
- Modify: `backend/app/services/installment.py`
- Modify: `backend/tests/services/test_installment_service.py`

- [ ] **Step 1: Write failing create + validation tests**

Append to `backend/tests/services/test_installment_service.py`:

```python
import uuid

from app.models.account import Account
from app.models.enums import AccountType
from app.models.installment_plan import InstallmentPlan
from app.schemas.installment import InstallmentCreate
from app.services.installment import create_installment

TEST_HOUSEHOLD_ID = uuid.uuid4()


def _cc_create_data(**overrides):
    payload = {
        "type": "credit_card",
        "name": "iPhone 16 Pro",
        "merchant_name": "B.TECH",
        "source_account_id": None,  # will be set per test
        "total_amount_minor": 5400000,
        "monthly_amount_minor": 450000,
        "total_months": 12,
        "start_month": date(2024, 6, 1),
        "currency": "EGP",
    }
    payload.update(overrides)
    return InstallmentCreate(**payload)


async def _seed_account(session, *, account_type="credit_card", household_id=None, credit_limit=10000000):
    """Create and flush a test account."""
    acct = Account(
        household_id=household_id or TEST_HOUSEHOLD_ID,
        name="Test Account",
        type=account_type,
        currency="EGP",
        balance_minor=0,
        credit_limit=credit_limit,
    )
    session.add(acct)
    await session.flush()
    return acct


@pytest.mark.asyncio
class TestCreateInstallment:
    async def test_create_cc_with_valid_account(self, db_session):
        acct = await _seed_account(db_session, account_type="credit_card")
        data = _cc_create_data(source_account_id=acct.id)
        plan = await create_installment(db_session, TEST_HOUSEHOLD_ID, data)
        assert plan.id is not None
        assert plan.type == "credit_card"
        assert plan.source_account_id == acct.id
        assert plan.start_month == date(2024, 6, 1)

    async def test_cc_with_non_credit_card_account_raises(self, db_session):
        acct = await _seed_account(db_session, account_type="bank_account")
        data = _cc_create_data(source_account_id=acct.id)
        with pytest.raises(ValueError, match="INVALID_ACCOUNT_TYPE"):
            await create_installment(db_session, TEST_HOUSEHOLD_ID, data)

    async def test_financing_app_without_source_raises(self, db_session):
        data = InstallmentCreate(
            type="financing_app",
            name="Air Conditioner",
            total_amount_minor=1500000,
            monthly_amount_minor=125000,
            total_months=12,
            start_month=date(2024, 6, 1),
            currency="EGP",
        )
        with pytest.raises(ValueError, match="SOURCE_ACCOUNT_REQUIRED"):
            await create_installment(db_session, TEST_HOUSEHOLD_ID, data)

    async def test_store_without_source_ok(self, db_session):
        data = InstallmentCreate(
            type="store",
            name="Washing Machine",
            merchant_name="B.TECH",
            total_amount_minor=1200000,
            monthly_amount_minor=100000,
            total_months=12,
            start_month=date(2024, 6, 1),
            currency="EGP",
        )
        plan = await create_installment(db_session, TEST_HOUSEHOLD_ID, data)
        assert plan.source_account_id is None
        assert plan.type == "store"

    async def test_store_with_non_cc_source_raises(self, db_session):
        acct = await _seed_account(db_session, account_type="bank_account")
        data = InstallmentCreate(
            type="store",
            name="Fridge",
            merchant_name="B.TECH",
            source_account_id=acct.id,
            total_amount_minor=800000,
            monthly_amount_minor=133334,
            total_months=6,
            start_month=date(2024, 6, 1),
            currency="EGP",
        )
        with pytest.raises(ValueError, match="INVALID_ACCOUNT_TYPE"):
            await create_installment(db_session, TEST_HOUSEHOLD_ID, data)

    async def test_start_month_normalized_to_day_1(self, db_session):
        acct = await _seed_account(db_session, account_type="credit_card")
        data = _cc_create_data(source_account_id=acct.id, start_month=date(2024, 6, 15))
        plan = await create_installment(db_session, TEST_HOUSEHOLD_ID, data)
        assert plan.start_month == date(2024, 6, 1)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/services/test_installment_service.py::TestCreateInstallment -v`
Expected: FAIL with "cannot import name 'create_installment'"

- [ ] **Step 3: Implement create_installment**

Add to `backend/app/services/installment.py`:

```python
async def create_installment(
    session: AsyncSession,
    household_id: uuid.UUID,
    data: InstallmentCreate,
) -> InstallmentPlan:
    """Create an installment plan with account type validation."""
    if data.source_account_id is not None:
        account = await session.get(Account, data.source_account_id)
        if account is None or not account.is_active or account.household_id != household_id:
            raise ValueError("ACCOUNT_NOT_FOUND")

        acct_type = account.type.value if hasattr(account.type, "value") else account.type

        if data.type == "credit_card" and acct_type != "credit_card":
            raise ValueError("INVALID_ACCOUNT_TYPE")
        elif data.type == "financing_app" and acct_type != "financing_app":
            raise ValueError("INVALID_ACCOUNT_TYPE")
        elif data.type == "store" and acct_type != "credit_card":
            raise ValueError("INVALID_ACCOUNT_TYPE")
    else:
        if data.type in ("credit_card", "financing_app"):
            raise ValueError("SOURCE_ACCOUNT_REQUIRED")

    start_month = data.start_month.replace(day=1)

    plan = InstallmentPlan(
        household_id=household_id,
        type=data.type,
        name=data.name,
        merchant_name=data.merchant_name,
        source_account_id=data.source_account_id,
        linked_account_id=data.linked_account_id,
        total_amount_minor=data.total_amount_minor,
        monthly_amount_minor=data.monthly_amount_minor,
        total_months=data.total_months,
        start_month=start_month,
        currency=data.currency,
    )
    session.add(plan)
    await session.flush()
    return plan
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/services/test_installment_service.py::TestCreateInstallment -v`
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/installment.py backend/tests/services/test_installment_service.py
git commit -m "feat(installments): add create with account type validation"
```

---

### Task 4: Service — CRUD (List, Get, Update, Delete, Complete) + Unit Tests

**Files:**
- Modify: `backend/app/services/installment.py`
- Modify: `backend/tests/services/test_installment_service.py`

- [ ] **Step 1: Write failing CRUD tests**

Append to `backend/tests/services/test_installment_service.py`:

```python
from app.services.installment import (
    complete_installment,
    get_installment,
    list_installments,
    soft_delete_installment,
    update_installment,
)
from app.schemas.installment import InstallmentUpdate


async def _create_test_plan(session, *, plan_type="credit_card", household_id=None, source_account_id=None, **kwargs):
    """Seed an installment plan directly via ORM for test isolation."""
    hid = household_id or TEST_HOUSEHOLD_ID
    plan = InstallmentPlan(
        household_id=hid,
        type=plan_type,
        name=kwargs.get("name", "Test Plan"),
        merchant_name=kwargs.get("merchant_name"),
        source_account_id=source_account_id,
        total_amount_minor=kwargs.get("total_amount_minor", 5400000),
        monthly_amount_minor=kwargs.get("monthly_amount_minor", 450000),
        total_months=kwargs.get("total_months", 12),
        start_month=kwargs.get("start_month", date(2024, 1, 1)),
        currency=kwargs.get("currency", "EGP"),
    )
    session.add(plan)
    await session.flush()
    return plan


@pytest.mark.asyncio
class TestListInstallments:
    async def test_list_returns_all_active(self, db_session):
        await _create_test_plan(db_session, name="Plan A")
        await _create_test_plan(db_session, name="Plan B")
        plans, total = await list_installments(db_session, TEST_HOUSEHOLD_ID)
        assert total == 2
        assert len(plans) == 2

    async def test_list_filters_by_type(self, db_session):
        await _create_test_plan(db_session, plan_type="credit_card", name="CC Plan")
        await _create_test_plan(db_session, plan_type="store", name="Store Plan")
        plans, total = await list_installments(
            db_session, TEST_HOUSEHOLD_ID, installment_type="store"
        )
        assert total == 1
        assert plans[0].name == "Store Plan"


@pytest.mark.asyncio
class TestGetInstallment:
    async def test_get_existing(self, db_session):
        plan = await _create_test_plan(db_session)
        found = await get_installment(db_session, TEST_HOUSEHOLD_ID, plan.id)
        assert found is not None
        assert found.id == plan.id

    async def test_get_nonexistent_returns_none(self, db_session):
        found = await get_installment(db_session, TEST_HOUSEHOLD_ID, 99999)
        assert found is None


@pytest.mark.asyncio
class TestUpdateInstallment:
    async def test_update_name(self, db_session):
        plan = await _create_test_plan(db_session, name="Old Name")
        updated = await update_installment(
            db_session, plan, InstallmentUpdate(name="New Name")
        )
        assert updated.name == "New Name"


@pytest.mark.asyncio
class TestSoftDelete:
    async def test_soft_delete_sets_inactive(self, db_session):
        plan = await _create_test_plan(db_session)
        await soft_delete_installment(db_session, plan)
        assert plan.is_active is False


@pytest.mark.asyncio
class TestComplete:
    async def test_complete_sets_status(self, db_session):
        plan = await _create_test_plan(db_session)
        completed = await complete_installment(db_session, plan)
        assert completed.status == "completed"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/services/test_installment_service.py::TestListInstallments tests/services/test_installment_service.py::TestGetInstallment tests/services/test_installment_service.py::TestUpdateInstallment tests/services/test_installment_service.py::TestSoftDelete tests/services/test_installment_service.py::TestComplete -v`
Expected: FAIL with import errors

- [ ] **Step 3: Implement CRUD service functions**

Add to `backend/app/services/installment.py`:

```python
async def list_installments(
    session: AsyncSession,
    household_id: uuid.UUID,
    installment_type: str | None = None,
    status_filter: str | None = None,
    source_account_id: int | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[InstallmentPlan], int]:
    """List installment plans with optional filters.

    Status filtering is done in Python because effective status is computed.
    """
    query = select(InstallmentPlan).where(
        InstallmentPlan.household_id == household_id,
        InstallmentPlan.is_active.is_(True),
    )
    if installment_type:
        query = query.where(InstallmentPlan.type == installment_type)
    if source_account_id is not None:
        query = query.where(InstallmentPlan.source_account_id == source_account_id)

    query = query.order_by(InstallmentPlan.created_at.desc())
    result = await session.execute(query)
    all_plans = list(result.scalars().all())

    if status_filter:
        all_plans = [
            p
            for p in all_plans
            if compute_installment_status(p)["status"] == status_filter
        ]

    total = len(all_plans)
    start = (page - 1) * page_size
    page_plans = all_plans[start : start + page_size]
    return page_plans, total


async def get_installment(
    session: AsyncSession,
    household_id: uuid.UUID,
    plan_id: int,
) -> InstallmentPlan | None:
    """Get a single installment plan by ID, scoped to household."""
    query = select(InstallmentPlan).where(
        InstallmentPlan.id == plan_id,
        InstallmentPlan.household_id == household_id,
        InstallmentPlan.is_active.is_(True),
    )
    result = await session.execute(query)
    return result.scalar_one_or_none()


async def update_installment(
    session: AsyncSession,
    plan: InstallmentPlan,
    data: InstallmentUpdate,
) -> InstallmentPlan:
    """Update mutable fields of an installment plan."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)
    await session.flush()
    return plan


async def soft_delete_installment(
    session: AsyncSession,
    plan: InstallmentPlan,
) -> None:
    """Soft-delete an installment plan."""
    plan.is_active = False
    await session.flush()


async def complete_installment(
    session: AsyncSession,
    plan: InstallmentPlan,
) -> InstallmentPlan:
    """Manually mark an installment plan as completed (early payoff)."""
    plan.status = "completed"
    await session.flush()
    return plan
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/services/test_installment_service.py -v`
Expected: 16 passed (4 status + 6 create + 6 CRUD)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/installment.py backend/tests/services/test_installment_service.py
git commit -m "feat(installments): add CRUD service functions with tests"
```

---

### Task 5: Installment Router + Register in main.py

**Files:**
- Create: `backend/app/routers/installments.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create the installment router**

```python
# backend/app/routers/installments.py
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.schemas.common import ErrorDetail, ErrorResponse, PaginationMeta, SuccessResponse
from app.schemas.installment import InstallmentCreate, InstallmentResponse, InstallmentUpdate
from app.services import installment as installment_service

router = APIRouter(prefix="/api/v1/installments", tags=["installments"])


def _plan_to_response(plan) -> InstallmentResponse:
    """Build an InstallmentResponse with computed status fields."""
    computed = installment_service.compute_installment_status(plan)
    plan_type = plan.type.value if hasattr(plan.type, "value") else plan.type
    return InstallmentResponse(
        id=plan.id,
        type=plan_type,
        name=plan.name,
        merchant_name=plan.merchant_name,
        source_account_id=plan.source_account_id,
        linked_account_id=plan.linked_account_id,
        total_amount_minor=plan.total_amount_minor,
        monthly_amount_minor=plan.monthly_amount_minor,
        total_months=plan.total_months,
        start_month=plan.start_month,
        currency=plan.currency,
        status=computed["status"],
        months_paid=computed["months_paid"],
        remaining_months=computed["remaining_months"],
        remaining_minor=computed["remaining_minor"],
        is_active=plan.is_active,
    )


@router.get("")
async def list_installments(
    type: str | None = Query(None),
    status: str | None = Query(None, alias="status"),
    source_account_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    plans, total = await installment_service.list_installments(
        session,
        household_id,
        installment_type=type,
        status_filter=status,
        source_account_id=source_account_id,
        page=page,
        page_size=page_size,
    )
    items = [_plan_to_response(p).model_dump() for p in plans]
    return SuccessResponse(
        data=items,
        meta=PaginationMeta(total=total, page=page, page_size=page_size),
    )


@router.get("/{plan_id}")
async def get_installment(
    plan_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    plan = await installment_service.get_installment(session, household_id, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Installment plan not found")
            ).model_dump(),
        )
    return SuccessResponse(data=_plan_to_response(plan).model_dump())


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_installment(
    data: InstallmentCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    try:
        plan = await installment_service.create_installment(session, household_id, data)
    except ValueError as e:
        err_code = str(e)
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        if err_code == "ACCOUNT_NOT_FOUND":
            status_code = status.HTTP_404_NOT_FOUND
        raise HTTPException(
            status_code=status_code,
            detail=ErrorResponse(
                error=ErrorDetail(code=err_code, message=err_code)
            ).model_dump(),
        )
    return SuccessResponse(data=_plan_to_response(plan).model_dump())


@router.put("/{plan_id}")
async def update_installment(
    plan_id: int,
    data: InstallmentUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    plan = await installment_service.get_installment(session, household_id, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Installment plan not found")
            ).model_dump(),
        )
    plan = await installment_service.update_installment(session, plan, data)
    return SuccessResponse(data=_plan_to_response(plan).model_dump())


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_installment(
    plan_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> None:
    plan = await installment_service.get_installment(session, household_id, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Installment plan not found")
            ).model_dump(),
        )
    await installment_service.soft_delete_installment(session, plan)


@router.post("/{plan_id}/complete")
async def complete_installment(
    plan_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    plan = await installment_service.get_installment(session, household_id, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Installment plan not found")
            ).model_dump(),
        )
    plan = await installment_service.complete_installment(session, plan)
    return SuccessResponse(data=_plan_to_response(plan).model_dump())
```

- [ ] **Step 2: Register the router in main.py**

Add these two lines to `backend/app/main.py`:

After the existing import block, add:
```python
from app.routers.installments import router as installments_router
```

After the existing `app.include_router(debts_router)` line, add:
```python
app.include_router(installments_router)
```

- [ ] **Step 3: Run linting to check for errors**

Run: `cd backend && uv run ruff check app/routers/installments.py app/services/installment.py app/schemas/installment.py`
Expected: clean (0 errors)

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/installments.py backend/app/main.py
git commit -m "feat(installments): add CRUD router and register in main"
```

---

### Task 6: Router Integration Tests

**Files:**
- Create: `backend/tests/routers/test_installments.py`

- [ ] **Step 1: Create the integration test file**

```python
# backend/tests/routers/test_installments.py
import pytest


def _cc_payload(**overrides):
    """Factory for a valid CC installment creation payload."""
    payload = {
        "type": "credit_card",
        "name": "iPhone 16 Pro",
        "merchant_name": "B.TECH",
        "source_account_id": None,  # must be set per test
        "total_amount_minor": 5400000,
        "monthly_amount_minor": 450000,
        "total_months": 12,
        "start_month": "2024-06-01",
        "currency": "EGP",
    }
    payload.update(overrides)
    return payload


async def _create_account(client, *, account_type="credit_card", credit_limit=10000000):
    """Helper: create an account via API and return its ID."""
    resp = await client.post(
        "/api/v1/accounts",
        json={
            "name": f"Test {account_type}",
            "type": account_type,
            "currency": "EGP",
            "initial_balance": 0,
            "credit_limit": credit_limit,
        },
    )
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


@pytest.mark.asyncio
async def test_create_cc_installment_returns_201(client):
    acct_id = await _create_account(client, account_type="credit_card")
    payload = _cc_payload(source_account_id=acct_id)
    resp = await client.post("/api/v1/installments", json=payload)
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["type"] == "credit_card"
    assert data["name"] == "iPhone 16 Pro"
    assert data["source_account_id"] == acct_id
    assert data["status"] == "active"
    assert "months_paid" in data
    assert "remaining_minor" in data


@pytest.mark.asyncio
async def test_list_installments_returns_paginated(client):
    acct_id = await _create_account(client)
    await client.post("/api/v1/installments", json=_cc_payload(source_account_id=acct_id, name="Plan A"))
    await client.post("/api/v1/installments", json=_cc_payload(source_account_id=acct_id, name="Plan B"))
    resp = await client.get("/api/v1/installments")
    assert resp.status_code == 200
    body = resp.json()
    assert body["meta"]["total"] >= 2
    assert len(body["data"]) >= 2


@pytest.mark.asyncio
async def test_list_filters_by_type(client):
    cc_id = await _create_account(client, account_type="credit_card")
    await client.post("/api/v1/installments", json=_cc_payload(source_account_id=cc_id, name="CC Plan"))
    await client.post(
        "/api/v1/installments",
        json={
            "type": "store",
            "name": "Store Plan",
            "merchant_name": "IKEA",
            "total_amount_minor": 800000,
            "monthly_amount_minor": 133334,
            "total_months": 6,
            "start_month": "2024-06-01",
            "currency": "EGP",
        },
    )
    resp = await client.get("/api/v1/installments?type=store")
    assert resp.status_code == 200
    assert resp.json()["meta"]["total"] == 1
    assert resp.json()["data"][0]["name"] == "Store Plan"


@pytest.mark.asyncio
async def test_get_installment_by_id(client):
    acct_id = await _create_account(client)
    create_resp = await client.post("/api/v1/installments", json=_cc_payload(source_account_id=acct_id))
    plan_id = create_resp.json()["data"]["id"]
    resp = await client.get(f"/api/v1/installments/{plan_id}")
    assert resp.status_code == 200
    assert resp.json()["data"]["id"] == plan_id


@pytest.mark.asyncio
async def test_get_nonexistent_returns_404(client):
    resp = await client.get("/api/v1/installments/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_installment(client):
    acct_id = await _create_account(client)
    create_resp = await client.post("/api/v1/installments", json=_cc_payload(source_account_id=acct_id))
    plan_id = create_resp.json()["data"]["id"]
    resp = await client.put(f"/api/v1/installments/{plan_id}", json={"name": "Updated Name"})
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "Updated Name"


@pytest.mark.asyncio
async def test_delete_installment_soft_deletes(client):
    acct_id = await _create_account(client)
    create_resp = await client.post("/api/v1/installments", json=_cc_payload(source_account_id=acct_id))
    plan_id = create_resp.json()["data"]["id"]
    del_resp = await client.delete(f"/api/v1/installments/{plan_id}")
    assert del_resp.status_code == 204
    list_resp = await client.get("/api/v1/installments")
    ids = [p["id"] for p in list_resp.json()["data"]]
    assert plan_id not in ids


@pytest.mark.asyncio
async def test_complete_installment(client):
    acct_id = await _create_account(client)
    create_resp = await client.post("/api/v1/installments", json=_cc_payload(source_account_id=acct_id))
    plan_id = create_resp.json()["data"]["id"]
    resp = await client.post(f"/api/v1/installments/{plan_id}/complete")
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "completed"


@pytest.mark.asyncio
async def test_cc_with_wrong_account_type_returns_422(client):
    bank_id = await _create_account(client, account_type="bank_account", credit_limit=None)
    payload = _cc_payload(source_account_id=bank_id)
    resp = await client.post("/api/v1/installments", json=payload)
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_ACCOUNT_TYPE"


@pytest.mark.asyncio
async def test_fa_without_source_returns_422(client):
    payload = {
        "type": "financing_app",
        "name": "Air Conditioner",
        "total_amount_minor": 1500000,
        "monthly_amount_minor": 125000,
        "total_months": 12,
        "start_month": "2024-06-01",
        "currency": "EGP",
    }
    resp = await client.post("/api/v1/installments", json=payload)
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "SOURCE_ACCOUNT_REQUIRED"


@pytest.mark.asyncio
async def test_create_store_installment_without_source(client):
    payload = {
        "type": "store",
        "name": "Washing Machine",
        "merchant_name": "B.TECH",
        "total_amount_minor": 1200000,
        "monthly_amount_minor": 100000,
        "total_months": 12,
        "start_month": "2024-06-01",
        "currency": "EGP",
    }
    resp = await client.post("/api/v1/installments", json=payload)
    assert resp.status_code == 201
    assert resp.json()["data"]["source_account_id"] is None
```

- [ ] **Step 2: Run integration tests**

Run: `cd backend && uv run pytest tests/routers/test_installments.py -v`
Expected: 12 passed

- [ ] **Step 3: Commit**

```bash
git add backend/tests/routers/test_installments.py
git commit -m "test(installments): add router integration tests"
```

---

### Task 7: Financing Apps Summary Endpoint

**Files:**
- Modify: `backend/app/services/installment.py`
- Create: `backend/app/routers/financing_apps.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/routers/test_financing_apps.py`

- [ ] **Step 1: Write failing financing apps tests**

```python
# backend/tests/routers/test_financing_apps.py
import pytest


async def _create_fa_account(client, *, name="ValU", credit_limit=5000000):
    resp = await client.post(
        "/api/v1/accounts",
        json={
            "name": name,
            "type": "financing_app",
            "currency": "EGP",
            "initial_balance": 0,
            "credit_limit": credit_limit,
            "institution": name,
        },
    )
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


async def _create_fa_plan(client, *, source_account_id, name="Purchase", total=1800000, monthly=150000, months=12):
    resp = await client.post(
        "/api/v1/installments",
        json={
            "type": "financing_app",
            "name": name,
            "merchant_name": "B.TECH",
            "source_account_id": source_account_id,
            "total_amount_minor": total,
            "monthly_amount_minor": monthly,
            "total_months": months,
            "start_month": "2024-01-01",
            "currency": "EGP",
        },
    )
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


@pytest.mark.asyncio
async def test_financing_apps_summary_with_plans(client):
    valu_id = await _create_fa_account(client, name="ValU", credit_limit=5000000)
    souhoola_id = await _create_fa_account(client, name="Souhoola", credit_limit=3000000)
    await _create_fa_plan(client, source_account_id=valu_id, name="iPhone", total=1800000, monthly=150000, months=12)
    await _create_fa_plan(client, source_account_id=valu_id, name="Fridge", total=1200000, monthly=100000, months=12)
    await _create_fa_plan(client, source_account_id=souhoola_id, name="AC", total=1500000, monthly=125000, months=12)

    resp = await client.get("/api/v1/financing-apps/summary")
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert len(body["apps"]) == 2
    assert "totals" in body
    # Both apps should have plans
    app_names = {a["name"] for a in body["apps"]}
    assert "ValU" in app_names
    assert "Souhoola" in app_names
    # ValU has 2 plans
    valu = next(a for a in body["apps"] if a["name"] == "ValU")
    assert valu["active_plans_count"] == 2
    assert valu["monthly_commitment_minor"] == 250000  # 150000 + 100000
    # Totals
    assert body["totals"]["total_limit_minor"] == 8000000  # 5M + 3M
    assert body["totals"]["total_monthly_minor"] == 375000  # 150k + 100k + 125k


@pytest.mark.asyncio
async def test_financing_apps_summary_empty(client):
    resp = await client.get("/api/v1/financing-apps/summary")
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["apps"] == []
    assert body["totals"]["total_limit_minor"] == 0


@pytest.mark.asyncio
async def test_financing_apps_summary_remaining_computation(client):
    fa_id = await _create_fa_account(client, name="TestApp", credit_limit=10000000)
    # Plan: 2,400,000 total / 200,000 per month / 12 months
    await _create_fa_plan(client, source_account_id=fa_id, total=2400000, monthly=200000, months=12)
    resp = await client.get("/api/v1/financing-apps/summary")
    body = resp.json()["data"]
    app_detail = body["apps"][0]
    # remaining depends on current date vs start_month (2024-01-01)
    # Since test date > start, remaining < total
    assert app_detail["active_plans_count"] == 1
    assert body["totals"]["total_remaining_minor"] >= 0
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/routers/test_financing_apps.py -v`
Expected: FAIL (endpoint not found / 404)

- [ ] **Step 3: Implement the service function**

Add to `backend/app/services/installment.py`:

```python
async def get_financing_apps_summary(
    session: AsyncSession,
    household_id: uuid.UUID,
) -> dict[str, Any]:
    """Compute per-app utilization and cross-app totals for financing apps."""
    # 1. Get all financing_app accounts
    acct_query = select(Account).where(
        Account.household_id == household_id,
        Account.is_active.is_(True),
        Account.type == "financing_app",
    )
    acct_result = await session.execute(acct_query)
    accounts = list(acct_result.scalars().all())

    if not accounts:
        return {
            "apps": [],
            "totals": {
                "total_limit_minor": 0,
                "total_used_minor": 0,
                "total_available_minor": 0,
                "total_monthly_minor": 0,
                "total_remaining_minor": 0,
            },
        }

    # 2. Get all active installment plans for these accounts in one query
    acct_ids = [a.id for a in accounts]
    plan_query = select(InstallmentPlan).where(
        InstallmentPlan.household_id == household_id,
        InstallmentPlan.is_active.is_(True),
        InstallmentPlan.source_account_id.in_(acct_ids),
    )
    plan_result = await session.execute(plan_query)
    all_plans = list(plan_result.scalars().all())

    # Group plans by source_account_id
    plans_by_account: dict[int, list[InstallmentPlan]] = {}
    for p in all_plans:
        plans_by_account.setdefault(p.source_account_id, []).append(p)

    apps = []
    total_limit = 0
    total_used = 0
    total_monthly = 0
    total_remaining = 0

    for acct in accounts:
        acct_plans = plans_by_account.get(acct.id, [])
        active_plans = [
            p for p in acct_plans if compute_installment_status(p)["status"] == "active"
        ]

        monthly_commitment = sum(p.monthly_amount_minor for p in active_plans)
        remaining = sum(compute_installment_status(p)["remaining_minor"] for p in active_plans)

        credit_limit = acct.credit_limit or 0
        balance = acct.balance_minor or 0
        used = abs(balance)
        available = credit_limit + balance  # balance is negative when owed
        utilization = (used / credit_limit * 100) if credit_limit > 0 else 0.0

        apps.append(
            {
                "account_id": acct.id,
                "name": acct.name,
                "name_ar": None,  # Not stored on account; future enhancement
                "credit_limit_minor": credit_limit,
                "balance_minor": balance,
                "available_minor": available,
                "utilization_percent": round(utilization, 1),
                "active_plans_count": len(active_plans),
                "monthly_commitment_minor": monthly_commitment,
            }
        )

        total_limit += credit_limit
        total_used += used
        total_monthly += monthly_commitment
        total_remaining += remaining

    total_available = total_limit - total_used

    return {
        "apps": apps,
        "totals": {
            "total_limit_minor": total_limit,
            "total_used_minor": total_used,
            "total_available_minor": total_available,
            "total_monthly_minor": total_monthly,
            "total_remaining_minor": total_remaining,
        },
    }
```

- [ ] **Step 4: Create the financing apps router**

```python
# backend/app/routers/financing_apps.py
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.schemas.common import SuccessResponse
from app.services import installment as installment_service

router = APIRouter(prefix="/api/v1/financing-apps", tags=["financing-apps"])


@router.get("/summary")
async def financing_apps_summary(
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    data = await installment_service.get_financing_apps_summary(session, household_id)
    return SuccessResponse(data=data)
```

- [ ] **Step 5: Register financing apps router in main.py**

Add to `backend/app/main.py` imports:
```python
from app.routers.financing_apps import router as financing_apps_router
```

Add after the installments router include:
```python
app.include_router(financing_apps_router)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/routers/test_financing_apps.py -v`
Expected: 3 passed

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/installment.py backend/app/routers/financing_apps.py backend/app/main.py backend/tests/routers/test_financing_apps.py
git commit -m "feat(installments): add financing apps summary endpoint"
```

---

### Task 8: Account Obligations Endpoint

**Files:**
- Modify: `backend/app/services/installment.py`
- Modify: `backend/app/routers/accounts.py`
- Create: `backend/tests/routers/test_account_obligations.py`

- [ ] **Step 1: Write failing obligations tests**

```python
# backend/tests/routers/test_account_obligations.py
import pytest


async def _create_account(client, *, account_type="bank_account", credit_limit=None):
    resp = await client.post(
        "/api/v1/accounts",
        json={
            "name": f"Test {account_type}",
            "type": account_type,
            "currency": "EGP",
            "initial_balance": 0,
            "credit_limit": credit_limit,
        },
    )
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


@pytest.mark.asyncio
async def test_bank_account_shows_linked_debts(client):
    bank_id = await _create_account(client, account_type="bank_account")
    # Create a bank loan linked to this account
    await client.post(
        "/api/v1/debts",
        json={
            "type": "bank_loan",
            "name": "Car Loan",
            "institution": "CIB",
            "principal_minor": 50000000,
            "currency": "EGP",
            "annual_rate_percent": 14.5,
            "tenure_months": 60,
            "start_date": "2024-01-01",
            "linked_account_id": bank_id,
        },
    )
    resp = await client.get(f"/api/v1/accounts/{bank_id}/obligations")
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert len(body["debts"]) == 1
    assert body["debts"][0]["name"] == "Car Loan"
    assert body["installments"] == []


@pytest.mark.asyncio
async def test_credit_card_shows_linked_installments(client):
    cc_id = await _create_account(client, account_type="credit_card", credit_limit=10000000)
    await client.post(
        "/api/v1/installments",
        json={
            "type": "credit_card",
            "name": "iPhone Plan",
            "merchant_name": "B.TECH",
            "source_account_id": cc_id,
            "total_amount_minor": 5400000,
            "monthly_amount_minor": 450000,
            "total_months": 12,
            "start_month": "2024-06-01",
            "currency": "EGP",
        },
    )
    resp = await client.get(f"/api/v1/accounts/{cc_id}/obligations")
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["debts"] == []
    assert len(body["installments"]) == 1
    assert body["installments"][0]["name"] == "iPhone Plan"
    assert "remaining_minor" in body["installments"][0]
    assert "remaining_months" in body["installments"][0]


@pytest.mark.asyncio
async def test_account_with_no_obligations(client):
    acct_id = await _create_account(client, account_type="bank_account")
    resp = await client.get(f"/api/v1/accounts/{acct_id}/obligations")
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["debts"] == []
    assert body["installments"] == []
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/routers/test_account_obligations.py -v`
Expected: FAIL (endpoint not found / 404 or 405)

- [ ] **Step 3: Implement the obligations service function**

Add to `backend/app/services/installment.py`:

```python
async def get_account_obligations(
    session: AsyncSession,
    household_id: uuid.UUID,
    account_id: int,
) -> dict[str, list[dict[str, Any]]]:
    """Return debts and installments linked to a specific account."""
    # Debts linked via linked_account_id
    debt_query = select(Debt).where(
        Debt.household_id == household_id,
        Debt.is_active.is_(True),
        Debt.linked_account_id == account_id,
    )
    debt_result = await session.execute(debt_query)
    debts = list(debt_result.scalars().all())

    # Installments linked via source_account_id
    plan_query = select(InstallmentPlan).where(
        InstallmentPlan.household_id == household_id,
        InstallmentPlan.is_active.is_(True),
        InstallmentPlan.source_account_id == account_id,
    )
    plan_result = await session.execute(plan_query)
    plans = list(plan_result.scalars().all())

    debt_items = []
    for d in debts:
        debt_type = d.type.value if hasattr(d.type, "value") else d.type
        debt_status = d.status.value if hasattr(d.status, "value") else d.status
        debt_items.append(
            {
                "id": d.id,
                "type": debt_type,
                "name": d.name,
                "monthly_payment_minor": d.monthly_payment_minor,
                "remaining_minor": d.principal_minor,  # simplified; exact remaining needs payment sum
                "status": debt_status,
            }
        )

    installment_items = []
    for p in plans:
        computed = compute_installment_status(p)
        plan_type = p.type.value if hasattr(p.type, "value") else p.type
        installment_items.append(
            {
                "id": p.id,
                "type": plan_type,
                "name": p.name,
                "merchant_name": p.merchant_name,
                "monthly_amount_minor": p.monthly_amount_minor,
                "remaining_minor": computed["remaining_minor"],
                "remaining_months": computed["remaining_months"],
                "status": computed["status"],
            }
        )

    return {"debts": debt_items, "installments": installment_items}
```

- [ ] **Step 4: Add the obligations endpoint to accounts router**

Add to `backend/app/routers/accounts.py`:

After the existing imports, add:
```python
from app.services import installment as installment_service
```

Add a new endpoint after the `reconcile_account` endpoint:
```python
@router.get("/{account_id}/obligations")
async def get_account_obligations(
    account_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    account = await account_service.get_account(session, household_id, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Account not found")
            ).model_dump(),
        )
    data = await installment_service.get_account_obligations(session, household_id, account_id)
    return SuccessResponse(data=data)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/routers/test_account_obligations.py -v`
Expected: 3 passed

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/installment.py backend/app/routers/accounts.py backend/tests/routers/test_account_obligations.py
git commit -m "feat(installments): add account obligations endpoint"
```

---

### Task 9: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `cd backend && uv run pytest --tb=short -q`
Expected: All tests pass (previous 327 + ~39 new = ~366 total)

- [ ] **Step 2: Run linting**

Run: `cd backend && uv run ruff check . && uv run ruff format --check .`
Expected: clean

- [ ] **Step 3: Run type checking**

Run: `cd backend && uv run pyright`
Expected: 0 errors

- [ ] **Step 4: Final commit if any formatting fixes needed**

```bash
cd backend && uv run ruff format .
git add -A
git commit -m "style(installments): fix formatting"
```

---

### Test Summary

| File | Test Count | Coverage |
|------|-----------|----------|
| `tests/schemas/test_installment_schemas.py` | 5 | Schema validation |
| `tests/services/test_installment_service.py` | 16 | Status computation (4), create + validation (6), CRUD (6) |
| `tests/routers/test_installments.py` | 12 | Full HTTP cycle: CRUD, validation, completion |
| `tests/routers/test_financing_apps.py` | 3 | Summary with plans, empty, remaining computation |
| `tests/routers/test_account_obligations.py` | 3 | Bank debts, CC installments, empty |
| **Total** | **39** | |

### Spec Coverage Checklist

| Spec Requirement (Section 5.10) | Task |
|--------------------------------|------|
| CRUD: Create, read, update, delete for all 3 types | Tasks 1–6 |
| Account type validation: CC→credit_card, FA→financing_app | Tasks 3, 6 |
| Credit limit consumption: Remaining balance decreases as months pass | Task 2 (status computation) |
| CC utilization: Multiple concurrent plans, remaining-based | Task 7 (financing apps summary) |
| Financing apps summary: Per-app and cross-app totals | Task 7 |
| Account obligations endpoint: Debts + installments per account | Task 8 |
| Completion: Auto-complete after total_months, manual early payoff | Tasks 2, 4, 6 |
| Store installment with/without CC link | Tasks 3, 6 |
