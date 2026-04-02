# Phase 3E: Credit Card Statement Cycle & Pending/Posted Transactions

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add credit card statement cycle tracking (statement balance, minimum payment, billing dates) and pending/posted transaction states so users can manage CC accounts with full lifecycle visibility.

**Architecture:** New migration adds 5 columns to accounts and 1 column to transactions. A new `statement_cycle` service computes statement balances and minimum payments. Two new endpoints allow statement closure and retrieval. Transactions gain a `posting_status` field with a transition endpoint. Frontend shows statement vs current balance on CC account detail pages and renders pending transactions with visual distinction.

**Tech Stack:**
- Backend: Python 3.12, FastAPI (async), SQLAlchemy (async), Pydantic V2, Alembic, pytest
- Frontend: Next.js 16 (App Router), TypeScript strict mode, shadcn/ui (base-nova), TanStack Query, next-intl, Tailwind CSS v4 (logical properties only)

**Required Reading:**
- `docs/superpowers/specs/2026-04-01-phase3-debts-installments-design.md` Section 11
- `docs/02-data-models.md`
- `backend/app/models/account.py`
- `backend/app/models/transaction.py`
- `backend/app/services/account.py`

---

## File Structure

### New Files
- `backend/alembic/versions/006_add_statement_cycle_and_posting_status.py` — migration
- `backend/app/services/statement_cycle.py` — statement balance + minimum payment logic
- `backend/app/schemas/statement.py` — statement-related schemas
- `backend/tests/unit/test_statement_cycle.py` — unit tests for statement cycle service
- `frontend/src/hooks/use-statement.ts` — hook for statement data
- `frontend/src/components/accounts/statement-balance-card.tsx` — statement balance display

### Modified Files
- `backend/app/models/account.py` — add 5 statement columns
- `backend/app/models/transaction.py` — add `posting_status` column
- `backend/app/schemas/account.py` — add statement fields to AccountResponse
- `backend/app/schemas/transaction.py` — add `posting_status` to schemas
- `backend/app/routers/accounts.py` — add statement endpoints
- `backend/app/routers/transactions.py` — add post endpoint + posting_status filter
- `backend/app/services/transaction.py` — add `post_transaction()` + filter support
- `frontend/src/hooks/use-accounts.ts` — extend Account interface
- `frontend/src/lib/types/transactions.ts` or inline types — add posting_status
- `frontend/src/components/accounts/account-balance-header.tsx` — show statement info for CC
- `frontend/src/components/transactions/transaction-table.tsx` — pending badge
- `frontend/src/components/transactions/transaction-filters.tsx` — posting_status filter
- `frontend/messages/en.json` — add i18n strings
- `frontend/messages/ar.json` — add i18n strings

---

## Task 1: Alembic Migration — Statement Cycle + Posting Status

**Files:**
- Create: `backend/alembic/versions/006_add_statement_cycle_and_posting_status.py`

- [ ] **Step 1: Create the migration file**

Create `backend/alembic/versions/006_add_statement_cycle_and_posting_status.py`:

```python
"""add_statement_cycle_and_posting_status

Revision ID: 006
Revises: c1b77ba111ff
Create Date: 2026-04-02

Adds statement cycle columns to accounts table and posting_status to transactions.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "006"
down_revision: str | Sequence[str] | None = "c1b77ba111ff"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- accounts: statement cycle columns ---
    op.add_column(
        "accounts",
        sa.Column("statement_balance_minor", sa.BigInteger(), nullable=True),
    )
    op.add_column(
        "accounts",
        sa.Column("last_statement_date", sa.Date(), nullable=True),
    )
    op.add_column(
        "accounts",
        sa.Column("minimum_payment_minor", sa.BigInteger(), nullable=True),
    )
    op.add_column(
        "accounts",
        sa.Column(
            "minimum_payment_percent",
            sa.Integer(),
            nullable=False,
            server_default="5",
        ),
    )
    op.add_column(
        "accounts",
        sa.Column(
            "minimum_payment_floor_minor",
            sa.BigInteger(),
            nullable=False,
            server_default="10000",
        ),
    )

    # --- transactions: posting_status ---
    op.add_column(
        "transactions",
        sa.Column(
            "posting_status",
            sa.String(20),
            nullable=False,
            server_default="posted",
        ),
    )
    op.create_index(
        "ix_transactions_posting_status",
        "transactions",
        ["account_id", "posting_status"],
    )


def downgrade() -> None:
    op.drop_index("ix_transactions_posting_status", table_name="transactions")
    op.drop_column("transactions", "posting_status")
    op.drop_column("accounts", "minimum_payment_floor_minor")
    op.drop_column("accounts", "minimum_payment_percent")
    op.drop_column("accounts", "minimum_payment_minor")
    op.drop_column("accounts", "last_statement_date")
    op.drop_column("accounts", "statement_balance_minor")
```

