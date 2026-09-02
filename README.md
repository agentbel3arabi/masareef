# Masareef

[![Backend CI](https://github.com/Gharib89/masareef/actions/workflows/backend.yml/badge.svg)](https://github.com/Gharib89/masareef/actions/workflows/backend.yml)

AI-powered personal finance platform for Egyptian and MENA users. Arabic-first bank statement import, multi-currency tracking, debt management, Gam3eya (rotating savings), asset tracking, budgeting, and 12-month forecasting.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python 3.12), SQLAlchemy async, Pydantic V2 |
| Frontend | Next.js 14.2.x, TypeScript, Tailwind CSS, shadcn/ui |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth (JWT) |
| Package Mgmt | uv (backend), pnpm (frontend) |

## Quick Start

Prerequisites: Docker, [uv](https://docs.astral.sh/uv/), [pnpm](https://pnpm.io), and a free
[Supabase](https://supabase.com) project. Supabase is used for **auth only** — data lives in the
local Postgres below.

```bash
# 1. Database
docker compose -f docker-compose.dev.yml up -d

# 2. Backend
cd backend
cp .env.dev.example .env          # fill in the four SUPABASE_* values from your project settings
uv sync
uv run alembic upgrade head
uv run python -m scripts.seed_demo   # reference data + demo user + 18 months of activity
uv run uvicorn app.main:app --reload

# 3. Frontend (second terminal)
cd frontend
cp .env.local.example .env.local  # same Supabase URL + anon key
pnpm install
pnpm dev
```

Open http://localhost:3000 and sign in with the demo credentials the seeder printed.

Reset to a clean state: `docker compose -f docker-compose.dev.yml down -v`, then repeat step 2
from `alembic upgrade head`. Pass `--anchor YYYY-MM-DD` to `seed_demo` for a reproducible dataset.

## Running Tests

```bash
cd backend
uv run pytest -v        # Run test suite
uv run ruff check .     # Lint
uv run ruff format .    # Format
uv run pyright          # Type check
```

## Project Structure

```
masareef/
├── backend/            # FastAPI application
│   ├── app/
│   │   ├── models/     # SQLAlchemy models
│   │   ├── schemas/    # Pydantic request/response schemas
│   │   ├── services/   # Business logic (money, balance)
│   │   └── dependencies.py  # Auth & DI
│   └── tests/
├── frontend/           # Next.js application (coming soon)
├── docs/               # Feature specs, architecture, roadmap
└── logos/              # Brand assets
```

## License

Private — all rights reserved.
