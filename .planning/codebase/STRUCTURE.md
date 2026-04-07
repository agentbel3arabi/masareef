# Codebase Structure

**Analysis Date:** 2026-04-07

## Directory Layout

```
masareef/
├── backend/                           # FastAPI Python application
│   ├── app/
│   │   ├── main.py                    # FastAPI app initialization, router registration
│   │   ├── config.py                  # Settings (env vars, Pydantic BaseSettings)
│   │   ├── database.py                # SQLAlchemy async engine + session factory
│   │   ├── dependencies.py            # Dependency injection (auth, db, household scoping)
│   │   ├── dependencies_rbac.py       # RBAC enforcement (role checks)
│   │   ├── limiter.py                 # Rate limiter (slowapi) configuration
│   │   ├── models/                    # SQLAlchemy ORM models (16 files, ~722 lines)
│   │   │   ├── base.py                # Mixins: TimestampMixin, SoftDeleteMixin
│   │   │   ├── account.py             # Account model
│   │   │   ├── transaction.py         # Transaction + TransactionSplit models
│   │   │   ├── debt.py                # Debt model
│   │   │   ├── debt_payment.py        # DebtPayment model
│   │   │   ├── p2p_debt_split.py      # P2PDebtSplit model
│   │   │   ├── household.py           # Household, HouseholdMember, HouseholdInvitation models
│   │   │   ├── category.py            # Category + CategoryRule models
│   │   │   ├── person.py              # Person model (P2P debt counterparties)
│   │   │   ├── financial_institution.py # FinancialInstitution model
│   │   │   ├── installment_plan.py    # InstallmentPlan model
│   │   │   ├── exchange_rate.py       # ExchangeRate model
│   │   │   ├── import_template.py     # ImportTemplate model
│   │   │   ├── reconciliation_record.py # ReconciliationRecord model
│   │   │   ├── enums.py               # Shared enum definitions
│   │   │   └── __init__.py
│   │   ├── schemas/                   # Pydantic v2 request/response models (15 files)
│   │   │   ├── common.py              # SuccessResponse, ErrorResponse, PaginationMeta
│   │   │   ├── account.py             # AccountCreate, AccountResponse, AccountDetailResponse
│   │   │   ├── transaction.py         # TransactionCreate, TransactionResponse, TransactionUpdate
│   │   │   ├── debt.py                # DebtCreate, DebtResponse, DebtPaymentCreate
│   │   │   ├── installment.py         # InstallmentCreate, InstallmentResponse
│   │   │   ├── person.py              # PersonCreate, PersonResponse
│   │   │   ├── category.py            # CategoryCreate, CategoryResponse
│   │   │   ├── household.py           # HouseholdResponse, HouseholdMemberResponse
│   │   │   ├── financial_institution.py # InstitutionResponse, InstitutionEmbed
│   │   │   ├── exchange_rate.py       # ExchangeRateResponse
│   │   │   ├── import_.py             # ImportParseResponse, ImportCommitRequest
│   │   │   ├── import_template.py     # ImportTemplateCreate, ImportTemplateResponse
│   │   │   ├── transaction_summary.py # TransactionSummaryResponse
│   │   │   ├── transfer.py            # TransferCreate, TransferResponse
│   │   │   └── __init__.py
│   │   ├── routers/                   # FastAPI route handlers (14 modules, ~2,383 lines)
│   │   │   ├── accounts.py            # GET/POST/PUT /api/v1/accounts, balance endpoints
│   │   │   ├── transactions.py        # GET/POST/PUT/DELETE /api/v1/transactions
│   │   │   ├── transfers.py           # POST /api/v1/transfers
│   │   │   ├── debts.py               # GET/POST/PUT /api/v1/debts, debt payments
│   │   │   ├── installments.py        # GET/POST /api/v1/installments
│   │   │   ├── categories.py          # GET /api/v1/categories, predefined + custom
│   │   │   ├── persons.py             # GET/POST/DELETE /api/v1/people (P2P debt counterparties)
│   │   │   ├── households.py          # GET/POST /api/v1/households, invitations, members
│   │   │   ├── import_.py             # POST /api/v1/import/parse, /commit (bank statement import)
│   │   │   ├── import_templates.py    # GET /api/v1/import-templates (saved import presets)
│   │   │   ├── financial_institutions.py # GET /api/v1/institutions, institution search
│   │   │   ├── financing_apps.py      # GET /api/v1/financing-apps (BNPL apps)
│   │   │   ├── transaction_summary.py # GET /api/v1/transaction-summary (period aggregations)
│   │   │   └── __init__.py
│   │   ├── services/                  # Business logic (18+ modules, ~3,613 lines)
│   │   │   ├── account.py             # list_accounts, create, get_balance, validate_institution
│   │   │   ├── transaction.py         # create, update, delete, apply_categorization
│   │   │   ├── transfer.py            # transfer_between_accounts (2-leg split)
│   │   │   ├── debt.py                # create, update_payment_status, validate cascade on delete
│   │   │   ├── installment.py         # create, compute_remaining_balance
│   │   │   ├── person.py              # create, delete (with debt check), list by household
│   │   │   ├── category.py            # get_predefined, create_custom, validate_custom_name
│   │   │   ├── balance.py             # compute_account_balance, get_net_worth, validate balance integrity
│   │   │   ├── money.py               # format_amount, parse_amount, convert_currency
│   │   │   ├── fx.py                  # fetch_rates, convert, compute_historical_rate
│   │   │   ├── amortization.py        # compute_amortization_schedule, calculate_interest
│   │   │   ├── transaction_summary.py # aggregate_by_period, get_daily/monthly/yearly summaries
│   │   │   ├── household.py           # create, add_member, invite, validate household operations
│   │   │   ├── financial_institution.py # list, search, get_logo_url
│   │   │   ├── import_template.py     # create, update, delete, apply (save/reuse import presets)
│   │   │   ├── import_/               # Bank statement import pipeline
│   │   │   │   ├── import_service.py  # Main orchestrator (parse, commit)
│   │   │   │   ├── pdf_parser.py      # pdfplumber-based PDF extraction
│   │   │   │   ├── csv_parser.py      # pandas-based CSV parsing
│   │   │   │   ├── excel_parser.py    # openpyxl-based Excel parsing
│   │   │   │   ├── encoding.py        # Detect file encoding (UTF-8, cp1252, etc.)
│   │   │   │   ├── row_validator.py   # Validate each parsed row (date, amount, description)
│   │   │   │   ├── amount_parser.py   # Parse amount strings with locale/currency awareness
│   │   │   │   ├── date_parser.py     # Parse date strings (DD/MM/YYYY, MM/DD/YYYY, etc.)
│   │   │   │   ├── duplicate_checker.py # Detect duplicates by date/amount/description
│   │   │   │   ├── header_mapper.py   # Auto-detect CSV headers and map to standard columns
│   │   │   │   ├── presets/           # Bank-specific parsing logic
│   │   │   │   │   ├── base.py        # BasePreset abstract class
│   │   │   │   │   ├── hsbc_cc.py     # HSBC credit card CSV parser
│   │   │   │   │   ├── registry.py    # Preset registry + detection logic
│   │   │   │   │   └── __init__.py
│   │   │   │   └── __init__.py
│   │   │   └── __init__.py
│   │   ├── ai/                        # (Future: AI provider abstraction)
│   │   │   ├── base.py                # Abstract AIProvider interface
│   │   │   ├── claude.py              # Anthropic SDK implementation
│   │   │   ├── openai_.py             # OpenAI SDK implementation
│   │   │   ├── azure_openai.py        # Azure OpenAI implementation
│   │   │   ├── ollama.py              # Ollama HTTP API implementation
│   │   │   ├── router.py              # Provider selection + fallback logic
│   │   │   ├── prompts/               # Prompt templates
│   │   │   └── __init__.py
│   │   ├── seed.py                    # Seed data (18 predefined categories, currency configs)
│   │   └── __init__.py
│   ├── alembic/                       # Database migrations
│   │   ├── env.py                     # Alembic config
│   │   ├── versions/                  # Migration files (10+ migrations)
│   │   │   ├── 001_create_phase1_tables.py
│   │   │   ├── 002_add_indexes_and_constraints.py
│   │   │   ├── 005_create_phase3_tables.py
│   │   │   └── ... (more migrations for phases 3-3.8)
│   │   └── script.py.mako
│   ├── tests/                         # pytest test suite (~40+ test files)
│   │   ├── conftest.py                # Pytest fixtures (db session, test client, seed data)
│   │   ├── test_health.py             # Health check endpoint
│   │   ├── test_seed.py               # Seed data validation
│   │   ├── routers/                   # Router integration tests
│   │   │   ├── test_accounts.py
│   │   │   ├── test_transactions.py
│   │   │   ├── test_debts.py
│   │   │   ├── test_transfers.py
│   │   │   ├── test_import_.py
│   │   │   ├── test_persons.py
│   │   │   ├── test_households.py
│   │   │   ├── test_categories.py
│   │   │   ├── test_import_templates.py
│   │   │   ├── test_installments.py
│   │   │   └── ... (more router tests)
│   │   ├── services/                  # Service unit tests
│   │   │   └── import_/               # Import service tests
│   │   │       ├── test_amount_parser.py
│   │   │       └── test_row_validator.py
│   │   ├── schemas/                   # Schema validation tests
│   │   │   ├── test_schemas.py
│   │   │   ├── test_account_schema.py
│   │   │   └── ... (more schema tests)
│   │   ├── integration/               # Integration tests (cross-service flows)
│   │   ├── models/                    # Model tests
│   │   └── unit/                      # Pure unit tests
│   ├── scripts/                       # Utility scripts
│   │   ├── clear_user_data.py         # Data cleanup for testing
│   │   ├── delete_user_by_email.py    # User deletion helper
│   │   └── eval_pdf_library.py        # PDF library evaluation
│   ├── pyproject.toml                 # uv dependency manifest
│   ├── uv.lock                        # Lock file (committed)
│   ├── .env.example                   # Environment variable template
│   └── Dockerfile
│
├── frontend/                          # Next.js TypeScript application
│   ├── src/
│   │   ├── app/                       # Next.js App Router (file-based routing)
│   │   │   ├── layout.tsx             # Root layout (i18n, fonts, providers wrapper)
│   │   │   ├── page.tsx               # Landing page (/)
│   │   │   ├── globals.css            # Global styles + Tailwind + CSS variables
│   │   │   ├── (auth)/                # Auth route group
│   │   │   │   ├── layout.tsx         # Auth layout (no sidebar)
│   │   │   │   ├── login/page.tsx     # Login page
│   │   │   │   └── signup/page.tsx    # Signup page
│   │   │   ├── (app)/                 # Authenticated app route group
│   │   │   │   ├── layout.tsx         # App layout (AppShell with sidebar)
│   │   │   │   ├── dashboard/page.tsx # Dashboard with stats, charts, recent activity
│   │   │   │   ├── accounts/
│   │   │   │   │   ├── page.tsx       # Accounts list page
│   │   │   │   │   ├── [id]/page.tsx  # Account detail page
│   │   │   │   │   └── bank/[slug]/page.tsx # Bank-specific accounts page
│   │   │   │   ├── transactions/page.tsx # Transactions list (filterable, sortable)
│   │   │   │   ├── transfers/page.tsx # Transfer history
│   │   │   │   ├── debts/
│   │   │   │   │   ├── page.tsx       # Debts overview (loans + P2P)
│   │   │   │   │   ├── loans/[id]/page.tsx # Loan detail
│   │   │   │   │   └── p2p/[id]/page.tsx # P2P debt detail
│   │   │   │   ├── people/page.tsx    # P2P debt counterparties
│   │   │   │   ├── import/page.tsx    # Bank statement import UI
│   │   │   │   ├── settings/page.tsx  # User settings + household settings
│   │   │   │   ├── loading.tsx        # App-wide loading skeleton
│   │   │   │   └── error.tsx          # App-wide error boundary
│   │   │   ├── (onboarding)/          # Onboarding route group (new user)
│   │   │   │   ├── layout.tsx
│   │   │   │   └── onboarding/page.tsx # Multi-step onboarding wizard
│   │   │   ├── fonts/                 # Custom font files
│   │   │   ├── providers.tsx          # Client providers (QueryClient, Theme)
│   │   │   └── fonts/                 # Custom font files (Tajawal, etc.)
│   │   ├── components/                # Reusable React components by domain
│   │   │   ├── ui/                    # shadcn/ui primitives (Button, Dialog, Input, etc.)
│   │   │   ├── shared/                # Cross-domain components
│   │   │   │   ├── stat-card.tsx      # Reusable stat display card
│   │   │   │   ├── skeletons/         # Loading skeletons
│   │   │   │   └── ... (more shared)
│   │   │   ├── layout/                # Layout components
│   │   │   │   ├── app-shell.tsx      # Main app container (sidebar, header)
│   │   │   │   ├── sidebar.tsx        # Navigation sidebar
│   │   │   │   └── header.tsx         # Top header bar
│   │   │   ├── accounts/              # Account-specific components
│   │   │   │   ├── account-list.tsx
│   │   │   │   ├── account-card.tsx
│   │   │   │   ├── account-detail.tsx
│   │   │   │   └── ... (more account components)
│   │   │   ├── transactions/          # Transaction components
│   │   │   │   ├── transaction-list.tsx
│   │   │   │   ├── transaction-filters.tsx
│   │   │   │   ├── transaction-form.tsx
│   │   │   │   └── ... (more transaction components)
│   │   │   ├── debts/                 # Debt management components
│   │   │   ├── import/                # Bank import UI components
│   │   │   ├── dashboard/             # Dashboard-specific components
│   │   │   │   ├── recent-transactions.tsx
│   │   │   │   ├── month-activity.tsx
│   │   │   │   ├── accounts-glance.tsx
│   │   │   │   └── ... (more dashboard)
│   │   │   ├── transfers/             # Transfer components
│   │   │   ├── people/                # P2P debt person components
│   │   │   ├── landing/               # Landing page components (marketing)
│   │   │   └── onboarding/            # Onboarding wizard components
│   │   ├── lib/                       # Utility functions and helpers
│   │   │   ├── api-client.ts          # Fetch wrapper (apiGet, apiPost, apiPut, apiDelete)
│   │   │   ├── query-client.ts        # TanStack Query configuration
│   │   │   ├── money.ts               # format_amount, format_currency, parse_amount
│   │   │   ├── date.ts                # formatDate, formatDateRange, Hijri conversion
│   │   │   ├── locale.ts              # Locale detection, i18n setup
│   │   │   ├── enum-labels.ts         # Human-readable enum names (en + ar)
│   │   │   ├── nav-items.ts           # Navigation structure (routes, icons, labels)
│   │   │   ├── utils.ts               # General utilities (cn, debounce, etc.)
│   │   │   ├── category-icon.tsx      # Icon selector for category types
│   │   │   ├── supabase/              # Supabase client utilities
│   │   │   │   ├── client.ts          # Supabase client initialization
│   │   │   │   ├── auth.ts            # Auth-related helpers
│   │   │   │   └── ... (more supabase helpers)
│   │   │   └── types/                 # Shared TypeScript types
│   │   │       ├── api.ts             # API response types (SuccessResponse, ErrorResponse)
│   │   │       ├── entities.ts        # Domain entity types (Account, Transaction, etc.)
│   │   │       └── ... (more types)
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── use-accounts.ts        # useAccounts, useAccount, useCreateAccount, etc.
│   │   │   ├── use-transactions.ts    # useTransactions, useCreateTransaction, etc.
│   │   │   ├── use-debts.ts           # useDebts, useCreateDebt, etc.
│   │   │   ├── use-persons.ts         # usePeople, useCreatePerson, etc.
│   │   │   ├── use-categories.ts      # useCategories
│   │   │   ├── use-api-mutation.ts    # Wrapper for TanStack useMutation
│   │   │   ├── use-auth.ts            # useAuth (current user, logout)
│   │   │   ├── use-households.ts      # useHousehold, useHouseholdMembers
│   │   │   ├── use-institutions.ts    # useInstitutions, useInstitutionSearch
│   │   │   ├── use-import.ts          # useImportParse, useImportCommit
│   │   │   ├── use-installments.ts    # useInstallments
│   │   │   ├── use-transfers.ts       # useTransfers, useCreateTransfer
│   │   │   ├── use-toast.ts           # useToast wrapper (sonner)
│   │   │   ├── use-bulk-selection.ts  # Multi-select logic
│   │   │   └── ... (more hooks)
│   │   ├── contexts/                  # React contexts
│   │   │   └── (future: auth context, household context, etc.)
│   │   ├── i18n/                      # i18n configuration
│   │   │   └── routing.ts             # next-intl locale routing
│   │   └── config/                    # Configuration
│   │       └── (environment-specific config)
│   ├── messages/                      # Translation files (JSON per locale)
│   │   ├── ar.json                    # Arabic messages
│   │   └── en.json                    # English messages
│   ├── public/                        # Static assets
│   │   ├── logos/                     # Brand logos (SVG + PNG variants)
│   │   ├── institutions/              # Bank/fintech logos
│   │   └── ... (other assets)
│   ├── package.json                   # pnpm dependencies + scripts
│   ├── pnpm-lock.yaml                 # Dependency lock file (committed)
│   ├── tsconfig.json                  # TypeScript configuration
│   ├── next.config.js                 # Next.js configuration (i18n routing, image optimization)
│   ├── tailwind.config.ts             # Tailwind v4 configuration
│   ├── components.json                # shadcn/ui preset (base-nova style)
│   ├── .env.example                   # Environment variable template
│   └── Dockerfile
│
├── docker-compose.yml                 # Docker Compose for local dev (frontend + backend)
├── .github/
│   ├── workflows/
│   │   ├── backend.yml                # Backend CI: ruff lint/format, pyright, pytest
│   │   └── frontend.yml               # Frontend CI: next lint, tsc, pnpm build
│   ├── COPILOT-INSTRUCTIONS.md        # Copilot agent rules
│   └── ISSUE_TEMPLATE/
│       └── feature.md
│
├── docs/                              # Project documentation (NOT source code)
│   ├── 00-overview.md
│   ├── 01-architecture.md
│   ├── 02-data-models.md
│   ├── 03-features/                   # Feature specifications
│   ├── 04-user-flows.md
│   ├── 05-roadmap.md
│   ├── 06-research.md
│   ├── guides/
│   ├── stitch-designs/                # UI design files (HTML + PNG)
│   └── superpowers/                   # Implementation plans + session notes
│
├── logos/                             # Brand assets (SVG + PNG)
├── CLAUDE.md                          # This guide
├── BACKLOG.md                         # Centralized deferred items + tech debt
├── .gitignore
└── README.md
```

