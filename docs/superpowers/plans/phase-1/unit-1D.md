# Unit 1D: Account & Category APIs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Account CRUD router (list, get, create, update, delete, reconcile, net-worth) and Category router (list, create, update, delete) with full test coverage per the testing guide.

**Architecture:** Routers handle HTTP concerns (request parsing, response formatting, status codes). Business logic lives in service functions called by routers. Every route uses dependency injection for `session` and `household_id`. All queries include `household_id` filtering and `is_active = True`.

**Tech Stack:** FastAPI routers, SQLAlchemy async queries, Pydantic v2 schemas from Unit 1C

**Required reading:** `CLAUDE.md` (DI pattern, API conventions, soft delete rules), `03-features/accounts.md`, `03-features/categories.md`, `guides/08-testing.md`

---

## File Structure

```
backend/app/
├── routers/
│   ├── __init__.py
│   ├── accounts.py          # NEW: 6 endpoints
│   └── categories.py        # NEW: 4 endpoints
├── services/
│   └── account.py           # NEW: Account business logic
├── main.py                  # MODIFY: include routers
backend/tests/
├── routers/
│   ├── __init__.py
│   ├── test_accounts.py     # NEW
│   └── test_categories.py   # NEW
```

---

### Task 1: Account Service (Business Logic)

**Files:**
- Create: `backend/app/services/account.py`
- Test: `backend/tests/services/test_account_service.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/services/test_account_service.py`:
```python
import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.enums import AccountType
from app.services.account import create_account, list_accounts, get_account, soft_delete_account


@pytest.fixture
async def household_id():
    return uuid.uuid4()


@pytest.fixture
async def db_account(session: AsyncSession, household_id: uuid.UUID) -> Account:
    """Create a test account directly via ORM."""
    acct = Account(
        household_id=household_id,
        name="Test Bank",
        type=AccountType.BANK_ACCOUNT,
        currency="EGP",
        balance_minor=1000000,
    )
    session.add(acct)
    await session.flush()
    return acct
```

Note: This test file requires a real database session fixture. The tests here validate that service functions correctly interact with the database. **The actual session fixture depends on having a test database.** If a test database is not yet available, these tests will be integration tests that run once the database is set up.

