# Wave 2: Backend Completeness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the net-worth aggregation endpoint, tighten credit card validation, add category hierarchy with parent/child support, and update category filtering to include child categories.

**Architecture:** Three independent units (1.5C, 1.5D, 1.5E) that can be developed in parallel on separate branches. 1.5D depends on 1.5E being merged first (child-category filter needs the hierarchy column). All follow existing patterns: pure service functions + thin router endpoints + Pydantic schemas.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 (async), Pydantic v2, Alembic, pytest-asyncio

**Prerequisites:** Wave 1 merged (Next.js 16 + Tailwind v4). Backend CI green on main.

**Design spec:** `docs/superpowers/specs/2026-03-28-phase-1.5-gap-remediation-design.md` (Sections 5.1–5.3)

---

## File Structure

### Unit 1.5C: Net-worth endpoint + validation

| File | Change |
|------|--------|
| `backend/app/services/account.py` | Add `compute_net_worth()` function |
| `backend/app/routers/accounts.py` | Add `GET /api/v1/accounts/net-worth` endpoint |
| `backend/app/schemas/account.py` | Add `NetWorthResponse` schema, add validator to `AccountCreate` |
| `backend/tests/integration/test_accounts_api.py` | Add net-worth + validation tests |

### Unit 1.5E: Category hierarchy

| File | Change |
|------|--------|
| `backend/app/models/category.py` | Add `parent_category_id` column |
| `backend/app/schemas/category.py` | Add `parent_category_id` to all schemas, add `CategoryTreeNode` |
| `backend/app/services/category.py` | Add `get_category_tree()`, update `create_category()` for hierarchy validation |
| `backend/app/routers/categories.py` | Add `GET /api/v1/categories/tree` endpoint |
| `backend/alembic/versions/xxx_add_category_hierarchy.py` | Migration for `parent_category_id` |
| `backend/tests/integration/test_categories_api.py` | Add hierarchy + tree tests |

### Unit 1.5D: Category child-filter

| File | Change |
|------|--------|
| `backend/app/services/transaction.py` | Update `list_transactions()` category filter to include children |
| `backend/tests/integration/test_transactions_api.py` | Add child-category filter test |

---

## Unit 1.5C: Net-Worth Endpoint + Credit Card Validation

### Task 1: Add NetWorthResponse schema

**Files:**
- Modify: `backend/app/schemas/account.py`

- [ ] **Step 1: Add the NetWorthResponse schema to `backend/app/schemas/account.py`**

Add after the `ReconcileRequest` class:

```python
class NetWorthResponse(BaseModel):
    by_currency: dict[str, int]  # {"EGP": 50000000, "USD": 100000}
    total_base_minor: int
    base_currency: str
    account_count: int
```

- [ ] **Step 2: Add credit card validation to AccountCreate**

Add a `model_validator` to `AccountCreate` that enforces credit_limit is required for credit_card and financing_app types. Add this import at the top:

```python
from pydantic import BaseModel, Field, model_validator
```

Then add the validator inside `AccountCreate`:

```python
class AccountCreate(BaseModel):
    name: str
    type: str  # AccountType value
    currency: str = Field(max_length=3)
    initial_balance: int = 0  # Minor units, integer only
    institution: str | None = None
    credit_limit: int | None = Field(default=None, ge=0)
    billing_cycle_day: int | None = Field(default=None, ge=1, le=31)
    payment_due_day: int | None = Field(default=None, ge=1, le=31)
    opened_at: date | None = None

    @model_validator(mode="after")
    def validate_credit_fields(self) -> "AccountCreate":
        credit_types = {"credit_card", "financing_app"}
        if self.type in credit_types and self.credit_limit is None:
            raise ValueError("credit_limit is required for credit_card and financing_app accounts")
        if self.type not in credit_types:
            if self.billing_cycle_day is not None or self.payment_due_day is not None:
                raise ValueError(
                    "billing_cycle_day and payment_due_day are only valid for credit_card and financing_app accounts"
                )
        return self
```

- [ ] **Step 3: Commit schema changes**

```bash
git add backend/app/schemas/account.py
git commit -m "feat(accounts): add NetWorthResponse schema and credit card validation"
```

---

### Task 2: Write failing test for net-worth endpoint

