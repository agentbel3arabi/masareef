# Masareef Documentation — AI Agent Guide

## A — Project Summary

Masareef (مصاريف) is an AI-powered personal finance platform for Egyptian/MENA users, built with a FastAPI (Python) backend, Next.js 16 frontend, and Supabase (PostgreSQL) infrastructure. It provides Arabic-first bank statement import, multi-currency tracking, debt/installment management, Gam3eya (rotating savings), asset tracking, budgeting, 12-month forecasting, and household multi-user support — features no existing product combines for this market.

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
| [guides/11-workflow.md](./docs/guides/11-workflow.md)           | Unit execution workflow (Plan → Execute → Review → UAT → Merge)                                             | Starting any implementation unit                         |
| [guides/12-uat-template.md](./docs/guides/12-uat-template.md)   | UAT checklist template with standard + phase-specific checks                                                | Writing UAT checklists                                   |
| [stitch-screen-map.md](./docs/stitch-screen-map.md)            | Maps every feature and phase to its matching Stitch design screen(s)                                         | Planning any phase with frontend work                    |
| [stitch-designs/stitch-project-reference.md](./docs/stitch-designs/stitch-project-reference.md) | Masareef v2 Stitch project ID, design system asset ID, all 8 approved screen IDs with verified titles | Any frontend phase using Stitch MCP to generate or implement screens |
| [BACKLOG.md](./BACKLOG.md) | Centralized tracker: deferred features, tech debt, bugs, new ideas, backend deps | Any implementation or planning task |
| [backend-dependencies.md](./docs/backend-dependencies.md) | ⚠️ DEPRECATED — migrated to BACKLOG.md | Historical reference only |
| [superpowers/handoff/](./docs/superpowers/handoff/) | Session handoff notes — what was completed, key decisions, known gaps, what's next | **Start of any implementation unit** — read the most recent handoff for the current phase before writing a single line of code |
| [superpowers/specs/phase-3.5-ux-polish-sprint.md](./docs/superpowers/specs/phase-3.5-ux-polish-sprint.md) | Phase 3.5 UX polish sprint — 6-unit execution plan covering critical bugs, form UX, placeholders, card enhancements, navigation, misc polish | **Phase 3.5 implementation** — read before starting any Phase 3.5 unit |
| [superpowers/specs/2026-04-05-financial-institutions-design.md](./docs/superpowers/specs/2026-04-05-financial-institutions-design.md) | Phase 3.8 Financial Institutions design spec — data model, API, frontend layout, seed data, 8-unit implementation plan | **Phase 3.8 implementation** — read before starting any Phase 3.8 unit |
| [superpowers/plans/2026-04-05-financial-institutions.md](./docs/superpowers/plans/2026-04-05-financial-institutions.md) | Phase 3.8 implementation plan — 28 tasks across 8 units with exact file paths and code | **Phase 3.8 execution** — follow task-by-task during implementation |

```
masareef/
├── CLAUDE.md                           # This file — load first, always
├── BACKLOG.md                          # Centralized backlog — deferred, tech debt, bugs, ideas, backend deps
├── logos/                              # Brand assets (SVG + PNG)
│   ├── svg/{dark,light,transparent}/   # Vector logos (preferred for web)
│   └── png/{dark,light,transparent}/   # Raster logos (@1x + @3x)
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
│   │   ├── landing-page.md
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
│   │   ├── 09-design-tokens.md         # Design tokens, UI design index (32 screens)
│   │   ├── 11-workflow.md              # Unit execution workflow (Plan → Execute → Review → UAT → Merge)
│   │   └── 12-uat-template.md          # UAT checklist template with standard + phase-specific checks
│   ├── backend-dependencies.md         # UI elements needing future backend work, mapped to phases
│   ├── stitch-designs/
│   │   ├── screenshots/                # 32 PNG screenshots (visual reference)
│   │   ├── html/                       # 32 HTML files (code reference)
│   │   └── stitch-project-reference.md # Masareef v2 Stitch project ID + approved screen IDs
│   ├── stitch-prompts/                 # Prompts used to generate each design
│   ├── handoff-template.md             # Template for session handoff notes
│   └── superpowers/
│       ├── handoff/                    # Session handoff notes (phase-N-unit-X.md)
│       ├── plans/                      # Detailed implementation plans (per phase)
│       ├── specs/                      # High-level design specs and sprint plans
│       └── reports/                    # Audit reports
```