## Directory Purposes

**Backend (Python FastAPI):**

**`backend/app/models/`** — SQLAlchemy ORM definitions
- Each file defines one or more related models (e.g., `account.py` has `Account` model)
- Models inherit from `Base` (DeclarativeBase) + mixins (TimestampMixin, SoftDeleteMixin)
- Columns use SQLAlchemy 2.0 Mapped syntax with type hints
- Foreign keys and relationships defined here
- Enums defined in `enums.py` and imported where needed

**`backend/app/schemas/`** — Pydantic v2 request/response models
- Each file mirrors a model domain (e.g., `account.py` has AccountCreate, AccountResponse)
- Request schemas: `*Create`, `*Update`, `*Delete` classes for validation
- Response schemas: `*Response` classes for serialization to JSON
- Shared schemas in `common.py`: SuccessResponse, ErrorResponse, PaginationMeta
- Never instantiate models directly in responses — use schema.model_validate(model)

**`backend/app/routers/`** — FastAPI route handlers
- Each file defines one APIRouter with prefix (e.g., `prefix="/api/v1/accounts"`)
- Routes grouped by domain: accounts, transactions, debts, etc.
- Each route handler:
  1. Extracts dependencies (session, household_id, user_id)
  2. Validates input via Pydantic schema
  3. Calls service function (pure business logic)
  4. Wraps response in SuccessResponse or ErrorResponse
  5. Returns HTTP status + envelope