**Files:**
- Modify: `backend/tests/integration/test_accounts_api.py`

- [ ] **Step 1: Add net-worth integration test**

Add at the end of the test file:

```python
@pytest.mark.asyncio
async def test_net_worth_empty(client: AsyncClient, auth_headers: dict):
    """Net worth with no accounts returns zeroes."""
    resp = await client.get("/api/v1/accounts/net-worth", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["by_currency"] == {}
    assert data["total_base_minor"] == 0
    assert data["account_count"] == 0


@pytest.mark.asyncio
async def test_net_worth_single_currency(client: AsyncClient, auth_headers: dict):
    """Net worth with one EGP account returns correct balance."""
    # Create an account with initial balance 100000 (1000.00 EGP)
    await client.post(
        "/api/v1/accounts",
        json={"name": "Bank", "type": "bank_account", "currency": "EGP", "initial_balance": 100000},
        headers=auth_headers,
    )
    resp = await client.get("/api/v1/accounts/net-worth", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["by_currency"]["EGP"] == 100000
    assert data["account_count"] == 1
    assert data["base_currency"] == "EGP"


@pytest.mark.asyncio
async def test_net_worth_excludes_inactive(client: AsyncClient, auth_headers: dict):
    """Net worth ignores soft-deleted accounts."""
    create_resp = await client.post(
        "/api/v1/accounts",
        json={"name": "Old", "type": "bank_account", "currency": "EGP", "initial_balance": 50000},
        headers=auth_headers,
    )
    acct_id = create_resp.json()["data"]["id"]
    await client.delete(f"/api/v1/accounts/{acct_id}", headers=auth_headers)

    resp = await client.get("/api/v1/accounts/net-worth", headers=auth_headers)
    data = resp.json()["data"]
    assert data["account_count"] == 0
    assert data["by_currency"] == {}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && uv run pytest tests/integration/test_accounts_api.py -k "net_worth" -v
```

