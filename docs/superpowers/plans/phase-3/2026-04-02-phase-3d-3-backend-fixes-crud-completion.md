# Phase 3D-3: Backend Fixes + CRUD Completion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close five audit gaps in the Debts & Installments module — add FX conversion for person balances, role-based access controls for P2P operations, a full installment form, edit mode on all forms, and delete UI with confirmation dialogs.

**Architecture:** Backend changes are isolated service-layer additions (FX helper, RBAC dependency) wired into existing routers. Frontend changes follow the established FormSheet + useState + useApiMutation pattern. Each gap is independent — tasks can be executed sequentially without cross-gap coupling.

**Tech Stack:** Python 3.12 / FastAPI / async SQLAlchemy / Pydantic V2 / pytest-asyncio (backend) · Next.js / TypeScript strict / shadcn/ui base-nova / Tailwind v4 / TanStack Query / next-intl (frontend)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `backend/app/services/fx.py` | FX conversion helper — query exchange_rates, convert minor units between currencies via USD hub |
| Modify | `backend/app/services/person.py` | Wire FX helper into `compute_person_balances()` to populate `total_base_minor`, `base_currency`, `fx_warnings` |
| Create | `backend/tests/services/test_fx.py` | Unit tests for FX conversion helper |
| Create | `backend/tests/services/test_person_balances_fx.py` | Integration tests for person balances with FX conversion |
| Create | `backend/app/dependencies_rbac.py` | `get_member_role()` dependency + `require_role()` guard factory |
| Modify | `backend/app/routers/debts.py` | Add role guards to P2P debt endpoints (child blocked, viewer read-only) |
| Modify | `backend/app/routers/persons.py` | Add role guards to person CUD endpoints (child blocked, viewer read-only) |
| Create | `backend/tests/routers/test_rbac_debts.py` | Tests for RBAC on debt endpoints |
| Create | `backend/tests/routers/test_rbac_persons.py` | Tests for RBAC on person endpoints |
| Modify | `frontend/src/components/debts/installment-form.tsx` | Replace stub with full installment creation/edit form |
| Modify | `frontend/src/components/debts/bank-loan-form.tsx` | Add edit mode (accept `initialData` prop, pre-fill, call update mutation) |
| Modify | `frontend/src/components/debts/p2p-debt-form.tsx` | Add edit mode |
| Modify | `frontend/src/components/debts/person-form.tsx` | Add edit mode |
| Create | `frontend/src/components/shared/delete-confirmation.tsx` | Reusable AlertDialog-based delete confirmation component |
| Modify | `frontend/messages/en.json` | Add i18n keys for installment form, edit mode, delete confirmation |
| Modify | `frontend/messages/ar.json` | Arabic translations for all new keys |

---

## Task 1: FX Conversion Helper — Tests

**Files:**
- Create: `backend/app/services/fx.py`
- Create: `backend/tests/services/test_fx.py`

### Context

Exchange rates live in the `exchange_rates` table. Each row has `from_currency` (always `"USD"` — the hub), `to_currency`, and `rate_scaled` (the rate × 10,000 as an integer). Example: if 1 USD = 48.50 EGP, the row is `from_currency="USD", to_currency="EGP", rate_scaled=485000`.

To convert an amount from currency A to currency B via USD:
1. A → USD: `amount_a_minor * 10_000 / rate_scaled_usd_to_a`
2. USD → B: `amount_usd * rate_scaled_usd_to_b / 10_000`

When A is already USD, skip step 1. When B is USD, skip step 2. When A == B, return as-is.

The household's `base_currency` comes from `Household.base_currency` (String(3), default `"EGP"`).

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/services/test_fx.py`:

```python
"""Tests for FX conversion helper."""
import datetime as dt
import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ExchangeRate, Household, HouseholdMember
from app.models.enums import HouseholdRole
from app.services.fx import convert_to_base, get_latest_rates

TEST_HOUSEHOLD_ID = uuid.uuid4()
TEST_USER_ID = uuid.uuid4()


async def _seed_household(session: AsyncSession, base_currency: str = "EGP") -> None:
    """Seed a household + member with the given base_currency."""
    household = Household(
        id=TEST_HOUSEHOLD_ID,
        name="Test Household",
        base_currency=base_currency,
    )
    session.add(household)
    member = HouseholdMember(
        household_id=TEST_HOUSEHOLD_ID,
        user_id=TEST_USER_ID,
        role=HouseholdRole.ADMIN,
        display_name="Tester",
    )
    session.add(member)
    await session.flush()


async def _seed_rates(session: AsyncSession) -> None:
    """Seed exchange rates: USD→EGP=48.50, USD→GBP=0.79, USD→KWD=0.307."""
    today = dt.date.today()
    rates = [
        ExchangeRate(
            date=today,
            from_currency="USD",
            to_currency="EGP",
            rate_scaled=485000,  # 48.50
            source="test",
        ),
        ExchangeRate(
            date=today,
            from_currency="USD",
            to_currency="GBP",
            rate_scaled=7900,  # 0.79
            source="test",
        ),
        ExchangeRate(
            date=today,
            from_currency="USD",
            to_currency="KWD",
            rate_scaled=3070,  # 0.307
            source="test",
        ),
    ]
    session.add_all(rates)
    await session.flush()


@pytest.mark.asyncio
async def test_get_latest_rates_returns_most_recent(db_session: AsyncSession) -> None:
    """get_latest_rates returns the most recent rate per currency pair."""
    today = dt.date.today()
    yesterday = today - dt.timedelta(days=1)
    # Old rate
    db_session.add(
        ExchangeRate(
            date=yesterday,
            from_currency="USD",
            to_currency="EGP",
            rate_scaled=480000,
            source="test",
        )
    )
    # New rate
    db_session.add(
        ExchangeRate(
            date=today,
            from_currency="USD",
            to_currency="EGP",
            rate_scaled=485000,
            source="test",
        )
    )
    await db_session.flush()

    rates = await get_latest_rates(db_session, currencies={"EGP"})
    assert rates["EGP"] == 485000


@pytest.mark.asyncio
async def test_get_latest_rates_missing_currency(db_session: AsyncSession) -> None:
    """get_latest_rates omits currencies with no rate row."""
    rates = await get_latest_rates(db_session, currencies={"EGP", "JPY"})
    assert "EGP" not in rates
    assert "JPY" not in rates


@pytest.mark.asyncio
async def test_convert_same_currency(db_session: AsyncSession) -> None:
    """Converting to the same currency returns the amount unchanged."""
    result = await convert_to_base(
        session=db_session,
        balances={"EGP": 100_000},
        base_currency="EGP",
    )
    assert result.total_base_minor == 100_000
    assert result.fx_warnings == []


@pytest.mark.asyncio
async def test_convert_egp_to_egp_base(db_session: AsyncSession) -> None:
    """When base is EGP and balance is EGP, total equals the balance."""
    await _seed_rates(db_session)
    result = await convert_to_base(
        session=db_session,
        balances={"EGP": 500_000},
        base_currency="EGP",
    )
    assert result.total_base_minor == 500_000
    assert result.fx_warnings == []


@pytest.mark.asyncio
async def test_convert_gbp_to_egp_base(db_session: AsyncSession) -> None:
    """Convert GBP balance to EGP base via USD hub.

    GBP→USD: 10_000 (100.00 GBP) * 10_000 / 7_900 = 12_658 (≈126.58 USD minor)
    USD→EGP: 12_658 * 485_000 / 10_000 = 613_913 (≈6,139.13 EGP)
    """
    await _seed_rates(db_session)
    result = await convert_to_base(
        session=db_session,
        balances={"GBP": 10_000},
        base_currency="EGP",
    )
    # GBP 100.00 ≈ USD 126.58 ≈ EGP 6,139.13
    expected = 10_000 * 10_000 // 7_900 * 485_000 // 10_000
    assert result.total_base_minor == expected
    assert result.fx_warnings == []


