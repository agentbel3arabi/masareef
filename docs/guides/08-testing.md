# Testing Guide

## Test Stack

| Layer | Tool | Notes |
|-------|------|-------|
| Backend unit + integration | **pytest** | With `pytest-asyncio` for async tests |
| HTTP client for router tests | **httpx** | `AsyncClient` with FastAPI's `TestClient` transport |
| Database | **SQLAlchemy async** | Same models as production; rollback per test |
| E2E | **Playwright (Python)** | `playwright` package — Python-based, not JS |
| Coverage | **pytest-cov** | Target: 80%+ line coverage on `backend/app/` |

## Test File Organization

`backend/tests/` mirrors `backend/app/` structure:

```
backend/
├── app/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   └── routers/
└── tests/
    ├── conftest.py                     # Shared fixtures (session, household, auth)
    ├── models/
    │   ├── test_account.py
    │   ├── test_transaction.py
    │   └── ...
    ├── services/
    │   ├── test_balance_service.py
    │   ├── test_amortization_service.py
    │   ├── test_money_service.py
    │   └── ...
    ├── routers/
    │   ├── test_accounts.py
    │   ├── test_transactions.py
    │   ├── test_debts.py
    │   └── ...
    └── e2e/
        ├── test_onboarding_flow.py
        ├── test_import_flow.py
        └── test_transaction_crud.py
```

## What to Test Per Layer

### Models
- Validation constraints (required fields, enum values, length limits)
- Computed properties (e.g., `account.displayed_balance`)
- Relationships load correctly (FK integrity)
- Soft delete: `is_active=False` records are excluded from default queries

### Services
Focus on business logic correctness:
- **Balance service:** `compute_balance()` — debits subtract, credits add, transfers net to zero
- **Amortization engine:** payment schedule sums to principal + interest; early payoff computes correctly
- **Money service:** `format_amount()` — correct decimal places per currency exponent; no float imprecision
- **FX conversion:** USD hub routing (EGP→SAR = EGP→USD→SAR); rate scaling (×10,000) applied correctly
- **Duplicate detection:** same date + amount + description → flagged; different household → not flagged

