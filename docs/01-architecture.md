# Architecture & Technical Decisions

## System Architecture

```
┌─────────────────────────────────────────┐
│           Next.js Frontend              │
│  TypeScript · shadcn/ui · Tailwind v4   │
│  react-plotly.js · TanStack Query       │
│  Supabase Client (auth + realtime)      │
└──────────────────┬──────────────────────┘
                   │ REST API (JSON)
┌──────────────────▼──────────────────────┐
│           FastAPI Backend               │
│  Python 3.12+ · Pydantic v2             │
│  SQLAlchemy 2.0 · Alembic              │
│  AI Router (Claude/OpenAI/Azure/Ollama) │
│  Import Engine (PDF/CSV/Excel/OCR)      │
└──────────────────┬──────────────────────┘
                   │ PostgreSQL wire protocol
┌──────────────────▼──────────────────────┐
│         Supabase Infrastructure         │
│  PostgreSQL · Auth · Storage · Realtime │
│  Row Level Security · Edge Functions    │
└─────────────────────────────────────────┘
```

## Component Responsibilities

### Next.js Frontend
- **Renders all UI** — pages, components, forms, charts, navigation
- **Manages auth state** via Supabase client SDK (login, session, token refresh)
- **Fetches data** from FastAPI via TanStack Query (caching, invalidation, optimistic updates)
- **Subscribes to real-time events** via Supabase Realtime (balance updates, notifications)
- **Handles i18n** via next-intl (Arabic/English, RTL/LTR, Hijri dates, Arabic-Indic numerals)
- **Never talks to the database directly** — all mutations go through FastAPI

### FastAPI Backend
- **Single API gateway** — all business logic lives here, no split with Supabase PostgREST
- **Validates requests** via Pydantic v2 models
- **Executes business logic** — amortization, forecasting, balance computation, import parsing, FX conversion
- **Manages database** via SQLAlchemy 2.0 async sessions
- **Verifies auth** — validates Supabase JWT on every request, extracts user/household context
- **Routes AI requests** — pluggable provider system (Claude, OpenAI, Azure OpenAI, Ollama)
- **Handles file uploads** — bank statements, receipts → parse → return structured data

### Supabase Infrastructure
- **PostgreSQL** — primary data store, all tables with RLS policies
- **Auth** — user registration, login (email/password, OAuth, magic link), JWT issuance, session management
- **Storage** — receipt images, uploaded bank statements, exported reports
- **Realtime** — WebSocket push for balance changes, notification delivery, multi-user sync
- **RLS** — every table has row-level security policies scoping data to the user's household

## Why These Choices

### FastAPI over Django/Flask
- **Async-first** — file parsing and AI calls are I/O-bound; async handles them without blocking
- **Pydantic built-in** — request validation, response serialization, OpenAPI schema generation for free
- **Auto-generated OpenAPI spec** — frontend can auto-generate a TypeScript client via openapi-typescript-codegen
- **No ORM magic** — SQLAlchemy 2.0 is explicit; Django's ORM hides too much for financial correctness
- **Performance** — FastAPI on Uvicorn benchmarks 2-5x faster than Flask/Django for API workloads

### SQLAlchemy 2.0 over Django ORM / raw SQL
- **Type-safe** — 2.0 style uses Python type hints for column definitions
- **Async support** — native async sessions via `asyncpg`
- **Migration control** — Alembic gives explicit, reviewable migration files (critical for financial data)
- **No framework lock-in** — works with any Python web framework
- **Explicit queries** — no implicit lazy loading that could cause N+1 in financial aggregations

### Supabase over self-hosted PostgreSQL
- **Auth out of the box** — email, OAuth, magic link, JWT — no custom auth code
- **Storage included** — receipt images and bank statements without S3 setup
- **Realtime included** — WebSocket push without Redis/Pusher
- **RLS built-in** — multi-tenant data isolation at the database level
- **Free tier** — 500MB DB, 1GB storage, 50K MAU — enough for early growth
- **Escape hatch** — standard PostgreSQL; can migrate to self-hosted anytime

### Plotly over Recharts/Nivo/Chart.js
- **Interactive by default** — zoom, pan, hover tooltips, range selection built-in
- **Financial chart types** — candlestick, waterfall, funnel, sankey — all native
- **Better for large datasets** — WebGL rendering for 10K+ data points (transaction history charts)
- **Export built-in** — users can download charts as PNG/SVG without custom code
- **Python parity** — same library works in backend for server-generated reports/PDFs

