# Masareef Documentation — AI Agent Guide

## A — Project Summary

Masareef (مصاريف) is an AI-powered personal finance platform for Egyptian/MENA users, built with a FastAPI (Python) backend, Next.js 14.2.x frontend, and Supabase (PostgreSQL) infrastructure. It provides Arabic-first bank statement import, multi-currency tracking, debt/installment management, Gam3eya (rotating savings), asset tracking, budgeting, 12-month forecasting, and household multi-user support — features no existing product combines for this market.

## B — Directory Map

The table below lists every doc file and when to load it:

| File                                                            | Contains                                                                                                    | Load When                                                |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [00-overview.md](./docs/00-overview.md)                         | Executive summary, problem statement, personas, 8 design principles, competitive positioning                | Starting any task — read for context                     |
| [01-architecture.md](./docs/01-architecture.md)                 | System diagram, component responsibilities, tech choices, auth flow, data flow, AI provider system          | Backend structure, infra, deployment, auth, API patterns |
| [02-data-models.md](./docs/02-data-models.md)                   | All PostgreSQL tables (22+), columns, enums, indexes, RLS policies — **single source of truth for schemas** | Database work, migrations, queries                       |
| [03-features/\*.md](./docs/03-features/)                        | Feature specs: behavior + API contracts + acceptance criteria                                               | Any feature-specific work                                |
| [04-user-flows.md](./docs/04-user-flows.md)                     | 12 step-by-step user journeys, edge cases                                                                   | UX/onboarding work                                       |
| [05-roadmap.md](./docs/05-roadmap.md)                           | 20 phases + deliverables + success criteria + implementation sequences                                      | Planning, prioritizing, understanding build order        |
| [06-research.md](./docs/06-research.md)                         | 10 competitor profiles, feature gap matrix, market trends                                                   | Product decisions, competitive positioning               |
| [guides/08-testing.md](./docs/guides/08-testing.md)             | Test stack, test organization, fixture strategy, seed data, coverage requirements                           | Writing tests                                            |
| [guides/09-design-tokens.md](./docs/guides/09-design-tokens.md) | Canonical design tokens, 32-screen UI design index with cross-links                                         | Frontend UI work                                         |

```
masareef/
├── CLAUDE.md                           # This file — load first, always
├── docs/
│   ├── 00-overview.md                  # Executive summary, personas, design principles
│   ├── 01-architecture.md              # System design, tech choices, auth flow, data flow
│   ├── 02-data-models.md               # All table schemas (canonical — single source of truth)
│   ├── 03-features/                    # Feature specs: behavior + API contracts only
│   │   ├── accounts.md
│   │   ├── transactions.md
│   │   ├── transfers.md
│   │   ├── import.md
│   │   ├── categories.md
│   │   ├── debts.md
│   │   ├── financing-apps.md
│   │   ├── gam3eya.md
│   │   ├── assets.md
│   │   ├── budgets.md
│   │   ├── forecasting.md
│   │   ├── dashboard.md
│   │   ├── exchange-rates.md
│   │   ├── reports.md
│   │   ├── notifications.md
│   │   ├── multi-user.md
│   │   ├── settings.md
│   │   └── receipts.md
│   ├── 04-user-flows.md                # 12 step-by-step user journeys
│   ├── 05-roadmap.md                   # 20 phases + implementation sequences
│   ├── 06-research.md                  # Competitor profiles, market trends
│   ├── guides/
│   │   ├── 08-testing.md               # Test strategy, fixtures, coverage requirements
│   │   └── 09-design-tokens.md         # Design tokens, UI design index (32 screens)
│   ├── stitch-designs/
│   │   ├── screenshots/                # 32 PNG screenshots (visual reference)
│   │   └── html/                       # 32 HTML files (code reference)
│   └── stitch-prompts/                 # Prompts used to generate each design
```

## C — Task Router

Load only what's relevant. **Do not load all files at once.**

