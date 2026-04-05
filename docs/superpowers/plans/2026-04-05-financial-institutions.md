# Financial Institutions & Account Banking Relationship — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace flat text-based institution field with a structured `financial_institutions` table, group accounts by institution, switch to transaction-based balances, and add system categories.

**Architecture:** New `financial_institutions` table (system-level + household-scoped custom entries) with a `type` discriminator (bank/bnpl/digital_wallet_provider). Accounts FK to institutions. Balance calculation moves from `seed + SUM(transactions)` to `SUM(transactions)` only, with Opening Balance as a system-generated transaction. Frontend accounts page reorganized from type-based flat grid to institution-grouped collapsible sections.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, Alembic, Pydantic V2, python-stdnum (IBAN validation), Next.js 16 App Router, TanStack Query, shadcn/ui (base-nova), Tailwind CSS v4, next-intl.

**Spec:** `docs/superpowers/specs/2026-04-05-financial-institutions-design.md`

**Prerequisites:** Clean slate — all existing data will be dropped. No migration compatibility needed.

---

## Unit Dependency Graph

```
Unit 1 (Data Model)
  ├── Unit 2 (Institution API)
  │     ├── Unit 4 (Institution Selector)
  │     │     └── Unit 5 (Account Creation)
  │     └── Unit 3 (Account API)
  │           ├── Unit 5 (Account Creation)
  │           ├── Unit 6 (Accounts Page)
  │           │     └── Unit 7 (Bank Detail)
  │           └── Unit 7 (Bank Detail)
  └── Unit 3 (Account API)

Unit 8 (Logos) — parallel, no dependencies
```

---

## File Map

### Backend — New Files
| File | Responsibility |
|------|---------------|
| `backend/app/models/financial_institution.py` | SQLAlchemy model for `financial_institutions` table |
| `backend/app/schemas/financial_institution.py` | Pydantic schemas: create, update, response, list |
| `backend/app/services/financial_institution.py` | CRUD + search + popular/all grouping logic |
| `backend/app/routers/financial_institutions.py` | REST endpoints for institutions |
| `backend/app/models/reconciliation_record.py` | SQLAlchemy model for `reconciliation_records` table |
| `backend/app/seed/institutions.py` | Seed data: Egyptian banks, BNPL providers, digital wallet providers |
| `backend/app/seed/system_categories.py` | Seed data: Opening Balance, Reconciliation Adjustment |
| `backend/alembic/versions/xxxx_financial_institutions.py` | Alembic migration (auto-generated) |

### Backend — Modified Files
| File | Changes |
|------|---------|
| `backend/app/models/enums.py` | Add `InstitutionType` enum |
| `backend/app/models/account.py` | Drop `balance_minor`, `institution`; add `institution_id`, `name_ar`, `iban`, `account_number`, `account_tier`, `branch` |
| `backend/app/models/category.py` | Add `is_system` column |
| `backend/app/schemas/account.py` | Rewrite AccountCreate/Update/Response for new fields, add institution embedding |
| `backend/app/schemas/common.py` | Add `warnings` field to success response |
| `backend/app/services/account.py` | Rewrite balance calculation, opening balance transaction creation, reconciliation flow, institution validation |
| `backend/app/services/category.py` | Add `assignable` filter (exclude is_system) |
| `backend/app/services/transaction.py` | Add system category guards (create/update/delete) |
| `backend/app/routers/accounts.py` | Update endpoint signatures for new fields |
| `backend/app/routers/categories.py` | Add `assignable` query param |
| `backend/app/routers/transactions.py` | Add system transaction guards |
| `backend/app/main.py` | Register financial_institutions router |
| `backend/pyproject.toml` | Add `python-stdnum` dependency |

### Frontend — New Files
| File | Responsibility |
|------|---------------|
| `frontend/src/hooks/use-institutions.ts` | TanStack Query hooks for institution API |
| `frontend/src/components/accounts/institution-selector.tsx` | Reusable combobox: logos, bilingual search, popular/all, "Other" |
| `frontend/src/components/accounts/bank-group-section.tsx` | Collapsible bank group: header + account cards grid |
| `frontend/src/components/accounts/independent-section.tsx` | Section for BNPL/wallet/cash with total header |
| `frontend/src/components/accounts/credit-details.tsx` | Limit + available + utilization display for CC/BNPL cards |
| `frontend/src/app/(app)/accounts/bank/[slug]/page.tsx` | Bank detail page |

### Frontend — Modified Files
| File | Changes |
|------|---------|
| `frontend/src/hooks/use-accounts.ts` | Update Account type, CreateAccountInput, remove balance_minor |
| `frontend/src/components/accounts/account-grid.tsx` | Rewrite: institution-grouped sections instead of type-based |
| `frontend/src/components/accounts/create-account-dialog.tsx` | Add institution selector, IBAN, metadata fields, progressive disclosure |
| `frontend/src/components/accounts/account-card.tsx` | Add tier badge, IBAN last4, credit details |
| `frontend/src/components/accounts/bank-account-card.tsx` | Remove institution text, add tier badge |
| `frontend/src/components/accounts/credit-account-card.tsx` | Add limit + available display |
| `frontend/src/app/(app)/accounts/page.tsx` | Update for new grid structure |
| `frontend/src/app/(app)/accounts/[id]/page.tsx` | Show institution with logo on detail page |
| `frontend/src/messages/en.json` | Add institution, IBAN, bank detail, system category keys |
| `frontend/src/messages/ar.json` | Arabic translations for all new keys |

---

## Task 1: Add InstitutionType Enum and Financial Institution Model

**Files:**
- Modify: `backend/app/models/enums.py`
- Create: `backend/app/models/financial_institution.py`

- [ ] **Step 1: Add InstitutionType enum**

```python
# In backend/app/models/enums.py — add after existing enums

class InstitutionType(str, Enum):
    bank = "bank"
    bnpl = "bnpl"
    digital_wallet_provider = "digital_wallet_provider"
```

- [ ] **Step 2: Create the FinancialInstitution model**

```python
# backend/app/models/financial_institution.py
import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import InstitutionType

_enum_values = lambda e: [x.value for x in e]  # noqa: E731


class FinancialInstitution(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "financial_institutions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    name_en: Mapped[str] = mapped_column(Text, nullable=False)
    name_ar: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[InstitutionType] = mapped_column(
        SAEnum(InstitutionType, values_callable=_enum_values, create_type=False),
        nullable=False,
    )
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    bic_swift: Mapped[str | None] = mapped_column(Text, nullable=True)
    country: Mapped[str] = mapped_column(String(3), nullable=False, server_default="EG")
    is_predefined: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    is_popular: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    household_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id"), nullable=True
    )
```

- [ ] **Step 3: Register model import in `__init__`**

Check if `backend/app/models/__init__.py` exists and imports all models. If so, add:

```python
from app.models.financial_institution import FinancialInstitution  # noqa: F401
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/enums.py backend/app/models/financial_institution.py backend/app/models/__init__.py
git commit -m "feat(models): add InstitutionType enum and FinancialInstitution model"
```

---

## Task 2: Modify Account Model

**Files:**
- Modify: `backend/app/models/account.py`

- [ ] **Step 1: Update Account model — drop old columns, add new ones**

In `backend/app/models/account.py`, replace the current column definitions:

Remove these lines:
```python
balance_minor: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")
institution: Mapped[str | None] = mapped_column(Text, nullable=True)
```

Add these lines (after `currency`):
```python
institution_id: Mapped[int | None] = mapped_column(
    Integer, ForeignKey("financial_institutions.id"), nullable=True
)
name_ar: Mapped[str | None] = mapped_column(Text, nullable=True)
iban: Mapped[str | None] = mapped_column(Text, nullable=True)
account_number: Mapped[str | None] = mapped_column(Text, nullable=True)
account_tier: Mapped[str | None] = mapped_column(Text, nullable=True)
branch: Mapped[str | None] = mapped_column(Text, nullable=True)
```

Add this import at the top if not present:
```python
from sqlalchemy import Integer, ForeignKey
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/models/account.py
git commit -m "feat(models): update Account — drop balance_minor/institution, add institution_id and metadata fields"
```

---

## Task 3: Add is_system to Category Model

**Files:**
- Modify: `backend/app/models/category.py`

- [ ] **Step 1: Add is_system column**

In `backend/app/models/category.py`, add after the `is_predefined` column:

```python
is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/models/category.py
git commit -m "feat(models): add is_system flag to Category for system-only categories"
```

---

## Task 4: Create ReconciliationRecord Model

**Files:**
- Create: `backend/app/models/reconciliation_record.py`

- [ ] **Step 1: Write ReconciliationRecord model**

```python
# backend/app/models/reconciliation_record.py
import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin


class ReconciliationRecord(SoftDeleteMixin, Base):
    __tablename__ = "reconciliation_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id"), nullable=False
    )
    account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("accounts.id"), nullable=False, index=True
    )
    transaction_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("transactions.id"), nullable=True
    )
    expected_balance_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    actual_balance_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    adjustment_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reconciliation_date: Mapped[date] = mapped_column(Date, nullable=False)
    reconciled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="now()"
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="now()"
    )
```

- [ ] **Step 2: Register in models `__init__`**

```python
from app.models.reconciliation_record import ReconciliationRecord  # noqa: F401
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/reconciliation_record.py backend/app/models/__init__.py
git commit -m "feat(models): add ReconciliationRecord model"
```

---

## Task 5: Create Seed Data

**Files:**
- Create: `backend/app/seed/institutions.py`
- Create: `backend/app/seed/system_categories.py`

- [ ] **Step 1: Create institutions seed data**

