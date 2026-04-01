# Phase 3A: Foundation + Bank Loans — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the database foundation (6 enums, 5 tables, 5 models), amortization engine, persons CRUD, and bank loan CRUD with payment recording and auto-match — everything needed before P2P debts (3B) and installments (3C).

**Architecture:** Pure backend — new SQLAlchemy models, Alembic migration, pure-computation amortization service, persons + debts routers following established patterns (Depends injection, SuccessResponse envelope, soft-delete, household-scoped). TDD throughout.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy (async), Pydantic V2, pytest + httpx, Alembic

**Spec:** `docs/superpowers/specs/2026-04-01-phase3-debts-installments-design.md` (sections 3A.1–3A.9)

**Data Models Source of Truth:** `docs/02-data-models.md` → "Debt Management" section

---

## File Map

### New Files (17)

| File | Responsibility |
|------|---------------|
| `backend/app/models/person.py` | Person SQLAlchemy model |
| `backend/app/models/debt.py` | Debt SQLAlchemy model |
| `backend/app/models/debt_payment.py` | DebtPayment SQLAlchemy model |
| `backend/app/models/p2p_debt_split.py` | P2PDebtSplit SQLAlchemy model |
| `backend/app/models/installment_plan.py` | InstallmentPlan SQLAlchemy model |
| `backend/app/schemas/person.py` | Person Pydantic schemas |
| `backend/app/schemas/debt.py` | Debt + Payment Pydantic schemas |
| `backend/app/services/amortization.py` | Pure PMT computation + schedule generation |
| `backend/app/services/person.py` | Person CRUD service |
| `backend/app/services/debt.py` | Debt CRUD + payment + auto-match service |
| `backend/app/routers/persons.py` | Persons REST endpoints |
| `backend/app/routers/debts.py` | Debts REST endpoints |
| `backend/alembic/versions/005_create_phase3_tables.py` | Migration for all Phase 3 tables + enums |
| `backend/tests/services/test_amortization.py` | Unit tests for PMT + schedule |
| `backend/tests/routers/test_persons.py` | Person API integration tests |
| `backend/tests/routers/test_debts.py` | Debt API integration tests |
| `backend/tests/models/test_debt_models.py` | Model instantiation + constraint tests |

### Modified Files (3)

| File | Changes |
|------|---------|
| `backend/app/models/enums.py` | Add 6 new enums |
| `backend/app/models/__init__.py` | Export 5 new models + 6 new enums |
| `backend/app/main.py` | Register `persons` and `debts` routers |
| `backend/tests/conftest.py` | Import 5 new models so Base.metadata sees them |

---

## Task 1: Add Phase 3 Enums

**Files:**
- Modify: `backend/app/models/enums.py`
- Test: `backend/tests/models/test_enums.py` (existing — extend)

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/models/test_enums.py`:

```python
from app.models.enums import (
    DebtStatus,
    DebtType,
    InstallmentType,
    LifecycleStatus,
    PersonRelationship,
    RepaymentMode,
)


def test_debt_type_values():
    assert DebtType.BANK_LOAN == "bank_loan"
    assert DebtType.PERSONAL_LENT == "personal_lent"
    assert DebtType.PERSONAL_BORROWED == "personal_borrowed"
    assert len(DebtType) == 3


def test_debt_status_values():
    assert DebtStatus.ACTIVE == "active"
    assert DebtStatus.PAID_OFF == "paid_off"
    assert len(DebtStatus) == 2


def test_installment_type_values():
    assert InstallmentType.CREDIT_CARD == "credit_card"
    assert InstallmentType.STORE == "store"
    assert InstallmentType.FINANCING_APP == "financing_app"
    assert len(InstallmentType) == 3


def test_lifecycle_status_values():
    assert LifecycleStatus.ACTIVE == "active"
    assert LifecycleStatus.COMPLETED == "completed"
    assert len(LifecycleStatus) == 2


def test_person_relationship_values():
    assert PersonRelationship.FAMILY == "family"
    assert PersonRelationship.FRIEND == "friend"
    assert PersonRelationship.COLLEAGUE == "colleague"
    assert PersonRelationship.BUSINESS == "business"
    assert PersonRelationship.OTHER == "other"
    assert len(PersonRelationship) == 5


def test_repayment_mode_values():
    assert RepaymentMode.LUMP_SUM == "lump_sum"
    assert RepaymentMode.EQUAL_SPLITS == "equal_splits"
    assert RepaymentMode.CUSTOM_SPLITS == "custom_splits"
    assert len(RepaymentMode) == 3
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/models/test_enums.py -v -k "debt_type or debt_status or installment_type or lifecycle_status or person_relationship or repayment_mode"`
Expected: FAIL with `ImportError: cannot import name 'DebtType'`

- [ ] **Step 3: Add the 6 new enums**

Append to `backend/app/models/enums.py`:

```python
class DebtType(enum.StrEnum):
    BANK_LOAN = "bank_loan"
    PERSONAL_LENT = "personal_lent"
    PERSONAL_BORROWED = "personal_borrowed"


class DebtStatus(enum.StrEnum):
    ACTIVE = "active"
    PAID_OFF = "paid_off"


class InstallmentType(enum.StrEnum):
    CREDIT_CARD = "credit_card"
    STORE = "store"
    FINANCING_APP = "financing_app"


class LifecycleStatus(enum.StrEnum):
    ACTIVE = "active"
    COMPLETED = "completed"


class PersonRelationship(enum.StrEnum):
    FAMILY = "family"
    FRIEND = "friend"
    COLLEAGUE = "colleague"
    BUSINESS = "business"
    OTHER = "other"


class RepaymentMode(enum.StrEnum):
    LUMP_SUM = "lump_sum"
    EQUAL_SPLITS = "equal_splits"
    CUSTOM_SPLITS = "custom_splits"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && uv run pytest tests/models/test_enums.py -v`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/enums.py backend/tests/models/test_enums.py
git commit -m "feat(debts): add 6 Phase 3 enums (DebtType, DebtStatus, InstallmentType, LifecycleStatus, PersonRelationship, RepaymentMode)"
```

---

## Task 2: Create SQLAlchemy Models (5 files)

**Files:**
- Create: `backend/app/models/person.py`
- Create: `backend/app/models/debt.py`
- Create: `backend/app/models/debt_payment.py`
- Create: `backend/app/models/p2p_debt_split.py`
- Create: `backend/app/models/installment_plan.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/tests/conftest.py`
- Test: `backend/tests/models/test_debt_models.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/models/test_debt_models.py`:

```python
"""Tests for Phase 3 model instantiation and attribute defaults."""

import uuid
from datetime import date

import pytest

from app.models.debt import Debt
from app.models.debt_payment import DebtPayment
from app.models.installment_plan import InstallmentPlan
from app.models.p2p_debt_split import P2PDebtSplit
from app.models.person import Person


def test_person_model_instantiation():
    p = Person(
        household_id=uuid.uuid4(),
        name="Ahmed Ali",
        name_ar="أحمد علي",
        relationship="family",
    )
    assert p.name == "Ahmed Ali"
    assert p.name_ar == "أحمد علي"
    assert p.is_active is True


def test_debt_model_instantiation():
    d = Debt(
        household_id=uuid.uuid4(),
        type="bank_loan",
        name="Car Loan",
        institution="CIB",
        principal_minor=50000000,
        currency="EGP",
        annual_rate_bps=1450,
        tenure_months=60,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=1180000,
        status="active",
    )
    assert d.principal_minor == 50000000
    assert d.status == "active"
    assert d.is_active is True


def test_debt_payment_model_instantiation():
    dp = DebtPayment(
        debt_id=1,
        date=date(2024, 2, 1),
        amount_minor=1180000,
        principal_minor=580000,
        interest_minor=600000,
    )
    assert dp.amount_minor == 1180000
    assert dp.principal_minor == 580000


def test_p2p_debt_split_model_instantiation():
    s = P2PDebtSplit(
        debt_id=1,
        amount_minor=500000,
        due_date=date(2024, 3, 1),
        paid=False,
    )
    assert s.amount_minor == 500000
    assert s.paid is False


def test_installment_plan_model_instantiation():
    ip = InstallmentPlan(
        household_id=uuid.uuid4(),
        type="credit_card",
        name="iPhone 16 Pro",
        total_amount_minor=5400000,
        monthly_amount_minor=450000,
        total_months=12,
        start_month=date(2024, 1, 1),
        currency="EGP",
        status="active",
    )
    assert ip.total_amount_minor == 5400000
    assert ip.status == "active"
    assert ip.is_active is True


@pytest.mark.asyncio
async def test_person_persists_to_db(db_session):
    """Verify Person model can be stored and retrieved."""
    p = Person(
        household_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        name="Test Person",
    )
    db_session.add(p)
    await db_session.flush()
    assert p.id is not None


@pytest.mark.asyncio
async def test_debt_persists_to_db(db_session):
    """Verify Debt model can be stored and retrieved."""
    d = Debt(
        household_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        type="bank_loan",
        name="Test Loan",
        principal_minor=1000000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=12,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=83334,
        status="active",
    )
    db_session.add(d)
    await db_session.flush()
    assert d.id is not None


@pytest.mark.asyncio
async def test_installment_plan_persists_to_db(db_session):
    """Verify InstallmentPlan model can be stored and retrieved."""
    ip = InstallmentPlan(
        household_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        type="credit_card",
        name="Test Plan",
        total_amount_minor=1000000,
        monthly_amount_minor=100000,
        total_months=10,
        start_month=date(2024, 1, 1),
        currency="EGP",
        status="active",
    )
    db_session.add(ip)
    await db_session.flush()
    assert ip.id is not None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/models/test_debt_models.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.models.person'`