| Task Type                      | Always Load                                                                                      | Also Load                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| Backend: new feature           | `CLAUDE.md` + `01-architecture.md` + feature spec                                                | `02-data-models.md` if schema work involved    |
| Backend: database / migration  | `CLAUDE.md` + `02-data-models.md` + feature spec                                                 | —                                              |
| Frontend: new page / component | `CLAUDE.md` + feature spec + `guides/09-design-tokens.md` + matching `stitch-designs/html/` file | `04-user-flows.md` if flow unclear             |
| Backend: API endpoint          | `CLAUDE.md` + `01-architecture.md` + feature spec                                                | `02-data-models.md` for query patterns         |
| Testing                        | `CLAUDE.md` + `guides/08-testing.md` + feature spec                                              | —                                              |
| Planning / prioritization      | `CLAUDE.md` + `05-roadmap.md` + `06-research.md`                                                 | —                                              |
| Full-stack feature (Phase N)   | `CLAUDE.md` + `05-roadmap.md` (Phase N section) + feature spec(s) listed there                   | All files listed in phase's "Required Reading" |

## D — Coding Conventions

### 1. API Conventions

- **All routes prefixed with `/api/v1/`** — enables non-breaking API evolution across the 20-phase roadmap
- **API route style:** `kebab-case` for multi-word resources (e.g., `/api/v1/exchange-rates`, `/api/v1/savings-goals`)
- **Error response envelope:**
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
  ```
- **Success response envelope:**
  ```json
  { "data": {...}, "meta": { "total": 150, "page": 1, "page_size": 50 } }
  ```
- **HTTP status codes:** 200 (success), 201 (created), 204 (deleted), 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found), 409 (conflict), 422 (unprocessable entity), 500 (server error)
- **Pagination:** query params `page` (1-indexed, default 1), `page_size` (default 50, max 100); response includes `total`, `page`, `page_size` in `meta`

### 2. Money Rules

- All monetary amounts: **`BIGINT` in minor units, Python `int`, never floats**
- Currency exponent determines minor unit divisor (EGP: 2 → 125000 = 1,250.00 EGP; KWD: 3 → 125000 = 125.000 KWD)
- Canonical currencies config:
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
- Formatting example: `format_amount(125000, "EGP")` → `"1,250.00 EGP"` (uses `CURRENCIES[currency]["exponent"]`)
- **Signed vs. absolute amounts:** `transactions.amount_minor` is **signed** (negative = debit, positive = credit). However, `transaction_splits.amount_minor` and `debt_payments.amount_minor` must **always** be stored as **absolute positive integers** — never negative.
- **Exchange rates:** Stored as integers multiplied by 10,000 (e.g., a rate of 48.5 is stored as `485000`). **USD is the hub currency** — all rates are expressed as USD → target currency.

### 3. Soft Delete Rules

- All user-facing tables include `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- All queries filter `WHERE is_active = TRUE` at the application layer
- Never hard-delete user data — set `is_active = FALSE`
- Cascade rules:

| Entity                | Can Soft Delete If...           | Effect on Children                                                                                      |
| --------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Account               | Always (even with transactions) | Transactions remain for history. Linked debts/installments NOT auto-deleted — warning shown.            |
| Transaction           | Always                          | Splits also soft-deleted. Debt payment link preserved. Balance reversed if `applies_to_balance = true`. |
| Category (custom)     | Always                          | Transactions retain FK. UI shows "Deleted Category". Rules soft-deleted.                                |
| Category (predefined) | Never                           | Cannot be deleted.                                                                                      |
| Debt                  | Always                          | Payments remain. Linked transactions unaffected. P2P splits soft-deleted.                               |
| Person                | Only if no active debts         | Blocked with error: "This person has N active debts."                                                   |
| Asset                 | Always                          | Linked transactions retain `asset_id`. Asset excluded from net worth.                                   |
| Gam3eya               | Always                          | Linked transactions retain `gam3eya_id`. Payout splits soft-deleted.                                    |
| Budget                | Always                          | Budget categories deleted. Historical spending unaffected.                                              |
| Savings Goal          | Always                          | No cascade.                                                                                             |
| Installment Plan      | Always                          | No cascade. Excluded from utilization.                                                                  |

### 4. RLS Enforcement

- Every table with `household_id` has a Supabase RLS policy:
  ```sql
  auth.uid() IN (SELECT user_id FROM household_members WHERE household_id = table.household_id)
  ```
- FastAPI also enforces household scoping at the application layer (defense in depth)
- **Every query must include `household_id`** — RLS is a safety net, not a substitute for application-layer filtering

### 5. Naming Conventions