- RBAC checks via `require_role` dependency if needed

**`backend/app/services/`** — Business logic (no HTTP awareness)
- Each file contains pure Python functions scoped to a domain
- Functions take session + household_id + data as parameters
- Functions return domain objects (ORM models) or Pydantic schemas
- Functions never import FastAPI, HTTPException, Request, etc.
- Raise ValueError for validation failures (router catches and converts to 400)
- Example: `account_service.create_account(session, household_id, schema_data) -> Account`

**`backend/app/services/import_/`** — Bank statement import pipeline
- `import_service.py`: Orchestrator (determines file type, delegates to parser, runs pipeline)
- `pdf_parser.py`, `csv_parser.py`, `excel_parser.py`: Format-specific parsers
- `encoding.py`: Detect file encoding
- `amount_parser.py`: Parse amount strings with locale/exponent awareness
- `date_parser.py`: Parse date strings (multiple formats)
- `duplicate_checker.py`: Detect duplicate transactions
- `presets/`: Bank-specific rules (HSBC, CIB, etc.)

**Frontend (Next.js TypeScript):**

**`frontend/src/app/`** — Next.js App Router pages
- File-based routing: `accounts/page.tsx` → `/accounts` route
- Layouts wrap child routes: `app/(app)/layout.tsx` → AppShell for authenticated pages
- Route groups (parentheses) for logical grouping: `(app)`, `(auth)`, `(onboarding)`
- `layout.tsx` files define shared structure (sidebar, header) for all descendant pages
- `loading.tsx` defines loading skeleton
- `error.tsx` defines error boundary
- All page components are Server Components by default; use `"use client"` at the top for interactivity