```python
# backend/app/seed/institutions.py
"""Seed data for financial institutions — Egyptian banks, BNPL, digital wallets."""

BANKS = [
    {"slug": "nbe", "name_en": "National Bank of Egypt", "name_ar": "البنك الأهلي المصري", "is_popular": True, "sort_order": 1},
    {"slug": "banque-misr", "name_en": "Banque Misr", "name_ar": "بنك مصر", "is_popular": True, "sort_order": 2},
    {"slug": "cib", "name_en": "Commercial International Bank", "name_ar": "البنك التجاري الدولي", "is_popular": True, "sort_order": 3},
    {"slug": "qnb-alahli", "name_en": "QNB Alahli", "name_ar": "بنك QNB الأهلي", "is_popular": True, "sort_order": 4},
    {"slug": "hsbc", "name_en": "HSBC Egypt", "name_ar": "إتش إس بي سي مصر", "is_popular": True, "sort_order": 5},
    {"slug": "bank-of-alexandria", "name_en": "Bank of Alexandria", "name_ar": "بنك الإسكندرية", "is_popular": True, "sort_order": 6},
    {"slug": "aaib", "name_en": "Arab African International Bank", "name_ar": "البنك العربي الأفريقي الدولي"},
    {"slug": "credit-agricole", "name_en": "Crédit Agricole Egypt", "name_ar": "كريدي أجريكول مصر"},
    {"slug": "adib", "name_en": "Abu Dhabi Islamic Bank Egypt", "name_ar": "مصرف أبوظبي الإسلامي مصر"},
    {"slug": "banque-du-caire", "name_en": "Banque du Caire", "name_ar": "بنك القاهرة"},
    {"slug": "faisal-islamic", "name_en": "Faisal Islamic Bank", "name_ar": "بنك فيصل الإسلامي"},
    {"slug": "al-baraka", "name_en": "Al Baraka Bank Egypt", "name_ar": "بنك البركة مصر"},
    {"slug": "export-development", "name_en": "Export Development Bank", "name_ar": "البنك المصري لتنمية الصادرات"},
    {"slug": "egyptian-arab-land", "name_en": "Egyptian Arab Land Bank", "name_ar": "البنك العقاري المصري العربي"},
    {"slug": "suez-canal", "name_en": "Suez Canal Bank", "name_ar": "بنك قناة السويس"},
    {"slug": "housing-development", "name_en": "Housing and Development Bank", "name_ar": "بنك الإسكان والتعمير"},
    {"slug": "saib", "name_en": "Saib Bank", "name_ar": "بنك saib"},
    {"slug": "kfh-egypt", "name_en": "Kuwait Finance House Egypt", "name_ar": "بيت التمويل الكويتي مصر"},
    {"slug": "mashreq", "name_en": "Mashreq Bank Egypt", "name_ar": "بنك المشرق مصر"},
    {"slug": "emirates-nbd", "name_en": "Emirates NBD Egypt", "name_ar": "بنك الإمارات دبي الوطني مصر"},
    {"slug": "attijariwafa", "name_en": "Attijariwafa Bank Egypt", "name_ar": "التجاري وفا بنك مصر"},
    {"slug": "arab-bank", "name_en": "Arab Bank", "name_ar": "البنك العربي"},
    {"slug": "audi-bank", "name_en": "Bank Audi", "name_ar": "بنك عودة"},
    {"slug": "midb", "name_en": "MIDB – Misr Iran Development Bank", "name_ar": "بنك مصر إيران للتنمية"},
    {"slug": "abu-dhabi-commercial", "name_en": "Abu Dhabi Commercial Bank", "name_ar": "بنك أبوظبي التجاري"},
]

BNPL_PROVIDERS = [
    {"slug": "valu", "name_en": "ValU", "name_ar": "ﭬاليو"},
    {"slug": "souhoola", "name_en": "Souhoola", "name_ar": "سهولة"},
    {"slug": "sympl", "name_en": "Sympl", "name_ar": "سيمبل"},
    {"slug": "forsa", "name_en": "Forsa", "name_ar": "فرصة"},
    {"slug": "tru", "name_en": "Tru", "name_ar": "ترو"},
    {"slug": "khazna", "name_en": "Khazna", "name_ar": "خزنة"},
    {"slug": "mnt-halan", "name_en": "MNT-Halan", "name_ar": "هالان"},
    {"slug": "shahry", "name_en": "Shahry", "name_ar": "شهري"},
    {"slug": "contact", "name_en": "Contact", "name_ar": "كونتكت"},
    {"slug": "premium-card", "name_en": "Premium Card", "name_ar": "بريميوم كارد"},
    {"slug": "aman", "name_en": "Aman", "name_ar": "أمان"},
]

DIGITAL_WALLET_PROVIDERS = [
    {"slug": "vodafone-cash", "name_en": "Vodafone Cash", "name_ar": "فودافون كاش"},
    {"slug": "orange-cash", "name_en": "Orange Cash", "name_ar": "اورنج كاش"},
    {"slug": "etisalat-cash", "name_en": "Etisalat Cash", "name_ar": "اتصالات كاش"},
    {"slug": "we-pay", "name_en": "WE Pay", "name_ar": "وي باي"},
    {"slug": "fawry", "name_en": "Fawry", "name_ar": "فوري"},
    {"slug": "instapay", "name_en": "InstaPay", "name_ar": "انستاباي"},
    {"slug": "bm-wallet", "name_en": "BM Wallet", "name_ar": "محفظة بنك مصر"},
    {"slug": "nbe-phone-cash", "name_en": "NBE Phone Cash", "name_ar": "فون كاش الأهلي"},
    {"slug": "cib-smart-wallet", "name_en": "CIB Smart Wallet", "name_ar": "المحفظة الذكية CIB"},
]
```

- [ ] **Step 2: Create system categories seed data**

```python
# backend/app/seed/system_categories.py
"""Seed data for system-only categories."""

SYSTEM_CATEGORIES = [
    {
        "name_en": "Opening Balance",
        "name_ar": "رصيد افتتاحي",
        "type": "special",
        "icon": "landmark",
        "color": "#94A3B8",
        "is_predefined": True,
        "is_system": True,
    },
    {
        "name_en": "Reconciliation Adjustment",
        "name_ar": "تسوية رصيد",
        "type": "special",
        "icon": "scale",
        "color": "#94A3B8",
        "is_predefined": True,
        "is_system": True,
    },
]

# Existing predefined categories that should be marked as system
EXISTING_SYSTEM_CATEGORY_NAMES = ["Transfer", "Uncategorized"]
```

- [ ] **Step 3: Create `__init__.py` for seed package**

```bash
touch backend/app/seed/__init__.py
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/seed/
git commit -m "feat(seed): add institution directory and system category seed data"
```

---

## Task 6: Generate Alembic Migration

**Files:**
- Generate: `backend/alembic/versions/xxxx_financial_institutions.py`

- [ ] **Step 1: Add python-stdnum dependency**

```bash
cd backend && uv add python-stdnum
```

- [ ] **Step 2: Generate migration**

```bash
cd backend && uv run alembic revision --autogenerate -m "add financial institutions and update accounts"
```

- [ ] **Step 3: Review and edit the generated migration**

The auto-generated migration should include:
1. Create `institution_type` enum
2. Create `financial_institutions` table
3. Create `reconciliation_records` table
4. Alter `accounts`: drop `balance_minor`, drop `institution`, add new columns
5. Alter `categories`: add `is_system`

Manually add to the `upgrade()` function — after table creation, before the end:

```python
# Partial unique indexes (not auto-generated by Alembic)
op.create_index(
    "uq_institution_slug",
    "financial_institutions",
    ["slug"],
    unique=True,
    postgresql_where=text("household_id IS NULL AND is_active = true"),
)
op.create_index(
    "uq_custom_institution_slug",
    "financial_institutions",
    ["household_id", "slug"],
    unique=True,
    postgresql_where=text("household_id IS NOT NULL AND is_active = true"),
)
op.create_index(
    "uq_custom_institution_name_en",
    "financial_institutions",
    ["household_id", sa.text("lower(name_en)")],
    unique=True,
    postgresql_where=text("household_id IS NOT NULL AND is_active = true"),
)
op.create_index(
    "uq_custom_institution_name_ar",
    "financial_institutions",
    ["household_id", sa.text("lower(name_ar)")],
    unique=True,
    postgresql_where=text("household_id IS NOT NULL AND is_active = true"),
)
op.create_index(
    "idx_reconciliation_account",
    "reconciliation_records",
    ["account_id", sa.text("reconciled_at DESC")],
)
```

Add the corresponding `op.drop_index()` calls in `downgrade()`.

- [ ] **Step 4: Run the migration**

```bash
cd backend && uv run alembic upgrade head
```

- [ ] **Step 5: Write a seed script runner**

Create `backend/app/seed/run_seeds.py`:

```python
"""Run seed data insertion for financial institutions and system categories."""
import asyncio

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.models.category import Category
from app.models.financial_institution import FinancialInstitution
from app.seed.institutions import BANKS, BNPL_PROVIDERS, DIGITAL_WALLET_PROVIDERS
from app.seed.system_categories import EXISTING_SYSTEM_CATEGORY_NAMES, SYSTEM_CATEGORIES

DATABASE_URL = "postgresql+asyncpg://..."  # Read from env


async def seed_institutions(session: AsyncSession) -> None:
    for bank in BANKS:
        inst = FinancialInstitution(
            type="bank",
            is_predefined=True,
            country="EG",
            logo_url=f"/institutions/{bank['slug']}.svg",
            **bank,
        )
        session.add(inst)

    for provider in BNPL_PROVIDERS:
        inst = FinancialInstitution(
            type="bnpl",
            is_predefined=True,
            country="EG",
            logo_url=f"/institutions/{provider['slug']}.svg",
            **provider,
        )
        session.add(inst)

    for provider in DIGITAL_WALLET_PROVIDERS:
        inst = FinancialInstitution(
            type="digital_wallet_provider",
            is_predefined=True,
            country="EG",
            logo_url=f"/institutions/{provider['slug']}.svg",
            **provider,
        )
        session.add(inst)

    await session.flush()


async def seed_system_categories(session: AsyncSession) -> None:
    for cat_data in SYSTEM_CATEGORIES:
        existing = await session.execute(
            select(Category).where(Category.name_en == cat_data["name_en"])
        )
        if existing.scalar_one_or_none() is None:
            cat = Category(**cat_data)
            session.add(cat)

    # Mark existing Transfer and Uncategorized as system
    await session.execute(
        update(Category)
        .where(Category.name_en.in_(EXISTING_SYSTEM_CATEGORY_NAMES))
        .values(is_system=True)
    )
    await session.flush()


async def main() -> None:
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        async with session.begin():
            await seed_institutions(session)
            await seed_system_categories(session)

    await engine.dispose()
    print("Seeds complete.")


if __name__ == "__main__":
    asyncio.run(main())
```

