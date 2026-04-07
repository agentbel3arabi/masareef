# Testing Patterns

**Analysis Date:** 2026-04-07

## Test Framework

**Test Runner:**
- Tool: **pytest** (8.0+)
- Async support: **pytest-asyncio** (0.23+)
- Config file: `backend/pyproject.toml` → `[tool.pytest.ini_options]`
- Mode: `asyncio_mode = "auto"` (all async tests run without manual marking in most cases)
- Default test paths: `["tests"]`

**Run Commands:**
```bash
cd backend
uv run pytest                          # Run all tests
uv run pytest tests/routers/           # Run only router tests
uv run pytest tests/ -k "accounts"    # Filter by keyword
uv run pytest --cov=app                # With coverage report
uv run pytest -x                       # Stop on first failure
```

**Assertion Library:**
- Built-in Python `assert` statements
- Response assertions via `.json()` and status code checks

## Test File Organization

**Structure:**
- Test files mirror source structure: `backend/tests/` mirrors `backend/app/`
- Test file naming: `test_{module_name}.py`

**Directory Layout:**
```
backend/tests/
├── conftest.py                         # Shared fixtures (database, auth, client)
├── routers/
│   ├── test_accounts.py               # Endpoint tests
│   ├── test_transactions.py
│   ├── test_debts.py
│   ├── test_import_.py
│   └── ...
├── services/                           # (Optional) Business logic tests
│   └── (Service tests not yet implemented)
└── models/                             # (Optional) ORM validation tests
    └── (Model tests not yet implemented)
```

## Test Structure

**Basic Fixture Pattern:**
```python
@pytest.fixture(autouse=True)
async def setup_database():
    """Create all tables before each test, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture(autouse=True)
def override_deps():
    """Override auth and DB dependencies for all tests."""
    app.dependency_overrides[get_db_session] = override_get_db_session
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_household_id] = override_get_household_id
    app.dependency_overrides[get_member_role] = override_get_member_role
    yield
    app.dependency_overrides.clear()

@pytest.fixture
async def client():
    """Yield an async HTTP client for endpoint testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
```

**Test Suite Organization:**
Each test file groups related tests with helper functions at the top:

Example from `backend/tests/routers/test_transactions.py`:
```python
import pytest

# Helpers defined first
async def _create_account(client) -> int:
    """Create a test account and return its id."""
    resp = await client.post(
        "/api/v1/accounts",
        json={
            "name": "Test",
            "type": "bank_account",
            "currency": "EGP",
            "opening_balance": 1000000,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]["id"]

async def _create_tx(client, account_id: int, amount_minor: int = 50000) -> dict:
    """Create a debit transaction and return response data."""
    resp = await client.post(
        "/api/v1/transactions",
        json={
            "account_id": account_id,
            "date": "2024-01-15",
            "description": "Test Transaction",
            "amount_minor": amount_minor,
            "type": "debit",
            "currency": "EGP",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]

# Tests follow
@pytest.mark.asyncio
async def test_create_transaction_debit(client):
    account_id = await _create_account(client)
    resp = await client.post(
        "/api/v1/transactions",
        json={
            "account_id": account_id,
            "date": "2024-01-15",
            "description": "Grocery run",
            "amount_minor": 50000,
            "type": "debit",
            "currency": "EGP",
        },
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["type"] == "debit"
    assert data["amount_minor"] == -50000  # Stored as negative
```

**Assertions Pattern:**
```python
# Status codes
assert response.status_code == 201

# Response structure
body = response.json()
assert "data" in body
assert "meta" in body  # For paginated endpoints

# Data validation
data = body["data"]
assert data["name"] == "Expected Name"
assert data["displayed_balance_minor"] == 950000

# List/pagination
assert body["meta"]["total"] >= 2
assert body["meta"]["page"] == 1
```

## Test Types & Coverage

**Router Tests (Endpoint Integration Tests):**
Location: `backend/tests/routers/test_*.py`
Purpose: Verify HTTP contracts, auth, household isolation, response envelopes

Every endpoint must have **minimum four tests**:

| Test Type | Example | Checks |
|-----------|---------|--------|
| **Happy path** | `test_create_account_returns_201` | Correct status, response shape matches schema |
| **Auth failure** | `test_get_account_no_token_returns_401` | Missing token → 401 with error envelope |
| **Wrong household** | `test_get_account_wrong_household_returns_404` | Valid token but resource belongs to different household → 404 |
| **Validation error** | `test_create_account_missing_field_returns_400` | Missing required field → 400/422 with error envelope |

**Example from `backend/tests/routers/test_accounts.py`:**
```python
@pytest.mark.asyncio
async def test_create_account_returns_201(client):
    response = await client.post(
        "/api/v1/accounts",
        json={
            "name": "CIB Savings",
            "type": "bank_account",
            "currency": "EGP",
            "opening_balance": 1000000,
        },
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == "CIB Savings"
    assert data["displayed_balance_minor"] == 1000000

@pytest.mark.asyncio
async def test_list_accounts_returns_paginated(client):
    # Create two accounts
    await client.post(
        "/api/v1/accounts",
        json={"name": "Account A", "type": "bank_account", "currency": "EGP"},
    )
    await client.post(
        "/api/v1/accounts",
        json={"name": "Account B", "type": "cash_wallet", "currency": "EGP"},
    )
    response = await client.get("/api/v1/accounts")
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert "meta" in body
    assert body["meta"]["total"] >= 2

@pytest.mark.asyncio
async def test_delete_account_soft_deletes(client):
    create_resp = await client.post(
        "/api/v1/accounts",
        json={"name": "To Delete", "type": "bank_account", "currency": "EGP"},
    )
    account_id = create_resp.json()["data"]["id"]
    delete_resp = await client.delete(f"/api/v1/accounts/{account_id}")
    assert delete_resp.status_code == 204
    # Should not appear in list
    list_resp = await client.get("/api/v1/accounts")
    ids = [a["id"] for a in list_resp.json()["data"]]
    assert account_id not in ids

@pytest.mark.asyncio
async def test_update_account(client):
    create_resp = await client.post(
        "/api/v1/accounts",
        json={"name": "Old Name", "type": "bank_account", "currency": "EGP"},
    )
    account_id = create_resp.json()["data"]["id"]
    update_resp = await client.put(
        f"/api/v1/accounts/{account_id}",
        json={"name": "New Name"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["name"] == "New Name"
```

**Async Testing Pattern:**
All route tests are async and use `@pytest.mark.asyncio` decorator:
```python
@pytest.mark.asyncio
async def test_name(client):
    # HTTPx AsyncClient is passed as fixture
    response = await client.get("/api/v1/endpoint")
```

## Mocking

**Database Mocking:**
- Strategy: Use in-memory SQLite (`sqlite+aiosqlite://`) for fast tests
- No data persists between tests — tables recreated and dropped per test
- Production PostgreSQL models work unmodified with SQLite (except enum handling)

From `backend/tests/conftest.py`:
```python
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
```

**Auth Mocking:**
- Override `get_current_user`, `get_household_id`, `get_member_role` dependencies
- All tests run as user: `TEST_USER_ID = uuid.uuid4()`
- All tests operate on household: `TEST_HOUSEHOLD_ID = uuid.uuid4()`
- Default role: `HouseholdRole.ADMIN`

From `backend/tests/conftest.py`:
```python
TEST_USER_ID = uuid.uuid4()
TEST_HOUSEHOLD_ID = uuid.uuid4()

async def override_get_current_user() -> uuid.UUID:
    return TEST_USER_ID

async def override_get_household_id() -> uuid.UUID:
    return TEST_HOUSEHOLD_ID

async def override_get_member_role() -> HouseholdRole:
    return HouseholdRole.ADMIN

@pytest.fixture(autouse=True)
def override_deps():
    """Override auth and DB dependencies for all tests."""
    app.dependency_overrides[get_db_session] = override_get_db_session
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_household_id] = override_get_household_id
    app.dependency_overrides[get_member_role] = override_get_member_role
    yield
    app.dependency_overrides.clear()
```

