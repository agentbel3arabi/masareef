# Architecture

**Analysis Date:** 2026-04-07

## Pattern Overview

**Overall:** Full-stack monorepo with separation of concerns across three tiers:
1. **Next.js 16 Frontend** (TypeScript) — UI rendering, client-side state management, data fetching
2. **FastAPI Backend** (Python 3.12) — REST API gateway, business logic, database mutations
3. **Supabase Infrastructure** (PostgreSQL) — persistent storage, authentication, real-time events

**Key Characteristics:**
- **Async-first** — FastAPI async/await, SQLAlchemy 2.0 async sessions, optimized for I/O-bound operations
- **Service-layer isolation** — all business logic (calculations, validations, transformations) lives in services, decoupled from HTTP concerns
- **Household-scoped multi-tenancy** — every query filtered by `household_id`; RLS policies enforce at database level as safety net
- **Pluggable providers** — AI categorization supports Claude, OpenAI, Azure OpenAI, Ollama with fallback chain
- **Type-safe throughout** — Pydantic v2 schemas for validation/serialization, SQLAlchemy 2.0 with type hints, TypeScript strict mode

## Layers

**Presentation Layer (Frontend):**
- Purpose: Render UI, handle user interactions, manage client-side state and caching
- Location: `frontend/src/`
- Contains: Next.js pages (`app/`), React components (`components/`), hooks, utilities, i18n
- Depends on: TanStack Query for server state, Supabase client for auth/real-time, shadcn/ui for components, Tailwind v4 for styling
- Used by: Browser clients only

**API Layer (Backend):**
- Purpose: Route HTTP requests, validate inputs via schemas, enforce auth/RLS, coordinate business logic
- Location: `backend/app/routers/`
- Contains: FastAPI routers (14 route modules), each prefixed with `/api/v1/`; dependency injection for auth/session/household scoping
- Depends on: SQLAlchemy ORM models, Pydantic schemas, service layer functions
- Used by: Frontend (exclusively) and external integrations

**Business Logic Layer (Services):**
- Purpose: Execute domain logic (calculations, transformations, validations) with zero HTTP awareness
- Location: `backend/app/services/`
- Contains: Pure Python functions grouped by domain (account, transaction, debt, balance, FX, import parsing, AI routing, etc.)
- Depends on: SQLAlchemy models for queries, Pydantic schemas for data transfer, external APIs (Claude, OpenAI, PDF libs, etc.)
- Used by: Routers and background tasks

**Data Access Layer (SQLAlchemy ORM):**
- Purpose: Map PostgreSQL tables to Python classes, provide async query builders
- Location: `backend/app/models/`
- Contains: 16 SQLAlchemy model classes with mixins for timestamps and soft deletes
- Depends on: `sqlalchemy.ext.asyncio` for async session management, `app/database.py` for engine/factory
- Used by: Service functions via SQLAlchemy `select()` query API

**Infrastructure Layer (Supabase):**
- Purpose: Host PostgreSQL database, manage user auth, store files, broadcast real-time events
- Location: Not in repo (external managed service)
- Contains: 22+ tables with RLS policies, Auth system, Storage buckets, Realtime channels
- Depends on: Nothing in codebase (external service)
- Used by: FastAPI for JWT validation, Frontend Supabase client for auth/real-time

## Data Flow

**Read (e.g., GET /api/v1/accounts):**

1. Frontend TanStack Query calls `apiGet("/api/v1/accounts?page=1&currency=EGP")`
2. `lib/api-client.ts` attaches JWT Bearer token (from Supabase session)
3. FastAPI `dependencies.py` validates token via `decode_jwt()` → extracts `user_id` via `get_current_user()`
4. `get_household_id()` resolves `user_id` to `household_id` from `household_members` table
5. Router handler `app/routers/accounts.py` calls `account_service.list_accounts(session, household_id, currency)`
6. Service executes SQLAlchemy `select(Account).where(Account.household_id == household_id, ...)`
7. PostgreSQL RLS policy double-checks: `WHERE auth.uid() IN (SELECT user_id FROM household_members WHERE household_id = ?)`
8. Response: `{ data: [...], meta: { total: 15, page: 1, page_size: 50 } }`
9. TanStack Query caches under key `["accounts", { page: 1, currency: "EGP" }]`
10. Frontend renders account list from cache; refetch in background if data is stale

**Write (e.g., POST /api/v1/transactions):**

