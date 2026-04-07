# Technology Stack

**Analysis Date:** 2026-04-07

## Languages

**Primary:**
- Python 3.12 - Backend API (`backend/`) and domain logic
- TypeScript 5 - Frontend application (`frontend/`)
- JavaScript (Node.js 22) - Frontend build and runtime

**Secondary:**
- SQL - Database queries (PostgreSQL 15+)
- CSS 4 / Tailwind CSS 4 - Styling

## Runtime

**Environment:**
- Python 3.12 (specified in `backend/.python-version`)
- Node.js 22-slim (Docker), with corepack enabled for pnpm
- Uvicorn ASGI server for FastAPI

**Package Manager:**
- Backend: **uv** v1.0+ (Astral dependency manager, faster than pip/Poetry)
  - Lockfile: `backend/uv.lock` (committed)
- Frontend: **pnpm** v10.32.1 (enforced via `packageManager` in `frontend/package.json`)
  - Lockfile: `frontend/pnpm-lock.yaml` (committed)
  - Uses corepack (`RUN corepack enable && corepack prepare pnpm@latest --activate`)

## Frameworks

**Core:**
- FastAPI 0.115.0+ - Async Python REST API framework with OpenAPI docs
- Next.js 16.1.6 - React 19 framework with App Router (`app/` directory)
- React 19 - UI component library

**Backend Infrastructure:**
- SQLAlchemy 2.0.30+ with asyncio - Async ORM for PostgreSQL
- Alembic 1.13.0+ - Database migration tool
- Asyncpg 0.29.0+ - PostgreSQL async driver
- Uvicorn 0.30.0+ with standard extras - ASGI server

**Frontend State Management:**
- TanStack Query (React Query) 5.95.2 - Server state management and cache invalidation
- next-intl 4.8.3 - I18n (Arabic-first, RTL support)
- next-themes 0.4.6 - Dark/light mode theming

**UI Components:**
- shadcn/ui (base-nova style) - Component library built on `@base-ui/react` 1.3.0
- @base-ui/react 1.3.0 - Headless React primitives
- Tailwind CSS 4.2.2+ - Utility-first CSS framework (CSS-in-JS config, logical properties for RTL)
- lucide-react 1.7.0 - Icon library
- sonner 2.0.7 - Toast notifications (not Radix toast)
- Tailwind Merge 3.5.0 - Class merging utility
- CVA (class-variance-authority) 0.7.1 - Component variant system

**Authentication & Session:**
- Supabase Auth (via Supabase JS SDKs) - JWT-based authentication with Supabase
- python-jose 3.3.0+ with cryptography - JWT encoding/decoding (backend)
- Supabase SSR middleware (`@supabase/ssr`) - Server-side session management

**File Handling & Import:**
- pandas 3.0.1+ - Data manipulation and CSV/Excel parsing
- openpyxl 3.1.5+ - Excel file parsing
- pdfplumber 0.11.9+ - PDF extraction
- chardet 7.4.0+ - Character encoding detection
- python-multipart 0.0.22+ - Multipart form data handling
- react-dropzone 15.0.0 - File upload UI component

**Data Processing & Validation:**
- Pydantic 2.7.0+ (V2 only) - Data validation and serialization
- pydantic-settings 2.3.0+ - Environment variable management
- python-dateutil 2.9.0+ - Date/time utilities
- python-stdnum 2.2+ - Validation of standard numbers (e.g., check digits)
- rapidfuzz 3.14.3+ - Fuzzy string matching (for bank statement parsing)

**Monitoring & Rate Limiting:**
- slowapi 0.1.9+ - Rate limiter for FastAPI (slowapi + Starlette)

**Internationalization:**
- next-intl 4.8.3 - Frontend i18n with date/number/currency formatting
- date-fns 4.1.0 - Date formatting library
- react-day-picker 9.14.0 - Calendar component

**Build & Dev Tools:**
- postcss 8+ - CSS processing
- @tailwindcss/postcss 4.2.2+ - Tailwind CSS 4 processing
- ESLint 9+ - Linting (Next.js config)
- Ruff 0.5.0+ - Fast Python linter and formatter (backend)
- Pyright 1.1.370+ - Static type checker for Python

## Key Dependencies