| Layer                       | Convention           | Example                            |
| --------------------------- | -------------------- | ---------------------------------- |
| Python files                | `snake_case`         | `account_service.py`               |
| Python functions/vars       | `snake_case`         | `compute_balance()`                |
| Python classes              | `PascalCase`         | `AccountService`                   |
| TypeScript vars/functions   | `camelCase`          | `formatAmount()`                   |
| TypeScript components/types | `PascalCase`         | `AccountCard`, `TransactionCreate` |
| API routes                  | `kebab-case`         | `/api/v1/exchange-rates`           |
| DB tables                   | `snake_case`, plural | `transactions`, `debt_payments`    |
| DB columns                  | `snake_case`         | `amount_minor`, `household_id`     |
| Files                       | match entity         | `account.py` for Account model     |

### 6. Dependency Injection Pattern

Every FastAPI router function uses these three core dependencies via `Depends()`:

```python
# dependencies.py — define once, use everywhere
async def get_db_session() -> AsyncSession: ...
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User: ...
async def get_household_id(current_user: User = Depends(get_current_user)) -> UUID: ...

# Router usage
@router.get("/api/v1/accounts")
async def list_accounts(
    session: AsyncSession = Depends(get_db_session),
    household_id: UUID = Depends(get_household_id),
):
    return await account_service.list_accounts(session, household_id)
```

- Service functions are **pure business logic** — no HTTP awareness
- Services receive `session` + `household_id` as plain parameters
- No service function should import FastAPI types

### 7. Supabase Realtime Event Catalog

Frontend subscribes to these channels for live updates:

| Event                     | Channel          | Triggered By                                            | Frontend Action                                     |
| ------------------------- | ---------------- | ------------------------------------------------------- | --------------------------------------------------- |
| `account:balance_changed` | `household:{id}` | Transaction create/edit/delete, transfer, import commit | Invalidate `["accounts"]` query key                 |
| `transaction:created`     | `household:{id}` | Manual create, import commit                            | Invalidate `["transactions"]` query key             |
| `transaction:categorized` | `household:{id}` | AI batch categorization complete                        | Invalidate `["transactions"]` query key, show toast |
| `notification:new`        | `user:{id}`      | Any notification trigger                                | Increment bell badge, prepend to notification list  |
| `debt:payment_recorded`   | `household:{id}` | Debt payment create                                     | Invalidate `["debts"]` query key                    |

## E — Rules

1. **Never contradict decisions in `01-architecture.md`.** That file is the source of truth for all technical choices. Flag disagreements explicitly rather than silently deviating.

2. **Money is always integer minor units.** No floats, no exceptions. See Section D above.

3. **All data is household-scoped.** Every query must include `household_id`. RLS is a safety net, not a substitute.

4. **Arabic first, English always.** UI is designed for RTL first, then verified in LTR. Never treat Arabic as a translation afterthought. **CRITICAL — logical CSS properties only:** Physical directional classes (e.g., `pl-4`, `pr-4`, `ml-2`, `mr-2`, `left-0`, `right-0`, `text-left`, `text-right`) are **strictly forbidden**. You MUST use CSS logical properties and their Tailwind equivalents (e.g., `ps-4`, `pe-4`, `ms-2`, `me-2`, `start-0`, `end-0`, `text-start`, `text-end`) so that RTL/LTR flipping works automatically.

5. **`02-data-models.md` owns all table schemas.** Feature specs own API behavior. If you see a table definition in a feature spec, it is a cross-reference pointer, not the source of truth.

6. **Feature files own their API contracts.** If an endpoint's spec lives in a feature file, that file is authoritative for behavior, request/response shapes, and acceptance criteria.

7. **Frontend Stack Strictness:** Use Next.js 14 (specifically 14.2.x) with the **App Router** (`app/` directory). Do not use Next.js 15 or newer to ensure maximum AI code generation stability. All components must use strict TypeScript, shadcn/ui, and Tailwind CSS. Required libraries: use **TanStack Query** for all server state management and cache invalidation; use **react-plotly.js** for all charts and data visualizations (Recharts and Chart.js are **strictly forbidden**); use **next-intl** for all i18n formatting (dates, numbers, currencies, plurals).