## C — Task Router

Load only what's relevant. **Do not load all files at once.**

| Task Type                      | Always Load                                                                                      | Also Load                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| Backend: new feature           | `CLAUDE.md` + `01-architecture.md` + feature spec                                                | `02-data-models.md` if schema work involved    |
| Backend: database / migration  | `CLAUDE.md` + `02-data-models.md` + feature spec                                                 | —                                              |
| Frontend: new page / component | `CLAUDE.md` + feature spec + `guides/09-design-tokens.md` + matching `stitch-designs/html/` file | `04-user-flows.md` if flow unclear; `guides/10-brand-assets.md` if placing logos; `stitch-designs/stitch-project-reference.md` if using Stitch MCP |
| Backend: API endpoint          | `CLAUDE.md` + `01-architecture.md` + feature spec                                                | `02-data-models.md` for query patterns         |
| Testing                        | `CLAUDE.md` + `guides/08-testing.md` + feature spec                                              | —                                              |
| Planning / prioritization      | `CLAUDE.md` + `05-roadmap.md` + `06-research.md` + `docs/stitch-screen-map.md`                   | `BACKLOG.md`                                   |
| Full-stack feature (Phase N)   | `CLAUDE.md` + `05-roadmap.md` (Phase N section) + feature spec(s) listed there                   | All files listed in phase's "Required Reading" |
| Phase 3.5 UX polish            | `CLAUDE.md` + `docs/superpowers/specs/phase-3.5-ux-polish-sprint.md` + `guides/09-design-tokens.md` | Relevant feature specs for the unit being implemented |
| Phase 3.8 Financial Institutions | `CLAUDE.md` + `docs/superpowers/specs/2026-04-05-financial-institutions-design.md` + `docs/superpowers/plans/2026-04-05-financial-institutions.md` | `02-data-models.md`, `03-features/accounts.md`, `guides/09-design-tokens.md` |
| Starting any implementation unit | `CLAUDE.md` + plan file + feature spec                                                          | Most recent `docs/superpowers/handoff/phase-N-unit-X.md` — **always read this first**; `BACKLOG.md` — check for items tagged to current phase |

### Frontend Planning Rule

**Every phase plan that includes frontend work MUST:**

1. List the matching `stitch-designs/html/` screen file(s) in its "Required reading" header — use `docs/stitch-screen-map.md` for quick lookup
2. Reference specific design patterns from those screens in the plan's code blocks (card structure, filter layout, table styling, form arrangement)
3. No frontend implementation plan is complete without this Stitch screen mapping

When Stitch MCP server tools are available, prefer using them to analyze design screens directly for more accurate component extraction. Fall back to the static HTML files when MCP is unavailable. Design tokens in `guides/09-design-tokens.md` always win when they conflict with the Stitch HTML.

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

7. **Frontend Stack Strictness:** Use **Next.js 16** with the **App Router** (`app/` directory). All components must use strict TypeScript, shadcn/ui, and **Tailwind CSS v4**. **shadcn/ui:** Use `shadcn@latest` with **"base-nova" style** (`@base-ui/react` primitives). When adding new shadcn components, use: `pnpm dlx shadcn@latest add -y <component>`. After adding, audit for physical directional CSS classes and convert to logical equivalents. Required libraries: use **TanStack Query** for all server state management and cache invalidation; use **react-plotly.js** for all charts and data visualizations (Recharts and Chart.js are **strictly forbidden**); use **next-intl** for all i18n formatting (dates, numbers, currencies, plurals).

8. **Track every "coming soon" UI element in `BACKLOG.md`.** Any time frontend code shows `"—"`, a disabled button, a "Coming soon" tooltip, or a placeholder instead of real data — because the backend endpoint doesn't exist yet — add a row to `BACKLOG.md` with category `backend-dep`, the UI element name, the page it appears on, the exact endpoint needed, and the target phase. This is read by phase planners to know what's already wired up and waiting.

9. **Backend Stack Strictness:** Use **Python 3.12**.