1. Frontend form submission → TanStack Query mutation with optimistic update
2. Optimistic UI shows new transaction immediately while request is in-flight
3. Frontend sends `POST /api/v1/transactions` with `{ date, amount_minor, category_id, ... }`
4. FastAPI validates request body via Pydantic schema `TransactionCreate`
5. Router calls `transaction_service.create_transaction(session, household_id, schema_data)`
6. Service performs business logic:
   - Validate amount is integer minor units (no floats)
   - Fetch account from DB, verify belongs to household
   - Compute balance delta
   - Check for duplicate (within N days)
   - Create `Transaction` and `TransactionSplit` records
   - Update `account.displayed_balance_minor` atomically
7. FastAPI commits transaction, returns `{ id: 42, ok: true }`
8. TanStack Query invalidates cache keys: `["accounts"]`, `["transactions"]`
9. Supabase Realtime channel publishes `account:balance_changed` event
10. Other connected clients receive event, invalidate their `["accounts"]` cache, refetch fresh data
11. If request fails → optimistic update rolls back automatically

**File Import (e.g., POST /api/v1/import/parse):**

1. Frontend drag-drop → `multipart/form-data` POST with bank statement PDF/CSV
2. FastAPI `routers/import_.py` receives `UploadFile`
3. Router calls `import_service.parse_import()`
4. Service pipeline:
   - Detect encoding (UTF-8, ASCII, cp1252, etc.)
   - Detect file type (PDF → pdfplumber, CSV → pandas, Excel → openpyxl)
   - Detect bank preset (HSBC, CIB, Credit Agricole via content heuristics or header matching)
   - Parse rows using preset rules → structured data (`date`, `description`, `debit`, `credit`)
   - Validate each row (date parsing, amount parsing with currency exponent, etc.)
   - Duplicate check against existing transactions by date/amount/description
   - Return preview: `{ rows: [...], duplicates: 3, valid: 47 }`
5. Frontend displays preview; user toggles rows to skip
6. User clicks "Import" → POST `/api/v1/import/commit { accountId, rows: [...selected rows...] }`
7. Service atomically:
   - INSERT all transaction rows
   - INSERT splits if multi-leg
   - UPDATE account balance in single transaction
8. Trigger background task: AI categorization (FastAPI `BackgroundTasks`)
9. Background worker fetches batch of uncategorized transactions, calls AI provider
10. Update transactions with category suggestions

## Key Abstractions

**Query Layer (service functions):**
- Purpose: Encapsulate SQLAlchemy query logic for common patterns
- Examples: `account.list_accounts()`, `transaction.get_by_id()`, `balance.get_account_balance()`
- Pattern: Always parameterized by `household_id`; filter in `WHERE` clause; return domain objects or Pydantic schemas

**Response Envelope:**
- Purpose: Standardized format for all API responses
- Pattern: `{ data: T, meta: { total, page, page_size }, warnings: [...] }` for lists; `{ data: T }` for single objects
- Errors: `{ error: { code: "...", message: "...", details: [...] } }`
- Defined in: `app/schemas/common.py`

**Money Representation:**
- Purpose: Avoid float rounding errors in financial arithmetic
- Pattern: All amounts stored/transmitted as `BIGINT` in minor units (piasters, cents, fils)
- Currency exponent lookup: `CURRENCIES[currency]["exponent"]` to convert major ↔ minor
- Example: 1,250 EGP = 125,000 minor units; 125.000 KWD = 125,000 minor units
- Services never expose floats for monetary amounts

**Household Isolation:**
- Purpose: Multi-tenant data scoping at query + database layers
- Pattern: Every `where()` clause includes `entity.household_id == household_id`
- RLS policy fallback: PostgreSQL enforces same constraint via `auth.uid() IN (SELECT user_id FROM household_members WHERE household_id = ?)`
- Implementation: `get_household_id()` dependency extracts from JWT; passed to service functions explicitly

**AI Provider Abstraction:**
- Purpose: Pluggable categorization engine; fallback chain if primary provider fails
- Pattern: Abstract base class `app/ai/base.py` defines interface; concrete implementations (Claude, OpenAI, Azure, Ollama) in separate modules
- Router (`app/ai/router.py`) selects provider by user settings + availability
- Fallback: User's configured provider → Ollama (if available) → rule-based heuristics

**Preset-Based Import Parsing:**
- Purpose: Bank-specific parsing rules without duplicating CSV header logic
- Pattern: Base preset class in `app/services/import_/presets/base.py`; bank-specific subclasses (HSBC, CIB) override parsing
- Registry: `presets/registry.py` maps bank slug to preset class
- Detection: Content heuristics or user selection; once detected, preset applies all parsing rules

## Entry Points

**Backend:**
- Location: `backend/app/main.py`
- Triggers: FastAPI app startup (via Docker `CMD uvicorn app.main:app`)
- Responsibilities:
  - Initialize FastAPI app with title, version, exception handlers
  - Configure CORS middleware
  - Register all route routers (14 modules under `app/routers/`)
  - Set up rate limiter (slowapi)
  - Expose `/health` endpoint for monitoring