### TanStack Query over SWR / server components
- **Cache invalidation** — mutation callbacks invalidate specific query keys (e.g., after creating a transaction, refetch account balance)
- **Optimistic updates** — show the result immediately, roll back on error
- **Offline support** — query cache persists, mutations queue for retry
- **Background refetch** — stale data shows instantly while fresh data loads
- **DevTools** — visual cache inspector during development

## Project Structure

```
masareef/
├── frontend/                    # Next.js application
│   ├── src/
│   │   ├── app/                 # App Router pages and layouts
│   │   ├── components/          # React components by feature domain
│   │   │   ├── accounts/
│   │   │   ├── transactions/
│   │   │   ├── debts/
│   │   │   ├── assets/
│   │   │   ├── gam3eya/
│   │   │   ├── import/
│   │   │   ├── dashboard/
│   │   │   ├── forecasting/
│   │   │   ├── budgets/
│   │   │   ├── settings/
│   │   │   ├── layout/
│   │   │   ├── shared/
│   │   │   └── ui/              # shadcn/ui primitives
│   │   ├── lib/                 # Client utilities (money formatting, dates, i18n)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── api/                 # Auto-generated FastAPI client (from OpenAPI)
│   │   └── i18n/                # next-intl configuration
│   ├── messages/                # Translation files (ar.json, en.json)
│   ├── public/                  # Static assets
│   └── package.json
│
├── backend/                     # FastAPI application
│   ├── app/
│   │   ├── main.py              # FastAPI app, startup events, CORS
│   │   ├── config.py            # Settings via Pydantic BaseSettings
│   │   ├── database.py          # SQLAlchemy async engine + session factory
│   │   ├── dependencies.py      # FastAPI Depends (auth, db session, current user)
│   │   ├── models/              # SQLAlchemy ORM models
│   │   │   ├── account.py
│   │   │   ├── transaction.py
│   │   │   ├── category.py
│   │   │   ├── debt.py
│   │   │   ├── installment.py
│   │   │   ├── gam3eya.py
│   │   │   ├── asset.py
│   │   │   ├── budget.py
│   │   │   ├── recurring_rule.py
│   │   │   ├── exchange_rate.py
│   │   │   ├── person.py
│   │   │   ├── household.py
│   │   │   └── base.py          # Shared mixins (timestamps, soft delete)
│   │   ├── schemas/             # Pydantic request/response models
│   │   │   ├── account.py
│   │   │   ├── transaction.py
│   │   │   ├── debt.py
│   │   │   ├── asset.py
│   │   │   └── ...
│   │   ├── routers/             # API route handlers
│   │   │   ├── accounts.py
│   │   │   ├── transactions.py
│   │   │   ├── debts.py
│   │   │   ├── assets.py
│   │   │   ├── gam3eyas.py
│   │   │   ├── budgets.py
│   │   │   ├── import_.py
│   │   │   ├── forecasting.py
│   │   │   ├── dashboard.py
│   │   │   ├── categories.py
│   │   │   ├── exchange_rates.py
│   │   │   ├── recurring_rules.py
│   │   │   ├── reports.py
│   │   │   └── settings.py
│   │   ├── services/            # Business logic (no HTTP awareness)
│   │   │   ├── amortization.py
│   │   │   ├── balance.py
│   │   │   ├── forecasting.py
│   │   │   ├── money.py
│   │   │   ├── exchange_rates.py
│   │   │   ├── billing.py
│   │   │   ├── gam3eya.py
│   │   │   ├── asset_valuation.py
│   │   │   └── import_/
│   │   │       ├── parser.py
│   │   │       ├── pdf_parser.py
│   │   │       ├── csv_parser.py
│   │   │       ├── excel_parser.py
│   │   │       ├── encoding.py
│   │   │       ├── duplicate_checker.py
│   │   │       ├── amount_parser.py
│   │   │       ├── date_parser.py
│   │   │       └── presets/
│   │   │           ├── hsbc.py
│   │   │           ├── cib.py
│   │   │           ├── credit_agricole.py
│   │   │           └── registry.py
│   │   ├── ai/                  # Pluggable AI provider system
│   │   │   ├── base.py          # Abstract provider interface
│   │   │   ├── claude.py        # Anthropic SDK
│   │   │   ├── openai_.py       # OpenAI SDK
│   │   │   ├── azure_openai.py  # Azure OpenAI SDK
│   │   │   ├── ollama.py        # Ollama HTTP API
│   │   │   ├── router.py        # Provider selection + fallback logic
│   │   │   └── prompts/         # Prompt templates for categorization, insights
│   │   └── seed.py              # Seed data: 18 predefined categories, 7 supported currencies with exponents, sample exchange rates for development
│   ├── alembic/                 # Database migrations
│   ├── tests/                   # pytest test suite
│   ├── pyproject.toml           # Dependencies (uv)
│   └── Dockerfile
│
├── docker-compose.yml           # Frontend + Backend + (optional local Supabase)
├── docs/                        # This documentation
└── .env.example                 # Environment variable template
```

