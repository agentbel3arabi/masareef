# External Integrations

**Analysis Date:** 2026-04-07

## APIs & External Services

**Supabase Authentication:**
- Service: Supabase Auth (OAuth 2.0 / JWT)
- What it's used for: User registration, login, session management, multi-tenant isolation
- SDK/Client: 
  - Frontend: `@supabase/ssr` 0.9.0 (server-side session), `@supabase/supabase-js` 2.100.1 (client-side)
  - Backend: Custom JWT verification via `python-jose`
- Auth mechanism: JWT Bearer tokens (HS256 or ES256)
  - Frontend: `@supabase/ssr` creates browser client at `frontend/src/lib/supabase/client.ts`
  - Server-side: `frontend/src/lib/supabase/server.ts` (cookie-based session for SSR)
- Environment vars:
  - Frontend: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Backend: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
- JWKS caching: Backend caches Supabase JWKS (ES256 keys) for 1 hour to avoid repeated fetches; cache fetching is async to prevent event loop blocking (see `app/dependencies.py:_fetch_jwks()`)

**Bank Statement Import:**
- Service: Custom parsing (not external API)
- What it's used for: CSV/Excel/PDF parsing and transaction extraction for bank statements
- Libraries: 
  - `pandas` 3.0.1+ (CSV, Excel)
  - `openpyxl` 3.1.5+ (Excel details)
  - `pdfplumber` 0.11.9+ (PDF extraction)
  - `chardet` 7.4.0+ (encoding detection)
  - `rapidfuzz` 3.14.3+ (fuzzy matching for bank/account name detection)
- Endpoints: 
  - `POST /api/v1/import/parse` - Parse uploaded file (rate-limited 20/min per user)
  - `POST /api/v1/import/commit` - Commit parsed transactions (rate-limited 5/min per user)
- Rate limiting: Per-user limits via JWT `sub` claim or per-IP fallback (see `app/limiter.py`)

## Data Storage

**Databases:**
- Provider: Supabase (managed PostgreSQL 15+)
- Connection: 
  - Async: `postgresql+asyncpg://...` (application queries)
  - Sync: `postgresql://...` (migrations via Alembic)
- Connection pooling: 
  - Supabase uses PgBouncer in transaction mode (no prepared statement caching)
  - SQLAlchemy config: `connect_args={"statement_cache_size": 0}` to disable prepared statements
  - Pool health check: `pool_pre_ping=True` for production; NullPool for testing
- ORM: SQLAlchemy 2.0.30+ with async support (`AsyncSession`, async context managers)
- Migration tool: Alembic 1.13.0+ (config: `backend/alembic.ini`)
- Tables: 22+ tables covering accounts, transactions, debts, budgets, assets, Gam3eya, forecasting, multi-user, etc.
  - See `02-data-models.md` for full schema (single source of truth)

**File Storage:**
- Local filesystem only (uploaded files handled via multipart form data)
- Temporary files cleaned up after import processing
- No S3 or external blob storage currently integrated

**Caching:**
- None at application level currently
- JWT JWKS cache: Backend caches Supabase JWKS in memory (1-hour TTL) to reduce external calls

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (managed OAuth/JWT service)
- Implementation approach:
  - Frontend: `@supabase/ssr` creates secure server-side session (cookies) and client-side session (localStorage)
  - Backend: JWT Bearer token in `Authorization` header; decoded and validated against Supabase public key
  - Token validation: Supports both HS256 (symmetric, using SUPABASE_JWT_SECRET) and ES256 (asymmetric, using JWKS)
  - Per-request: `get_current_user()` dependency extracts `sub` claim from JWT
  - Auto-provisioning: First login auto-creates a personal household for the user (see `app/dependencies.py:get_household_id()`)

**Multi-user & Authorization:**
- Household-based scoping: All data is household-scoped
- RLS (Row-Level Security): Supabase RLS policies enforce household membership checks
- Application-layer defense-in-depth: FastAPI dependencies inject `household_id` into every request
- Role-based access: Enum `HouseholdRole` (ADMIN, EDITOR, VIEWER) stored in `household_members` table
- Custom RBAC: `app/dependencies_rbac.py` provides role validation helpers

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Rollbar, or similar integration)

**Logs:**
- Approach: Python `logging` module (stdlib)
- Backend: Standard logging to stdout (captured by container runtime or systemd)
- Frontend: Browser console logs (dev tools) and optional external service (none configured)
- SQL echo: Enabled in development via `APP_ENV == "development"` (see `app/database.py`)
- Request logging: FastAPI provides request/response logging via Starlette

**Performance Monitoring:**
- None detected (no DataDog, New Relic, or APM integration)

## CI/CD & Deployment

**Hosting:**
- Target: Docker containers (backend: port 8000, frontend: port 3000)
- Orchestration: Docker Compose or Kubernetes (not specified; see docker-compose setup if present)
- Reverse proxy: Assumed to be Traefik or nginx (based on recent Traefik-related fixes)
- Domain: `masareef.agharib.com` (production CORS origin in `backend/.env`)

