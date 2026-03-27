# Unit 1C: Auth & Money Services — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Pydantic v2 request/response schemas, Supabase JWT auth dependency, money formatting service, and balance computation service — the service layer that routers (Units 1D-1E) will call.

**Architecture:** Services are pure business logic with no HTTP awareness. They receive `session` + `household_id` as plain parameters. Auth dependency verifies Supabase JWTs and resolves `household_id` via the `household_members` table. Money is always integer minor units — formatting respects currency exponent.

**Tech Stack:** Pydantic v2, python-jose (JWT), SQLAlchemy async

**Required reading:** `CLAUDE.md` (money rules, DI pattern, naming), `02-data-models.md`, `03-features/accounts.md`, `03-features/transactions.md`, `03-features/transfers.md`, `03-features/exchange-rates.md`

---

## File Structure

```
backend/app/
├── schemas/
│   ├── __init__.py
│   ├── common.py            # NEW: Pagination meta, error envelope, success envelope
│   ├── account.py           # NEW: AccountCreate, AccountUpdate, AccountResponse
│   ├── transaction.py       # NEW: TransactionCreate, TransactionUpdate, TransactionResponse
│   ├── transfer.py          # NEW: TransferCreate, TransferResponse
│   ├── category.py          # NEW: CategoryCreate, CategoryUpdate, CategoryResponse
│   └── exchange_rate.py     # NEW: ExchangeRateResponse
├── services/
│   ├── __init__.py
│   ├── money.py             # NEW: CURRENCIES, format_amount, minor_to_major
│   └── balance.py           # NEW: compute_displayed_balance, apply_transaction_delta
├── dependencies.py          # MODIFY: add get_current_user, get_household_id
backend/tests/
├── schemas/
│   ├── __init__.py
│   └── test_schemas.py
├── services/
│   ├── __init__.py
│   ├── test_money_service.py
│   └── test_balance_service.py
├── test_dependencies.py     # MODIFY: add auth tests
```

---

### Task 1: Response Envelope Schemas

**Files:**
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/common.py`
- Test: `backend/tests/schemas/__init__.py`
- Test: `backend/tests/schemas/test_schemas.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/schemas/__init__.py` (empty).

Create `backend/tests/schemas/test_schemas.py`:
```python
from app.schemas.common import ErrorDetail, ErrorResponse, PaginationMeta, SuccessResponse


def test_pagination_meta_defaults():
    meta = PaginationMeta(total=100)
    assert meta.page == 1
    assert meta.page_size == 50


def test_success_response_with_list():
    resp = SuccessResponse(data=[{"id": 1}], meta=PaginationMeta(total=1))
    dumped = resp.model_dump()
    assert dumped["data"] == [{"id": 1}]
    assert dumped["meta"]["total"] == 1


def test_error_response_shape():
    err = ErrorResponse(
        error=ErrorDetail(code="VALIDATION_ERROR", message="bad input")
    )
    dumped = err.model_dump()
    assert dumped["error"]["code"] == "VALIDATION_ERROR"
    assert dumped["error"]["message"] == "bad input"


def test_pagination_meta_page_size_clamped():
    meta = PaginationMeta(total=100, page=1, page_size=200)
    assert meta.page_size == 200  # Clamping is router-level, schema allows any value
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/schemas/test_schemas.py -v
```

Expected: FAIL

- [ ] **Step 3: Write common.py**

Create `backend/app/schemas/__init__.py` (empty).

Create `backend/app/schemas/common.py`:
```python
from typing import Any

from pydantic import BaseModel


class PaginationMeta(BaseModel):
    total: int
    page: int = 1
    page_size: int = 50


class SuccessResponse(BaseModel):
    data: Any
    meta: PaginationMeta | None = None


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: list[Any] = []


class ErrorResponse(BaseModel):
    error: ErrorDetail