10. **Session handoff notes are mandatory.** At the **start** of any implementation unit, read the most recent handoff note in `docs/superpowers/handoff/` before writing any code — it contains decisions, surprises, and gaps that aren't visible in the code. At the **end** of any implementation unit, create a new handoff note at `docs/superpowers/handoff/phase-N-unit-X.md` using the template at `docs/handoff-template.md`, commit it to main, and push. Do not end a session without this note in place. Build an asynchronous FastAPI application (`async def`). Use Pydantic V2 for all data validation and serialization — call `model.model_dump()` exclusively; `model.dict()` is **forbidden** (Pydantic V1 syntax). Database interactions must use asynchronous SQLAlchemy. Use **uv** for dependency management (`pyproject.toml` + `uv.lock`). Do not use Poetry or Conda. Use **`fastapi.BackgroundTasks`** for fire-and-forget logic (e.g., triggering AI categorization after an import commit). Use **APScheduler** for recurring cron-style jobs (e.g., nightly exchange rate refresh, forecast recalculation).

11. **Backlog is mandatory.** At the end of every implementation unit, extract all deferred items, bugs, tech debt, and new ideas into `BACKLOG.md` with a `BL-NNN` ID. At the start of every phase plan, pull all items tagged for that phase and either include them in the plan or explicitly re-defer them. At phase completion, archive resolved items to `docs/backlog-archive.md`. See `BACKLOG.md` header for format and taxonomy.

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

### Frontend: shadcn/ui

```bash
pnpm dlx shadcn@latest add -y <component>   # add a shadcn component (base-nova style, @base-ui/react)
pnpm dlx shadcn@latest add -y -o <component> # add and overwrite existing component
```

- Style: **base-nova** (`@base-ui/react` primitives) — configured in `frontend/components.json`
- Tailwind CSS **v4** — config is in CSS (`@theme inline` block in `globals.css`), not `tailwind.config.ts`
- CSS variables use **HSL format** in `@layer base` blocks; `@theme inline` block wraps them with `hsl()` for Tailwind utility resolution
- Auto-generated components in `frontend/src/components/ui/` may contain physical directional CSS classes (`right-`, `left-`, `pr-`, `pl-`) from the generator. These **must** be converted to logical equivalents (`end-`, `start-`, `pe-`, `ps-`) immediately after adding.
- Toast notifications use **sonner** (not Radix toast) — import from `sonner` or use the `useToast()` wrapper in `hooks/use-toast.ts`
- base-nova uses `render` prop pattern instead of `asChild` — e.g., `<DialogTrigger render={<Button />}>` not `<DialogTrigger asChild><Button /></DialogTrigger>`

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

Copilot configuration lives in `.github/COPILOT-INSTRUCTIONS.md` (primary) and `.github/AGENTS.md` (tooling rules). Issue template: `.github/ISSUE_TEMPLATE/feature.md`. PR template: `.github/pull_request_template.md`.

Workflow: create issue → assign to Copilot → Copilot opens PR → CI runs → human review → squash merge.

## K — Brand Assets (Logos)

Logo files are in `logos/` (SVG preferred, PNG fallback). Full usage guide: [`docs/guides/10-brand-assets.md`](./docs/guides/10-brand-assets.md). Load that file when placing logos in the frontend.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Masareef (مصاريف)**

An AI-powered personal finance platform for Egyptian/MENA users. Built with FastAPI (Python 3.12), Next.js 16, and Supabase (PostgreSQL). Combines Arabic-first bank statement import, multi-currency tracking, debt/installment management, Gam3eya (rotating savings), asset tracking, budgeting, 12-month forecasting, and household multi-user support — features no existing product brings together for this market.

**Core Value:** Users can track all their money — across accounts, currencies, debts, and household members — in one Arabic-first platform that understands Egyptian financial patterns.

### Constraints