**`frontend/src/components/`** — Reusable React components
- Organized by domain: `accounts/`, `transactions/`, `debts/`, etc.
- Sub-domain components (e.g., `accounts/account-list.tsx`, `accounts/account-card.tsx`)
- `ui/` directory: shadcn/ui primitives (Button, Dialog, Input, etc.) — **auto-generated, do not hand-edit**
- `shared/` directory: Cross-domain components (StatCard, SkeletonLoader, etc.)
- `layout/` directory: App structure (AppShell, Sidebar, Header)
- Components are modules (default exports encouraged for cleaner imports)

**`frontend/src/lib/`** — Utility functions
- `api-client.ts`: Fetch wrapper (apiGet, apiPost, apiPut, apiDelete) — handles headers, error wrapping
- `query-client.ts`: TanStack Query configuration (cache staleTime, refetch options)
- `money.ts`: format_amount, parse_amount (handles minor units + currency exponents)
- `date.ts`: formatDate, Hijri conversion utilities
- `supabase/`: Supabase client initialization and helpers
- `types/`: TypeScript type definitions (never classes, interfaces only)

**`frontend/src/hooks/`** — Custom React hooks
- Hooks wrap TanStack Query useQuery/useMutation
- Naming: `use<EntityType>` (e.g., `useAccounts`, `useTransactions`)
- Each hook file exports:
  - Query hooks: `use<Entity>`, `use<Entity>List` (return { data, isLoading, error })
  - Mutation hooks: `useCreate<Entity>`, `useUpdate<Entity>`, `useDelete<Entity>` (return mutate function)
  - Example: `useAccounts()` calls `apiGet("/api/v1/accounts")` via TanStack Query