@pytest.mark.asyncio
async def test_convert_usd_to_egp_base(db_session: AsyncSession) -> None:
    """Convert USD balance to EGP base (single hop, no from-currency lookup needed)."""
    await _seed_rates(db_session)
    result = await convert_to_base(
        session=db_session,
        balances={"USD": 10_000},
        base_currency="EGP",
    )
    # USD 100.00 → EGP: 10_000 * 485_000 / 10_000 = 485_000
    assert result.total_base_minor == 485_000
    assert result.fx_warnings == []


@pytest.mark.asyncio
async def test_convert_multi_currency(db_session: AsyncSession) -> None:
    """Multiple currencies are summed after conversion."""
    await _seed_rates(db_session)
    result = await convert_to_base(
        session=db_session,
        balances={"EGP": 100_000, "USD": 10_000},
        base_currency="EGP",
    )
    # EGP 100_000 (same currency) + USD 10_000 → 485_000
    assert result.total_base_minor == 100_000 + 485_000
    assert result.fx_warnings == []


@pytest.mark.asyncio
async def test_convert_missing_rate_adds_warning(db_session: AsyncSession) -> None:
    """Currencies without exchange rates are skipped and added to fx_warnings."""
    await _seed_rates(db_session)
    result = await convert_to_base(
        session=db_session,
        balances={"JPY": 500_000},
        base_currency="EGP",
    )
    assert result.total_base_minor == 0
    assert "JPY" in result.fx_warnings


@pytest.mark.asyncio
async def test_convert_to_usd_base(db_session: AsyncSession) -> None:
    """When base is USD, EGP→USD is a single hop."""
    await _seed_rates(db_session)
    result = await convert_to_base(
        session=db_session,
        balances={"EGP": 485_000},
        base_currency="USD",
    )
    # EGP→USD: 485_000 * 10_000 / 485_000 = 10_000
    assert result.total_base_minor == 10_000
    assert result.fx_warnings == []


@pytest.mark.asyncio
async def test_convert_negative_balance(db_session: AsyncSession) -> None:
    """Negative balances (you owe them) convert correctly."""
    await _seed_rates(db_session)
    result = await convert_to_base(
        session=db_session,
        balances={"USD": -10_000},
        base_currency="EGP",
    )
    assert result.total_base_minor == -485_000
    assert result.fx_warnings == []


@pytest.mark.asyncio
async def test_convert_empty_balances(db_session: AsyncSession) -> None:
    """Empty balances dict returns zero."""
    result = await convert_to_base(
        session=db_session,
        balances={},
        base_currency="EGP",
    )
    assert result.total_base_minor == 0
    assert result.fx_warnings == []
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && uv run pytest tests/services/test_fx.py -v 2>&1 | head -40
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.fx'`

- [ ] **Step 3: Commit the failing tests**

```bash
cd backend && git add tests/services/test_fx.py
git commit -m "test(fx): add failing tests for FX conversion helper"
```

---

## Task 2: FX Conversion Helper — Implementation

**Files:**
- Create: `backend/app/services/fx.py`
- Modify: `backend/app/services/person.py`
- Create: `backend/tests/services/test_person_balances_fx.py`

### Context

The `ExchangeRate` model (in `backend/app/models/exchange_rate.py`) has:
- `date: Date` — the rate date
- `from_currency: Text` — always `"USD"` (hub currency)
- `to_currency: Text` — e.g. `"EGP"`, `"GBP"`
- `rate_scaled: BigInteger` — rate × 10,000 as integer

The `Household` model (in `backend/app/models/household.py`) has:
- `base_currency: String(3)` — default `"EGP"`

The `PersonBalances` schema (in `backend/app/schemas/person.py`) already has:
- `by_currency: dict[str, int]` — per-currency net minor balances
- `total_base_minor: int = 0` — needs to be populated
- `base_currency: str = "EGP"` — needs to be set from Household
- `fx_warnings: list[str] = []` — currencies with no available rate

- [ ] **Step 4: Implement the FX helper**

Create `backend/app/services/fx.py`:

```python
"""Foreign exchange conversion via USD hub currency.

Exchange rates are stored as USD → target with rate × 10,000 scaling.
All conversions route through USD: Source → USD → Target.
"""
from dataclasses import dataclass

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exchange_rate import ExchangeRate

RATE_SCALE = 10_000


@dataclass
class FXResult:
    """Result of converting multiple currency balances to a single base currency."""

    total_base_minor: int
    base_currency: str
    fx_warnings: list[str]


async def get_latest_rates(
    session: AsyncSession,
    currencies: set[str],
) -> dict[str, int]:
    """Fetch the most recent rate_scaled for each currency in the set.

    Returns a dict mapping to_currency → rate_scaled (USD → to_currency).
    Currencies not found in the exchange_rates table are omitted.
    """
    if not currencies:
        return {}

    # Subquery: max date per (from_currency, to_currency)
    max_date_sq = (
        select(
            ExchangeRate.to_currency,
            func.max(ExchangeRate.date).label("max_date"),
        )
        .where(
            ExchangeRate.from_currency == "USD",
            ExchangeRate.to_currency.in_(currencies),
        )
        .group_by(ExchangeRate.to_currency)
        .subquery()
    )

    q = (
        select(ExchangeRate.to_currency, ExchangeRate.rate_scaled)
        .join(
            max_date_sq,
            (ExchangeRate.to_currency == max_date_sq.c.to_currency)
            & (ExchangeRate.date == max_date_sq.c.max_date),
        )
        .where(
            ExchangeRate.from_currency == "USD",
            ExchangeRate.to_currency.in_(currencies),
        )
    )

    rows = (await session.execute(q)).all()
    return {row.to_currency: row.rate_scaled for row in rows}


async def convert_to_base(
    session: AsyncSession,
    balances: dict[str, int],
    base_currency: str,
) -> FXResult:
    """Convert per-currency minor-unit balances to a single base currency.

    Conversion path via USD hub:
      - Same currency → pass through
      - Source → USD: amount * RATE_SCALE / rate_scaled[source]
      - USD → Base: amount * rate_scaled[base] / RATE_SCALE
      - Source == USD → skip first hop
      - Base == USD → skip second hop

    Uses integer arithmetic only. Rounding happens via floor division (//).
    """
    if not balances:
        return FXResult(total_base_minor=0, base_currency=base_currency, fx_warnings=[])

    # Collect all non-base currencies that need FX lookup, plus base if it's not USD
    currencies_needed: set[str] = set()
    for currency in balances:
        if currency != base_currency:
            if currency != "USD":
                currencies_needed.add(currency)
            if base_currency != "USD":
                currencies_needed.add(base_currency)

    rates = await get_latest_rates(session, currencies_needed) if currencies_needed else {}

    total = 0
    warnings: list[str] = []

    for currency, amount_minor in balances.items():
        if currency == base_currency:
            total += amount_minor
            continue

        # Step 1: convert source currency to USD
        if currency == "USD":
            usd_minor = amount_minor
        else:
            source_rate = rates.get(currency)
            if source_rate is None or source_rate == 0:
                warnings.append(currency)
                continue
            usd_minor = amount_minor * RATE_SCALE // source_rate

        # Step 2: convert USD to base currency
        if base_currency == "USD":
            total += usd_minor
        else:
            base_rate = rates.get(base_currency)
            if base_rate is None or base_rate == 0:
                warnings.append(currency)
                continue
            total += usd_minor * base_rate // RATE_SCALE

    return FXResult(
        total_base_minor=total,
        base_currency=base_currency,
        fx_warnings=sorted(set(warnings)),
    )
```

- [ ] **Step 5: Run the FX tests**

```bash
cd backend && uv run pytest tests/services/test_fx.py -v
```

Expected: ALL PASS

- [ ] **Step 6: Wire FX into person balances**

