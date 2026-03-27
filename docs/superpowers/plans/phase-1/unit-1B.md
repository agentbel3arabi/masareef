# Unit 1B: Core Models — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create all SQLAlchemy models needed for Phase 1 (Household, Account, Category, Transaction, TransactionSplit, ExchangeRate) with Alembic migrations and category seed data.

**Architecture:** Models follow `02-data-models.md` exactly. All user-facing models include `household_id` FK, inherit `TimestampMixin` and `SoftDeleteMixin` from Unit 1A. Enums are defined as Python `enum.Enum` and mapped to PostgreSQL enum types. One Alembic migration creates all tables + enums atomically.

**Tech Stack:** SQLAlchemy 2.0, Alembic, PostgreSQL enums

**Required reading:** `CLAUDE.md`, `02-data-models.md`, `03-features/accounts.md`, `03-features/transactions.md`, `03-features/categories.md`, `03-features/exchange-rates.md`

---

## File Structure

```
backend/app/
├── models/
│   ├── __init__.py        # Updated: re-export all models
│   ├── base.py            # From Unit 1A (unchanged)
│   ├── enums.py           # NEW: All enum types
│   ├── household.py       # NEW: Household + HouseholdMember
│   ├── account.py         # NEW: Account
│   ├── category.py        # NEW: Category
│   ├── transaction.py     # NEW: Transaction + TransactionSplit
│   └── exchange_rate.py   # NEW: ExchangeRate
├── seed.py                # NEW: Predefined categories + currencies
backend/tests/
├── models/
│   ├── __init__.py
│   ├── test_enums.py
│   ├── test_household.py
│   ├── test_account.py
│   ├── test_category.py
│   ├── test_transaction.py
│   └── test_exchange_rate.py
├── test_seed.py
```

---

### Task 1: Enum Definitions

**Files:**
- Create: `backend/app/models/enums.py`
- Test: `backend/tests/models/__init__.py`
- Test: `backend/tests/models/test_enums.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/models/__init__.py` (empty file).

Create `backend/tests/models/test_enums.py`:
```python
import enum

from app.models.enums import AccountType, CategoryType, TransactionType


def test_account_type_has_all_variants():
    expected = {"bank_account", "credit_card", "cash_wallet", "digital_wallet", "financing_app"}
    assert {e.value for e in AccountType} == expected


def test_transaction_type_has_debit_and_credit():
    assert TransactionType.DEBIT.value == "debit"
    assert TransactionType.CREDIT.value == "credit"


def test_category_type_has_all_variants():
    expected = {"expense", "income", "special"}
    assert {e.value for e in CategoryType} == expected


def test_enums_are_string_enums():
    assert issubclass(AccountType, str)
    assert issubclass(AccountType, enum.Enum)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/models/test_enums.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.models.enums'`

- [ ] **Step 3: Write enums.py**

Create `backend/app/models/enums.py`:
```python
import enum


class AccountType(str, enum.Enum):
    BANK_ACCOUNT = "bank_account"
    CREDIT_CARD = "credit_card"
    CASH_WALLET = "cash_wallet"
    DIGITAL_WALLET = "digital_wallet"
    FINANCING_APP = "financing_app"


class TransactionType(str, enum.Enum):
    DEBIT = "debit"
    CREDIT = "credit"


class CategoryType(str, enum.Enum):
    EXPENSE = "expense"
    INCOME = "income"
    SPECIAL = "special"


class HouseholdRole(str, enum.Enum):
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"
    CHILD = "child"
```

- [ ] **Step 4: Run test to verify it passes**

```bash
uv run pytest tests/models/test_enums.py -v
```

Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/enums.py backend/tests/models/
git commit -m "feat(backend): add core enum types for accounts, transactions, categories"
```

---

### Task 2: Household Model

**Files:**
- Create: `backend/app/models/household.py`
- Test: `backend/tests/models/test_household.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/models/test_household.py`:
```python
from sqlalchemy import inspect

from app.models.household import Household, HouseholdMember


def test_household_table_name():
    assert Household.__tablename__ == "households"


def test_household_has_required_columns():
    mapper = inspect(Household)
    column_names = {c.key for c in mapper.column_attrs}
    assert "id" in column_names
    assert "name" in column_names
    assert "base_currency" in column_names
    assert "created_at" in column_names