Note: The implementer should read `DATABASE_URL` from the same env var the app uses (check `backend/app/dependencies.py` or `backend/app/config.py`). This script is a starting point — adapt the connection setup to match the existing codebase pattern.

- [ ] **Step 6: Run seeds**

```bash
cd backend && uv run python -m app.seed.run_seeds
```

- [ ] **Step 7: Commit**

```bash
git add backend/alembic/ backend/pyproject.toml backend/uv.lock backend/app/seed/run_seeds.py
git commit -m "feat(db): add migration for financial institutions + seed data runner"
```

---

## Task 7: Financial Institution Pydantic Schemas

**Files:**
- Create: `backend/app/schemas/financial_institution.py`

- [ ] **Step 1: Write schemas**

```python
# backend/app/schemas/financial_institution.py
from pydantic import BaseModel, Field


class InstitutionResponse(BaseModel):
    id: int
    slug: str
    name_en: str
    name_ar: str
    type: str
    logo_url: str | None = None
    bic_swift: str | None = None
    country: str = "EG"
    is_predefined: bool
    is_popular: bool = False

    model_config = {"from_attributes": True}


class InstitutionListResponse(BaseModel):
    popular: list[InstitutionResponse] = []
    all: list[InstitutionResponse] = []


class InstitutionCreate(BaseModel):
    name_en: str = Field(..., min_length=1, max_length=200)
    name_ar: str = Field(..., min_length=1, max_length=200)
    type: str = Field(..., pattern="^(bank|bnpl|digital_wallet_provider)$")


class InstitutionUpdate(BaseModel):
    name_en: str | None = Field(None, min_length=1, max_length=200)
    name_ar: str | None = Field(None, min_length=1, max_length=200)


class InstitutionSummary(BaseModel):
    institution: InstitutionResponse
    accounts: list  # Will use AccountResponse from account schemas
    summary: "InstitutionSummaryStats"


class InstitutionSummaryStats(BaseModel):
    total_assets_minor: int = 0
    total_liabilities_minor: int = 0
    total_base_minor: int = 0
    base_currency: str = "EGP"
    is_approximate: bool = False
    account_count: int = 0
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/financial_institution.py
git commit -m "feat(schemas): add financial institution Pydantic schemas"
```

---

## Task 8: Financial Institution Service

**Files:**
- Create: `backend/app/services/financial_institution.py`

- [ ] **Step 1: Write the service**

```python
# backend/app/services/financial_institution.py
import re
import unicodedata
import uuid

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.financial_institution import FinancialInstitution


def slugify(text: str) -> str:
    """Generate URL-safe slug from text."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[-\s]+", "-", text).strip("-")


async def list_institutions(
    session: AsyncSession,
    household_id: uuid.UUID,
    *,
    inst_type: str,
    search: str | None = None,
) -> dict:
    """List institutions filtered by type with popular/all grouping."""
    base_filter = and_(
        FinancialInstitution.is_active.is_(True),
        FinancialInstitution.type == inst_type,
        or_(
            FinancialInstitution.household_id.is_(None),
            FinancialInstitution.household_id == household_id,
        ),
    )

    if search:
        search_filter = or_(
            func.lower(FinancialInstitution.name_en).contains(search.lower()),
            FinancialInstitution.name_ar.contains(search),
        )
        stmt = (
            select(FinancialInstitution)
            .where(and_(base_filter, search_filter))
            .order_by(FinancialInstitution.name_en)
        )
        results = (await session.execute(stmt)).scalars().all()
        return {"popular": [], "all": list(results)}

    # No search — split into popular and all
    stmt = select(FinancialInstitution).where(base_filter)
    results = (await session.execute(stmt)).scalars().all()

    popular = sorted(
        [r for r in results if r.is_popular],
        key=lambda r: r.sort_order,
    )
    all_sorted = sorted(results, key=lambda r: r.name_en.lower())

    return {"popular": popular, "all": all_sorted}


async def get_institution_by_slug(
    session: AsyncSession,
    household_id: uuid.UUID,
    slug: str,
) -> FinancialInstitution | None:
    """Get a single institution by slug, visible to the household."""
    stmt = select(FinancialInstitution).where(
        and_(
            FinancialInstitution.slug == slug,
            FinancialInstitution.is_active.is_(True),
            or_(
                FinancialInstitution.household_id.is_(None),
                FinancialInstitution.household_id == household_id,
            ),
        )
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def get_institution_by_id(
    session: AsyncSession,
    household_id: uuid.UUID,
    institution_id: int,
) -> FinancialInstitution | None:
    """Get institution by ID, visible to the household."""
    stmt = select(FinancialInstitution).where(
        and_(
            FinancialInstitution.id == institution_id,
            FinancialInstitution.is_active.is_(True),
            or_(
                FinancialInstitution.household_id.is_(None),
                FinancialInstitution.household_id == household_id,
            ),
        )
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def create_custom_institution(
    session: AsyncSession,
    household_id: uuid.UUID,
    name_en: str,
    name_ar: str,
    inst_type: str,
) -> FinancialInstitution:
    """Create a custom (Other) institution scoped to a household."""
    institution = FinancialInstitution(
        slug=slugify(name_en),
        name_en=name_en,
        name_ar=name_ar,
        type=inst_type,
        household_id=household_id,
        is_predefined=False,
        country="EG",
    )
    session.add(institution)
    await session.flush()
    return institution


async def update_custom_institution(
    session: AsyncSession,
    institution: FinancialInstitution,
    name_en: str | None = None,
    name_ar: str | None = None,
) -> FinancialInstitution:
    """Update a custom institution. Slug is immutable."""
    if name_en is not None:
        institution.name_en = name_en
    if name_ar is not None:
        institution.name_ar = name_ar
    await session.flush()
    return institution


async def soft_delete_institution(
    session: AsyncSession,
    institution: FinancialInstitution,
) -> None:
    """Soft delete a custom institution."""
    institution.is_active = False
    await session.flush()


async def count_active_accounts(
    session: AsyncSession,
    institution_id: int,
) -> int:
    """Count active accounts linked to an institution."""
    from app.models.account import Account

    stmt = select(func.count()).where(
        and_(
            Account.institution_id == institution_id,
            Account.is_active.is_(True),
        )
    )
    result = await session.execute(stmt)
    return result.scalar_one()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/financial_institution.py
git commit -m "feat(services): add financial institution service with CRUD + search"
```

---

## Task 9: Financial Institution Router

**Files:**
- Create: `backend/app/routers/financial_institutions.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write the router**

```python
# backend/app/routers/financial_institutions.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.schemas.financial_institution import (
    InstitutionCreate,
    InstitutionListResponse,
    InstitutionResponse,
    InstitutionUpdate,
)
from app.services import financial_institution as fi_service

router = APIRouter(prefix="/api/v1/financial-institutions", tags=["financial-institutions"])


@router.get("", response_model=dict)
async def list_institutions(
    type: str,
    search: str | None = None,
    session: AsyncSession = Depends(get_db_session),
    household_id=Depends(get_household_id),
):
    if type not in ("bank", "bnpl", "digital_wallet_provider"):
        raise HTTPException(status_code=400, detail="Invalid institution type")

    result = await fi_service.list_institutions(
        session, household_id, inst_type=type, search=search
    )
    return {
        "data": InstitutionListResponse(
            popular=[InstitutionResponse.model_validate(i) for i in result["popular"]],
            all=[InstitutionResponse.model_validate(i) for i in result["all"]],
        ).model_dump()
    }


@router.get("/{slug}", response_model=dict)
async def get_institution(
    slug: str,
    session: AsyncSession = Depends(get_db_session),
    household_id=Depends(get_household_id),
):
    institution = await fi_service.get_institution_by_slug(session, household_id, slug)
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    return {"data": InstitutionResponse.model_validate(institution).model_dump()}


@router.post("", response_model=dict, status_code=201)
async def create_institution(
    data: InstitutionCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id=Depends(get_household_id),
):
    try:
        institution = await fi_service.create_custom_institution(
            session, household_id, data.name_en, data.name_ar, data.type
        )
    except Exception:
        raise HTTPException(status_code=409, detail="Duplicate institution name")
    return {"data": InstitutionResponse.model_validate(institution).model_dump()}


@router.put("/{slug}", response_model=dict)
async def update_institution(
    slug: str,
    data: InstitutionUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id=Depends(get_household_id),
):
    institution = await fi_service.get_institution_by_slug(session, household_id, slug)
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    if institution.is_predefined:
        raise HTTPException(status_code=403, detail="Cannot modify predefined institutions")

    institution = await fi_service.update_custom_institution(
        session, institution, data.name_en, data.name_ar
    )
    return {"data": InstitutionResponse.model_validate(institution).model_dump()}


@router.delete("/{slug}", status_code=204)
async def delete_institution(
    slug: str,
    session: AsyncSession = Depends(get_db_session),
    household_id=Depends(get_household_id),
):
    institution = await fi_service.get_institution_by_slug(session, household_id, slug)
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    if institution.is_predefined:
        raise HTTPException(status_code=403, detail="Cannot delete predefined institutions")

    active_count = await fi_service.count_active_accounts(session, institution.id)
    if active_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"This institution has {active_count} active accounts. Remove or reassign them first.",
        )

    await fi_service.soft_delete_institution(session, institution)