Modify `backend/app/services/person.py`. The function `compute_person_balances` currently returns `PersonBalances(by_currency=by_currency)` with `total_base_minor=0`. We need to:
1. Accept `household_id` to look up the household's `base_currency`
2. Call `convert_to_base()` with the `by_currency` dict
3. Populate `total_base_minor`, `base_currency`, and `fx_warnings`

Add these imports at the top of `backend/app/services/person.py`:

```python
from app.models.household import Household
from app.services.fx import convert_to_base
```

Then replace the final `return PersonBalances(by_currency=by_currency)` at the end of `compute_person_balances()` with:

```python
    # Look up household base currency
    hh_row = await session.execute(
        select(Household.base_currency).where(Household.id == household_id)
    )
    base_currency = hh_row.scalar_one_or_none() or "EGP"

    # Convert per-currency balances to base currency
    fx_result = await convert_to_base(
        session=session,
        balances=by_currency,
        base_currency=base_currency,
    )

    return PersonBalances(
        by_currency=by_currency,
        total_base_minor=fx_result.total_base_minor,
        base_currency=fx_result.base_currency,
        fx_warnings=fx_result.fx_warnings,
    )
```

- [ ] **Step 7: Write integration test for person balances with FX**

Create `backend/tests/services/test_person_balances_fx.py`:

```python
"""Integration tests: person balances with FX conversion to base currency."""
import datetime as dt
import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Debt,
    ExchangeRate,
    Household,
    HouseholdMember,
    Person,
)
from app.models.enums import DebtType, HouseholdRole
from app.services.person import compute_person_balances

from tests.conftest import TEST_HOUSEHOLD_ID, TEST_USER_ID


async def _seed_household(
    session: AsyncSession, base_currency: str = "EGP"
) -> None:
    session.add(
        Household(
            id=TEST_HOUSEHOLD_ID,
            name="Test HH",
            base_currency=base_currency,
        )
    )
    session.add(
        HouseholdMember(
            household_id=TEST_HOUSEHOLD_ID,
            user_id=TEST_USER_ID,
            role=HouseholdRole.ADMIN,
            display_name="Tester",
        )
    )
    await session.flush()


async def _seed_person(session: AsyncSession) -> int:
    person = Person(
        household_id=TEST_HOUSEHOLD_ID,
        name="Ahmed",
    )
    session.add(person)
    await session.flush()
    return person.id


async def _seed_rates(session: AsyncSession) -> None:
    today = dt.date.today()
    session.add(
        ExchangeRate(
            date=today,
            from_currency="USD",
            to_currency="EGP",
            rate_scaled=485000,
            source="test",
        )
    )
    session.add(
        ExchangeRate(
            date=today,
            from_currency="USD",
            to_currency="GBP",
            rate_scaled=7900,
            source="test",
        )
    )
    await session.flush()


@pytest.mark.asyncio
async def test_single_currency_same_as_base(db_session: AsyncSession) -> None:
    """EGP balance with EGP base → total equals the balance, no FX needed."""
    await _seed_household(db_session, "EGP")
    person_id = await _seed_person(db_session)
    db_session.add(
        Debt(
            household_id=TEST_HOUSEHOLD_ID,
            type=DebtType.PERSONAL_LENT,
            name="Test",
            person_id=person_id,
            principal_minor=50_000,
            currency="EGP",
            annual_rate_bps=0,
            tenure_months=0,
            start_date=dt.date.today(),
        )
    )
    await db_session.flush()

    result = await compute_person_balances(
        db_session, TEST_HOUSEHOLD_ID, person_id
    )
    assert result.total_base_minor == 50_000
    assert result.base_currency == "EGP"
    assert result.fx_warnings == []


@pytest.mark.asyncio
async def test_multi_currency_converts_to_base(db_session: AsyncSession) -> None:
    """GBP + EGP balances converted to EGP base."""
    await _seed_household(db_session, "EGP")
    await _seed_rates(db_session)
    person_id = await _seed_person(db_session)

    # Lent 100.00 EGP
    db_session.add(
        Debt(
            household_id=TEST_HOUSEHOLD_ID,
            type=DebtType.PERSONAL_LENT,
            name="EGP debt",
            person_id=person_id,
            principal_minor=10_000,
            currency="EGP",
            annual_rate_bps=0,
            tenure_months=0,
            start_date=dt.date.today(),
        )
    )
    # Lent 100.00 GBP
    db_session.add(
        Debt(
            household_id=TEST_HOUSEHOLD_ID,
            type=DebtType.PERSONAL_LENT,
            name="GBP debt",
            person_id=person_id,
            principal_minor=10_000,
            currency="GBP",
            annual_rate_bps=0,
            tenure_months=0,
            start_date=dt.date.today(),
        )
    )
    await db_session.flush()

    result = await compute_person_balances(
        db_session, TEST_HOUSEHOLD_ID, person_id
    )

    # GBP→USD: 10_000 * 10_000 / 7_900 = 12_658
    # USD→EGP: 12_658 * 485_000 / 10_000 = 613_913
    gbp_in_egp = 10_000 * 10_000 // 7_900 * 485_000 // 10_000
    assert result.total_base_minor == 10_000 + gbp_in_egp
    assert result.base_currency == "EGP"
    assert result.fx_warnings == []


@pytest.mark.asyncio
async def test_missing_rate_adds_warning(db_session: AsyncSession) -> None:
    """Currency with no exchange rate is skipped and reported as warning."""
    await _seed_household(db_session, "EGP")
    person_id = await _seed_person(db_session)

    # Lent 100.00 JPY — no JPY rate seeded
    db_session.add(
        Debt(
            household_id=TEST_HOUSEHOLD_ID,
            type=DebtType.PERSONAL_LENT,
            name="JPY debt",
            person_id=person_id,
            principal_minor=10_000,
            currency="JPY",
            annual_rate_bps=0,
            tenure_months=0,
            start_date=dt.date.today(),
        )
    )
    await db_session.flush()

    result = await compute_person_balances(
        db_session, TEST_HOUSEHOLD_ID, person_id
    )
    assert result.total_base_minor == 0
    assert "JPY" in result.fx_warnings
```

- [ ] **Step 8: Run all person balance tests**

```bash
cd backend && uv run pytest tests/services/test_fx.py tests/services/test_person_balances_fx.py -v
```

Expected: ALL PASS

- [ ] **Step 9: Run existing person balance tests to verify no regressions**

```bash
cd backend && uv run pytest tests/services/test_person_balances.py -v
```