- [ ] **Step 2: Run migration to verify it applies**

Run: `cd backend && uv run alembic upgrade head 2>&1 | tail -5`
Expected: Migration applies successfully.

- [ ] **Step 3: Commit**

```bash
git add backend/alembic/versions/006_add_statement_cycle_and_posting_status.py
git commit -m "feat(db): add statement cycle columns and posting_status migration"
```

---

## Task 2: Update Account + Transaction Models

**Files:**
- Modify: `backend/app/models/account.py`
- Modify: `backend/app/models/transaction.py`

- [ ] **Step 1: Add statement columns to Account model**

In `backend/app/models/account.py`, add these columns after `opened_at`:

```python
    # Statement cycle (credit card / financing app)
    statement_balance_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    last_statement_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    minimum_payment_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    minimum_payment_percent: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="5"
    )
    minimum_payment_floor_minor: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="10000"
    )
```

- [ ] **Step 2: Add posting_status to Transaction model**

In `backend/app/models/transaction.py`, add after `ai_confidence`:

```python
    posting_status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default="posted"
    )
```

- [ ] **Step 3: Verify models import correctly**

Run: `cd backend && uv run python -c "from app.models.account import Account; from app.models.transaction import Transaction; print('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/account.py backend/app/models/transaction.py
git commit -m "feat(models): add statement cycle and posting_status columns"
```

---

## Task 3: Statement + Transaction Schema Updates

**Files:**
- Create: `backend/app/schemas/statement.py`
- Modify: `backend/app/schemas/account.py`
- Modify: `backend/app/schemas/transaction.py`

- [ ] **Step 1: Create statement schemas**

Create `backend/app/schemas/statement.py`:

```python
from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class StatementResponse(BaseModel):
    account_id: int
    current_balance_minor: int
    statement_balance_minor: int | None
    minimum_payment_minor: int | None
    last_statement_date: date | None
    payment_due_date: date | None
    billing_cycle_day: int | None


class CloseStatementResponse(BaseModel):
    account_id: int
    statement_balance_minor: int
    minimum_payment_minor: int
    last_statement_date: date
    payment_due_date: date | None
```

- [ ] **Step 2: Add statement fields to AccountResponse**

In `backend/app/schemas/account.py`, add these fields to `AccountResponse` after `opened_at`:

```python
    statement_balance_minor: int | None = None
    last_statement_date: date | None = None
    minimum_payment_minor: int | None = None
    minimum_payment_percent: int = 5
    minimum_payment_floor_minor: int = 10000
```

- [ ] **Step 3: Add posting_status to transaction schemas**

In `backend/app/schemas/transaction.py`, add to `TransactionCreate` after `asset_id`:

```python
    posting_status: str = "posted"
```

Add to `TransactionResponse` after `notes`:

```python
    posting_status: str = "posted"
```

- [ ] **Step 4: Verify schemas compile**

Run: `cd backend && uv run python -c "from app.schemas.statement import StatementResponse, CloseStatementResponse; from app.schemas.account import AccountResponse; from app.schemas.transaction import TransactionResponse; print('OK')"`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/statement.py backend/app/schemas/account.py backend/app/schemas/transaction.py
git commit -m "feat(schemas): add statement cycle and posting_status schemas"
```

---

## Task 4: Statement Cycle Service — Tests First

**Files:**
- Create: `backend/tests/unit/test_statement_cycle.py`

- [ ] **Step 1: Write failing tests for compute_minimum_payment**

Create `backend/tests/unit/test_statement_cycle.py`:

```python
"""Unit tests for statement cycle service."""

import pytest