def test_household_base_currency_default():
    col = Household.__table__.c.base_currency
    assert col.server_default.arg == "EGP"


def test_household_member_table_name():
    assert HouseholdMember.__tablename__ == "household_members"


def test_household_member_has_required_columns():
    mapper = inspect(HouseholdMember)
    column_names = {c.key for c in mapper.column_attrs}
    required = {"id", "household_id", "user_id", "role", "display_name", "joined_at"}
    assert required.issubset(column_names)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/models/test_household.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.models.household'`

- [ ] **Step 3: Write household.py**

Create `backend/app/models/household.py`:
```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import HouseholdRole


class Household(Base):
    __tablename__ = "households"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    base_currency: Mapped[str] = mapped_column(
        String(3), nullable=False, server_default="EGP"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    members: Mapped[list["HouseholdMember"]] = relationship(back_populates="household")


class HouseholdMember(Base):
    __tablename__ = "household_members"
    __table_args__ = (UniqueConstraint("household_id", "user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    role: Mapped[HouseholdRole] = mapped_column(
        nullable=False, default=HouseholdRole.MEMBER
    )
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    household: Mapped["Household"] = relationship(back_populates="members")
```

- [ ] **Step 4: Run test to verify it passes**

```bash
uv run pytest tests/models/test_household.py -v
```

Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/household.py backend/tests/models/test_household.py
git commit -m "feat(backend): add Household and HouseholdMember models"
```

---

### Task 3: Account Model

**Files:**
- Create: `backend/app/models/account.py`
- Test: `backend/tests/models/test_account.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/models/test_account.py`:
```python
from sqlalchemy import inspect

from app.models.account import Account


def test_account_table_name():
    assert Account.__tablename__ == "accounts"


def test_account_has_required_columns():
    mapper = inspect(Account)
    column_names = {c.key for c in mapper.column_attrs}
    required = {
        "id", "household_id", "name", "type", "currency", "balance_minor",
        "institution", "credit_limit", "billing_cycle_day", "payment_due_day",
        "opened_at", "is_active", "created_at", "updated_at",
    }
    assert required.issubset(column_names)


def test_account_balance_minor_is_bigint():
    col = Account.__table__.c.balance_minor
    assert str(col.type) == "BIGINT"


def test_account_balance_minor_default_is_zero():
    col = Account.__table__.c.balance_minor
    assert col.server_default.arg == "0"


def test_account_credit_limit_is_nullable():
    col = Account.__table__.c.credit_limit
    assert col.nullable is True


def test_account_has_household_fk():
    col = Account.__table__.c.household_id
    fk_targets = {fk.target_fullname for fk in col.foreign_keys}
    assert "households.id" in fk_targets
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/models/test_account.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.models.account'`

- [ ] **Step 3: Write account.py**

Create `backend/app/models/account.py`:
```python
import uuid
from datetime import date

from sqlalchemy import BigInteger, Date, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import AccountType


class Account(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[AccountType] = mapped_column(nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    balance_minor: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0"
    )
    institution: Mapped[str | None] = mapped_column(Text, nullable=True)
    credit_limit: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    billing_cycle_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payment_due_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    opened_at: Mapped[date | None] = mapped_column(Date, nullable=True)
```

- [ ] **Step 4: Run test to verify it passes**

```bash
uv run pytest tests/models/test_account.py -v
```

Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/account.py backend/tests/models/test_account.py
git commit -m "feat(backend): add Account model with BIGINT balance and credit card fields"
```

---

### Task 4: Category Model

**Files:**
- Create: `backend/app/models/category.py`
- Test: `backend/tests/models/test_category.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/models/test_category.py`:
```python
from sqlalchemy import inspect

from app.models.category import Category


def test_category_table_name():
    assert Category.__tablename__ == "categories"


def test_category_has_required_columns():
    mapper = inspect(Category)
    column_names = {c.key for c in mapper.column_attrs}
    required = {
        "id", "household_id", "name_en", "name_ar", "type",
        "icon", "color", "is_predefined", "is_active", "sort_order", "created_at",
    }
    assert required.issubset(column_names)


