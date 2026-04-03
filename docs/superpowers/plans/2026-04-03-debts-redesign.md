# Debts Section Redesign — Implementation Plan

> ⚠️ **STATUS: SUPERSEDED** — Phase 3 is now complete. This plan was generated during the Phase 3D-4 session. Any remaining items from this plan that were NOT executed are either covered by the Phase 3.5 UX polish sprint (`docs/superpowers/specs/phase-3.5-ux-polish-sprint.md`) or deferred to Phase 4+. Do NOT execute this plan — check the Phase 3.5 spec instead.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Debts section with 3-tab structure, payment frequency support, balance-impact awareness, match-first payments, combined Installments tab, BNPL bulk wizard, accounts cross-linking, and consistent button patterns.

**Architecture:** Modify-in-place approach. Backend additions (new columns, updated amortization engine, bulk endpoints) land first. Frontend is restructured from 5 tabs to 3, with redesigned loan form, expanded card UX, and new installments tab. Shared button components enforce consistency across all pages.

**Tech Stack:** FastAPI + SQLAlchemy (async) backend, Next.js 16 + shadcn/ui + TanStack Query frontend, Alembic migrations, next-intl for i18n.

**Spec:** `docs/superpowers/specs/2026-04-03-debts-section-redesign.md`

---

## Task 1: Backend — Add payment_frequency and payment_day_of_month columns

**Files:**
- Create: `backend/alembic/versions/009_add_debt_payment_frequency.py`
- Modify: `backend/app/models/debt.py`
- Modify: `backend/app/models/enums.py`
- Modify: `backend/app/schemas/debt.py`
- Test: `backend/tests/models/test_debt_models.py`

- [ ] **Step 1: Add PaymentFrequency enum to enums.py**

```python
# Add after RepaymentMode in backend/app/models/enums.py
class PaymentFrequency(enum.StrEnum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    SEMI_ANNUAL = "semi_annual"
    ANNUAL = "annual"
```

- [ ] **Step 2: Add columns to Debt model**

Add after `start_date` in `backend/app/models/debt.py`:

```python
from app.models.enums import DebtStatus, DebtType, PaymentFrequency, RepaymentMode

# ... inside class Debt:
    payment_day_of_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payment_frequency: Mapped[str] = mapped_column(
        SAEnum(PaymentFrequency, values_callable=_enum_values, create_type=False),
        nullable=False,
        default="monthly",
        server_default="monthly",
    )
```

- [ ] **Step 3: Add fields to DebtCreate and DebtResponse schemas**

In `backend/app/schemas/debt.py`:

```python
# DebtCreate — add after start_date:
    payment_day_of_month: int | None = Field(default=None, ge=1, le=28)
    payment_frequency: str = Field(default="monthly")

# DebtResponse — add after start_date:
    payment_day_of_month: int | None = None
    payment_frequency: str = "monthly"
```

- [ ] **Step 4: Write migration**

Create `backend/alembic/versions/009_add_debt_payment_frequency.py`:

```python
"""Add payment_frequency and payment_day_of_month to debts."""
from alembic import op
import sqlalchemy as sa

revision = "phase3_005"
down_revision = "phase3_004"
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create enum type first
    payment_frequency_enum = sa.Enum(
        "monthly", "quarterly", "semi_annual", "annual",
        name="paymentfrequency",
    )
    payment_frequency_enum.create(op.get_bind(), checkfirst=True)

    op.add_column("debts", sa.Column("payment_day_of_month", sa.Integer(), nullable=True))
    op.add_column(
        "debts",
        sa.Column(
            "payment_frequency",
            payment_frequency_enum,
            nullable=False,
            server_default="monthly",
        ),
    )
    op.create_check_constraint(
        "ck_debts_payment_day_of_month",
        "debts",
        "payment_day_of_month >= 1 AND payment_day_of_month <= 28",
    )

def downgrade() -> None:
    op.drop_constraint("ck_debts_payment_day_of_month", "debts", type_="check")
    op.drop_column("debts", "payment_frequency")
    op.drop_column("debts", "payment_day_of_month")
    sa.Enum(name="paymentfrequency").drop(op.get_bind(), checkfirst=True)
```

- [ ] **Step 5: Run migration**

Run: `cd backend && uv run alembic upgrade head`
Expected: Migration applies cleanly.

- [ ] **Step 6: Write test for new columns**

Add to `backend/tests/models/test_debt_models.py`:

```python
def test_debt_payment_frequency_default():
    """New debts default to monthly payment frequency."""
    from app.models.debt import Debt
    from app.models.enums import PaymentFrequency
    d = Debt(
        household_id="00000000-0000-0000-0000-000000000001",
        type="bank_loan",
        name="Test",
        principal_minor=100000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=12,
        start_date="2025-01-01",
        monthly_payment_minor=8334,
    )
    assert d.payment_frequency == "monthly" or d.payment_frequency is None  # default applied at DB level
    assert d.payment_day_of_month is None


def test_payment_frequency_enum_values():
    from app.models.enums import PaymentFrequency
    assert PaymentFrequency.MONTHLY == "monthly"
    assert PaymentFrequency.QUARTERLY == "quarterly"
    assert PaymentFrequency.SEMI_ANNUAL == "semi_annual"
    assert PaymentFrequency.ANNUAL == "annual"
```

- [ ] **Step 7: Run tests**

Run: `cd backend && uv run pytest tests/models/test_debt_models.py -v`
Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend/alembic/versions/009_add_debt_payment_frequency.py backend/app/models/debt.py backend/app/models/enums.py backend/app/schemas/debt.py backend/tests/models/test_debt_models.py
git commit -m "feat(debts): add payment_frequency and payment_day_of_month columns"
```

---

## Task 2: Backend — Update amortization engine for frequency and day-of-month

**Files:**
- Modify: `backend/app/services/amortization.py`
- Test: `backend/tests/services/test_amortization.py` (create if not exists)

- [ ] **Step 1: Write failing tests for frequency-aware schedule**

Create `backend/tests/services/test_amortization.py`:

```python
from datetime import date
import pytest
from app.services.amortization import compute_periodic_payment, generate_schedule


class TestComputePeriodicPayment:
    def test_monthly_payment_matches_old_function(self):
        """Monthly frequency should produce same result as old compute_monthly_payment."""
        result = compute_periodic_payment(
            principal_minor=1200000,
            annual_rate_bps=0,
            tenure_months=12,
            frequency_months=1,
        )
        assert result == 100000

    def test_quarterly_payment_zero_rate(self):
        """Quarterly, 0%, 12 months = 4 payments of 300000."""
        result = compute_periodic_payment(
            principal_minor=1200000,
            annual_rate_bps=0,
            tenure_months=12,
            frequency_months=3,
        )
        assert result == 300000

    def test_semi_annual_payment_with_interest(self):
        """Semi-annual payments with interest."""
        result = compute_periodic_payment(
            principal_minor=10000000,  # 100,000 EGP
            annual_rate_bps=1200,      # 12%
            tenure_months=24,          # 2 years = 4 semi-annual payments
            frequency_months=6,
        )
        assert result > 0
        # 4 payments should cover principal + interest
        assert result * 4 > 10000000

    def test_annual_payment(self):
        """Annual frequency, 0%, 36 months = 3 payments."""
        result = compute_periodic_payment(
            principal_minor=3000000,
            annual_rate_bps=0,
            tenure_months=36,
            frequency_months=12,
        )
        assert result == 1000000