Expected: FAIL (404 — endpoint doesn't exist yet).

- [ ] **Step 3: Commit the failing tests**

```bash
git add backend/tests/integration/test_accounts_api.py
git commit -m "test(accounts): add failing net-worth endpoint tests"
```

---

### Task 3: Implement net-worth service function

**Files:**
- Modify: `backend/app/services/account.py`

- [ ] **Step 1: Add `compute_net_worth()` to `backend/app/services/account.py`**

Add this function after `reconcile_account()`:

```python
async def compute_net_worth(
    session: AsyncSession,
    household_id: uuid.UUID,
) -> dict:
    """Compute net worth: sum of displayed balances across all active accounts, grouped by currency.

    Returns dict with by_currency, total_base_minor, base_currency, account_count.
    """
    from app.models.household import Household

    # Get base currency from household
    household = await session.get(Household, household_id)
    base_currency = household.base_currency if household else "EGP"

    # Get all active accounts
    q = select(Account).where(
        Account.household_id == household_id,
        Account.is_active.is_(True),
    )
    result = await session.execute(q)
    accounts = list(result.scalars().all())

    by_currency: dict[str, int] = {}
    for acct in accounts:
        displayed = await compute_displayed_balance(session, acct)
        by_currency[acct.currency] = by_currency.get(acct.currency, 0) + displayed

    # For now, total_base_minor = the base currency amount (cross-currency conversion
    # requires exchange rates which are a Phase 4 feature — stub with base currency only).
    total_base_minor = by_currency.get(base_currency, 0)

    return {
        "by_currency": by_currency,
        "total_base_minor": total_base_minor,
        "base_currency": base_currency,
        "account_count": len(accounts),
    }
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/account.py
git commit -m "feat(accounts): add compute_net_worth service function"
```

---

### Task 4: Add net-worth router endpoint

**Files:**
- Modify: `backend/app/routers/accounts.py`

- [ ] **Step 1: Add the endpoint to `backend/app/routers/accounts.py`**

Add this import at the top (alongside existing imports):

```python
from app.schemas.account import AccountCreate, AccountResponse, AccountUpdate, NetWorthResponse, ReconcileRequest
```

Add the endpoint **before** the `/{account_id}` route (to avoid path collision):

```python
@router.get("/net-worth")
async def get_net_worth(
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    """Compute total net worth across all active accounts, grouped by currency."""
    result = await account_service.compute_net_worth(session, household_id)
    return SuccessResponse(data=result)
```

**Important:** This route MUST be declared before `@router.get("/{account_id}")` — otherwise FastAPI will try to parse "net-worth" as an integer account_id and return 422.

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd backend && uv run pytest tests/integration/test_accounts_api.py -k "net_worth" -v
```

Expected: all 3 net-worth tests PASS.

- [ ] **Step 3: Run full test suite**

```bash
cd backend && uv run pytest -v
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/accounts.py
git commit -m "feat(accounts): add GET /api/v1/accounts/net-worth endpoint"
```

---

### Task 5: Credit card validation tests

**Files:**
- Modify: `backend/tests/integration/test_accounts_api.py`

- [ ] **Step 1: Add validation tests**

```python
@pytest.mark.asyncio
async def test_credit_card_requires_credit_limit(client: AsyncClient, auth_headers: dict):
    """Creating a credit card without credit_limit returns 422."""
    resp = await client.post(
        "/api/v1/accounts",
        json={"name": "CC", "type": "credit_card", "currency": "EGP"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_bank_account_rejects_billing_cycle(client: AsyncClient, auth_headers: dict):
    """Bank accounts cannot have billing_cycle_day."""
    resp = await client.post(
        "/api/v1/accounts",
        json={
            "name": "Bank",
            "type": "bank_account",
            "currency": "EGP",
            "billing_cycle_day": 15,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_credit_card_accepts_all_fields(client: AsyncClient, auth_headers: dict):
    """Credit card with all fields creates successfully."""
    resp = await client.post(
        "/api/v1/accounts",
        json={
            "name": "Visa",
            "type": "credit_card",
            "currency": "EGP",
            "credit_limit": 1000000,
            "billing_cycle_day": 25,
            "payment_due_day": 10,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["credit_limit"] == 1000000
    assert data["billing_cycle_day"] == 25
    assert data["payment_due_day"] == 10
```

- [ ] **Step 2: Run tests**

```bash
cd backend && uv run pytest tests/integration/test_accounts_api.py -k "credit" -v
```

Expected: all 3 PASS (the schema validator from Task 1 handles these).

- [ ] **Step 3: Run full suite and commit**

```bash
cd backend && uv run pytest -v
```

Check that existing tests still pass (some may create credit cards without credit_limit and now fail). If so, update those test fixtures to include `"credit_limit": 1000000` where needed.

```bash
git add backend/tests/integration/test_accounts_api.py
git commit -m "test(accounts): add credit card validation tests"
```

---

### Task 6: Push Unit 1.5C PR

- [ ] **Step 1: Push and create PR**

```bash
git push -u origin feature/1.5C-net-worth-endpoint
```

Create PR: `feat(accounts): net-worth endpoint + credit card validation (#1.5C)`

- [ ] **Step 2: Request Copilot code review**

- [ ] **Step 3: Fix Copilot findings (if any)**

---

### Unit 1.5C UAT Checklist

- [ ] CI pipeline green
- [ ] `GET /api/v1/accounts/net-worth` returns correct aggregation
- [ ] Net-worth excludes soft-deleted accounts
- [ ] Creating credit_card without credit_limit returns 422
- [ ] Creating bank_account with billing_cycle_day returns 422
- [ ] Creating credit_card with all fields succeeds
- [ ] Existing account creation still works (no regressions)

---

## Unit 1.5E: Category Hierarchy

### Task 7: Write Alembic migration for parent_category_id

**Files:**
- Create: `backend/alembic/versions/xxx_add_category_parent.py`
- Modify: `backend/app/models/category.py`

- [ ] **Step 1: Add `parent_category_id` to the Category model**

Edit `backend/app/models/category.py`. Add to imports:

```python
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, func
```

Add the column after `sort_order`:

```python
    parent_category_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("categories.id"), nullable=True
    )
```

- [ ] **Step 2: Generate Alembic migration**

```bash
cd backend && uv run alembic revision --autogenerate -m "add category parent_category_id"
```

- [ ] **Step 3: Review the generated migration**

Open the file in `backend/alembic/versions/`. Verify it contains:

```python
op.add_column('categories', sa.Column('parent_category_id', sa.Integer(), nullable=True))
op.create_foreign_key(None, 'categories', 'categories', ['parent_category_id'], ['id'])
```

- [ ] **Step 4: Apply migration**

```bash
cd backend && uv run alembic upgrade head
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/category.py backend/alembic/versions/
git commit -m "feat(categories): add parent_category_id column for hierarchy support"
```

---

### Task 8: Update category schemas

**Files:**
- Modify: `backend/app/schemas/category.py`

- [ ] **Step 1: Replace `backend/app/schemas/category.py` with updated schemas**

```python
from __future__ import annotations

from pydantic import BaseModel, model_validator


class CategoryCreate(BaseModel):
    name_en: str
    name_ar: str | None = None
    type: str  # "expense", "income", "special"
    icon: str | None = None
    color: str | None = None
    parent_category_id: int | None = None


class CategoryUpdate(BaseModel):
    name_en: str | None = None
    name_ar: str | None = None
    icon: str | None = None
    color: str | None = None
    parent_category_id: int | None = None


class CategoryResponse(BaseModel):
    id: int
    name_en: str
    name_ar: str | None = None
    type: str
    icon: str | None = None
    color: str | None = None
    is_predefined: bool
    sort_order: int
    parent_category_id: int | None = None

    model_config = {"from_attributes": True}


class CategoryTreeNode(BaseModel):
    """Category with nested children for tree endpoint."""

    id: int
    name_en: str
    name_ar: str | None = None
    type: str
    icon: str | None = None
    color: str | None = None
    is_predefined: bool
    sort_order: int
    parent_category_id: int | None = None
    children: list[CategoryTreeNode] = []

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/category.py
git commit -m "feat(categories): add parent_category_id and CategoryTreeNode schemas"
```

---

### Task 9: Write failing tests for hierarchy

**Files:**
- Modify: `backend/tests/integration/test_categories_api.py`

- [ ] **Step 1: Add hierarchy tests**

```python
@pytest.mark.asyncio
async def test_create_child_category(client: AsyncClient, auth_headers: dict):
    """Create a child category under a predefined parent."""
    # Get predefined categories to find a parent
    resp = await client.get("/api/v1/categories", headers=auth_headers)
    categories = resp.json()["data"]
    parent = next(c for c in categories if c["is_predefined"] and c["type"] == "expense")

    # Create child
    resp = await client.post(
        "/api/v1/categories",
        json={
            "name_en": "Fast Food",
            "name_ar": "وجبات سريعة",
            "type": "expense",
            "parent_category_id": parent["id"],
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["parent_category_id"] == parent["id"]


@pytest.mark.asyncio
async def test_reject_grandchild(client: AsyncClient, auth_headers: dict):
    """Cannot create a category 3 levels deep (max 2)."""
    # Create parent (custom)
    resp = await client.post(
        "/api/v1/categories",
        json={"name_en": "Custom Parent", "type": "expense"},
        headers=auth_headers,
    )
    parent_id = resp.json()["data"]["id"]

    # Create child
    resp = await client.post(
        "/api/v1/categories",
        json={"name_en": "Child", "type": "expense", "parent_category_id": parent_id},
        headers=auth_headers,
    )
    child_id = resp.json()["data"]["id"]

    # Try grandchild — should fail
    resp = await client.post(
        "/api/v1/categories",
        json={"name_en": "Grandchild", "type": "expense", "parent_category_id": child_id},
        headers=auth_headers,
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_reject_predefined_as_child(client: AsyncClient, auth_headers: dict):
    """Predefined categories cannot be made children."""
    # Create a custom parent
    resp = await client.post(
        "/api/v1/categories",
        json={"name_en": "My Parent", "type": "expense"},
        headers=auth_headers,
    )
    parent_id = resp.json()["data"]["id"]

    # Get a predefined category
    resp = await client.get("/api/v1/categories", headers=auth_headers)
    predefined = next(c for c in resp.json()["data"] if c["is_predefined"])

    # Try to make predefined a child — should fail (PUT update)
    resp = await client.put(
        f"/api/v1/categories/{predefined['id']}",
        json={"parent_category_id": parent_id},
        headers=auth_headers,
    )
    assert resp.status_code == 400 or resp.status_code == 403


@pytest.mark.asyncio
async def test_category_tree(client: AsyncClient, auth_headers: dict):
    """Tree endpoint returns hierarchical structure."""
    # Create a child under first predefined
    resp = await client.get("/api/v1/categories", headers=auth_headers)
    parent = next(c for c in resp.json()["data"] if c["is_predefined"] and c["type"] == "expense")

    await client.post(
        "/api/v1/categories",
        json={
            "name_en": "Subcategory",
            "type": "expense",
            "parent_category_id": parent["id"],
        },
        headers=auth_headers,
    )

    # Get tree
    resp = await client.get("/api/v1/categories/tree", headers=auth_headers)
    assert resp.status_code == 200
    tree = resp.json()["data"]
    # Find the parent in tree
    parent_node = next((n for n in tree if n["id"] == parent["id"]), None)
    assert parent_node is not None
    assert len(parent_node["children"]) >= 1
    assert parent_node["children"][0]["name_en"] == "Subcategory"
```

- [ ] **Step 2: Run to verify failures**

```bash
cd backend && uv run pytest tests/integration/test_categories_api.py -k "child or tree or grandchild or predefined_as_child" -v
```

Expected: FAIL (tree endpoint doesn't exist, hierarchy validation not implemented).

- [ ] **Step 3: Commit**

```bash
git add backend/tests/integration/test_categories_api.py
git commit -m "test(categories): add failing hierarchy and tree endpoint tests"
```

---

### Task 10: Implement category hierarchy service

**Files:**
- Modify: `backend/app/services/category.py`

- [ ] **Step 1: Add hierarchy validation and tree function to `backend/app/services/category.py`**

Add these functions after `soft_delete_category()`:

```python
async def validate_parent(
    session: AsyncSession,
    household_id: uuid.UUID,
    parent_category_id: int | None,
) -> None:
    """Validate that the parent exists, is accessible, and is not itself a child (max 2 levels)."""
    if parent_category_id is None:
        return

    parent = await get_category(session, household_id, parent_category_id)
    if parent is None:
        raise ValueError(f"Parent category {parent_category_id} not found")
    if parent.parent_category_id is not None:
        raise ValueError("Maximum category depth is 2 levels (parent → child). Cannot create grandchildren.")


async def get_category_tree(
    session: AsyncSession,
    household_id: uuid.UUID,
    type: str | None = None,
) -> list[dict]:
    """Return categories as a tree: top-level categories with nested children."""
    base_filter = (Category.household_id == household_id) | (Category.household_id.is_(None))
    q = select(Category).where(base_filter, Category.is_active.is_(True))
    if type:
        q = q.where(Category.type == type)
    q = q.order_by(Category.sort_order)

    result = await session.execute(q)
    all_cats = list(result.scalars().all())

    # Build tree
    cat_map: dict[int, dict] = {}
    roots: list[dict] = []

    for cat in all_cats:
        cat_type = cat.type
        node = {
            "id": cat.id,
            "name_en": cat.name_en,
            "name_ar": cat.name_ar,
            "type": cat_type.value if hasattr(cat_type, "value") else cat_type,
            "icon": cat.icon,
            "color": cat.color,
            "is_predefined": cat.is_predefined,
            "sort_order": cat.sort_order,
            "parent_category_id": cat.parent_category_id,
            "children": [],
        }
        cat_map[cat.id] = node

    for node in cat_map.values():
        parent_id = node["parent_category_id"]
        if parent_id is not None and parent_id in cat_map:
            cat_map[parent_id]["children"].append(node)
        else:
            roots.append(node)

    return roots
```

- [ ] **Step 2: Update `create_category()` to validate parent**

Replace the existing `create_category` function:

```python
async def create_category(
    session: AsyncSession,
    household_id: uuid.UUID,
    data: CategoryCreate,
) -> Category:
    """Create a custom (non-predefined) category with optional parent."""
    await validate_parent(session, household_id, data.parent_category_id)

    category = Category(
        household_id=household_id,
        name_en=data.name_en,
        name_ar=data.name_ar,
        type=data.type,
        icon=data.icon,
        color=data.color,
        is_predefined=False,
        parent_category_id=data.parent_category_id,
    )
    session.add(category)
    await session.flush()
    return category
```

- [ ] **Step 3: Update `update_category()` to handle parent moves and protect predefined**

Replace the existing `update_category` function:

```python
async def update_category(
    session: AsyncSession,
    category: Category,
    data: CategoryUpdate,
    household_id: uuid.UUID | None = None,
) -> Category:
    """Update category fields. Predefined categories: only icon and color."""
    update_data = data.model_dump(exclude_unset=True)

    if category.is_predefined:
        # Predefined categories cannot become children
        if "parent_category_id" in update_data and update_data["parent_category_id"] is not None:
            raise ValueError("Predefined categories cannot be made children of another category")
        allowed = {"icon", "color"}
        update_data = {k: v for k, v in update_data.items() if k in allowed}
    else:
        # Validate parent if being moved
        if "parent_category_id" in update_data and household_id:
            await validate_parent(session, household_id, update_data["parent_category_id"])

    for field, value in update_data.items():
        setattr(category, field, value)
    await session.flush()
    return category
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/category.py
git commit -m "feat(categories): add hierarchy validation, parent support, and tree function"
```

---

### Task 11: Add tree router endpoint and update existing endpoints

**Files:**
- Modify: `backend/app/routers/categories.py`

- [ ] **Step 1: Add the tree endpoint and update imports**

Add the `CategoryTreeNode` import:

```python
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryTreeNode, CategoryUpdate
```

Add the tree endpoint **before** the `/{category_id}` routes:

```python
@router.get("/tree")
async def get_category_tree(
    type: str | None = None,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    """Return categories as a hierarchical tree (top-level with nested children)."""
    tree = await category_service.get_category_tree(session, household_id, type=type)
    return SuccessResponse(data=tree)
```

- [ ] **Step 2: Update the `update_category` endpoint to pass `household_id`**

The `update_category` service now needs `household_id` for parent validation. Update the router call:

```python
@router.put("/{category_id}")
async def update_category(
    category_id: int,
    data: CategoryUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    category = await category_service.get_category(session, household_id, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Category not found")
            ).model_dump(),
        )
    try:
        category = await category_service.update_category(
            session, category, data, household_id=household_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error=ErrorDetail(code="VALIDATION_ERROR", message=str(e))
            ).model_dump(),
        )
    return SuccessResponse(data=CategoryResponse.model_validate(category).model_dump())
```

Also update `create_category` endpoint to handle the new ValueError:

```python
@router.post("", status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    try:
        category = await category_service.create_category(session, household_id, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error=ErrorDetail(code="VALIDATION_ERROR", message=str(e))
            ).model_dump(),
        )
    return SuccessResponse(data=CategoryResponse.model_validate(category).model_dump())
```

- [ ] **Step 3: Run hierarchy tests**

```bash
cd backend && uv run pytest tests/integration/test_categories_api.py -k "child or tree or grandchild or predefined_as_child" -v
```

Expected: all 4 hierarchy tests PASS.

- [ ] **Step 4: Run full test suite**

```bash
cd backend && uv run pytest -v
```

Expected: all tests pass. If any existing tests break due to the `update_category` signature change, fix by adding `household_id=household_id` to any test calling the service directly.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/categories.py
git commit -m "feat(categories): add /tree endpoint and hierarchy error handling in routes"
```

---

### Task 12: Push Unit 1.5E PR

- [ ] **Step 1: Push and create PR**

```bash
git push -u origin feature/1.5E-category-hierarchy
```

Create PR: `feat(categories): category hierarchy with parent/child support (#1.5E)`

- [ ] **Step 2: Request Copilot code review**

- [ ] **Step 3: Fix Copilot findings (if any)**

---

### Unit 1.5E UAT Checklist

- [ ] CI pipeline green
- [ ] `POST /api/v1/categories` accepts `parent_category_id` and creates child
- [ ] Creating a grandchild (3rd level) returns 400
- [ ] Making a predefined category a child returns 400/403
- [ ] `GET /api/v1/categories/tree` returns hierarchical structure
- [ ] Tree includes children nested under parent nodes
- [ ] Existing category CRUD still works (no regressions)

---

## Unit 1.5D: Category Child-Filter

**Note:** This unit depends on 1.5E being merged first.

### Task 13: Update transaction service to include child categories

**Files:**
- Modify: `backend/app/services/transaction.py`

- [ ] **Step 1: Write failing test for child-category inclusion**

Add to `backend/tests/integration/test_transactions_api.py`:

```python
@pytest.mark.asyncio
async def test_filter_by_parent_category_includes_children(
    client: AsyncClient, auth_headers: dict
):
    """Filtering by parent category_id includes transactions in child categories."""
    # Get a predefined parent category
    cats_resp = await client.get("/api/v1/categories", headers=auth_headers)
    parent = next(c for c in cats_resp.json()["data"] if c["is_predefined"] and c["type"] == "expense")

    # Create a child category
    child_resp = await client.post(
        "/api/v1/categories",
        json={"name_en": "Sub", "type": "expense", "parent_category_id": parent["id"]},
        headers=auth_headers,
    )
    child_id = child_resp.json()["data"]["id"]

    # Create account
    acct_resp = await client.post(
        "/api/v1/accounts",
        json={"name": "Test", "type": "bank_account", "currency": "EGP"},
        headers=auth_headers,
    )
    acct_id = acct_resp.json()["data"]["id"]

    # Create transaction with child category
    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": acct_id,
            "date": "2026-01-15",
            "description": "Child tx",
            "amount_minor": 5000,
            "type": "debit",
            "currency": "EGP",
            "category_id": child_id,
        },
        headers=auth_headers,
    )

    # Filter by parent — should include the child transaction
    resp = await client.get(
        f"/api/v1/transactions?category_id={parent['id']}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) >= 1
    assert any(tx["category"]["id"] == child_id for tx in data if tx.get("category"))
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend && uv run pytest tests/integration/test_transactions_api.py -k "parent_category_includes_children" -v
```

Expected: FAIL (current filter is exact match only).

- [ ] **Step 3: Update `list_transactions()` in `backend/app/services/transaction.py`**

Replace the `category_id` filter block (around line 171-172):

```python
    if category_id is not None:
        # Include child categories when filtering by a parent
        child_q = select(Category.id).where(
            Category.parent_category_id == category_id,
            Category.is_active.is_(True),
        )
        child_result = await session.execute(child_q)
        child_ids = [row[0] for row in child_result.all()]
        all_cat_ids = [category_id] + child_ids
        base_filters.append(Transaction.category_id.in_(all_cat_ids))
```

Add the Category import at the top if not already present:

```python
from app.models.category import Category
```

- [ ] **Step 4: Run tests**

```bash
cd backend && uv run pytest tests/integration/test_transactions_api.py -k "parent_category_includes_children" -v
```

Expected: PASS.

- [ ] **Step 5: Run full suite**

```bash
cd backend && uv run pytest -v
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/transaction.py backend/tests/integration/test_transactions_api.py
git commit -m "feat(transactions): category filter includes child categories"
```

---

### Task 14: Push Unit 1.5D PR

- [ ] **Step 1: Push and create PR**

```bash
git push -u origin feature/1.5D-category-child-filter
```

Create PR: `feat(transactions): category filter includes child categories (#1.5D)`

- [ ] **Step 2: Request Copilot code review**

- [ ] **Step 3: Fix Copilot findings (if any)**

---

### Unit 1.5D UAT Checklist

- [ ] CI pipeline green
- [ ] Filtering by parent `category_id` returns transactions in both parent and child categories
- [ ] Filtering by child `category_id` returns only that child's transactions
- [ ] Filtering with no `category_id` returns all transactions (no regression)
- [ ] All existing filters still work correctly

---

## Self-Review Summary

| Spec Requirement | Task(s) | Status |
|---|---|---|
| Net-worth endpoint | Tasks 1-4 | Covered |
| Credit card validation (credit_limit required) | Task 1, 5 | Covered |
| Account edit endpoint | N/A | Already exists |
| Bulk delete/categorize | N/A | Already exists |
| Transaction 7-dim filters | N/A | Already exists |
| Category hierarchy (parent_category_id) | Tasks 7-11 | Covered |
| Category tree endpoint | Task 11 | Covered |
| Category icons | N/A | Already seeded |
| Max 2-level depth | Task 10 (validate_parent) | Covered |
| Predefined cannot be children | Task 10 (update_category) | Covered |
| Category filter includes children | Task 13 | Covered |
| Household base_currency | N/A | Already exists in model |