8. **Backend Stack Strictness:** Use **Python 3.12**. Build an asynchronous FastAPI application (`async def`). Use Pydantic V2 for all data validation and serialization — call `model.model_dump()` exclusively; `model.dict()` is **forbidden** (Pydantic V1 syntax). Database interactions must use asynchronous SQLAlchemy. Use **uv** for dependency management (`pyproject.toml` + `uv.lock`). Do not use Poetry or Conda. Use **`fastapi.BackgroundTasks`** for fire-and-forget logic (e.g., triggering AI categorization after an import commit). Use **APScheduler** for recurring cron-style jobs (e.g., nightly exchange rate refresh, forecast recalculation).

## F — Tooling

### Frontend: pnpm

```bash
pnpm install          # install dependencies (reads pnpm-lock.yaml)
pnpm add <pkg>        # add a dependency
pnpm add -D <pkg>     # add a dev dependency
pnpm remove <pkg>     # remove a dependency
pnpm build            # production build (next build)
pnpm dev              # dev server (next dev)
pnpm lint             # lint (next lint)
```

- Lock file: `frontend/pnpm-lock.yaml` (commit this — never `package-lock.json`)
- `frontend/package.json` has `"packageManager": "pnpm@10.32.1"` (enforced via corepack)
- In Docker: `RUN corepack enable && corepack prepare pnpm@latest --activate` before install
- **Never run `npm install` in the frontend directory** — it will generate a conflicting `package-lock.json`

### Backend: uv

```bash
uv sync               # install all dependencies from pyproject.toml + uv.lock
uv add <pkg>          # add a dependency and update uv.lock
uv add --dev <pkg>    # add a dev dependency
uv remove <pkg>       # remove a dependency
uv run python         # run Python in the project venv
uv run pytest         # run tests
uv run uvicorn app.main:app --reload   # run dev server
```

- Lock file: `backend/uv.lock` (commit this)
- Python venv managed by uv at `backend/.venv`
- `backend/pyproject.toml` defines all dependencies
- **Never run `pip install` directly** — use `uv add` to keep the lock file in sync

## G — Stitch Designs

The `docs/stitch-designs/` directory contains two assets per screen:

- `screenshots/` — PNG visual reference (32 screens)
- `html/` — generated HTML file with layout, structure, and copy

### How to Use Them

When building a frontend page or component, load the matching HTML file alongside `guides/09-design-tokens.md`. Prefer using the **Stitch MCP server tools** to analyze design screens directly — use the static HTML only when the MCP is unavailable. The MCP can extract layout structures and generate standardized Next.js components that already conform to global tokens, which is faster and more reliable than manual HTML reading.

- **Layout and structure**: Follow the HTML (or MCP output) closely — section order, component hierarchy, content groupings
- **Copy and labels**: Use the text from the HTML as the starting point (translate/adapt for Arabic-first)
- **Styling**: Apply design tokens and shadcn/ui components — do not copy raw CSS or inline styles from the HTML verbatim
- **Screenshots**: Use as a visual sanity-check only; the HTML is more detailed and actionable
- **Component extraction**: Do not implement designs page-by-page. Identify reusable UI primitives (Buttons, Cards, Modals, form fields, etc.) and extract them into the centralized `frontend/components/` directory using shadcn/ui and Tailwind before wiring them into pages

### Authority & Conflict Resolution

- The stitch HTML files are a **strong guideline**, not a pixel-perfect spec — apply judgment when adapting to shadcn/ui components and Tailwind
- The 32 screens are **not perfectly consistent** with each other. When you notice contradictions between screens (e.g. different border radii, padding, or shadow styles on similar cards), do not mirror the inconsistency — **normalize immediately** by defaulting to `guides/09-design-tokens.md`
- When the HTML conflicts with `guides/09-design-tokens.md` (colors, spacing, typography, roundness), **design tokens always win**
- Never treat the HTML's inline styles or hardcoded hex values as authoritative — always map to the nearest design token

## H — Git & GitHub

### Branching Strategy: GitHub Flow

- `main` is always production-ready and protected — no direct pushes
- All work happens on short-lived feature branches cut from `main`
- Branch naming convention:
  - `feature/N-short-slug` — e.g. `feature/42-account-balance-endpoint`
  - `fix/N-short-slug` — e.g. `fix/87-transaction-split-cascade`
  - `chore/short-slug` — e.g. `chore/update-dependencies`
- Merged to `main` via PR only; head branch auto-deleted after merge

### Merge Strategy

- **Squash merge only** — each PR collapses to a single commit on `main`
- No merge commits, no rebase merges; keeps history linear and readable