**Frontend (Root Layout):**
- Location: `frontend/src/app/layout.tsx`
- Triggers: Next.js server startup
- Responsibilities:
  - Load i18n messages via `next-intl/server`
  - Detect locale from URL/browser; set `dir="rtl"` for Arabic, `dir="ltr"` for English
  - Register font variables (Inter for Latin, Noto Sans Arabic)
  - Wrap children with `NextIntlClientProvider` (i18n) and `<Providers>` (query client, theme)

**Frontend (App Shell):**
- Location: `frontend/src/app/(app)/layout.tsx`
- Triggers: User navigates to authenticated route
- Responsibilities:
  - Render `<AppShell>` (navigation sidebar, header, auth guards)
  - Inject child pages

**Frontend (Authentication):**
- Location: `frontend/src/app/(auth)/login/page.tsx` and signup equivalent
- Triggers: User not authenticated or explicitly navigates to `/login`
- Responsibilities:
  - Supabase auth form (email/password, OAuth)
  - On success: redirect to dashboard via next-intl

**Frontend (Onboarding):**
- Location: `frontend/src/app/(onboarding)/onboarding/page.tsx`
- Triggers: New user first login (check via API flag in user profile)
- Responsibilities:
  - Multi-step wizard: create household, add first account, import statement
  - On completion: redirect to dashboard

## Error Handling

**Strategy:** 
- **Frontend**: TanStack Query handles HTTP errors; mutation callbacks show toast notifications; UI degrades gracefully (loading skeleton → empty state)
- **Backend**: FastAPI exceptions converted to HTTP responses; Pydantic validation errors caught automatically; service functions raise `ValueError` for business logic violations; routers catch and wrap in `HTTPException` with error envelope

**Patterns:**

**Validation Error (400):**
```python
# Service function detects invalid input
raise ValueError("Amount must be positive integer")

# Router catches and wraps
except ValueError as e:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=ErrorResponse(
            error=ErrorDetail(code="VALIDATION_ERROR", message=str(e))
        )
    )
```

**Authorization Error (403):**
```python
# Dependency or router checks role
if user_role != HouseholdRole.ADMIN:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=ErrorResponse(
            error=ErrorDetail(code="FORBIDDEN", message="Only admins can delete accounts")
        )
    )
```

**Not Found (404):**
```python
account = await session.get(Account, account_id)
if not account or account.household_id != household_id:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=ErrorResponse(
            error=ErrorDetail(code="NOT_FOUND", message="Account not found")
        )
    )
```

**Frontend Error Handling:**
```typescript
// use-api-mutation.ts wraps TanStack mutation
const mutation = useMutation({
  mutationFn: async (data) => apiPost("/api/v1/accounts", data),
  onError: (error) => {
    const msg = error.response?.data?.error?.message || "Unknown error";
    toast.error(msg);
  }
});
```

## Cross-Cutting Concerns

**Logging:**
- Framework: Python `logging` module (stdlib)
- Pattern: Each module imports `logger = logging.getLogger(__name__)`
- Levels: INFO for milestones (import started, categorization complete), WARNING for degradations, ERROR for failures
- Frontend: `console.log/warn/error` during development; production logs via browser dev tools or external service

**Validation:**
- Frontend: Pydantic v2 schemas in request bodies; automatic 400 response if validation fails
- API response: Pydantic schemas define shape; `model.model_dump()` serializes to JSON
- Database: Not-null constraints, foreign keys, check constraints on columns
- Business rules: Service functions check (e.g., "household exists", "amount is positive") before mutation

**Authentication:**
- Strategy: Supabase JWT (issued at login) attached as `Authorization: Bearer <token>` header
- Validation: `decode_jwt()` dependency validates signature via JWKS endpoint (cached) or secret
- Extraction: `get_current_user()` dependency returns `user_id` UUID
- Household resolution: `get_household_id()` dependency looks up user's household (auto-provisions on first login)
- Frontend: Supabase client manages session (login/logout, token refresh)

**Rate Limiting:**
- Framework: slowapi (Starlette-based)
- Config: Global limiter in `app/limiter.py`; decorators on routers to apply per-route limits
- Pattern: `@limiter.limit("100/minute")`
- Response: 429 Too Many Requests if exceeded

**Real-time Sync:**
- Channel: Supabase Realtime WebSocket
- Events published after mutations (see Supabase event catalog in docs/01-architecture.md)
- Frontend subscription: `contexts/supabase-realtime.ts` or similar hooks subscribe to events
- Action: TanStack Query invalidates cache keys on event; UI refetches fresh data

---

*Architecture analysis: 2026-04-07*
