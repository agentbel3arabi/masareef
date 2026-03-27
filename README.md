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

### Backend

```bash
cd backend
cp .env.example .env    # Edit with your Supabase credentials
uv sync                 # Install dependencies
uv run uvicorn app.main:app --reload  # Start dev server
```

### Frontend

```bash
cd frontend
pnpm install            # Install dependencies
pnpm dev                # Start dev server
```

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