```

- [ ] **Step 4: Run test to verify it passes**

```bash
uv run pytest tests/schemas/test_schemas.py -v
```

Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/ backend/tests/schemas/
git commit -m "feat(backend): add common response envelope schemas (success, error, pagination)"
```

---

### Task 2: Account Schemas

**Files:**
- Create: `backend/app/schemas/account.py`
- Test: `backend/tests/schemas/test_account_schema.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/schemas/test_account_schema.py`:
```python
import pytest
from pydantic import ValidationError

from app.schemas.account import AccountCreate, AccountResponse


def test_account_create_minimal():
    data = AccountCreate(
        name="CIB Savings",
        type="bank_account",
        currency="EGP",
    )
    assert data.name == "CIB Savings"
    assert data.initial_balance == 0


def test_account_create_with_credit_card_fields():
    data = AccountCreate(
        name="HSBC CC",
        type="credit_card",
        currency="EGP",
        initial_balance=-450000,
        credit_limit=10000000,
        billing_cycle_day=15,
    )
    assert data.credit_limit == 10000000
    assert data.billing_cycle_day == 15


def test_account_create_rejects_float_balance():
    with pytest.raises(ValidationError):
        AccountCreate(
            name="Test",
            type="bank_account",
            currency="EGP",
            initial_balance=1250.50,  # type: ignore[arg-type]
        )


def test_account_response_has_displayed_balance():
    resp = AccountResponse(
        id=1,
        name="CIB Savings",
        type="bank_account",
        currency="EGP",
        balance_minor=1500000,
        displayed_balance_minor=2350000,
        is_active=True,
    )
    assert resp.displayed_balance_minor == 2350000
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/schemas/test_account_schema.py -v
```

Expected: FAIL

- [ ] **Step 3: Write account schema**

Create `backend/app/schemas/account.py`:
```python
from datetime import date

from pydantic import BaseModel, Field


class AccountCreate(BaseModel):
    name: str
    type: str  # AccountType value
    currency: str = Field(max_length=3)
    initial_balance: int = 0  # Minor units, integer only
    institution: str | None = None
    credit_limit: int | None = None
    billing_cycle_day: int | None = Field(None, ge=1, le=31)
    payment_due_day: int | None = Field(None, ge=1, le=31)
    opened_at: date | None = None


class AccountUpdate(BaseModel):
    name: str | None = None
    institution: str | None = None
    credit_limit: int | None = None
    billing_cycle_day: int | None = Field(None, ge=1, le=31)
    payment_due_day: int | None = Field(None, ge=1, le=31)
    # currency and type are immutable after creation


class AccountResponse(BaseModel):
    id: int
    name: str
    type: str
    currency: str
    balance_minor: int
    displayed_balance_minor: int
    institution: str | None = None
    credit_limit: int | None = None
    billing_cycle_day: int | None = None
    payment_due_day: int | None = None
    opened_at: date | None = None
    is_active: bool

    model_config = {"from_attributes": True}


class ReconcileRequest(BaseModel):
    actual_balance: int  # Minor units
    notes: str | None = None
```

- [ ] **Step 4: Run test to verify it passes**

```bash
uv run pytest tests/schemas/test_account_schema.py -v
```

Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/account.py backend/tests/schemas/test_account_schema.py
git commit -m "feat(backend): add Account Pydantic schemas with integer-only balance validation"
```

---

### Task 3: Transaction, Transfer, and Category Schemas

**Files:**
- Create: `backend/app/schemas/transaction.py`
- Create: `backend/app/schemas/transfer.py`
- Create: `backend/app/schemas/category.py`
- Create: `backend/app/schemas/exchange_rate.py`
- Test: `backend/tests/schemas/test_transaction_schema.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/schemas/test_transaction_schema.py`:
```python
import pytest
from pydantic import ValidationError

from app.schemas.transaction import TransactionCreate, SplitItem
from app.schemas.transfer import TransferCreate
from app.schemas.category import CategoryCreate