class TestGenerateScheduleFrequency:
    def test_quarterly_schedule_has_correct_dates(self):
        schedule = generate_schedule(
            principal_minor=1200000,
            annual_rate_bps=0,
            tenure_months=12,
            start_date=date(2025, 1, 15),
            payments=[],
            frequency_months=3,
            payment_day_of_month=None,
        )
        assert len(schedule) == 4  # 12 months / 3 = 4 payments
        assert schedule[0]["date"] == date(2025, 4, 15)  # 3 months after start
        assert schedule[1]["date"] == date(2025, 7, 15)
        assert schedule[2]["date"] == date(2025, 10, 15)
        assert schedule[3]["date"] == date(2026, 1, 15)

    def test_payment_day_override(self):
        """Payment day of month overrides start_date's day."""
        schedule = generate_schedule(
            principal_minor=1200000,
            annual_rate_bps=0,
            tenure_months=12,
            start_date=date(2025, 1, 15),
            payments=[],
            frequency_months=1,
            payment_day_of_month=5,
        )
        assert len(schedule) == 12
        assert schedule[0]["date"] == date(2025, 2, 5)
        assert schedule[1]["date"] == date(2025, 3, 5)

    def test_backward_compatible_monthly_default(self):
        """Default monthly with no day override = same as old behavior."""
        schedule = generate_schedule(
            principal_minor=1200000,
            annual_rate_bps=0,
            tenure_months=12,
            start_date=date(2025, 1, 15),
            payments=[],
        )
        assert len(schedule) == 12
        assert schedule[0]["date"] == date(2025, 2, 15)

    def test_annual_schedule_with_interest(self):
        schedule = generate_schedule(
            principal_minor=10000000,
            annual_rate_bps=1000,  # 10%
            tenure_months=36,      # 3 years = 3 annual payments
            start_date=date(2025, 1, 1),
            payments=[],
            frequency_months=12,
        )
        assert len(schedule) == 3
        total = sum(row["payment_minor"] for row in schedule)
        assert total > 10000000  # must cover interest
        assert schedule[-1]["remaining_minor"] == 0
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/services/test_amortization.py -v`
Expected: FAIL — `compute_periodic_payment` doesn't exist, `generate_schedule` doesn't accept new params.

- [ ] **Step 3: Update amortization.py**

Replace `backend/app/services/amortization.py`:

```python
"""Amortization engine — pure computation, no DB, no HTTP awareness."""

from datetime import date
from decimal import ROUND_CEILING, Decimal
from typing import Any

from dateutil.relativedelta import relativedelta

FREQUENCY_MONTHS = {
    "monthly": 1,
    "quarterly": 3,
    "semi_annual": 6,
    "annual": 12,
}


def compute_periodic_payment(
    principal_minor: int,
    annual_rate_bps: int,
    tenure_months: int,
    frequency_months: int = 1,
) -> int:
    """Compute fixed periodic payment via PMT formula.

    Args:
        principal_minor: Loan principal in minor currency units.
        annual_rate_bps: Annual interest rate in basis points (1450 = 14.5%).
        tenure_months: Total loan duration in months.
        frequency_months: Months between payments (1=monthly, 3=quarterly, etc.).

    Returns:
        Payment per period in minor units, rounded up (ceiling).
    """
    if tenure_months <= 0:
        raise ValueError("tenure_months must be positive")
    if principal_minor <= 0:
        raise ValueError("principal_minor must be positive")
    if frequency_months <= 0:
        raise ValueError("frequency_months must be positive")

    num_periods = tenure_months // frequency_months
    if num_periods <= 0:
        raise ValueError("tenure_months must be >= frequency_months")

    if annual_rate_bps == 0:
        return (principal_minor + num_periods - 1) // num_periods

    # Rate per period = annual rate / (12 / frequency_months)
    period_rate = Decimal(annual_rate_bps) * Decimal(frequency_months) / Decimal(10_000 * 12)
    factor = (Decimal(1) + period_rate) ** num_periods
    payment = Decimal(principal_minor) * (period_rate * factor) / (factor - Decimal(1))
    return int(payment.to_integral_value(rounding=ROUND_CEILING))


def compute_monthly_payment(principal_minor: int, annual_rate_bps: int, tenure_months: int) -> int:
    """Backward-compatible wrapper for monthly payments."""
    return compute_periodic_payment(principal_minor, annual_rate_bps, tenure_months, 1)


def generate_schedule(
    principal_minor: int,
    annual_rate_bps: int,
    tenure_months: int,
    start_date: date,
    payments: list[Any],
    frequency_months: int = 1,
    payment_day_of_month: int | None = None,
) -> list[dict[str, Any]]:
    """Generate full amortization schedule with payment statuses.

    Args:
        principal_minor: Loan principal in minor currency units.
        annual_rate_bps: Annual interest rate in basis points.
        tenure_months: Total loan duration in months.
        start_date: Loan start date (first payment is frequency_months after).
        payments: List of DebtPayment objects (or dicts with 'date' and 'amount_minor').
        frequency_months: Months between payments (default 1 = monthly).
        payment_day_of_month: Override day of month for payment dates (1-28).

    Returns:
        List of schedule row dicts, one per period.
    """
    num_periods = tenure_months // frequency_months
    periodic_payment = compute_periodic_payment(
        principal_minor, annual_rate_bps, tenure_months, frequency_months
    )

    if annual_rate_bps > 0:
        period_rate = Decimal(annual_rate_bps) * Decimal(frequency_months) / Decimal(10_000 * 12)
    else:
        period_rate = Decimal(0)

    # Determine base day for payment dates
    pay_day = payment_day_of_month if payment_day_of_month else start_date.day

    # Index payments by approximate period for status lookup
    payment_dates = set()
    for p in payments:
        p_date = p.date if hasattr(p, "date") else p["date"]
        payment_dates.add(p_date)

    schedule: list[dict[str, Any]] = []
    remaining = principal_minor
    today = date.today()

    for i in range(num_periods):
        # Compute payment date: start + (i+1) * frequency_months, with day override
        raw_date = start_date + relativedelta(months=(i + 1) * frequency_months)
        # Override day of month (capped to 28 to avoid month-end issues)
        try:
            payment_date = raw_date.replace(day=min(pay_day, 28))
        except ValueError:
            payment_date = raw_date.replace(day=28)

        if annual_rate_bps == 0:
            interest = 0
            if i == num_periods - 1:
                principal_portion = remaining
            else:
                principal_portion = (principal_minor + num_periods - 1) // num_periods
        else:
            raw_interest = Decimal(remaining) * period_rate
            interest = int(raw_interest.to_integral_value(rounding=ROUND_CEILING))
            if i == num_periods - 1:
                principal_portion = remaining
                interest = periodic_payment - remaining if periodic_payment > remaining else interest
            else:
                principal_portion = periodic_payment - interest

        if remaining <= 0:
            principal_portion = 0
        elif principal_portion > remaining:
            principal_portion = remaining
        remaining -= principal_portion
        remaining = max(remaining, 0)

        # Determine status
        has_payment = any(_dates_match_period(pd, payment_date, frequency_months) for pd in payment_dates)
        if has_payment:
            status = "paid"
        elif payment_date <= today:
            status = "overdue"
        else:
            status = "upcoming"

        schedule.append(
            {
                "payment_number": i + 1,
                "date": payment_date,
                "payment_minor": principal_portion + interest,
                "principal_minor": principal_portion,
                "interest_minor": interest,
                "remaining_minor": max(remaining, 0),
                "status": status,
            }
        )

    return schedule


def _dates_match_period(d1: date, d2: date, frequency_months: int = 1) -> bool:
    """Check if two dates fall in the same payment period."""
    if frequency_months == 1:
        return d1.year == d2.year and d1.month == d2.month
    # For non-monthly: check if d1 is within the period window
    # (same month or within frequency_months/2 tolerance)
    month_diff = (d1.year - d2.year) * 12 + (d1.month - d2.month)
    return abs(month_diff) < frequency_months
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/services/test_amortization.py -v`
Expected: All pass.

- [ ] **Step 5: Update callers of generate_schedule in debt.py**

In `backend/app/services/debt.py`, update `get_amortization_schedule`:

```python
async def get_amortization_schedule(
    session: AsyncSession,
    debt: Debt,
) -> list[dict]:
    payments = await _get_payments(session, debt.id)
    frequency_months = FREQUENCY_MONTHS.get(debt.payment_frequency, 1) if debt.payment_frequency else 1
    return generate_schedule(
        principal_minor=debt.principal_minor,
        annual_rate_bps=debt.annual_rate_bps,
        tenure_months=debt.tenure_months,
        start_date=debt.start_date,
        payments=payments,
        frequency_months=frequency_months,
        payment_day_of_month=debt.payment_day_of_month,
    )