**`frontend/src/contexts/`** — React contexts (if used)
- Minimal use; prefer hooks for most state management
- Future: Auth context, Household context, Theme context

**`frontend/messages/`** — Translation files
- `ar.json`: Arabic translations (RTL)
- `en.json`: English translations (LTR)
- next-intl loads these automatically based on locale

**`frontend/public/`** — Static assets
- `logos/`: Brand logos (favicons, SVG/PNG variants)
- `institutions/`: Bank/fintech logos for display in UI

## Key File Locations

**Entry Points:**

- Backend: `backend/app/main.py` — FastAPI app initialization
- Frontend (root): `frontend/src/app/layout.tsx` — Root layout with i18n + providers
- Frontend (app): `frontend/src/app/(app)/layout.tsx` — AppShell layout
- Frontend (auth): `frontend/src/app/(auth)/login/page.tsx` — Login page
- Frontend (onboarding): `frontend/src/app/(onboarding)/onboarding/page.tsx` — Onboarding wizard

**Configuration:**

- Backend env: `backend/.env.example`, loaded by `backend/app/config.py`
- Frontend env: `frontend/.env.example`
- Backend routes: registered in `backend/app/main.py` via `app.include_router()`
- Frontend i18n: `frontend/next.config.js` (locale routing), `frontend/src/i18n/routing.ts`