## Authentication Flow

```
1. User opens app → Next.js loads
2. Supabase client checks for existing session (cookie/localStorage)
3. If no session → redirect to /login
4. User logs in via Supabase Auth (email/password, OAuth, magic link)
5. Supabase returns JWT + refresh token
6. Frontend stores session, attaches JWT to every FastAPI request as Bearer token
7. FastAPI middleware validates JWT via Supabase JWKS endpoint
8. FastAPI extracts user_id and household_id from JWT claims
9. All database queries are scoped to household_id (enforced by RLS + application layer)
```

## Data Flow Patterns

### Read (e.g., get transactions)
```
Frontend (TanStack Query) → GET /api/v1/transactions?page=1&category=food
  → FastAPI validates JWT, extracts household_id
  → SQLAlchemy query with WHERE household_id = :hid
  → PostgreSQL executes with RLS as safety net
  → Response: { data: [...], total: 150, page: 1 }
  → TanStack Query caches result, renders UI
```

### Write (e.g., create transaction)
```
Frontend form submit → POST /api/v1/transactions { date, amount, ... }
  → TanStack Query optimistic update (show immediately)
  → FastAPI validates via Pydantic schema
  → Service layer computes balance delta
  → SQLAlchemy: INSERT transaction + UPDATE account.balance (atomic)
  → Response: { id: 42, ok: true }
  → TanStack Query invalidates ["transactions", "accounts"] cache
  → Supabase Realtime pushes balance change to other connected clients
```

### File Import (e.g., bank statement)
```
Frontend drag-drop → POST /api/import/parse (multipart/form-data)
  → FastAPI receives UploadFile
  → Service layer: detect encoding → detect bank preset → parse rows
  → pdfplumber (PDF) / pandas (CSV) / openpyxl (Excel)
  → Duplicate check against existing transactions
  → Response: { rows: [...], duplicates: 3, valid: 47 }
  → User reviews in UI, toggles per-row
  → POST /api/v1/import/commit { accountId, rows: [...] }
  → Atomic: INSERT all rows + UPDATE account balance
  → AI categorization runs async (background task)
```

## AI Provider System

### Architecture
```python
# Abstract interface — all providers implement this
class AIProvider(ABC):
    async def categorize(self, transactions: list[str]) -> list[CategorySuggestion]
    async def parse_receipt(self, image_bytes: bytes) -> ReceiptData
    async def generate_insight(self, context: FinancialContext) -> str

# Provider implementations
class ClaudeProvider(AIProvider): ...    # anthropic SDK
class OpenAIProvider(AIProvider): ...    # openai SDK
class AzureOpenAIProvider(AIProvider): ...  # openai SDK with azure config
class OllamaProvider(AIProvider): ...    # HTTP calls to local Ollama

# Router selects provider based on user settings + fallback chain
class AIRouter:
    def get_provider(self, user_settings) -> AIProvider
    # Fallback: configured provider → Ollama (if available) → rule-based
```

### Configuration (per-user settings)
```json
{
  "ai_provider": "claude",
  "ai_api_key": "sk-ant-...",
  "ai_model": "claude-sonnet-4-5-20241022",
  "ai_fallback_provider": "ollama",
  "ollama_endpoint": "http://localhost:11434",
  "ollama_model": "llama3.1",
  "azure_endpoint": "https://myorg.openai.azure.com/",
  "azure_deployment": "gpt-4o",
  "azure_api_key": "..."
}
```

### Categorization Confidence Tiers
| Confidence | Action | UX |
|-----------|--------|-----|
| > 95% | Auto-assign | No user interaction needed |
| 75–95% | Suggest | Category shown with "Change" button |
| < 75% | Ask | "What category is this?" prompt |

User corrections feed back into a per-household rule table. After enough corrections, the rule engine handles common merchants without AI calls.