**CI Pipeline:**
- Service: GitHub Actions (workflows in `.github/workflows/`)
- Backend pipeline (`backend.yml`):
  1. `uv sync` - Install exact dependencies
  2. `ruff check .` - Linting (E, F, I, UP rules)
  3. `ruff format --check .` - Formatting check
  4. `pyright` - Type checking (basic mode)
  5. `pytest --ignore=tests/integration` - Unit tests
  6. `pytest tests/integration/` - Integration tests (requires Supabase secrets)
- Frontend pipeline (`frontend.yml`):
  1. `pnpm install --frozen-lockfile` - Install dependencies
  2. `pnpm lint` - ESLint
  3. `pnpm exec tsc --noEmit` - TypeScript type check
  4. `pnpm build` - Production build validation

**Deployment Triggers:**
- On push to `main` branch with changes to `backend/**` or `frontend/**` (path filtering)
- Branch protection: Require CI checks to pass before merging to `main`

**Secrets Management:**
- GitHub Secrets used for CI integration tests:
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `DATABASE_URL`, `DIRECT_DATABASE_URL`
  - `JWT_SECRET`
- At runtime (container): Environment variables injected from secure vault (not exposed in repository)

## Environment Configuration

**Required env vars (Backend):**
- `SUPABASE_URL` - Supabase project URL (e.g., `https://your-project.supabase.co`)
- `SUPABASE_ANON_KEY` - Supabase anonymous/public key (for client-side requests)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for privileged backend operations)
- `SUPABASE_JWT_SECRET` - JWT signing secret (for HS256 token verification and rate limiting)
- `DATABASE_URL` - Async PostgreSQL connection string (asyncpg driver)

**Optional env vars (Backend):**
- `DIRECT_DATABASE_URL` - Sync PostgreSQL URL for migrations (if different from DATABASE_URL)
- `APP_ENV` - "development", "testing", "production" (default: "development")
- `CORS_ORIGINS` - Comma-separated list of allowed origins (default: `http://localhost:3000`)
- `import_parse_rate_limit` - Requests per minute for parse endpoint (default: 20)
- `import_commit_rate_limit` - Requests per minute for commit endpoint (default: 5)

**Required env vars (Frontend):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (baked into build)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (baked into build)
- `NEXT_PUBLIC_API_URL` - Backend API base URL (e.g., `http://localhost:8000` for dev, `https://api.masareef.agharib.com` for prod)

**Optional env vars (Frontend):**
- `ALLOWED_DEV_ORIGINS` - Comma-separated hostnames allowed to use dev server with hot reload

**Secrets location:**
- Production: Container secrets manager or environment variable injection (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, etc.)
- Development: Local `.env` file (in `.gitignore`, never committed)
- CI/CD: GitHub Secrets (accessed via `${{ secrets.VARIABLE_NAME }}`)

## Webhooks & Callbacks

**Incoming:**
- None detected (no webhooks from external services)

**Outgoing:**
- Supabase Realtime events: Frontend subscribes to Supabase channels for live updates (transactions, account balance changes, debt payments, notifications)
  - Channel pattern: `household:{household_id}` for account/transaction events
  - User-specific: `user:{user_id}` for personal notifications
  - Event types: `account:balance_changed`, `transaction:created`, `transaction:categorized`, `notification:new`, `debt:payment_recorded`
  - Frontend cache invalidation: TanStack Query re-validates relevant query keys on event

**Background Jobs:**
- FastAPI `BackgroundTasks`: Used for fire-and-forget operations (e.g., AI categorization after import commit)
- Scheduled jobs: APScheduler mentioned in CLAUDE.md for future use (nightly exchange rate refresh, forecast recalculation)
- Current implementation: Synchronous task execution in request handlers

## Exchange Rates

**Source:**
- Manual seed data (no external API currently fetching live rates)
- Stored in `exchange_rates` table with daily updates (manual or scheduled job)
- Rate storage: USD → target currency, scaled by 10,000 (e.g., 48.5 EGP/USD stored as 485000)

**Hub currency:**
- USD is the hub — all conversions route through USD (Source → USD → Target)
- FX logic: `app/services/fx.py` handles multi-currency balance aggregation

## Rate Limiting

**Service:**
- slowapi 0.1.9+ (Starlette-based limiter for FastAPI)
- Key function: Per-user JWT `sub` claim with signature verification; falls back to client IP
- Limits:
  - Import parse endpoint: 20 requests/minute per user/IP
  - Import commit endpoint: 5 requests/minute per user/IP
- Verification: JWT signature verified using `SUPABASE_JWT_SECRET` (HS256) before trusting user ID
- Falls back to IP-based limiting if JWT verification fails

## API Response Format

**Success envelope:**
```json
{
  "data": { /* response payload */ },
  "meta": {
    "total": 150,
    "page": 1,
    "page_size": 50
  }
}
```

**Error envelope:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "details": [/* optional details */]
  }
}
```

**Status codes:**
- 200 OK, 201 Created, 204 No Content (success)
- 400 Bad Request, 422 Unprocessable Entity (validation)
- 401 Unauthorized, 403 Forbidden (auth)
- 404 Not Found, 409 Conflict
- 500 Internal Server Error

---

*Integration audit: 2026-04-07*