### Routers
Every endpoint needs four tests minimum (see Coverage Requirements below):
- Correct HTTP status codes
- Auth enforcement (no token → 401)
- Household isolation (token for household A cannot access household B's data → 404)
- Pagination structure matches envelope: `{ "data": [...], "meta": { "total": N, "page": N, "page_size": N } }`
- Error format matches envelope: `{ "error": { "code": "...", "message": "...", "details": [...] } }`

### Frontend (Playwright E2E)
Critical user flows only — unit test logic in services:
- **Onboarding flow:** signup → create household → add first account → dashboard loads
- **Import flow:** upload CSV → map columns → preview rows → commit → transactions appear
- **Transaction CRUD:** create transaction → appears in list → edit → delete → balance updates
- **Transfer:** create transfer → two legs appear → net worth unchanged

## Fixture Strategy

### Core Factories (`backend/tests/conftest.py`)

```python
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from app.models import Household, HouseholdMember, Account, Transaction

# Each factory returns a fully valid entity with sensible defaults — all overridable
async def create_test_household(session: AsyncSession, **kwargs) -> Household:
    defaults = {"name": "Test Household", "base_currency": "EGP"}
    household = Household(**{**defaults, **kwargs})
    session.add(household)
    await session.flush()
    return household

async def create_test_account(session: AsyncSession, household_id, **kwargs) -> Account:
    defaults = {
        "household_id": household_id,
        "name": "Test Account",
        "type": "bank_account",
        "currency": "EGP",
        "balance_minor": 0,
        "is_active": True,
    }
    account = Account(**{**defaults, **kwargs})
    session.add(account)
    await session.flush()
    return account

async def create_test_transaction(session: AsyncSession, account_id, household_id, **kwargs) -> Transaction:
    defaults = {
        "account_id": account_id,
        "household_id": household_id,
        "date": "2026-01-15",
        "description": "Test Transaction",
        "amount_minor": -50000,       # -500.00 EGP (expense)
        "type": "debit",
        "currency": "EGP",
        "is_active": True,
    }
    tx = Transaction(**{**defaults, **kwargs})
    session.add(tx)
    await session.flush()
    return tx
```

### Database Fixture Pattern

```python
@pytest.fixture
async def session(test_engine):
    """Each test gets a transaction that is rolled back — no data persists between tests."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        async with AsyncSession(bind=conn) as session:
            async with session.begin_nested():
                yield session
            await session.rollback()
```

### Auth Fixture Pattern

```python
@pytest.fixture
def auth_headers(test_user_jwt):
    """Returns headers dict with Bearer token for test user."""
    return {"Authorization": f"Bearer {test_user_jwt}"}
```

## Seed Data

The following seed data is loaded by `backend/app/seed.py` for development and used in fixtures:

### 18 Predefined Categories

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

### 7 Supported Currencies

```python
CURRENCIES = {
    "EGP": {"name": "Egyptian Pound",   "name_ar": "جنيه مصري",      "exponent": 2, "symbol": "EGP"},
    "USD": {"name": "US Dollar",        "name_ar": "دولار أمريكي",    "exponent": 2, "symbol": "$"},
    "EUR": {"name": "Euro",             "name_ar": "يورو",             "exponent": 2, "symbol": "€"},
    "GBP": {"name": "British Pound",    "name_ar": "جنيه إسترليني",   "exponent": 2, "symbol": "£"},
    "SAR": {"name": "Saudi Riyal",      "name_ar": "ريال سعودي",      "exponent": 2, "symbol": "SAR"},
    "AED": {"name": "UAE Dirham",       "name_ar": "درهم إماراتي",    "exponent": 2, "symbol": "AED"},
    "KWD": {"name": "Kuwaiti Dinar",    "name_ar": "دينار كويتي",     "exponent": 3, "symbol": "KWD"},
}
```

### Sample Exchange Rates (for development/tests)

```python
SAMPLE_RATES = [
    # Stored as rate × 10,000 (all USD-based hub routing)
    {"from_currency": "USD", "to_currency": "EGP", "rate_scaled": 500000},  # 1 USD = 50.0000 EGP
    {"from_currency": "USD", "to_currency": "SAR", "rate_scaled": 37510},   # 1 USD = 3.7510 SAR
    {"from_currency": "USD", "to_currency": "AED", "rate_scaled": 36725},   # 1 USD = 3.6725 AED
    {"from_currency": "USD", "to_currency": "KWD", "rate_scaled": 3082},    # 1 USD = 0.3082 KWD
    {"from_currency": "USD", "to_currency": "EUR", "rate_scaled": 9200},    # 1 USD = 0.9200 EUR
    {"from_currency": "USD", "to_currency": "GBP", "rate_scaled": 7890},    # 1 USD = 0.7890 GBP
]
```

## Test Naming Convention

```
test_{action}_{scenario}_{expected_result}
```

Examples:
- `test_create_transaction_negative_amount_updates_balance`
- `test_list_accounts_wrong_household_returns_404`
- `test_import_commit_duplicate_rows_skipped`
- `test_format_amount_kwp_three_decimal_places`
- `test_create_debt_payment_marks_split_paid`

## Coverage Requirements

Every API endpoint must have **at minimum** these four tests:

| Test | What It Checks |
|------|----------------|
| **Happy path** | Correct 200/201/204 status, response shape matches spec |
| **Auth failure** | No token → 401 with error envelope |
| **Wrong household** | Valid token but resource belongs to different household → 404 |
| **Validation error** | Missing required field or invalid value → 400 with error envelope |

Additional tests for endpoints with complex logic:
- Pagination: verify `meta.total` and `meta.page` fields; test `page_size` clamping to 100
- Soft delete: deleted resource returns 404; list endpoints don't include it
- Money fields: send float → 422 (Pydantic rejects); send string → 422; send integer → 201

## Running Tests

```bash
# From backend directory
uv run pytest                          # all tests
uv run pytest tests/routers/           # router tests only
uv run pytest tests/ -k "accounts"    # tests matching "accounts"
uv run pytest --cov=app --cov-report=html   # with coverage report
uv run pytest -x                       # stop on first failure

# E2E (requires running dev server)
uv run pytest tests/e2e/              # runs Playwright tests
```
