# Phase 2B: Import Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist and reuse column mappings. Users save a mapping after a successful first import, optionally link it to an account, and have it auto-applied next time they import to that account.

**Architecture:** Two new SQLAlchemy models (`ImportTemplate`, `AccountImportTemplate`). A thin service layer for CRUD. A router with 6 endpoints. Account-linked templates are checked in the parse flow (after presets, before returning needs_mapping) — this hook is added to `import_service.py`.

**Tech Stack:** SQLAlchemy async, Alembic, Pydantic V2, pytest + aiosqlite

---

## File Map

**New files:**
- `backend/app/models/import_template.py` — ImportTemplate + AccountImportTemplate ORM models
- `backend/app/schemas/import_template.py` — Pydantic schemas
- `backend/app/services/import_template.py` — CRUD service
- `backend/app/routers/import_templates.py` — HTTP endpoints
- `backend/alembic/versions/<hash>_add_import_templates.py` — migration
- `backend/tests/routers/test_import_templates.py`

**Modified files:**
- `backend/app/models/__init__.py` — export new models
- `backend/app/main.py` — register templates router
- `backend/app/services/import_/import_service.py` — check account-linked template before needs_mapping
- `backend/tests/conftest.py` — import new models so tables are created

---

## Task 1: Create branch

- [ ] **Create feature branch**

```bash
git checkout main && git pull
git checkout -b feature/2b-import-templates
```

---

## Task 2: ImportTemplate models

- [ ] **Write failing model test**

Create `backend/tests/models/test_import_template.py`:

```python
import pytest
import uuid
from app.models.import_template import ImportTemplate, AccountImportTemplate


def test_import_template_fields():
    t = ImportTemplate(
        household_id=uuid.uuid4(),
        name="CIB CSV",
        format="csv",
        columns={"date": "Date", "debit": "Withdrawal"},
        date_format="DD/MM/YYYY",
        encoding="utf-8",
        skip_rows=0,
    )
    assert t.name == "CIB CSV"
    assert t.format == "csv"
    assert t.columns["date"] == "Date"


def test_account_import_template_fields():
    link = AccountImportTemplate(account_id=1, template_id=2)
    assert link.account_id == 1
    assert link.template_id == 2
```

- [ ] **Run to see it fail**

```bash
cd backend && uv run pytest tests/models/test_import_template.py -v
```

Expected: ERROR — module not found

- [ ] **Create `backend/app/models/import_template.py`**

```python
"""Import template models — user-saved column mappings for reuse."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ImportTemplate(TimestampMixin, Base):
    __tablename__ = "import_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    name_ar: Mapped[str | None] = mapped_column(Text, nullable=True)
    format: Mapped[str] = mapped_column(String(10), nullable=False)  # 'csv' | 'excel'
    columns: Mapped[dict] = mapped_column(JSONB, nullable=False)
    date_format: Mapped[str] = mapped_column(Text, nullable=False, server_default="DD/MM/YYYY")
    encoding: Mapped[str] = mapped_column(Text, nullable=False, server_default="utf-8")
    skip_rows: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    sheet_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class AccountImportTemplate(Base):
    """Links an account to its default import template (one per account)."""
    __tablename__ = "account_import_templates"

    account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("accounts.id"), primary_key=True
    )
    template_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("import_templates.id"), nullable=False
    )
```

- [ ] **Add to `backend/app/models/__init__.py`**

```python
from app.models.import_template import AccountImportTemplate, ImportTemplate

# Add to __all__:
"ImportTemplate",
"AccountImportTemplate",
```

Full updated `__init__.py`:

```python
from app.models.account import Account
from app.models.base import Base
from app.models.category import Category
from app.models.enums import AccountType, CategoryType, HouseholdRole, TransactionType
from app.models.exchange_rate import ExchangeRate
from app.models.household import Household, HouseholdMember
from app.models.import_template import AccountImportTemplate, ImportTemplate
from app.models.transaction import Transaction, TransactionSplit

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
    "ImportTemplate",
    "AccountImportTemplate",
]
```