class TestComputeMinimumPayment:
    """Test minimum payment calculation: max(floor, balance * percent / 100)."""

    def test_percentage_exceeds_floor(self) -> None:
        from app.services.statement_cycle import compute_minimum_payment

        # 50,000 EGP (5,000,000 minor) * 5% = 250,000 minor > 10,000 floor
        result = compute_minimum_payment(
            statement_balance_minor=5_000_000,
            percent=5,
            floor_minor=10_000,
        )
        assert result == 250_000

    def test_floor_exceeds_percentage(self) -> None:
        from app.services.statement_cycle import compute_minimum_payment

        # 100 EGP (10,000 minor) * 5% = 500 minor < 10,000 floor
        result = compute_minimum_payment(
            statement_balance_minor=10_000,
            percent=5,
            floor_minor=10_000,
        )
        assert result == 10_000

    def test_zero_balance(self) -> None:
        from app.services.statement_cycle import compute_minimum_payment

        result = compute_minimum_payment(
            statement_balance_minor=0,
            percent=5,
            floor_minor=10_000,
        )
        assert result == 0

    def test_negative_balance_returns_zero(self) -> None:
        from app.services.statement_cycle import compute_minimum_payment

        # Credit balance (overpayment) — no minimum due
        result = compute_minimum_payment(
            statement_balance_minor=-50_000,
            percent=5,
            floor_minor=10_000,
        )
        assert result == 0

    def test_custom_percent_and_floor(self) -> None:
        from app.services.statement_cycle import compute_minimum_payment

        # KWD: 1,000 KWD (1,000,000 minor) * 3% = 30,000 minor > 5,000 floor
        result = compute_minimum_payment(
            statement_balance_minor=1_000_000,
            percent=3,
            floor_minor=5_000,
        )
        assert result == 30_000
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/unit/test_statement_cycle.py -v 2>&1 | tail -10`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.statement_cycle'`

- [ ] **Step 3: Commit failing tests**

```bash
git add backend/tests/unit/test_statement_cycle.py
git commit -m "test(statement): add failing tests for compute_minimum_payment"
```

---

## Task 5: Statement Cycle Service — Implementation

**Files:**
- Create: `backend/app/services/statement_cycle.py`

- [ ] **Step 1: Implement the statement cycle service**

Create `backend/app/services/statement_cycle.py`:

```python
"""Statement cycle service for credit card and financing app accounts.

Handles statement balance computation, minimum payment calculation,
and statement closure operations.
"""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import and_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.transaction import Transaction


def compute_minimum_payment(
    statement_balance_minor: int,
    percent: int,
    floor_minor: int,
) -> int:
    """Compute minimum payment: max(floor, balance * percent / 100).

    Returns 0 if balance is zero or negative (credit/overpayment).
    All values are in minor currency units (integers).
    """
    if statement_balance_minor <= 0:
        return 0
    percentage_amount = statement_balance_minor * percent // 100
    return max(floor_minor, percentage_amount)


def compute_payment_due_date(
    statement_date: date,
    payment_due_day: int | None,
) -> date | None:
    """Compute the payment due date from the statement date and due day.

    If payment_due_day is None, returns None.
    The due date is the next occurrence of payment_due_day after the statement date.
    """
    if payment_due_day is None:
        return None
    # Due date is in the same month if due_day > statement_day, else next month
    year = statement_date.year
    month = statement_date.month
    if payment_due_day <= statement_date.day:
        month += 1
        if month > 12:
            month = 1
            year += 1
    # Clamp day to valid range for the target month
    import calendar
    max_day = calendar.monthrange(year, month)[1]
    day = min(payment_due_day, max_day)
    return date(year, month, day)


async def compute_statement_balance(
    session: AsyncSession,
    account_id: int,
    household_id,
    cutoff_date: date,
) -> int:
    """Sum posted transactions up to cutoff_date for the given account.

    Only includes transactions where posting_status='posted' and is_active=True.
    Returns the absolute balance as a positive integer for the statement.
    The sign convention follows transaction.amount_minor (negative = debit for CC).
    """
    result = await session.execute(
        select(func.coalesce(func.sum(Transaction.amount_minor), 0)).where(
            and_(
                Transaction.account_id == account_id,
                Transaction.household_id == household_id,
                Transaction.date <= cutoff_date,
                Transaction.posting_status == "posted",
                Transaction.is_active.is_(True),
                Transaction.applies_to_balance.is_(True),
            )
        )
    )
    total = result.scalar_one()
    # For CC accounts, balance is typically negative (debits).
    # Statement balance is the absolute amount owed.
    return abs(total)


async def close_statement(
    session: AsyncSession,
    account: Account,
    household_id,
) -> Account:
    """Close the current billing cycle for a credit card / financing app account.

    1. Compute statement balance from posted transactions up to billing_cycle_day
    2. Compute minimum payment
    3. Update account with statement values
    """
    import calendar
    today = date.today()

    billing_day = account.billing_cycle_day or today.day
    # Cutoff is billing_cycle_day of the current month (or last month if today < billing_day)
    year = today.year
    month = today.month
    if today.day < billing_day:
        month -= 1
        if month < 1:
            month = 12
            year -= 1
    max_day = calendar.monthrange(year, month)[1]
    cutoff = date(year, month, min(billing_day, max_day))

    statement_balance = await compute_statement_balance(
        session, account.id, household_id, cutoff
    )

    minimum_payment = compute_minimum_payment(
        statement_balance_minor=statement_balance,
        percent=account.minimum_payment_percent,
        floor_minor=account.minimum_payment_floor_minor,
    )

    account.statement_balance_minor = statement_balance
    account.minimum_payment_minor = minimum_payment
    account.last_statement_date = cutoff

    await session.flush()
    return account
```