def test_transaction_create_requires_amount_minor_integer():
    data = TransactionCreate(
        account_id=1,
        date="2026-03-20",
        amount_minor=125000,
        type="debit",
        currency="EGP",
    )
    assert data.amount_minor == 125000


def test_transaction_create_rejects_float_amount():
    with pytest.raises(ValidationError):
        TransactionCreate(
            account_id=1,
            date="2026-03-20",
            amount_minor=1250.50,  # type: ignore[arg-type]
            type="debit",
            currency="EGP",
        )


def test_split_item_amount_must_be_positive():
    split = SplitItem(category_id=2, amount_minor=80000)
    assert split.amount_minor == 80000


def test_transfer_create_requires_two_accounts():
    data = TransferCreate(
        from_account_id=1,
        to_account_id=3,
        amount_minor=500000,
        date="2026-03-20",
    )
    assert data.from_account_id != data.to_account_id


def test_category_create_requires_name_en():
    data = CategoryCreate(
        name_en="Kids School",
        type="expense",
    )
    assert data.name_en == "Kids School"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/schemas/test_transaction_schema.py -v
```

Expected: FAIL

- [ ] **Step 3: Write transaction schema**

Create `backend/app/schemas/transaction.py`:
```python
from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field


class TransactionCreate(BaseModel):
    account_id: int
    date: date
    description: str = ""
    amount_minor: int  # Always positive — backend computes sign from type
    type: str  # "debit" or "credit"
    currency: str
    category_id: int | None = None
    notes: str | None = None
    gam3eya_id: int | None = None
    asset_id: int | None = None


class TransactionUpdate(BaseModel):
    date: date | None = None
    description: str | None = None
    amount_minor: int | None = None
    type: str | None = None
    category_id: int | None = None
    notes: str | None = None


class SplitItem(BaseModel):
    category_id: int
    amount_minor: int = Field(gt=0)
    notes: str | None = None


class SplitRequest(BaseModel):
    splits: list[SplitItem]


class CategorizeRequest(BaseModel):
    category_id: int


class BulkDeleteRequest(BaseModel):
    ids: list[int]


class BulkCategorizeRequest(BaseModel):
    ids: list[int]
    category_id: int


class CategoryEmbedded(BaseModel):
    id: int
    name_en: str
    name_ar: str | None = None
    color: str | None = None

    model_config = {"from_attributes": True}


class TransactionResponse(BaseModel):
    id: int
    account_id: int
    date: date
    description: str
    amount_minor: int
    currency: str
    type: str
    category: CategoryEmbedded | None = None
    is_split: bool = False
    transfer_id: UUID | None = None
    asset_id: int | None = None
    ai_categorized: bool | None = False
    ai_confidence: float | None = None
    notes: str | None = None

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Write transfer schema**

Create `backend/app/schemas/transfer.py`:
```python
from datetime import date
from uuid import UUID

from pydantic import BaseModel


class TransferCreate(BaseModel):
    from_account_id: int
    to_account_id: int
    amount_minor: int  # Source amount in minor units
    date: date
    description: str = ""
    notes: str | None = None
    fx_rate_minor_units: int | None = None  # Required for cross-currency


class TransferResponse(BaseModel):
    transfer_id: UUID
    debit_transaction_id: int
    credit_transaction_id: int
    source_amount: int
    target_amount: int


class TransferListItem(BaseModel):
    transfer_id: UUID
    date: date
    description: str
    from_account: dict
    to_account: dict
    source_amount: int
    target_amount: int
    fx_rate_minor_units: int | None = None
```

- [ ] **Step 5: Write category schema**