**Core Logic:**

- Account balance: `backend/app/services/balance.py`
- Transaction handling: `backend/app/services/transaction.py`, `backend/app/routers/transactions.py`
- Debt amortization: `backend/app/services/amortization.py`
- Import parsing: `backend/app/services/import_/` (orchestrator + parsers)
- Money formatting: `frontend/src/lib/money.ts`, `backend/app/services/money.py`

**Testing:**

- Backend: `backend/tests/` (pytest fixtures in `conftest.py`, tests organized by layer)
- Frontend: Tests are co-located with components or in a `__tests__` directory (not yet implemented in this repo)

## Naming Conventions

**Files:**
- Python modules: `snake_case.py` (e.g., `account_service.py`, `transaction.py`)
- TypeScript/React: `kebab-case.ts(x)` for components and utilities (e.g., `account-list.tsx`, `use-accounts.ts`)
- Exception: Index files are `index.ts`, `__init__.py`

**Directories:**
- Python packages: `snake_case` (e.g., `app/models/`, `app/services/import_/`)
- React components: `kebab-case` (e.g., `dashboard/`, `account-details/`) OR domain name (e.g., `accounts/`, `transactions/`)
- Feature routes: domain name (e.g., `accounts/`, `debts/`, `import/`)

**Functions/Classes:**
- Python functions: `snake_case` (e.g., `create_account()`, `validate_amount()`)
- Python classes: `PascalCase` (e.g., `Account`, `AccountService`)
- TypeScript functions: `camelCase` (e.g., `formatAmount()`, `validateEmail()`)
- TypeScript React components: `PascalCase` (e.g., `AccountCard`, `TransactionList`)
- TypeScript types/interfaces: `PascalCase` (e.g., `Account`, `CreateAccountInput`)