- [ ] **Step 3: Create `backend/app/models/person.py`**

```python
import uuid

from sqlalchemy import Integer, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import PersonRelationship

_enum_values = lambda e: [x.value for x in e]  # noqa: E731


class Person(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "persons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    name_ar: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(Text, nullable=True)
    email: Mapped[str | None] = mapped_column(Text, nullable=True)
    relationship: Mapped[str | None] = mapped_column(
        SAEnum(PersonRelationship, values_callable=_enum_values, create_type=False),
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
```

- [ ] **Step 4: Create `backend/app/models/debt.py`**

```python
import uuid
from datetime import date

from sqlalchemy import BigInteger, Date, ForeignKey, Index, Integer, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import DebtStatus, DebtType, RepaymentMode

_enum_values = lambda e: [x.value for x in e]  # noqa: E731


class Debt(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "debts"
    __table_args__ = (
        Index("ix_debts_household_type", "household_id", "type"),
        Index("ix_debts_household_linked_account", "household_id", "linked_account_id"),
        Index("ix_debts_household_person", "household_id", "person_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    type: Mapped[str] = mapped_column(
        SAEnum(DebtType, values_callable=_enum_values, create_type=False), nullable=False
    )
    person_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("persons.id"), nullable=True
    )
    linked_account_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("accounts.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    institution: Mapped[str | None] = mapped_column(Text, nullable=True)
    principal_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(Text, nullable=False)
    annual_rate_bps: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tenure_months: Mapped[int] = mapped_column(Integer, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    monthly_payment_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    repayment_mode: Mapped[str | None] = mapped_column(
        SAEnum(RepaymentMode, values_callable=_enum_values, create_type=False),
        nullable=True,
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        SAEnum(DebtStatus, values_callable=_enum_values, create_type=False),
        nullable=False,
        default="active",
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
```

- [ ] **Step 5: Create `backend/app/models/debt_payment.py`**

```python
from datetime import date

from sqlalchemy import BigInteger, Date, ForeignKey, Index, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class DebtPayment(TimestampMixin, Base):
    __tablename__ = "debt_payments"
    __table_args__ = (
        Index("ix_debt_payments_debt_id", "debt_id"),
        Index("ix_debt_payments_transaction_id", "transaction_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    debt_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("debts.id"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    principal_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    interest_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    transaction_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("transactions.id"), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
```

Note: `DebtPayment` does NOT extend `SoftDeleteMixin` — payment records are permanent audit entries (no `is_active`). It extends `TimestampMixin` for `created_at` only.

- [ ] **Step 6: Create `backend/app/models/p2p_debt_split.py`**

```python
from datetime import date

from sqlalchemy import BigInteger, Boolean, Date, ForeignKey, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class P2PDebtSplit(Base):
    __tablename__ = "p2p_debt_splits"
    __table_args__ = (Index("ix_p2p_debt_splits_debt_id", "debt_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    debt_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("debts.id"), nullable=False
    )
    amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    paid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    payment_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("debt_payments.id"), nullable=True
    )
```

Note: `P2PDebtSplit` extends only `Base` — no timestamps or soft-delete. Splits are managed through their parent debt.

- [ ] **Step 7: Create `backend/app/models/installment_plan.py`**

```python
import uuid
from datetime import date

from sqlalchemy import BigInteger, Date, ForeignKey, Index, Integer, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import InstallmentType, LifecycleStatus

_enum_values = lambda e: [x.value for x in e]  # noqa: E731


class InstallmentPlan(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "installment_plans"
    __table_args__ = (
        Index("ix_installment_plans_household_type", "household_id", "type"),
        Index("ix_installment_plans_household_source", "household_id", "source_account_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    type: Mapped[str] = mapped_column(
        SAEnum(InstallmentType, values_callable=_enum_values, create_type=False),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    merchant_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_account_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("accounts.id"), nullable=True
    )
    linked_account_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("accounts.id"), nullable=True
    )
    total_amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    monthly_amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    total_months: Mapped[int] = mapped_column(Integer, nullable=False)
    start_month: Mapped[date] = mapped_column(Date, nullable=False)
    currency: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        SAEnum(LifecycleStatus, values_callable=_enum_values, create_type=False),
        nullable=False,
        default="active",
    )
```

- [ ] **Step 8: Update `backend/app/models/__init__.py`**

```python
from app.models.account import Account
from app.models.base import Base
from app.models.category import Category
from app.models.debt import Debt
from app.models.debt_payment import DebtPayment
from app.models.enums import (
    AccountType,
    CategoryType,
    DebtStatus,
    DebtType,
    HouseholdRole,
    InstallmentType,
    LifecycleStatus,
    PersonRelationship,
    RepaymentMode,
    TransactionType,
)
from app.models.exchange_rate import ExchangeRate
from app.models.household import Household, HouseholdMember
from app.models.import_template import AccountImportTemplate, ImportTemplate
from app.models.installment_plan import InstallmentPlan
from app.models.p2p_debt_split import P2PDebtSplit
from app.models.person import Person
from app.models.transaction import Transaction, TransactionSplit

__all__ = [
    "Base",
    "AccountType",
    "CategoryType",
    "DebtStatus",
    "DebtType",
    "HouseholdRole",
    "InstallmentType",
    "LifecycleStatus",
    "PersonRelationship",
    "RepaymentMode",
    "TransactionType",
    "Household",
    "HouseholdMember",
    "Account",
    "Category",
    "Transaction",
    "TransactionSplit",
    "ExchangeRate",
    "ImportTemplate",
    "AccountImportTemplate",
    "Debt",
    "DebtPayment",
    "P2PDebtSplit",
    "Person",
    "InstallmentPlan",
]
```

- [ ] **Step 9: Update `backend/tests/conftest.py` imports**

Add these imports to the existing import block at the top:

```python
from app.models import (  # noqa: F401
    Account,
    AccountImportTemplate,  # noqa: F401
    Base,  # noqa: F401
    Category,
    Debt,  # NEW
    DebtPayment,  # NEW
    ExchangeRate,
    Household,
    HouseholdMember,
    ImportTemplate,  # noqa: F401
    InstallmentPlan,  # NEW
    P2PDebtSplit,  # NEW
    Person,  # NEW
    Transaction,
    TransactionSplit,
)
```

- [ ] **Step 10: Run tests to verify models work**

Run: `cd backend && uv run pytest tests/models/test_debt_models.py -v`
Expected: ALL PASS

- [ ] **Step 11: Run full test suite to verify no regressions**

Run: `cd backend && uv run pytest -v`
Expected: ALL PASS

- [ ] **Step 12: Commit**

```bash
git add backend/app/models/person.py backend/app/models/debt.py \
  backend/app/models/debt_payment.py backend/app/models/p2p_debt_split.py \
  backend/app/models/installment_plan.py backend/app/models/__init__.py \
  backend/tests/conftest.py backend/tests/models/test_debt_models.py
git commit -m "feat(debts): add 5 Phase 3 SQLAlchemy models (Person, Debt, DebtPayment, P2PDebtSplit, InstallmentPlan)"
```

---

## Task 3: Create Alembic Migration

**Files:**
- Create: `backend/alembic/versions/005_create_phase3_tables.py`

- [ ] **Step 1: Create the migration file**

Create `backend/alembic/versions/005_create_phase3_tables.py`:

```python
"""Create Phase 3 tables (debts, persons, installments)

Revision ID: phase3_001
Revises: c1b77ba111ff
Create Date: 2026-04-02 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "phase3_001"
down_revision: str | Sequence[str] | None = "c1b77ba111ff"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create Phase 3 enum types and tables."""

    # --- Create PostgreSQL enum types ---
    op.execute(
        sa.text(
            "DO $$ BEGIN"
            " CREATE TYPE debttype AS ENUM ('bank_loan','personal_lent','personal_borrowed');"
            " EXCEPTION WHEN duplicate_object THEN NULL;"
            " END $$"
        )
    )
    op.execute(
        sa.text(
            "DO $$ BEGIN"
            " CREATE TYPE debtstatus AS ENUM ('active','paid_off');"
            " EXCEPTION WHEN duplicate_object THEN NULL;"
            " END $$"
        )
    )
    op.execute(
        sa.text(
            "DO $$ BEGIN"
            " CREATE TYPE installmenttype AS ENUM ('credit_card','store','financing_app');"
            " EXCEPTION WHEN duplicate_object THEN NULL;"
            " END $$"
        )
    )
    op.execute(
        sa.text(
            "DO $$ BEGIN"
            " CREATE TYPE lifecyclestatus AS ENUM ('active','completed');"
            " EXCEPTION WHEN duplicate_object THEN NULL;"
            " END $$"
        )
    )
    op.execute(
        sa.text(
            "DO $$ BEGIN"
            " CREATE TYPE personrelationship AS ENUM ('family','friend','colleague','business','other');"
            " EXCEPTION WHEN duplicate_object THEN NULL;"
            " END $$"
        )
    )
    op.execute(
        sa.text(
            "DO $$ BEGIN"
            " CREATE TYPE repaymentmode AS ENUM ('lump_sum','equal_splits','custom_splits');"
            " EXCEPTION WHEN duplicate_object THEN NULL;"
            " END $$"
        )
    )

    # --- persons ---
    op.create_table(
        "persons",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("household_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("name_ar", sa.Text, nullable=True),
        sa.Column("phone", sa.Text, nullable=True),
        sa.Column("email", sa.Text, nullable=True),
        sa.Column(
            "relationship",
            sa.Enum("family", "friend", "colleague", "business", "other", name="personrelationship", create_type=False),
            nullable=True,
        ),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_persons_household_id", "persons", ["household_id"])

    # --- debts ---
    op.create_table(
        "debts",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("household_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "type",
            sa.Enum("bank_loan", "personal_lent", "personal_borrowed", name="debttype", create_type=False),
            nullable=False,
        ),
        sa.Column("person_id", sa.Integer, sa.ForeignKey("persons.id"), nullable=True),
        sa.Column("linked_account_id", sa.Integer, sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("institution", sa.Text, nullable=True),
        sa.Column("principal_minor", sa.BigInteger, nullable=False),
        sa.Column("currency", sa.Text, nullable=False),
        sa.Column("annual_rate_bps", sa.Integer, nullable=False, server_default="0"),
        sa.Column("tenure_months", sa.Integer, nullable=False),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("monthly_payment_minor", sa.BigInteger, nullable=False),
        sa.Column(
            "repayment_mode",
            sa.Enum("lump_sum", "equal_splits", "custom_splits", name="repaymentmode", create_type=False),
            nullable=True,
        ),
        sa.Column("due_date", sa.Date, nullable=True),
        sa.Column(
            "status",
            sa.Enum("active", "paid_off", name="debtstatus", create_type=False),
            nullable=False,
            server_default="active",
        ),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_debts_household_type", "debts", ["household_id", "type"])
    op.create_index("ix_debts_household_linked_account", "debts", ["household_id", "linked_account_id"])
    op.create_index("ix_debts_household_person", "debts", ["household_id", "person_id"])

    # --- debt_payments ---
    op.create_table(
        "debt_payments",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("debt_id", sa.Integer, sa.ForeignKey("debts.id"), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("amount_minor", sa.BigInteger, nullable=False),
        sa.Column("principal_minor", sa.BigInteger, nullable=True),
        sa.Column("interest_minor", sa.BigInteger, nullable=True),
        sa.Column("transaction_id", sa.Integer, sa.ForeignKey("transactions.id"), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_debt_payments_debt_id", "debt_payments", ["debt_id"])
    op.create_index("ix_debt_payments_transaction_id", "debt_payments", ["transaction_id"])

    # --- p2p_debt_splits ---
    op.create_table(
        "p2p_debt_splits",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("debt_id", sa.Integer, sa.ForeignKey("debts.id"), nullable=False),
        sa.Column("amount_minor", sa.BigInteger, nullable=False),
        sa.Column("due_date", sa.Date, nullable=False),
        sa.Column("paid", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("payment_id", sa.Integer, sa.ForeignKey("debt_payments.id"), nullable=True),
    )
    op.create_index("ix_p2p_debt_splits_debt_id", "p2p_debt_splits", ["debt_id"])

    # --- installment_plans ---
    op.create_table(
        "installment_plans",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("household_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "type",
            sa.Enum("credit_card", "store", "financing_app", name="installmenttype", create_type=False),
            nullable=False,
        ),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("merchant_name", sa.Text, nullable=True),
        sa.Column("source_account_id", sa.Integer, sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column("linked_account_id", sa.Integer, sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column("total_amount_minor", sa.BigInteger, nullable=False),
        sa.Column("monthly_amount_minor", sa.BigInteger, nullable=False),
        sa.Column("total_months", sa.Integer, nullable=False),
        sa.Column("start_month", sa.Date, nullable=False),
        sa.Column("currency", sa.Text, nullable=False),
        sa.Column(
            "status",
            sa.Enum("active", "completed", name="lifecyclestatus", create_type=False),
            nullable=False,
            server_default="active",
        ),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_installment_plans_household_type", "installment_plans", ["household_id", "type"])
    op.create_index("ix_installment_plans_household_source", "installment_plans", ["household_id", "source_account_id"])


def downgrade() -> None:
    """Drop Phase 3 tables and enum types."""
    op.drop_table("p2p_debt_splits")
    op.drop_table("debt_payments")
    op.drop_table("installment_plans")
    op.drop_table("debts")
    op.drop_table("persons")

    op.execute(sa.text("DROP TYPE IF EXISTS repaymentmode"))
    op.execute(sa.text("DROP TYPE IF EXISTS personrelationship"))
    op.execute(sa.text("DROP TYPE IF EXISTS lifecyclestatus"))
    op.execute(sa.text("DROP TYPE IF EXISTS installmenttype"))
    op.execute(sa.text("DROP TYPE IF EXISTS debtstatus"))
    op.execute(sa.text("DROP TYPE IF EXISTS debttype"))
```

- [ ] **Step 2: Run the full test suite to verify models + migration coexist**

Run: `cd backend && uv run pytest -v`
Expected: ALL PASS (tests use in-memory SQLite from `Base.metadata.create_all`, not Alembic)

- [ ] **Step 3: Commit**

```bash
git add backend/alembic/versions/005_create_phase3_tables.py
git commit -m "feat(debts): add Alembic migration for Phase 3 tables (persons, debts, debt_payments, p2p_debt_splits, installment_plans)"
```

---

## Task 4: Amortization Engine (Pure Computation)

**Files:**
- Create: `backend/app/services/amortization.py`
- Test: `backend/tests/services/test_amortization.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/services/test_amortization.py`:

```python
"""Unit tests for the amortization engine — pure computation, no DB."""

import math
from datetime import date

from app.services.amortization import compute_monthly_payment, generate_schedule


class TestComputeMonthlyPayment:
    def test_standard_loan(self):
        """500,000 EGP at 14.5% over 60 months → ~11,773 EGP/month."""
        result = compute_monthly_payment(
            principal_minor=50000000,
            annual_rate_bps=1450,
            tenure_months=60,
        )
        # PMT at 14.5% annual = 1.2083% monthly, 60 months
        # Expected ~1,177,300 minor units. ceil rounds up.
        assert result > 0
        assert 1170000 <= result <= 1185000

    def test_zero_interest_loan(self):
        """0% interest: equal division."""
        result = compute_monthly_payment(
            principal_minor=1200000,
            annual_rate_bps=0,
            tenure_months=12,
        )
        assert result == 100000  # 1,200,000 / 12 = 100,000

    def test_zero_interest_with_remainder(self):
        """0% interest with non-even division rounds up."""
        result = compute_monthly_payment(
            principal_minor=1000000,
            annual_rate_bps=0,
            tenure_months=3,
        )
        # 1,000,000 / 3 = 333,333.33... → ceil = 333,334
        assert result == math.ceil(1000000 / 3)

    def test_one_month_tenure(self):
        """Single payment: monthly payment = principal (0% rate)."""
        result = compute_monthly_payment(
            principal_minor=5000000,
            annual_rate_bps=0,
            tenure_months=1,
        )
        assert result == 5000000

    def test_high_rate(self):
        """25% annual rate — result should be significantly higher."""
        result = compute_monthly_payment(
            principal_minor=10000000,
            annual_rate_bps=2500,
            tenure_months=24,
        )
        assert result > 10000000 // 24  # higher than 0% division


class TestGenerateSchedule:
    def test_schedule_length_matches_tenure(self):
        schedule = generate_schedule(
            principal_minor=1200000,
            annual_rate_bps=0,
            tenure_months=12,
            start_date=date(2024, 1, 1),
            payments=[],
        )
        assert len(schedule) == 12

    def test_zero_rate_schedule_sums_to_principal(self):
        """All principal portions sum to original principal."""
        schedule = generate_schedule(
            principal_minor=1200000,
            annual_rate_bps=0,
            tenure_months=12,
            start_date=date(2024, 1, 1),
            payments=[],
        )
        total_principal = sum(row["principal_minor"] for row in schedule)
        assert total_principal == 1200000

    def test_zero_rate_no_interest(self):
        """0% rate means interest portion is always 0."""
        schedule = generate_schedule(
            principal_minor=1200000,
            annual_rate_bps=0,
            tenure_months=12,
            start_date=date(2024, 1, 1),
            payments=[],
        )
        for row in schedule:
            assert row["interest_minor"] == 0

    def test_schedule_remaining_decreases(self):
        """Remaining balance decreases monotonically."""
        schedule = generate_schedule(
            principal_minor=50000000,
            annual_rate_bps=1450,
            tenure_months=60,
            start_date=date(2024, 1, 1),
            payments=[],
        )
        for i in range(1, len(schedule)):
            assert schedule[i]["remaining_minor"] < schedule[i - 1]["remaining_minor"]

    def test_final_remaining_is_zero(self):
        """After all payments, remaining balance is exactly 0."""
        schedule = generate_schedule(
            principal_minor=50000000,
            annual_rate_bps=1450,
            tenure_months=60,
            start_date=date(2024, 1, 1),
            payments=[],
        )
        assert schedule[-1]["remaining_minor"] == 0

    def test_schedule_dates_are_monthly(self):
        """Dates increment monthly from start_date."""
        schedule = generate_schedule(
            principal_minor=600000,
            annual_rate_bps=0,
            tenure_months=6,
            start_date=date(2024, 1, 1),
            payments=[],
        )
        assert schedule[0]["date"] == date(2024, 2, 1)
        assert schedule[1]["date"] == date(2024, 3, 1)
        assert schedule[5]["date"] == date(2024, 7, 1)

    def test_payment_status_unpaid(self):
        """Without any payments recorded, all rows are 'upcoming' or 'overdue'."""
        schedule = generate_schedule(
            principal_minor=600000,
            annual_rate_bps=0,
            tenure_months=3,
            start_date=date(2020, 1, 1),  # past dates
            payments=[],
        )
        for row in schedule:
            assert row["status"] in ("overdue", "upcoming")

    def test_interest_bearing_interest_decreases(self):
        """For loans with interest, interest portion decreases over time."""
        schedule = generate_schedule(
            principal_minor=50000000,
            annual_rate_bps=1450,
            tenure_months=60,
            start_date=date(2024, 1, 1),
            payments=[],
        )
        # First month has more interest than last month
        assert schedule[0]["interest_minor"] > schedule[-1]["interest_minor"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/services/test_amortization.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.amortization'`

- [ ] **Step 3: Implement the amortization engine**

Create `backend/app/services/amortization.py`:

```python
"""Amortization engine — pure computation, no DB, no HTTP awareness."""

import math
from datetime import date
from typing import Any

from dateutil.relativedelta import relativedelta


def compute_monthly_payment(
    principal_minor: int, annual_rate_bps: int, tenure_months: int
) -> int:
    """Compute fixed monthly payment via PMT formula.

    Args:
        principal_minor: Loan principal in minor currency units.
        annual_rate_bps: Annual interest rate in basis points (1450 = 14.5%).
        tenure_months: Number of monthly payments.

    Returns:
        Monthly payment in minor units, rounded up (math.ceil).
    """
    if tenure_months <= 0:
        raise ValueError("tenure_months must be positive")
    if principal_minor <= 0:
        raise ValueError("principal_minor must be positive")

    if annual_rate_bps == 0:
        return math.ceil(principal_minor / tenure_months)

    monthly_rate = annual_rate_bps / (10_000 * 12)
    factor = (1 + monthly_rate) ** tenure_months
    payment = principal_minor * (monthly_rate * factor) / (factor - 1)
    return math.ceil(payment)


def generate_schedule(
    principal_minor: int,
    annual_rate_bps: int,
    tenure_months: int,
    start_date: date,
    payments: list[Any],
) -> list[dict[str, Any]]:
    """Generate full amortization schedule with payment statuses.

    Args:
        principal_minor: Loan principal in minor currency units.
        annual_rate_bps: Annual interest rate in basis points.
        tenure_months: Number of monthly payments.
        start_date: Loan start date (first payment is 1 month after).
        payments: List of DebtPayment objects (or dicts with 'date' and 'amount_minor').

    Returns:
        List of schedule row dicts, one per month.
    """
    monthly_payment = compute_monthly_payment(principal_minor, annual_rate_bps, tenure_months)
    monthly_rate = annual_rate_bps / (10_000 * 12) if annual_rate_bps > 0 else 0.0

    # Index payments by approximate month for status lookup
    payment_dates = set()
    for p in payments:
        p_date = p.date if hasattr(p, "date") else p["date"]
        payment_dates.add(p_date)

    schedule: list[dict[str, Any]] = []
    remaining = principal_minor
    today = date.today()

    for i in range(tenure_months):
        payment_date = start_date + relativedelta(months=i + 1)

        if annual_rate_bps == 0:
            interest = 0
            if i == tenure_months - 1:
                # Final payment absorbs remainder
                principal_portion = remaining
            else:
                principal_portion = math.ceil(principal_minor / tenure_months)
        else:
            interest = math.ceil(remaining * monthly_rate)
            if i == tenure_months - 1:
                # Final payment absorbs rounding error
                principal_portion = remaining
                interest = monthly_payment - remaining if monthly_payment > remaining else interest
            else:
                principal_portion = monthly_payment - interest

        remaining -= principal_portion

        # Determine status
        has_payment = any(
            _dates_match_month(pd, payment_date) for pd in payment_dates
        )
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


def _dates_match_month(d1: date, d2: date) -> bool:
    """Check if two dates are in the same year-month."""
    return d1.year == d2.year and d1.month == d2.month
```

- [ ] **Step 4: Check if `python-dateutil` is available**

Run: `cd backend && uv run python -c "from dateutil.relativedelta import relativedelta; print('OK')"`

If it fails, add the dependency:
Run: `cd backend && uv add python-dateutil`

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/services/test_amortization.py -v`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/amortization.py backend/tests/services/test_amortization.py
git commit -m "feat(debts): add amortization engine with PMT formula and schedule generation"
```

---

## Task 5: Person Schemas + Service + Router

**Files:**
- Create: `backend/app/schemas/person.py`
- Create: `backend/app/services/person.py`
- Create: `backend/app/routers/persons.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/routers/test_persons.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/routers/test_persons.py`:

```python
import pytest


@pytest.mark.asyncio
async def test_create_person_returns_201(client):
    response = await client.post(
        "/api/v1/persons",
        json={
            "name": "Ahmed Ali",
            "name_ar": "أحمد علي",
            "relationship": "family",
            "phone": "+201234567890",
        },
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == "Ahmed Ali"
    assert data["name_ar"] == "أحمد علي"
    assert data["relationship"] == "family"
    assert data["id"] is not None


@pytest.mark.asyncio
async def test_create_person_minimal(client):
    """Only name is required."""
    response = await client.post(
        "/api/v1/persons",
        json={"name": "Sara"},
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == "Sara"
    assert data["relationship"] is None


@pytest.mark.asyncio
async def test_list_persons_returns_paginated(client):
    await client.post("/api/v1/persons", json={"name": "Person A"})
    await client.post("/api/v1/persons", json={"name": "Person B"})
    response = await client.get("/api/v1/persons")
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert "meta" in body
    assert body["meta"]["total"] >= 2


@pytest.mark.asyncio
async def test_get_person_by_id(client):
    create_resp = await client.post("/api/v1/persons", json={"name": "Test"})
    person_id = create_resp.json()["data"]["id"]
    response = await client.get(f"/api/v1/persons/{person_id}")
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Test"


@pytest.mark.asyncio
async def test_get_person_not_found(client):
    response = await client.get("/api/v1/persons/99999")
    assert response.status_code == 404
    assert response.json()["detail"]["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_update_person(client):
    create_resp = await client.post("/api/v1/persons", json={"name": "Old Name"})
    person_id = create_resp.json()["data"]["id"]
    response = await client.put(
        f"/api/v1/persons/{person_id}",
        json={"name": "New Name", "relationship": "friend"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "New Name"
    assert response.json()["data"]["relationship"] == "friend"


@pytest.mark.asyncio
async def test_delete_person_soft_deletes(client):
    create_resp = await client.post("/api/v1/persons", json={"name": "To Delete"})
    person_id = create_resp.json()["data"]["id"]
    delete_resp = await client.delete(f"/api/v1/persons/{person_id}")
    assert delete_resp.status_code == 204
    # Should not appear in list
    list_resp = await client.get("/api/v1/persons")
    ids = [p["id"] for p in list_resp.json()["data"]]
    assert person_id not in ids


@pytest.mark.asyncio
async def test_delete_person_with_active_debt_fails(client, db_session):
    """Cannot delete a person who has active debts."""
    from datetime import date

    from app.models.debt import Debt
    from app.models.person import Person
    from tests.conftest import TEST_HOUSEHOLD_ID

    person = Person(household_id=TEST_HOUSEHOLD_ID, name="Has Debt")
    db_session.add(person)
    await db_session.flush()

    debt = Debt(
        household_id=TEST_HOUSEHOLD_ID,
        type="personal_lent",
        person_id=person.id,
        name="Lent to friend",
        principal_minor=500000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=1,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=500000,
        status="active",
    )
    db_session.add(debt)
    await db_session.commit()

    response = await client.delete(f"/api/v1/persons/{person.id}")
    assert response.status_code == 409
    assert response.json()["detail"]["error"]["code"] == "PERSON_HAS_ACTIVE_DEBTS"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/routers/test_persons.py -v`