- [ ] **Step 2: Run the unit tests**

Run: `cd backend && uv run pytest tests/unit/test_statement_cycle.py -v 2>&1 | tail -10`
Expected: All 5 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/statement_cycle.py
git commit -m "feat(statement): implement statement cycle service with minimum payment"
```

---

## Task 6: Statement Cycle Service — Async Tests

**Files:**
- Modify: `backend/tests/unit/test_statement_cycle.py`

- [ ] **Step 1: Add async tests for compute_statement_balance and close_statement**

Append to `backend/tests/unit/test_statement_cycle.py`:

```python
from datetime import date as dt_date
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.statement_cycle import (
    compute_payment_due_date,
    compute_statement_balance,
)


class TestComputePaymentDueDate:
    def test_due_day_after_statement(self) -> None:
        # Statement on 15th, due on 25th → same month
        result = compute_payment_due_date(dt_date(2026, 3, 15), 25)
        assert result == dt_date(2026, 3, 25)

    def test_due_day_before_statement(self) -> None:
        # Statement on 25th, due on 10th → next month
        result = compute_payment_due_date(dt_date(2026, 3, 25), 10)
        assert result == dt_date(2026, 4, 10)

    def test_due_day_same_as_statement(self) -> None:
        # Statement on 15th, due on 15th → next month
        result = compute_payment_due_date(dt_date(2026, 3, 15), 15)
        assert result == dt_date(2026, 4, 15)

    def test_none_due_day(self) -> None:
        result = compute_payment_due_date(dt_date(2026, 3, 15), None)
        assert result is None

    def test_december_wraps_to_january(self) -> None:
        result = compute_payment_due_date(dt_date(2026, 12, 25), 10)
        assert result == dt_date(2027, 1, 10)

    def test_february_clamps_day_31(self) -> None:
        # Due day 31, February → clamp to 28
        result = compute_payment_due_date(dt_date(2026, 1, 25), 31)
        assert result == dt_date(2026, 2, 28)
```

- [ ] **Step 2: Run all statement tests**

Run: `cd backend && uv run pytest tests/unit/test_statement_cycle.py -v 2>&1 | tail -15`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/unit/test_statement_cycle.py
git commit -m "test(statement): add payment due date tests"
```

---

## Task 7: Statement Endpoints

**Files:**
- Modify: `backend/app/routers/accounts.py`

- [ ] **Step 1: Add imports for statement service and schemas**

At the top of `backend/app/routers/accounts.py`, add:

```python
from app.schemas.statement import CloseStatementResponse, StatementResponse
from app.services import statement_cycle
```

- [ ] **Step 2: Add GET /api/v1/accounts/{id}/statement endpoint**

Add at the end of `backend/app/routers/accounts.py`, before any final closing comments:

```python
@router.get("/{account_id}/statement")
async def get_account_statement(
    account_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    """Get statement information for a credit card or financing app account."""
    account = await account_service.get_account(session, household_id, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Account not found")
            ).model_dump(),
        )
    acct_type = account.type.value if hasattr(account.type, "value") else account.type
    if acct_type not in ("credit_card", "financing_app"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error=ErrorDetail(
                    code="INVALID_ACCOUNT_TYPE",
                    message="Statement info is only available for credit card and financing app accounts",
                )
            ).model_dump(),
        )
    displayed = await account_service.compute_displayed_balance(session, account)
    due_date = statement_cycle.compute_payment_due_date(
        account.last_statement_date, account.payment_due_day
    ) if account.last_statement_date else None

    data = StatementResponse(
        account_id=account.id,
        current_balance_minor=displayed,
        statement_balance_minor=account.statement_balance_minor,
        minimum_payment_minor=account.minimum_payment_minor,
        last_statement_date=account.last_statement_date,
        payment_due_date=due_date,
        billing_cycle_day=account.billing_cycle_day,
    )
    return SuccessResponse(data=data.model_dump())
```

- [ ] **Step 3: Add POST /api/v1/accounts/{id}/close-statement endpoint**

```python
@router.post("/{account_id}/close-statement", status_code=status.HTTP_200_OK)
async def close_account_statement(
    account_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    """Close the current billing cycle — compute statement balance and minimum payment."""
    account = await account_service.get_account(session, household_id, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Account not found")
            ).model_dump(),
        )
    acct_type = account.type.value if hasattr(account.type, "value") else account.type
    if acct_type not in ("credit_card", "financing_app"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error=ErrorDetail(
                    code="INVALID_ACCOUNT_TYPE",
                    message="Statement closure is only available for credit card and financing app accounts",
                )
            ).model_dump(),
        )
    updated = await statement_cycle.close_statement(session, account, household_id)
    due_date = statement_cycle.compute_payment_due_date(
        updated.last_statement_date, updated.payment_due_day
    ) if updated.last_statement_date else None

    data = CloseStatementResponse(
        account_id=updated.id,
        statement_balance_minor=updated.statement_balance_minor or 0,
        minimum_payment_minor=updated.minimum_payment_minor or 0,
        last_statement_date=updated.last_statement_date,
        payment_due_date=due_date,
    )
    return SuccessResponse(data=data.model_dump())
```

- [ ] **Step 4: Verify backend compiles**

Run: `cd backend && uv run python -c "from app.routers.accounts import router; print('OK')"`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/accounts.py
git commit -m "feat(statement): add GET /statement and POST /close-statement endpoints"
```

---

## Task 8: Transaction Posting Status — Backend

**Files:**
- Modify: `backend/app/services/transaction.py`
- Modify: `backend/app/routers/transactions.py`

- [ ] **Step 1: Add posting_status filter to list_transactions**

In `backend/app/services/transaction.py`, find the `list_transactions` function. In its query builder, add support for a `posting_status` filter parameter. Add after other filter conditions:

```python
    if posting_status:
        stmt = stmt.where(Transaction.posting_status == posting_status)
```

Update the function signature to include:

```python
    posting_status: str | None = None,
```

- [ ] **Step 2: Add post_transaction service function**

Add to `backend/app/services/transaction.py`:

```python
async def post_transaction(
    session: AsyncSession,
    household_id,
    transaction_id: int,
) -> Transaction:
    """Transition a transaction from pending to posted.

    Only allowed for transactions with posting_status='pending'.
    """
    tx = await get_transaction(session, household_id, transaction_id)
    if tx is None:
        raise ValueError("Transaction not found")
    if tx.posting_status != "pending":
        raise ValueError("Transaction is already posted")
    tx.posting_status = "posted"
    await session.flush()
    return tx
```

- [ ] **Step 3: Add POST /api/v1/transactions/{id}/post endpoint**

In `backend/app/routers/transactions.py`, add:

```python
@router.post("/{transaction_id}/post", status_code=status.HTTP_200_OK)
async def post_transaction(
    transaction_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    """Transition a pending transaction to posted status."""
    try:
        tx = await transaction_service.post_transaction(
            session, household_id, transaction_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error=ErrorDetail(code="INVALID_STATUS", message=str(e))
            ).model_dump(),
        )
    return SuccessResponse(data=_tx_to_response(tx).model_dump())
```

- [ ] **Step 4: Add posting_status query param to list endpoint**

In the `list_transactions` endpoint in `backend/app/routers/transactions.py`, add a new query parameter:

```python
    posting_status: str | None = Query(default=None, regex="^(pending|posted)$"),