```

- [ ] **Step 2: Register router in main.py**

Add to `backend/app/main.py`:

```python
from app.routers import financial_institutions
# ... in the router registration section:
app.include_router(financial_institutions.router)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/financial_institutions.py backend/app/main.py
git commit -m "feat(api): add financial institutions CRUD endpoints"
```

---

## Task 10: Update Account Schemas

**Files:**
- Modify: `backend/app/schemas/account.py`
- Modify: `backend/app/schemas/common.py`

- [ ] **Step 1: Add warnings to common response**

In `backend/app/schemas/common.py`, add:

```python
class Warning(BaseModel):
    code: str
    message: str
```

- [ ] **Step 2: Rewrite account schemas**

Read the current `backend/app/schemas/account.py` first. Then update the schemas:

**AccountCreate** — replace the existing class:
```python
class AccountCreate(BaseModel):
    name: str
    name_ar: str | None = None
    type: str
    currency: str
    institution_id: int | None = None
    opening_balance: int = 0  # minor units, positive for assets, positive for "amount owed" on CC/BNPL
    opened_at: date | None = None
    iban: str | None = None
    account_number: str | None = None
    account_tier: str | None = None
    branch: str | None = None
    credit_limit: int | None = None
    billing_cycle_day: int | None = Field(None, ge=1, le=31)
    payment_due_day: int | None = Field(None, ge=1, le=31)
```

**AccountUpdate** — replace:
```python
class AccountUpdate(BaseModel):
    name: str | None = None
    name_ar: str | None = None
    institution_id: int | None = None
    iban: str | None = None
    account_number: str | None = None
    account_tier: str | None = None
    branch: str | None = None
    credit_limit: int | None = None
    billing_cycle_day: int | None = Field(None, ge=1, le=31)
    payment_due_day: int | None = Field(None, ge=1, le=31)
    opened_at: date | None = None
```

**InstitutionEmbed** — add new class:
```python
class InstitutionEmbed(BaseModel):
    id: int
    slug: str
    name_en: str
    name_ar: str
    type: str
    logo_url: str | None = None

    model_config = {"from_attributes": True}
```

**AccountResponse** — replace:
```python
class AccountResponse(BaseModel):
    id: int
    name: str
    name_ar: str | None = None
    type: str
    currency: str
    displayed_balance_minor: int = 0
    institution: InstitutionEmbed | None = None
    iban_last4: str | None = None
    account_tier: str | None = None
    credit_limit: int | None = None
    billing_cycle_day: int | None = None
    payment_due_day: int | None = None
    opened_at: date | None = None
    is_active: bool = True
    last_transaction_date: date | None = None

    model_config = {"from_attributes": True}
```

**AccountDetailResponse** — add new class:
```python
class AccountDetailResponse(AccountResponse):
    """Full detail — includes IBAN, account_number, branch."""
    iban: str | None = None
    account_number: str | None = None
    branch: str | None = None
```

**ReconcileRequest** — update:
```python
class ReconcileRequest(BaseModel):
    actual_balance: int
    reconciliation_date: date | None = None  # defaults to today
    notes: str | None = None
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/account.py backend/app/schemas/common.py
git commit -m "feat(schemas): rewrite account schemas for institution FK + metadata fields"
```

---

## Task 11: Update Account Service — Balance Calculation + Institution Validation + Opening Balance

**Files:**
- Modify: `backend/app/services/account.py`

This is the largest service change. Read the current file first, then apply these changes:

- [ ] **Step 1: Update compute_displayed_balance**

Replace the existing function:

```python
async def compute_displayed_balance(session: AsyncSession, account) -> int:
    """Balance = SUM of all active transactions with applies_to_balance."""
    from app.models.transaction import Transaction

    stmt = select(func.coalesce(func.sum(Transaction.amount_minor), 0)).where(
        and_(
            Transaction.account_id == account.id,
            Transaction.is_active.is_(True),
            Transaction.applies_to_balance.is_(True),
        )
    )
    result = await session.execute(stmt)
    return result.scalar_one()
```

- [ ] **Step 2: Add IBAN validation helper**

Add at the top of the service file:

```python
def validate_iban(iban: str) -> bool:
    """Validate IBAN using MOD97 check digit verification."""
    from stdnum import iban as iban_mod
    try:
        iban_mod.validate(iban)
        return True
    except Exception:
        return False
```

- [ ] **Step 3: Add institution type validation helper**

```python
ACCOUNT_TYPE_TO_INSTITUTION_TYPE = {
    "bank_account": "bank",
    "credit_card": "bank",
    "financing_app": "bnpl",
    "digital_wallet": "digital_wallet_provider",
}

INSTITUTION_REQUIRED_TYPES = {"bank_account", "credit_card", "financing_app"}


async def validate_institution(
    session: AsyncSession,
    household_id,
    account_type: str,
    institution_id: int | None,
) -> None:
    """Validate institution_id matches account type requirements."""
    if account_type == "cash_wallet":
        if institution_id is not None:
            raise ValueError("Cash wallets cannot have an institution")
        return

    if account_type in INSTITUTION_REQUIRED_TYPES and institution_id is None:
        raise ValueError(f"Institution is required for {account_type}")

    if institution_id is not None:
        from app.services.financial_institution import get_institution_by_id

        institution = await get_institution_by_id(session, household_id, institution_id)
        if institution is None:
            raise ValueError("Institution not found")

        expected_type = ACCOUNT_TYPE_TO_INSTITUTION_TYPE.get(account_type)
        if expected_type and institution.type.value != expected_type:
            raise ValueError(
                f"Institution type mismatch: expected {expected_type}, got {institution.type.value}"
            )
```

- [ ] **Step 4: Update create_account to create Opening Balance transaction**

Update the existing `create_account` function. After creating the account and flushing, add:

```python
# Create Opening Balance transaction if non-zero
opening_balance = data.opening_balance if hasattr(data, "opening_balance") else 0
if opening_balance != 0:
    from app.models.transaction import Transaction
    from app.models.category import Category

    # Find the "Opening Balance" system category
    ob_stmt = select(Category).where(
        and_(Category.name_en == "Opening Balance", Category.is_system.is_(True))
    )
    ob_category = (await session.execute(ob_stmt)).scalar_one()

    # For credit cards/BNPL, the user enters positive "owed", store as negative
    credit_types = {"credit_card", "financing_app"}
    amount = -opening_balance if data.type in credit_types else opening_balance

    ob_date = data.opened_at or date.today()
    tx_type = "credit" if amount >= 0 else "debit"

    ob_tx = Transaction(
        household_id=household_id,
        account_id=account.id,
        date=ob_date,
        description="Opening balance",
        amount_minor=amount,
        currency=data.currency,
        type=tx_type,
        category_id=ob_category.id,
        applies_to_balance=True,
    )
    session.add(ob_tx)
    await session.flush()
```

- [ ] **Step 5: Add IBAN duplicate check**

Add a helper that returns warnings:

```python
async def check_iban_duplicate(
    session: AsyncSession,
    household_id,
    iban: str,
    exclude_account_id: int | None = None,
) -> list[dict]:
    """Check for duplicate IBAN within household. Returns warnings list."""
    from app.models.account import Account

    stmt = select(Account).where(
        and_(
            Account.household_id == household_id,
            Account.iban == iban,
            Account.is_active.is_(True),
        )
    )
    if exclude_account_id:
        stmt = stmt.where(Account.id != exclude_account_id)

    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        last4 = iban[-4:]
        return [{"code": "DUPLICATE_IBAN", "message": f"Another account in this household already uses IBAN ···{last4}"}]
    return []
```

- [ ] **Step 6: Update reconcile_account**

Replace the existing reconciliation logic:

```python
async def reconcile_account(
    session: AsyncSession,
    household_id,
    account,
    actual_balance: int,
    reconciliation_date: date | None = None,
    notes: str | None = None,
) -> dict:
    """Reconcile account — creates adjustment transaction + record if needed."""
    from app.models.category import Category
    from app.models.reconciliation_record import ReconciliationRecord
    from app.models.transaction import Transaction

    recon_date = reconciliation_date or date.today()
    displayed = await compute_displayed_balance(session, account)
    adjustment = actual_balance - displayed

    if adjustment == 0:
        return {"status": "balanced", "adjustment": 0}

    # Find Reconciliation Adjustment category
    ra_stmt = select(Category).where(
        and_(Category.name_en == "Reconciliation Adjustment", Category.is_system.is_(True))
    )
    ra_category = (await session.execute(ra_stmt)).scalar_one()

    tx_type = "credit" if adjustment >= 0 else "debit"
    tx = Transaction(
        household_id=household_id,
        account_id=account.id,
        date=recon_date,
        description="Reconciliation adjustment",
        amount_minor=adjustment,
        currency=account.currency,
        type=tx_type,
        category_id=ra_category.id,
        applies_to_balance=True,
    )
    session.add(tx)
    await session.flush()

    record = ReconciliationRecord(
        household_id=household_id,
        account_id=account.id,
        transaction_id=tx.id,
        expected_balance_minor=displayed,
        actual_balance_minor=actual_balance,
        adjustment_minor=adjustment,
        reconciliation_date=recon_date,
        notes=notes,
    )
    session.add(record)
    await session.flush()

    return {
        "status": "adjusted",
        "adjustment": adjustment,
        "transaction_id": tx.id,
        "reconciliation_record_id": record.id,
    }
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/account.py
git commit -m "feat(services): rewrite account service — transaction-based balance, institution validation, reconciliation"
```

---

## Task 12: Add System Category Guards to Transaction Service

**Files:**
- Modify: `backend/app/services/transaction.py`

- [ ] **Step 1: Read the current transaction service**

Read `backend/app/services/transaction.py` to understand the existing create/update/delete functions.

- [ ] **Step 2: Add system category validation to create and update**

Add a helper at the top of the file:

```python
async def _validate_category_assignable(session: AsyncSession, category_id: int | None) -> None:
    """Reject manual assignment of system categories."""
    if category_id is None:
        return
    from app.models.category import Category

    stmt = select(Category).where(Category.id == category_id)
    category = (await session.execute(stmt)).scalar_one_or_none()
    if category and category.is_system:
        raise ValueError("SYSTEM_CATEGORY_NOT_ASSIGNABLE")