```

Add the import at the top of `debt.py`:

```python
from app.services.amortization import FREQUENCY_MONTHS, compute_monthly_payment, compute_periodic_payment, generate_schedule
```

Also update `create_bank_loan` to use `compute_periodic_payment` and store new fields:

```python
async def create_bank_loan(
    session: AsyncSession,
    household_id: uuid.UUID,
    data: DebtCreate,
) -> Debt:
    annual_rate_bps = int(round(data.annual_rate_percent * 100))
    frequency_months = FREQUENCY_MONTHS.get(data.payment_frequency, 1)
    periodic_payment = compute_periodic_payment(
        data.principal_minor, annual_rate_bps, data.tenure_months, frequency_months
    )

    if data.linked_account_id:
        await _validate_linked_account(
            session, household_id, data.linked_account_id, AccountType.BANK_ACCOUNT
        )

    # Default payment_day_of_month from start_date if not provided
    pay_day = data.payment_day_of_month
    if pay_day is None:
        pay_day = min(data.start_date.day, 28)

    debt = Debt(
        household_id=household_id,
        type=DebtType.BANK_LOAN,
        name=data.name,
        institution=data.institution,
        principal_minor=data.principal_minor,
        currency=data.currency,
        annual_rate_bps=annual_rate_bps,
        tenure_months=data.tenure_months,
        start_date=data.start_date,
        monthly_payment_minor=periodic_payment,  # column name kept for compat
        payment_day_of_month=pay_day,
        payment_frequency=data.payment_frequency,
        linked_account_id=data.linked_account_id,
        notes=data.notes,
        status=DebtStatus.ACTIVE,
    )
    session.add(debt)
    await session.flush()
    return debt
```

Also update `record_payment` to pass `frequency_months` and `payment_day_of_month` when calling `generate_schedule`:

```python
# In record_payment, where generate_schedule is called:
frequency_months = FREQUENCY_MONTHS.get(debt.payment_frequency, 1) if debt.payment_frequency else 1
schedule = generate_schedule(
    principal_minor=debt.principal_minor,
    annual_rate_bps=debt.annual_rate_bps,
    tenure_months=debt.tenure_months,
    start_date=debt.start_date,
    payments=[],
    frequency_months=frequency_months,
    payment_day_of_month=debt.payment_day_of_month,
)
```

- [ ] **Step 6: Update _debt_to_response in router to include new fields**

In `backend/app/routers/debts.py`, add to `_debt_to_response`:

```python
    return DebtResponse(
        # ... existing fields ...
        payment_day_of_month=debt.payment_day_of_month,
        payment_frequency=debt.payment_frequency.value if hasattr(debt.payment_frequency, "value") else (debt.payment_frequency or "monthly"),
        # ... rest ...
    )
```

- [ ] **Step 7: Run full backend test suite**

Run: `cd backend && uv run pytest tests/ -v`
Expected: All pass.

- [ ] **Step 8: Commit**

```bash
git add backend/app/services/amortization.py backend/app/services/debt.py backend/app/routers/debts.py backend/tests/services/test_amortization.py
git commit -m "feat(debts): update amortization engine for payment frequency and day-of-month"
```

---

## Task 3: Backend — Balance impact logic and bulk past payments endpoint

**Files:**
- Modify: `backend/app/services/debt.py`
- Modify: `backend/app/services/account.py`
- Modify: `backend/app/routers/debts.py`
- Modify: `backend/app/schemas/debt.py`
- Test: `backend/tests/routers/test_debts.py`

- [ ] **Step 1: Write failing test for balance cutoff helper**

Add to `backend/tests/routers/test_debts.py`:

```python
@pytest.mark.asyncio
async def test_bulk_past_payments_returns_201(client):
    """Bulk past payments endpoint creates multiple payments."""
    acct_id = await _create_test_account(client)
    resp = await client.post("/api/v1/debts", json=_create_loan_payload(
        linked_account_id=acct_id,
        start_date="2024-01-01",
        tenure_months=24,
    ))
    assert resp.status_code == 201
    debt_id = resp.json()["data"]["id"]

    bulk_resp = await client.post(
        f"/api/v1/debts/{debt_id}/bulk-past-payments",
        json={"installment_numbers": [1, 2, 3], "account_id": acct_id},
    )
    assert bulk_resp.status_code == 201
    data = bulk_resp.json()["data"]
    assert data["recorded_count"] == 3
    assert "balance_affecting_count" in data
    assert "history_only_count" in data
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/routers/test_debts.py::test_bulk_past_payments_returns_201 -v`
Expected: FAIL — endpoint doesn't exist.

- [ ] **Step 3: Add get_balance_cutoff_date helper to account service**

In `backend/app/services/account.py`, add:

```python
def get_balance_cutoff_date(account: Account) -> date | None:
    """Return the effective date before which transactions don't affect balance.

    Returns max(opened_at, last_reconciliation_date), or None if neither exists.
    Currently only opened_at is available; last_reconciliation_date is a future addition.
    """
    return account.opened_at
```

- [ ] **Step 4: Add BulkPastPaymentRequest schema**

In `backend/app/schemas/debt.py`, add:

```python
class BulkPastPaymentRequest(BaseModel):
    installment_numbers: list[int] = Field(min_length=1)
    account_id: int


class BulkPastPaymentResponse(BaseModel):
    recorded_count: int
    balance_affecting_count: int
    history_only_count: int
    total_balance_impact_minor: int
```

- [ ] **Step 5: Add bulk_record_past_payments service function**

In `backend/app/services/debt.py`, add:

```python
from app.services.account import get_balance_cutoff_date

async def bulk_record_past_payments(
    session: AsyncSession,
    household_id: uuid.UUID,
    debt: Debt,
    installment_numbers: list[int],
    account_id: int,
) -> dict:
    """Record multiple past payments at once with balance-impact awareness."""
    from app.models.account import Account

    account = await session.get(Account, account_id)
    if not account or account.household_id != household_id:
        raise ValueError("ACCOUNT_NOT_FOUND")

    cutoff = get_balance_cutoff_date(account)
    frequency_months = FREQUENCY_MONTHS.get(debt.payment_frequency, 1) if debt.payment_frequency else 1

    schedule = generate_schedule(
        principal_minor=debt.principal_minor,
        annual_rate_bps=debt.annual_rate_bps,
        tenure_months=debt.tenure_months,
        start_date=debt.start_date,
        payments=[],
        frequency_months=frequency_months,
        payment_day_of_month=debt.payment_day_of_month,
    )

    # Build lookup by payment_number
    schedule_by_num = {row["payment_number"]: row for row in schedule}

    recorded = 0
    balance_affecting = 0
    history_only = 0
    total_impact = 0

    for num in sorted(installment_numbers):
        row = schedule_by_num.get(num)
        if not row:
            continue

        affects_balance = True
        if cutoff and row["date"] < cutoff:
            affects_balance = False

        payment = await record_payment(
            session=session,
            household_id=household_id,
            debt=debt,
            payment_date=row["date"],
            amount_minor=row["payment_minor"],
            account_id=account_id,
            notes=f"Past payment #{num}",
            applies_to_balance_override=affects_balance,
        )
        recorded += 1
        if affects_balance:
            balance_affecting += 1
            total_impact += row["payment_minor"]
        else:
            history_only += 1

    return {
        "recorded_count": recorded,
        "balance_affecting_count": balance_affecting,
        "history_only_count": history_only,
        "total_balance_impact_minor": total_impact,
    }
```

- [ ] **Step 6: Update record_payment to accept applies_to_balance_override**

In `backend/app/services/debt.py`, modify `record_payment` signature:

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
    applies_to_balance_override: bool | None = None,
) -> DebtPayment:
```

Then in the auto-create transaction block, compute `applies_to_balance`:

```python
    else:
        # Determine applies_to_balance
        if applies_to_balance_override is not None:
            atb = applies_to_balance_override
        else:
            acct = await session.get(Account, account_id)
            cutoff = get_balance_cutoff_date(acct) if acct else None
            atb = payment_date >= cutoff if cutoff else True

        tx_type, tx_description = _payment_transaction_details(debt, notes)
        debt_category_id = await _get_debt_category_id(session, tx_type)
        tx_data = TransactionCreate(
            account_id=account_id,
            date=payment_date,
            description=tx_description,
            amount_minor=amount_minor,
            type=tx_type,
            category_id=debt_category_id,
            notes=notes,
            applies_to_balance=atb,
        )
        new_tx = await create_transaction(session, household_id, tx_data)
        payment.transaction_id = new_tx.id
        await session.flush()
```