- [ ] **Update `backend/tests/conftest.py`** — add new models to the import block:

```python
from app.models import (  # noqa: F401
    Account,
    AccountImportTemplate,
    Base,
    Category,
    ExchangeRate,
    Household,
    HouseholdMember,
    ImportTemplate,
    Transaction,
    TransactionSplit,
)
```

- [ ] **Run tests to see them pass**

```bash
cd backend && uv run pytest tests/models/test_import_template.py -v
```

Expected: 2 PASSED

- [ ] **Commit**

```bash
git add backend/app/models/import_template.py backend/app/models/__init__.py \
        backend/tests/conftest.py backend/tests/models/test_import_template.py
git commit -m "feat(templates): ImportTemplate + AccountImportTemplate models"
```

---

## Task 3: Alembic migration

- [ ] **Generate the migration**

```bash
cd backend && uv run alembic revision --autogenerate -m "add_import_templates"
```

Expected: new file in `backend/alembic/versions/` like `xxxx_add_import_templates.py`

- [ ] **Inspect and verify the migration**

Open the generated file. Ensure it creates:
- `import_templates` table with all columns
- `account_import_templates` table with FK constraints
- Indexes on `import_templates.household_id`

- [ ] **Apply migration to dev DB (if running locally)**

```bash
cd backend && uv run alembic upgrade head
```

Expected: `Running upgrade ... -> xxxx, add_import_templates`

- [ ] **Commit**

```bash
git add backend/alembic/versions/
git commit -m "feat(templates): alembic migration for import_templates and account_import_templates"
```

---

## Task 4: Schemas and service

- [ ] **Write failing service test**

Create `backend/tests/unit/test_import_template_service.py`:

```python
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services import import_template as svc
from app.models.import_template import ImportTemplate


@pytest.mark.asyncio
async def test_create_template():
    session = AsyncMock()
    session.add = MagicMock()
    session.flush = AsyncMock()

    household_id = uuid.uuid4()
    from app.schemas.import_template import ImportTemplateCreate
    data = ImportTemplateCreate(
        name="CIB CSV",
        format="csv",
        columns={"date": "Date", "debit": "Withdrawal"},
        date_format="DD/MM/YYYY",
        encoding="utf-8",
        skip_rows=0,
    )
    template = await svc.create_template(session, household_id, data)
    session.add.assert_called_once()
    session.flush.assert_called_once()
    assert template.name == "CIB CSV"
```

- [ ] **Run to see it fail**

```bash
cd backend && uv run pytest tests/unit/test_import_template_service.py -v
```

Expected: ERROR — module not found

- [ ] **Create `backend/app/schemas/import_template.py`**

```python
"""Schemas for import template CRUD."""
import datetime
from typing import Any

from pydantic import BaseModel


class ImportTemplateCreate(BaseModel):
    name: str
    name_ar: str | None = None
    format: str  # 'csv' | 'excel'
    columns: dict[str, str]
    date_format: str = "DD/MM/YYYY"
    encoding: str = "utf-8"
    skip_rows: int = 0
    sheet_name: str | None = None
    notes: str | None = None
    link_to_account_id: int | None = None  # optionally link on creation


class ImportTemplateUpdate(BaseModel):
    name: str | None = None
    name_ar: str | None = None
    columns: dict[str, str] | None = None
    date_format: str | None = None
    encoding: str | None = None
    skip_rows: int | None = None
    sheet_name: str | None = None
    notes: str | None = None


class ImportTemplateResponse(BaseModel):
    id: int
    household_id: str
    name: str
    name_ar: str | None
    format: str
    columns: dict[str, str]
    date_format: str
    encoding: str
    skip_rows: int
    sheet_name: str | None
    notes: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    linked_account_ids: list[int] = []
```