**What to Mock:**
- External APIs (not in scope yet for this codebase)
- File uploads/downloads
- Supabase auth (already overridden via dependency injection)

**What NOT to Mock:**
- Database queries (use real SQLAlchemy with in-memory SQLite instead)
- Business logic (test real service functions)
- HTTP client calls to backend routes (test real FastAPI app)

## Fixtures and Factories

**Core Fixtures Provided:**
- `client`: AsyncClient ready to make HTTP requests to the app
- `db_session`: Direct database session for seeding test data in fixtures
- `setup_database`: Auto-creates/drops tables per test

**Helper Pattern (Test Data Factories):**
Test files define lightweight helper functions to create entities:

Example from `backend/tests/routers/test_transactions.py`:
```python
async def _create_account(client) -> int:
    """Factory: create account and return ID."""
    resp = await client.post("/api/v1/accounts", json={...})
    return resp.json()["data"]["id"]

async def _create_category(client, name: str = "Test Category") -> int:
    """Factory: create category with defaults, allow overrides."""
    resp = await client.post("/api/v1/categories", json={...})
    return resp.json()["data"]["id"]

async def _create_tx(client, account_id: int, amount_minor: int = 50000) -> dict:
    """Factory: create transaction and return full response data."""
    resp = await client.post("/api/v1/transactions", json={...})
    return resp.json()["data"]
```

**Pattern:**
- Factories accept HTTP client (for POST requests) or db_session (for ORM operations)
- All factories return a value (ID or full object) for use in test
- Default parameters allow creating entities with sensible test values
- Assertions inside factories catch setup failures early

## Test Naming Convention

**Format:**
```
test_{action}_{scenario}_{expected_result}
```

**Examples:**
- `test_create_account_returns_201` — Happy path
- `test_list_accounts_returns_paginated` — List with pagination structure
- `test_delete_account_soft_deletes` — Specific behavior (soft delete, not hard delete)
- `test_create_transaction_updates_balance` — Side effects
- `test_get_account_not_found_returns_404` — Error case
- `test_update_account` — Simple operation

## Coverage Requirements

**Target:** 80%+ line coverage on `backend/app/` (excluding migrations)

**Current Coverage:**
- Routers: ~95% (most endpoints have 4+ tests)
- Services: ~0% (business logic tests not yet implemented)
- Models: ~0% (ORM validation tests not yet implemented)

**View Coverage:**
```bash
uv run pytest --cov=app --cov-report=html
# Opens htmlcov/index.html in browser
```

**Enforcement:**
- Not yet automated in CI
- Target set but not blocking PRs (best effort)

## Test Data & Seed Data

**Predefined Categories (18 total):**
Available in all tests via API routes or would-be seeded via fixtures:

| ID | Name (EN) | Name (AR) | Type |
|----|-----------|-----------|------|
| 1 | Food & Dining | طعام ومطاعم | expense |
| 2 | Groceries | بقالة | expense |
| 3 | Transportation | مواصلات | expense |
| 4 | Utilities | مرافق | expense |
| 5 | Housing/Rent | سكن/إيجار | expense |
| 6 | Healthcare | رعاية صحية | expense |
| 7 | Shopping | تسوق | expense |
| 8 | Education | تعليم | expense |
| 9 | Entertainment | ترفيه | expense |
| 10 | Telecommunications | اتصالات | expense |
| 11 | Fuel | وقود | expense |
| 12 | Government/Fees | حكومة/رسوم | expense |
| 13 | Salary | راتب | income |
| 14 | Freelance Income | دخل حر | income |
| 15 | Other Income | دخل آخر | income |
| 16 | Transfer | تحويل | special |
| 17 | Uncategorized | غير مصنف | special |
| 18 | Savings | ادخار | special |

**Supported Currencies (7 total):**
```python
CURRENCIES = {
    "EGP": {"exponent": 2, "symbol": "EGP"},
    "USD": {"exponent": 2, "symbol": "$"},
    "EUR": {"exponent": 2, "symbol": "€"},
    "GBP": {"exponent": 2, "symbol": "£"},
    "SAR": {"exponent": 2, "symbol": "SAR"},
    "AED": {"exponent": 2, "symbol": "AED"},
    "KWD": {"exponent": 3, "symbol": "KWD"},
}
```