Note: `TransactionCreate` schema needs an `applies_to_balance` field. Check if it already exists — if not, add it.

- [ ] **Step 7: Add applies_to_balance to TransactionCreate schema if missing**

Check `backend/app/schemas/transaction.py`. If `applies_to_balance` field is missing from `TransactionCreate`, add:

```python
    applies_to_balance: bool = True
```

And ensure `create_transaction` in `backend/app/services/transaction.py` passes it through.

- [ ] **Step 8: Add bulk-past-payments endpoint to router**

In `backend/app/routers/debts.py`:

```python
from app.schemas.debt import BulkPastPaymentRequest, BulkPastPaymentResponse

@router.post("/{debt_id}/bulk-past-payments", status_code=status.HTTP_201_CREATED)
async def bulk_past_payments(
    debt_id: int,
    data: BulkPastPaymentRequest,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    if role == HouseholdRole.VIEWER:
        raise HTTPException(status_code=403, detail="Viewers cannot record payments")
    debt = await debt_service.get_debt(session, household_id, debt_id)
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Debt not found")
            ).model_dump(),
        )
    try:
        result = await debt_service.bulk_record_past_payments(
            session, household_id, debt, data.installment_numbers, data.account_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorResponse(error=ErrorDetail(code=str(e), message=str(e))).model_dump(),
        )
    return SuccessResponse(data=BulkPastPaymentResponse(**result).model_dump())
```

- [ ] **Step 9: Run tests**

Run: `cd backend && uv run pytest tests/routers/test_debts.py -v`
Expected: All pass.

- [ ] **Step 10: Commit**

```bash
git add backend/app/services/debt.py backend/app/services/account.py backend/app/routers/debts.py backend/app/schemas/debt.py backend/tests/routers/test_debts.py
git commit -m "feat(debts): add balance-impact logic and bulk past payments endpoint"
```

---

## Task 4: Backend — Bulk BNPL payment endpoint

**Files:**
- Modify: `backend/app/routers/debts.py`
- Modify: `backend/app/services/debt.py`
- Modify: `backend/app/schemas/debt.py`
- Test: `backend/tests/routers/test_debts.py`

- [ ] **Step 1: Write failing test**

Add to `backend/tests/routers/test_debts.py`:

```python
@pytest.mark.asyncio
async def test_bulk_bnpl_payment_returns_201(client):
    """Bulk BNPL payment records multiple debt payments from one transaction."""
    # This test requires installment_plans infrastructure. If not available,
    # test with multiple bank_loan debts as a proxy for now.
    acct_id = await _create_test_account(client, name="Credit Card", currency="EGP")
    debt1 = await client.post("/api/v1/debts", json=_create_loan_payload(
        name="BNPL 1", principal_minor=1200000, tenure_months=12, annual_rate_percent=0,
    ))
    debt2 = await client.post("/api/v1/debts", json=_create_loan_payload(
        name="BNPL 2", principal_minor=600000, tenure_months=6, annual_rate_percent=0,
    ))
    d1_id = debt1.json()["data"]["id"]
    d2_id = debt2.json()["data"]["id"]

    resp = await client.post("/api/v1/debts/bulk-payment", json={
        "items": [
            {"debt_id": d1_id, "amount_minor": 100000},
            {"debt_id": d2_id, "amount_minor": 100000},
        ],
        "fee_minor": 3500,
        "account_id": acct_id,
        "date": "2026-04-03",
    })
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["payments_created"] == 2
    assert data["total_minor"] == 203500
```

- [ ] **Step 2: Add schemas**

In `backend/app/schemas/debt.py`:

```python
class BulkPaymentItem(BaseModel):
    debt_id: int
    amount_minor: int = Field(gt=0)


class BulkPaymentRequest(BaseModel):
    items: list[BulkPaymentItem] = Field(min_length=1)
    fee_minor: int = Field(ge=0, default=0)
    account_id: int
    date: date
    link_existing_transaction_id: int | None = None


class BulkPaymentResponse(BaseModel):
    payments_created: int
    total_minor: int
    fee_transaction_id: int | None = None
```

- [ ] **Step 3: Add bulk_payment service function**

In `backend/app/services/debt.py`:

```python
async def bulk_payment(
    session: AsyncSession,
    household_id: uuid.UUID,
    items: list[dict],
    fee_minor: int,
    account_id: int,
    payment_date: date,
    link_existing_transaction_id: int | None = None,
) -> dict:
    """Record payments for multiple debts, optionally linking to one transaction."""
    payments_created = 0
    total = 0

    for item in items:
        debt = await get_debt(session, household_id, item["debt_id"])
        if not debt:
            raise ValueError(f"DEBT_NOT_FOUND:{item['debt_id']}")
        await record_payment(
            session=session,
            household_id=household_id,
            debt=debt,
            payment_date=payment_date,
            amount_minor=item["amount_minor"],
            account_id=account_id,
            link_existing_transaction_id=link_existing_transaction_id,
            notes=f"Bulk payment for {debt.name}",
        )
        payments_created += 1
        total += item["amount_minor"]

    # Record fee as separate transaction if > 0
    fee_tx_id = None
    if fee_minor > 0:
        from app.models.category import Category
        fee_cat_q = select(Category).where(
            Category.is_predefined.is_(True),
            Category.name_en == "Fees & Charges",
        )
        fee_cat = (await session.execute(fee_cat_q)).scalar_one_or_none()
        fee_tx_data = TransactionCreate(
            account_id=account_id,
            date=payment_date,
            description="BNPL Payment Fees",
            amount_minor=fee_minor,
            type=TransactionType.DEBIT,
            category_id=fee_cat.id if fee_cat else None,
            notes="Bulk BNPL payment fees",
        )
        fee_tx = await create_transaction(session, household_id, fee_tx_data)
        fee_tx_id = fee_tx.id
        total += fee_minor

    return {
        "payments_created": payments_created,
        "total_minor": total,
        "fee_transaction_id": fee_tx_id,
    }
```

- [ ] **Step 4: Add endpoint to router**

In `backend/app/routers/debts.py`:

```python
from app.schemas.debt import BulkPaymentRequest, BulkPaymentResponse

@router.post("/bulk-payment", status_code=status.HTTP_201_CREATED)
async def bulk_payment_endpoint(
    data: BulkPaymentRequest,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
) -> SuccessResponse:
    if role in (HouseholdRole.VIEWER, HouseholdRole.CHILD):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    try:
        result = await debt_service.bulk_payment(
            session, household_id,
            [{"debt_id": i.debt_id, "amount_minor": i.amount_minor} for i in data.items],
            data.fee_minor, data.account_id, data.date,
            data.link_existing_transaction_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorResponse(error=ErrorDetail(code=str(e), message=str(e))).model_dump(),
        )
    return SuccessResponse(data=BulkPaymentResponse(**result).model_dump())
```

**Important:** This endpoint must be registered **before** the `/{debt_id}` routes in the router to avoid FastAPI treating "bulk-payment" as a debt_id. Move it above the `@router.get("/{debt_id}")` line.

- [ ] **Step 5: Run tests**

Run: `cd backend && uv run pytest tests/routers/test_debts.py -v`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/debt.py backend/app/routers/debts.py backend/app/schemas/debt.py backend/tests/routers/test_debts.py
git commit -m "feat(debts): add bulk BNPL payment endpoint"
```

---

## Task 5: Frontend — Shared FAB component and button consistency

**Files:**
- Create: `frontend/src/components/shared/fab.tsx`
- Modify: `frontend/src/app/(app)/debts/page.tsx`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

- [ ] **Step 1: Create shared FAB component**

Create `frontend/src/components/shared/fab.tsx`:

```tsx
"use client";

import { Plus } from "lucide-react";

interface FABProps {
  onClick: () => void;
  ariaLabel: string;
}