```

Call `_validate_category_assignable(session, data.category_id)` at the start of the create and update functions.

- [ ] **Step 3: Add system transaction delete guards**

In the delete function, before soft-deleting, add:

```python
# Guard: system transactions
from app.models.category import Category

if transaction.category_id:
    cat_stmt = select(Category).where(Category.id == transaction.category_id)
    category = (await session.execute(cat_stmt)).scalar_one_or_none()
    if category and category.is_system:
        if category.name_en == "Opening Balance":
            raise ValueError("Opening Balance transactions cannot be deleted while the account is active")
        if category.name_en == "Reconciliation Adjustment":
            from app.models.reconciliation_record import ReconciliationRecord

            rec_stmt = select(ReconciliationRecord).where(
                and_(
                    ReconciliationRecord.transaction_id == transaction.id,
                    ReconciliationRecord.is_active.is_(True),
                )
            )
            if (await session.execute(rec_stmt)).scalar_one_or_none():
                raise ValueError("Reconciliation transactions cannot be deleted while the reconciliation record exists")
```

- [ ] **Step 4: Add category reassignment guard to update**

In the update function, if `category_id` is being changed, check:

```python
# Guard: cannot reassign category on system transactions
if data.category_id is not None and data.category_id != transaction.category_id:
    if transaction.category_id:
        cat_stmt = select(Category).where(Category.id == transaction.category_id)
        current_cat = (await session.execute(cat_stmt)).scalar_one_or_none()
        if current_cat and current_cat.is_system:
            raise ValueError("SYSTEM_CATEGORY_NOT_REASSIGNABLE")
    # Also check the new category isn't system
    await _validate_category_assignable(session, data.category_id)
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/transaction.py
git commit -m "feat(services): add system category guards to transaction create/update/delete"
```

---

## Task 13: Update Category Service for Assignable Filter

**Files:**
- Modify: `backend/app/services/category.py`
- Modify: `backend/app/routers/categories.py`

- [ ] **Step 1: Add assignable parameter to list_categories**

In `backend/app/services/category.py`, update the `list_categories` function signature to accept `assignable: bool = False`. When `assignable=True`, add a filter:

```python
if assignable:
    query = query.where(Category.is_system.is_(False))