def test_category_household_id_is_nullable():
    """Predefined categories have household_id = NULL."""
    col = Category.__table__.c.household_id
    assert col.nullable is True


def test_category_is_predefined_default_false():
    col = Category.__table__.c.is_predefined
    assert col.server_default.arg == "false"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/models/test_category.py -v
```

Expected: FAIL

- [ ] **Step 3: Write category.py**

Create `backend/app/models/category.py`:
```python
import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin
from app.models.enums import CategoryType

from datetime import datetime
from sqlalchemy import DateTime, func


class Category(SoftDeleteMixin, Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    household_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id"), nullable=True
    )
    name_en: Mapped[str] = mapped_column(Text, nullable=False)
    name_ar: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[CategoryType] = mapped_column(nullable=False)
    icon: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_predefined: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
```

- [ ] **Step 4: Run test to verify it passes**

```bash
uv run pytest tests/models/test_category.py -v
```

Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/category.py backend/tests/models/test_category.py
git commit -m "feat(backend): add Category model with predefined/custom distinction"
```

---

### Task 5: Transaction and TransactionSplit Models

**Files:**
- Create: `backend/app/models/transaction.py`
- Test: `backend/tests/models/test_transaction.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/models/test_transaction.py`:
```python
from sqlalchemy import inspect

from app.models.transaction import Transaction, TransactionSplit


def test_transaction_table_name():
    assert Transaction.__tablename__ == "transactions"


def test_transaction_has_required_columns():
    mapper = inspect(Transaction)
    column_names = {c.key for c in mapper.column_attrs}
    required = {
        "id", "household_id", "account_id", "date", "description",
        "amount_minor", "currency", "type", "category_id",
        "import_batch_id", "notes", "exchange_rate_at_time",
        "fx_rate_minor_units", "is_active", "applies_to_balance",
        "transfer_id", "ai_categorized", "ai_confidence",
        "created_at", "updated_at",
    }
    assert required.issubset(column_names)


def test_transaction_amount_minor_is_bigint():
    col = Transaction.__table__.c.amount_minor
    assert str(col.type) == "BIGINT"


def test_transaction_applies_to_balance_default_true():
    col = Transaction.__table__.c.applies_to_balance
    assert col.server_default.arg == "true"


def test_transaction_split_table_name():
    assert TransactionSplit.__tablename__ == "transaction_splits"


def test_transaction_split_amount_minor_is_bigint():
    col = TransactionSplit.__table__.c.amount_minor
    assert str(col.type) == "BIGINT"


def test_transaction_has_account_fk():
    col = Transaction.__table__.c.account_id
    fk_targets = {fk.target_fullname for fk in col.foreign_keys}
    assert "accounts.id" in fk_targets


def test_transaction_has_category_fk():
    col = Transaction.__table__.c.category_id
    fk_targets = {fk.target_fullname for fk in col.foreign_keys}
    assert "categories.id" in fk_targets
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/models/test_transaction.py -v
```

Expected: FAIL

- [ ] **Step 3: Write transaction.py**

Create `backend/app/models/transaction.py`:
```python
import uuid
from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import TransactionType


class Transaction(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id"), nullable=False
    )
    account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("accounts.id"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(Text, server_default="")
    amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[TransactionType] = mapped_column(nullable=False)
    category_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("categories.id"), nullable=True
    )
    import_batch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    exchange_rate_at_time: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    fx_rate_minor_units: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    applies_to_balance: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    transfer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    gam3eya_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    asset_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_categorized: Mapped[bool | None] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    ai_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    splits: Mapped[list["TransactionSplit"]] = relationship(back_populates="transaction")


class TransactionSplit(Base):
    __tablename__ = "transaction_splits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    transaction_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("transactions.id"), nullable=False, index=True
    )
    category_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("categories.id"), nullable=True
    )
    amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    transaction: Mapped["Transaction"] = relationship(back_populates="splits")
```

Note: `gam3eya_id` and `asset_id` are plain Integer columns without FKs for now — those tables are created in later phases. FKs will be added via migrations in Phase 5 and Phase 6.

- [ ] **Step 4: Run test to verify it passes**

```bash
uv run pytest tests/models/test_transaction.py -v
```

