# Masareef — Project Summary for AI Review

## 1. Tech Stack & Infrastructure

### Strict Framework Constraints

| Layer        | Locked Choice                                   | Critical Version                                         |
| ------------ | ----------------------------------------------- | -------------------------------------------------------- |
| Frontend     | Next.js App Router (`app/` dir)                 | **14.2.x only** — not 15+                                |
| UI           | shadcn/ui + Tailwind CSS                        | All components through shadcn primitives                 |
| Charts       | react-plotly.js                                 | No Recharts/Nivo/Chart.js substitutes                    |
| Server state | TanStack Query                                  | Handles caching, optimistic updates, invalidation        |
| i18n         | next-intl                                       | RTL/LTR, Hijri calendar, Arabic-Indic numerals           |
| Backend      | FastAPI async (`async def` everywhere)          | Python 3.12                                              |
| Validation   | Pydantic V2                                     | No V1 patterns (`model.dict()` → `model.model_dump()`)   |
| ORM          | SQLAlchemy 2.0 async sessions via asyncpg       | No sync sessions                                         |
| Migrations   | Alembic                                         | Explicit migration files, never auto-generate-and-ignore |
| Dependencies | `uv` (backend) / `pnpm` (frontend)              | Never `pip install` or `npm install`                     |
| Database     | Supabase PostgreSQL + Auth + Storage + Realtime | RLS on every table                                       |

### Architecture Pattern

- **FastAPI is the sole API gateway.** Frontend never talks to Supabase PostgREST directly — all mutations go through FastAPI.
- **Auth flow:** Supabase issues JWT → Frontend attaches as Bearer token → FastAPI validates via JWKS → extracts `user_id` + `household_id` → all queries scoped by `household_id`.
- **Realtime:** Supabase WebSocket pushes `account:balance_changed`, `transaction:created`, `transaction:categorized`, `notification:new`, `debt:payment_recorded` events keyed by `household:{id}` or `user:{id}`. Frontend invalidates TanStack Query cache keys on receipt.
- **Background tasks:** `fastapi.BackgroundTasks` for fire-and-forget (AI categorization, report gen). `APScheduler` (AsyncIOScheduler) for cron jobs (daily FX fetch, notification scheduling, budget rollover).
- **AI provider system:** Abstract `AIProvider` interface with concrete implementations for Claude, OpenAI, Azure OpenAI, Ollama. `AIRouter` selects provider from per-user settings with fallback chain. Categorization confidence tiers: >95% auto-assign, 75–95% suggest, <75% ask.

---

## 2. Core Data Topology

### Strict Relational Rules

- **Root isolation unit:** `households` table. Every user-facing table has `household_id UUID FK → households`. RLS policy on every such table: `auth.uid() IN (SELECT user_id FROM household_members WHERE household_id = table.household_id)`. Application layer enforces this independently (defense-in-depth).
- **Money storage:** `BIGINT` minor units only. Never floats. `KWD` has exponent 3 (1 KWD = 1000 fils); all other supported currencies exponent 2. `CURRENCIES` config dict is the single source of truth for exponents and symbols.
- **Exchange rates:** Stored as `rate × 10,000` (integer). Hub currency is USD. Historical rates never retroactively modified.
- **Soft deletes:** `is_active BOOLEAN DEFAULT TRUE` on all user-facing tables. Queries always filter `WHERE is_active = TRUE`. Hard deletes forbidden.
- **Signed amounts:** `transactions.amount_minor` is signed (negative = debit, positive = credit). `transaction_splits.amount_minor` is always positive. `debt_payments.amount_minor` is always positive.
- **Transfer linking:** Two transaction rows share a `transfer_id UUID` (one debit, one credit). `applies_to_balance = true` on both legs.

### Key Entity Relationships

