# Unit 1A: Project Scaffolding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the FastAPI backend skeleton with SQLAlchemy async database connection, Pydantic v2 configuration, and base model mixins — so all subsequent units have a working foundation to build on.

**Architecture:** A standard FastAPI project using async SQLAlchemy 2.0 with Supabase PostgreSQL. Configuration via Pydantic `BaseSettings` loaded from `.env`. Base model mixins provide `created_at`/`updated_at` timestamps and soft delete (`is_active`) that all future models inherit.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2, uv, pytest, httpx

**Required reading:** `CLAUDE.md`, `01-architecture.md`, `02-data-models.md`

---

## File Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, CORS, lifespan, router includes
│   ├── config.py            # Pydantic BaseSettings
│   ├── database.py          # Async engine + session factory
│   ├── dependencies.py      # get_db_session (auth deps come in Unit 1C)
│   └── models/
│       ├── __init__.py
│       └── base.py          # DeclarativeBase, TimestampMixin, SoftDeleteMixin
├── alembic/
│   ├── env.py
│   └── versions/            # (empty — first migration comes in Unit 1B)
├── alembic.ini
├── pyproject.toml
├── .env.example
└── tests/
    ├── __init__.py
    ├── conftest.py           # Test engine, session fixture, override deps
    └── test_health.py        # Health endpoint smoke test
```

---

### Task 1: Initialize Backend Project with uv

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/.env.example`
- Create: `backend/.python-version`

- [ ] **Step 1: Create backend directory and initialize uv project**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef
mkdir -p backend
cd backend
uv init --no-readme
```

- [ ] **Step 2: Set Python version**

Create `backend/.python-version`:
```
3.12
```

- [ ] **Step 3: Configure pyproject.toml**

Replace `backend/pyproject.toml` with:

```toml
[project]
name = "masareef-backend"
version = "0.1.0"
description = "Masareef personal finance API"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    "pydantic>=2.7.0",
    "pydantic-settings>=2.3.0",
    "sqlalchemy[asyncio]>=2.0.30",
    "asyncpg>=0.29.0",
    "alembic>=1.13.0",
    "python-jose[cryptography]>=3.3.0",
    "httpx>=0.27.0",
]

[dependency-groups]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "httpx>=0.27.0",
    "pytest-cov>=5.0.0",
    "ruff>=0.5.0",
    "pyright>=1.1.370",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.ruff]
target-version = "py312"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "UP"]

[tool.pyright]
pythonVersion = "3.12"
typeCheckingMode = "basic"
```

- [ ] **Step 4: Create .env.example**

Create `backend/.env.example`:
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql+asyncpg://postgres:password@db.your-project.supabase.co:5432/postgres

# App
APP_ENV=development
CORS_ORIGINS=http://localhost:3000
```

- [ ] **Step 5: Install dependencies**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/backend
uv sync
```

Expected: `.venv/` created, `uv.lock` generated, all packages installed.

- [ ] **Step 6: Commit**

```bash
git add backend/pyproject.toml backend/uv.lock backend/.python-version backend/.env.example
git commit -m "chore(backend): initialize uv project with core dependencies"
```

---

### Task 2: Configuration Module (config.py)

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Test: `backend/tests/test_config.py`

- [ ] **Step 1: Create package init**

Create `backend/app/__init__.py`:
```python
```
(empty file)

Create `backend/tests/__init__.py`:
```python
```
(empty file)

- [ ] **Step 2: Write the failing test**

Create `backend/tests/test_config.py`:
```python
from app.config import Settings


def test_settings_loads_defaults():
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/test",
        SUPABASE_URL="https://test.supabase.co",
        SUPABASE_ANON_KEY="test-anon-key",
        SUPABASE_SERVICE_ROLE_KEY="test-service-key",
    )
    assert settings.APP_ENV == "development"
    assert settings.CORS_ORIGINS == ["http://localhost:3000"]
    assert settings.DATABASE_URL == "postgresql+asyncpg://user:pass@localhost:5432/test"


def test_settings_cors_origins_parsed_from_comma_separated():
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/test",
        SUPABASE_URL="https://test.supabase.co",
        SUPABASE_ANON_KEY="test-anon-key",
        SUPABASE_SERVICE_ROLE_KEY="test-service-key",
        CORS_ORIGINS="http://localhost:3000,https://masareef.app",
    )
    assert settings.CORS_ORIGINS == ["http://localhost:3000", "https://masareef.app"]
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/backend
uv run pytest tests/test_config.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.config'`