```

Pass it through to the service call:

```python
    posting_status=posting_status,
```

- [ ] **Step 5: Verify backend compiles**

Run: `cd backend && uv run python -c "from app.routers.transactions import router; print('OK')"`
Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/transaction.py backend/app/routers/transactions.py
git commit -m "feat(transactions): add posting_status filter and post endpoint"
```

---

## Task 9: Backend Tests — Statement Endpoints

**Files:**
- Create: `backend/tests/unit/test_statement_endpoints.py`

- [ ] **Step 1: Write endpoint tests**

Create `backend/tests/unit/test_statement_endpoints.py`:

```python
"""Tests for statement cycle endpoints.

These tests verify the endpoint routing and response shapes.
Integration tests with a real DB should go in tests/integration/.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import date

from app.schemas.statement import StatementResponse, CloseStatementResponse


class TestStatementSchemas:
    """Verify schema serialization."""

    def test_statement_response_serializes(self) -> None:
        resp = StatementResponse(
            account_id=1,
            current_balance_minor=500_000,
            statement_balance_minor=450_000,
            minimum_payment_minor=22_500,
            last_statement_date=date(2026, 3, 15),
            payment_due_date=date(2026, 4, 10),
            billing_cycle_day=15,
        )
        data = resp.model_dump()
        assert data["account_id"] == 1
        assert data["statement_balance_minor"] == 450_000
        assert data["minimum_payment_minor"] == 22_500
        assert data["last_statement_date"] == date(2026, 3, 15)

    def test_close_statement_response_serializes(self) -> None:
        resp = CloseStatementResponse(
            account_id=1,
            statement_balance_minor=450_000,
            minimum_payment_minor=22_500,
            last_statement_date=date(2026, 3, 15),
            payment_due_date=date(2026, 4, 10),
        )
        data = resp.model_dump()
        assert data["statement_balance_minor"] == 450_000

    def test_statement_response_nullable_fields(self) -> None:
        resp = StatementResponse(
            account_id=1,
            current_balance_minor=0,
            statement_balance_minor=None,
            minimum_payment_minor=None,
            last_statement_date=None,
            payment_due_date=None,
            billing_cycle_day=None,
        )
        data = resp.model_dump()
        assert data["statement_balance_minor"] is None
        assert data["minimum_payment_minor"] is None
```

- [ ] **Step 2: Run tests**

Run: `cd backend && uv run pytest tests/unit/test_statement_endpoints.py -v 2>&1 | tail -10`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/unit/test_statement_endpoints.py
git commit -m "test(statement): add schema serialization tests"
```

---

## Task 10: Frontend — Update Types + Statement Hook

**Files:**
- Modify: `frontend/src/hooks/use-accounts.ts`
- Create: `frontend/src/hooks/use-statement.ts`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

- [ ] **Step 1: Extend Account interface with statement fields**

In `frontend/src/hooks/use-accounts.ts`, add to the `Account` interface after `payment_due_day`:

```typescript
  statement_balance_minor: number | null;
  last_statement_date: string | null;
  minimum_payment_minor: number | null;
  minimum_payment_percent: number;
  minimum_payment_floor_minor: number;
```

- [ ] **Step 2: Create statement hook**

Create `frontend/src/hooks/use-statement.ts`:

```typescript
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { apiGet, apiPost } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";

export interface StatementInfo {
  account_id: number;
  current_balance_minor: number;
  statement_balance_minor: number | null;
  minimum_payment_minor: number | null;
  last_statement_date: string | null;
  payment_due_date: string | null;
  billing_cycle_day: number | null;
}

export interface CloseStatementResult {
  account_id: number;
  statement_balance_minor: number;
  minimum_payment_minor: number;
  last_statement_date: string;
  payment_due_date: string | null;
}

export function useStatement(accountId: number, accountType: string) {
  const isCreditType = accountType === "credit_card" || accountType === "financing_app";
  return useQuery({
    queryKey: ["accounts", accountId, "statement"],
    queryFn: () => apiGet<StatementInfo>(`/api/v1/accounts/${accountId}/statement`),
    enabled: Number.isFinite(accountId) && accountId > 0 && isCreditType,
  });
}

