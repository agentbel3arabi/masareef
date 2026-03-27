# Phase 1 / Unit 1A: Project Scaffolding — Handoff

**Date:** 2026-03-27
**PR:** #3 (squash-merged to `main`)
**Commit:** `0a6a416` — `feat(backend): Unit 1A — Project scaffolding (#3)`

---

## What Was Completed

All 8 tasks from the plan — fully implemented and tested:

1. **uv project init** — `pyproject.toml`, `.python-version` (3.12), `.env.example`, `uv.lock`
2. **config.py** — Pydantic BaseSettings with CORS_ORIGINS comma-separated validator
3. **database.py** — Async SQLAlchemy engine + session factory
4. **models/base.py** — DeclarativeBase, TimestampMixin, SoftDeleteMixin
5. **dependencies.py** — `get_db_session` async generator with commit/rollback
6. **main.py** — FastAPI app, CORS middleware, lifespan, `/health` endpoint
7. **Alembic** — Configured for async migrations, `versions/.gitkeep` added
8. **Full verification** — 11 tests pass, ruff clean, pyright clean, CI green

## What's Left in This Unit

Nothing — Unit 1A is 100% complete.

## Decisions Made (Not in Original Spec)

1. **Removed module-level `settings` singleton from `config.py`** — The plan specified `settings = Settings()` at line 26, but this crashes at import time in CI (no `.env` file). Since no module imports that singleton (each creates its own `Settings()` instance), it was removed. Future units should import `Settings` class and instantiate, not look for a `settings` object.

2. **Added placeholder env vars to `backend.yml` CI workflow** — `database.py`, `main.py`, and `alembic/env.py` all call `Settings()` at module level, requiring env vars. CI test step now provides: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`. Do NOT set `APP_ENV` — tests expect the default `"development"`.

3. **CORS_ORIGINS in `.env` must use JSON format** — pydantic-settings v2 tries to JSON-parse `list[str]` fields from env sources before the field_validator runs. The `.env` file uses `CORS_ORIGINS=["http://localhost:3000"]` (JSON array), not comma-separated. The comma-separated format works when passed as kwargs (tested).

4. **Added `# type: ignore[arg-type]` to test_config.py line 22** — Pyright flags passing a string to a `list[str]` parameter. The field_validator handles it at runtime, but the static type doesn't reflect this. Suppressed to keep pyright clean in CI.

5. **Added `alembic/versions/.gitkeep`** — Not in the plan, but without it the directory wouldn't be tracked in git, and `alembic upgrade head` would fail on fresh clones.

## Surprises / Deviations

- **pydantic-settings v2 JSON parsing behavior** — Complex types (`list[str]`) from `.env` files are JSON-parsed before validators run. This was the root cause of multiple test failures. The plan's `.env.example` shows comma-separated `CORS_ORIGINS`, but the actual `.env` needs JSON format.
- **Three CI failures before green** — (1) No env vars at all → collection error, (2) `APP_ENV=testing` overrode test default → assertion failure, (3) Final run passed after removing `APP_ENV`.
- **Copilot review raised 5 comments** — All were about plan-specified patterns (module-level Settings, broad except, unclosed test session, placeholder api/v1 test). None were blockers.

## For Unit 1B

- All models will inherit from `TimestampMixin, SoftDeleteMixin, Base` (defined in `app/models/base.py`)
- Import models in `app/models/__init__.py` so Alembic can detect them
- Import models in `alembic/env.py` where the comment says "Import all models here"
- First migration: `uv run alembic revision --autogenerate -m "create initial tables"`
- The `.env` file has `DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:54322/postgres` — update if connecting to a real Supabase instance
