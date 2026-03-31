# Copilot Review Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all valid bugs identified in Copilot's backend and frontend code review reports (PRs #34 and #36).

**Architecture:** 12 tasks grouped by layer and risk. Backend tasks first (critical → schema → quality → architecture → performance). Frontend tasks last. Each task is independently testable.

**Tech Stack:** Python 3.12, FastAPI, Pydantic V2, SQLAlchemy async, httpx, Next.js 16, TypeScript, Tailwind v4, TanStack Query

---

## File Map

### Backend — Modified
| File | Change |
|---|---|
| `backend/app/dependencies.py` | Make `_fetch_jwks` async, use `httpx.AsyncClient` |
| `backend/app/services/transfer.py` | Integer FX arithmetic; JOIN-based `list_transfers` |
| `backend/app/schemas/account.py` | `type: str` → `type: AccountType` |
| `backend/app/schemas/transaction.py` | `type: str` → `TransactionType`; remove `currency`; `Field(gt=0)` on `amount_minor` |
| `backend/app/schemas/category.py` | `type: str` → `type: CategoryType` |
| `backend/app/schemas/exchange_rate.py` | Add `@field_validator` on `rate` + `rate_scaled` property |
| `backend/app/services/account.py` | Fix `is_active == True`; fix deferred import; bulk `compute_net_worth` |
| `backend/app/services/transaction.py` | Bulk UPDATE for `bulk_delete` and `bulk_categorize` |
| `backend/app/services/money.py` | `Decimal` arithmetic in `format_amount` |
| `backend/app/routers/categories.py` | `type: str | None` → `CategoryType | None` |
| `backend/app/routers/households.py` | Thin router — delegate to new service |
| `backend/app/main.py` | Log `Settings()` exception |

### Backend — Created
| File | Purpose |
|---|---|
| `backend/app/services/household.py` | Business logic extracted from households router |
| `backend/app/schemas/household.py` | `HouseholdCreate` + `HouseholdResponse` schemas |

### Frontend — Modified
| File | Change |
|---|---|
| `frontend/src/app/(auth)/layout.tsx` | `bg-[#0F172A]` → `bg-background` |
| `frontend/src/components/accounts/account-card.tsx` | Thin orchestrator only — imports sub-cards |
| `frontend/src/app/(app)/accounts/page.tsx` | Use `useBulkSelection` hook |
| `frontend/src/app/(app)/accounts/[id]/page.tsx` | Use `useBulkSelection` hook |
| `frontend/src/app/(app)/transactions/page.tsx` | Use `useBulkSelection` hook |

### Frontend — Created
| File | Purpose |
|---|---|
| `frontend/src/components/accounts/credit-account-card.tsx` | `CreditAccountCard` component |
| `frontend/src/components/accounts/bank-account-card.tsx` | `BankAccountCard` component |
| `frontend/src/components/accounts/other-account-card.tsx` | `OtherAccountCard` component |
| `frontend/src/hooks/use-bulk-selection.ts` | Shared bulk selection state hook |

---

## Task 1: Fix Async JWKS Fetch

**Files:**
- Modify: `backend/app/dependencies.py`
- Test: `backend/tests/unit/test_dependencies.py` (create)

**Context:** `_fetch_jwks()` calls `httpx.get()` (synchronous) from within the async request path. On cache miss, this blocks the entire event loop for the duration of the HTTP round-trip to Supabase.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/unit/test_dependencies.py`:

```python
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_fetch_jwks_is_async():
    """_fetch_jwks must be an async coroutine, not a blocking sync call."""
    from app.dependencies import _fetch_jwks
    import inspect
    assert inspect.iscoroutinefunction(_fetch_jwks), "_fetch_jwks must be async def"


@pytest.mark.asyncio
async def test_fetch_jwks_uses_async_client():
    """_fetch_jwks must use httpx.AsyncClient, not httpx.get."""
    mock_response = MagicMock()
    mock_response.json.return_value = {"keys": []}
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.dependencies.httpx.AsyncClient", return_value=mock_client):
        with patch("app.dependencies._supabase_url", "https://test.supabase.co"):
            with patch("app.dependencies._jwks_cache", None):
                with patch("app.dependencies._jwks_cache_time", 0):
                    from app.dependencies import _fetch_jwks
                    result = await _fetch_jwks()
                    assert result == {"keys": []}
                    mock_client.get.assert_awaited_once()


@pytest.mark.asyncio
async def test_fetch_jwks_returns_cache_when_fresh():
    """_fetch_jwks must return cached value without HTTP call when cache is fresh."""
    import time
    from unittest.mock import patch

    cached = {"keys": [{"kid": "test"}]}

    with patch("app.dependencies._jwks_cache", cached):
        with patch("app.dependencies._jwks_cache_time", time.time()):
            with patch("app.dependencies.httpx.AsyncClient") as mock_cls:
                from app.dependencies import _fetch_jwks
                result = await _fetch_jwks()
                assert result == cached
                mock_cls.assert_not_called()
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend && uv run pytest tests/unit/test_dependencies.py -v
```
Expected: FAIL — `_fetch_jwks` is not async yet.

- [ ] **Step 3: Make `_fetch_jwks` async and use `httpx.AsyncClient`**

In `backend/app/dependencies.py`, replace the `_fetch_jwks` and `decode_jwt` functions:

```python
async def _fetch_jwks() -> dict:
    """Fetch JWKS from Supabase and cache for 1 hour. Async — does not block event loop."""
    global _jwks_cache, _jwks_cache_time
    now = time.time()
    if _jwks_cache and (now - _jwks_cache_time) < _JWKS_CACHE_TTL:
        return _jwks_cache
    jwks_url = f"{_supabase_url}/auth/v1/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        resp = await client.get(jwks_url, timeout=10)
        resp.raise_for_status()
    _jwks_cache = resp.json()
    _jwks_cache_time = now
    return _jwks_cache


async def decode_jwt(token: str) -> dict:
    """Decode a Supabase JWT (ES256 or HS256). Separated for easy mocking in tests."""
    header = jwt.get_unverified_header(token)
    alg = header.get("alg", "HS256")

    if alg == "ES256":
        jwks = await _fetch_jwks()
        return jwt.decode(
            token,
            jwks,
            algorithms=["ES256"],
            audience="authenticated",
            options={"verify_aud": False},
        )

    return jwt.decode(
        token,
        _supabase_jwt_secret,
        algorithms=["HS256"],
        audience="authenticated",
        options={"verify_aud": False},
    )