```
Household
 ├── Accounts (bank_account | credit_card | cash_wallet | digital_wallet | financing_app)
 │    └── Transactions
 │         ├── transaction_splits (splits must sum to abs(amount_minor))
 │         ├── gam3eya_id → Gam3eyas
 │         └── asset_id → Assets
 ├── Debts → Debt Payments (optionally linked to a transaction)
 ├── Installment Plans (credit_card | store | financing_app)
 ├── Persons (P2P debt counterparties; deletion blocked if active debts exist)
 ├── Gam3eyas → Gam3eya Payout Splits
 ├── Assets → Asset Value History
 ├── Budgets → Budget Categories (spent computed at query time, not denormalized)
 ├── Savings Goals (independent, not owned by transactions)
 ├── Recurring Rules
 └── Categorization Rules (run BEFORE AI; if match ≥0.95 confidence, AI call skipped)

Global (no household scope):
 Exchange Rates
 Categories (predefined, immutable) + per-household custom categories
```

### Cascade / Deletion Rules (non-obvious ones)

- Deleting an account: transactions remain (`is_active = true`). Linked debts/installments are NOT auto-deleted — user must resolve or a warning is shown.
- Deleting a transaction: if splits exist, they are soft-deleted. If linked to a `debt_payment`, payment record survives with intact FK.
- Deleting a person: **blocked** if any active debt references `person_id`. Error: "This person has N active debts."
- Predefined categories: cannot be soft-deleted under any circumstance.

---

## 3. Complex Business Logic

### Gam3eya (جمعية) — Rotating Savings Club

- A group where N members each contribute a fixed amount/month for N months; the total pool is paid to one member per month on rotation.
- **Schema:** `gam3eyas` has `payout_month` (1-based offset, null if split mode). Split mode uses `gam3eya_payout_splits` table where sum of split amounts must equal `total_months × monthly_contribution_minor`.
- **Transaction linking:** contributions are debit transactions with `gam3eya_id` set; payouts are credit transactions with `gam3eya_id`. Auto-assigned "Savings" category.
- **Status derivation:** `paid`/`overdue`/`upcoming` for contributions is derived from existence of matching transactions (not a stored status column). Payout status `received`/`pending`/`upcoming` same pattern.
- **Constraint:** Financial parameters (contribution amount, months, payout month) cannot be modified after any contribution transaction has been recorded.
- **Net position:** `total_received - total_contributed`. Should equal 0 at cycle end.
- **Forecasting integration:** contributions appear as monthly expenses; payout months appear as income in the 12-month projection.

### Egyptian BNPL / Financing Apps (ValU, Souhoola, Sympl, Forsa, etc.)

- Not credit cards — regulated by Egypt's Financial Regulatory Authority, not the Central Bank.
- Represented as `account_type = 'financing_app'`. Balance is stored as a **negative integer** (owed amount), same as credit cards.
- Installment plans created from purchases use `installment_type = 'financing_app'` and `source_account_id` → the financing app account.
- `available_limit = credit_limit + balance` (both in minor units; balance is negative).
- These apps provide no statement export — all tracking is fully manual.
- A household may have 2–3 financing apps active simultaneously; the UI must show cross-app total monthly commitment and aggregate remaining balance.

### Import Pipeline

- No Open Banking in Egypt. Users manually download PDFs/CSVs/Excel files.
- **Encoding:** Arabic bank files often use Windows-1256. `chardet` detects encoding before parsing.
- **Two-layer system:** built-in presets (HSBC CC, generic CSV, generic Excel) + user-saved column mapping templates per account.
- **Duplicate detection key:** `(account_id, date, amount_minor, description)`. Duplicates pre-selected as excluded.
- **Scanned PDFs:** `pdfplumber` text extraction failure routes to Landing AI ADE OCR API (premium tier only). Free users see upgrade prompt.
- **Commit is atomic:** all rows inserted + account balance updated in a single transaction. AI categorization runs as a background task after commit.

### 12-Month Cash Flow Forecasting