Create `backend/app/schemas/category.py`:
```python
from pydantic import BaseModel


class CategoryCreate(BaseModel):
    name_en: str
    name_ar: str | None = None
    type: str  # "expense", "income", "special"
    icon: str | None = None
    color: str | None = None


class CategoryUpdate(BaseModel):
    name_en: str | None = None
    name_ar: str | None = None
    icon: str | None = None
    color: str | None = None


class CategoryResponse(BaseModel):
    id: int
    name_en: str
    name_ar: str | None = None
    type: str
    icon: str | None = None
    color: str | None = None
    is_predefined: bool
    sort_order: int

    model_config = {"from_attributes": True}
```

- [ ] **Step 6: Write exchange_rate schema**

Create `backend/app/schemas/exchange_rate.py`:
```python
from datetime import date, datetime

from pydantic import BaseModel


class ExchangeRateItem(BaseModel):
    from_currency: str = "USD"
    to_currency: str
    rate_scaled: int
    rate_display: float  # Convenience: rate_scaled / 10000

    model_config = {"from_attributes": True}


class ExchangeRatesResponse(BaseModel):
    base: str = "USD"
    date: date
    rates: list[ExchangeRateItem]
    last_fetched: datetime | None = None
    is_stale: bool = False


class ManualRateRequest(BaseModel):
    date: date
    from_currency: str = "USD"
    to_currency: str
    rate: float  # User-friendly float — backend converts to rate_scaled
```

- [ ] **Step 7: Run test to verify it passes**

```bash
uv run pytest tests/schemas/test_transaction_schema.py -v
```

Expected: 5 passed

- [ ] **Step 8: Commit**

```bash
git add backend/app/schemas/ backend/tests/schemas/test_transaction_schema.py
git commit -m "feat(backend): add Pydantic schemas for transactions, transfers, categories, FX rates"
```

---

### Task 4: Money Service

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/money.py`
- Test: `backend/tests/services/__init__.py`
- Test: `backend/tests/services/test_money_service.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/services/__init__.py` (empty).

Create `backend/tests/services/test_money_service.py`:
```python
from app.services.money import CURRENCIES, format_amount, minor_to_major, major_to_minor


def test_format_amount_egp():
    assert format_amount(125000, "EGP") == "1,250.00"


def test_format_amount_kwd_three_decimals():
    assert format_amount(125000, "KWD") == "125.000"


def test_format_amount_zero():
    assert format_amount(0, "EGP") == "0.00"


def test_format_amount_negative():
    assert format_amount(-50000, "EGP") == "-500.00"


def test_minor_to_major_egp():
    assert minor_to_major(125000, "EGP") == 1250.00


def test_minor_to_major_kwd():
    assert minor_to_major(125000, "KWD") == 125.000


def test_major_to_minor_egp():
    assert major_to_minor(1250.00, "EGP") == 125000


def test_major_to_minor_kwd():
    assert major_to_minor(125.0, "KWD") == 125000


def test_currencies_dict_has_seven():
    assert len(CURRENCIES) == 7


def test_format_amount_unknown_currency_defaults_to_two():
    # Unknown currencies fall back to 2 decimal places
    assert format_amount(125000, "XYZ") == "1,250.00"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/services/test_money_service.py -v
```

Expected: FAIL

- [ ] **Step 3: Write money.py**

Create `backend/app/services/__init__.py` (empty).

Create `backend/app/services/money.py`:
```python
"""Money formatting and conversion utilities. All amounts are integer minor units."""

from app.seed import CURRENCIES


def format_amount(amount_minor: int, currency: str) -> str:
    """Format integer minor units to human-readable string.

    Example: format_amount(125000, "EGP") -> "1,250.00"
    Example: format_amount(125000, "KWD") -> "125.000"
    """
    exponent = CURRENCIES.get(currency, {}).get("exponent", 2)
    divisor = 10**exponent
    major = amount_minor / divisor
    return f"{major:,.{exponent}f}"


def minor_to_major(amount_minor: int, currency: str) -> float:
    """Convert minor units to major units as float (for display only, never for computation)."""
    exponent = CURRENCIES.get(currency, {}).get("exponent", 2)
    return amount_minor / (10**exponent)