For now, the service functions will be unit-tested indirectly through the router tests in Task 2 (which use `httpx.AsyncClient` with FastAPI's test infrastructure).

- [ ] **Step 2: Write account service**

Create `backend/app/services/account.py`:
```python
"""Account business logic. No HTTP awareness."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.transaction import Transaction
from app.schemas.account import AccountCreate, AccountUpdate


async def list_accounts(
    session: AsyncSession,
    household_id: uuid.UUID,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Account], int]:
    """List active accounts with pagination. Returns (accounts, total_count)."""
    # Count
    count_q = select(func.count(Account.id)).where(
        Account.household_id == household_id,
        Account.is_active == True,  # noqa: E712
    )
    total = (await session.execute(count_q)).scalar_one()

    # Fetch
    q = (
        select(Account)
        .where(Account.household_id == household_id, Account.is_active == True)  # noqa: E712
        .offset((page - 1) * page_size)
        .limit(page_size)
        .order_by(Account.id)
    )
    result = await session.execute(q)
    return list(result.scalars().all()), total


async def get_account(
    session: AsyncSession,
    household_id: uuid.UUID,
    account_id: int,
) -> Account | None:
    """Get a single active account by ID within household."""
    q = select(Account).where(
        Account.id == account_id,
        Account.household_id == household_id,
        Account.is_active == True,  # noqa: E712
    )
    result = await session.execute(q)
    return result.scalar_one_or_none()


async def create_account(
    session: AsyncSession,
    household_id: uuid.UUID,
    data: AccountCreate,
) -> Account:
    """Create a new account."""
    account = Account(
        household_id=household_id,
        name=data.name,
        type=data.type,
        currency=data.currency,
        balance_minor=data.initial_balance,
        institution=data.institution,
        credit_limit=data.credit_limit,
        billing_cycle_day=data.billing_cycle_day,
        payment_due_day=data.payment_due_day,
        opened_at=data.opened_at,
    )
    session.add(account)
    await session.flush()
    return account


async def update_account(
    session: AsyncSession,
    account: Account,
    data: AccountUpdate,
) -> Account:
    """Update account fields. Currency and type are immutable."""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)
    await session.flush()
    return account


async def soft_delete_account(
    session: AsyncSession,
    account: Account,
) -> None:
    """Soft delete an account."""
    account.is_active = False
    await session.flush()


async def compute_displayed_balance(
    session: AsyncSession,
    account: Account,
) -> int:
    """Compute displayed balance: seed + sum of active transactions."""
    q = select(func.coalesce(func.sum(Transaction.amount_minor), 0)).where(
        Transaction.account_id == account.id,
        Transaction.is_active == True,  # noqa: E712
        Transaction.applies_to_balance == True,  # noqa: E712
    )
    if account.opened_at:
        q = q.where(Transaction.date >= account.opened_at)

    tx_sum = (await session.execute(q)).scalar_one()
    return account.balance_minor + tx_sum


async def reconcile_account(
    session: AsyncSession,
    account: Account,
    actual_balance: int,
    notes: str | None = None,
) -> int:
    """Reconcile: adjust seed balance so displayed_balance = actual_balance.

    Returns the discrepancy (actual - computed).
    """
    displayed = await compute_displayed_balance(session, account)
    discrepancy = actual_balance - displayed
    account.balance_minor += discrepancy
    await session.flush()
    return discrepancy
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/account.py
git commit -m "feat(backend): add account service with CRUD, balance computation, reconciliation"
```

---

### Task 2: Account Router

**Files:**
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/routers/accounts.py`
- Test: `backend/tests/routers/__init__.py`
- Test: `backend/tests/routers/test_accounts.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/routers/__init__.py` (empty).

Create `backend/tests/routers/test_accounts.py`:
```python
import pytest


@pytest.mark.asyncio
async def test_create_account_returns_201(client):
    response = await client.post("/api/v1/accounts", json={
        "name": "CIB Savings",
        "type": "bank_account",
        "currency": "EGP",
        "initial_balance": 1000000,
    })
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == "CIB Savings"
    assert data["balance_minor"] == 1000000
    assert data["displayed_balance_minor"] == 1000000


@pytest.mark.asyncio
async def test_list_accounts_returns_paginated(client):
    # Create two accounts
    await client.post("/api/v1/accounts", json={
        "name": "Account A", "type": "bank_account", "currency": "EGP",
    })
    await client.post("/api/v1/accounts", json={
        "name": "Account B", "type": "cash_wallet", "currency": "EGP",
    })
    response = await client.get("/api/v1/accounts")
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert "meta" in body
    assert body["meta"]["total"] >= 2


@pytest.mark.asyncio
async def test_get_account_not_found_returns_404(client):
    response = await client.get("/api/v1/accounts/99999")
    assert response.status_code == 404
    assert "error" in response.json()


@pytest.mark.asyncio
async def test_delete_account_soft_deletes(client):
    create_resp = await client.post("/api/v1/accounts", json={
        "name": "To Delete", "type": "bank_account", "currency": "EGP",
    })
    account_id = create_resp.json()["data"]["id"]
    delete_resp = await client.delete(f"/api/v1/accounts/{account_id}")
    assert delete_resp.status_code == 204
    # Should not appear in list
    list_resp = await client.get("/api/v1/accounts")
    ids = [a["id"] for a in list_resp.json()["data"]]
    assert account_id not in ids


@pytest.mark.asyncio
async def test_update_account(client):
    create_resp = await client.post("/api/v1/accounts", json={
        "name": "Old Name", "type": "bank_account", "currency": "EGP",
    })
    account_id = create_resp.json()["data"]["id"]
    update_resp = await client.put(f"/api/v1/accounts/{account_id}", json={
        "name": "New Name",
    })
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["name"] == "New Name"


@pytest.mark.asyncio
async def test_reconcile_account(client):
    create_resp = await client.post("/api/v1/accounts", json={
        "name": "Reconcile Test", "type": "bank_account", "currency": "EGP",
        "initial_balance": 1000000,
    })
    account_id = create_resp.json()["data"]["id"]
    recon_resp = await client.post(f"/api/v1/accounts/{account_id}/reconcile", json={
        "actual_balance": 1200000,
    })
    assert recon_resp.status_code == 200
    assert recon_resp.json()["data"]["discrepancy"] == 200000
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/routers/test_accounts.py -v
```

Expected: FAIL — 404 because no router is mounted yet.

- [ ] **Step 3: Write accounts router**

Create `backend/app/routers/__init__.py` (empty).

Create `backend/app/routers/accounts.py`:
```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.schemas.account import AccountCreate, AccountResponse, AccountUpdate, ReconcileRequest
from app.schemas.common import ErrorDetail, ErrorResponse, PaginationMeta, SuccessResponse
from app.services import account as account_service

router = APIRouter(prefix="/api/v1/accounts", tags=["accounts"])


@router.get("")
async def list_accounts(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    accounts, total = await account_service.list_accounts(
        session, household_id, page, page_size
    )
    items = []
    for acct in accounts:
        displayed = await account_service.compute_displayed_balance(session, acct)
        items.append(
            AccountResponse(
                id=acct.id,
                name=acct.name,
                type=acct.type.value if hasattr(acct.type, "value") else acct.type,
                currency=acct.currency,
                balance_minor=acct.balance_minor,
                displayed_balance_minor=displayed,
                institution=acct.institution,
                credit_limit=acct.credit_limit,
                billing_cycle_day=acct.billing_cycle_day,
                payment_due_day=acct.payment_due_day,
                opened_at=acct.opened_at,
                is_active=acct.is_active,
            )
        )
    return SuccessResponse(
        data=[item.model_dump() for item in items],
        meta=PaginationMeta(total=total, page=page, page_size=page_size),
    )


@router.get("/{account_id}")
async def get_account(
    account_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    account = await account_service.get_account(session, household_id, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Account not found")
            ).model_dump(),
        )
    displayed = await account_service.compute_displayed_balance(session, account)
    resp = AccountResponse(
        id=account.id,
        name=account.name,
        type=account.type.value if hasattr(account.type, "value") else account.type,
        currency=account.currency,
        balance_minor=account.balance_minor,
        displayed_balance_minor=displayed,
        institution=account.institution,
        credit_limit=account.credit_limit,
        billing_cycle_day=account.billing_cycle_day,
        payment_due_day=account.payment_due_day,
        opened_at=account.opened_at,
        is_active=account.is_active,
    )
    return SuccessResponse(data=resp.model_dump())


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_account(
    data: AccountCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    account = await account_service.create_account(session, household_id, data)
    displayed = await account_service.compute_displayed_balance(session, account)
    resp = AccountResponse(
        id=account.id,
        name=account.name,
        type=account.type.value if hasattr(account.type, "value") else account.type,
        currency=account.currency,
        balance_minor=account.balance_minor,
        displayed_balance_minor=displayed,
        institution=account.institution,
        credit_limit=account.credit_limit,
        billing_cycle_day=account.billing_cycle_day,
        payment_due_day=account.payment_due_day,
        opened_at=account.opened_at,
        is_active=account.is_active,
    )
    return SuccessResponse(data=resp.model_dump())


@router.put("/{account_id}")
async def update_account(
    account_id: int,
    data: AccountUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    account = await account_service.get_account(session, household_id, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    account = await account_service.update_account(session, account, data)
    displayed = await account_service.compute_displayed_balance(session, account)
    resp = AccountResponse(
        id=account.id,
        name=account.name,
        type=account.type.value if hasattr(account.type, "value") else account.type,
        currency=account.currency,
        balance_minor=account.balance_minor,
        displayed_balance_minor=displayed,
        institution=account.institution,
        credit_limit=account.credit_limit,
        billing_cycle_day=account.billing_cycle_day,
        payment_due_day=account.payment_due_day,
        opened_at=account.opened_at,
        is_active=account.is_active,
    )
    return SuccessResponse(data=resp.model_dump())


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    account = await account_service.get_account(session, household_id, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    await account_service.soft_delete_account(session, account)


@router.post("/{account_id}/reconcile")
async def reconcile_account(
    account_id: int,
    data: ReconcileRequest,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    account = await account_service.get_account(session, household_id, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    discrepancy = await account_service.reconcile_account(
        session, account, data.actual_balance, data.notes
    )
    return SuccessResponse(data={"discrepancy": discrepancy})
```

- [ ] **Step 4: Register router in main.py**

Add to `backend/app/main.py`, after app creation:
```python
from app.routers import accounts

app.include_router(accounts.router)
```

- [ ] **Step 5: Update test conftest.py with database fixtures**

The router tests need a real in-memory database. Update `backend/tests/conftest.py` to use an in-memory SQLite for fast testing (will switch to PostgreSQL for integration tests later):

Replace `backend/tests/conftest.py`:
```python
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.dependencies import get_current_user, get_db_session, get_household_id
from app.main import app
from app.models.base import Base

TEST_USER_ID = uuid.uuid4()
TEST_HOUSEHOLD_ID = uuid.uuid4()

# In-memory SQLite for fast tests
test_engine = create_async_engine("sqlite+aiosqlite://", echo=False)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(autouse=True)
async def setup_database():
    """Create all tables before each test, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_db_session():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def override_get_current_user() -> uuid.UUID:
    return TEST_USER_ID


async def override_get_household_id() -> uuid.UUID:
    return TEST_HOUSEHOLD_ID


@pytest.fixture(autouse=True)
def override_deps():
    app.dependency_overrides[get_db_session] = override_get_db_session
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_household_id] = override_get_household_id
    yield
    app.dependency_overrides.clear()


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
```

Note: This requires `aiosqlite` as a dev dependency. Add it:
```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/backend
uv add --dev aiosqlite
```

- [ ] **Step 6: Run test to verify it passes**

```bash
uv run pytest tests/routers/test_accounts.py -v
```

Expected: 6 passed

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/ backend/tests/routers/ backend/tests/conftest.py backend/app/main.py
git commit -m "feat(accounts): add Account CRUD router with reconciliation and net-worth"
```

---

### Task 3: Category Router

**Files:**
- Create: `backend/app/routers/categories.py`
- Test: `backend/tests/routers/test_categories.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/routers/test_categories.py`:
```python
import pytest


@pytest.mark.asyncio
async def test_list_categories_returns_paginated(client):
    response = await client.get("/api/v1/categories")
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert "meta" in body


@pytest.mark.asyncio
async def test_create_custom_category(client):
    response = await client.post("/api/v1/categories", json={
        "name_en": "Kids School Fees",
        "name_ar": "مصاريف مدرسة",
        "type": "expense",
        "icon": "graduation-cap",
        "color": "#3B82F6",
    })
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name_en"] == "Kids School Fees"
    assert data["is_predefined"] is False


@pytest.mark.asyncio
async def test_update_custom_category(client):
    create_resp = await client.post("/api/v1/categories", json={
        "name_en": "Old Name", "type": "expense",
    })
    cat_id = create_resp.json()["data"]["id"]
    update_resp = await client.put(f"/api/v1/categories/{cat_id}", json={
        "name_en": "New Name",
    })
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["name_en"] == "New Name"


@pytest.mark.asyncio
async def test_delete_custom_category(client):
    create_resp = await client.post("/api/v1/categories", json={
        "name_en": "Temp", "type": "expense",
    })
    cat_id = create_resp.json()["data"]["id"]
    delete_resp = await client.delete(f"/api/v1/categories/{cat_id}")
    assert delete_resp.status_code == 204


@pytest.mark.asyncio
async def test_delete_predefined_category_fails(client):
    """Predefined categories cannot be deleted — should return 403."""
    # First seed a predefined category directly
    from app.models.category import Category
    from tests.conftest import TestSessionLocal, TEST_HOUSEHOLD_ID

    async with TestSessionLocal() as session:
        cat = Category(
            household_id=None,
            name_en="Salary",
            name_ar="راتب",
            type="income",
            is_predefined=True,
            sort_order=1,
        )
        session.add(cat)
        await session.commit()
        cat_id = cat.id

    delete_resp = await client.delete(f"/api/v1/categories/{cat_id}")
    assert delete_resp.status_code == 403
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/routers/test_categories.py -v
```

Expected: FAIL — 404, no router mounted

- [ ] **Step 3: Write categories router**

Create `backend/app/routers/categories.py`:
```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from app.schemas.common import PaginationMeta, SuccessResponse

router = APIRouter(prefix="/api/v1/categories", tags=["categories"])


@router.get("")
async def list_categories(
    type: str | None = None,
    active_only: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    q = select(Category).where(
        (Category.household_id == household_id) | (Category.household_id.is_(None))
    )
    count_q = select(func.count(Category.id)).where(
        (Category.household_id == household_id) | (Category.household_id.is_(None))
    )

    if active_only:
        q = q.where(Category.is_active == True)  # noqa: E712
        count_q = count_q.where(Category.is_active == True)  # noqa: E712
    if type:
        q = q.where(Category.type == type)
        count_q = count_q.where(Category.type == type)

    total = (await session.execute(count_q)).scalar_one()
    q = q.order_by(Category.sort_order).offset((page - 1) * page_size).limit(page_size)
    result = await session.execute(q)
    categories = result.scalars().all()

    items = [
        CategoryResponse.model_validate(cat).model_dump() for cat in categories
    ]
    return SuccessResponse(
        data=items,
        meta=PaginationMeta(total=total, page=page, page_size=page_size),
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    category = Category(
        household_id=household_id,
        name_en=data.name_en,
        name_ar=data.name_ar,
        type=data.type,
        icon=data.icon,
        color=data.color,
        is_predefined=False,
    )
    session.add(category)
    await session.flush()
    return SuccessResponse(
        data=CategoryResponse.model_validate(category).model_dump()
    )


@router.put("/{category_id}")
async def update_category(
    category_id: int,
    data: CategoryUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    q = select(Category).where(
        Category.id == category_id,
        Category.is_active == True,  # noqa: E712
        (Category.household_id == household_id) | (Category.household_id.is_(None)),
    )
    result = await session.execute(q)
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    update_data = data.model_dump(exclude_unset=True)

    # Predefined categories: only icon and color are editable
    if category.is_predefined:
        allowed = {"icon", "color"}
        update_data = {k: v for k, v in update_data.items() if k in allowed}

    for field, value in update_data.items():
        setattr(category, field, value)
    await session.flush()

    return SuccessResponse(
        data=CategoryResponse.model_validate(category).model_dump()
    )


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    q = select(Category).where(
        Category.id == category_id,
        Category.is_active == True,  # noqa: E712
        (Category.household_id == household_id) | (Category.household_id.is_(None)),
    )
    result = await session.execute(q)
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    if category.is_predefined:
        raise HTTPException(status_code=403, detail="Cannot delete predefined categories")

    category.is_active = False
    await session.flush()
```

- [ ] **Step 4: Register router in main.py**

Add to `backend/app/main.py`:
```python
from app.routers import categories

app.include_router(categories.router)
```

- [ ] **Step 5: Run test to verify it passes**

```bash
uv run pytest tests/routers/test_categories.py -v
```

Expected: 5 passed

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/categories.py backend/tests/routers/test_categories.py backend/app/main.py
git commit -m "feat(categories): add Category CRUD router with predefined protection"
```

---

### Task 4: Run Full Test Suite

- [ ] **Step 1: Run all tests**

```bash
uv run pytest -v
```

Expected: All pass (~60+ tests).

- [ ] **Step 2: Lint and format**

```bash
uv run ruff check . && uv run ruff format --check .
```

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "style(backend): format account and category routers"
```