- [ ] **Create `backend/app/services/import_template.py`**

```python
"""Import template CRUD service."""
import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.import_template import AccountImportTemplate, ImportTemplate
from app.schemas.import_template import ImportTemplateCreate, ImportTemplateUpdate


async def list_templates(
    session: AsyncSession, household_id: uuid.UUID
) -> list[ImportTemplate]:
    result = await session.execute(
        select(ImportTemplate)
        .where(ImportTemplate.household_id == household_id)
        .order_by(ImportTemplate.id)
    )
    return list(result.scalars().all())


async def get_template(
    session: AsyncSession, household_id: uuid.UUID, template_id: int
) -> ImportTemplate | None:
    result = await session.execute(
        select(ImportTemplate).where(
            ImportTemplate.id == template_id,
            ImportTemplate.household_id == household_id,
        )
    )
    return result.scalar_one_or_none()


async def create_template(
    session: AsyncSession, household_id: uuid.UUID, data: ImportTemplateCreate
) -> ImportTemplate:
    template = ImportTemplate(
        household_id=household_id,
        name=data.name,
        name_ar=data.name_ar,
        format=data.format,
        columns=data.columns,
        date_format=data.date_format,
        encoding=data.encoding,
        skip_rows=data.skip_rows,
        sheet_name=data.sheet_name,
        notes=data.notes,
    )
    session.add(template)
    await session.flush()

    if data.link_to_account_id:
        await link_template(session, template.id, data.link_to_account_id)

    return template


async def update_template(
    session: AsyncSession, template: ImportTemplate, data: ImportTemplateUpdate
) -> ImportTemplate:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(template, field, value)
    await session.flush()
    return template


async def delete_template(session: AsyncSession, template: ImportTemplate) -> None:
    # Remove all account links first
    await session.execute(
        delete(AccountImportTemplate).where(
            AccountImportTemplate.template_id == template.id
        )
    )
    await session.delete(template)
    await session.flush()


async def link_template(
    session: AsyncSession, template_id: int, account_id: int
) -> AccountImportTemplate:
    # Upsert: delete existing link for this account, then create new one
    await session.execute(
        delete(AccountImportTemplate).where(
            AccountImportTemplate.account_id == account_id
        )
    )
    link = AccountImportTemplate(account_id=account_id, template_id=template_id)
    session.add(link)
    await session.flush()
    return link


async def unlink_template(
    session: AsyncSession, template_id: int, account_id: int
) -> None:
    await session.execute(
        delete(AccountImportTemplate).where(
            AccountImportTemplate.account_id == account_id,
            AccountImportTemplate.template_id == template_id,
        )
    )
    await session.flush()


async def get_linked_template(
    session: AsyncSession, account_id: int
) -> ImportTemplate | None:
    """Return the default import template linked to an account, or None."""
    result = await session.execute(
        select(ImportTemplate)
        .join(AccountImportTemplate, AccountImportTemplate.template_id == ImportTemplate.id)
        .where(AccountImportTemplate.account_id == account_id)
    )
    return result.scalar_one_or_none()


async def get_linked_account_ids(
    session: AsyncSession, template_id: int
) -> list[int]:
    result = await session.execute(
        select(AccountImportTemplate.account_id).where(
            AccountImportTemplate.template_id == template_id
        )
    )
    return list(result.scalars().all())
```

- [ ] **Run tests to see them pass**

```bash
cd backend && uv run pytest tests/unit/test_import_template_service.py -v
```

Expected: 1 PASSED

- [ ] **Commit**

```bash
git add backend/app/schemas/import_template.py backend/app/services/import_template.py \
        backend/tests/unit/test_import_template_service.py
git commit -m "feat(templates): import template schemas and CRUD service"
```

---

## Task 5: Templates router and tests

- [ ] **Write failing router tests**

Create `backend/tests/routers/test_import_templates.py`:

```python
import pytest
import uuid
from httpx import AsyncClient
from app.models.import_template import ImportTemplate
from tests.conftest import TEST_HOUSEHOLD_ID


@pytest.mark.asyncio
async def test_list_templates_empty(client: AsyncClient):
    resp = await client.get("/api/v1/import/templates")
    assert resp.status_code == 200
    assert resp.json()["data"] == []


@pytest.mark.asyncio
async def test_create_template(client: AsyncClient):
    payload = {
        "name": "CIB CSV",
        "format": "csv",
        "columns": {"date": "Date", "debit": "Withdrawal"},
        "date_format": "DD/MM/YYYY",
        "encoding": "utf-8",
        "skip_rows": 0,
    }
    resp = await client.post("/api/v1/import/templates", json=payload)
    assert resp.status_code == 201
    body = resp.json()["data"]
    assert body["name"] == "CIB CSV"
    assert body["id"] > 0


@pytest.mark.asyncio
async def test_update_template(client: AsyncClient, db_session):
    template = ImportTemplate(
        household_id=TEST_HOUSEHOLD_ID,
        name="Old Name",
        format="csv",
        columns={"date": "Date"},
        date_format="DD/MM/YYYY",
        encoding="utf-8",
        skip_rows=0,
    )
    db_session.add(template)
    await db_session.flush()

    resp = await client.put(
        f"/api/v1/import/templates/{template.id}",
        json={"name": "New Name"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "New Name"


@pytest.mark.asyncio
async def test_delete_template(client: AsyncClient, db_session):
    template = ImportTemplate(
        household_id=TEST_HOUSEHOLD_ID,
        name="To Delete",
        format="csv",
        columns={"date": "Date"},
        date_format="DD/MM/YYYY",
        encoding="utf-8",
        skip_rows=0,
    )
    db_session.add(template)
    await db_session.flush()

    resp = await client.delete(f"/api/v1/import/templates/{template.id}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_link_and_unlink_template(client: AsyncClient, db_session):
    from app.models.account import Account
    from app.models.enums import AccountType

    template = ImportTemplate(
        household_id=TEST_HOUSEHOLD_ID,
        name="Link Test",
        format="csv",
        columns={"date": "Date"},
        date_format="DD/MM/YYYY",
        encoding="utf-8",
        skip_rows=0,
    )
    acct = Account(
        household_id=TEST_HOUSEHOLD_ID,
        name="Test Acct",
        type=AccountType.BANK_ACCOUNT,
        currency="EGP",
        balance_minor=0,
    )
    db_session.add(template)
    db_session.add(acct)
    await db_session.flush()

    resp = await client.post(f"/api/v1/import/templates/{template.id}/link/{acct.id}")
    assert resp.status_code == 200

    resp = await client.delete(f"/api/v1/import/templates/{template.id}/link/{acct.id}")
    assert resp.status_code == 204
```

- [ ] **Run to see them fail**

```bash
cd backend && uv run pytest tests/routers/test_import_templates.py -v
```

Expected: 404s — router not registered

- [ ] **Create `backend/app/routers/import_templates.py`**