def major_to_minor(amount_major: float, currency: str) -> int:
    """Convert major units to minor units as integer."""
    exponent = CURRENCIES.get(currency, {}).get("exponent", 2)
    return round(amount_major * (10**exponent))
```

- [ ] **Step 4: Run test to verify it passes**

```bash
uv run pytest tests/services/test_money_service.py -v
```

Expected: 10 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/ backend/tests/services/
git commit -m "feat(backend): add money formatting service with currency-aware exponents"
```

---

### Task 5: Balance Service

**Files:**
- Create: `backend/app/services/balance.py`
- Test: `backend/tests/services/test_balance_service.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/services/test_balance_service.py`:
```python
from app.services.balance import compute_displayed_balance, compute_balance_delta


def test_compute_displayed_balance_basic():
    """seed + sum of active transactions = displayed balance."""
    seed_balance = 1000000  # 10,000.00 EGP
    transaction_amounts = [-50000, -30000, 200000]  # -500, -300, +2000
    result = compute_displayed_balance(seed_balance, transaction_amounts)
    assert result == 1000000 + (-50000) + (-30000) + 200000
    assert result == 1120000


def test_compute_displayed_balance_no_transactions():
    result = compute_displayed_balance(500000, [])
    assert result == 500000


def test_compute_displayed_balance_negative_result():
    """Credit card with more charges than seed."""
    result = compute_displayed_balance(0, [-500000, -300000])
    assert result == -800000


def test_compute_balance_delta_debit():
    """Debit transaction: amount stored as negative, delta is negative."""
    delta = compute_balance_delta(amount_minor=125000, tx_type="debit")
    assert delta == -125000


def test_compute_balance_delta_credit():
    """Credit transaction: amount stored as positive, delta is positive."""
    delta = compute_balance_delta(amount_minor=125000, tx_type="credit")
    assert delta == 125000


def test_compute_balance_delta_reversal():
    """Reversing a debit returns positive delta."""
    original_delta = compute_balance_delta(amount_minor=125000, tx_type="debit")
    reversal = -original_delta
    assert reversal == 125000
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/services/test_balance_service.py -v
```

Expected: FAIL

- [ ] **Step 3: Write balance.py**

Create `backend/app/services/balance.py`:
```python
"""Balance computation logic. All amounts are integer minor units."""


def compute_displayed_balance(seed_balance_minor: int, transaction_amounts: list[int]) -> int:
    """Compute displayed balance from seed + sum of signed transaction amounts.

    Args:
        seed_balance_minor: The account's seed balance (accounts.balance_minor).
        transaction_amounts: List of signed amounts from active transactions
            where applies_to_balance=True and date >= opened_at.

    Returns:
        Displayed balance in minor units.
    """
    return seed_balance_minor + sum(transaction_amounts)


def compute_balance_delta(amount_minor: int, tx_type: str) -> int:
    """Compute the signed delta a transaction applies to an account balance.

    The frontend sends amount_minor as a positive integer + type (debit/credit).
    This function returns the signed value to store and to apply as a balance delta.

    Args:
        amount_minor: Positive integer from the request.
        tx_type: "debit" or "credit".

    Returns:
        Negative for debit, positive for credit.
    """
    if tx_type == "debit":
        return -abs(amount_minor)
    return abs(amount_minor)
```

- [ ] **Step 4: Run test to verify it passes**

```bash
uv run pytest tests/services/test_balance_service.py -v
```

Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/balance.py backend/tests/services/test_balance_service.py
git commit -m "feat(backend): add balance computation service with delta logic"
```

---

### Task 6: Auth Dependencies (get_current_user, get_household_id)

**Files:**
- Modify: `backend/app/dependencies.py`
- Modify: `backend/tests/test_dependencies.py`
- Modify: `backend/tests/conftest.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/test_dependencies.py`:
```python
import pytest
import uuid
from unittest.mock import AsyncMock, patch