**Critical (Backend):**
- `sqlalchemy[asyncio]` 2.0.30+ - Core data layer; all queries route through async SQLAlchemy
- `asyncpg` 0.29.0+ - PostgreSQL driver; Supabase uses PgBouncer (no prepared statement caching)
- `fastapi` 0.115.0+ - API framework; every endpoint is async
- `pydantic` 2.7.0+ (V2 ONLY) - Validation; use `model.model_dump()` exclusively
- `python-jose[cryptography]` 3.3.0+ - JWT verification for Supabase ES256/HS256 tokens

**Critical (Frontend):**
- `next` 16.1.6 - Core framework; App Router only
- `react` 19 - UI library
- `@supabase/supabase-js` 2.100.1 - Authentication and real-time subscriptions
- `@supabase/ssr` 0.9.0 - Server-side session management
- `@tanstack/react-query` 5.95.2 - Server state, cache invalidation
- `tailwindcss` 4.2.2 - Styling engine
- `@base-ui/react` 1.3.0 - Unstyled React primitives

**Infrastructure:**
- `httpx` 0.27.0+ - Async HTTP client (backend; used for JWT JWKS fetching)
- `slowapi` 0.1.9+ - Rate limiting via JWT user ID or client IP

**Testing (Backend):**
- `pytest` 8.0.0+ - Test runner
- `pytest-asyncio` 0.23.0+ - Async test support
- `pytest-cov` 5.0.0+ - Coverage reporting
- `aiosqlite` 0.22.1+ - In-memory SQLite for testing (optional, not used in current test strategy)

## Configuration

**Environment:**
- Backend: `.env` file (source of truth at runtime)
  - Required vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `DATABASE_URL`
  - Optional: `DIRECT_DATABASE_URL` (for migrations), `APP_ENV` (default "development"), `CORS_ORIGINS`, `import_parse_rate_limit`, `import_commit_rate_limit`
  - Example: `backend/.env.example`
  
- Frontend: `.env.local` file (Next.js convention)
  - Required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`
  - Optional: `ALLOWED_DEV_ORIGINS` (comma-separated; for dev mode hot-reload)
  - Example: `frontend/.env.local.example`

**Backend Configuration Files:**
- `backend/pyproject.toml` - Project metadata, dependencies, tool configs (ruff, pytest, pyright)
- `backend/alembic.ini` - Database migration config
- `.python-version` - Python version constraint (3.12)

**Frontend Configuration Files:**
- `frontend/package.json` - Dependencies, scripts, pnpm version pinning
- `frontend/tsconfig.json` - TypeScript compiler options (strict mode, path aliases `@/*` → `./src/*`)
- `frontend/next.config.mjs` - Next.js config with next-intl plugin, standalone output for Docker
- `frontend/components.json` - shadcn/ui config (base-nova style, RTL enabled, Tailwind CSS 4, lucide icons)
- `frontend/postcss.config.mjs` - PostCSS config for Tailwind
- `frontend/eslint.config.mjs` - ESLint rules

## Build & Deployment

**Backend Build:**
- Dockerfile: Multi-stage build using `python:3.12-slim`
- Build step: Install uv, copy `pyproject.toml` + `uv.lock`, run `uv sync --frozen --no-dev`
- Runtime: Copy virtualenv and app, expose port 8000
- Start: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Features: SQL echo disabled by default (only enabled in development via `APP_ENV`)

**Frontend Build:**
- Dockerfile: Multi-stage build using `node:22-slim`
- Build step: Enable corepack, install pnpm, `pnpm install --frozen-lockfile`, `pnpm build`
- Build args: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL` (baked in at build time)
- Runtime: Copy standalone output + static assets + public folder, expose port 3000
- Start: `node server.js`
- Note: Output is "standalone" for minimal Docker size

## Platform Requirements

**Development:**
- Python 3.12 (via `uv` or direct install)
- Node.js 22+ with corepack enabled
- Git (version control)
- Docker & Docker Compose (optional, for containerized development)

**Production:**
- Supabase (PostgreSQL 15+, Auth, Realtime)
- Docker or container runtime (recommended)
- HTTPS reverse proxy (Traefik, nginx, etc.)
- Environment variables from secure vault or secrets manager

**CI/CD:**
- GitHub Actions (`backend.yml`, `frontend.yml` workflows)
- Backend: Python 3.12 + uv, runs ruff lint/format, pyright type check, pytest
- Frontend: Node.js 22, runs pnpm, ESLint, tsc type check, pnpm build
- Integration tests use GitHub Secrets for Supabase credentials

---

*Stack analysis: 2026-04-07*