**Sample Exchange Rates (for development/tests):**
```python
SAMPLE_RATES = [
    # Stored as rate × 10,000 (USD hub)
    {"from_currency": "USD", "to_currency": "EGP", "rate_scaled": 500000},  # 1 USD = 50.0000 EGP
    {"from_currency": "USD", "to_currency": "SAR", "rate_scaled": 37510},   # 1 USD = 3.7510 SAR
    {"from_currency": "USD", "to_currency": "AED", "rate_scaled": 36725},   # 1 USD = 3.6725 AED
    {"from_currency": "USD", "to_currency": "KWD", "rate_scaled": 3082},    # 1 USD = 0.3082 KWD
    {"from_currency": "USD", "to_currency": "EUR", "rate_scaled": 9200},    # 1 USD = 0.9200 EUR
    {"from_currency": "USD", "to_currency": "GBP", "rate_scaled": 7890},    # 1 USD = 0.7890 GBP
]
```

## Common Test Patterns

**Testing Amount Fields (Integer Minor Units):**
```python
@pytest.mark.asyncio
async def test_create_transaction_stores_negative_for_debit(client):
    account_id = await _create_account(client)
    resp = await client.post(
        "/api/v1/transactions",
        json={
            "account_id": account_id,
            "amount_minor": 50000,  # UI sends positive; debit reverses sign
            "type": "debit",
            ...
        },
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["amount_minor"] == -50000  # Stored as negative

@pytest.mark.asyncio
async def test_balance_calculation_with_multiple_transactions(client):
    account_id = await _create_account(client)  # opening_balance: 1,000,000
    
    # Debit -50,000
    await client.post(
        "/api/v1/transactions",
        json={"account_id": account_id, "amount_minor": 50000, "type": "debit", ...},
    )
    
    # Credit +30,000
    await client.post(
        "/api/v1/transactions",
        json={"account_id": account_id, "amount_minor": 30000, "type": "credit", ...},
    )
    
    resp = await client.get(f"/api/v1/accounts/{account_id}")
    # 1,000,000 - 50,000 + 30,000 = 980,000
    assert resp.json()["data"]["displayed_balance_minor"] == 980000
```

**Testing Response Envelope:**
```python
@pytest.mark.asyncio
async def test_list_accounts_envelope_structure(client):
    resp = await client.get("/api/v1/accounts")
    assert resp.status_code == 200
    body = resp.json()
    
    # Check envelope
    assert "data" in body
    assert "meta" in body
    assert isinstance(body["data"], list)
    
    # Check metadata
    assert "total" in body["meta"]
    assert "page" in body["meta"]
    assert "page_size" in body["meta"]
    assert body["meta"]["page"] == 1
    assert body["meta"]["page_size"] == 50  # default
```

**Testing Soft Delete:**
```python
@pytest.mark.asyncio
async def test_deleted_entity_not_in_list(client):
    # Create
    resp = await client.post("/api/v1/accounts", json={...})
    account_id = resp.json()["data"]["id"]
    
    # Delete (soft)
    await client.delete(f"/api/v1/accounts/{account_id}")
    
    # Verify not in list
    list_resp = await client.get("/api/v1/accounts")
    ids = [a["id"] for a in list_resp.json()["data"]]
    assert account_id not in ids
    
    # Verify GET returns 404
    get_resp = await client.get(f"/api/v1/accounts/{account_id}")
    assert get_resp.status_code == 404
```

## Special Testing Considerations

**Enum Handling in SQLite:**
- SQLite stores enum values as plain strings
- PostgreSQL returns enum instances with `.value` attribute
- Code handles both via: `acct_type.value if hasattr(acct_type, "value") else acct_type`
- Tests run against SQLite, so enums are strings

**Async Test Markers:**
- Most tests auto-marked via `asyncio_mode = "auto"` in pytest config
- Explicit `@pytest.mark.asyncio` still works for clarity
- Never mix blocking and async code; all fixtures must be async

---

*Testing analysis: 2026-04-07*