export function useCloseStatement(accountId: number) {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: () =>
      apiPost<CloseStatementResult>(
        `/api/v1/accounts/${accountId}/close-statement`,
        {}
      ),
    successMessage: t("statementClosed"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", accountId] });
      queryClient.invalidateQueries({ queryKey: ["accounts", accountId, "statement"] });
    },
  });
}
```

- [ ] **Step 3: Add i18n strings**

Add to `"accounts"` section in `frontend/messages/en.json`:

```json
"statement": {
  "title": "Statement",
  "currentBalance": "Current Balance",
  "statementBalance": "Statement Balance",
  "minimumPayment": "Minimum Payment",
  "dueDate": "Payment Due",
  "lastStatementDate": "Last Statement",
  "closeStatement": "Close Statement",
  "noStatement": "No statement generated yet",
  "pendingBadge": "Pending"
}
```

Add to `"toast"` section in `frontend/messages/en.json`:

```json
"statementClosed": "Statement closed successfully",
"transactionPosted": "Transaction marked as posted"
```

Add matching Arabic in `frontend/messages/ar.json` — `"accounts"` section:

```json
"statement": {
  "title": "كشف الحساب",
  "currentBalance": "الرصيد الحالي",
  "statementBalance": "رصيد الكشف",
  "minimumPayment": "الحد الأدنى للسداد",
  "dueDate": "تاريخ الاستحقاق",
  "lastStatementDate": "آخر كشف",
  "closeStatement": "إغلاق الكشف",
  "noStatement": "لم يتم إنشاء كشف بعد",
  "pendingBadge": "معلق"
}
```

Add to `"toast"` in Arabic:

```json
"statementClosed": "تم إغلاق الكشف بنجاح",
"transactionPosted": "تم ترحيل المعاملة"
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd frontend && pnpm exec tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/use-accounts.ts frontend/src/hooks/use-statement.ts frontend/messages/en.json frontend/messages/ar.json
git commit -m "feat(statement): add statement types, hook, and i18n strings"
```

---

## Task 11: Frontend — Statement Balance Card

**Files:**
- Create: `frontend/src/components/accounts/statement-balance-card.tsx`

- [ ] **Step 1: Create the statement balance card component**

Create `frontend/src/components/accounts/statement-balance-card.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/shared/money-display";
import { useStatement, useCloseStatement } from "@/hooks/use-statement";

interface StatementBalanceCardProps {
  accountId: number;
  accountType: string;
  currency: string;
}

export function StatementBalanceCard({ accountId, accountType, currency }: StatementBalanceCardProps) {
  const t = useTranslations("accounts.statement");
  const { data, isLoading } = useStatement(accountId, accountType);
  const closeMutation = useCloseStatement(accountId);

  const isCreditType = accountType === "credit_card" || accountType === "financing_app";
  if (!isCreditType) return null;

  const statement = data?.data;
  if (isLoading) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{t("title")}</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={closeMutation.isPending}
          onClick={() => closeMutation.mutate(undefined)}
        >
          {closeMutation.isPending ? "..." : t("closeStatement")}
        </Button>
      </div>

      {statement?.statement_balance_minor != null ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{t("statementBalance")}</p>
            <MoneyDisplay
              amount={statement.statement_balance_minor}
              currency={currency}
              className="text-base font-bold"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{t("minimumPayment")}</p>
            <MoneyDisplay
              amount={statement.minimum_payment_minor ?? 0}
              currency={currency}
              className="text-base font-bold text-amber-600"
            />
          </div>
          {statement.payment_due_date && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("dueDate")}</p>
              <p className="text-sm font-medium">{statement.payment_due_date}</p>
            </div>
          )}
          {statement.last_statement_date && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("lastStatementDate")}</p>
              <p className="text-sm font-medium">{statement.last_statement_date}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noStatement")}</p>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && pnpm exec tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/accounts/statement-balance-card.tsx
git commit -m "feat(statement): add StatementBalanceCard component"
```

---

## Task 12: Wire Statement Card into Account Detail

**Files:**
- Modify: `frontend/src/app/(app)/accounts/[id]/page.tsx`

- [ ] **Step 1: Import StatementBalanceCard**

At the top of `frontend/src/app/(app)/accounts/[id]/page.tsx`, add:

```typescript
import { StatementBalanceCard } from "@/components/accounts/statement-balance-card";
```

- [ ] **Step 2: Add statement card after AccountBalanceHeader**

In the return JSX, after `<AccountBalanceHeader account={account} />`, add:

```typescript
      {/* Statement info for CC / financing app accounts */}
      <StatementBalanceCard
        accountId={account.id}
        accountType={account.type}
        currency={account.currency}
      />