## Multi-Tenancy Model

```
User (Supabase Auth)
  └── belongs to → Household (many-to-many via household_members)
        ├── owns → Accounts, Transactions, Debts, Assets, Budgets, ...
        └── has → Members with roles (admin, member, viewer, child)
```

- Every data table has a `household_id` foreign key
- Supabase RLS policies: `auth.uid() IN (SELECT user_id FROM household_members WHERE household_id = table.household_id)`
- FastAPI also enforces household scoping at the application layer (defense in depth)
- A user can belong to multiple households (e.g., personal + family)

## Background Task System

Three categories of background work, each with a different mechanism:

### 1. Fire-and-Forget Tasks (FastAPI BackgroundTasks)
Short-lived tasks triggered by an API request. Use `fastapi.BackgroundTasks` (Starlette's built-in).

| Task | Triggered By | Duration |
|------|-------------|----------|
| AI batch categorization | Import commit, manual trigger | 5–30s |
| Report generation (async) | Report export request | 5–60s |
| Data export (JSON/CSV) | Settings data export | 10–120s |
| Notification fan-out | Any trigger event | 1–5s |

These run in the same process as FastAPI. If the server restarts, in-flight tasks are lost (acceptable for v1 — user can retry).

### 2. Scheduled Tasks (APScheduler)
Periodic tasks that run on a cron-like schedule. Use `apscheduler` (AsyncIOScheduler) initialized at FastAPI startup.

| Task | Schedule | Purpose |
|------|----------|---------|
| Exchange rate fetch | Daily at 08:00 UTC | Fetch OXR rates for all supported currencies |
| Notification scheduler | Daily at 06:00 local | Generate payment reminders for next 3 days |
| Gold/silver price fetch | Daily at 08:00 UTC | Update commodity asset valuations |
| Budget period rollover | Daily at 00:05 local | Auto-create recurring budget for new period |

APScheduler uses an in-memory job store for v1. For horizontal scaling, switch to a PostgreSQL-backed job store (`apscheduler.jobstores.sqlalchemy`).

### 3. Future: Distributed Task Queue
If/when the backend needs horizontal scaling (multiple instances), migrate fire-and-forget tasks to **arq** (async Redis-based task queue, Python-native) or **Celery**. This is NOT needed for v1 — a single FastAPI instance on Docker handles the expected load.

## Key Technical Constraints

### Money Storage
All monetary amounts stored as **integers in minor units** (piasters for EGP, cents for USD/SAR). Never use floats. PostgreSQL `BIGINT` for amounts. Python `int` for arithmetic (arbitrary precision).

**Currency exponents:** Not all currencies have 2 decimal places. A currency config table/dict defines the exponent (number of decimal digits) per currency. This is critical for display formatting, import amount parsing, and FX conversion rounding.

| Currency | Exponent | Minor Unit | 1 major = N minor |
|----------|----------|-----------|-------------------|
| EGP | 2 | Piaster | 100 |
| USD | 2 | Cent | 100 |
| SAR | 2 | Halala | 100 |
| AED | 2 | Fils | 100 |
| EUR | 2 | Cent | 100 |
| GBP | 2 | Penny | 100 |
| KWD | 3 | Fils | 1000 |

**Implementation:** A `CURRENCIES` config dict in the backend maps currency code → `{ name, name_ar, exponent, symbol }`:

```python
CURRENCIES = {
    "EGP": {"name": "Egyptian Pound",   "name_ar": "جنيه مصري",      "exponent": 2, "symbol": "EGP"},
    "USD": {"name": "US Dollar",        "name_ar": "دولار أمريكي",    "exponent": 2, "symbol": "$"},
    "EUR": {"name": "Euro",             "name_ar": "يورو",             "exponent": 2, "symbol": "€"},
    "GBP": {"name": "British Pound",    "name_ar": "جنيه إسترليني",   "exponent": 2, "symbol": "£"},
    "SAR": {"name": "Saudi Riyal",      "name_ar": "ريال سعودي",      "exponent": 2, "symbol": "SAR"},
    "AED": {"name": "UAE Dirham",       "name_ar": "درهم إماراتي",    "exponent": 2, "symbol": "AED"},
    "KWD": {"name": "Kuwaiti Dinar",    "name_ar": "دينار كويتي",     "exponent": 3, "symbol": "KWD"},
}
```

This dict is used by:
- **Amount formatting** — `format_amount(125000, "EGP")` → "1,250.00 EGP" vs `format_amount(125000, "KWD")` → "125.000 KWD"
- **Import parsing** — when parsing "1,250.500" as KWD, multiply by 1000 (not 100)
- **FX conversion rounding** — `round()` to the target currency's exponent
- **API serialization** — the `_minor` suffix always means "in the smallest unit of that currency"

Adding a new currency requires only a new entry in this dict — no schema changes.

> **"No floats" clarification:** The no-float rule applies to **monetary amounts only**. Non-monetary values like AI confidence scores (`REAL`), asset quantities (`DECIMAL(12,4)`), and percentages are fine as floating-point or fixed-point types. The risk with floats is cumulative rounding error in financial arithmetic — confidence scores and gram quantities don't have this risk.

### Exchange Rates
Rates stored as `rate × 10,000` in integer form. All conversions route through USD as hub currency (OXR-style). Historical rates stored per-date, never retroactively adjusted.

### Dates
All dates stored as `DATE` (PostgreSQL native) or ISO `YYYY-MM-DD` text. Timestamps as `TIMESTAMPTZ`. Frontend handles Hijri conversion for display only — storage is always Gregorian.

### Soft Deletes
All user-facing tables use `is_active BOOLEAN DEFAULT TRUE`. Queries filter `WHERE is_active = TRUE`. Hard deletes only via explicit admin action or data retention policy.

**Soft delete cascade rules:**

| Entity | Can Soft Delete If... | Effect on Children |
|--------|----------------------|-------------------|
| Account | Always (even with transactions) | Transactions remain (`is_active = true`) for historical reporting. Linked debts/installments are NOT auto-deleted — user must unlink first or warning is shown. |
| Transaction | Always | If split exists, splits are also soft-deleted. If linked to a debt_payment, the payment link is preserved (payment record remains). Balance reversed if `applies_to_balance = true`. |
| Category (custom) | Always | Transactions retain `category_id` FK. UI displays "Deleted Category" label. Categorization rules referencing this category are soft-deleted. |
| Category (predefined) | Never | Predefined categories cannot be deleted. |
| Debt | Always | Debt payments remain for history. Linked transactions unaffected. P2P splits soft-deleted with the debt. |
| Person | Only if no active debts | Blocked with error: "This person has N active debts. Settle or delete debts first." |
| Asset | Always | Linked transactions retain `asset_id` for history but asset excluded from net worth. Value history preserved. |
| Gam3eya | Always | Linked transactions retain `gam3eya_id`. Payout splits soft-deleted with the Gam3eya. |
| Budget | Always | Budget categories deleted with the budget. Historical spending data unaffected (computed from transactions). |
| Savings Goal | Always | No cascade — goals don't own transactions. |
| Installment Plan | Always | No cascade on transactions. Plan excluded from utilization calculations. |

### Offline Support (Design Principle #5)
Offline support is achieved through TanStack Query's built-in caching layer — **not** through a custom sync engine or local database.

**What works offline (v1 scope):**
- **Read cached data** — any page/data the user has already loaded remains viewable from TanStack Query's persisted cache (via `persistQueryClient` to IndexedDB or localStorage)
- **Optimistic mutations** — creating a transaction or recording a payment shows instantly in the UI. The mutation queues and retries when connectivity returns.

**What does NOT work offline (v1 scope):**
- **Import** — file parsing requires the backend (PDF extraction, encoding detection)
- **AI categorization** — requires external API calls
- **Report generation** — server-side computation
- **Real-time sync** — Supabase Realtime WebSocket disconnects; reconnects automatically

**Conflict resolution:** Last-write-wins. When two users edit the same entity while one is offline, the last mutation to reach the server persists. `updated_at` timestamps are compared; the frontend does NOT detect or surface conflicts in v1. This is acceptable because:
1. Most mutations are additive (new transactions), not edits to shared records
2. The risk of two family members editing the same transaction simultaneously is very low
3. Supabase Realtime pushes the latest state to all connected clients on reconnect

**Future (v2+):** If conflict resolution becomes a user-reported issue, implement optimistic locking via `updated_at` version checks (`UPDATE ... WHERE updated_at = :expected`). Rejected mutations surface a "This was edited by {user}. Reload?" prompt.

**Offline indicator:** Frontend shows a subtle banner ("You're offline — changes will sync when you reconnect") using `navigator.onLine` + TanStack Query's `onlineManager`.