- **Tech stack**: FastAPI (Python 3.12) + Next.js 16 (App Router) + Supabase — locked, all architecture decisions in `docs/01-architecture.md`
- **Money**: All amounts in BIGINT minor units, never floats — non-negotiable
- **i18n**: Arabic-first RTL, CSS logical properties only (no `pl-`, `pr-`, `left-`, `right-`)
- **Data**: Household-scoped multi-tenancy, soft deletes only, RLS + application-layer enforcement
- **Frontend**: shadcn/ui (base-nova), Tailwind v4, TanStack Query, react-plotly.js for charts, next-intl for i18n
- **Backend**: Async-first (async def), Pydantic V2 (model_dump only), uv for deps, no pip/Poetry
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- Python 3.12 - Backend API (`backend/`) and domain logic
- TypeScript 5 - Frontend application (`frontend/`)
- JavaScript (Node.js 22) - Frontend build and runtime
- SQL - Database queries (PostgreSQL 15+)
- CSS 4 / Tailwind CSS 4 - Styling
## Runtime
- Python 3.12 (specified in `backend/.python-version`)
- Node.js 22-slim (Docker), with corepack enabled for pnpm
- Uvicorn ASGI server for FastAPI
- Backend: **uv** v1.0+ (Astral dependency manager, faster than pip/Poetry)
- Frontend: **pnpm** v10.32.1 (enforced via `packageManager` in `frontend/package.json`)
## Frameworks
- FastAPI 0.115.0+ - Async Python REST API framework with OpenAPI docs
- Next.js 16.1.6 - React 19 framework with App Router (`app/` directory)
- React 19 - UI component library
- SQLAlchemy 2.0.30+ with asyncio - Async ORM for PostgreSQL
- Alembic 1.13.0+ - Database migration tool
- Asyncpg 0.29.0+ - PostgreSQL async driver
- Uvicorn 0.30.0+ with standard extras - ASGI server
- TanStack Query (React Query) 5.95.2 - Server state management and cache invalidation
- next-intl 4.8.3 - I18n (Arabic-first, RTL support)
- next-themes 0.4.6 - Dark/light mode theming
- shadcn/ui (base-nova style) - Component library built on `@base-ui/react` 1.3.0
- @base-ui/react 1.3.0 - Headless React primitives
- Tailwind CSS 4.2.2+ - Utility-first CSS framework (CSS-in-JS config, logical properties for RTL)
- lucide-react 1.7.0 - Icon library
- sonner 2.0.7 - Toast notifications (not Radix toast)
- Tailwind Merge 3.5.0 - Class merging utility
- CVA (class-variance-authority) 0.7.1 - Component variant system
- Supabase Auth (via Supabase JS SDKs) - JWT-based authentication with Supabase
- python-jose 3.3.0+ with cryptography - JWT encoding/decoding (backend)
- Supabase SSR middleware (`@supabase/ssr`) - Server-side session management
- pandas 3.0.1+ - Data manipulation and CSV/Excel parsing
- openpyxl 3.1.5+ - Excel file parsing
- pdfplumber 0.11.9+ - PDF extraction
- chardet 7.4.0+ - Character encoding detection
- python-multipart 0.0.22+ - Multipart form data handling
- react-dropzone 15.0.0 - File upload UI component
- Pydantic 2.7.0+ (V2 only) - Data validation and serialization
- pydantic-settings 2.3.0+ - Environment variable management
- python-dateutil 2.9.0+ - Date/time utilities
- python-stdnum 2.2+ - Validation of standard numbers (e.g., check digits)
- rapidfuzz 3.14.3+ - Fuzzy string matching (for bank statement parsing)
- slowapi 0.1.9+ - Rate limiter for FastAPI (slowapi + Starlette)
- next-intl 4.8.3 - Frontend i18n with date/number/currency formatting
- date-fns 4.1.0 - Date formatting library
- react-day-picker 9.14.0 - Calendar component
- postcss 8+ - CSS processing
- @tailwindcss/postcss 4.2.2+ - Tailwind CSS 4 processing
- ESLint 9+ - Linting (Next.js config)
- Ruff 0.5.0+ - Fast Python linter and formatter (backend)
- Pyright 1.1.370+ - Static type checker for Python
## Key Dependencies
- `sqlalchemy[asyncio]` 2.0.30+ - Core data layer; all queries route through async SQLAlchemy
- `asyncpg` 0.29.0+ - PostgreSQL driver; Supabase uses PgBouncer (no prepared statement caching)
- `fastapi` 0.115.0+ - API framework; every endpoint is async
- `pydantic` 2.7.0+ (V2 ONLY) - Validation; use `model.model_dump()` exclusively
- `python-jose[cryptography]` 3.3.0+ - JWT verification for Supabase ES256/HS256 tokens
- `next` 16.1.6 - Core framework; App Router only
- `react` 19 - UI library
- `@supabase/supabase-js` 2.100.1 - Authentication and real-time subscriptions
- `@supabase/ssr` 0.9.0 - Server-side session management
- `@tanstack/react-query` 5.95.2 - Server state, cache invalidation
- `tailwindcss` 4.2.2 - Styling engine
- `@base-ui/react` 1.3.0 - Unstyled React primitives
- `httpx` 0.27.0+ - Async HTTP client (backend; used for JWT JWKS fetching)
- `slowapi` 0.1.9+ - Rate limiting via JWT user ID or client IP
- `pytest` 8.0.0+ - Test runner
- `pytest-asyncio` 0.23.0+ - Async test support
- `pytest-cov` 5.0.0+ - Coverage reporting
- `aiosqlite` 0.22.1+ - In-memory SQLite for testing (optional, not used in current test strategy)
## Configuration
- Backend: `.env` file (source of truth at runtime)
- Frontend: `.env.local` file (Next.js convention)
- `backend/pyproject.toml` - Project metadata, dependencies, tool configs (ruff, pytest, pyright)
- `backend/alembic.ini` - Database migration config
- `.python-version` - Python version constraint (3.12)
- `frontend/package.json` - Dependencies, scripts, pnpm version pinning
- `frontend/tsconfig.json` - TypeScript compiler options (strict mode, path aliases `@/*` → `./src/*`)
- `frontend/next.config.mjs` - Next.js config with next-intl plugin, standalone output for Docker
- `frontend/components.json` - shadcn/ui config (base-nova style, RTL enabled, Tailwind CSS 4, lucide icons)
- `frontend/postcss.config.mjs` - PostCSS config for Tailwind
- `frontend/eslint.config.mjs` - ESLint rules
## Build & Deployment
- Dockerfile: Multi-stage build using `python:3.12-slim`
- Build step: Install uv, copy `pyproject.toml` + `uv.lock`, run `uv sync --frozen --no-dev`
- Runtime: Copy virtualenv and app, expose port 8000
- Start: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Features: SQL echo disabled by default (only enabled in development via `APP_ENV`)
- Dockerfile: Multi-stage build using `node:22-slim`
- Build step: Enable corepack, install pnpm, `pnpm install --frozen-lockfile`, `pnpm build`
- Build args: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL` (baked in at build time)
- Runtime: Copy standalone output + static assets + public folder, expose port 3000
- Start: `node server.js`
- Note: Output is "standalone" for minimal Docker size
## Platform Requirements
- Python 3.12 (via `uv` or direct install)
- Node.js 22+ with corepack enabled
- Git (version control)
- Docker & Docker Compose (optional, for containerized development)
- Supabase (PostgreSQL 15+, Auth, Realtime)
- Docker or container runtime (recommended)
- HTTPS reverse proxy (Traefik, nginx, etc.)
- Environment variables from secure vault or secrets manager
- GitHub Actions (`backend.yml`, `frontend.yml` workflows)
- Backend: Python 3.12 + uv, runs ruff lint/format, pyright type check, pytest
- Frontend: Node.js 22, runs pnpm, ESLint, tsc type check, pnpm build
- Integration tests use GitHub Secrets for Supabase credentials
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Python files: `snake_case` (e.g., `account_service.py`, `account.py`)
- TypeScript/TSX files: `kebab-case` for pages/components in directories, PascalCase for exported component names
- Python: `snake_case` (e.g., `compute_balance()`, `get_account()`, `validate_institution()`)
- TypeScript: `camelCase` (e.g., `formatAmount()`, `parseAmountMinor()`, `getAuthHeaders()`)
- Private/internal functions: prefix with underscore (Python: `_helper_func()`, TypeScript: avoided in favor of module scope)
- Python classes: `PascalCase` (e.g., `Account`, `AccountService`, `ErrorDetail`)
- TypeScript types/interfaces: `PascalCase` (e.g., `ApiErrorBody`, `ApiResponse<T>`)
- TypeScript components: `PascalCase` (e.g., `LandingHero`, `AppShell`, `Button`)
- Prefix: `/api/v1/`
- Path segments: `kebab-case` (e.g., `/api/v1/accounts`, `/api/v1/import-templates`, `/api/v1/financial-institutions`)
- Tables: `snake_case`, plural (e.g., `accounts`, `transactions`, `debt_payments`)
- Columns: `snake_case` (e.g., `amount_minor`, `household_id`, `is_active`)
- Enums: stored as string values in database (e.g., `bank_account`, `credit_card`)
## Code Style
- Tool: **ruff** (linter + formatter)
- Line length: 100 characters
- Target: Python 3.12
- Config file: `backend/pyproject.toml` → `[tool.ruff]` section
- Rules enforced: E (errors), F (PyFlakes), I (isort imports), UP (upgrades)
- Tool: **ESLint** with Next.js + TypeScript configs
- Config: `frontend/eslint.config.mjs` extends `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- Run: `pnpm lint`
- Tool: **pyright**
- Mode: `basic` type checking
- Config: `backend/pyproject.toml` → `[tool.pyright]` section
- Run: `pyright` from backend directory
- Tool: **TypeScript** (strict mode)
- Config: `frontend/tsconfig.json` with `strict: true`
- Run: `pnpm exec tsc --noEmit` or part of build pipeline
## Import Organization
- Backend: No aliases; use relative or absolute imports from `app/`
- Frontend: `@/*` maps to `frontend/src/` (configured in `frontend/tsconfig.json`)
## Error Handling
- HTTP errors use `HTTPException(status_code=..., detail=...)` from FastAPI
- Error responses follow envelope format:
- Schema for error responses: `ErrorResponse` in `app/schemas/common.py` containing `ErrorDetail`
- HTTP status codes:
- Custom `ApiError` class wraps HTTP errors with typed code/status/details
- Async operations handle errors via try-catch or `.catch()` chains
- API calls defined in `lib/api-client.ts` with consistent error handling
- Error body structure parsed from either `response.error` or `response.detail.error`
## Logging
- Framework: Python's `logging` module (stdlib)
- Logger name: `__name__` for module-level logger
- Pattern: `logger.info()`, `logger.warning()`, `logger.error()` for operational events
- No print statements; use logging exclusively
- Framework: `console` methods (`console.log()`, `console.error()`, `console.warn()`)
- Used sparingly; client-side errors typically show toast notifications via `sonner`
- No logging library in use (keep lean for browser)
## Comments
- Document non-obvious algorithm logic or workarounds
- Explain why a decision was made, not what the code does (the code itself shows what)
- Flag limitations or future improvements (prefer TODO comments if actionable)
- Python: Use docstrings for public functions (triple-quote format)
- TypeScript: Use JSDoc for exported functions and complex types
## Function Design
- Prefer functions under 50 lines
- Break complex logic into smaller helpers with clear names
- Use leading underscores for private helpers (Python: `_helper()`, TypeScript: function in module scope)
- Backend: Pass plain values to services (no HTTP awareness); routers handle dependency injection
- Frontend: Use function parameters over closure captures when possible
- Async operations: Clearly mark with `async def` (Python) or `async function` (TypeScript)
- Pydantic models (Python): Use `.model_dump()` for serialization (never `.dict()`)
- TypeScript: Return typed objects matching interface definitions
- Error cases: Raise exceptions; don't return error objects alongside data
## Module Design
- Python: Each module exports a single logical unit (e.g., `account.py` exports account-related functions)
- TypeScript: Prefer named exports over default exports for clarity
- Backend: Not used; direct imports from submodules
- Frontend: Minimal use; only for component UI library (e.g., `components/ui/`)
## Async/Await Patterns
- All database calls use async/await with `AsyncSession`
- All route handlers are `async def`
- All services accept `AsyncSession` and use `await` for DB operations
- Use `async/await` for API calls and Supabase operations
- Wrap API calls in React Query `useQuery` or `useMutation` for caching/state management
- Do not use `.then()` chains; prefer async/await
## Money Representation
- All monetary amounts are stored and passed as integers representing minor units
- Never use floats for money calculations
- Currency exponent determines divisor (EGP: 2 → 125000 = 1,250.00; KWD: 3 → 125000 = 125.000)
## Pydantic V2 Patterns
- Use `model_dump()` exclusively for serialization (V1's `.dict()` is forbidden)
- Use `model_config = {"from_attributes": True}` to map ORM models to Pydantic responses
- All schema classes inherit from `BaseModel`
- Field validation via `Field()` with constraints (e.g., `Field(max_length=3)`)
## Soft Delete Pattern
- Every user-facing table has `is_active: bool` column (default `True`)
- All application queries filter `WHERE is_active = TRUE`
- Never hard-delete; set `is_active = FALSE`
- `SoftDeleteMixin` in `app/models/base.py` provides the column definition
## Dependency Injection Pattern
- `get_db_session()`: Provides SQLAlchemy AsyncSession
- `get_current_user()`: Extracts user_id from Supabase JWT
- `get_household_id()`: Returns user's household_id
- `get_member_role()`: Returns user's role in household
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- **Async-first** — FastAPI async/await, SQLAlchemy 2.0 async sessions, optimized for I/O-bound operations
- **Service-layer isolation** — all business logic (calculations, validations, transformations) lives in services, decoupled from HTTP concerns
- **Household-scoped multi-tenancy** — every query filtered by `household_id`; RLS policies enforce at database level as safety net
- **Pluggable providers** — AI categorization supports Claude, OpenAI, Azure OpenAI, Ollama with fallback chain
- **Type-safe throughout** — Pydantic v2 schemas for validation/serialization, SQLAlchemy 2.0 with type hints, TypeScript strict mode
## Layers
- Purpose: Render UI, handle user interactions, manage client-side state and caching
- Location: `frontend/src/`
- Contains: Next.js pages (`app/`), React components (`components/`), hooks, utilities, i18n
- Depends on: TanStack Query for server state, Supabase client for auth/real-time, shadcn/ui for components, Tailwind v4 for styling
- Used by: Browser clients only
- Purpose: Route HTTP requests, validate inputs via schemas, enforce auth/RLS, coordinate business logic
- Location: `backend/app/routers/`
- Contains: FastAPI routers (14 route modules), each prefixed with `/api/v1/`; dependency injection for auth/session/household scoping
- Depends on: SQLAlchemy ORM models, Pydantic schemas, service layer functions
- Used by: Frontend (exclusively) and external integrations
- Purpose: Execute domain logic (calculations, transformations, validations) with zero HTTP awareness
- Location: `backend/app/services/`
- Contains: Pure Python functions grouped by domain (account, transaction, debt, balance, FX, import parsing, AI routing, etc.)
- Depends on: SQLAlchemy models for queries, Pydantic schemas for data transfer, external APIs (Claude, OpenAI, PDF libs, etc.)
- Used by: Routers and background tasks
- Purpose: Map PostgreSQL tables to Python classes, provide async query builders
- Location: `backend/app/models/`
- Contains: 16 SQLAlchemy model classes with mixins for timestamps and soft deletes
- Depends on: `sqlalchemy.ext.asyncio` for async session management, `app/database.py` for engine/factory
- Used by: Service functions via SQLAlchemy `select()` query API
- Purpose: Host PostgreSQL database, manage user auth, store files, broadcast real-time events
- Location: Not in repo (external managed service)
- Contains: 22+ tables with RLS policies, Auth system, Storage buckets, Realtime channels
- Depends on: Nothing in codebase (external service)
- Used by: FastAPI for JWT validation, Frontend Supabase client for auth/real-time
## Data Flow
## Key Abstractions
- Purpose: Encapsulate SQLAlchemy query logic for common patterns
- Examples: `account.list_accounts()`, `transaction.get_by_id()`, `balance.get_account_balance()`
- Pattern: Always parameterized by `household_id`; filter in `WHERE` clause; return domain objects or Pydantic schemas
- Purpose: Standardized format for all API responses
- Pattern: `{ data: T, meta: { total, page, page_size }, warnings: [...] }` for lists; `{ data: T }` for single objects
- Errors: `{ error: { code: "...", message: "...", details: [...] } }`
- Defined in: `app/schemas/common.py`
- Purpose: Avoid float rounding errors in financial arithmetic
- Pattern: All amounts stored/transmitted as `BIGINT` in minor units (piasters, cents, fils)
- Currency exponent lookup: `CURRENCIES[currency]["exponent"]` to convert major ↔ minor
- Example: 1,250 EGP = 125,000 minor units; 125.000 KWD = 125,000 minor units
- Services never expose floats for monetary amounts
- Purpose: Multi-tenant data scoping at query + database layers
- Pattern: Every `where()` clause includes `entity.household_id == household_id`
- RLS policy fallback: PostgreSQL enforces same constraint via `auth.uid() IN (SELECT user_id FROM household_members WHERE household_id = ?)`
- Implementation: `get_household_id()` dependency extracts from JWT; passed to service functions explicitly
- Purpose: Pluggable categorization engine; fallback chain if primary provider fails
- Pattern: Abstract base class `app/ai/base.py` defines interface; concrete implementations (Claude, OpenAI, Azure, Ollama) in separate modules
- Router (`app/ai/router.py`) selects provider by user settings + availability
- Fallback: User's configured provider → Ollama (if available) → rule-based heuristics
- Purpose: Bank-specific parsing rules without duplicating CSV header logic
- Pattern: Base preset class in `app/services/import_/presets/base.py`; bank-specific subclasses (HSBC, CIB) override parsing
- Registry: `presets/registry.py` maps bank slug to preset class
- Detection: Content heuristics or user selection; once detected, preset applies all parsing rules
## Entry Points
- Location: `backend/app/main.py`
- Triggers: FastAPI app startup (via Docker `CMD uvicorn app.main:app`)
- Responsibilities:
- Location: `frontend/src/app/layout.tsx`
- Triggers: Next.js server startup
- Responsibilities:
- Location: `frontend/src/app/(app)/layout.tsx`
- Triggers: User navigates to authenticated route
- Responsibilities:
- Location: `frontend/src/app/(auth)/login/page.tsx` and signup equivalent
- Triggers: User not authenticated or explicitly navigates to `/login`
- Responsibilities:
- Location: `frontend/src/app/(onboarding)/onboarding/page.tsx`
- Triggers: New user first login (check via API flag in user profile)
- Responsibilities:
## Error Handling
- **Frontend**: TanStack Query handles HTTP errors; mutation callbacks show toast notifications; UI degrades gracefully (loading skeleton → empty state)
- **Backend**: FastAPI exceptions converted to HTTP responses; Pydantic validation errors caught automatically; service functions raise `ValueError` for business logic violations; routers catch and wrap in `HTTPException` with error envelope
```python
```
```python
```
```python
```
```typescript
```
## Cross-Cutting Concerns
- Framework: Python `logging` module (stdlib)
- Pattern: Each module imports `logger = logging.getLogger(__name__)`
- Levels: INFO for milestones (import started, categorization complete), WARNING for degradations, ERROR for failures
- Frontend: `console.log/warn/error` during development; production logs via browser dev tools or external service
- Frontend: Pydantic v2 schemas in request bodies; automatic 400 response if validation fails
- API response: Pydantic schemas define shape; `model.model_dump()` serializes to JSON
- Database: Not-null constraints, foreign keys, check constraints on columns
- Business rules: Service functions check (e.g., "household exists", "amount is positive") before mutation
- Strategy: Supabase JWT (issued at login) attached as `Authorization: Bearer <token>` header
- Validation: `decode_jwt()` dependency validates signature via JWKS endpoint (cached) or secret
- Extraction: `get_current_user()` dependency returns `user_id` UUID
- Household resolution: `get_household_id()` dependency looks up user's household (auto-provisions on first login)
- Frontend: Supabase client manages session (login/logout, token refresh)
- Framework: slowapi (Starlette-based)
- Config: Global limiter in `app/limiter.py`; decorators on routers to apply per-route limits
- Pattern: `@limiter.limit("100/minute")`
- Response: 429 Too Many Requests if exceeded
- Channel: Supabase Realtime WebSocket
- Events published after mutations (see Supabase event catalog in docs/01-architecture.md)
- Frontend subscription: `contexts/supabase-realtime.ts` or similar hooks subscribe to events
- Action: TanStack Query invalidates cache keys on event; UI refetches fresh data
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| feature-spec | Author or update a Masareef feature specification file in docs/03-features/ | `.claude/skills/feature-spec/SKILL.md` |
| phase-plan | Plan a Masareef implementation phase — loads roadmap context, cross-references feature specs, and produces a structured PLAN.md | `.claude/skills/phase-plan/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