Expected: FAIL with `starlette.routing: 404` (router not registered)

- [ ] **Step 3: Create `backend/app/schemas/person.py`**

```python
from pydantic import BaseModel


class PersonCreate(BaseModel):
    name: str
    name_ar: str | None = None
    phone: str | None = None
    email: str | None = None
    relationship: str | None = None
    notes: str | None = None


class PersonUpdate(BaseModel):
    name: str | None = None
    name_ar: str | None = None
    phone: str | None = None
    email: str | None = None
    relationship: str | None = None
    notes: str | None = None


class PersonResponse(BaseModel):
    id: int
    name: str
    name_ar: str | None = None
    phone: str | None = None
    email: str | None = None
    relationship: str | None = None
    notes: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Create `backend/app/services/person.py`**

```python
"""Person business logic. No HTTP awareness."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.debt import Debt
from app.models.person import Person
from app.schemas.person import PersonCreate, PersonUpdate


async def list_persons(
    session: AsyncSession,
    household_id: uuid.UUID,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Person], int]:
    count_q = select(func.count(Person.id)).where(
        Person.household_id == household_id,
        Person.is_active.is_(True),
    )
    total = (await session.execute(count_q)).scalar_one()

    q = (
        select(Person)
        .where(Person.household_id == household_id, Person.is_active.is_(True))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .order_by(Person.id)
    )
    result = await session.execute(q)
    return list(result.scalars().all()), total


async def get_person(
    session: AsyncSession,
    household_id: uuid.UUID,
    person_id: int,
) -> Person | None:
    q = select(Person).where(
        Person.id == person_id,
        Person.household_id == household_id,
        Person.is_active.is_(True),
    )
    result = await session.execute(q)
    return result.scalar_one_or_none()


async def create_person(
    session: AsyncSession,
    household_id: uuid.UUID,
    data: PersonCreate,
) -> Person:
    person = Person(
        household_id=household_id,
        name=data.name,
        name_ar=data.name_ar,
        phone=data.phone,
        email=data.email,
        relationship=data.relationship,
        notes=data.notes,
    )
    session.add(person)
    await session.flush()
    return person


async def update_person(
    session: AsyncSession,
    person: Person,
    data: PersonUpdate,
) -> Person:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(person, field, value)
    await session.flush()
    return person


async def has_active_debts(
    session: AsyncSession,
    person_id: int,
) -> bool:
    """Check if a person has any active debts."""
    q = select(func.count(Debt.id)).where(
        Debt.person_id == person_id,
        Debt.is_active.is_(True),
        Debt.status == "active",
    )
    count = (await session.execute(q)).scalar_one()
    return count > 0


async def soft_delete_person(
    session: AsyncSession,
    person: Person,
) -> None:
    person.is_active = False
    await session.flush()
```

- [ ] **Step 5: Create `backend/app/routers/persons.py`**

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.schemas.common import ErrorDetail, ErrorResponse, PaginationMeta, SuccessResponse
from app.schemas.person import PersonCreate, PersonResponse, PersonUpdate
from app.services import person as person_service

router = APIRouter(prefix="/api/v1/persons", tags=["persons"])


def _person_to_response(person) -> PersonResponse:
    rel = person.relationship
    return PersonResponse(
        id=person.id,
        name=person.name,
        name_ar=person.name_ar,
        phone=person.phone,
        email=person.email,
        relationship=rel.value if hasattr(rel, "value") else rel,
        notes=person.notes,
        is_active=person.is_active,
    )


@router.get("")
async def list_persons(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    persons, total = await person_service.list_persons(session, household_id, page, page_size)
    items = [_person_to_response(p).model_dump() for p in persons]
    return SuccessResponse(
        data=items,
        meta=PaginationMeta(total=total, page=page, page_size=page_size),
    )


@router.get("/{person_id}")
async def get_person(
    person_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    person = await person_service.get_person(session, household_id, person_id)
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Person not found")
            ).model_dump(),
        )
    return SuccessResponse(data=_person_to_response(person).model_dump())


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_person(
    data: PersonCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    person = await person_service.create_person(session, household_id, data)
    return SuccessResponse(data=_person_to_response(person).model_dump())


@router.put("/{person_id}")
async def update_person(
    person_id: int,
    data: PersonUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    person = await person_service.get_person(session, household_id, person_id)
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Person not found")
            ).model_dump(),
        )
    person = await person_service.update_person(session, person, data)
    return SuccessResponse(data=_person_to_response(person).model_dump())


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_person(
    person_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> None:
    person = await person_service.get_person(session, household_id, person_id)
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Person not found")
            ).model_dump(),
        )
    if await person_service.has_active_debts(session, person.id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorResponse(
                error=ErrorDetail(
                    code="PERSON_HAS_ACTIVE_DEBTS",
                    message="Cannot delete person with active debts",
                )
            ).model_dump(),
        )
    await person_service.soft_delete_person(session, person)
```

- [ ] **Step 6: Register persons router in `backend/app/main.py`**

Add to imports:
```python
from app.routers.persons import router as persons_router
```

Add after the last `app.include_router(...)` line:
```python
app.include_router(persons_router)
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/routers/test_persons.py -v`
Expected: ALL PASS

- [ ] **Step 8: Run full test suite**

Run: `cd backend && uv run pytest -v`
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add backend/app/schemas/person.py backend/app/services/person.py \
  backend/app/routers/persons.py backend/app/main.py \
  backend/tests/routers/test_persons.py
git commit -m "feat(persons): add Person CRUD with soft-delete guard for active debts"
```

---

## Task 6: Debt Schemas

**Files:**
- Create: `backend/app/schemas/debt.py`

- [ ] **Step 1: Create debt schemas**

Create `backend/app/schemas/debt.py`:

```python
from datetime import date

from pydantic import BaseModel, Field


class DebtCreate(BaseModel):
    type: str  # "bank_loan" (P2P types added in 3B)
    name: str
    institution: str | None = None
    principal_minor: int = Field(gt=0)
    currency: str = Field(max_length=3)
    annual_rate_percent: float = Field(ge=0, default=0)  # Backend converts to bps
    tenure_months: int = Field(gt=0)
    start_date: date
    linked_account_id: int | None = None
    notes: str | None = None
    # P2P fields (used in 3B, ignored for bank_loan)
    person_id: int | None = None
    repayment_mode: str | None = None
    due_date: date | None = None


class DebtUpdate(BaseModel):
    name: str | None = None
    institution: str | None = None
    linked_account_id: int | None = None
    notes: str | None = None


class DebtResponse(BaseModel):
    id: int
    type: str
    person_id: int | None = None
    linked_account_id: int | None = None
    name: str
    institution: str | None = None
    principal_minor: int
    currency: str
    annual_rate_bps: int
    tenure_months: int
    start_date: date
    monthly_payment_minor: int
    repayment_mode: str | None = None
    due_date: date | None = None
    status: str
    notes: str | None = None
    is_active: bool
    total_paid_minor: int = 0
    remaining_minor: int = 0

    model_config = {"from_attributes": True}


class PaymentCreate(BaseModel):
    date: date
    amount_minor: int = Field(gt=0)
    transaction_id: int | None = None
    notes: str | None = None


class PaymentResponse(BaseModel):
    id: int
    debt_id: int
    date: date
    amount_minor: int
    principal_minor: int | None = None
    interest_minor: int | None = None
    transaction_id: int | None = None
    notes: str | None = None

    model_config = {"from_attributes": True}


class ScheduleRow(BaseModel):
    payment_number: int
    date: date
    payment_minor: int
    principal_minor: int
    interest_minor: int
    remaining_minor: int
    status: str  # paid | overdue | upcoming


class MatchSuggestion(BaseModel):
    transaction_id: int
    date: date
    amount_minor: int
    description: str
    score: float  # 0.0–1.0
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/debt.py
git commit -m "feat(debts): add Pydantic schemas for debts, payments, schedule, match suggestions"
```

---

## Task 7: Debt Service (Bank Loans + Payments + Auto-Match)

**Files:**
- Create: `backend/app/services/debt.py`

- [ ] **Step 1: Create the debt service**

Create `backend/app/services/debt.py`:

```python
"""Debt business logic. No HTTP awareness."""

import uuid
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.debt import Debt
from app.models.debt_payment import DebtPayment
from app.models.transaction import Transaction
from app.schemas.debt import DebtCreate, DebtUpdate
from app.services.amortization import compute_monthly_payment, generate_schedule


async def list_debts(
    session: AsyncSession,
    household_id: uuid.UUID,
    debt_type: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Debt], int]:
    base = select(Debt).where(
        Debt.household_id == household_id,
        Debt.is_active.is_(True),
    )
    count_base = select(func.count(Debt.id)).where(
        Debt.household_id == household_id,
        Debt.is_active.is_(True),
    )
    if debt_type:
        base = base.where(Debt.type == debt_type)
        count_base = count_base.where(Debt.type == debt_type)
    if status:
        base = base.where(Debt.status == status)
        count_base = count_base.where(Debt.status == status)

    total = (await session.execute(count_base)).scalar_one()
    q = base.offset((page - 1) * page_size).limit(page_size).order_by(Debt.id)
    result = await session.execute(q)
    return list(result.scalars().all()), total


async def get_debt(
    session: AsyncSession,
    household_id: uuid.UUID,
    debt_id: int,
) -> Debt | None:
    q = select(Debt).where(
        Debt.id == debt_id,
        Debt.household_id == household_id,
        Debt.is_active.is_(True),
    )
    result = await session.execute(q)
    return result.scalar_one_or_none()


async def create_bank_loan(
    session: AsyncSession,
    household_id: uuid.UUID,
    data: DebtCreate,
) -> Debt:
    """Create a bank loan debt with computed monthly payment."""
    annual_rate_bps = int(round(data.annual_rate_percent * 100))
    monthly_payment = compute_monthly_payment(
        data.principal_minor, annual_rate_bps, data.tenure_months
    )

    # Validate linked_account_id if provided
    if data.linked_account_id:
        await _validate_linked_account(
            session, household_id, data.linked_account_id, "bank_account"
        )

    debt = Debt(
        household_id=household_id,
        type="bank_loan",
        name=data.name,
        institution=data.institution,
        principal_minor=data.principal_minor,
        currency=data.currency,
        annual_rate_bps=annual_rate_bps,
        tenure_months=data.tenure_months,
        start_date=data.start_date,
        monthly_payment_minor=monthly_payment,
        linked_account_id=data.linked_account_id,
        notes=data.notes,
        status="active",
    )
    session.add(debt)
    await session.flush()
    return debt


async def update_debt(
    session: AsyncSession,
    household_id: uuid.UUID,
    debt: Debt,
    data: DebtUpdate,
) -> Debt:
    """Update mutable fields. Raises if immutable fields would change after payments."""
    update_data = data.model_dump(exclude_unset=True)

    # Validate linked_account_id change
    if "linked_account_id" in update_data and update_data["linked_account_id"] is not None:
        expected_type = "bank_account" if debt.type == "bank_loan" else None
        if expected_type:
            await _validate_linked_account(
                session, household_id, update_data["linked_account_id"], expected_type
            )

    for field, value in update_data.items():
        setattr(debt, field, value)
    await session.flush()
    return debt


async def has_payments(session: AsyncSession, debt_id: int) -> bool:
    q = select(func.count(DebtPayment.id)).where(DebtPayment.debt_id == debt_id)
    count = (await session.execute(q)).scalar_one()
    return count > 0


async def soft_delete_debt(session: AsyncSession, debt: Debt) -> None:
    debt.is_active = False
    await session.flush()


async def get_amortization_schedule(
    session: AsyncSession, debt: Debt
) -> list[dict]:
    payments = await _get_payments(session, debt.id)
    return generate_schedule(
        principal_minor=debt.principal_minor,
        annual_rate_bps=debt.annual_rate_bps,
        tenure_months=debt.tenure_months,
        start_date=debt.start_date,
        payments=payments,
    )


async def record_payment(
    session: AsyncSession,
    debt: Debt,
    payment_date: date,
    amount_minor: int,
    transaction_id: int | None = None,
    notes: str | None = None,
) -> DebtPayment:
    """Record a payment, auto-computing principal/interest split for bank loans."""
    total_paid = await _total_paid(session, debt.id)
    remaining = debt.principal_minor - total_paid

    if amount_minor > remaining:
        raise ValueError("PAYMENT_EXCEEDS_REMAINING")

    principal_portion: int | None = None
    interest_portion: int | None = None

    if debt.type == "bank_loan" and debt.annual_rate_bps > 0:
        schedule = generate_schedule(
            principal_minor=debt.principal_minor,
            annual_rate_bps=debt.annual_rate_bps,
            tenure_months=debt.tenure_months,
            start_date=debt.start_date,
            payments=[],
        )
        # Find the matching schedule row by month
        matching_row = None
        for row in schedule:
            if row["status"] != "paid" and row["date"].month == payment_date.month and row["date"].year == payment_date.year:
                matching_row = row
                break
        if not matching_row:
            # Fallback: use first unpaid row
            for row in schedule:
                if row["status"] != "paid":
                    matching_row = row
                    break

        if matching_row and matching_row["payment_minor"] > 0:
            interest_ratio = matching_row["interest_minor"] / matching_row["payment_minor"]
            interest_portion = round(amount_minor * interest_ratio)
            principal_portion = amount_minor - interest_portion
        else:
            principal_portion = amount_minor
            interest_portion = 0
    elif debt.type == "bank_loan":
        # 0% interest
        principal_portion = amount_minor
        interest_portion = 0

    payment = DebtPayment(
        debt_id=debt.id,
        date=payment_date,
        amount_minor=amount_minor,
        principal_minor=principal_portion,
        interest_minor=interest_portion,
        transaction_id=transaction_id,
        notes=notes,
    )
    session.add(payment)
    await session.flush()

    # Check if debt is fully paid
    new_total = total_paid + amount_minor
    if new_total >= debt.principal_minor:
        debt.status = "paid_off"
        await session.flush()

    return payment


async def get_payments(
    session: AsyncSession, debt_id: int
) -> list[DebtPayment]:
    return await _get_payments(session, debt_id)


async def mark_paid(session: AsyncSession, debt: Debt) -> Debt:
    debt.status = "paid_off"
    await session.flush()
    return debt


async def get_match_suggestions(
    session: AsyncSession,
    household_id: uuid.UUID,
    debt: Debt,
) -> list[dict]:
    """Find transactions that may match upcoming payments."""
    if not debt.linked_account_id:
        return []

    schedule = await get_amortization_schedule(session, debt)
    unpaid_rows = [r for r in schedule if r["status"] in ("overdue", "upcoming")]
    if not unpaid_rows:
        return []

    suggestions = []
    for row in unpaid_rows[:3]:  # Check next 3 unpaid periods
        window_start = row["date"] - timedelta(days=5)
        window_end = row["date"] + timedelta(days=5)
        expected = row["payment_minor"]
        tolerance = int(expected * 0.05)

        q = select(Transaction).where(
            Transaction.household_id == household_id,
            Transaction.account_id == debt.linked_account_id,
            Transaction.is_active.is_(True),
            Transaction.date >= window_start,
            Transaction.date <= window_end,
            Transaction.amount_minor < 0,  # Debits only
        )
        txs = (await session.execute(q)).scalars().all()

        for tx in txs:
            tx_amount = abs(tx.amount_minor)
            if abs(tx_amount - expected) <= tolerance:
                if tx_amount == expected:
                    score = 1.0
                else:
                    score = 0.8 + 0.2 * (1 - abs(tx_amount - expected) / tolerance)
                suggestions.append(
                    {
                        "transaction_id": tx.id,
                        "date": tx.date,
                        "amount_minor": tx_amount,
                        "description": tx.description,
                        "score": round(score, 2),
                    }
                )

    suggestions.sort(key=lambda s: s["score"], reverse=True)
    return suggestions


async def compute_debt_totals(
    session: AsyncSession, debt_id: int
) -> tuple[int, int]:
    """Return (total_paid, remaining) for a debt."""
    total_paid = await _total_paid(session, debt_id)
    debt = (await session.execute(select(Debt).where(Debt.id == debt_id))).scalar_one()
    return total_paid, debt.principal_minor - total_paid


# --- Private helpers ---

async def _get_payments(session: AsyncSession, debt_id: int) -> list[DebtPayment]:
    q = (
        select(DebtPayment)
        .where(DebtPayment.debt_id == debt_id)
        .order_by(DebtPayment.date)
    )
    result = await session.execute(q)
    return list(result.scalars().all())


async def _total_paid(session: AsyncSession, debt_id: int) -> int:
    q = select(func.coalesce(func.sum(DebtPayment.amount_minor), 0)).where(
        DebtPayment.debt_id == debt_id
    )
    return (await session.execute(q)).scalar_one()


async def _validate_linked_account(
    session: AsyncSession,
    household_id: uuid.UUID,
    account_id: int,
    expected_type: str,
) -> None:
    """Validate that linked account exists, is active, and has the expected type."""
    q = select(Account).where(
        Account.id == account_id,
        Account.household_id == household_id,
        Account.is_active.is_(True),
    )
    account = (await session.execute(q)).scalar_one_or_none()
    if not account:
        raise ValueError("LINKED_ACCOUNT_NOT_FOUND")
    acct_type = account.type.value if hasattr(account.type, "value") else account.type
    if acct_type != expected_type:
        raise ValueError(f"INVALID_ACCOUNT_TYPE: expected {expected_type}, got {acct_type}")
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/debt.py
git commit -m "feat(debts): add debt service with bank loan CRUD, payments, auto-match"
```

---

## Task 8: Debts Router + Integration Tests

**Files:**
- Create: `backend/app/routers/debts.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/routers/test_debts.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/routers/test_debts.py`:

```python
import pytest


def _create_loan_payload(**overrides):
    payload = {
        "type": "bank_loan",
        "name": "Car Loan - CIB",
        "institution": "CIB",
        "principal_minor": 50000000,
        "currency": "EGP",
        "annual_rate_percent": 14.5,
        "tenure_months": 60,
        "start_date": "2024-01-01",
    }
    payload.update(overrides)
    return payload


@pytest.mark.asyncio
async def test_create_bank_loan_returns_201(client):
    response = await client.post("/api/v1/debts", json=_create_loan_payload())
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == "Car Loan - CIB"
    assert data["type"] == "bank_loan"
    assert data["annual_rate_bps"] == 1450
    assert data["monthly_payment_minor"] > 0
    assert data["status"] == "active"


@pytest.mark.asyncio
async def test_create_zero_rate_loan(client):
    response = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(
            name="0% Loan",
            principal_minor=1200000,
            annual_rate_percent=0,
            tenure_months=12,
        ),
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["annual_rate_bps"] == 0
    assert data["monthly_payment_minor"] == 100000


@pytest.mark.asyncio
async def test_create_loan_with_linked_bank_account(client):
    """Bank loan can link to a bank account."""
    acct_resp = await client.post(
        "/api/v1/accounts",
        json={"name": "CIB Savings", "type": "bank_account", "currency": "EGP"},
    )
    acct_id = acct_resp.json()["data"]["id"]
    response = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(linked_account_id=acct_id),
    )
    assert response.status_code == 201
    assert response.json()["data"]["linked_account_id"] == acct_id


@pytest.mark.asyncio
async def test_create_loan_with_wrong_account_type_fails(client):
    """Bank loan must link to bank_account, not credit_card."""
    acct_resp = await client.post(
        "/api/v1/accounts",
        json={"name": "My CC", "type": "credit_card", "currency": "EGP"},
    )
    acct_id = acct_resp.json()["data"]["id"]
    response = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(linked_account_id=acct_id),
    )
    assert response.status_code == 422
    assert "INVALID_ACCOUNT_TYPE" in response.json()["detail"]["error"]["code"]


@pytest.mark.asyncio
async def test_list_debts_returns_paginated(client):
    await client.post("/api/v1/debts", json=_create_loan_payload(name="Loan A"))
    await client.post("/api/v1/debts", json=_create_loan_payload(name="Loan B"))
    response = await client.get("/api/v1/debts")
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] >= 2


@pytest.mark.asyncio
async def test_list_debts_filter_by_type(client):
    await client.post("/api/v1/debts", json=_create_loan_payload())
    response = await client.get("/api/v1/debts?type=bank_loan")
    assert response.status_code == 200
    assert all(d["type"] == "bank_loan" for d in response.json()["data"])


@pytest.mark.asyncio
async def test_get_debt_by_id(client):
    create_resp = await client.post("/api/v1/debts", json=_create_loan_payload())
    debt_id = create_resp.json()["data"]["id"]
    response = await client.get(f"/api/v1/debts/{debt_id}")
    assert response.status_code == 200
    assert response.json()["data"]["id"] == debt_id


@pytest.mark.asyncio
async def test_get_debt_not_found(client):
    response = await client.get("/api/v1/debts/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_debt(client):
    create_resp = await client.post("/api/v1/debts", json=_create_loan_payload())
    debt_id = create_resp.json()["data"]["id"]
    response = await client.put(
        f"/api/v1/debts/{debt_id}",
        json={"name": "Updated Loan Name"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Updated Loan Name"


@pytest.mark.asyncio
async def test_delete_debt_soft_deletes(client):
    create_resp = await client.post("/api/v1/debts", json=_create_loan_payload())
    debt_id = create_resp.json()["data"]["id"]
    delete_resp = await client.delete(f"/api/v1/debts/{debt_id}")
    assert delete_resp.status_code == 204
    list_resp = await client.get("/api/v1/debts")
    ids = [d["id"] for d in list_resp.json()["data"]]
    assert debt_id not in ids


@pytest.mark.asyncio
async def test_get_amortization_schedule(client):
    create_resp = await client.post("/api/v1/debts", json=_create_loan_payload())
    debt_id = create_resp.json()["data"]["id"]
    response = await client.get(f"/api/v1/debts/{debt_id}/amortization")
    assert response.status_code == 200
    schedule = response.json()["data"]
    assert len(schedule) == 60
    assert schedule[-1]["remaining_minor"] == 0


@pytest.mark.asyncio
async def test_record_payment(client):
    create_resp = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(
            principal_minor=1200000,
            annual_rate_percent=0,
            tenure_months=12,
        ),
    )
    debt_id = create_resp.json()["data"]["id"]
    pay_resp = await client.post(
        f"/api/v1/debts/{debt_id}/payments",
        json={"date": "2024-02-01", "amount_minor": 100000},
    )
    assert pay_resp.status_code == 201
    payment = pay_resp.json()["data"]
    assert payment["amount_minor"] == 100000
    assert payment["principal_minor"] == 100000
    assert payment["interest_minor"] == 0


@pytest.mark.asyncio
async def test_payment_updates_totals(client):
    create_resp = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(
            principal_minor=300000,
            annual_rate_percent=0,
            tenure_months=3,
        ),
    )
    debt_id = create_resp.json()["data"]["id"]
    # Record 3 payments
    for month in range(2, 5):
        await client.post(
            f"/api/v1/debts/{debt_id}/payments",
            json={"date": f"2024-0{month}-01", "amount_minor": 100000},
        )
    # Debt should be paid off
    debt_resp = await client.get(f"/api/v1/debts/{debt_id}")
    assert debt_resp.json()["data"]["status"] == "paid_off"


@pytest.mark.asyncio
async def test_payment_exceeding_remaining_fails(client):
    create_resp = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(
            principal_minor=100000,
            annual_rate_percent=0,
            tenure_months=1,
        ),
    )
    debt_id = create_resp.json()["data"]["id"]
    response = await client.post(
        f"/api/v1/debts/{debt_id}/payments",
        json={"date": "2024-02-01", "amount_minor": 200000},
    )
    assert response.status_code == 422
    assert "PAYMENT_EXCEEDS_REMAINING" in response.json()["detail"]["error"]["code"]


@pytest.mark.asyncio
async def test_list_payments(client):
    create_resp = await client.post(
        "/api/v1/debts",
        json=_create_loan_payload(
            principal_minor=600000,
            annual_rate_percent=0,
            tenure_months=6,
        ),
    )
    debt_id = create_resp.json()["data"]["id"]
    await client.post(
        f"/api/v1/debts/{debt_id}/payments",
        json={"date": "2024-02-01", "amount_minor": 100000},
    )
    response = await client.get(f"/api/v1/debts/{debt_id}/payments")
    assert response.status_code == 200
    assert len(response.json()["data"]) == 1


@pytest.mark.asyncio
async def test_mark_paid(client):
    create_resp = await client.post("/api/v1/debts", json=_create_loan_payload())
    debt_id = create_resp.json()["data"]["id"]
    response = await client.post(f"/api/v1/debts/{debt_id}/mark-paid")
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "paid_off"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/routers/test_debts.py -v`
Expected: FAIL (404 — router not registered)

- [ ] **Step 3: Create `backend/app/routers/debts.py`**

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.schemas.common import ErrorDetail, ErrorResponse, PaginationMeta, SuccessResponse
from app.schemas.debt import (
    DebtCreate,
    DebtResponse,
    DebtUpdate,
    MatchSuggestion,
    PaymentCreate,
    PaymentResponse,
    ScheduleRow,
)
from app.services import debt as debt_service

router = APIRouter(prefix="/api/v1/debts", tags=["debts"])


def _debt_to_response(debt, total_paid: int = 0) -> DebtResponse:
    d_type = debt.type
    d_status = debt.status
    d_mode = debt.repayment_mode
    return DebtResponse(
        id=debt.id,
        type=d_type.value if hasattr(d_type, "value") else d_type,
        person_id=debt.person_id,
        linked_account_id=debt.linked_account_id,
        name=debt.name,
        institution=debt.institution,
        principal_minor=debt.principal_minor,
        currency=debt.currency,
        annual_rate_bps=debt.annual_rate_bps,
        tenure_months=debt.tenure_months,
        start_date=debt.start_date,
        monthly_payment_minor=debt.monthly_payment_minor,
        repayment_mode=d_mode.value if hasattr(d_mode, "value") else d_mode,
        due_date=debt.due_date,
        status=d_status.value if hasattr(d_status, "value") else d_status,
        notes=debt.notes,
        is_active=debt.is_active,
        total_paid_minor=total_paid,
        remaining_minor=debt.principal_minor - total_paid,
    )


def _payment_to_response(payment) -> PaymentResponse:
    return PaymentResponse(
        id=payment.id,
        debt_id=payment.debt_id,
        date=payment.date,
        amount_minor=payment.amount_minor,
        principal_minor=payment.principal_minor,
        interest_minor=payment.interest_minor,
        transaction_id=payment.transaction_id,
        notes=payment.notes,
    )


@router.get("")
async def list_debts(
    type: str | None = Query(None),
    status: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    debts, total = await debt_service.list_debts(
        session, household_id, type, status, page, page_size
    )
    items = []
    for d in debts:
        paid, _ = await debt_service.compute_debt_totals(session, d.id)
        items.append(_debt_to_response(d, paid).model_dump())
    return SuccessResponse(
        data=items,
        meta=PaginationMeta(total=total, page=page, page_size=page_size),
    )


@router.get("/{debt_id}")
async def get_debt(
    debt_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    debt = await debt_service.get_debt(session, household_id, debt_id)
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Debt not found")
            ).model_dump(),
        )
    paid, _ = await debt_service.compute_debt_totals(session, debt.id)
    return SuccessResponse(data=_debt_to_response(debt, paid).model_dump())


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_debt(
    data: DebtCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    try:
        if data.type == "bank_loan":
            debt = await debt_service.create_bank_loan(session, household_id, data)
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=ErrorResponse(
                    error=ErrorDetail(
                        code="UNSUPPORTED_DEBT_TYPE",
                        message=f"Debt type '{data.type}' is not supported in this phase",
                    )
                ).model_dump(),
            )
    except ValueError as e:
        err_code = str(e)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorResponse(
                error=ErrorDetail(code=err_code, message=err_code)
            ).model_dump(),
        )
    return SuccessResponse(data=_debt_to_response(debt).model_dump())


@router.put("/{debt_id}")
async def update_debt(
    debt_id: int,
    data: DebtUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    debt = await debt_service.get_debt(session, household_id, debt_id)
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Debt not found")
            ).model_dump(),
        )
    try:
        debt = await debt_service.update_debt(session, household_id, debt, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorResponse(
                error=ErrorDetail(code=str(e), message=str(e))
            ).model_dump(),
        )
    paid, _ = await debt_service.compute_debt_totals(session, debt.id)
    return SuccessResponse(data=_debt_to_response(debt, paid).model_dump())


@router.delete("/{debt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_debt(
    debt_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> None:
    debt = await debt_service.get_debt(session, household_id, debt_id)
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Debt not found")
            ).model_dump(),
        )
    await debt_service.soft_delete_debt(session, debt)


@router.get("/{debt_id}/amortization")
async def get_amortization(
    debt_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    debt = await debt_service.get_debt(session, household_id, debt_id)
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Debt not found")
            ).model_dump(),
        )
    schedule = await debt_service.get_amortization_schedule(session, debt)
    rows = [ScheduleRow(**row).model_dump() for row in schedule]
    return SuccessResponse(data=rows)


@router.get("/{debt_id}/payments")
async def list_payments(
    debt_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    debt = await debt_service.get_debt(session, household_id, debt_id)
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Debt not found")
            ).model_dump(),
        )
    payments = await debt_service.get_payments(session, debt.id)
    items = [_payment_to_response(p).model_dump() for p in payments]
    return SuccessResponse(data=items)


@router.post("/{debt_id}/payments", status_code=status.HTTP_201_CREATED)
async def record_payment(
    debt_id: int,
    data: PaymentCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    debt = await debt_service.get_debt(session, household_id, debt_id)
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Debt not found")
            ).model_dump(),
        )
    try:
        payment = await debt_service.record_payment(
            session, debt, data.date, data.amount_minor, data.transaction_id, data.notes
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorResponse(
                error=ErrorDetail(code=str(e), message=str(e))
            ).model_dump(),
        )
    return SuccessResponse(data=_payment_to_response(payment).model_dump())


@router.get("/{debt_id}/match-suggestions")
async def get_match_suggestions(
    debt_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    debt = await debt_service.get_debt(session, household_id, debt_id)
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Debt not found")
            ).model_dump(),
        )
    suggestions = await debt_service.get_match_suggestions(session, household_id, debt)
    items = [MatchSuggestion(**s).model_dump() for s in suggestions]
    return SuccessResponse(data=items)


@router.post("/{debt_id}/mark-paid")
async def mark_debt_paid(
    debt_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    debt = await debt_service.get_debt(session, household_id, debt_id)
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Debt not found")
            ).model_dump(),
        )
    debt = await debt_service.mark_paid(session, debt)
    paid, _ = await debt_service.compute_debt_totals(session, debt.id)
    return SuccessResponse(data=_debt_to_response(debt, paid).model_dump())
```

- [ ] **Step 4: Register debts router in `backend/app/main.py`**

Add to imports:
```python
from app.routers.debts import router as debts_router
```

Add after `app.include_router(persons_router)`:
```python
app.include_router(debts_router)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/routers/test_debts.py -v`
Expected: ALL PASS

- [ ] **Step 6: Run full test suite**

Run: `cd backend && uv run pytest -v`
Expected: ALL PASS

- [ ] **Step 7: Run linting and type checks**

Run: `cd backend && uv run ruff check . && uv run ruff format --check .`
Expected: Clean

- [ ] **Step 8: Commit**

```bash
git add backend/app/routers/debts.py backend/app/main.py \
  backend/tests/routers/test_debts.py
git commit -m "feat(debts): add debts router with bank loan CRUD, amortization, payments, auto-match"
```

---

## Task 9: Final Validation + CI Check

- [ ] **Step 1: Run full test suite**

Run: `cd backend && uv run pytest -v --tb=short`
Expected: ALL PASS

- [ ] **Step 2: Run linting**

Run: `cd backend && uv run ruff check . && uv run ruff format --check .`
Expected: Clean

- [ ] **Step 3: Run type checks**

Run: `cd backend && uv run pyright`
Expected: No errors (or only pre-existing ones)

- [ ] **Step 4: Push to remote**

```bash
git push origin main
```

- [ ] **Step 5: Verify CI passes**

Check GitHub Actions for the backend workflow. All checks (ruff, pyright, pytest) should pass.

---

## Summary of Deliverables

After all tasks are complete:

| Artifact | Count |
|----------|-------|
| New enums | 6 (DebtType, DebtStatus, InstallmentType, LifecycleStatus, PersonRelationship, RepaymentMode) |
| New models | 5 (Person, Debt, DebtPayment, P2PDebtSplit, InstallmentPlan) |
| New schemas | 2 files (person.py, debt.py) |
| New services | 3 (amortization.py, person.py, debt.py) |
| New routers | 2 (persons.py, debts.py) |
| Alembic migration | 1 (005_create_phase3_tables.py) |
| New test files | 4 (test_amortization.py, test_debt_models.py, test_persons.py, test_debts.py) |
| Commits | ~8 atomic commits |

**Endpoints delivered:**
- `GET/POST /api/v1/persons` + `GET/PUT/DELETE /api/v1/persons/{id}`
- `GET/POST /api/v1/debts` + `GET/PUT/DELETE /api/v1/debts/{id}`
- `GET /api/v1/debts/{id}/amortization`
- `GET/POST /api/v1/debts/{id}/payments`
- `GET /api/v1/debts/{id}/match-suggestions`
- `POST /api/v1/debts/{id}/mark-paid`