```

- [ ] **Step 2: Add query param to categories router**

In `backend/app/routers/categories.py`, update the list endpoint to accept:

```python
@router.get("")
async def list_categories(
    ...,
    assignable: bool = False,
    ...
):
    result = await category_service.list_categories(
        session, household_id, ..., assignable=assignable,
    )
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/category.py backend/app/routers/categories.py
git commit -m "feat(api): add assignable filter to categories endpoint for system category exclusion"
```

---

## Task 14: Update Accounts Router

**Files:**
- Modify: `backend/app/routers/accounts.py`

- [ ] **Step 1: Read the current router**

Read `backend/app/routers/accounts.py` to understand the current endpoint signatures.

- [ ] **Step 2: Update create endpoint**

The create endpoint should:
1. Call `validate_institution()` before creating
2. Validate IBAN if provided
3. Create the account with new fields
4. Check IBAN duplicate and return warnings

```python
@router.post("", response_model=dict, status_code=201)
async def create_account(
    data: AccountCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id=Depends(get_household_id),
):
    # Validate institution
    try:
        await account_service.validate_institution(
            session, household_id, data.type, data.institution_id
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Validate IBAN
    if data.iban:
        if not account_service.validate_iban(data.iban):
            raise HTTPException(
                status_code=422,
                detail={"code": "INVALID_IBAN", "message": "Invalid IBAN — check digit verification failed"},
            )

    account = await account_service.create_account(session, household_id, data)

    # Check IBAN duplicate
    warnings = []
    if data.iban:
        warnings = await account_service.check_iban_duplicate(
            session, household_id, data.iban, exclude_account_id=account.id
        )

    response = await _build_account_response(session, account)
    result = {"data": response}
    if warnings:
        result["warnings"] = warnings
    return result
```

- [ ] **Step 3: Update reconcile endpoint**

```python
@router.post("/{account_id}/reconcile", response_model=dict)
async def reconcile_account(
    account_id: int,
    data: ReconcileRequest,
    session: AsyncSession = Depends(get_db_session),
    household_id=Depends(get_household_id),
):
    account = await account_service.get_account(session, household_id, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    result = await account_service.reconcile_account(
        session, household_id, account,
        data.actual_balance, data.reconciliation_date, data.notes
    )

    status_code = 200 if result["status"] == "balanced" else 201
    # FastAPI doesn't let you change status code dynamically in the same function,
    # so use Response:
    from fastapi.responses import JSONResponse
    return JSONResponse(content={"data": result}, status_code=status_code)
```

- [ ] **Step 4: Add helper to build account response with embedded institution**

```python
async def _build_account_response(session: AsyncSession, account) -> dict:
    """Build AccountResponse dict with embedded institution and computed balance."""
    displayed = await account_service.compute_displayed_balance(session, account)

    institution_data = None
    if account.institution_id:
        from app.services.financial_institution import get_institution_by_id
        # Use a direct query since we don't have household_id scoping needed here
        from app.models.financial_institution import FinancialInstitution
        inst_stmt = select(FinancialInstitution).where(
            FinancialInstitution.id == account.institution_id
        )
        institution = (await session.execute(inst_stmt)).scalar_one_or_none()
        if institution:
            institution_data = {
                "id": institution.id,
                "slug": institution.slug,
                "name_en": institution.name_en,
                "name_ar": institution.name_ar,
                "type": institution.type.value if hasattr(institution.type, "value") else institution.type,
                "logo_url": institution.logo_url,
            }

    iban_last4 = account.iban[-4:] if account.iban else None

    return {
        "id": account.id,
        "name": account.name,
        "name_ar": account.name_ar,
        "type": account.type.value if hasattr(account.type, "value") else account.type,
        "currency": account.currency,
        "displayed_balance_minor": displayed,
        "institution": institution_data,
        "iban_last4": iban_last4,
        "account_tier": account.account_tier,
        "credit_limit": account.credit_limit,
        "billing_cycle_day": account.billing_cycle_day,
        "payment_due_day": account.payment_due_day,
        "opened_at": account.opened_at.isoformat() if account.opened_at else None,
        "is_active": account.is_active,
    }
```

- [ ] **Step 5: Update list endpoint to use _build_account_response**

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/accounts.py
git commit -m "feat(api): update accounts router — institution validation, IBAN checks, reconciliation flow"
```

---

## Task 15: Add Institution Summary Endpoint

**Files:**
- Modify: `backend/app/routers/financial_institutions.py`

- [ ] **Step 1: Add summary endpoint**

```python
@router.get("/{slug}/summary", response_model=dict)
async def get_institution_summary(
    slug: str,
    session: AsyncSession = Depends(get_db_session),
    household_id=Depends(get_household_id),
):
    institution = await fi_service.get_institution_by_slug(session, household_id, slug)
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")

    # Get all active accounts for this institution in this household
    from app.models.account import Account

    stmt = select(Account).where(
        and_(
            Account.institution_id == institution.id,
            Account.household_id == household_id,
            Account.is_active.is_(True),
        )
    )
    accounts = (await session.execute(stmt)).scalars().all()

    # Build account responses with balances
    from app.routers.accounts import _build_account_response
    account_responses = []
    for acc in accounts:
        account_responses.append(await _build_account_response(session, acc))

    # Compute summary
    currencies = {a["currency"] for a in account_responses}
    is_approximate = len(currencies) > 1

    total_assets = sum(
        a["displayed_balance_minor"]
        for a in account_responses
        if a["displayed_balance_minor"] > 0
    )
    total_liabilities = sum(
        abs(a["displayed_balance_minor"])
        for a in account_responses
        if a["displayed_balance_minor"] < 0
    )

    # For multi-currency, this is a simplified sum (true conversion needs FX rates)
    total_base = total_assets - total_liabilities

    return {
        "data": {
            "institution": InstitutionResponse.model_validate(institution).model_dump(),
            "accounts": account_responses,
            "summary": {
                "total_assets_minor": total_assets,
                "total_liabilities_minor": total_liabilities,
                "total_base_minor": total_base,
                "base_currency": "EGP",  # TODO: use household base currency
                "is_approximate": is_approximate,
                "account_count": len(accounts),
            },
        }
    }
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/routers/financial_institutions.py
git commit -m "feat(api): add institution summary endpoint"
```

---

## Task 16: Frontend — Institution Hooks

**Files:**
- Create: `frontend/src/hooks/use-institutions.ts`

- [ ] **Step 1: Write hooks**

```typescript
// frontend/src/hooks/use-institutions.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";

export interface Institution {
  id: number;
  slug: string;
  name_en: string;
  name_ar: string;
  type: "bank" | "bnpl" | "digital_wallet_provider";
  logo_url: string | null;
  bic_swift: string | null;
  country: string;
  is_predefined: boolean;
  is_popular: boolean;
}

interface InstitutionListData {
  popular: Institution[];
  all: Institution[];
}

export function useInstitutions(type: string, search?: string) {
  const params = new URLSearchParams({ type });
  if (search) params.set("search", search);

  return useQuery({
    queryKey: ["institutions", type, search],
    queryFn: () =>
      apiGet<InstitutionListData>(
        `/api/v1/financial-institutions?${params.toString()}`
      ),
  });
}

export function useInstitutionSummary(slug: string) {
  return useQuery({
    queryKey: ["institution-summary", slug],
    queryFn: () =>
      apiGet<{
        institution: Institution;
        accounts: any[];
        summary: {
          total_assets_minor: number;
          total_liabilities_minor: number;
          total_base_minor: number;
          base_currency: string;
          is_approximate: boolean;
          account_count: number;
        };
      }>(`/api/v1/financial-institutions/${slug}/summary`),
    enabled: !!slug,
  });
}

export function useCreateInstitution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name_en: string; name_ar: string; type: string }) =>
      apiPost<Institution>("/api/v1/financial-institutions", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["institutions"] }),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/use-institutions.ts
git commit -m "feat(frontend): add institution TanStack Query hooks"
```

---

## Task 17: Frontend — Update Account Type and Hooks

**Files:**
- Modify: `frontend/src/hooks/use-accounts.ts`

- [ ] **Step 1: Read and update Account interface**

Read the current file, then update the `Account` interface:

Replace `institution: string | null` with:
```typescript
institution: {
  id: number;
  slug: string;
  name_en: string;
  name_ar: string;
  type: string;
  logo_url: string | null;
} | null;
iban_last4: string | null;
account_tier: string | null;
```

Remove `balance_minor` from the interface (keep `displayed_balance_minor`).

Update `CreateAccountInput`:
```typescript
interface CreateAccountInput {
  name: string;
  name_ar?: string;
  type: string;
  currency: string;
  institution_id?: number;
  opening_balance?: number;
  opened_at?: string;
  iban?: string;
  account_number?: string;
  account_tier?: string;
  branch?: string;
  credit_limit?: number;
  billing_cycle_day?: number;
  payment_due_day?: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/use-accounts.ts
git commit -m "feat(frontend): update Account type for institution embedding + metadata fields"
```

---

## Task 18: Frontend — Institution Selector Component

**Files:**
- Create: `frontend/src/components/accounts/institution-selector.tsx`

- [ ] **Step 1: Write the institution selector**

This is a combobox with: logo display, bilingual search, popular/all sections, "Other" inline form. Use the existing `Command` component from shadcn/ui (`frontend/src/components/ui/command.tsx`) as the foundation.

```typescript
// frontend/src/components/accounts/institution-selector.tsx
"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useInstitutions, useCreateInstitution, type Institution } from "@/hooks/use-institutions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredLabel } from "@/components/shared/required-label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCOUNT_TYPE_TO_INST_TYPE: Record<string, string> = {
  bank_account: "bank",
  credit_card: "bank",
  financing_app: "bnpl",
  digital_wallet: "digital_wallet_provider",
};

const INST_TYPE_LABELS: Record<string, string> = {
  bank: "institutions.bank",
  bnpl: "institutions.provider",
  digital_wallet_provider: "institutions.walletProvider",
};

interface InstitutionSelectorProps {
  accountType: string;
  value: Institution | null;
  onChange: (institution: Institution | null) => void;
  required?: boolean;
}

export function InstitutionSelector({
  accountType,
  value,
  onChange,
  required = false,
}: InstitutionSelectorProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [otherMode, setOtherMode] = useState(false);
  const [otherNameEn, setOtherNameEn] = useState("");
  const [otherNameAr, setOtherNameAr] = useState("");

  const instType = ACCOUNT_TYPE_TO_INST_TYPE[accountType];
  const createInstitution = useCreateInstitution();

  const { data: instData } = useInstitutions(
    instType || "bank",
    search || undefined
  );

  if (!instType) return null; // cash_wallet — no selector

  const label = t(INST_TYPE_LABELS[instType] || "institutions.bank");
  const institutions = instData?.data;
  const popular = institutions?.popular ?? [];
  const all = institutions?.all ?? [];

  const displayName = (inst: Institution) =>
    locale === "ar" ? inst.name_ar : inst.name_en;

  const secondaryName = (inst: Institution) =>
    locale === "ar" ? inst.name_en : inst.name_ar;

  const handleSelect = (inst: Institution) => {
    onChange(inst);
    setOpen(false);
    setSearch("");
    setOtherMode(false);
  };

  const handleCreateOther = async () => {
    if (!otherNameEn.trim() || !otherNameAr.trim()) return;
    try {
      const result = await createInstitution.mutateAsync({
        name_en: otherNameEn.trim(),
        name_ar: otherNameAr.trim(),
        type: instType,
      });
      if (result.data) {
        handleSelect(result.data);
        setOtherNameEn("");
        setOtherNameAr("");
      }
    } catch {
      // Error handled by mutation
    }
  };

  // Selected state
  if (value && !open) {
    return (
      <div className="space-y-2">
        <RequiredLabel required={required} htmlFor="institution">
          {label}
        </RequiredLabel>
        <div
          className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer"
          onClick={() => setOpen(true)}
        >
          <div className="flex items-center gap-2">
            {value.logo_url ? (
              <img
                src={value.logo_url}
                alt=""
                className="h-6 w-6 rounded object-contain"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-bold text-muted-foreground">
                {displayName(value).slice(0, 2)}
              </div>
            )}
            <span>{displayName(value)}</span>
          </div>
          <button
            type="button"
            className="text-xs text-primary"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
          >
            {t("common.change")}
          </button>
        </div>
      </div>
    );
  }

  // Dropdown open
  return (
    <div className="space-y-2">
      <RequiredLabel required={required} htmlFor="institution">
        {label}
      </RequiredLabel>
      <div className="relative">
        <div
          className={cn(
            "rounded-md border bg-background text-sm",
            open ? "border-primary rounded-b-none" : "border-input"
          )}
        >
          <div
            className="px-3 py-2 text-muted-foreground cursor-pointer"
            onClick={() => setOpen(!open)}
          >
            {t("institutions.selectPlaceholder")}
          </div>
        </div>

        {open && (
          <div className="absolute z-50 w-full border border-t-0 border-primary rounded-b-md bg-background max-h-80 overflow-y-auto">
            {/* Search */}
            <div className="p-2 border-b border-border">
              <Input
                placeholder={t("institutions.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="h-8 text-xs"
              />
            </div>

            {!otherMode && (
              <>
                {/* Popular section */}
                {popular.length > 0 && (
                  <div className="py-1">
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("institutions.popular")}
                    </div>
                    {popular.map((inst) => (
                      <button
                        key={inst.id}
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2 text-start hover:bg-accent transition-colors"
                        onClick={() => handleSelect(inst)}
                      >
                        {inst.logo_url ? (
                          <img src={inst.logo_url} alt="" className="h-7 w-7 rounded object-contain" />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-xs font-bold">
                            {inst.name_en.slice(0, 3)}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold">{displayName(inst)}</div>
                          <div className="text-[10px] text-muted-foreground">{secondaryName(inst)}</div>
                        </div>
                      </button>
                    ))}
                    <div className="mx-3 border-t border-border" />
                  </div>
                )}

                {/* All section */}
                <div className="py-1">
                  {popular.length > 0 && (
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("institutions.allBanks")}
                    </div>
                  )}
                  {all.map((inst) => (
                    <button
                      key={inst.id}
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-start hover:bg-accent transition-colors"
                      onClick={() => handleSelect(inst)}
                    >
                      {inst.logo_url ? (
                        <img src={inst.logo_url} alt="" className="h-7 w-7 rounded object-contain" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-xs font-bold">
                          {inst.name_en.slice(0, 3)}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-semibold">{displayName(inst)}</div>
                        <div className="text-[10px] text-muted-foreground">{secondaryName(inst)}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Other option */}
                <div className="border-t border-border">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2 text-start hover:bg-accent"
                    onClick={() => setOtherMode(true)}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-lg text-muted-foreground">
                      +
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {t("institutions.other")}
                    </span>
                  </button>
                </div>
              </>
            )}

            {/* Other mode — inline form */}
            {otherMode && (
              <div className="p-3 space-y-3">
                <div className="text-xs text-muted-foreground">
                  {t("institutions.enterName")}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("institutions.nameEn")} *</Label>
                  <Input
                    value={otherNameEn}
                    onChange={(e) => setOtherNameEn(e.target.value)}
                    placeholder="e.g., First Abu Dhabi Bank"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("institutions.nameAr")} *</Label>
                  <Input
                    value={otherNameAr}
                    onChange={(e) => setOtherNameAr(e.target.value)}
                    placeholder="مثال: بنك أبوظبي الأول"
                    dir="rtl"
                    className="h-8 text-xs text-end"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateOther}
                    disabled={!otherNameEn.trim() || !otherNameAr.trim() || createInstitution.isPending}
                  >
                    {t("common.create")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setOtherMode(false);
                      setOtherNameEn("");
                      setOtherNameAr("");
                    }}
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add i18n keys**

Add to `frontend/src/messages/en.json` under a new `"institutions"` key:

```json
"institutions": {
  "bank": "Bank",
  "provider": "Provider",
  "walletProvider": "Wallet Provider",
  "selectPlaceholder": "Select bank / اختر البنك",
  "searchPlaceholder": "Search / ابحث",
  "popular": "Popular",
  "allBanks": "All Banks",
  "other": "Other bank...",
  "enterName": "Enter your bank's name",
  "nameEn": "English Name",
  "nameAr": "Arabic Name"
}
```

Add corresponding Arabic translations to `frontend/src/messages/ar.json`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/accounts/institution-selector.tsx frontend/src/messages/en.json frontend/src/messages/ar.json
git commit -m "feat(frontend): add InstitutionSelector combobox component with bilingual search"
```

---

## Task 19: Frontend — Update CreateAccountDialog

**Files:**
- Modify: `frontend/src/components/accounts/create-account-dialog.tsx`

- [ ] **Step 1: Read the current dialog and rewrite**

This is a significant rewrite. The key changes:
1. Replace free-text `institution` with `InstitutionSelector`
2. Replace `initial_balance` with `opening_balance` (with sign-flip hint for CC/BNPL)
3. Add collapsible "Additional Details" with IBAN, account_number, account_tier, branch
4. Add IBAN validation (client-side format check, show error/warning states)
5. Add type-change reset behavior

The implementer should read the current `create-account-dialog.tsx` and apply these changes while preserving the existing form structure (FormSheet wrapper, error handling, submit flow). Key changes:

- Import and use `InstitutionSelector` instead of the plain `<Input>` for institution
- Add state for: `institution` (Institution | null), `iban`, `accountNumber`, `accountTier`, `branch`, `showAdditionalDetails`
- Wire `institution_id: institution?.id` into the submit payload
- Add collapsible section toggle for Additional Details
- Reset institution when account type changes if institution type changes
- Show "Creates an 'Opening Balance' transaction" hint under the balance field
- For credit_card/financing_app, label as "Current Balance Due" with hint about sign flip

The full implementation is context-dependent on the current file structure — the implementer should follow the existing patterns in the file.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/accounts/create-account-dialog.tsx
git commit -m "feat(frontend): rewrite CreateAccountDialog with institution selector + metadata fields"
```

---

## Task 20: Frontend — Credit Details Component

**Files:**
- Create: `frontend/src/components/accounts/credit-details.tsx`

- [ ] **Step 1: Write the credit details display**

```typescript
// frontend/src/components/accounts/credit-details.tsx
"use client";

import { useTranslations, useLocale } from "next-intl";
import { formatAmount, formatAmountAr } from "@/lib/money";
import { cn } from "@/lib/utils";
import { UtilizationBar } from "./utilization-bar";

interface CreditDetailsProps {
  balanceMinor: number;       // displayed_balance_minor (negative = owed)
  creditLimit: number;        // positive, minor units
  currency: string;
  compact?: boolean;          // for card view vs detail view
}

export function CreditDetails({
  balanceMinor,
  creditLimit,
  currency,
  compact = false,
}: CreditDetailsProps) {
  const t = useTranslations("accounts");
  const locale = useLocale();

  const fmt = (amount: number) =>
    locale === "ar" ? formatAmountAr(amount, currency) : formatAmount(amount, currency);

  const usedMinor = Math.max(0, -balanceMinor);
  const availableMinor = creditLimit - usedMinor;
  const utilization = creditLimit > 0 ? (usedMinor / creditLimit) * 100 : 0;

  const availableColor =
    utilization > 80
      ? "text-destructive"
      : utilization > 50
      ? "text-amber-500"
      : "text-primary";

  return (
    <div className={cn("space-y-1", compact ? "text-[10px]" : "text-xs")}>
      <div className="flex gap-3 text-muted-foreground">
        <span>
          {t("limit")}: <span className="text-foreground/70">{fmt(creditLimit)}</span>
        </span>
        <span>
          {t("available")}:{" "}
          <span className={availableColor}>{fmt(Math.max(0, availableMinor))}</span>
        </span>
      </div>
      <UtilizationBar utilization={utilization} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/accounts/credit-details.tsx
git commit -m "feat(frontend): add CreditDetails component with limit + available + utilization"
```

---

## Task 21: Frontend — Bank Group Section Component

**Files:**
- Create: `frontend/src/components/accounts/bank-group-section.tsx`

- [ ] **Step 1: Write the collapsible bank group section**

```typescript
// frontend/src/components/accounts/bank-group-section.tsx
"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatAmount, formatAmountAr } from "@/lib/money";
import { cn } from "@/lib/utils";
import { AccountCard } from "./account-card";
import type { Account } from "@/hooks/use-accounts";
import type { Institution } from "@/hooks/use-institutions";

interface BankGroupSectionProps {
  institution: Institution;
  accounts: Account[];
  baseCurrency: string;
  manageMode?: boolean;
  selectedIds?: Set<number>;
  onSelect?: (id: number) => void;
}

export function BankGroupSection({
  institution,
  accounts,
  baseCurrency,
  manageMode,
  selectedIds,
  onSelect,
}: BankGroupSectionProps) {
  const t = useTranslations("accounts");
  const locale = useLocale();
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);

  const fmt = (amount: number, currency: string) =>
    locale === "ar" ? formatAmountAr(amount, currency) : formatAmount(amount, currency);

  const displayName = locale === "ar" ? institution.name_ar : institution.name_en;

  // Multi-currency detection
  const currencies = new Set(accounts.map((a) => a.currency));
  const isMultiCurrency = currencies.size > 1;

  // Total: sum all balances (simplified — multi-currency uses raw sum)
  const total = accounts.reduce((sum, a) => sum + a.displayed_balance_minor, 0);
  const totalColor = total >= 0 ? "text-primary" : "text-destructive";

  return (
    <div className="rounded-lg overflow-hidden">
      {/* Header */}
      <button
        type="button"
        className="flex w-full items-center justify-between bg-card/80 px-4 py-3 border border-border rounded-t-lg hover:bg-accent/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/accounts/bank/${institution.slug}`);
          }}
        >
          {institution.logo_url ? (
            <img src={institution.logo_url} alt="" className="h-9 w-9 rounded-lg object-contain" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-xs font-bold">
              {institution.name_en.slice(0, 3)}
            </div>
          )}
          <div className="text-start">
            <div className="text-sm font-bold">{displayName}</div>
            <div className="text-xs text-muted-foreground">
              {accounts.length} {accounts.length === 1 ? t("accountCount.one") : t("accountCount.other")}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-end">
            <div className={cn("text-base font-extrabold", totalColor)}>
              {isMultiCurrency ? "≈ " : ""}
              {fmt(Math.abs(total), baseCurrency)}
            </div>
            {isMultiCurrency && (
              <div className="text-[10px] text-amber-500">{t("multiCurrency")}</div>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Cards */}
      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 bg-card/40 border border-t-0 border-border rounded-b-lg">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              manageMode={manageMode}
              selected={selectedIds?.has(account.id)}
              onSelect={onSelect}
              hideInstitution
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/accounts/bank-group-section.tsx
git commit -m "feat(frontend): add BankGroupSection — collapsible institution group with logo and totals"
```

---

## Task 22: Frontend — Independent Section Component

**Files:**
- Create: `frontend/src/components/accounts/independent-section.tsx`

- [ ] **Step 1: Write the independent section**

```typescript
// frontend/src/components/accounts/independent-section.tsx
"use client";

import { useLocale } from "next-intl";
import { formatAmount, formatAmountAr } from "@/lib/money";
import { cn } from "@/lib/utils";
import { AccountCard } from "./account-card";
import type { Account } from "@/hooks/use-accounts";

interface IndependentSectionProps {
  title: string;
  accounts: Account[];
  baseCurrency: string;
  manageMode?: boolean;
  selectedIds?: Set<number>;
  onSelect?: (id: number) => void;
}

export function IndependentSection({
  title,
  accounts,
  baseCurrency,
  manageMode,
  selectedIds,
  onSelect,
}: IndependentSectionProps) {
  const locale = useLocale();

  if (accounts.length === 0) return null;

  const fmt = (amount: number, currency: string) =>
    locale === "ar" ? formatAmountAr(amount, currency) : formatAmount(amount, currency);

  const total = accounts.reduce((sum, a) => sum + a.displayed_balance_minor, 0);
  const totalColor = total >= 0 ? "text-primary" : "text-destructive";
  const gridCols = accounts.length <= 2
    ? "grid-cols-1 sm:grid-cols-2"
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold">{title}</h2>
        <div className={cn("text-sm font-bold", totalColor)}>
          Total: {fmt(Math.abs(total), baseCurrency)}
        </div>
      </div>
      <div className={cn("grid gap-3", gridCols)}>
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            manageMode={manageMode}
            selected={selectedIds?.has(account.id)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/accounts/independent-section.tsx
git commit -m "feat(frontend): add IndependentSection for BNPL/wallet/cash account groups"
```

---

## Task 23: Frontend — Rewrite AccountGrid

**Files:**
- Modify: `frontend/src/components/accounts/account-grid.tsx`

- [ ] **Step 1: Rewrite to use institution-grouped layout**

Replace the current type-based grouping with institution-based grouping:

```typescript
// frontend/src/components/accounts/account-grid.tsx
"use client";

import { useTranslations } from "next-intl";
import { BankGroupSection } from "./bank-group-section";
import { IndependentSection } from "./independent-section";
import type { Account } from "@/hooks/use-accounts";

interface AccountGridProps {
  accounts: Account[];
  baseCurrency: string;
  manageMode?: boolean;
  selectedIds?: Set<number>;
  onSelect?: (id: number) => void;
}

export function AccountGrid({
  accounts,
  baseCurrency,
  manageMode,
  selectedIds,
  onSelect,
}: AccountGridProps) {
  const t = useTranslations("accounts");

  // Group bank_account and credit_card by institution
  const bankAccounts = accounts.filter(
    (a) => (a.type === "bank_account" || a.type === "credit_card") && a.institution
  );

  const bankGroups = new Map<string, { institution: NonNullable<Account["institution"]>; accounts: Account[] }>();
  for (const account of bankAccounts) {
    const slug = account.institution!.slug;
    if (!bankGroups.has(slug)) {
      bankGroups.set(slug, { institution: account.institution!, accounts: [] });
    }
    bankGroups.get(slug)!.accounts.push(account);
  }

  // Independent sections
  const financingApps = accounts.filter((a) => a.type === "financing_app");
  const digitalWallets = accounts.filter((a) => a.type === "digital_wallet");
  const cashWallets = accounts.filter((a) => a.type === "cash_wallet");

  return (
    <div className="space-y-6">
      {/* Bank groups */}
      {[...bankGroups.values()].map((group) => (
        <BankGroupSection
          key={group.institution.slug}
          institution={group.institution}
          accounts={group.accounts}
          baseCurrency={baseCurrency}
          manageMode={manageMode}
          selectedIds={selectedIds}
          onSelect={onSelect}
        />
      ))}

      {/* Independent sections */}
      <IndependentSection
        title={t("financingApp")}
        accounts={financingApps}
        baseCurrency={baseCurrency}
        manageMode={manageMode}
        selectedIds={selectedIds}
        onSelect={onSelect}
      />
      <IndependentSection
        title={t("digitalWallet")}
        accounts={digitalWallets}
        baseCurrency={baseCurrency}
        manageMode={manageMode}
        selectedIds={selectedIds}
        onSelect={onSelect}
      />
      <IndependentSection
        title={t("cashWallet")}
        accounts={cashWallets}
        baseCurrency={baseCurrency}
        manageMode={manageMode}
        selectedIds={selectedIds}
        onSelect={onSelect}
      />
    </div>
  );
}
```

- [ ] **Step 2: Update AccountGrid usage in accounts page**

In `frontend/src/app/(app)/accounts/page.tsx`, pass `baseCurrency` to `AccountGrid`:

```tsx
<AccountGrid
  accounts={accounts}
  baseCurrency={baseCurrency}
  manageMode={manageMode}
  selectedIds={selectedAccountIds}
  onSelect={toggleSelectAccount}
/>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/accounts/account-grid.tsx frontend/src/app/\(app\)/accounts/page.tsx
git commit -m "feat(frontend): rewrite AccountGrid with institution-grouped layout"
```

---

## Task 24: Frontend — Update AccountCard for New Fields

**Files:**
- Modify: `frontend/src/components/accounts/account-card.tsx`

- [ ] **Step 1: Read the current AccountCard and add new fields**

Add to the card display:
- `account.account_tier` as a subtle badge/chip (if set)
- `account.iban_last4` as subtle text `···{last4}` (if set)
- `CreditDetails` component for credit_card and financing_app types with credit_limit
- Institution logo + name for cards NOT in a bank group (financing apps, digital wallets)

Add a `hideInstitution` prop so bank-grouped cards don't show redundant institution info:

```typescript
interface AccountCardProps {
  account: Account;
  manageMode?: boolean;
  selected?: boolean;
  onSelect?: (id: number) => void;
  hideInstitution?: boolean;  // true when inside BankGroupSection
}
```

The implementer should read the existing card component and add these elements following the existing layout patterns.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/accounts/account-card.tsx
git commit -m "feat(frontend): update AccountCard with tier badge, IBAN last4, credit details, institution logo"
```

---

## Task 25: Frontend — Bank Detail Page

**Files:**
- Create: `frontend/src/app/(app)/accounts/bank/[slug]/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// frontend/src/app/(app)/accounts/bank/[slug]/page.tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { useInstitutionSummary } from "@/hooks/use-institutions";
import { FAB } from "@/components/shared/fab";
import { StatCard } from "@/components/shared/stat-card";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";
import { AccountCard } from "@/components/accounts/account-card";
import { AccountGridSkeleton } from "@/components/shared/skeletons";
import { formatAmount, formatAmountAr } from "@/lib/money";

export default function BankDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const t = useTranslations("bankDetail");
  const locale = useLocale();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error } = useInstitutionSummary(slug);
  const result = data?.data;

  const fmt = (amount: number, currency: string) =>
    locale === "ar" ? formatAmountAr(amount, currency) : formatAmount(amount, currency);

  if (isLoading) return <AccountGridSkeleton />;
  if (error || !result) {
    return <p className="text-destructive">{t("notFound")}</p>;
  }

  const { institution, accounts, summary } = result;
  const displayName = locale === "ar" ? institution.name_ar : institution.name_en;
  const secondaryName = locale === "ar" ? institution.name_en : institution.name_ar;
  const approxPrefix = summary.is_approximate ? "≈ " : "";

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => router.push("/accounts")}
      >
        <ArrowLeft className="h-3 w-3" />
        {t("backToAccounts")}
      </button>

      {/* Bank header */}
      <section className="rounded-lg bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-5">
          {institution.logo_url ? (
            <img src={institution.logo_url} alt="" className="h-14 w-14 rounded-xl object-contain" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-lg font-bold">
              {institution.name_en.slice(0, 3)}
            </div>
          )}
          <div>
            <h1 className="text-xl font-extrabold">{displayName}</h1>
            <p className="text-xs text-muted-foreground">
              {secondaryName} · {summary.account_count}{" "}
              {summary.account_count === 1 ? t("account") : t("accounts")}
            </p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label={t("totalDeposits")}
            value={`${approxPrefix}${fmt(summary.total_assets_minor, summary.base_currency)}`}
            variant="success"
          />
          <StatCard
            label={t("totalCreditUsed")}
            value={fmt(summary.total_liabilities_minor, summary.base_currency)}
            variant="danger"
          />
          <StatCard
            label={t("availableCredit")}
            value={fmt(
              accounts.reduce((sum, a) => {
                if (a.credit_limit && a.displayed_balance_minor < 0) {
                  return sum + (a.credit_limit + a.displayed_balance_minor);
                }
                return sum;
              }, 0),
              summary.base_currency
            )}
            variant="success"
          />
          <StatCard
            label={t("netPosition")}
            value={`${approxPrefix}${fmt(summary.total_base_minor, summary.base_currency)}`}
          />
        </div>
      </section>

      {/* Account list */}
      <section>
        <h2 className="text-base font-bold mb-3">{t("accounts")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((account: any) => (
            <AccountCard key={account.id} account={account} hideInstitution />
          ))}
        </div>
      </section>

      {/* FAB — pre-selects institution */}
      <CreateAccountDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        preselectedInstitution={institution}
      />
      <FAB
        onClick={() => setCreateOpen(true)}
        ariaLabel={t("addAccount")}
        tooltip={t("addAccount")}
      />
    </div>
  );
}
```

- [ ] **Step 2: Add i18n keys for bankDetail**

Add to `frontend/src/messages/en.json`:

```json
"bankDetail": {
  "backToAccounts": "Back to Accounts",
  "notFound": "Institution not found",
  "account": "account",
  "accounts": "accounts",
  "totalDeposits": "Total Deposits",
  "totalCreditUsed": "Total Credit Used",
  "availableCredit": "Available Credit",
  "netPosition": "Net Position",
  "addAccount": "Add Account"
}
```

Add corresponding Arabic translations to `ar.json`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(app\)/accounts/bank/ frontend/src/messages/en.json frontend/src/messages/ar.json
git commit -m "feat(frontend): add bank detail page /accounts/bank/[slug]"
```

---

## Task 26: Frontend — Update Account Detail Page

**Files:**
- Modify: `frontend/src/app/(app)/accounts/[id]/page.tsx`

- [ ] **Step 1: Add institution display to account detail**

In the account detail page, add institution logo + name display in the header area (since there's no bank group context here). Read the current file and add after the account name/breadcrumb area:

```tsx
{account.institution && (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    {account.institution.logo_url ? (
      <img src={account.institution.logo_url} alt="" className="h-5 w-5 rounded object-contain" />
    ) : (
      <div className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[8px] font-bold">
        {account.institution.name_en.slice(0, 3)}
      </div>
    )}
    <span>{locale === "ar" ? account.institution.name_ar : account.institution.name_en}</span>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/\(app\)/accounts/\[id\]/page.tsx
git commit -m "feat(frontend): show institution logo + name on account detail page"
```

---

## Task 27: Add New i18n Keys (Complete)

**Files:**
- Modify: `frontend/src/messages/en.json`
- Modify: `frontend/src/messages/ar.json`

- [ ] **Step 1: Add all remaining i18n keys**

Add to `en.json` under `"accounts"`:

```json
"accountCount": {
  "one": "account",
  "other": "accounts"
},
"multiCurrency": "multi-currency",
"financingApp": "Financing Apps",
"digitalWallet": "Digital Wallets",
"cashWallet": "Cash Wallets",
"openingBalanceHint": "Creates an \"Opening Balance\" transaction",
"currentBalanceDueHint": "Amount you currently owe. Creates a negative Opening Balance transaction.",
"additionalDetails": "Additional Details (optional)",
"iban": "IBAN",
"ibanPlaceholder": "EG00 0000 0000 0000 0000 0000 00000",
"ibanHint": "29 characters for Egyptian accounts. Validated with check digit.",
"ibanInvalid": "Invalid IBAN — check digit verification failed",
"ibanDuplicate": "Another account already uses this IBAN",
"accountNumber": "Account Number",
"accountNumberPlaceholder": "Optional — for non-IBAN accounts",
"accountTier": "Account Tier",
"accountTierPlaceholder": "e.g., Premier, Gold",
"branch": "Branch",
"branchPlaceholder": "e.g., Maadi Branch"
```

Add corresponding Arabic translations to `ar.json`.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/messages/en.json frontend/src/messages/ar.json
git commit -m "feat(i18n): add all institution and account metadata i18n keys"
```

---

## Task 28: Logo Placeholders

**Files:**
- Create: `frontend/public/institutions/default.svg`

- [ ] **Step 1: Create default placeholder SVG**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="12" fill="#1a1a2e"/>
  <path d="M32 16L16 26v4h32v-4L32 16z" fill="#4a5568"/>
  <rect x="20" y="32" width="6" height="14" rx="1" fill="#4a5568"/>
  <rect x="29" y="32" width="6" height="14" rx="1" fill="#4a5568"/>
  <rect x="38" y="32" width="6" height="14" rx="1" fill="#4a5568"/>
  <rect x="14" y="46" width="36" height="4" rx="1" fill="#4a5568"/>
</svg>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/public/institutions/default.svg
git commit -m "feat(assets): add default institution placeholder SVG"
```

---

## Summary

**28 tasks** covering:
- Tasks 1-6: Data model, migrations, seed data (Unit 1)
- Tasks 7-9: Financial institution API (Unit 2)
- Tasks 10-15: Account API + reconciliation + system guards (Unit 3)
- Tasks 16-18: Frontend institution hooks + selector component (Unit 4)
- Task 19: Account creation flow rewrite (Unit 5)
- Tasks 20-24: Accounts page redesign (Unit 6)
- Tasks 25-26: Bank detail page (Unit 7)
- Tasks 27-28: i18n + logo placeholders (Unit 8)

Each task produces a self-contained commit. The implementer should read the referenced files before modifying them — the code blocks show the target state but the actual diff depends on current file contents.