Expected: 8 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/transaction.py backend/tests/models/test_transaction.py
git commit -m "feat(backend): add Transaction and TransactionSplit models"
```

---

### Task 6: ExchangeRate Model

**Files:**
- Create: `backend/app/models/exchange_rate.py`
- Test: `backend/tests/models/test_exchange_rate.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/models/test_exchange_rate.py`:
```python
from sqlalchemy import inspect

from app.models.exchange_rate import ExchangeRate


def test_exchange_rate_table_name():
    assert ExchangeRate.__tablename__ == "exchange_rates"


def test_exchange_rate_has_required_columns():
    mapper = inspect(ExchangeRate)
    column_names = {c.key for c in mapper.column_attrs}
    required = {
        "id", "date", "from_currency", "to_currency",
        "rate_scaled", "is_forecast", "source", "fetched_at",
    }
    assert required.issubset(column_names)


def test_exchange_rate_rate_scaled_is_bigint():
    col = ExchangeRate.__table__.c.rate_scaled
    assert str(col.type) == "BIGINT"


def test_exchange_rate_no_household_id():
    """Exchange rates are global — no household scope."""
    mapper = inspect(ExchangeRate)
    column_names = {c.key for c in mapper.column_attrs}
    assert "household_id" not in column_names
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/models/test_exchange_rate.py -v
```

Expected: FAIL

- [ ] **Step 3: Write exchange_rate.py**

Create `backend/app/models/exchange_rate.py`:
```python
from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Integer, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ExchangeRate(Base):
    __tablename__ = "exchange_rates"
    __table_args__ = (
        UniqueConstraint("date", "from_currency", "to_currency"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    from_currency: Mapped[str] = mapped_column(Text, nullable=False)
    to_currency: Mapped[str] = mapped_column(Text, nullable=False)
    rate_scaled: Mapped[int] = mapped_column(BigInteger, nullable=False)
    is_forecast: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    source: Mapped[str] = mapped_column(Text, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
```

- [ ] **Step 4: Run test to verify it passes**

```bash
uv run pytest tests/models/test_exchange_rate.py -v
```

Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/exchange_rate.py backend/tests/models/test_exchange_rate.py
git commit -m "feat(backend): add ExchangeRate model with scaled integer rates"
```

---

### Task 7: Update Models __init__.py and Alembic env.py

**Files:**
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/alembic/env.py`

- [ ] **Step 1: Update models __init__.py to re-export all models**

Replace `backend/app/models/__init__.py`:
```python
from app.models.base import Base
from app.models.enums import AccountType, CategoryType, HouseholdRole, TransactionType
from app.models.household import Household, HouseholdMember
from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction, TransactionSplit
from app.models.exchange_rate import ExchangeRate

__all__ = [
    "Base",
    "AccountType",
    "CategoryType",
    "HouseholdRole",
    "TransactionType",
    "Household",
    "HouseholdMember",
    "Account",
    "Category",
    "Transaction",
    "TransactionSplit",
    "ExchangeRate",
]
```

- [ ] **Step 2: Update Alembic env.py to import all models**

Add this import to the top of `backend/alembic/env.py`, after the existing imports:
```python
# Import all models so Alembic can detect them
import app.models  # noqa: F401
```

(This ensures all models are registered with `Base.metadata` when Alembic runs.)

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/__init__.py backend/alembic/env.py
git commit -m "chore(backend): register all models in __init__ and Alembic env"
```

---

### Task 8: Alembic Migration — Create All Phase 1 Tables

**Files:**
- Create: `backend/alembic/versions/001_create_phase1_tables.py` (auto-generated)

- [ ] **Step 1: Generate the migration**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/backend
uv run alembic revision --autogenerate -m "create phase 1 tables"
```

Expected: A new migration file in `alembic/versions/`. It should contain `CREATE TABLE` for: `households`, `household_members`, `accounts`, `categories`, `transactions`, `transaction_splits`, `exchange_rates`.

- [ ] **Step 2: Review the generated migration**

Open the generated file and verify:
- All 7 tables are present
- `balance_minor` and `amount_minor` columns are `sa.BigInteger()`
- `household_id` columns have proper ForeignKey references
- Enum types are created (AccountType, TransactionType, etc.)
- Unique constraints are present (household_members, exchange_rates)

- [ ] **Step 3: Run the migration against the database**

```bash
uv run alembic upgrade head
```

Expected: Tables created in Supabase PostgreSQL.

Note: This requires a running Supabase database. If not available yet, the migration can be deferred to when the Supabase project is set up. The migration file itself is the deliverable.

- [ ] **Step 4: Commit**

```bash
git add backend/alembic/versions/
git commit -m "feat(backend): add migration for Phase 1 tables"
```

---

### Task 9: Seed Data

**Files:**
- Create: `backend/app/seed.py`
- Test: `backend/tests/test_seed.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_seed.py`:
```python
from app.seed import CURRENCIES, PREDEFINED_CATEGORIES, SAMPLE_EXCHANGE_RATES


def test_predefined_categories_count():
    assert len(PREDEFINED_CATEGORIES) == 18


def test_predefined_categories_have_required_fields():
    for cat in PREDEFINED_CATEGORIES:
        assert "name_en" in cat
        assert "name_ar" in cat
        assert "type" in cat
        assert "icon" in cat
        assert "color" in cat
        assert cat["type"] in ("expense", "income", "special")


def test_expense_categories_count():
    expenses = [c for c in PREDEFINED_CATEGORIES if c["type"] == "expense"]
    assert len(expenses) == 12


def test_income_categories_count():
    incomes = [c for c in PREDEFINED_CATEGORIES if c["type"] == "income"]
    assert len(incomes) == 3


def test_special_categories_count():
    specials = [c for c in PREDEFINED_CATEGORIES if c["type"] == "special"]
    assert len(specials) == 3


def test_currencies_has_seven_entries():
    assert len(CURRENCIES) == 7


def test_currencies_egp_is_default():
    assert "EGP" in CURRENCIES
    assert CURRENCIES["EGP"]["exponent"] == 2


def test_currencies_kwd_has_three_decimals():
    assert "KWD" in CURRENCIES
    assert CURRENCIES["KWD"]["exponent"] == 3


def test_sample_exchange_rates_all_usd_based():
    for rate in SAMPLE_EXCHANGE_RATES:
        assert rate["from_currency"] == "USD"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/test_seed.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.seed'`

- [ ] **Step 3: Write seed.py**

Create `backend/app/seed.py`:
```python
"""Seed data: predefined categories, supported currencies, sample exchange rates."""

CURRENCIES: dict[str, dict] = {
    "EGP": {"name": "Egyptian Pound", "name_ar": "جنيه مصري", "exponent": 2, "symbol": "EGP"},
    "USD": {"name": "US Dollar", "name_ar": "دولار أمريكي", "exponent": 2, "symbol": "$"},
    "EUR": {"name": "Euro", "name_ar": "يورو", "exponent": 2, "symbol": "€"},
    "GBP": {"name": "British Pound", "name_ar": "جنيه إسترليني", "exponent": 2, "symbol": "£"},
    "SAR": {"name": "Saudi Riyal", "name_ar": "ريال سعودي", "exponent": 2, "symbol": "SAR"},
    "AED": {"name": "UAE Dirham", "name_ar": "درهم إماراتي", "exponent": 2, "symbol": "AED"},
    "KWD": {"name": "Kuwaiti Dinar", "name_ar": "دينار كويتي", "exponent": 3, "symbol": "KWD"},
}

PREDEFINED_CATEGORIES: list[dict] = [
    # Expense (12)
    {"name_en": "Food & Dining", "name_ar": "طعام ومطاعم", "type": "expense", "icon": "utensils", "color": "#EF4444", "sort_order": 1},
    {"name_en": "Groceries", "name_ar": "بقالة", "type": "expense", "icon": "shopping-cart", "color": "#F97316", "sort_order": 2},
    {"name_en": "Transportation", "name_ar": "مواصلات", "type": "expense", "icon": "car", "color": "#EAB308", "sort_order": 3},
    {"name_en": "Utilities", "name_ar": "مرافق", "type": "expense", "icon": "zap", "color": "#84CC16", "sort_order": 4},
    {"name_en": "Housing/Rent", "name_ar": "سكن/إيجار", "type": "expense", "icon": "home", "color": "#22C55E", "sort_order": 5},
    {"name_en": "Healthcare", "name_ar": "رعاية صحية", "type": "expense", "icon": "heart-pulse", "color": "#14B8A6", "sort_order": 6},
    {"name_en": "Shopping", "name_ar": "تسوق", "type": "expense", "icon": "shopping-bag", "color": "#06B6D4", "sort_order": 7},
    {"name_en": "Education", "name_ar": "تعليم", "type": "expense", "icon": "graduation-cap", "color": "#3B82F6", "sort_order": 8},
    {"name_en": "Entertainment", "name_ar": "ترفيه", "type": "expense", "icon": "film", "color": "#8B5CF6", "sort_order": 9},
    {"name_en": "Telecommunications", "name_ar": "اتصالات", "type": "expense", "icon": "phone", "color": "#A855F7", "sort_order": 10},
    {"name_en": "Fuel", "name_ar": "وقود", "type": "expense", "icon": "fuel", "color": "#EC4899", "sort_order": 11},
    {"name_en": "Government/Fees", "name_ar": "حكومة/رسوم", "type": "expense", "icon": "landmark", "color": "#F43F5E", "sort_order": 12},
    # Income (3)
    {"name_en": "Salary", "name_ar": "راتب", "type": "income", "icon": "banknote", "color": "#22C55E", "sort_order": 13},
    {"name_en": "Freelance Income", "name_ar": "دخل حر", "type": "income", "icon": "laptop", "color": "#10B981", "sort_order": 14},
    {"name_en": "Other Income", "name_ar": "دخل آخر", "type": "income", "icon": "plus-circle", "color": "#34D399", "sort_order": 15},
    # Special (3)
    {"name_en": "Transfer", "name_ar": "تحويل", "type": "special", "icon": "arrow-left-right", "color": "#94A3B8", "sort_order": 16},
    {"name_en": "Uncategorized", "name_ar": "غير مصنف", "type": "special", "icon": "help-circle", "color": "#94A3B8", "sort_order": 17},
    {"name_en": "Savings", "name_ar": "ادخار", "type": "special", "icon": "piggy-bank", "color": "#22C55E", "sort_order": 18},
]

SAMPLE_EXCHANGE_RATES: list[dict] = [
    {"from_currency": "USD", "to_currency": "EGP", "rate_scaled": 500000},
    {"from_currency": "USD", "to_currency": "SAR", "rate_scaled": 37510},
    {"from_currency": "USD", "to_currency": "AED", "rate_scaled": 36725},
    {"from_currency": "USD", "to_currency": "KWD", "rate_scaled": 3082},
    {"from_currency": "USD", "to_currency": "EUR", "rate_scaled": 9200},
    {"from_currency": "USD", "to_currency": "GBP", "rate_scaled": 7890},
]


async def seed_categories(session) -> int:
    """Insert predefined categories if they don't exist. Returns count of inserted rows."""
    from sqlalchemy import select
    from app.models.category import Category

    existing = await session.execute(
        select(Category).where(Category.is_predefined == True)  # noqa: E712
    )
    if existing.scalars().first() is not None:
        return 0

    count = 0
    for cat_data in PREDEFINED_CATEGORIES:
        category = Category(
            household_id=None,
            name_en=cat_data["name_en"],
            name_ar=cat_data["name_ar"],
            type=cat_data["type"],
            icon=cat_data["icon"],
            color=cat_data["color"],
            is_predefined=True,
            sort_order=cat_data["sort_order"],
        )
        session.add(category)
        count += 1

    await session.flush()
    return count
```

- [ ] **Step 4: Run test to verify it passes**

```bash
uv run pytest tests/test_seed.py -v
```

Expected: 9 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/seed.py backend/tests/test_seed.py
git commit -m "feat(backend): add seed data for 18 categories, 7 currencies, sample FX rates"
```

---

### Task 10: Run Full Test Suite

- [ ] **Step 1: Run all tests**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/backend
uv run pytest -v
```

Expected: All tests pass. Count should be approximately 40+ tests across all files.

- [ ] **Step 2: Run linting**

```bash
uv run ruff check .
uv run ruff format --check .
```

Expected: No errors. Fix any issues if found.

- [ ] **Step 3: Final commit (if any fixes)**

```bash
git add -A
git commit -m "style(backend): apply ruff formatting to models"
```