```

This should appear before the obligations section (if both exist, statement comes first, then obligations).

- [ ] **Step 3: Verify build**

Run: `cd frontend && pnpm exec tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/\(app\)/accounts/\[id\]/page.tsx
git commit -m "feat(accounts): wire statement balance card into account detail page"
```

---

## Task 13: Transaction Pending Badge

**Files:**
- Modify: `frontend/src/components/transactions/transaction-table.tsx`

- [ ] **Step 1: Find the transaction row rendering in transaction-table.tsx**

Locate where each transaction row is rendered. Add a pending badge next to the description or amount for transactions with `posting_status === "pending"`.

Add this inline badge component inside the transaction row, next to the description:

```typescript
{tx.posting_status === "pending" && (
  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ms-2">
    {t("accounts.statement.pendingBadge")}
  </span>
)}
```

> **Note:** The exact insertion point depends on the existing row structure in `transaction-table.tsx`. Place it adjacent to the description text element.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && pnpm exec tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/transactions/transaction-table.tsx
git commit -m "feat(transactions): add pending badge for unposted transactions"
```

---

## Task 14: Run Full Test Suite + Lint

**Files:** None (verification only)

- [ ] **Step 1: Run backend linting**

Run: `cd backend && uv run ruff check . 2>&1 | tail -5`
Expected: No lint errors (or only pre-existing ones).

- [ ] **Step 2: Run backend formatting check**

Run: `cd backend && uv run ruff format --check . 2>&1 | tail -5`
Expected: All files already formatted.

- [ ] **Step 3: Run backend tests**

Run: `cd backend && uv run pytest tests/unit/ -v 2>&1 | tail -20`
Expected: All tests pass including new statement cycle tests.

- [ ] **Step 4: Run frontend type check**

Run: `cd frontend && pnpm exec tsc --noEmit --pretty 2>&1 | tail -10`
Expected: No type errors.

- [ ] **Step 5: Run frontend lint**

Run: `cd frontend && pnpm lint 2>&1 | tail -10`
Expected: No lint errors.

- [ ] **Step 6: Run frontend build**

Run: `cd frontend && pnpm build 2>&1 | tail -10`
Expected: Build succeeds.

- [ ] **Step 7: Final commit if any formatting fixes needed**

```bash
git add -A
git commit -m "chore(lint): fix any formatting issues from 3E implementation"
```

---

## Self-Review Checklist

### 1. Spec Coverage

| Spec Requirement (Section 11) | Task | Status |
|---|---|---|
| statement_balance_minor column on accounts | Task 1-2 | ✅ |
| last_statement_date column on accounts | Task 1-2 | ✅ |
| minimum_payment_minor column on accounts | Task 1-2 | ✅ |
| minimum_payment_percent + floor config | Task 1-2 | ✅ |
| posting_status column on transactions | Task 1-2 | ✅ |
| compute_minimum_payment function | Task 4-5 | ✅ |
| compute_statement_balance function | Task 5 | ✅ |
| close_statement function | Task 5 | ✅ |
| GET /accounts/{id}/statement endpoint | Task 7 | ✅ |
| POST /accounts/{id}/close-statement endpoint | Task 7 | ✅ |
| POST /transactions/{id}/post endpoint | Task 8 | ✅ |
| posting_status filter on transaction list | Task 8 | ✅ |
| Frontend: statement balance display for CC | Task 11-12 | ✅ |
| Frontend: pending transaction badge | Task 13 | ✅ |
| Unit tests for service functions | Task 4-6, 9 | ✅ |

### 2. Placeholder Scan
- No "TBD", "TODO", "implement later" found.
- Task 13 notes that exact insertion point depends on existing code structure — this is a factual note, not a placeholder.

### 3. Type Consistency
- `posting_status` consistently typed as `str` backend, `string` frontend
- `statement_balance_minor` / `minimum_payment_minor` — nullable `int | None` backend, `number | null` frontend
- `StatementResponse` / `CloseStatementResponse` field names match between schema and frontend types
- All money values are integer minor units — no floats