- [ ] **Step 4: Write config.py**

Create `backend/app/config.py`:
```python
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    DATABASE_URL: str

    # App
    APP_ENV: str = "development"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v


settings = Settings()  # type: ignore[call-arg]
```

Note: The `settings` singleton will fail at import time without a `.env` file. Tests pass because they construct `Settings` explicitly with keyword args. The singleton is used by `main.py` at runtime.

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/backend
uv run pytest tests/test_config.py -v
```

Expected: 2 passed

- [ ] **Step 6: Commit**

```bash
git add backend/app/__init__.py backend/app/config.py backend/tests/__init__.py backend/tests/test_config.py
git commit -m "feat(backend): add Pydantic settings configuration module"
```

---

### Task 3: Database Connection (database.py)

**Files:**
- Create: `backend/app/database.py`
- Test: `backend/tests/test_database.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_database.py`:
```python
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.database import async_session_factory, engine


def test_engine_is_async():
    assert isinstance(engine, AsyncEngine)


def test_session_factory_produces_async_session():
    session = async_session_factory()
    assert isinstance(session, AsyncSession)
    # Clean up — don't leave an unclosed session
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/test_database.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.database'`

- [ ] **Step 3: Write database.py**

Create `backend/app/database.py`:
```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import Settings

# Build a settings instance for database URL only — avoids requiring all env vars
# during testing. At runtime, main.py uses the full settings singleton.
_settings = Settings()  # type: ignore[call-arg]

engine = create_async_engine(
    _settings.DATABASE_URL,
    echo=_settings.APP_ENV == "development",
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
```

- [ ] **Step 4: Create a .env file for local development**

Create `backend/.env` (NOT committed — add to .gitignore):
```env
SUPABASE_URL=https://placeholder.supabase.co
SUPABASE_ANON_KEY=placeholder
SUPABASE_SERVICE_ROLE_KEY=placeholder
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:54322/postgres
APP_ENV=development
CORS_ORIGINS=http://localhost:3000
```

Add to `backend/.gitignore`:
```
.env
.venv/
__pycache__/
*.pyc
.pytest_cache/
.ruff_cache/
htmlcov/
.coverage
```

- [ ] **Step 5: Run test to verify it passes**

```bash
uv run pytest tests/test_database.py -v
```

Expected: 2 passed

- [ ] **Step 6: Commit**

```bash
git add backend/app/database.py backend/tests/test_database.py backend/.gitignore
git commit -m "feat(backend): add async SQLAlchemy engine and session factory"
```

---

### Task 4: Base Model Mixins (models/base.py)

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/base.py`
- Test: `backend/tests/test_base_model.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_base_model.py`:
```python
from datetime import datetime, timezone

from sqlalchemy import inspect

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