Expected: ALL PASS (existing tests don't seed a Household, so `base_currency` defaults to `"EGP"` via the `or "EGP"` fallback, and all existing tests use single-currency EGP balances, so `total_base_minor` equals the sum and `fx_warnings` is empty)

- [ ] **Step 10: Commit**

```bash
cd backend && git add app/services/fx.py app/services/person.py tests/services/test_fx.py tests/services/test_person_balances_fx.py
git commit -m "feat(fx): add FX conversion for person balances via USD hub

- Create app/services/fx.py with get_latest_rates() and convert_to_base()
- Wire into compute_person_balances() to populate total_base_minor, base_currency, fx_warnings
- Add comprehensive tests for FX helper and person balance integration"
```

---

## Task 3: Role-Based Access Controls — Tests

**Files:**
- Create: `backend/app/dependencies_rbac.py`
- Create: `backend/tests/routers/test_rbac_debts.py`
- Create: `backend/tests/routers/test_rbac_persons.py`

### Context

The `HouseholdRole` enum (in `backend/app/models/enums.py`) has four values: `ADMIN`, `MEMBER`, `VIEWER`, `CHILD`.

Per spec for P2P debts and persons:
- **child** role: cannot see P2P debts at all (403 on any P2P debt or person endpoint)
- **viewer** role: can read (GET) P2P debts and persons, but cannot create/update/delete (403 on POST/PUT/DELETE)
- **member** and **admin**: full access

The `HouseholdMember` model has `household_id`, `user_id`, and `role`. The test `conftest.py` overrides `get_household_id` and `get_current_user` — for RBAC tests we need to also seed actual `HouseholdMember` rows so the role lookup query finds them.

Current test fixtures in `backend/tests/conftest.py`:
- `TEST_USER_ID` — a UUID for the test user
- `TEST_HOUSEHOLD_ID` — a UUID for the test household
- `client` — `AsyncClient` with overridden dependencies
- `db_session` — direct DB session for seeding

- [ ] **Step 1: Write the RBAC dependency (needed before tests can import it)**

Create `backend/app/dependencies_rbac.py`:

```python
"""Role-based access control dependencies for FastAPI routers."""
import uuid
from collections.abc import Callable
from functools import wraps
from typing import Any

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db_session, get_household_id
from app.models.enums import HouseholdRole
from app.models.household import HouseholdMember


async def get_member_role(
    session: AsyncSession = Depends(get_db_session),
    user_id: uuid.UUID = Depends(get_current_user),
    household_id: uuid.UUID = Depends(get_household_id),
) -> HouseholdRole:
    """Resolve the current user's role within their household."""
    result = await session.execute(
        select(HouseholdMember.role).where(
            HouseholdMember.household_id == household_id,
            HouseholdMember.user_id == user_id,
        )
    )
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this household",
        )
    return role


def require_role(
    *allowed: HouseholdRole,
) -> Callable[..., Any]:
    """Dependency factory: raises 403 if the user's role is not in allowed set.

    Usage in a router:
        role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER))
    """

    async def _check(
        role: HouseholdRole = Depends(get_member_role),
    ) -> HouseholdRole:
        if role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role.value}' is not permitted for this action",
            )
        return role

    return _check
```

- [ ] **Step 2: Write failing RBAC tests for debt endpoints**

Create `backend/tests/routers/test_rbac_debts.py`:

```python
"""RBAC tests for P2P debt endpoints.

child → 403 on all P2P endpoints
viewer → 403 on POST/PUT/DELETE, 200 on GET
member/admin → full access
"""
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db_session, get_household_id
from app.main import app
from app.models import Debt, Household, HouseholdMember, Person
from app.models.enums import DebtType, HouseholdRole

HOUSEHOLD_ID = uuid.uuid4()


def _make_user_id() -> uuid.UUID:
    return uuid.uuid4()


async def _seed_member(
    session: AsyncSession,
    user_id: uuid.UUID,
    role: HouseholdRole,
) -> None:
    """Seed household + member with the given role."""
    # Only seed household once (ignore if exists)
    from sqlalchemy import select as sa_select

    existing = await session.execute(
        sa_select(Household.id).where(Household.id == HOUSEHOLD_ID)
    )
    if existing.scalar_one_or_none() is None:
        session.add(
            Household(id=HOUSEHOLD_ID, name="Test HH", base_currency="EGP")
        )
        await session.flush()

    session.add(
        HouseholdMember(
            household_id=HOUSEHOLD_ID,
            user_id=user_id,
            role=role,
            display_name=f"User-{role.value}",
        )
    )
    await session.flush()


async def _seed_p2p_debt(session: AsyncSession) -> int:
    """Seed a person + P2P debt, return debt id."""
    import datetime as dt

    person = Person(household_id=HOUSEHOLD_ID, name="Friend")
    session.add(person)
    await session.flush()

    debt = Debt(
        household_id=HOUSEHOLD_ID,
        type=DebtType.PERSONAL_LENT,
        name="Test P2P",
        person_id=person.id,
        principal_minor=10_000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=0,
        start_date=dt.date.today(),
    )
    session.add(debt)
    await session.flush()
    return debt.id


@pytest.mark.asyncio
async def test_child_cannot_list_p2p_debts(db_session: AsyncSession) -> None:
    """Child role gets 403 when listing debts filtered to P2P type."""
    user_id = _make_user_id()
    await _seed_member(db_session, user_id, HouseholdRole.CHILD)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: HOUSEHOLD_ID

    from httpx import ASGITransport

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get(
            "/api/v1/debts", params={"type": "personal_lent"}
        )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_child_cannot_create_p2p_debt(db_session: AsyncSession) -> None:
    """Child role gets 403 when creating a P2P debt."""
    user_id = _make_user_id()
    await _seed_member(db_session, user_id, HouseholdRole.CHILD)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: HOUSEHOLD_ID

    from httpx import ASGITransport

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/api/v1/debts",
            json={
                "type": "personal_lent",
                "name": "Blocked",
                "principal_minor": 1000,
                "currency": "EGP",
                "tenure_months": 0,
                "start_date": "2025-01-01",
                "person_id": 1,
            },
        )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_viewer_can_list_p2p_debts(db_session: AsyncSession) -> None:
    """Viewer role can GET P2P debts (200)."""
    user_id = _make_user_id()
    await _seed_member(db_session, user_id, HouseholdRole.VIEWER)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: HOUSEHOLD_ID

    from httpx import ASGITransport

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get(
            "/api/v1/debts", params={"type": "personal_lent"}
        )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_viewer_cannot_create_p2p_debt(db_session: AsyncSession) -> None:
    """Viewer role gets 403 when creating a P2P debt."""
    user_id = _make_user_id()
    await _seed_member(db_session, user_id, HouseholdRole.VIEWER)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: HOUSEHOLD_ID

    from httpx import ASGITransport

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/api/v1/debts",
            json={
                "type": "personal_lent",
                "name": "Blocked",
                "principal_minor": 1000,
                "currency": "EGP",
                "tenure_months": 0,
                "start_date": "2025-01-01",
                "person_id": 1,
            },
        )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_viewer_cannot_delete_debt(db_session: AsyncSession) -> None:
    """Viewer role gets 403 when deleting a debt."""
    user_id = _make_user_id()
    await _seed_member(db_session, user_id, HouseholdRole.VIEWER)
    debt_id = await _seed_p2p_debt(db_session)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: HOUSEHOLD_ID

    from httpx import ASGITransport

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.delete(f"/api/v1/debts/{debt_id}")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_member_can_create_p2p_debt(db_session: AsyncSession) -> None:
    """Member role can create P2P debts (not 403)."""
    user_id = _make_user_id()
    await _seed_member(db_session, user_id, HouseholdRole.MEMBER)
    person = Person(household_id=HOUSEHOLD_ID, name="Target")
    db_session.add(person)
    await db_session.flush()
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: HOUSEHOLD_ID

    from httpx import ASGITransport

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/api/v1/debts",
            json={
                "type": "personal_lent",
                "name": "Allowed",
                "principal_minor": 1000,
                "currency": "EGP",
                "tenure_months": 0,
                "start_date": "2025-01-01",
                "person_id": person.id,
            },
        )
    assert resp.status_code in (201, 200)
```

- [ ] **Step 3: Write failing RBAC tests for person endpoints**

Create `backend/tests/routers/test_rbac_persons.py`:

```python
"""RBAC tests for person endpoints.

child → 403 on all person endpoints
viewer → 403 on POST/PUT/DELETE, 200 on GET
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_household_id
from app.main import app
from app.models import Household, HouseholdMember, Person
from app.models.enums import HouseholdRole

HOUSEHOLD_ID = uuid.uuid4()


async def _seed_member(
    session: AsyncSession, user_id: uuid.UUID, role: HouseholdRole
) -> None:
    from sqlalchemy import select as sa_select

    existing = await session.execute(
        sa_select(Household.id).where(Household.id == HOUSEHOLD_ID)
    )
    if existing.scalar_one_or_none() is None:
        session.add(Household(id=HOUSEHOLD_ID, name="Test HH", base_currency="EGP"))
        await session.flush()

    session.add(
        HouseholdMember(
            household_id=HOUSEHOLD_ID,
            user_id=user_id,
            role=role,
            display_name=f"User-{role.value}",
        )
    )
    await session.flush()


@pytest.mark.asyncio
async def test_child_cannot_list_persons(db_session: AsyncSession) -> None:
    user_id = uuid.uuid4()
    await _seed_member(db_session, user_id, HouseholdRole.CHILD)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: HOUSEHOLD_ID

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/v1/persons")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_child_cannot_create_person(db_session: AsyncSession) -> None:
    user_id = uuid.uuid4()
    await _seed_member(db_session, user_id, HouseholdRole.CHILD)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: HOUSEHOLD_ID

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/api/v1/persons", json={"name": "Blocked"}
        )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_viewer_can_list_persons(db_session: AsyncSession) -> None:
    user_id = uuid.uuid4()
    await _seed_member(db_session, user_id, HouseholdRole.VIEWER)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: HOUSEHOLD_ID

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/v1/persons")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_viewer_cannot_create_person(db_session: AsyncSession) -> None:
    user_id = uuid.uuid4()
    await _seed_member(db_session, user_id, HouseholdRole.VIEWER)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: HOUSEHOLD_ID

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/api/v1/persons", json={"name": "Blocked"}
        )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_viewer_cannot_delete_person(db_session: AsyncSession) -> None:
    user_id = uuid.uuid4()
    await _seed_member(db_session, user_id, HouseholdRole.VIEWER)
    person = Person(household_id=HOUSEHOLD_ID, name="Target")
    db_session.add(person)
    await db_session.flush()
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: HOUSEHOLD_ID

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.delete(f"/api/v1/persons/{person.id}")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_member_can_create_person(db_session: AsyncSession) -> None:
    user_id = uuid.uuid4()
    await _seed_member(db_session, user_id, HouseholdRole.MEMBER)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_household_id] = lambda: HOUSEHOLD_ID

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/api/v1/persons", json={"name": "Allowed"}
        )
    assert resp.status_code in (200, 201)
```

- [ ] **Step 4: Run RBAC tests to verify they fail**

```bash
cd backend && uv run pytest tests/routers/test_rbac_debts.py tests/routers/test_rbac_persons.py -v 2>&1 | head -50
```

Expected: FAIL — child/viewer tests expect 403 but get 200 (no role checks yet in routers)

- [ ] **Step 5: Commit the failing tests**

```bash
cd backend && git add app/dependencies_rbac.py tests/routers/test_rbac_debts.py tests/routers/test_rbac_persons.py
git commit -m "test(rbac): add failing tests for P2P role-based access controls"
```

---

## Task 4: Role-Based Access Controls — Implementation

**Files:**
- Modify: `backend/app/routers/debts.py`
- Modify: `backend/app/routers/persons.py`

### Context

The `debts.py` router has these P2P-relevant endpoints that need guards:
- `GET /api/v1/debts` — when `type` param is `personal_lent` or `personal_borrowed`, child blocked
- `POST /api/v1/debts` — when body `type` is P2P, child blocked + viewer blocked
- `PUT /api/v1/debts/{debt_id}` — viewer blocked (for P2P debts)
- `DELETE /api/v1/debts/{debt_id}` — viewer blocked (for P2P debts)

The `persons.py` router:
- `GET /api/v1/persons` — child blocked
- `GET /api/v1/persons/{person_id}` — child blocked
- `POST /api/v1/persons` — child blocked + viewer blocked
- `PUT /api/v1/persons/{person_id}` — child blocked + viewer blocked
- `DELETE /api/v1/persons/{person_id}` — child blocked + viewer blocked

Strategy: Add `role: HouseholdRole = Depends(get_member_role)` to each endpoint, then check role inline. This is simpler than the `require_role()` factory for endpoints where the check depends on request data (e.g., debt type).

- [ ] **Step 6: Add role guards to the persons router**

In `backend/app/routers/persons.py`, add these imports at the top:

```python
from app.dependencies_rbac import get_member_role
from app.models.enums import HouseholdRole
```

Then add `role: HouseholdRole = Depends(get_member_role)` as a parameter to each endpoint function, and add role checks at the top of each function body:

For the **GET** endpoints (`list_persons` and `get_person`), add:

```python
    if role == HouseholdRole.CHILD:
        raise HTTPException(status_code=403, detail="Children cannot access person data")
```

For the **POST**, **PUT**, and **DELETE** endpoints (`create_person`, `update_person`, `delete_person`), add:

```python
    if role in (HouseholdRole.CHILD, HouseholdRole.VIEWER):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
```

- [ ] **Step 7: Add role guards to the debts router**

In `backend/app/routers/debts.py`, add these imports at the top:

```python
from app.dependencies_rbac import get_member_role
from app.models.enums import HouseholdRole
```

Add `role: HouseholdRole = Depends(get_member_role)` to each endpoint function.

For the **GET list** endpoint (`list_debts`), check after parsing the `type` query param:

```python
    if role == HouseholdRole.CHILD and type_filter in ("personal_lent", "personal_borrowed"):
        raise HTTPException(status_code=403, detail="Children cannot access P2P debts")
```

For the **POST create** endpoint (`create_debt`), check after parsing the body:

```python
    if data.type in (DebtType.PERSONAL_LENT, DebtType.PERSONAL_BORROWED):
        if role == HouseholdRole.CHILD:
            raise HTTPException(status_code=403, detail="Children cannot create P2P debts")
        if role == HouseholdRole.VIEWER:
            raise HTTPException(status_code=403, detail="Viewers cannot create debts")
```

For the **PUT update** and **DELETE** endpoints, fetch the debt first, then check:

```python
    if debt.type in (DebtType.PERSONAL_LENT, DebtType.PERSONAL_BORROWED):
        if role in (HouseholdRole.CHILD, HouseholdRole.VIEWER):
            raise HTTPException(status_code=403, detail="Insufficient permissions for P2P debts")
```

For non-P2P debts (bank loans), viewer is still blocked on write operations:

```python
    if role == HouseholdRole.VIEWER:
        raise HTTPException(status_code=403, detail="Viewers cannot modify debts")
```

- [ ] **Step 8: Run RBAC tests**

```bash
cd backend && uv run pytest tests/routers/test_rbac_debts.py tests/routers/test_rbac_persons.py -v
```

Expected: ALL PASS

- [ ] **Step 9: Run the full existing test suite to check for regressions**

```bash
cd backend && uv run pytest tests/routers/test_debts.py tests/routers/test_persons.py -v
```

Expected: ALL PASS — existing tests use the overridden `get_household_id` dependency which bypasses role checks. The `get_member_role` dependency does a real DB query, but in existing tests no `HouseholdMember` row is seeded, so we need to verify behavior. If existing tests fail because `get_member_role` raises 403 (no member row found), we need to also override `get_member_role` in conftest:

If tests fail, add to `backend/tests/conftest.py` in the `override_deps` fixture:

```python
from app.dependencies_rbac import get_member_role
from app.models.enums import HouseholdRole

async def override_get_member_role() -> HouseholdRole:
    return HouseholdRole.ADMIN

# Inside override_deps():
app.dependency_overrides[get_member_role] = override_get_member_role
```

- [ ] **Step 10: Commit**

```bash
cd backend && git add app/routers/debts.py app/routers/persons.py app/dependencies_rbac.py tests/conftest.py tests/routers/test_rbac_debts.py tests/routers/test_rbac_persons.py
git commit -m "feat(rbac): enforce role-based access controls on P2P debt and person endpoints

- child role: blocked from all P2P and person endpoints
- viewer role: read-only access (GET only)
- member/admin: full access
- Add get_member_role dependency + require_role factory"
```

---

## Task 5: Full Installment Form

**Files:**
- Modify: `frontend/src/components/debts/installment-form.tsx`

### Context

The current file is a 30-line stub that says "Coming soon". We replace it with a full form following the `BankLoanForm` pattern:
- `FormSheet` wrapper
- Individual `useState` hooks per field
- `useCreateInstallment()` mutation from `@/hooks/use-installments`
- `useAccounts()` from `@/hooks/use-accounts` for account filtering
- `parseMajorToMinor()` from `@/lib/money` for money conversion
- `useTranslations()` from `next-intl` for all labels

The `InstallmentCreateInput` type (from `frontend/src/lib/types/debts.ts`):
```typescript
interface InstallmentCreateInput {
  type: InstallmentType;  // "credit_card" | "store" | "financing_app"
  name: string;
  merchant_name?: string | null;
  source_account_id?: number | null;
  linked_account_id?: number | null;
  total_amount_minor: number;
  monthly_amount_minor: number;
  total_months: number;
  start_month: string;  // "YYYY-MM" format
  currency: string;
}
```

Account filtering rules by installment type:
- `credit_card` → source_account_id **required**, filtered to `type === "credit_card"` accounts
- `financing_app` → source_account_id **required**, filtered to `type === "financing_app"` accounts
- `store` → source_account_id **optional**, filtered to `type === "credit_card"` accounts if set

- [ ] **Step 1: Replace the stub with the full form**

Replace the entire content of `frontend/src/components/debts/installment-form.tsx` with:

```typescript
"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { FormSheet } from "@/components/shared/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useCreateInstallment, useUpdateInstallment } from "@/hooks/use-installments";
import { useAccounts } from "@/hooks/use-accounts";
import { CURRENCIES, parseMajorToMinor, formatAmount } from "@/lib/money";
import type {
  InstallmentType,
  InstallmentResponse,
} from "@/lib/types/debts";

interface InstallmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: InstallmentType;
  initialData?: InstallmentResponse;
}

const INSTALLMENT_TYPES: InstallmentType[] = [
  "credit_card",
  "store",
  "financing_app",
];

const CURRENCY_CODES = Object.keys(CURRENCIES);

export function InstallmentForm({
  open,
  onOpenChange,
  defaultType,
  initialData,
}: InstallmentFormProps) {
  const t = useTranslations("debts.form.installment");
  const isEdit = !!initialData;

  const [type, setType] = useState<InstallmentType>(
    initialData?.type ?? defaultType ?? "credit_card"
  );
  const [name, setName] = useState(initialData?.name ?? "");
  const [merchantName, setMerchantName] = useState(
    initialData?.merchant_name ?? ""
  );
  const [currency, setCurrency] = useState(initialData?.currency ?? "EGP");
  const [totalAmount, setTotalAmount] = useState(
    initialData
      ? formatAmount(initialData.total_amount_minor, initialData.currency)
      : ""
  );
  const [monthlyAmount, setMonthlyAmount] = useState(
    initialData
      ? formatAmount(initialData.monthly_amount_minor, initialData.currency)
      : ""
  );
  const [totalMonths, setTotalMonths] = useState(
    initialData ? String(initialData.total_months) : ""
  );
  const [startMonth, setStartMonth] = useState(initialData?.start_month ?? "");
  const [sourceAccountId, setSourceAccountId] = useState(
    initialData?.source_account_id ? String(initialData.source_account_id) : ""
  );

  const createMutation = useCreateInstallment();
  const updateMutation = useUpdateInstallment();
  const { data: accountsData } = useAccounts();

  const filteredAccounts = useMemo(() => {
    const allAccounts = accountsData?.data ?? [];
    if (type === "credit_card" || type === "store") {
      return allAccounts.filter((a) => a.type === "credit_card");
    }
    if (type === "financing_app") {
      return allAccounts.filter((a) => a.type === "financing_app");
    }
    return [];
  }, [accountsData, type]);

  const sourceRequired = type === "credit_card" || type === "financing_app";

  const resetFields = () => {
    setType(defaultType ?? "credit_card");
    setName("");
    setMerchantName("");
    setCurrency("EGP");
    setTotalAmount("");
    setMonthlyAmount("");
    setTotalMonths("");
    setStartMonth("");
    setSourceAccountId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const exponent = CURRENCIES[currency]?.exponent ?? 2;

    if (isEdit && initialData) {
      updateMutation.mutate(
        {
          id: initialData.id,
          name,
          merchant_name: merchantName || null,
          linked_account_id: null,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          type,
          name,
          merchant_name: merchantName || null,
          source_account_id:
            sourceAccountId && sourceAccountId !== "__none__"
              ? parseInt(sourceAccountId, 10)
              : null,
          linked_account_id: null,
          total_amount_minor: parseMajorToMinor(totalAmount, exponent),
          monthly_amount_minor: parseMajorToMinor(monthlyAmount, exponent),
          total_months: parseInt(totalMonths, 10),
          start_month: startMonth,
          currency,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            resetFields();
          },
        }
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t("editTitle") : t("title")}
      description={isEdit ? t("editDescription") : t("description")}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEdit && (
          <div className="space-y-2">
            <Label>{t("type")}</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType((v ?? "credit_card") as InstallmentType);
                setSourceAccountId("");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INSTALLMENT_TYPES.map((it) => (
                  <SelectItem key={it} value={it}>
                    {t(`types.${it}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="inst-name">{t("name")}</Label>
          <Input
            id="inst-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="inst-merchant">{t("merchant")}</Label>
          <Input
            id="inst-merchant"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
          />
        </div>

        {!isEdit && (
          <>
            <div className="space-y-2">
              <Label>{t("currency")}</Label>
              <Select
                value={currency}
                onValueChange={(v) => setCurrency(v ?? "EGP")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectCurrency")} />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code} — {CURRENCIES[code].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inst-total">{t("totalAmount")}</Label>
              <Input
                id="inst-total"
                type="number"
                step={String(
                  Math.pow(10, -(CURRENCIES[currency]?.exponent ?? 2))
                )}
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inst-monthly">{t("monthlyAmount")}</Label>
              <Input
                id="inst-monthly"
                type="number"
                step={String(
                  Math.pow(10, -(CURRENCIES[currency]?.exponent ?? 2))
                )}
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inst-months">{t("totalMonths")}</Label>
              <Input
                id="inst-months"
                type="number"
                min="1"
                value={totalMonths}
                onChange={(e) => setTotalMonths(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inst-start">{t("startMonth")}</Label>
              <Input
                id="inst-start"
                type="month"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>
                {t("sourceAccount")}
                {sourceRequired && " *"}
              </Label>
              <Select
                value={sourceAccountId}
                onValueChange={(v) => setSourceAccountId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectAccount")} />
                </SelectTrigger>
                <SelectContent>
                  {!sourceRequired && (
                    <SelectItem value="__none__">{t("none")}</SelectItem>
                  )}
                  {filteredAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={String(acc.id)}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? t("saving") : isEdit ? t("update") : t("submit")}
        </Button>
      </form>
    </FormSheet>
  );
}
```

- [ ] **Step 2: Verify the file compiles (no type errors)**

```bash
cd frontend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: No errors (or only pre-existing errors unrelated to this file). If there are errors related to missing i18n keys, those are expected and will be fixed in Task 8.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/components/debts/installment-form.tsx
git commit -m "feat(installments): replace stub with full installment form

- Type selector: credit_card / store / financing_app
- Dynamic account filtering by installment type
- source_account_id required for credit_card and financing_app
- Supports both create and edit modes via initialData prop
- Uses parseMajorToMinor for integer money handling"
```

---

## Task 6: Edit Mode for All Forms

**Files:**
- Modify: `frontend/src/components/debts/bank-loan-form.tsx`
- Modify: `frontend/src/components/debts/p2p-debt-form.tsx`
- Modify: `frontend/src/components/debts/person-form.tsx`

### Context

Each form currently only supports create mode. We add an optional `initialData` prop. When present:
- Title changes to "Edit ..." instead of "Add ..."
- Fields are pre-filled with existing values
- Submit calls the update mutation instead of create
- Immutable fields (principal, currency, tenure, etc.) are hidden or disabled in edit mode

The update schemas are intentionally narrow:
- `DebtUpdateInput`: `{ name?, institution?, linked_account_id?, notes? }`
- `PersonUpdateInput`: `{ name?, name_ar?, phone?, email?, relationship?, notes? }`
- `InstallmentUpdateInput`: `{ name?, merchant_name?, linked_account_id? }` (already handled in Task 5)

Existing hooks: `useUpdateDebt()`, `useUpdatePerson()` (both accept `{ id, ...body }`)

- [ ] **Step 1: Add edit mode to BankLoanForm**

In `frontend/src/components/debts/bank-loan-form.tsx`:

Add import for update hook and response type:

```typescript
import { useCreateDebt, useUpdateDebt } from "@/hooks/use-debts";
import type { DebtResponse } from "@/lib/types/debts";
```

Update the props interface:

```typescript
interface BankLoanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: DebtResponse;
}
```

Add `initialData` to destructuring:

```typescript
export function BankLoanForm({ open, onOpenChange, initialData }: BankLoanFormProps) {
```

Add `isEdit` flag and update hook:

```typescript
  const isEdit = !!initialData;
  const createMutation = useCreateDebt();
  const updateMutation = useUpdateDebt();
```

(Replace the existing `const mutation = useCreateDebt();` line.)

Pre-fill `useState` hooks with initial data:

```typescript
  const [name, setName] = useState(initialData?.name ?? "");
  const [institution, setInstitution] = useState(initialData?.institution ?? "");
  const [currency, setCurrency] = useState(initialData?.currency ?? "EGP");
  const [principal, setPrincipal] = useState(
    initialData ? formatAmount(initialData.principal_minor, initialData.currency) : ""
  );
  const [annualRate, setAnnualRate] = useState(
    initialData?.annual_rate_bps ? String(initialData.annual_rate_bps / 100) : ""
  );
  const [tenureMonths, setTenureMonths] = useState(
    initialData ? String(initialData.tenure_months) : ""
  );
  const [startDate, setStartDate] = useState(initialData?.start_date ?? "");
  const [linkedAccountId, setLinkedAccountId] = useState(
    initialData?.linked_account_id ? String(initialData.linked_account_id) : ""
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");
```

Add `formatAmount` to the money import:

```typescript
import { CURRENCIES, parseMajorToMinor, formatAmount } from "@/lib/money";
```

Update `handleSubmit` to branch on edit mode:

```typescript
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && initialData) {
      updateMutation.mutate(
        {
          id: initialData.id,
          name,
          institution: institution || null,
          linked_account_id:
            linkedAccountId && linkedAccountId !== "__none__"
              ? parseInt(linkedAccountId, 10)
              : null,
          notes: notes || null,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          type: "bank_loan" as const,
          name,
          institution: institution || null,
          principal_minor: parseMajorToMinor(principal, CURRENCIES[currency]?.exponent ?? 2),
          currency,
          annual_rate_percent: annualRate ? parseFloat(annualRate) : undefined,
          tenure_months: parseInt(tenureMonths, 10),
          start_date: startDate,
          linked_account_id:
            linkedAccountId && linkedAccountId !== "__none__"
              ? parseInt(linkedAccountId, 10)
              : null,
          notes: notes || null,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            resetFields();
          },
        }
      );
    }
  };
```

Update the title prop on `FormSheet`:

```typescript
      title={isEdit ? t("editTitle") : t("title")}
```

In edit mode, hide immutable fields (principal, rate, tenure, start date, currency) by wrapping them in `{!isEdit && ( ... )}`.

Update the submit button:

```typescript
  const isPending = createMutation.isPending || updateMutation.isPending;
```

```typescript
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? t("saving") : isEdit ? t("update") : t("submit")}
        </Button>
```

- [ ] **Step 2: Add edit mode to P2PDebtForm**

In `frontend/src/components/debts/p2p-debt-form.tsx`:

Add imports:

```typescript
import { useCreateDebt, useUpdateDebt } from "@/hooks/use-debts";
import type { DebtResponse, DebtType, RepaymentMode } from "@/lib/types/debts";
import { CURRENCIES, parseMajorToMinor, formatAmount } from "@/lib/money";
```

Update props:

```typescript
interface P2PDebtFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: DebtResponse;
}
```

Add `initialData` to destructuring, add `isEdit` flag and update hook:

```typescript
export function P2PDebtForm({ open, onOpenChange, initialData }: P2PDebtFormProps) {
  const isEdit = !!initialData;
```

Pre-fill state:

```typescript
  const [personId, setPersonId] = useState(
    initialData?.person_id ? String(initialData.person_id) : ""
  );
  const [debtType, setDebtType] = useState<DebtType>(
    initialData?.type ?? "personal_lent"
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");
```

Add update hook:

```typescript
  const createMutation = useCreateDebt();
  const updateMutation = useUpdateDebt();
```

Branch handleSubmit:

```typescript
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && initialData) {
      updateMutation.mutate(
        {
          id: initialData.id,
          name: initialData.name,
          notes: notes || null,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      // existing create logic unchanged
    }
  };
```

Update title and button text similarly to BankLoanForm. Wrap immutable fields (person, type, currency, amount, repayment mode, due date, splits) in `{!isEdit && ( ... )}`.

- [ ] **Step 3: Add edit mode to PersonForm**

In `frontend/src/components/debts/person-form.tsx`:

Add imports:

```typescript
import { useCreatePerson, useUpdatePerson } from "@/hooks/use-persons";
import type { PersonResponse, PersonRelationship } from "@/lib/types/debts";
```

Update props:

```typescript
interface PersonFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: PersonResponse;
}
```

Add `initialData` to destructuring, add `isEdit`:

```typescript
export function PersonForm({ open, onOpenChange, initialData }: PersonFormProps) {
  const isEdit = !!initialData;
```

Pre-fill state:

```typescript
  const [name, setName] = useState(initialData?.name ?? "");
  const [nameAr, setNameAr] = useState(initialData?.name_ar ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [relationship, setRelationship] = useState(
    initialData?.relationship ?? ""
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");
```

Add update hook:

```typescript
  const createMutation = useCreatePerson();
  const updateMutation = useUpdatePerson();
```

Branch handleSubmit:

```typescript
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && initialData) {
      updateMutation.mutate(
        {
          id: initialData.id,
          name,
          name_ar: nameAr || null,
          phone: phone || null,
          email: email || null,
          relationship: (relationship as PersonRelationship) || null,
          notes: notes || null,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      createMutation.mutate(
        {
          name,
          name_ar: nameAr || null,
          phone: phone || null,
          email: email || null,
          relationship: (relationship as PersonRelationship) || null,
          notes: notes || null,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            resetFields();
          },
        }
      );
    }
  };
```

Update title and button text. All fields remain visible in edit mode for PersonForm (all are mutable).

- [ ] **Step 4: Verify types compile**

```bash
cd frontend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: No new type errors.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/debts/bank-loan-form.tsx src/components/debts/p2p-debt-form.tsx src/components/debts/person-form.tsx
git commit -m "feat(forms): add edit mode to bank loan, P2P debt, and person forms

- Accept optional initialData prop for pre-filling
- Branch handleSubmit between create and update mutations
- Hide immutable fields in edit mode (principal, currency, tenure, etc.)
- PersonForm: all fields editable"
```

---

## Task 7: Delete UI with Confirmation Dialogs

**Files:**
- Create: `frontend/src/components/shared/delete-confirmation.tsx`

### Context

No delete buttons exist anywhere. We need a reusable confirmation dialog. The shadcn `alert-dialog` component is NOT installed yet — we need to add it first.

Existing delete hooks: `useDeleteDebt()`, `useDeletePerson()`, `useDeleteInstallment()` — all take an `id: number` and return a standard mutation.

- [ ] **Step 1: Install shadcn alert-dialog component**

```bash
cd frontend && pnpm dlx shadcn@latest add -y alert-dialog
```

After install, audit the generated file for physical directional CSS classes:

```bash
grep -n 'pl-\|pr-\|ml-\|mr-\|left-\|right-\|text-left\|text-right\|border-l\|border-r\|rounded-l\|rounded-r' src/components/ui/alert-dialog.tsx || echo "No physical classes found"
```

If any are found, convert them to logical equivalents (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`, `text-start`, `text-end`, `border-s`, `border-e`, `rounded-s`, `rounded-e`).

- [ ] **Step 2: Create the reusable DeleteConfirmation component**

Create `frontend/src/components/shared/delete-confirmation.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmationProps {
  /** The name of the item being deleted, shown in the confirmation message. */
  itemName: string;
  /** Called when the user confirms deletion. */
  onConfirm: () => void;
  /** Whether the delete operation is in progress. */
  isPending?: boolean;
  /** Custom trigger element. Defaults to a red "Delete" button. */
  trigger?: React.ReactNode;
}

export function DeleteConfirmation({
  itemName,
  onConfirm,
  isPending = false,
  trigger,
}: DeleteConfirmationProps) {
  const t = useTranslations("common.delete");

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button variant="destructive" size="sm">
            {t("button")}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("description", { name: itemName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? t("deleting") : t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 3: Verify types compile**

```bash
cd frontend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: No new type errors (i18n keys will be added in Task 8).

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/components/ui/alert-dialog.tsx src/components/shared/delete-confirmation.tsx
git commit -m "feat(ui): add reusable delete confirmation dialog

- Install shadcn alert-dialog component
- Create DeleteConfirmation wrapper with i18n support
- Accepts itemName, onConfirm, isPending, and optional custom trigger"
```

---

## Task 8: i18n — All New Strings (EN + AR)

**Files:**
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

### Context

New i18n keys needed:

1. **Installment form** (`debts.form.installment.*`): title, editTitle, editDescription, type, types.credit_card, types.store, types.financing_app, name, merchant, currency, selectCurrency, totalAmount, monthlyAmount, totalMonths, startMonth, sourceAccount, selectAccount, none, submit, update, saving
2. **Edit mode** for loan/p2p/person forms: editTitle, update keys
3. **Delete confirmation** (`common.delete.*`): button, title, description, cancel, confirm, deleting
4. **Person form edit** (`persons.form.*`): editTitle, editDescription, update

- [ ] **Step 1: Add English translations**

In `frontend/messages/en.json`, update the `debts.form.installment` section (replace the existing 2-line stub):

```json
"installment": {
  "title": "Add Installment Plan",
  "editTitle": "Edit Installment Plan",
  "description": "Add a new installment plan",
  "editDescription": "Update installment plan details",
  "type": "Installment Type",
  "types": {
    "credit_card": "Credit Card",
    "store": "Store / Retail",
    "financing_app": "Financing App (BNPL)"
  },
  "name": "Plan Name",
  "merchant": "Merchant Name",
  "currency": "Currency",
  "selectCurrency": "Select currency",
  "totalAmount": "Total Amount",
  "monthlyAmount": "Monthly Payment",
  "totalMonths": "Number of Months",
  "startMonth": "Start Month",
  "sourceAccount": "Source Account",
  "selectAccount": "Select account",
  "none": "None",
  "submit": "Add Installment",
  "update": "Update Installment",
  "saving": "Saving..."
}
```

Add edit keys to `debts.form.loan`:

```json
"editTitle": "Edit Bank Loan",
"update": "Update Loan"
```

Add edit keys to `debts.form.p2p`:

```json
"editTitle": "Edit Personal Debt",
"update": "Update Debt"
```

Add edit keys to `persons.form`:

```json
"editTitle": "Edit Person",
"editDescription": "Update person details.",
"update": "Update Person"
```

Add the `common.delete` section (top-level key):

```json
"common": {
  "delete": {
    "button": "Delete",
    "title": "Are you sure?",
    "description": "This will permanently delete \"{name}\". This action cannot be undone.",
    "cancel": "Cancel",
    "confirm": "Delete",
    "deleting": "Deleting..."
  }
}
```

- [ ] **Step 2: Add Arabic translations**

In `frontend/messages/ar.json`, add the corresponding Arabic keys:

Update `debts.form.installment`:

```json
"installment": {
  "title": "إضافة خطة أقساط",
  "editTitle": "تعديل خطة الأقساط",
  "description": "إضافة خطة أقساط جديدة",
  "editDescription": "تحديث تفاصيل خطة الأقساط",
  "type": "نوع القسط",
  "types": {
    "credit_card": "بطاقة ائتمان",
    "store": "متجر / تجزئة",
    "financing_app": "تطبيق تمويل (اشترِ الآن وادفع لاحقاً)"
  },
  "name": "اسم الخطة",
  "merchant": "اسم التاجر",
  "currency": "العملة",
  "selectCurrency": "اختر العملة",
  "totalAmount": "المبلغ الإجمالي",
  "monthlyAmount": "القسط الشهري",
  "totalMonths": "عدد الأشهر",
  "startMonth": "شهر البداية",
  "sourceAccount": "الحساب المصدر",
  "selectAccount": "اختر الحساب",
  "none": "بدون",
  "submit": "إضافة القسط",
  "update": "تحديث القسط",
  "saving": "جارِ الحفظ..."
}
```

Add edit keys to `debts.form.loan`:

```json
"editTitle": "تعديل القرض البنكي",
"update": "تحديث القرض"
```

Add edit keys to `debts.form.p2p`:

```json
"editTitle": "تعديل الدين الشخصي",
"update": "تحديث الدين"
```

Add edit keys to `persons.form`:

```json
"editTitle": "تعديل الشخص",
"editDescription": "تحديث بيانات الشخص.",
"update": "تحديث الشخص"
```

Add `common.delete`:

```json
"common": {
  "delete": {
    "button": "حذف",
    "title": "هل أنت متأكد؟",
    "description": "سيتم حذف \"{name}\" نهائياً. لا يمكن التراجع عن هذا الإجراء.",
    "cancel": "إلغاء",
    "confirm": "حذف",
    "deleting": "جارِ الحذف..."
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd frontend && git add messages/en.json messages/ar.json
git commit -m "feat(i18n): add EN + AR translations for installment form, edit mode, delete dialogs

- Installment form: type names, field labels, submit/update text
- Edit mode: editTitle + update button text for loan, p2p, person forms
- Delete confirmation: title, description, cancel/confirm in both languages"
```

---

## Task 9: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run backend linting**

```bash
cd backend && uv run ruff check .
```

Expected: Clean (0 errors)

- [ ] **Step 2: Run backend formatting check**

```bash
cd backend && uv run ruff format --check .
```

Expected: All files formatted correctly. If not, run `uv run ruff format .` to fix.

- [ ] **Step 3: Run backend type checking**

```bash
cd backend && uv run pyright
```

Expected: 0 errors

- [ ] **Step 4: Run full backend test suite**

```bash
cd backend && uv run pytest -v 2>&1 | tail -30
```

Expected: ALL PASS

- [ ] **Step 5: Run frontend linting**

```bash
cd frontend && pnpm lint
```

Expected: Clean

- [ ] **Step 6: Run frontend type checking**

```bash
cd frontend && pnpm exec tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 7: Run frontend build**

```bash
cd frontend && pnpm build
```

Expected: Build succeeds

- [ ] **Step 8: Fix any issues found above, then commit**

If any fixes were needed:

```bash
git add -A
git commit -m "fix: address lint/type/build issues from final verification"
```

- [ ] **Step 9: Final summary commit (if all clean)**

```bash
git add -A
git commit -m "chore: phase 3D-3 backend fixes + CRUD completion

Closes gaps B2 (FX conversion), B3 (RBAC), F1 (installment form),
F2 (edit mode), F3 (delete UI). Skipped B1 (already handled by schema)."
```