- **9 data sources** aggregated per month: recurring rules (income+expense), bank loan amortization payments, CC/store/financing-app installment payments, Gam3eya contributions, Gam3eya payout income, P2P debt splits (incoming = income, outgoing = expense), estimated non-recurring spend.
- **Non-recurring estimation:** rolling average of actual spending per category over last N months (default 3), filtered by `forecast_min_threshold_percent` (default 5%). Estimated items visually flagged with "~" prefix. Categories already covered by a recurring rule are excluded to prevent double-counting.
- **Multi-currency:** all items converted to household base currency via latest FX rates at projection time. Missing rates flag the item with a warning and exclude it from totals.
- **Debt payoff:** per-debt payoff date computed from remaining balance ÷ amortization schedule. `debt_free_date = MAX(payoff_date across all active debts)`.

### Amortization / Debt Interest

- Bank loans stored with `annual_rate_bps` (basis points, e.g., 1450 = 14.5%) and `tenure_months`. Monthly payment pre-calculated via PMT formula and stored in `monthly_payment_minor`.
- `debt_payments` records both `principal_minor` and `interest_minor` portions for amortized loans.
- P2P debts have `repayment_mode`: `lump_sum` (single `due_date`), `equal_splits`, or `custom_splits` via `p2p_debt_splits` table (sum of splits must equal `principal_minor`).

### Arabic/RTL Rules

- UI is RTL-first. All layout uses Tailwind `rtl:` variants. Never use `left`/`right` CSS properties — use logical `start`/`end`.
- Fonts: Inter (Latin), Noto Sans Arabic (Arabic). Stitch-generated HTML may contain different fonts — always override.
- Hijri calendar: frontend-only display conversion via next-intl. Storage is always Gregorian (`DATE` / `YYYY-MM-DD`).
- Arabic-Indic numerals: opt-in via `use_arabic_numerals` setting. Display layer only, never affects stored values.
- All categories have both `name_en` and `name_ar`. All predefined options (account types, debt types, etc.) must have Arabic labels.

---

## 4. UI/UX Implementation Strategy

### Token Hierarchy (strictly enforced)

```
design-tokens.md > Stitch HTML > shadcn/ui defaults
```

- **Primary green:** `#16A34A` (income, CTA, positive balance)
- **Error red:** `#EF4444` (expense, negative balance, destructive)
- **Warning amber:** `#F59E0B` (budget ≥80% spent, payment due ≤7 days)
- **Card border-radius:** 10px; Input/button: 6px; Badge: 4px
- Stitch HTML files contain hardcoded hex values that may differ from tokens — always replace with canonical values.

### Component Architecture

- All shared primitives live in `frontend/src/components/ui/` (shadcn/ui wrappers).
- Feature-specific components live in `frontend/src/components/{feature}/` (e.g., `accounts/`, `debts/`, `gam3eya/`).
- **Do not build page-by-page.** Extract reusable primitives (AmountDisplay, AccountCard, InstallmentRow, etc.) into the centralized `components/` directory before wiring into pages.
- Stitch HTML files are layout references for section order and component hierarchy — not pixel specs. The 32 HTML files are not mutually consistent; normalize inconsistencies against `09-design-tokens.md`.

### Stitch MCP Usage

- When building a page, load the matching HTML from `docs/stitch-designs/html/` alongside the feature spec and `09-design-tokens.md`.
- Prefer using Stitch MCP server tools to analyze screens directly over reading raw HTML.
- Use screenshots in `docs/stitch-designs/screenshots/` as visual sanity-check only.

### Amount Display

- Always use `format_amount(amount_minor, currency)` — divides by `10^exponent` and formats with correct decimal places.
- Income amounts: `#16A34A`. Expense amounts: `#EF4444`. Neutral/balance: `#0F172A` (light) / `#F8FAFC` (dark).
- Large prominent numbers on all summary screens — the number answers "how much?" before any label answers "what?".