### Commit Style — Conventional Commits (guideline)

Format: `type(scope): subject`

| Type | Use For |
| --------- | --------------------------------- |
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code restructure, no behavior change |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `chore` | Build, deps, tooling |
| `ci` | CI/CD configuration |

Scope matches the feature area: `accounts`, `transactions`, `debts`, `gam3eya`, `budgets`, `forecasting`, `frontend`, `ci`, `auth`, etc.

Examples:
```
feat(accounts): add balance recalculation endpoint
fix(transactions): correct soft-delete cascade for splits
chore(deps): update pydantic to 2.7.1
ci(backend): add pyright type-check step
```

_Not enforced by tooling — follow as a convention._

### Repository Settings

- Default branch: `main`
- Squash merging: enabled; merge commits and rebase merges: disabled
- Auto-delete head branches: enabled
- Branch protection on `main`: require PR + CI checks to pass + branch up to date

## I — CI/CD (GitHub Actions)

### Workflow Structure

Two separate workflow files in `.github/workflows/`, each with path filtering so only relevant changes trigger a pipeline:

| Workflow file | Triggers when | Checks |
| ------------------ | ------------------------------ | ------------------------------------------------ |
| `backend.yml` | `backend/**` changed on push/PR to `main` | uv sync → ruff lint → ruff format check → pyright → pytest |
| `frontend.yml` | `frontend/**` changed on push/PR to `main` | pnpm install → next lint → tsc --noEmit → pnpm build |

### Backend Pipeline Steps

1. `uv sync` — install exact dependencies from `uv.lock`
2. `ruff check .` — linting
3. `ruff format --check .` — formatting check
4. `pyright` — static type checking
5. `pytest` — full test suite (with `pytest-asyncio` for async tests)

### Frontend Pipeline Steps

1. `pnpm install` — install exact dependencies from `pnpm-lock.yaml`
2. `pnpm lint` — Next.js ESLint
3. `pnpm exec tsc --noEmit` — TypeScript type check
4. `pnpm build` — production build must succeed

### Branch Protection Rules (`main`)

- Require pull request before merging (no direct push)
- Require status checks to pass: `backend / test` and/or `frontend / build` (whichever are triggered by the PR's changed files)
- Require branches to be up to date before merging
- Auto-delete head branches on merge

## J — GitHub Copilot Coding Agent

### Overview

The project uses **GitHub Copilot Enterprise**. When assigned to a GitHub issue, the coding agent autonomously creates a branch, implements the feature following the repo's conventions, and opens a PR for review.

### Configuration Files

**`.github/COPILOT-INSTRUCTIONS.md`** — primary instruction file, auto-loaded by Copilot on every task:
- Full tech stack (Python 3.12, FastAPI async, Pydantic V2, async SQLAlchemy, uv; Next.js 14.2.x App Router, TypeScript strict, shadcn/ui, Tailwind, pnpm)
- All coding conventions from Section D (money rules, soft-delete, RLS, naming, error envelopes)
- Where to find schemas (`02-data-models.md`) and API contracts (feature files)
- CI checks that must pass before the PR is ready

**`.github/AGENTS.md`** — supplementary file covering tooling and file-placement rules:
- Branch naming and commit style (Section G)
- File placement (backend: `app/`, frontend: `app/`)
- Prohibited commands (`npm install`, `pip install`)
- How to run tests and build before pushing

### Issue Template

`.github/ISSUE_TEMPLATE/feature.md` — write issues in this structure so Copilot produces accurate output:

```
## Problem Statement
## Requirements
## Acceptance Criteria
## Technical Notes (files, schema refs, API contract)
## Testing Instructions
```

### Copilot Agent Workflow

```
1. Create issue using the feature template
2. Assign issue to Copilot (GitHub UI → assign → Copilot)
3. Copilot creates branch + opens PR automatically
4. GitHub Actions CI runs (backend and/or frontend pipeline)
5. If checks fail → Copilot auto-fixes or flags for human
6. Request Copilot PR review (automated inline review)
7. Human review + approval
8. Squash merge to main; head branch auto-deleted
```

### PR Template

`.github/pull_request_template.md` includes:
- Description + `Closes #N` issue link
- Checklist: tests added, lint passes, build passes, Arabic strings covered
- Testing steps for reviewers
- Screenshots section (UI changes)
- Breaking changes note