```python
"""Import templates HTTP router."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.schemas.common import SuccessResponse
from app.schemas.import_template import (
    ImportTemplateCreate,
    ImportTemplateResponse,
    ImportTemplateUpdate,
)
from app.services import import_template as template_service

router = APIRouter(prefix="/api/v1/import/templates", tags=["import-templates"])


def _to_response(template, linked_ids: list[int]) -> ImportTemplateResponse:
    return ImportTemplateResponse(
        id=template.id,
        household_id=str(template.household_id),
        name=template.name,
        name_ar=template.name_ar,
        format=template.format,
        columns=template.columns,
        date_format=template.date_format,
        encoding=template.encoding,
        skip_rows=template.skip_rows,
        sheet_name=template.sheet_name,
        notes=template.notes,
        created_at=template.created_at,
        updated_at=template.updated_at,
        linked_account_ids=linked_ids,
    )


@router.get("")
async def list_templates(
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    templates = await template_service.list_templates(session, household_id)
    items = []
    for t in templates:
        linked = await template_service.get_linked_account_ids(session, t.id)
        items.append(_to_response(t, linked).model_dump())
    return SuccessResponse(data=items)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_template(
    data: ImportTemplateCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    template = await template_service.create_template(session, household_id, data)
    linked = await template_service.get_linked_account_ids(session, template.id)
    return SuccessResponse(data=_to_response(template, linked).model_dump())


@router.put("/{template_id}")
async def update_template(
    template_id: int,
    data: ImportTemplateUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    template = await template_service.get_template(session, household_id, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    template = await template_service.update_template(session, template, data)
    linked = await template_service.get_linked_account_ids(session, template.id)
    return SuccessResponse(data=_to_response(template, linked).model_dump())


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> None:
    template = await template_service.get_template(session, household_id, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    await template_service.delete_template(session, template)


@router.post("/{template_id}/link/{account_id}")
async def link_template_to_account(
    template_id: int,
    account_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    template = await template_service.get_template(session, household_id, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    await template_service.link_template(session, template_id, account_id)
    return SuccessResponse(data={"linked": True})


@router.delete("/{template_id}/link/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unlink_template_from_account(
    template_id: int,
    account_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> None:
    template = await template_service.get_template(session, household_id, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    await template_service.unlink_template(session, template_id, account_id)
```

- [ ] **Register in `backend/app/main.py`** — add after import_router:

```python
from app.routers.import_templates import router as import_templates_router
# ...
app.include_router(import_templates_router)
```

- [ ] **Run tests to see them pass**

```bash
cd backend && uv run pytest tests/routers/test_import_templates.py -v
```

Expected: 5 PASSED

- [ ] **Commit**

```bash
git add backend/app/routers/import_templates.py backend/app/main.py \
        backend/tests/routers/test_import_templates.py
git commit -m "feat(templates): import templates CRUD router — 6 endpoints"
```

---

## Task 6: Hook account-linked template into parse flow

When a user uploads to an account that has a linked template, auto-apply it (skip needs_mapping).

- [ ] **Update `backend/app/services/import_/import_service.py`**

Add to imports:

```python
from app.services.import_template import get_linked_template
```

In the `parse_upload` function, add this block **before** the `if column_mapping:` block and the CSV/Excel preset check:

```python
    # ── Check for account-linked template ─────────────────────────────────
    if not column_mapping:
        linked_template = await get_linked_template(session, account_id)
        if linked_template:
            if fmt == "csv":
                rows = parse_csv(
                    raw_bytes, linked_template.columns,
                    date_format=linked_template.date_format,
                    skip_rows=linked_template.skip_rows,
                    currency=currency,
                )
            elif fmt == "excel":
                rows = parse_excel(
                    raw_bytes, linked_template.columns,
                    sheet_name=linked_template.sheet_name,
                    skip_rows=linked_template.skip_rows,
                    date_format=linked_template.date_format,
                    currency=currency,
                )
            else:
                linked_template = None  # PDF ignores linked templates

            if linked_template and fmt in ("csv", "excel"):
                mark_duplicates(rows, account_id, existing_hashes)
                return _complete(rows, None)
```

- [ ] **Run full test suite**

```bash
cd backend && uv run pytest -v --tb=short
```

Expected: all tests PASSED

- [ ] **Run lint and type check**

```bash
cd backend && uv run ruff check . && uv run ruff format --check . && uv run pyright
```

Expected: 0 errors

- [ ] **Commit**

```bash
git add backend/app/services/import_/import_service.py
git commit -m "feat(templates): auto-apply account-linked template in parse flow"
```

---

## Done

Unit 2B is complete. Templates can be created, linked to accounts, and auto-applied on next import.

**Next step:** Execute Unit 2C (`feature/2c-import-wizard`) to build the frontend wizard.