**Database:**
- Tables: `snake_case` plural (e.g., `accounts`, `transactions`, `debt_payments`)
- Columns: `snake_case` (e.g., `displayed_balance_minor`, `is_active`)
- Enums: `snake_case` (e.g., `account_type`, `transaction_type`)

**API Routes:**
- Pattern: `/api/v1/{resource}` or `/api/v1/{resource}/{id}`
- Multi-word resources: `kebab-case` (e.g., `/api/v1/exchange-rates`, `/api/v1/import-templates`)
- Nested: `/api/v1/{resource}/{id}/{sub-resource}`

## Where to Add New Code

**New Feature (e.g., "Budgets"):**

1. **Backend:**
   - Add model: `backend/app/models/budget.py`
   - Add schema: `backend/app/schemas/budget.py`
   - Add service: `backend/app/services/budget.py` (business logic)
   - Add router: `backend/app/routers/budgets.py` (API endpoints)
   - Register router in `backend/app/main.py`: `app.include_router(budgets.router)`
   - Add migration: `backend/alembic/versions/NNN_add_budgets_table.py`
   - Add tests: `backend/tests/routers/test_budgets.py`, `backend/tests/services/test_budgets.py`

2. **Frontend:**
   - Add pages: `frontend/src/app/(app)/budgets/page.tsx` (list), `frontend/src/app/(app)/budgets/[id]/page.tsx` (detail)
   - Add components: `frontend/src/components/budgets/` (list, card, form, detail)
   - Add hooks: `frontend/src/hooks/use-budgets.ts` (queries + mutations)
   - Add types: `frontend/src/lib/types/entities.ts` (Budget type)
   - Update navigation: `frontend/src/lib/nav-items.ts`
   - Add i18n keys: `frontend/messages/ar.json`, `frontend/messages/en.json`