export function FAB({ onClick, ariaLabel }: FABProps) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="fixed bottom-6 end-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg hover:shadow-xl active:scale-95 transition-all"
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}
```

- [ ] **Step 2: Update debts page to 3 tabs with FAB**

Rewrite `frontend/src/app/(app)/debts/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { LoansTab } from "@/components/debts/loans-tab";
import { InstallmentsTab } from "@/components/debts/installments-tab";
import { P2PTab } from "@/components/debts/p2p-tab";
import { FAB } from "@/components/shared/fab";

const TAB_KEYS = ["loans", "installments", "p2p"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_COMPONENTS: Record<TabKey, React.ComponentType<{ onAddClick?: () => void }>> = {
  loans: LoansTab,
  installments: InstallmentsTab,
  p2p: P2PTab,
};

export default function DebtsPage() {
  const t = useTranslations("debts");
  const [activeTab, setActiveTab] = useState<TabKey>("loans");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const ActiveComponent = TAB_COMPONENTS[activeTab];

  const fabLabels: Record<TabKey, string> = {
    loans: t("actions.addLoan"),
    installments: t("actions.addInstallment"),
    p2p: t("actions.addDebt"),
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("subtitle")}
          </p>
        </div>
      </header>

      <nav className="flex border-b border-border overflow-x-auto">
        {TAB_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              "shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </nav>

      <ActiveComponent onAddClick={() => setShowCreateForm(true)} />
      <FAB onClick={() => setShowCreateForm(true)} ariaLabel={fabLabels[activeTab]} />
    </div>
  );
}
```

- [ ] **Step 3: Update i18n keys for new tab names**

In `frontend/messages/en.json`, update the `debts.tabs` section:

```json
{
  "debts": {
    "tabs": {
      "loans": "Loans",
      "installments": "Installments",
      "p2p": "P2P"
    }
  }
}
```

In `frontend/messages/ar.json`:

```json
{
  "debts": {
    "tabs": {
      "loans": "القروض",
      "installments": "الأقساط",
      "p2p": "شخصي"
    }
  }
}
```

Also add frequency i18n keys:

```json
{
  "debts": {
    "frequency": {
      "monthly": "Monthly",
      "quarterly": "Quarterly",
      "semi_annual": "Semi-Annual",
      "annual": "Annual",
      "paymentLabel": {
        "monthly": "Monthly Payment",
        "quarterly": "Quarterly Payment",
        "semi_annual": "Semi-Annual Payment",
        "annual": "Annual Payment"
      }
    }
  }
}
```

Arabic equivalents:

```json
{
  "debts": {
    "frequency": {
      "monthly": "شهري",
      "quarterly": "ربع سنوي",
      "semi_annual": "نصف سنوي",
      "annual": "سنوي",
      "paymentLabel": {
        "monthly": "القسط الشهري",
        "quarterly": "القسط ربع السنوي",
        "semi_annual": "القسط نصف السنوي",
        "annual": "القسط السنوي"
      }
    }
  }
}
```

- [ ] **Step 4: Create placeholder InstallmentsTab component**

Create `frontend/src/components/debts/installments-tab.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";
import { Package } from "lucide-react";

interface InstallmentsTabProps {
  onAddClick?: () => void;
}

export function InstallmentsTab({ onAddClick }: InstallmentsTabProps) {
  const t = useTranslations();

  return (
    <EmptyState
      icon={Package}
      title={t("emptyStates.installments.title")}
      description={t("emptyStates.installments.description")}
      action={onAddClick ? { label: t("debts.actions.addInstallment"), onClick: onAddClick } : undefined}
    />
  );
}
```

This is a placeholder — the full Installments tab (Task 10) will expand it with the three collapsible sections.

- [ ] **Step 5: Update LoansTab and P2PTab to accept onAddClick prop**

Add `onAddClick?: () => void` to both components' props interfaces. Use it for the "add" action instead of internal state where the FAB handles triggering.

- [ ] **Step 6: Verify build**

Run: `cd frontend && pnpm build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/shared/fab.tsx frontend/src/app/\(app\)/debts/page.tsx frontend/src/components/debts/installments-tab.tsx frontend/messages/en.json frontend/messages/ar.json
git commit -m "feat(debts): restructure to 3 tabs with shared FAB component"
```

---

## Task 6: Frontend — Update types and hooks for new backend fields

**Files:**
- Modify: `frontend/src/lib/types/debts.ts`
- Modify: `frontend/src/hooks/use-debts.ts`

- [ ] **Step 1: Update DebtResponse and DebtCreateInput types**

In `frontend/src/lib/types/debts.ts`:

```typescript
export type PaymentFrequency = "monthly" | "quarterly" | "semi_annual" | "annual";

export interface DebtResponse {
  // ... existing fields ...
  payment_day_of_month: number | null;
  payment_frequency: PaymentFrequency;
  // ... rest unchanged ...
}

export interface DebtCreateInput {
  // ... existing fields ...
  payment_day_of_month?: number | null;
  payment_frequency?: PaymentFrequency;
  // ... rest unchanged ...
}

// New types for bulk endpoints
export interface BulkPastPaymentRequest {
  installment_numbers: number[];
  account_id: number;
}

export interface BulkPastPaymentResponse {
  recorded_count: number;
  balance_affecting_count: number;
  history_only_count: number;
  total_balance_impact_minor: number;
}

export interface BulkPaymentItem {
  debt_id: number;
  amount_minor: number;
}

export interface BulkPaymentRequest {
  items: BulkPaymentItem[];
  fee_minor: number;
  account_id: number;
  date: string;
  link_existing_transaction_id?: number | null;
}

export interface BulkPaymentResponse {
  payments_created: number;
  total_minor: number;
  fee_transaction_id: number | null;
}
```

- [ ] **Step 2: Add new hooks**

In `frontend/src/hooks/use-debts.ts`, add:

```typescript
export function useBulkPastPayments(debtId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkPastPaymentRequest) =>
      apiPost<BulkPastPaymentResponse>(`/api/v1/debts/${debtId}/bulk-past-payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useBulkPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkPaymentRequest) =>
      apiPost<BulkPaymentResponse>("/api/v1/debts/bulk-payment", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
```

- [ ] **Step 3: Verify build**

Run: `cd frontend && pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/types/debts.ts frontend/src/hooks/use-debts.ts
git commit -m "feat(debts): update frontend types and hooks for frequency and bulk endpoints"
```

---

## Task 7: Frontend — Redesigned bank loan form with live preview

**Files:**
- Modify: `frontend/src/components/debts/bank-loan-form.tsx`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

- [ ] **Step 1: Add i18n keys for new form fields**

In `en.json` under `debts.form.loan`:

```json
{
  "paymentFrequency": "Payment Frequency",
  "paymentDayOfMonth": "Payment Day of Month",
  "livePreview": {
    "periodicPayment": "{frequency} Payment",
    "totalCost": "Total Cost",
    "totalInterest": "Total Interest",
    "paymentDay": "Payment day: {day} of each {period}"
  }
}
```

Arabic equivalents in `ar.json`:

```json
{
  "paymentFrequency": "تكرار الدفع",
  "paymentDayOfMonth": "يوم الدفع من الشهر",
  "livePreview": {
    "periodicPayment": "القسط {frequency}",
    "totalCost": "التكلفة الإجمالية",
    "totalInterest": "إجمالي الفوائد",
    "paymentDay": "يوم الدفع: {day} من كل {period}"
  }
}
```

- [ ] **Step 2: Rewrite BankLoanFormContent with new fields and live preview**

Key changes to `bank-loan-form.tsx`:

1. Add `paymentFrequency` state (default "monthly")
2. Add `paymentDayOfMonth` state (default null, auto-set from startDate)
3. Add `FREQUENCY_OPTIONS` constant array
4. Add live preview section that computes periodic payment client-side
5. Remove `installmentsPaid` and `isRecordingPayments` state — past payment recording moves to the detail page (Setup Past Payments banner)
6. On create success: if start date is in the past, navigate to `/debts/loans/{newId}?setup=true`

The live preview computation:

```typescript
const livePreview = useMemo(() => {
  if (!principal || !tenureMonths) return null;
  const principalMinor = parseMajorToMinor(principal, CURRENCIES[currency]?.exponent ?? 2);
  const rateBps = annualRate ? Math.round(parseFloat(annualRate) * 100) : 0;
  const tenure = parseInt(tenureMonths, 10);
  const freqMonths = FREQUENCY_MONTHS[paymentFrequency];
  const numPeriods = Math.floor(tenure / freqMonths);
  if (numPeriods <= 0) return null;

  let periodicPayment: number;
  if (rateBps === 0) {
    periodicPayment = Math.ceil(principalMinor / numPeriods);
  } else {
    const periodRate = (rateBps * freqMonths) / (10000 * 12);
    const factor = Math.pow(1 + periodRate, numPeriods);
    periodicPayment = Math.ceil(principalMinor * (periodRate * factor) / (factor - 1));
  }
  const totalCost = periodicPayment * numPeriods;
  const totalInterest = totalCost - principalMinor;

  return { periodicPayment, totalCost, totalInterest };
}, [principal, tenureMonths, annualRate, currency, paymentFrequency]);
```

Where `FREQUENCY_MONTHS` is:

```typescript
const FREQUENCY_MONTHS: Record<string, number> = {
  monthly: 1, quarterly: 3, semi_annual: 6, annual: 12,
};
```

7. Pass `payment_day_of_month` and `payment_frequency` in the create mutation payload
8. Form auto-closes on success (already works)
9. Redirect to detail page with `?setup=true` query param if start date is in the past

- [ ] **Step 3: Verify build**

Run: `cd frontend && pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/debts/bank-loan-form.tsx frontend/messages/en.json frontend/messages/ar.json
git commit -m "feat(debts): redesign loan form with frequency, day-of-month, and live preview"
```

---

## Task 8: Frontend — Loan card expand with next payment and quick actions

**Files:**
- Modify: `frontend/src/components/debts/loans-tab.tsx`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

- [ ] **Step 1: Rewrite LoanCard expanded view**

In `loans-tab.tsx`, modify the `LoanCard` component's expanded section:

1. Instead of `AmortizationPreview` showing first 3 rows, compute the **next unpaid installment** from the amortization schedule
2. Show "NEXT PAYMENT" section with installment number, date, amount, principal/interest breakdown, status (overdue/upcoming)
3. Add "Record Payment" button (opens RecordPaymentForm pre-filled with schedule data)
4. Add "Match Found — Review" button if match suggestions exist (use `useMatchSuggestions` hook)
5. Keep "View Full Details →" link to detail page
6. Keep Edit/Delete buttons with shared pattern

Key logic for next payment:

```typescript
const { data: scheduleData } = useAmortizationSchedule(loan.id);
const schedule = scheduleData?.data ?? [];
const nextPayment = schedule.find((row) => row.status !== "paid");
```

2. Replace the `AmortizationPreview` sub-component with a `NextPaymentPreview` sub-component
3. Add `RecordPaymentForm` with pre-fill props
4. Add `useMatchSuggestions` for the match-first quick action

- [ ] **Step 2: Add i18n keys**

```json
{
  "debts.loan.nextPayment": "Next Payment",
  "debts.loan.noUpcoming": "All payments recorded",
  "debts.loan.matchFound": "Match Found — Review",
  "debts.loan.principalInterestBreakdown": "Principal: {principal} + Interest: {interest}"
}
```

- [ ] **Step 3: Remove inline Add Loan button**

The FAB now handles adding loans. Remove the inline `<button>` that currently says "Add Loan" from the loans-tab.

- [ ] **Step 4: Verify build**

Run: `cd frontend && pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/debts/loans-tab.tsx frontend/messages/en.json frontend/messages/ar.json
git commit -m "feat(debts): loan card shows next payment with quick record action"
```

---

## Task 9: Frontend — Setup Past Payments banner on loan detail page

**Files:**
- Create: `frontend/src/components/debts/setup-past-payments.tsx`
- Modify: `frontend/src/components/debts/loan-detail-content.tsx`
- Modify: `frontend/src/hooks/use-debts.ts` (if not already done in Task 6)
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

- [ ] **Step 1: Create SetupPastPayments component**

Create `frontend/src/components/debts/setup-past-payments.tsx`:

Props:
```typescript
interface SetupPastPaymentsProps {
  debtId: number;
  currency: string;
  schedule: ScheduleRow[];
  linkedAccountId: number | null;
  accountOpenedAt: string | null; // ISO date string
  onComplete: () => void;
  onSkip: () => void;
}
```

Logic:
1. Filter schedule rows where `status !== "upcoming"` (past installments)
2. Split into two groups based on `accountOpenedAt`:
   - Before cutoff: `row.date < accountOpenedAt` — history only
   - After cutoff: `row.date >= accountOpenedAt` — affects balance
3. All pre-checked via state: `checkedRows: Set<number>` initialized with all past installment numbers
4. Calculate `totalBalanceImpact` from the "after cutoff" checked rows
5. On confirm: call `useBulkPastPayments` mutation with checked installment numbers
6. On skip: call `onSkip()` which dismisses the banner

- [ ] **Step 2: Add i18n keys**

```json
{
  "debts.setupPastPayments": {
    "title": "Setup Past Payments",
    "description": "This loan started {months} months ago. Select which installments have been paid:",
    "beforeCutoff": "Before opening balance ({date})",
    "beforeCutoffHint": "These are for history only — won't affect balance",
    "afterCutoff": "After opening balance",
    "afterCutoffWarning": "These will reduce your {account} balance by {amount}",
    "uncheckHint": "Unchecked installments will be marked as overdue.",
    "confirm": "Confirm {count} Payments",
    "skip": "Skip for Now",
    "recording": "Recording payments..."
  }
}
```

- [ ] **Step 3: Integrate into loan detail page**

In `loan-detail-content.tsx`:
1. Check for `?setup=true` query param via `useSearchParams()`
2. If present AND debt has past unpaid installments, show `SetupPastPayments` banner at the top
3. Need to fetch the linked account's `opened_at` — add a hook or include it in the debt response
4. On complete/skip: remove `?setup=true` from URL and refresh data

- [ ] **Step 4: Verify build**

Run: `cd frontend && pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/debts/setup-past-payments.tsx frontend/src/components/debts/loan-detail-content.tsx frontend/messages/en.json frontend/messages/ar.json
git commit -m "feat(debts): add Setup Past Payments banner with balance-impact grouping"
```

---

## Task 10: Frontend — Match-first record payment form

**Files:**
- Modify: `frontend/src/components/debts/record-payment-form.tsx`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

- [ ] **Step 1: Rewrite RecordPaymentForm with match-first flow**

The component gets new props:

```typescript
interface RecordPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtId: number;
  currency: string;
  debtType?: string;
  linkedAccountId?: number | null;
  showMatchSuggestions?: boolean;
  // New pre-fill props:
  prefillAmount?: number;      // from schedule (minor units)
  prefillDate?: string;        // from schedule
  prefillAccountId?: number;   // linked account
  installmentNumber?: number;  // for display
}
```

Behavior:
1. If `showMatchSuggestions` and suggestions exist → show match-first view (Step 1 from spec)
2. Each suggestion shows: date, description, amount, match score, "Confirm This Match" button
3. On confirm match: call `useRecordPayment` with `link_existing_transaction_id`
4. "Enter payment details manually" link → switches to form view
5. Form pre-fills from `prefillAmount`, `prefillDate`, `prefillAccountId`
6. If no suggestions or not showing → show pre-filled form directly

- [ ] **Step 2: Add i18n keys**

```json
{
  "debts.form.payment": {
    "matchFound": "Matching Transaction Found",
    "matchScore": "{score}% match",
    "confirmMatch": "Confirm This Match",
    "enterManually": "Enter payment details manually",
    "expected": "Expected: {amount} — Due: {date}",
    "installmentNumber": "Installment #{number}"
  }
}
```

- [ ] **Step 3: Verify build**

Run: `cd frontend && pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/debts/record-payment-form.tsx frontend/messages/en.json frontend/messages/ar.json
git commit -m "feat(debts): match-first record payment flow with pre-filled defaults"
```

---

## Task 11: Frontend — Combined Installments tab

**Files:**
- Modify: `frontend/src/components/debts/installments-tab.tsx`
- Delete: `frontend/src/components/debts/card-installments-tab.tsx` (merged)
- Delete: `frontend/src/components/debts/financing-apps-tab.tsx` (merged)
- Delete: `frontend/src/components/debts/store-installments-tab.tsx` (merged)
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

- [ ] **Step 1: Build the combined InstallmentsTab**

Replace the placeholder from Task 5 with the full implementation in `frontend/src/components/debts/installments-tab.tsx`:

Structure:
1. Three collapsible sections using `Collapsible` from shadcn/ui:
   - "Credit Card Installments"
   - "BNPL" (with accent styling: violet border-start, tinted header bg)
   - "Store Installments"
2. Each section fetches installment plans filtered by type
3. Inside each section, group plans by `source_account_id`
4. Account-level card shows: name, active plan count, monthly commitment, utilization (if credit limit exists)
5. Plan rows show: name, progress (X/Y), monthly amount — clickable to expand
6. BNPL section header includes "Bulk Pay" button
7. Reuse `InstallmentPlanRow` component from existing code
8. Reuse `CardUtilizationSummary` and `FinancingAppProviderCard` adapted for new layout

- [ ] **Step 2: Add BNPL visual distinction**

For BNPL section and cards:
- Section header: `bg-violet-50 dark:bg-violet-950/20` background tint
- Badge: `bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300`
- Icon: `Smartphone` from lucide instead of `CreditCard`
- Card accent: `border-s-4 border-violet-500`

Add design token to `frontend/src/app/globals.css` in the `@theme inline` block:

```css
--color-bnpl: oklch(0.55 0.2 285);
```

- [ ] **Step 3: Clean up old tab components**

Remove the now-unused imports from `debts/page.tsx`. The old tab component files can be deleted since their logic is merged into `installments-tab.tsx`.

- [ ] **Step 4: Add i18n keys**

```json
{
  "debts.installments": {
    "creditCard": "Credit Card Installments",
    "bnpl": "BNPL",
    "store": "Store Installments",
    "bulkPay": "Bulk Pay",
    "activePlans": "{count} active plans",
    "monthlyCommitment": "{amount}/mo",
    "utilized": "{percent}% utilized",
    "creditLimit": "Credit limit: {amount}"
  }
}
```

- [ ] **Step 5: Verify build**

Run: `cd frontend && pnpm build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/debts/installments-tab.tsx frontend/src/app/\(app\)/debts/page.tsx frontend/messages/en.json frontend/messages/ar.json
git rm frontend/src/components/debts/card-installments-tab.tsx frontend/src/components/debts/financing-apps-tab.tsx frontend/src/components/debts/store-installments-tab.tsx
git commit -m "feat(debts): combined Installments tab with BNPL visual distinction"
```

---

## Task 12: Frontend — BNPL Bulk Payment Wizard

**Files:**
- Create: `frontend/src/components/debts/bnpl-bulk-payment.tsx`
- Modify: `frontend/src/components/debts/installments-tab.tsx`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

- [ ] **Step 1: Create 3-step wizard component**

Create `frontend/src/components/debts/bnpl-bulk-payment.tsx`:

Props:
```typescript
interface BNPLBulkPaymentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

Uses a `step` state (1, 2, 3):

**Step 1 — Select Plans:** Fetch all BNPL installment plans, group by provider, show checkboxes. Track selected items and running subtotal.

**Step 2 — Fees & Total:** Show subtotal, fee input, total. Account selector and date picker.

**Step 3 — Link or Create:** Show match suggestions for the total amount on the selected account. "Use This" or "Create new transaction" options. Summary of all selected plans.

On confirm: call `useBulkPayment` mutation.

Use `FormSheet` as the container (same as other forms), with step indicator in the title.

- [ ] **Step 2: Wire "Bulk Pay" button in installments tab**

In the BNPL section header of `installments-tab.tsx`, add the Bulk Pay button that opens the wizard.

- [ ] **Step 3: Add i18n keys**

```json
{
  "debts.bulkPayment": {
    "title": "BNPL Bulk Payment",
    "step": "Step {current} of {total}",
    "selectPlans": "Select installments to pay this month:",
    "selected": "Selected: {count} plans",
    "subtotal": "Subtotal",
    "next": "Next",
    "back": "Back",
    "feesTotal": "Fees & Total",
    "installmentsTotal": "Installments total",
    "paymentFees": "Payment fees",
    "totalToPay": "Total to pay",
    "payFrom": "Pay from",
    "linkOrCreate": "Link or Create",
    "linkExisting": "Link to Existing Transaction",
    "createNew": "Create new transaction",
    "confirm": "Confirm",
    "summary": "Summary",
    "processing": "Processing..."
  }
}
```

- [ ] **Step 4: Verify build**

Run: `cd frontend && pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/debts/bnpl-bulk-payment.tsx frontend/src/components/debts/installments-tab.tsx frontend/messages/en.json frontend/messages/ar.json
git commit -m "feat(debts): BNPL bulk payment wizard"
```

---

## Task 13: Frontend — Accounts ↔ Debts cross-linking

**Files:**
- Modify: `frontend/src/app/(app)/accounts/page.tsx`
- Modify: `frontend/src/app/(app)/accounts/[id]/page.tsx`
- Create: `frontend/src/components/accounts/installment-summary.tsx`
- Create: `frontend/src/components/accounts/linked-loans.tsx`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

- [ ] **Step 1: Create InstallmentSummary component for credit card account detail**

Create `frontend/src/components/accounts/installment-summary.tsx`:

```typescript
interface InstallmentSummaryProps {
  accountId: number;
  accountName: string;
  currency: string;
  billingCycleDay?: number | null;
}
```

Fetches installment plans linked to this account. Shows:
- Plan count and monthly commitment
- Plan list (name, progress, monthly amount)
- Next billing cycle message
- "View All →" link navigating to `/debts?tab=installments&account={id}`

- [ ] **Step 2: Create LinkedLoans component for bank account detail**

Create `frontend/src/components/accounts/linked-loans.tsx`:

```typescript
interface LinkedLoansProps {
  accountId: number;
  currency: string;
}
```

Fetches debts where `linked_account_id` matches. Shows linked loans with next payment info and "View Details →" link.

- [ ] **Step 3: Add installment badge to credit card and BNPL account cards on grid**

In the Accounts page, for `credit_card` and `financing_app` type accounts, show an installment summary badge: "N plans · X/mo". Clicking navigates to filtered Installments tab.

- [ ] **Step 4: BNPL account detail — change FAB behavior**

For `financing_app` accounts on the detail page, replace the standard "Add Transaction" FAB with a speed-dial FAB offering "Add Installment" and "Record Payment".

- [ ] **Step 5: Add BNPL visual distinction on accounts grid**

BNPL (`financing_app`) account cards get:
- `Smartphone` icon instead of `CreditCard`
- "BNPL" badge in violet accent
- Start-side border stripe in violet

- [ ] **Step 6: Add i18n keys**

```json
{
  "accounts.installments": {
    "title": "Installment Plans",
    "viewAll": "View All",
    "activePlans": "{count} active plans",
    "monthlyCommitment": "{amount}/mo commitment",
    "billingCycleMessage": "Next billing cycle: {date} — these installments will be included in your statement automatically.",
    "badge": "{count} plans · {amount}/mo"
  },
  "accounts.linkedLoans": {
    "title": "Linked Loans",
    "nextPayment": "Next: {date}",
    "viewDetails": "View Details"
  },
  "accounts.bnpl": {
    "addInstallment": "Add Installment",
    "recordPayment": "Record Payment"
  }
}
```

- [ ] **Step 7: Verify build**

Run: `cd frontend && pnpm build`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/accounts/installment-summary.tsx frontend/src/components/accounts/linked-loans.tsx frontend/src/app/\(app\)/accounts/page.tsx frontend/src/app/\(app\)/accounts/\[id\]/page.tsx frontend/messages/en.json frontend/messages/ar.json
git commit -m "feat(accounts): cross-link installments and loans on account pages"
```

---

## Task 14: Frontend — P2P tab redesign with inline person creation

**Files:**
- Modify: `frontend/src/components/debts/p2p-tab.tsx`
- Modify: `frontend/src/components/debts/p2p-debt-form.tsx`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

- [ ] **Step 1: Update P2PDebtForm with inline person creation**

In `p2p-debt-form.tsx`:
1. Add "+" Add new person" option at the bottom of the person autocomplete select
2. When clicked, show inline sub-form fields: name (required), name_ar, phone, relationship
3. On save: call `useCreatePerson` mutation, then auto-select the new person in the dropdown
4. Collapse the sub-form after successful creation

- [ ] **Step 2: Update P2PTab layout**

Update `p2p-tab.tsx`:
1. Keep the person-grouped layout (already exists)
2. In expanded person card, ensure each debt row shows:
   - Next split info with amount and due date
   - "Record Payment" button (pre-filled from next unpaid split)
   - "Mark Settled" button for fully-paid debts
3. Add "Add Debt for {person}" button in expanded card
4. Add "View Person Details →" link
5. Remove inline "Add Debt" and "Add Person" buttons — FAB handles primary add

- [ ] **Step 3: Add i18n keys**

```json
{
  "debts.form.p2p.addNewPerson": "+ Add new person",
  "debts.form.p2p.inlinePersonTitle": "Quick Add Person",
  "debts.form.p2p.addDebtFor": "Add Debt for {name}",
  "debts.p2p.viewPersonDetails": "View Person Details"
}
```

- [ ] **Step 4: Verify build**

Run: `cd frontend && pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/debts/p2p-tab.tsx frontend/src/components/debts/p2p-debt-form.tsx frontend/messages/en.json frontend/messages/ar.json
git commit -m "feat(debts): P2P tab redesign with inline person creation"
```

---

## Task 15: Frontend — Navbar actions and button audit

**Files:**
- Modify: `frontend/src/app/(app)/debts/page.tsx`
- Modify: `frontend/src/app/(app)/accounts/page.tsx`
- Modify: `frontend/src/app/(app)/transactions/page.tsx`
- Modify: `frontend/src/app/(app)/transfers/page.tsx`

- [ ] **Step 1: Add useNavbarActions to debts page**

In `debts/page.tsx`, use the `useNavbarActions` context to set the Manage button:

```typescript
const { setActions } = useNavbarActions();

useEffect(() => {
  setActions(
    <Button variant="outline" size="sm" onClick={() => setBulkMode(true)}>
      <Settings className="h-4 w-4 me-1" />
      {t("debts.manage")}
    </Button>
  );
  return () => setActions(null);
}, [setActions, t]);
```

- [ ] **Step 2: Audit all pages for button consistency**

Check every page that has action buttons and ensure:
- FAB uses the shared `<FAB>` component from Task 5
- Navbar actions use `useNavbarActions` context
- Edit buttons: `<Button variant="ghost" size="icon">` with `<Pencil className="h-4 w-4" />`
- Delete buttons: `<Button variant="ghost" size="icon">` with `<Trash2 className="h-4 w-4 text-destructive" />`
- No raw `<button>` elements with custom Tailwind for action buttons

Replace any inconsistencies found on the accounts, transactions, and transfers pages with the shared FAB component.

- [ ] **Step 3: Verify build**

Run: `cd frontend && pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/\(app\)/debts/page.tsx frontend/src/app/\(app\)/accounts/page.tsx frontend/src/app/\(app\)/transactions/page.tsx frontend/src/app/\(app\)/transfers/page.tsx frontend/src/components/shared/fab.tsx
git commit -m "refactor(frontend): standardize navbar actions and button patterns across all pages"
```

---

## Task 16: Frontend — Balance impact display in transaction lists

**Files:**
- Modify: `frontend/src/components/transactions/transaction-row.tsx` (or equivalent)
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

- [ ] **Step 1: Add history-only styling to transaction rows**

In the transaction list component, check `applies_to_balance` on each transaction. If `false`:
- Apply `opacity-50` to the row
- Show a small tag: "History only — doesn't affect balance"
- Use `text-muted-foreground` for the amount

```tsx
{!transaction.applies_to_balance && (
  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
    {t("transactions.historyOnly")}
  </span>
)}
```

- [ ] **Step 2: Add i18n keys**

```json
{
  "transactions.historyOnly": "History only — doesn't affect balance"
}
```

Arabic:
```json
{
  "transactions.historyOnly": "للسجل فقط — لا يؤثر على الرصيد"
}
```

- [ ] **Step 3: Verify build**

Run: `cd frontend && pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/transactions/ frontend/messages/en.json frontend/messages/ar.json
git commit -m "feat(transactions): display history-only tag for non-balance-affecting transactions"
```

---

## Task 17: Integration testing and final verification

**Files:**
- Modify: `backend/tests/routers/test_debts.py`

- [ ] **Step 1: Add integration tests for payment frequency end-to-end**

```python
@pytest.mark.asyncio
async def test_create_loan_with_quarterly_frequency(client):
    resp = await client.post("/api/v1/debts", json={
        **_create_loan_payload(),
        "payment_frequency": "quarterly",
        "payment_day_of_month": 10,
    })
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["payment_frequency"] == "quarterly"
    assert data["payment_day_of_month"] == 10
    # Monthly payment field stores periodic payment
    assert data["monthly_payment_minor"] > 0

    # Amortization should have tenure/3 rows
    sched_resp = await client.get(f"/api/v1/debts/{data['id']}/amortization")
    schedule = sched_resp.json()["data"]
    assert len(schedule) == 20  # 60 months / 3 = 20 quarterly payments
    # First payment date should use day 10
    assert schedule[0]["date"].endswith("-10")


@pytest.mark.asyncio
async def test_create_loan_with_annual_frequency(client):
    resp = await client.post("/api/v1/debts", json={
        **_create_loan_payload(tenure_months=36),
        "payment_frequency": "annual",
    })
    assert resp.status_code == 201
    sched_resp = await client.get(f"/api/v1/debts/{resp.json()['data']['id']}/amortization")
    schedule = sched_resp.json()["data"]
    assert len(schedule) == 3  # 36 / 12 = 3 annual payments
```

- [ ] **Step 2: Run full backend test suite**

Run: `cd backend && uv run pytest tests/ -v`
Expected: All pass.

- [ ] **Step 3: Run full frontend build**

Run: `cd frontend && pnpm build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Run frontend lint and type check**

Run: `cd frontend && pnpm lint && pnpm exec tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Final commit**

```bash
git add backend/tests/routers/test_debts.py
git commit -m "test(debts): add integration tests for payment frequency and bulk endpoints"
```

---

## Deferred Items

- **Credit card installment auto-progression:** The spec calls for automatic marking of elapsed credit card installment months as "paid" (on-read computation). This affects the `installment_plans` table, not `debts`. It's a backend-only change that can be implemented as a follow-up task since credit card installments already track `months_paid` / `total_months` in the existing schema.
- **Accounts page utilization formula update:** The spec defines a new utilization formula: `(remaining_installment_total + cycle_spending - payments - cashback) / credit_limit`. The current formula only uses `displayed_balance / credit_limit`. Updating this requires changes to the account balance service and is best done as a separate task after the installment plans are properly grouped.

## Dependency Graph

```
Task 1 (schema) → Task 2 (amortization) → Task 3 (balance logic) → Task 4 (bulk BNPL)
                                         ↘
Task 5 (FAB + tabs) → Task 6 (types/hooks) → Task 7 (loan form)
                                             → Task 8 (loan card expand)
                                             → Task 9 (setup past payments)
                                             → Task 10 (record payment)
                                             → Task 11 (installments tab)
                                             → Task 12 (BNPL wizard)
                                             → Task 13 (accounts cross-linking)
                                             → Task 14 (P2P redesign)
                                             → Task 15 (button audit)
                                             → Task 16 (balance display)
Task 17 (integration tests) — depends on all above
```

Backend tasks (1-4) must complete first. Frontend tasks (5-16) can largely run in parallel after Task 6, except:
- Task 9 depends on Task 7 (loan form redirect)
- Task 12 depends on Task 11 (installments tab)
- Task 15 depends on all other frontend tasks