from app.dependencies import get_current_user, get_household_id


@pytest.mark.asyncio
async def test_get_current_user_with_valid_token():
    """Test that a valid JWT extracts the user_id."""
    test_user_id = str(uuid.uuid4())
    mock_payload = {"sub": test_user_id}

    with patch("app.dependencies.decode_jwt", return_value=mock_payload):
        user_id = await get_current_user(token=f"Bearer fake-token")
        assert str(user_id) == test_user_id


@pytest.mark.asyncio
async def test_get_current_user_rejects_missing_token():
    """No token → raises HTTPException 401."""
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(token="")
    assert exc_info.value.status_code == 401
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/test_dependencies.py -v
```

Expected: New tests FAIL — `ImportError: cannot import name 'get_current_user'`

- [ ] **Step 3: Update dependencies.py**

Replace `backend/app/dependencies.py`:
```python
import uuid
from collections.abc import AsyncGenerator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.database import async_session_factory
from app.models.household import HouseholdMember

security = HTTPBearer(auto_error=False)

try:
    _settings = Settings()  # type: ignore[call-arg]
    _supabase_jwt_secret = _settings.SUPABASE_ANON_KEY
except Exception:
    _supabase_jwt_secret = ""


def decode_jwt(token: str) -> dict:
    """Decode a Supabase JWT. Separated for easy mocking in tests."""
    return jwt.decode(
        token,
        _supabase_jwt_secret,
        algorithms=["HS256"],
        audience="authenticated",
        options={"verify_aud": False},
    )


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_current_user(
    token: str = "",
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> uuid.UUID:
    """Extract user_id from Supabase JWT Bearer token."""
    raw_token = ""
    if credentials:
        raw_token = credentials.credentials
    elif token and token.startswith("Bearer "):
        raw_token = token[7:]
    elif token:
        raw_token = token

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )

    try:
        payload = decode_jwt(raw_token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: no subject",
            )
        return uuid.UUID(user_id)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def get_household_id(
    session: AsyncSession = Depends(get_db_session),
    user_id: uuid.UUID = Depends(get_current_user),
) -> uuid.UUID:
    """Resolve user_id to their household_id."""
    result = await session.execute(
        select(HouseholdMember.household_id).where(
            HouseholdMember.user_id == user_id
        )
    )
    household_id = result.scalar_one_or_none()
    if not household_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of any household",
        )
    return household_id
```

- [ ] **Step 4: Run test to verify it passes**

```bash
uv run pytest tests/test_dependencies.py -v
```

Expected: All dependency tests pass (3 total: 1 original + 2 new).

- [ ] **Step 5: Update conftest.py with auth override helpers**

Add to `backend/tests/conftest.py`:
```python
import uuid

import pytest

from app.dependencies import get_current_user, get_household_id, get_db_session
from app.main import app


TEST_USER_ID = uuid.uuid4()
TEST_HOUSEHOLD_ID = uuid.uuid4()


async def override_get_current_user() -> uuid.UUID:
    return TEST_USER_ID


async def override_get_household_id() -> uuid.UUID:
    return TEST_HOUSEHOLD_ID


@pytest.fixture(autouse=True)
def override_auth_deps():
    """Override auth dependencies for all router tests."""
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_household_id] = override_get_household_id
    yield
    app.dependency_overrides.clear()
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/dependencies.py backend/tests/test_dependencies.py backend/tests/conftest.py
git commit -m "feat(backend): add Supabase JWT auth and household resolution dependencies"
```

---

### Task 7: Run Full Test Suite

- [ ] **Step 1: Run all tests**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/backend
uv run pytest -v
```

Expected: All tests pass. Should be ~50+ tests total.

- [ ] **Step 2: Run linting**

```bash
uv run ruff check . && uv run ruff format --check .
```

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "style(backend): apply formatting to schemas and services"
```