**New Component/Module:**

- **Reusable component:** `frontend/src/components/{domain}/{component-name}.tsx`
- **Page:** `frontend/src/app/(app)/{route}/page.tsx`
- **Hook:** `frontend/src/hooks/use-{entity}.ts`
- **Utility:** `frontend/src/lib/{utility-name}.ts`
- **Service:** `backend/app/services/{domain}.py`

**Utility Functions:**

- **Money/formatting:** `backend/app/services/money.py` or `frontend/src/lib/money.ts`
- **Date/time:** `backend/app/services/` or `frontend/src/lib/date.ts`
- **Shared validation:** `backend/app/services/{domain}.py` (service layer) or `frontend/src/lib/utils.ts` (client-side)
- **API client helpers:** `frontend/src/lib/api-client.ts` (add new method if needed)

**Tests:**

- **Backend router tests:** `backend/tests/routers/test_{router_name}.py`
- **Backend service tests:** `backend/tests/services/test_{service_name}.py`
- **Backend schema tests:** `backend/tests/schemas/test_{entity}_schema.py`
- **Frontend component tests:** Co-located or `frontend/src/components/{domain}/__tests__/{component}.test.tsx` (convention, not yet enforced)

## Special Directories

**`backend/alembic/`:**
- Purpose: Database migration system
- Generated: Yes (migrations auto-generated via `alembic revision --autogenerate`)
- Committed: Yes (all migration files committed to git)
- Usage: `alembic upgrade head` (run on server startup)

**`backend/tests/conftest.py`:**
- Purpose: pytest fixtures shared across all tests
- Generated: No (hand-written)
- Committed: Yes
- Contains: `async_client`, `async_session`, `test_user`, seed fixtures

**`frontend/public/`:**
- Purpose: Static assets served by Next.js without bundling
- Generated: No (manually added)
- Committed: Yes (images, logos, etc.)

**`frontend/src/components/ui/`:**
- Purpose: shadcn/ui component library
- Generated: Yes (via `pnpm dlx shadcn@latest add <component>`)
- Committed: Yes (includes customized shadcn components)
- Note: May contain physical directional CSS classes (`pl-`, `pr-`, `left-`, `right-`) that must be converted to logical equivalents (`ps-`, `pe-`, `start-`, `end-`)

**`frontend/messages/`:**
- Purpose: i18n translation files
- Generated: No (hand-written)
- Committed: Yes
- Format: JSON; keys match component translation calls `useTranslations("namespace")`

---

*Structure analysis: 2026-04-07*