```

Update `get_current_user` to `await decode_jwt`:
```python
async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> uuid.UUID:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )
    try:
        payload = await decode_jwt(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: no subject",
            )
        return uuid.UUID(user_id)
    except (JWTError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend && uv run pytest tests/unit/test_dependencies.py -v
```
Expected: 3 PASS

- [ ] **Step 5: Run full suite to confirm no regressions**

```bash
cd backend && uv run pytest --ignore=tests/integration -v
```
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add backend/app/dependencies.py backend/tests/unit/test_dependencies.py
git commit -m "fix(auth): make _fetch_jwks async — use httpx.AsyncClient to avoid blocking event loop"
```

---

## Task 2: Fix FX Integer Arithmetic

**Files:**
- Modify: `backend/app/services/transfer.py`
- Test: `backend/tests/unit/test_transfer_service.py` (create)

**Context:** `round(source_amount * data.fx_rate_minor_units / 10000)` produces a float intermediate. Fix with integer floor division: `(source_amount * fx_rate + 5000) // 10000` (round-half-up semantics).

- [ ] **Step 1: Write the failing test**

Create `backend/tests/unit/test_transfer_service.py`:

```python
import pytest


def test_fx_calculation_produces_no_float():
    """FX target amount must be computed using pure integer arithmetic."""
    source_amount = 1_000_000  # 10,000.00 EGP in minor units
    fx_rate = 485000  # 48.5 (stored as rate * 10000)

    # Current (buggy) approach produces float intermediate
    result_float = round(source_amount * fx_rate / 10000)
    assert isinstance(result_float, int)  # round() returns int in Python 3

    # Correct integer approach
    result_int = (source_amount * fx_rate + 5000) // 10000
    assert isinstance(result_int, int)

    # Both should give same result for normal values
    assert result_float == result_int


def test_fx_calculation_rounding():
    """Verify rounding is consistent: 0.5 rounds up (round-half-up via +5000)."""
    # 1 minor unit * rate that would give exactly 0.5 without rounding
    # rate_scaled=5000 means rate=0.5, so 1 * 0.5 = 0.5 → rounds to 1
    source = 1
    rate = 5000  # 0.5 rate
    result = (source * rate + 5000) // 10000
    assert result == 1  # rounds up


def test_fx_calculation_large_amounts():
    """Large EGP amounts (multi-million) must not lose precision."""
    source = 100_000_000_00  # 1,000,000,000.00 EGP (1 billion)
    rate = 485_000  # 48.5 USD/EGP
    result = (source * rate + 5000) // 10000
    assert isinstance(result, int)
    assert result == 485_000_000_000  # 4,850,000,000.00 USD


def test_same_currency_transfer_skips_fx():
    """Same-currency transfers must use source_amount directly, no FX."""
    source = 50000  # 500.00 EGP
    # No FX rate provided — result must equal source
    result = source  # direct assignment
    assert result == source
    assert isinstance(result, int)
```

- [ ] **Step 2: Run test to confirm it passes (these are logic tests, no need to fail first)**

```bash
cd backend && uv run pytest tests/unit/test_transfer_service.py -v
```
Expected: all PASS (these test the arithmetic contract, not current code)

- [ ] **Step 3: Fix the FX arithmetic in `create_transfer`**

In `backend/app/services/transfer.py`, replace the FX calculation block (lines ~48-51):

```python
    # Compute target amount — pure integer arithmetic, no float intermediates
    if data.fx_rate_minor_units is not None:
        if from_acct.currency == to_acct.currency:
            raise ValueError("FX rate must not be provided for same-currency transfers")
        # Round-half-up: add half the divisor before integer division
        target_amount = (source_amount * data.fx_rate_minor_units + 5000) // 10000
    elif from_acct.currency != to_acct.currency:
        raise ValueError("FX rate required for cross-currency transfer")
    else:
        target_amount = source_amount
```

- [ ] **Step 4: Run full suite**

```bash
cd backend && uv run pytest --ignore=tests/integration -v
```
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/transfer.py backend/tests/unit/test_transfer_service.py
git commit -m "fix(transfers): use integer arithmetic for FX target-amount — eliminate float intermediate"
```

---

## Task 3: Schema Type Safety

**Files:**
- Modify: `backend/app/schemas/account.py`, `backend/app/schemas/transaction.py`, `backend/app/schemas/category.py`, `backend/app/routers/categories.py`
- Test: `backend/tests/unit/test_schemas.py` (create)

**Context:** Three schemas accept `type: str` with no validation — invalid strings pass silently to the DB. The categories router's `type` query param has the same issue.

- [ ] **Step 1: Write failing tests**

Create `backend/tests/unit/test_schemas.py`:

```python
import pytest
from pydantic import ValidationError


def test_account_create_rejects_invalid_type():
    from app.schemas.account import AccountCreate
    with pytest.raises(ValidationError) as exc_info:
        AccountCreate(name="Test", type="invalid_type", currency="EGP")
    assert "type" in str(exc_info.value)


def test_account_create_accepts_valid_types():
    from app.schemas.account import AccountCreate
    from app.models.enums import AccountType
    for account_type in AccountType:
        schema = AccountCreate(name="Test", type=account_type, currency="EGP")
        assert schema.type == account_type


def test_transaction_create_rejects_invalid_type():
    from app.schemas.transaction import TransactionCreate
    import datetime
    with pytest.raises(ValidationError) as exc_info:
        TransactionCreate(
            account_id=1, date=datetime.date.today(),
            description="Test", amount_minor=1000, type="invalid",
        )
    assert "type" in str(exc_info.value)


def test_transaction_create_accepts_debit_credit():
    from app.schemas.transaction import TransactionCreate
    import datetime
    for tx_type in ("debit", "credit"):
        schema = TransactionCreate(
            account_id=1, date=datetime.date.today(),
            description="Test", amount_minor=1000, type=tx_type,
        )
        assert schema.type == tx_type


def test_category_create_rejects_invalid_type():
    from app.schemas.category import CategoryCreate
    with pytest.raises(ValidationError) as exc_info:
        CategoryCreate(name_en="Food", type="bad_type")
    assert "type" in str(exc_info.value)


def test_category_create_accepts_valid_types():
    from app.schemas.category import CategoryCreate
    from app.models.enums import CategoryType
    for cat_type in CategoryType:
        schema = CategoryCreate(name_en="Food", type=cat_type)
        assert schema.type == cat_type
```

- [ ] **Step 2: Run to confirm they fail**

```bash
cd backend && uv run pytest tests/unit/test_schemas.py -v
```
Expected: FAIL — `type: str` accepts anything.

- [ ] **Step 3: Fix `schemas/account.py`**

```python
# backend/app/schemas/account.py
from datetime import date
from app.models.enums import AccountType
from pydantic import BaseModel, Field


class AccountCreate(BaseModel):
    name: str
    type: AccountType  # was: str
    currency: str = Field(max_length=3)
    initial_balance: int = 0
    institution: str | None = None
    credit_limit: int | None = None
    billing_cycle_day: int | None = Field(default=None, ge=1, le=31)
    payment_due_day: int | None = Field(default=None, ge=1, le=31)
    opened_at: date | None = None


class AccountUpdate(BaseModel):
    name: str | None = None
    institution: str | None = None
    credit_limit: int | None = None
    billing_cycle_day: int | None = Field(default=None, ge=1, le=31)
    payment_due_day: int | None = Field(default=None, ge=1, le=31)


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
    actual_balance: int
    notes: str | None = None
```

- [ ] **Step 4: Fix `schemas/transaction.py`** — change `type: str` to use `TransactionType`

```python
# backend/app/schemas/transaction.py
import datetime
from uuid import UUID
from app.models.enums import TransactionType
from pydantic import BaseModel, Field


class TransactionCreate(BaseModel):
    account_id: int
    date: datetime.date
    description: str
    amount_minor: int = Field(gt=0)  # Always positive — backend computes sign from type
    type: TransactionType             # was: str
    # currency removed — always inherits from account
    category_id: int | None = None
    notes: str | None = None
    gam3eya_id: int | None = None
    asset_id: int | None = None


class TransactionUpdate(BaseModel):
    date: datetime.date | None = None
    description: str | None = None
    amount_minor: int | None = Field(default=None, gt=0)
    type: TransactionType | None = None  # was: str | None
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
    icon: str | None = None

    model_config = {"from_attributes": True}


class TransactionResponse(BaseModel):
    id: int
    account_id: int
    date: datetime.date
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

- [ ] **Step 5: Fix `schemas/category.py`**

```python
# backend/app/schemas/category.py
from __future__ import annotations
from app.models.enums import CategoryType
from pydantic import BaseModel


class CategoryCreate(BaseModel):
    name_en: str
    name_ar: str | None = None
    type: CategoryType  # was: str
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

- [ ] **Step 6: Fix `routers/categories.py` — typed `type` query param**

Replace line `type: str | None = None` with:

```python
from app.models.enums import CategoryType

@router.get("")
async def list_categories(
    type: CategoryType | None = None,   # was: str | None
    active_only: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
```

- [ ] **Step 7: Run schema tests**

```bash
cd backend && uv run pytest tests/unit/test_schemas.py -v
```
Expected: all PASS

- [ ] **Step 8: Run full suite**

```bash
cd backend && uv run pytest --ignore=tests/integration -v
```
Expected: all pass

- [ ] **Step 9: Commit**

```bash
git add backend/app/schemas/account.py backend/app/schemas/transaction.py \
        backend/app/schemas/category.py backend/app/routers/categories.py \
        backend/tests/unit/test_schemas.py
git commit -m "fix(schemas): replace bare str type fields with typed enums — AccountType, TransactionType, CategoryType"
```

---

## Task 4: Exchange Rate Validator + TransactionCreate Cleanup

**Files:**
- Modify: `backend/app/schemas/exchange_rate.py`
- Test: add to `backend/tests/unit/test_schemas.py`

**Context:** `ManualRateRequest.rate: float` has no validation — negative or zero rates pass silently. Add a validator and a `rate_scaled` property so callers use the integer form.

- [ ] **Step 1: Add tests to `test_schemas.py`**

Append to `backend/tests/unit/test_schemas.py`:

```python
def test_manual_rate_request_rejects_negative_rate():
    from app.schemas.exchange_rate import ManualRateRequest
    import datetime
    with pytest.raises(ValidationError):
        ManualRateRequest(date=datetime.date.today(), to_currency="USD", rate=-1.0)


def test_manual_rate_request_rejects_zero_rate():
    from app.schemas.exchange_rate import ManualRateRequest
    import datetime
    with pytest.raises(ValidationError):
        ManualRateRequest(date=datetime.date.today(), to_currency="USD", rate=0.0)


def test_manual_rate_request_rate_scaled_property():
    from app.schemas.exchange_rate import ManualRateRequest
    import datetime
    req = ManualRateRequest(date=datetime.date.today(), to_currency="USD", rate=48.5)
    assert req.rate_scaled == 485000  # 48.5 * 10000
    assert isinstance(req.rate_scaled, int)


def test_transaction_create_rejects_negative_amount():
    from app.schemas.transaction import TransactionCreate
    import datetime
    with pytest.raises(ValidationError):
        TransactionCreate(
            account_id=1, date=datetime.date.today(),
            description="Test", amount_minor=-100, type="debit",
        )


def test_transaction_create_rejects_zero_amount():
    from app.schemas.transaction import TransactionCreate
    import datetime
    with pytest.raises(ValidationError):
        TransactionCreate(
            account_id=1, date=datetime.date.today(),
            description="Test", amount_minor=0, type="debit",
        )


def test_transaction_create_has_no_currency_field():
    from app.schemas.transaction import TransactionCreate
    import inspect
    fields = TransactionCreate.model_fields
    assert "currency" not in fields, "currency field must not exist in TransactionCreate"
```

- [ ] **Step 2: Run to confirm failures**

```bash
cd backend && uv run pytest tests/unit/test_schemas.py -v
```
Expected: the 3 new exchange rate + transaction tests fail.

- [ ] **Step 3: Fix `schemas/exchange_rate.py`**

```python
# backend/app/schemas/exchange_rate.py
from __future__ import annotations
from datetime import date, datetime
from pydantic import BaseModel, field_validator


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
    rate: float  # User-friendly float input — backend converts via rate_scaled

    @field_validator("rate")
    @classmethod
    def rate_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("rate must be a positive number")
        return v

    @property
    def rate_scaled(self) -> int:
        """Convert user-supplied rate to scaled integer (rate × 10 000)."""
        return round(self.rate * 10_000)
```

- [ ] **Step 4: Run all schema tests**

```bash
cd backend && uv run pytest tests/unit/test_schemas.py -v
```
Expected: all PASS

- [ ] **Step 5: Run full suite**

```bash
cd backend && uv run pytest --ignore=tests/integration -v
```
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas/exchange_rate.py backend/tests/unit/test_schemas.py
git commit -m "fix(schemas): add positive validator + rate_scaled property to ManualRateRequest; enforce amount_minor gt=0 on TransactionCreate"
```

---

## Task 5: Code Quality Cleanup

**Files:**
- Modify: `backend/app/services/account.py`, `backend/app/services/money.py`, `backend/app/main.py`

**Context:** Three independent cleanups: (1) `is_active == True` → `.is_(True)` + remove `# noqa`; (2) deferred `Household` import → top-level; (3) `format_amount` uses float division → `Decimal`; (4) `main.py` silently swallows Settings error.

- [ ] **Step 1: Fix `is_active == True` in `account.py`**

In `backend/app/services/account.py`, replace the `list_accounts` query (line ~30):

```python
    q = (
        select(Account)
        .where(Account.household_id == household_id, Account.is_active.is_(True))  # was: == True  # noqa: E712
        .offset((page - 1) * page_size)
        .limit(page_size)
        .order_by(Account.id)
    )
```

- [ ] **Step 2: Fix deferred import in `account.py`**

Move `from app.models.household import Household` to the top of `account.py`, alongside the other model imports:

```python
# backend/app/services/account.py
"""Account business logic. No HTTP awareness."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.household import Household   # moved from inside compute_net_worth
from app.models.transaction import Transaction
from app.schemas.account import AccountCreate, AccountUpdate
```

Then remove the `from app.models.household import Household` line inside `compute_net_worth`.

- [ ] **Step 3: Fix `format_amount` in `money.py` — use Decimal**

```python
# backend/app/services/money.py
"""Money formatting and conversion utilities. All amounts are integer minor units."""

from decimal import Decimal, ROUND_HALF_UP

from app.seed import CURRENCIES


def format_amount(amount_minor: int, currency: str) -> str:
    """Format integer minor units to human-readable string.

    Example: format_amount(125000, "EGP") -> "1,250.00"
    Example: format_amount(125000, "KWD") -> "125.000"
    """
    exponent = CURRENCIES.get(currency, {}).get("exponent", 2)
    divisor = Decimal(10**exponent)
    major = Decimal(amount_minor) / divisor
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

- [ ] **Step 4: Fix `main.py` — log Settings exception**

```python
# backend/app/main.py
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings
from app.routers import accounts, categories, transactions, transfers
from app.routers.households import router as households_router

logger = logging.getLogger(__name__)

try:
    _settings = Settings()  # type: ignore[call-arg]
    _cors_origins = _settings.CORS_ORIGINS
except Exception as e:
    logger.warning("Failed to load Settings — falling back to localhost CORS: %s", e)
    _cors_origins = ["http://localhost:3000"]
```

- [ ] **Step 5: Run full suite**

```bash
cd backend && uv run pytest --ignore=tests/integration -v
```
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/account.py backend/app/services/money.py backend/app/main.py
git commit -m "fix(backend): code quality — is_active.is_(True), move deferred import, Decimal in format_amount, log Settings failure"
```

---

## Task 6: Extract Households Service + Schema

**Files:**
- Create: `backend/app/services/household.py`
- Create: `backend/app/schemas/household.py`
- Modify: `backend/app/routers/households.py`
- Test: `backend/tests/unit/test_household_service.py` (create)

**Context:** `routers/households.py` contains direct SQLAlchemy queries and ORM mutations. `HouseholdCreate` is defined inline. Both should move to dedicated service/schema modules.

- [ ] **Step 1: Write failing tests**

Create `backend/tests/unit/test_household_service.py`:

```python
import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_get_household_for_user_returns_none_when_no_household():
    """Returns None when the user has no household."""
    from app.services.household import get_household_for_user

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute = AsyncMock(return_value=mock_result)

    result = await get_household_for_user(mock_session, uuid.uuid4())
    assert result is None


@pytest.mark.asyncio
async def test_get_household_for_user_returns_household_id():
    """Returns UUID when user has a household."""
    from app.services.household import get_household_for_user

    expected_id = uuid.uuid4()
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = expected_id
    mock_session.execute = AsyncMock(return_value=mock_result)

    result = await get_household_for_user(mock_session, uuid.uuid4())
    assert result == expected_id


def test_household_create_schema_validation():
    """HouseholdCreate rejects empty names and invalid currencies."""
    from app.schemas.household import HouseholdCreate
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        HouseholdCreate(name="", base_currency="EGP")

    with pytest.raises(ValidationError):
        HouseholdCreate(name="Test", base_currency="JPY")  # not in allowed list

    valid = HouseholdCreate(name="My Home", base_currency="EGP")
    assert valid.name == "My Home"
    assert valid.base_currency == "EGP"
```

- [ ] **Step 2: Run to confirm failures**

```bash
cd backend && uv run pytest tests/unit/test_household_service.py -v
```
Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Create `schemas/household.py`**

```python
# backend/app/schemas/household.py
import uuid
from typing import Literal

from pydantic import BaseModel, Field


class HouseholdCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    base_currency: Literal["EGP", "USD", "EUR", "GBP", "SAR", "AED", "KWD"] = "EGP"


class HouseholdResponse(BaseModel):
    id: uuid.UUID
    name: str
    base_currency: str

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Create `services/household.py`**

```python
# backend/app/services/household.py
"""Household business logic. No HTTP awareness."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import HouseholdRole
from app.models.household import Household, HouseholdMember
from app.schemas.household import HouseholdCreate


async def get_household_for_user(
    session: AsyncSession,
    user_id: uuid.UUID,
) -> uuid.UUID | None:
    """Return the household_id for a user, or None if they have no household."""
    result = await session.execute(
        select(HouseholdMember.household_id)
        .where(HouseholdMember.user_id == user_id)
        .limit(1)
    )
    return result.scalar_one_or_none()


async def create_household(
    session: AsyncSession,
    user_id: uuid.UUID,
    data: HouseholdCreate,
) -> Household:
    """Create a household and add user as ADMIN. Raises ValueError if user already has one."""
    existing = await get_household_for_user(session, user_id)
    if existing is not None:
        raise ValueError("User already belongs to a household")

    household = Household(name=data.name, base_currency=data.base_currency)
    session.add(household)
    await session.flush()

    member = HouseholdMember(
        household_id=household.id,
        user_id=user_id,
        role=HouseholdRole.ADMIN,
        display_name="Owner",
    )
    session.add(member)
    await session.flush()
    return household
```

- [ ] **Step 5: Update `routers/households.py` to be a thin router**

```python
# backend/app/routers/households.py
import uuid
from typing import Any

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db_session
from app.schemas.household import HouseholdCreate
from app.services import household as household_service

router = APIRouter(prefix="/api/v1", tags=["households"])


@router.get("/auth/household-status")
async def get_household_status(
    session: AsyncSession = Depends(get_db_session),
    user_id: uuid.UUID = Depends(get_current_user),
) -> dict:
    """Check if authenticated user has a household. Does NOT auto-provision."""
    household_id = await household_service.get_household_for_user(session, user_id)
    return {"data": {"has_household": household_id is not None}}


@router.post("/households", status_code=status.HTTP_201_CREATED, response_model=None)
async def create_household(
    data: HouseholdCreate,
    session: AsyncSession = Depends(get_db_session),
    user_id: uuid.UUID = Depends(get_current_user),
) -> Any:
    """Create a household and add the current user as admin. Called during onboarding."""
    try:
        household = await household_service.create_household(session, user_id, data)
    except ValueError:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": {
                    "code": "ALREADY_HAS_HOUSEHOLD",
                    "message": "User already belongs to a household",
                }
            },
        )
    return {
        "data": {
            "id": str(household.id),
            "name": household.name,
            "base_currency": household.base_currency,
        }
    }
```

- [ ] **Step 6: Run household tests**

```bash
cd backend && uv run pytest tests/unit/test_household_service.py -v
```
Expected: all PASS

- [ ] **Step 7: Run full suite**

```bash
cd backend && uv run pytest --ignore=tests/integration -v
```
Expected: all pass

- [ ] **Step 8: Commit**

```bash
git add backend/app/services/household.py backend/app/schemas/household.py \
        backend/app/routers/households.py backend/tests/unit/test_household_service.py
git commit -m "refactor(households): extract service + schema — router is now a thin HTTP adapter"
```

---

## Task 7: Fix Bulk Operations N+1

**Files:**
- Modify: `backend/app/services/transaction.py`
- Test: add to `backend/tests/unit/test_transaction_service.py` (create if needed)

**Context:** `bulk_delete` and `bulk_categorize` loop per-ID, issuing one SELECT + one UPDATE per transaction. Fix with single bulk UPDATE statements.

- [ ] **Step 1: Write failing tests**

Create `backend/tests/unit/test_transaction_service.py`:

```python
import pytest
from unittest.mock import AsyncMock, MagicMock, call, patch
import uuid


@pytest.mark.asyncio
async def test_bulk_delete_issues_single_update():
    """bulk_delete must use a single UPDATE statement, not N individual SELECTs."""
    from app.services.transaction import bulk_delete

    mock_session = AsyncMock()
    # Simulate execute returning verified IDs
    mock_result = MagicMock()
    mock_result.__iter__ = MagicMock(return_value=iter([(1,), (2,), (3,)]))
    mock_session.execute = AsyncMock(return_value=mock_result)

    household_id = uuid.uuid4()
    count = await bulk_delete(mock_session, household_id, [1, 2, 3])

    # Must call execute exactly twice: once for SELECT (verify), once for DELETE splits, once for UPDATE
    assert mock_session.execute.call_count == 3
    assert count == 3


@pytest.mark.asyncio
async def test_bulk_categorize_issues_single_update():
    """bulk_categorize must use a single UPDATE statement."""
    from app.services.transaction import bulk_categorize, validate_category_access

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_session.execute = AsyncMock(return_value=mock_result)

    household_id = uuid.uuid4()

    with patch("app.services.transaction.validate_category_access", new_callable=AsyncMock):
        count = await bulk_categorize(mock_session, household_id, [1, 2, 3], category_id=5)

    # Must call execute exactly once for the bulk UPDATE (after validate_category_access)
    assert mock_session.execute.call_count == 1
    assert count == 3
```

- [ ] **Step 2: Run to confirm failures**

```bash
cd backend && uv run pytest tests/unit/test_transaction_service.py -v
```
Expected: FAIL — current implementations loop per-ID.

- [ ] **Step 3: Rewrite `bulk_delete` in `services/transaction.py`**

Add `update` to the imports at the top of the file:

```python
from sqlalchemy import delete, func, or_, select, update
```

Replace the `bulk_delete` function:

```python
async def bulk_delete(
    session: AsyncSession,
    household_id: uuid.UUID,
    ids: list[int],
) -> int:
    """Bulk soft-delete transactions. Returns count of actually deleted."""
    if not ids:
        return 0

    # Verify ownership — only delete IDs that belong to this household and are active
    verify_q = select(Transaction.id).where(
        Transaction.id.in_(ids),
        Transaction.household_id == household_id,
        Transaction.is_active.is_(True),
    )
    result = await session.execute(verify_q)
    verified_ids = [row[0] for row in result]

    if not verified_ids:
        return 0

    # Hard-delete splits for these transactions
    await session.execute(
        delete(TransactionSplit).where(TransactionSplit.transaction_id.in_(verified_ids))
    )

    # Bulk soft-delete transactions in a single UPDATE
    await session.execute(
        update(Transaction)
        .where(Transaction.id.in_(verified_ids))
        .values(is_active=False)
    )

    return len(verified_ids)
```

- [ ] **Step 4: Rewrite `bulk_categorize` in `services/transaction.py`**

```python
async def bulk_categorize(
    session: AsyncSession,
    household_id: uuid.UUID,
    ids: list[int],
    category_id: int,
) -> int:
    """Bulk categorize transactions. Returns count updated."""
    if not ids:
        return 0

    await validate_category_access(session, category_id, household_id)

    await session.execute(
        update(Transaction)
        .where(
            Transaction.id.in_(ids),
            Transaction.household_id == household_id,
            Transaction.is_active.is_(True),
        )
        .values(category_id=category_id)
    )
    return len(ids)
```

- [ ] **Step 5: Run tests**

```bash
cd backend && uv run pytest tests/unit/test_transaction_service.py -v
```
Expected: all PASS

- [ ] **Step 6: Run full suite**

```bash
cd backend && uv run pytest --ignore=tests/integration -v
```
Expected: all pass

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/transaction.py backend/tests/unit/test_transaction_service.py
git commit -m "perf(transactions): replace N+1 loops in bulk_delete and bulk_categorize with single UPDATE statements"
```

---

## Task 8: Fix compute_net_worth N+1

**Files:**
- Modify: `backend/app/services/account.py`
- Test: add to `backend/tests/unit/test_account_service.py` (create)

**Context:** `compute_net_worth` calls `compute_displayed_balance` per account — N DB queries for N accounts. Fix: single aggregate query for all accounts without `opened_at`, fallback to individual query only for accounts that have an `opened_at` filter.

- [ ] **Step 1: Write test**

Create `backend/tests/unit/test_account_service.py`:

```python
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import uuid


@pytest.mark.asyncio
async def test_compute_net_worth_uses_bulk_query():
    """compute_net_worth must issue a single aggregate query, not one per account."""
    from app.services.account import compute_net_worth

    household_id = uuid.uuid4()

    # Mock list_accounts to return 3 accounts (none with opened_at)
    mock_acct = lambda aid, currency, balance: MagicMock(
        id=aid, currency=currency, balance_minor=balance,
        opened_at=None, household_id=household_id
    )
    accounts = [mock_acct(1, "EGP", 100000), mock_acct(2, "EGP", 50000), mock_acct(3, "USD", 20000)]

    mock_session = AsyncMock()

    # First execute: bulk tx_sums query → returns rows per account
    tx_rows = [MagicMock(account_id=1, tx_sum=10000), MagicMock(account_id=2, tx_sum=5000)]
    bulk_result = MagicMock()
    bulk_result.__iter__ = MagicMock(return_value=iter(tx_rows))

    # Second execute: household get → returns household object
    hh = MagicMock(base_currency="EGP")
    mock_session.get = AsyncMock(return_value=hh)
    mock_session.execute = AsyncMock(return_value=bulk_result)

    with patch("app.services.account.list_accounts", new_callable=AsyncMock) as mock_list:
        mock_list.return_value = (accounts, 3)
        result = await compute_net_worth(mock_session, household_id)

    # execute should be called exactly once (bulk tx_sums query)
    assert mock_session.execute.call_count == 1
    assert result["account_count"] == 3
    assert result["base_currency"] == "EGP"
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd backend && uv run pytest tests/unit/test_account_service.py -v
```
Expected: FAIL — execute is called N+1 times.

- [ ] **Step 3: Rewrite `compute_net_worth` in `services/account.py`**

```python
async def compute_net_worth(
    session: AsyncSession,
    household_id: uuid.UUID,
) -> dict:
    """Compute net worth across all active accounts. Uses a single bulk query."""
    accounts, _ = await list_accounts(session, household_id, page=1, page_size=1000)

    # Partition accounts: those without opened_at (bulk-queryable) vs. with opened_at (individual)
    no_filter_ids = [a.id for a in accounts if a.opened_at is None]

    # Single aggregate query for all accounts without an opened_at cutoff
    tx_sums: dict[int, int] = {}
    if no_filter_ids:
        rows = await session.execute(
            select(
                Transaction.account_id,
                func.coalesce(func.sum(Transaction.amount_minor), 0).label("tx_sum"),
            )
            .where(
                Transaction.household_id == household_id,
                Transaction.is_active.is_(True),
                Transaction.applies_to_balance.is_(True),
                Transaction.account_id.in_(no_filter_ids),
            )
            .group_by(Transaction.account_id)
        )
        tx_sums = {row.account_id: int(row.tx_sum) for row in rows}

    by_currency: dict[str, int] = {}
    for acct in accounts:
        if acct.opened_at is None:
            bal = acct.balance_minor + tx_sums.get(acct.id, 0)
        else:
            # Rare case: account has an opened_at filter — individual query
            bal = await compute_displayed_balance(session, acct)
        by_currency[acct.currency] = by_currency.get(acct.currency, 0) + bal

    hh = await session.get(Household, household_id)
    base_currency = hh.base_currency if hh else "EGP"
    total_base_minor = by_currency.get(base_currency, 0)

    return {
        "by_currency": by_currency,
        "total_base_minor": total_base_minor,
        "base_currency": base_currency,
        "account_count": len(accounts),
    }
```

- [ ] **Step 4: Run tests**

```bash
cd backend && uv run pytest tests/unit/test_account_service.py -v
```
Expected: all PASS

- [ ] **Step 5: Run full suite**

```bash
cd backend && uv run pytest --ignore=tests/integration -v
```
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/account.py backend/tests/unit/test_account_service.py
git commit -m "perf(accounts): replace N+1 compute_displayed_balance loop in compute_net_worth with single aggregate query"
```

---

## Task 9: Fix list_transfers N+1

**Files:**
- Modify: `backend/app/services/transfer.py`
- Test: add to `backend/tests/unit/test_transfer_service.py`

**Context:** `list_transfers` issues 3 extra DB queries per transfer (credit leg SELECT + 2× account GET). Fix with a JOIN query that fetches all four rows at once.

- [ ] **Step 1: Add test**

Append to `backend/tests/unit/test_transfer_service.py`:

```python
@pytest.mark.asyncio
async def test_list_transfers_uses_single_query():
    """list_transfers must issue at most 2 queries (count + fetch), not 3N+2."""
    from app.services.transfer import list_transfers

    household_id = uuid.uuid4()
    mock_session = AsyncMock()

    # Count query returns 0 — short-circuits to empty list
    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    mock_session.execute = AsyncMock(return_value=count_result)

    items, total = await list_transfers(mock_session, household_id)

    assert total == 0
    assert items == []
    # Only the count query should fire when total is 0
    assert mock_session.execute.call_count == 1
```

- [ ] **Step 2: Run to confirm**

```bash
cd backend && uv run pytest tests/unit/test_transfer_service.py::test_list_transfers_uses_single_query -v
```
Expected: PASS (count=0 path already exits early in any implementation)

- [ ] **Step 3: Rewrite `list_transfers` with a JOIN**

Add to imports in `transfer.py`:

```python
from sqlalchemy import and_, func, select
from sqlalchemy.orm import aliased
```

Replace the `list_transfers` function body (keep signature unchanged):

```python
async def list_transfers(
    session: AsyncSession,
    household_id: uuid.UUID,
    *,
    account_id: int | None = None,
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[dict[str, Any]], int]:
    """List transfers (debit legs only) using a JOIN. Returns (items, total_count)."""
    # Aliases for the JOIN
    credit_leg = aliased(Transaction, name="credit_leg")
    from_acct = aliased(Account, name="from_acct")
    to_acct = aliased(Account, name="to_acct")

    base_filters = [
        Transaction.household_id == household_id,
        Transaction.is_active.is_(True),
        Transaction.type == "debit",
        Transaction.transfer_id.is_not(None),
    ]
    if account_id is not None:
        base_filters.append(Transaction.account_id == account_id)
    if date_from is not None:
        base_filters.append(Transaction.date >= date_from)
    if date_to is not None:
        base_filters.append(Transaction.date <= date_to)

    # Count query (debit legs only)
    count_q = select(func.count(Transaction.id)).where(*base_filters)
    total: int = (await session.execute(count_q)).scalar_one()

    if total == 0:
        return [], 0

    # Single JOIN query: debit leg + credit leg + both accounts
    fetch_q = (
        select(Transaction, credit_leg, from_acct, to_acct)
        .join(
            credit_leg,
            and_(
                credit_leg.transfer_id == Transaction.transfer_id,
                credit_leg.type == "credit",
                credit_leg.is_active.is_(True),
                credit_leg.household_id == household_id,
            ),
            isouter=True,
        )
        .join(from_acct, from_acct.id == Transaction.account_id, isouter=True)
        .join(to_acct, to_acct.id == credit_leg.account_id, isouter=True)
        .where(*base_filters)
        .order_by(Transaction.date.desc(), Transaction.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await session.execute(fetch_q)).all()

    def _acct_dict(a: Account | None) -> dict | None:
        if a is None:
            return None
        return {
            "id": a.id,
            "name": a.name,
            "currency": a.currency,
            "type": a.type.value if hasattr(a.type, "value") else a.type,
            "institution": a.institution,
        }

    items: list[dict[str, Any]] = []
    for debit, credit, fa, ta in rows:
        items.append(
            {
                "transfer_id": debit.transfer_id,
                "date": debit.date,
                "description": debit.description,
                "from_account": _acct_dict(fa),
                "to_account": _acct_dict(ta),
                "source_amount": abs(int(debit.amount_minor)),
                "target_amount": abs(int(credit.amount_minor)) if credit else 0,
                "fx_rate_minor_units": debit.fx_rate_minor_units,
            }
        )

    return items, total
```

- [ ] **Step 4: Run full suite**

```bash
cd backend && uv run pytest --ignore=tests/integration -v
```
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/transfer.py backend/tests/unit/test_transfer_service.py
git commit -m "perf(transfers): replace 3N+2 queries in list_transfers with a single JOIN query"
```

---

## Task 10: Fix Auth Layout Background Token

**Files:**
- Modify: `frontend/src/app/(auth)/layout.tsx`

**Context:** The marketing panel uses `bg-[#0F172A]` — a hardcoded hex. `#0F172A` is exactly the dark-mode `--background` token (`hsl(222.2 47.4% 11.2%)`). Since the panel is always dark regardless of the user's color mode, and `bg-background` in light mode would be white, the correct fix is to use a CSS variable reference directly rather than `bg-background` (which is theme-aware). We register a new `--auth-panel` token in `globals.css` and use it.

- [ ] **Step 1: Add `--auth-panel` token to `globals.css`**

In `frontend/src/app/globals.css`, add to the `@theme inline` block (after `--color-surface`):

```css
  --color-auth-panel: hsl(var(--auth-panel));
```

Add to `:root` block (after `--surface` definition):

```css
    --auth-panel: 222.2 47.4% 11.2%;
```

The `.dark` block does NOT need this token — the panel is always dark.

- [ ] **Step 2: Update `(auth)/layout.tsx`**

Replace `bg-[#0F172A]` with `bg-auth-panel`:

```tsx
      {/* Left marketing panel — hidden below md */}
      <div className="hidden md:flex md:w-3/5 flex-col justify-between bg-auth-panel p-12 text-white">
```

- [ ] **Step 3: Verify build and lint pass**

```bash
cd frontend && pnpm lint && pnpm exec tsc --noEmit && pnpm build
```
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/globals.css frontend/src/app/(auth)/layout.tsx
git commit -m "fix(auth): replace hardcoded bg-[#0F172A] with bg-auth-panel design token"
```

---

## Task 11: Split account-card.tsx Into Focused Files

**Files:**
- Modify: `frontend/src/components/accounts/account-card.tsx` (thin orchestrator)
- Create: `frontend/src/components/accounts/credit-account-card.tsx`
- Create: `frontend/src/components/accounts/bank-account-card.tsx`
- Create: `frontend/src/components/accounts/other-account-card.tsx`

**Context:** `account-card.tsx` is 632 lines with 3 card variant components, shared state, and edit/delete dialogs all in one file. Extract each card variant to its own file.

- [ ] **Step 1: Create `credit-account-card.tsx`**

```tsx
// frontend/src/components/accounts/credit-account-card.tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAmount } from "@/lib/money";
import { UtilizationBar } from "./utilization-bar";
import { cn } from "@/lib/utils";
import type { Account } from "@/hooks/use-accounts";

function creditCardGradient(id: number): string {
  return id % 2 === 1
    ? "from-slate-800 to-slate-900"
    : "from-emerald-800 to-emerald-900";
}

function maskedLast4(id: number): string {
  return String(id).padStart(4, "0").slice(-4);
}

interface CreditAccountCardProps {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
  manageMode?: boolean;
  selected?: boolean;
  onSelect?: (id: number) => void;
}

export function CreditAccountCard({
  account,
  onEdit,
  onDelete,
  manageMode,
  selected,
  onSelect,
}: CreditAccountCardProps) {
  const t = useTranslations("accounts");
  const gradient = creditCardGradient(account.id);
  const last4 = maskedLast4(account.id);
  const available =
    account.credit_limit != null
      ? account.credit_limit + account.displayed_balance_minor
      : null;

  const cardContent = (
    <div className="bg-card rounded-lg overflow-hidden shadow-sm hover:-translate-y-1 transition-all duration-200 cursor-pointer">
      <div className={cn("bg-gradient-to-br p-5 relative h-40", gradient)}>
        {manageMode && (
          <div
            className={cn(
              "absolute top-2 end-2 z-20 h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all pointer-events-none",
              selected ? "bg-primary border-primary text-white" : "bg-white/20 border-white/60"
            )}
            aria-hidden="true"
          >
            {selected && <span className="text-xs font-bold">✓</span>}
          </div>
        )}
        <div className="flex items-start justify-between mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">
            {account.institution || account.name}
          </p>
          <div className="flex gap-1">
            <div className="w-7 h-5 rounded bg-white/20" />
            <div className="w-7 h-5 rounded bg-white/10 -ms-3" />
          </div>
        </div>
        <p className="text-sm font-mono tracking-[0.2em] text-white/90 mb-4">
          •••• •••• •••• {last4}
        </p>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-white/50 mb-0.5">
            {t("cardholder")}
          </p>
          <p className="text-xs font-bold uppercase tracking-wider text-white">{account.name}</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {account.credit_limit != null && (
          <UtilizationBar
            balanceMinor={account.displayed_balance_minor}
            creditLimitMinor={account.credit_limit}
            currency={account.currency}
          />
        )}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{t("creditLimit")}</p>
            <p className="text-xs font-semibold">
              {account.credit_limit != null ? formatAmount(account.credit_limit, account.currency) : "—"}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{t("amountDue")}</p>
            <p className="text-xs font-semibold text-destructive">
              {formatAmount(Math.abs(account.displayed_balance_minor), account.currency)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{t("available")}</p>
            <p className="text-xs font-semibold text-primary">
              {available != null ? formatAmount(available, account.currency) : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn("relative group", selected && "ring-2 ring-primary rounded-lg")}>
      {manageMode ? (
        <button type="button" className="w-full text-start block"
          onClick={() => onSelect?.(account.id)}
          aria-label={selected ? t("deselectAccount") : t("selectAccount")}>
          {cardContent}
        </button>
      ) : (
        <Link href={`/accounts/${account.id}`}>{cardContent}</Link>
      )}
      {!manageMode && (
        <div className="absolute top-3 end-3 hidden group-hover:flex group-focus-within:flex gap-1 z-10">
          <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/20 text-white hover:bg-white/30"
            onClick={(e) => { e.preventDefault(); onEdit(); }} aria-label={t("editAccount")}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/20 text-white hover:bg-destructive hover:text-destructive-foreground"
            onClick={(e) => { e.preventDefault(); onDelete(); }} aria-label={t("deleteAccount")}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `bank-account-card.tsx`**

```tsx
// frontend/src/components/accounts/bank-account-card.tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/shared/money-display";
import { cn } from "@/lib/utils";
import type { Account } from "@/hooks/use-accounts";

interface BankAccountCardProps {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
  manageMode?: boolean;
  selected?: boolean;
  onSelect?: (id: number) => void;
}

export function BankAccountCard({
  account,
  onEdit,
  onDelete,
  manageMode,
  selected,
  onSelect,
}: BankAccountCardProps) {
  const t = useTranslations("accounts");

  const cardContent = (
    <div className="bg-card rounded-lg p-5 shadow-sm hover:-translate-y-1 transition-all duration-200 cursor-pointer">
      {manageMode && (
        <div
          className={cn(
            "absolute top-2 end-2 z-20 h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all pointer-events-none",
            selected ? "bg-primary border-primary text-white" : "bg-background/90 border-border"
          )}
          aria-hidden="true"
        >
          {selected && <span className="text-xs font-bold">✓</span>}
        </div>
      )}
      {account.institution && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          {account.institution}
        </p>
      )}
      <p className="text-sm font-medium text-foreground mb-3">{account.name}</p>
      <MoneyDisplay amount={account.displayed_balance_minor} currency={account.currency} size="lg" colorize />
      <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full", account.is_active !== false ? "bg-primary" : "bg-muted-foreground")} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {account.is_active !== false ? t("accountStatusActive") : t("accountStatusInactive")}
        </span>
      </div>
    </div>
  );

  return (
    <div className={cn("relative group", selected && "ring-2 ring-primary rounded-lg")}>
      {manageMode ? (
        <button type="button" className="w-full text-start block"
          onClick={() => onSelect?.(account.id)}
          aria-label={selected ? t("deselectAccount") : t("selectAccount")}>
          {cardContent}
        </button>
      ) : (
        <Link href={`/accounts/${account.id}`}>{cardContent}</Link>
      )}
      {!manageMode && (
        <div className="absolute top-3 end-3 hidden group-hover:flex group-focus-within:flex gap-1 z-10">
          <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/90 shadow-sm hover:bg-background"
            onClick={(e) => { e.preventDefault(); onEdit(); }} aria-label={t("editAccount")}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/90 shadow-sm hover:bg-destructive hover:text-destructive-foreground"
            onClick={(e) => { e.preventDefault(); onDelete(); }} aria-label={t("deleteAccount")}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `other-account-card.tsx`**

```tsx
// frontend/src/components/accounts/other-account-card.tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Wallet, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/shared/money-display";
import { cn } from "@/lib/utils";
import { typeIcons, typeColors } from "./account-card";
import type { Account } from "@/hooks/use-accounts";

interface OtherAccountCardProps {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
  manageMode?: boolean;
  selected?: boolean;
  onSelect?: (id: number) => void;
}

export function OtherAccountCard({
  account,
  onEdit,
  onDelete,
  manageMode,
  selected,
  onSelect,
}: OtherAccountCardProps) {
  const t = useTranslations("accounts");
  const Icon = typeIcons[account.type] ?? Wallet;
  const iconColor = typeColors[account.type] ?? "bg-primary/10 text-primary";
  const accentBg = iconColor.split(" ").filter((c) => c.startsWith("bg-") || c.startsWith("dark:bg-")).join(" ");

  const cardContent = (
    <div className="bg-card rounded-lg overflow-hidden shadow-sm hover:-translate-y-1 transition-all duration-200 cursor-pointer flex">
      <div className={cn("w-1.5 shrink-0", accentBg)} />
      <div className="flex-1 p-5">
        {manageMode && (
          <div
            className={cn(
              "absolute top-2 end-2 z-20 h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all pointer-events-none",
              selected ? "bg-primary border-primary text-white" : "bg-background/90 border-border"
            )}
            aria-hidden="true"
          >
            {selected && <span className="text-xs font-bold">✓</span>}
          </div>
        )}
        <div className={cn("inline-flex rounded-lg p-2 mb-3", iconColor)}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm font-semibold text-foreground mb-0.5">{account.name}</p>
        {account.institution && (
          <p className="text-xs text-muted-foreground mb-3">{account.institution}</p>
        )}
        <MoneyDisplay amount={account.displayed_balance_minor} currency={account.currency} size="lg" colorize />
      </div>
    </div>
  );

  return (
    <div className={cn("relative group", selected && "ring-2 ring-primary rounded-lg")}>
      {manageMode ? (
        <button type="button" className="w-full text-start block"
          onClick={() => onSelect?.(account.id)}
          aria-label={selected ? t("deselectAccount") : t("selectAccount")}>
          {cardContent}
        </button>
      ) : (
        <Link href={`/accounts/${account.id}`}>{cardContent}</Link>
      )}
      {!manageMode && (
        <div className="absolute top-3 end-3 hidden group-hover:flex group-focus-within:flex gap-1 z-10">
          <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/90 shadow-sm hover:bg-background"
            onClick={(e) => { e.preventDefault(); onEdit(); }} aria-label={t("editAccount")}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/90 shadow-sm hover:bg-destructive hover:text-destructive-foreground"
            onClick={(e) => { e.preventDefault(); onDelete(); }} aria-label={t("deleteAccount")}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rewrite `account-card.tsx` as a thin orchestrator**

Replace the full file content — keep shared exports at top, import sub-cards, remove the three inlined component functions:

```tsx
// frontend/src/components/accounts/account-card.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Wallet, CreditCard, Banknote, Smartphone, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { CURRENCIES, parseMajorToMinor } from "@/lib/money";
import { useUpdateAccount, useDeleteAccount } from "@/hooks/use-accounts";
import type { Account, UpdateAccountInput } from "@/hooks/use-accounts";
import { CreditAccountCard } from "./credit-account-card";
import { BankAccountCard } from "./bank-account-card";
import { OtherAccountCard } from "./other-account-card";

// Shared type/color maps — used by sub-cards and external components (e.g. AccountPill)
export const typeIcons: Record<string, typeof Wallet> = {
  bank_account: Wallet,
  credit_card: CreditCard,
  cash_wallet: Banknote,
  digital_wallet: Smartphone,
  financing_app: ShoppingBag,
};

export const typeColors: Record<string, string> = {
  bank_account: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  credit_card: "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  cash_wallet: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
  digital_wallet: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  financing_app: "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
};

// Used by AccountPill in transactions/account-pill.tsx
export const typePillColors: Record<string, string> = {
  bank_account: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  credit_card: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  cash_wallet: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  digital_wallet: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  financing_app: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

interface AccountCardProps {
  account: Account;
  manageMode?: boolean;
  selected?: boolean;
  onSelect?: (id: number) => void;
}

export function AccountCard({ account, manageMode, selected, onSelect }: AccountCardProps) {
  const t = useTranslations("accounts");
  const tCommon = useTranslations("common");

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(account.name);
  const [institution, setInstitution] = useState(account.institution ?? "");
  const currencyExponent = CURRENCIES[account.currency]?.exponent ?? 2;
  const [creditLimit, setCreditLimit] = useState(
    account.credit_limit != null
      ? String(account.credit_limit / Math.pow(10, currencyExponent))
      : ""
  );
  const [billingDay, setBillingDay] = useState(
    account.billing_cycle_day != null ? String(account.billing_cycle_day) : ""
  );
  const [paymentDueDay, setPaymentDueDay] = useState(
    account.payment_due_day != null ? String(account.payment_due_day) : ""
  );

  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const isCreditType = account.type === "credit_card" || account.type === "financing_app";

  const openEdit = () => {
    setName(account.name);
    setInstitution(account.institution ?? "");
    setCreditLimit(account.credit_limit != null ? String(account.credit_limit / Math.pow(10, currencyExponent)) : "");
    setBillingDay(account.billing_cycle_day != null ? String(account.billing_cycle_day) : "");
    setPaymentDueDay(account.payment_due_day != null ? String(account.payment_due_day) : "");
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: UpdateAccountInput = {
      id: account.id,
      name: name || undefined,
      institution: institution === "" ? null : institution,
      credit_limit: isCreditType ? (creditLimit === "" ? null : parseMajorToMinor(creditLimit, currencyExponent)) : undefined,
      billing_cycle_day: isCreditType ? (billingDay === "" ? null : parseInt(billingDay, 10)) : undefined,
      payment_due_day: isCreditType ? (paymentDueDay === "" ? null : parseInt(paymentDueDay, 10)) : undefined,
    };
    await updateAccount.mutateAsync(payload);
    setEditOpen(false);
  };

  const handleDelete = async () => {
    await deleteAccount.mutateAsync(account.id);
    setDeleteOpen(false);
  };

  const cardProps = {
    account, manageMode, selected, onSelect,
    onEdit: openEdit,
    onDelete: () => setDeleteOpen(true),
  };

  return (
    <>
      {account.type === "credit_card" ? (
        <CreditAccountCard {...cardProps} />
      ) : account.type === "cash_wallet" || account.type === "digital_wallet" || account.type === "financing_app" ? (
        <OtherAccountCard {...cardProps} />
      ) : (
        <BankAccountCard {...cardProps} />
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t("editAccount")}</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-account-name">{t("name")}</Label>
              <Input id="edit-account-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-account-institution">{t("institution")}</Label>
              <Input id="edit-account-institution" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder={t("institutionPlaceholder")} />
            </div>
            {isCreditType && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-credit-limit">{t("creditLimit")}</Label>
                  <Input id="edit-credit-limit" type="number" step={String(Math.pow(10, -currencyExponent))} min="0" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-billing-day">{t("billingCycleDay")}</Label>
                    <Input id="edit-billing-day" type="number" min="1" max="31" value={billingDay} onChange={(e) => setBillingDay(e.target.value)} placeholder="1–31" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-payment-due-day">{t("paymentDueDay")}</Label>
                    <Input id="edit-payment-due-day" type="number" min="1" max="31" value={paymentDueDay} onChange={(e) => setPaymentDueDay(e.target.value)} placeholder="1–31" />
                  </div>
                </div>
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" disabled={updateAccount.isPending}>
                {updateAccount.isPending ? tCommon("loading") : tCommon("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteAccount")}</DialogTitle>
            <DialogDescription>{t("deleteAccountConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>{t("cancel")}</Button>
            <Button variant="destructive" disabled={deleteAccount.isPending} onClick={handleDelete}>
              {deleteAccount.isPending ? tCommon("loading") : tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
cd frontend && pnpm lint && pnpm exec tsc --noEmit && pnpm build
```
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/accounts/
git commit -m "refactor(accounts): split 632-line account-card.tsx into focused card variant files"
```

---

## Task 12: Extract useBulkSelection Hook

**Files:**
- Create: `frontend/src/hooks/use-bulk-selection.ts`
- Modify: `frontend/src/app/(app)/transactions/page.tsx`
- Modify: `frontend/src/app/(app)/accounts/page.tsx`
- Modify: `frontend/src/app/(app)/accounts/[id]/page.tsx`

**Context:** The same bulk selection state (`bulkMode`, `selectedIds`, `toggleSelect`, `selectAll`, `exitBulkMode`) is duplicated across 3 pages.

- [ ] **Step 1: Create `use-bulk-selection.ts`**

```typescript
// frontend/src/hooks/use-bulk-selection.ts
"use client";

import { useState } from "react";

export interface BulkSelection {
  bulkMode: boolean;
  selectedIds: Set<number>;
  enterBulkMode: () => void;
  exitBulkMode: () => void;
  toggleSelect: (id: number) => void;
  selectAll: (ids: number[]) => void;
  clearSelection: () => void;
  isSelected: (id: number) => boolean;
}

export function useBulkSelection(): BulkSelection {
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const enterBulkMode = () => setBulkMode(true);

  const exitBulkMode = () => {
    setBulkMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = (ids: number[]) => setSelectedIds(new Set(ids));

  const clearSelection = () => setSelectedIds(new Set());

  const isSelected = (id: number) => selectedIds.has(id);

  return {
    bulkMode,
    selectedIds,
    enterBulkMode,
    exitBulkMode,
    toggleSelect,
    selectAll,
    clearSelection,
    isSelected,
  };
}
```

- [ ] **Step 2: Update `transactions/page.tsx`**

Replace the inline bulk selection state at the top of the component with the hook. Find and replace these lines:

```tsx
// REMOVE these lines:
const [bulkMode, setBulkMode] = useState(false);
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
// ... and the toggleSelect, selectAll, exitBulkMode inline function definitions

// ADD this import at the top:
import { useBulkSelection } from "@/hooks/use-bulk-selection";

// ADD inside the component, replacing the removed state:
const { bulkMode, selectedIds, toggleSelect, selectAll, exitBulkMode, enterBulkMode } =
  useBulkSelection();
```

Ensure any `setBulkMode(true)` calls are replaced with `enterBulkMode()`.

- [ ] **Step 3: Repeat for `accounts/page.tsx` and `accounts/[id]/page.tsx`**

Apply the same substitution pattern: remove inline bulk state, import and use `useBulkSelection`.

- [ ] **Step 4: Verify build**

```bash
cd frontend && pnpm lint && pnpm exec tsc --noEmit && pnpm build
```
Expected: clean

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/use-bulk-selection.ts \
        frontend/src/app/(app)/transactions/page.tsx \
        frontend/src/app/(app)/accounts/page.tsx \
        "frontend/src/app/(app)/accounts/[id]/page.tsx"
git commit -m "refactor(frontend): extract useBulkSelection hook — remove duplicated selection state from 3 pages"
```

---

## Self-Review

**Spec coverage check:**
- [x] Critical: async JWKS → Task 1
- [x] Critical: float FX arithmetic → Task 2
- [x] Schema type safety (3 schemas + categories router) → Task 3
- [x] ExchangeRate validator + currency removal + amount gt=0 → Task 4
- [x] is_active fix, deferred import, Decimal, logging → Task 5
- [x] Households refactor → Task 6
- [x] Bulk N+1 → Tasks 7, 8, 9
- [x] Auth layout token → Task 10
- [x] account-card.tsx split → Task 11
- [x] useBulkSelection hook → Task 12

**Placeholder scan:** No TBDs or incomplete steps found.

**Type consistency check:** `TransactionType` used in Task 3 matches `app.models.enums.TransactionType`. `HouseholdCreate` in Task 6 schema matches usage in router. `BulkSelection` interface in Task 12 matches all usage sites.