# Create a test model that uses both mixins
class _TestModel(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "test_model"
    id: int  # type: ignore[assignment]

    from sqlalchemy import Integer
    from sqlalchemy.orm import Mapped, mapped_column

    id: Mapped[int] = mapped_column(Integer, primary_key=True)


def test_timestamp_mixin_has_created_at_and_updated_at():
    mapper = inspect(_TestModel)
    column_names = [c.key for c in mapper.column_attrs]
    assert "created_at" in column_names
    assert "updated_at" in column_names


def test_soft_delete_mixin_has_is_active():
    mapper = inspect(_TestModel)
    column_names = [c.key for c in mapper.column_attrs]
    assert "is_active" in column_names


def test_soft_delete_default_is_true():
    col = _TestModel.__table__.c.is_active
    assert col.default.arg is True


def test_timestamp_columns_are_not_nullable():
    col_created = _TestModel.__table__.c.created_at
    col_updated = _TestModel.__table__.c.updated_at
    assert col_created.nullable is False
    assert col_updated.nullable is False
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/test_base_model.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.models'`

- [ ] **Step 3: Write the models package**

Create `backend/app/models/__init__.py`:
```python
from app.models.base import Base

__all__ = ["Base"]
```

Create `backend/app/models/base.py`:
```python
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class SoftDeleteMixin:
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )
```

- [ ] **Step 4: Run test to verify it passes**

```bash
uv run pytest tests/test_base_model.py -v
```

Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/__init__.py backend/app/models/base.py backend/tests/test_base_model.py
git commit -m "feat(backend): add SQLAlchemy base with timestamp and soft-delete mixins"
```

---

### Task 5: Dependencies Module (dependencies.py)

**Files:**
- Create: `backend/app/dependencies.py`
- Test: `backend/tests/test_dependencies.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_dependencies.py`:
```python
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session


@pytest.mark.asyncio
async def test_get_db_session_yields_async_session():
    session_gen = get_db_session()
    session = await session_gen.__anext__()
    assert isinstance(session, AsyncSession)
    # Clean up
    try:
        await session_gen.__anext__()
    except StopAsyncIteration:
        pass
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/test_dependencies.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.dependencies'`

- [ ] **Step 3: Write dependencies.py**

Create `backend/app/dependencies.py`:
```python
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

Note: `get_current_user` and `get_household_id` will be added in Unit 1C after auth is set up.

- [ ] **Step 4: Run test to verify it passes**

```bash
uv run pytest tests/test_dependencies.py -v
```

Expected: 1 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/dependencies.py backend/tests/test_dependencies.py
git commit -m "feat(backend): add database session dependency injection"
```

---

### Task 6: FastAPI Application (main.py) + Health Endpoint

**Files:**
- Create: `backend/app/main.py`
- Test: `backend/tests/test_health.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/conftest.py`:
```python
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
```

Create `backend/tests/test_health.py`:
```python
import pytest


@pytest.mark.asyncio
async def test_health_returns_ok(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


@pytest.mark.asyncio
async def test_api_v1_prefix_exists(client):
    # Verify the API prefix is configured (will 404 but proves the router mount point)
    response = await client.get("/api/v1/")
    # 404 is expected — no routes yet — but NOT 405 or connection error
    assert response.status_code in (404, 200)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/test_health.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.main'`

- [ ] **Step 3: Write main.py**

Create `backend/app/main.py`:
```python
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings

# Load settings — will use .env file at runtime
try:
    _settings = Settings()  # type: ignore[call-arg]
    _cors_origins = _settings.CORS_ORIGINS
except Exception:
    _cors_origins = ["http://localhost:3000"]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Startup
    yield
    # Shutdown


app = FastAPI(
    title="Masareef API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
uv run pytest tests/test_health.py -v
```

Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/main.py backend/tests/conftest.py backend/tests/test_health.py
git commit -m "feat(backend): add FastAPI app with health endpoint and CORS"
```

---

### Task 7: Alembic Setup

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Create: `backend/alembic/versions/` (empty directory)

- [ ] **Step 1: Initialize Alembic**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/backend
uv run alembic init alembic
```

- [ ] **Step 2: Configure alembic.ini**

Edit `backend/alembic.ini` — set the `sqlalchemy.url` to empty (we'll use env.py for async):

Find and replace the `sqlalchemy.url` line:
```ini
sqlalchemy.url =
```

- [ ] **Step 3: Configure alembic/env.py for async**

Replace `backend/alembic/env.py` with:
```python
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.config import Settings
from app.models.base import Base

# Import all models here so Alembic can detect them
# (Models will be added as they are created in subsequent units)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

settings = Settings()  # type: ignore[call-arg]
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 4: Verify Alembic loads without errors**

```bash
uv run alembic --help
```

Expected: Alembic help text displayed, no import errors.

- [ ] **Step 5: Commit**

```bash
git add backend/alembic.ini backend/alembic/
git commit -m "chore(backend): configure Alembic for async SQLAlchemy migrations"
```

---

### Task 8: Verify Full Test Suite

- [ ] **Step 1: Run all tests**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/backend
uv run pytest -v
```

Expected: All tests pass (config: 2, database: 2, base_model: 4, dependencies: 1, health: 2 = **11 tests**).

- [ ] **Step 2: Run linting**

```bash
uv run ruff check .
uv run ruff format --check .
```

Expected: No errors. If there are formatting issues, run `uv run ruff format .` and re-check.

- [ ] **Step 3: Verify dev server starts**

```bash
uv run uvicorn app.main:app --reload --port 8000
```

Expected: Server starts, `http://localhost:8000/health` returns `{"status": "ok", "version": "0.1.0"}`.

Note: The database connection will fail if no Supabase instance is running — that's expected. The health endpoint works without a DB connection.

- [ ] **Step 4: Final commit (if any formatting fixes)**

```bash
git add -A
git commit -m "style(backend): apply ruff formatting"
```

Only commit if there were formatting changes. Skip if clean.
