# Roadmap

Phased delivery plan. Each phase ships a usable increment. Dependencies flow top-down — later phases build on earlier ones.

## Phase Overview

| Phase | Name | Goal | Est. Effort | Backlog | Status |
|-------|------|------|-------------|---------|--------|
| 1 | Foundation | Accounts, transactions, categories — the core data loop | Large | — | ✅ Complete |
| 1.5 | Gap Remediation & Polish | Infrastructure upgrade, UI foundation, landing page, workflow formalization | Large | — | ✅ Complete |
| 1.75 | Design System & Page Redesign | Full Stitch design fidelity — design tokens, page redesigns, UI consistency | Medium | — | ✅ Complete |
| 2 | Import & Templates | Bank statement import pipeline with template system | Large | — | ✅ Complete |
| 3 | Debts & Installments | Loans, P2P, CC installments, store plans, amortization | Large | — | ✅ Complete |
| 3.5 | UX Polish Sprint | Fix critical UX bugs, form consistency, card enhancements, date standardization | Medium | — | ✅ Complete |
| 3.75 | UX Critique & Cleanup | Accessibility, mobile layout, form fixes, visual polish, dashboard widgets, command palette, navbar refactor | Medium | — | ✅ Complete |
| 4 | Dashboard & Charts | Plotly charts, remaining dashboard stat cards, asset summary | Medium | 18 open | ⏳ Pending |
| 5 | Gam3eya | Rotating savings clubs with payment scheduling | Medium | 1 open | ⏳ Pending |
| 6 | Assets | Asset tracking, valuation, transaction linking, cost of ownership | Medium | — | ⏳ Pending |
| 7 | Budgets & Savings Goals | Envelope budgeting, savings targets, auto-suggest | Medium | 1 open | ⏳ Pending |
| 8 | Forecasting | 12-month cash flow, debt payoff, non-recurring estimation | Medium | — | ⏳ Pending |
| 9 | AI Categorization | Multi-provider AI, rule engine, feedback loop | Medium | — | ⏳ Pending |
| 10 | Multi-User & Household | Roles, invitations, child accounts, activity log | Large | 1 open | ⏳ Pending |
| 11 | Notifications | Bill reminders, budget alerts, Telegram bot, email | Medium | 1 open | ⏳ Pending |
| 12 | Reports & Export | 7 report types, PDF/Excel/CSV export | Medium | — | ⏳ Pending |
| 13 | Settings & Polish | Settings pages, locale, data management, onboarding wizard | Medium | 1 open | ⏳ Pending |
| 14 | Scanned PDF (Premium) | Landing AI OCR for scanned bank statements | Small | 1 open | ⏳ Pending |
| 15 | Receipt Scanning | Camera/upload receipt OCR, transaction auto-create | Medium | — | ⏳ Pending |
| 16 | Subscription Tracking | Auto-detect recurring charges, renewal reminders | Small | — | ⏳ Pending |
| 17 | Telegram/WhatsApp Bot | Expense logging via chat, balance queries | Medium | — | ⏳ Pending |
| 18 | Islamic Finance Mode | Zakat calculation, Shariah compliance tagging | Medium | — | ⏳ Pending |
| 19 | Scenario Planning | What-if forecasting simulations | Small | — | ⏳ Pending |
| 20 | Mobile App (PWA) | Progressive web app for native-like mobile experience | Medium | — | ⏳ Pending |

---

## Phase 1: Foundation ✅
**Unlocks:** Everything. No feature works without accounts, transactions, and categories.

### Deliverables
- FastAPI backend with SQLAlchemy models, Pydantic schemas, Supabase connection
- Supabase Auth integration (sign-up, login, JWT verification)
- Household creation on first sign-up
- Account CRUD (all 5 types: bank_account, credit_card, cash_wallet, digital_wallet, financing_app — balance computation, reconciliation)
- Transaction CRUD (create, edit, delete, balance impact, soft delete)
- Transfer creation (same-currency and cross-currency with FX rate)
- Category seeding (18 predefined), custom category CRUD
- Transaction splits (multi-category)
- Transaction search and filtering (7 dimensions, pagination)
- Bulk operations (delete, re-categorize)
- Next.js frontend: app shell, sidebar, navbar, RTL support, dark mode
- TanStack Query setup with FastAPI client generation
- i18n setup (Arabic + English, next-intl)
- Money formatting (minor units, Arabic-Indic numerals, locale-aware)

### Success Criteria
- User can create accounts, record transactions, categorize, search, and see correct balances
- Transfers update both accounts atomically
- Arabic RTL layout renders correctly across all pages
- All mutations go through FastAPI (no direct Supabase PostgREST calls)

### Implementation Sequence

**Backend (build first):**
1. Project scaffolding — `backend/app/main.py`, `config.py`, `database.py`, `dependencies.py`
2. SQLAlchemy base — `models/base.py` (timestamps mixin, soft delete mixin with `is_active`)
3. Household + member models + migration — `models/household.py` (accounts depend on household_id FK)
4. Account model + migration — `models/account.py`, Alembic migration
5. Category model + migration + seed — `models/category.py`, `seed.py` (18 predefined categories + 7 currencies)
6. Transaction model + migration — `models/transaction.py`, `models/transaction_split.py`
7. Exchange rate model + migration — `models/exchange_rate.py`
8. Pydantic schemas — `schemas/account.py`, `schemas/transaction.py`, `schemas/category.py`, `schemas/transfer.py`
9. Auth dependency — `dependencies.py` (`get_db_session`, `get_current_user`, `get_household_id`)
10. Money service — `services/money.py` (`CURRENCIES` dict, `format_amount()`, conversion helpers)
11. Balance service — `services/balance.py` (`compute_displayed_balance()`, `apply_transaction_delta()`)
12. Account router — `routers/accounts.py` (CRUD + `/reconcile` + `/net-worth`)
13. Category router — `routers/categories.py` (list predefined + custom CRUD)
14. Transaction router — `routers/transactions.py` (CRUD + search + filter + splits + bulk ops)
15. Transfer router — `routers/transfers.py` (create + delete + list, atomic two-leg)

**Frontend (build after backend API is available):**
16. Next.js app shell — App Router layout, sidebar, navbar, RTL support, dark/light mode toggle
17. Supabase Auth integration — login page, signup page, session management (`middleware.ts`)
18. TanStack Query setup — `QueryClientProvider`, typed API client generated from FastAPI OpenAPI
19. i18n setup — `next-intl` with `messages/ar.json` + `messages/en.json`, RTL/LTR switching
20. Money formatting utilities — `lib/money.ts` (minor units → display, locale-aware, Arabic numerals)
21. Accounts page — account grid by type, create account form (shadcn dialog), account cards
22. Account detail page — transaction table with filters, pagination, balance header
23. Transaction form — create/edit slide-out sheet, category selector, split form
24. Transfer form — two-account selector, FX rate input for cross-currency
25. Global transactions page — all-account transaction table with account column

**Required reading:** `00-overview.md`, `01-architecture.md`, `02-data-models.md`, `03-features/accounts.md`, `03-features/transactions.md`, `03-features/transfers.md`, `03-features/categories.md`, `03-features/exchange-rates.md`, `guides/08-testing.md`, `guides/09-design-tokens.md`

**Status:** ✅ Complete (Units 1A–1J)

---

## Phase 1.5: Gap Remediation & Polish ✅
**Unlocks:** Full visual fidelity, landing page, workflow formalization. Required before Phase 2.

### Deliverables
- Infrastructure upgrade: Next.js 16, Tailwind CSS v4, shadcn/ui base-nova
- Backend completeness: net-worth endpoint, category hierarchy + icons, credit card validation
- UI foundation: error boundaries, toasts, loading skeletons, empty states, mobile nav drawer
- Auth redesign: split-layout login/signup, onboarding wizard
- Page fidelity: accounts, transactions, transfers pages match Stitch designs
- Landing page: 8-section marketing page with pricing, features, how-it-works
- Workflow: formalized Plan → Execute → Review → UAT → Merge process documented

### Success Criteria
- All Phase 1 pages match Stitch designs at functional fidelity level
- Landing page live for unauthenticated users
- Workflow documented in docs/guides/11-workflow.md
- Roadmap updated with deferred items

**Status:** ✅ Complete (PRs #16–27)

---

## Phase 1.75: Design System & Page Redesign ✅
**Unlocks:** Visual consistency, correct branding, and shared component foundation before feature expansion in Phase 2.

### Problem
Pages were built functionality-first across Phase 1 and 1.5. They work correctly but don't consistently match Stitch designs. The original Stitch project (`3967836651870677827`) has incorrect branding (wrong logo/tagline) and is retired. There is no shared component library, so each page implements its own card, table, filter, and form patterns.

### Design Principles

- **Stitch MCP is the primary tool.** All design work uses `generate_screen_from_text`, `edit_screens`, `get_screen` etc. Static HTML files in `docs/stitch-designs/html/` are fallback only when MCP is unavailable.
- **User design review gate.** Every Stitch-generated screen must be reviewed and approved by the user before implementation begins. The cycle is: generate → present → user approves or requests changes → only then implement. No implementation starts without explicit sign-off.
- **English designs, RTL-first implementation.** Stitch screens are generated in English (better AI quality). All implementation code uses CSS logical properties (`ps-`, `pe-`, `start-`, `end-`) — never physical (`pl-`, `pr-`, `left-`, `right-`). Arabic RTL rendering is verified in every wave's acceptance criteria.
- **Rebuild visuals, preserve logic.** All TanStack Query hooks, API calls, pagination, filter state, form validation, and i18n translations stay intact. Only component markup and styling change.

### Deliverables

**Wave 1 — Design System Foundation (`chore/1.75-design-system`)**
- New Stitch project with correct Masareef branding (primary `#16A34A`, INTER font, ROUND_EIGHT, FIDELITY color variant, neutral `#0F172A`)
- All 8 screens generated via Stitch MCP and **approved by user before any implementation**
- `frontend/src/config/brand.ts` — single source for name, tagline (EN + AR), integrated with next-intl
- 6 shared components: `PageHeader`, `StatCard`, `FilterBar`, `DataTable`, `FormSheet`, `SummaryBar`
- Sidebar full redesign (matching Stitch 05-dashboard sidebar)
- Navbar token alignment (colors, spacing, typography)
- Design token audit — `globals.css` CSS variables verified against `guides/09-design-tokens.md`
- Frontend design playbook: `docs/guides/13-frontend-design-playbook.md` _(note: 11=workflow, 12=UAT template)_

**Wave 2a — Auth & Onboarding Redesign (`feature/1.75-auth-redesign`)**
- Login: split-screen, dark navy `#0F172A` left panel, white logo variant, form right
- Signup: same split-screen layout, extended form, confirmation flow
- Onboarding: 4-step wizard with progress indicator
- All auth logic (redirect, confirmation, duplicate detection, error handling) preserved

**Wave 2b — Core App Pages Redesign (`feature/1.75-app-pages-redesign`)**
- Dashboard: real StatCards, recent transactions, quick actions, chart placeholder cards (Plotly deferred to Phase 4)
- Accounts: cards grouped by type, net worth bar, credit utilization indicators
- Account Detail: header with stats row, transaction list with FilterBar + DataTable
- Transactions: redesigned FilterBar, DataTable, summary stats row, FAB (floating action button, bottom-end)
- Transfers: improved card layout, from→to visual flow
- Transaction Form + Transfer Form: rebuilt using `FormSheet` shared component (screens 21 + 22)
- All page logic (hooks, API calls, filters, pagination, bulk ops) preserved

**Wave 2c — Landing Page Refresh (`feature/1.75-landing-refresh`)**
- Rebuild all 8 landing sections from new Stitch design with correct brand text and logo variants

**Cross-cutting**
- "Coming soon" policy: backend-dependent UI elements shown as disabled with tooltip ("Coming soon") or empty state ("Coming in Phase N") — never silently omitted
- Backend dependency tracker: `docs/superpowers/plans/phase-1.75/backend-dependencies.md` — every "coming soon" item mapped to a target phase

### Out of Scope
- No new backend endpoints — this is a frontend-only phase
- No Plotly charts — dashboard gets placeholder cards only (Phase 4)
- No new features or behaviour changes — visuals only
- Settings page — currently a placeholder; built in Phase 13
- Future phase pages — only the 9 currently built pages are redesigned

### Success Criteria
- All 9 pages (landing, login, signup, onboarding, dashboard, accounts, account detail, transactions, transfers) + 2 forms (transaction form, transfer form) visually match their approved Stitch design
- Every Stitch screen was reviewed and explicitly approved by user before implementation
- Brand strings (tagline, name) come from `brand.ts` — not hardcoded anywhere
- Logo variant correctly selected per background (default on light, white on dark/navy)
- 6 shared components used consistently across all pages
- CSS variables in `globals.css` match canonical tokens in `guides/09-design-tokens.md`
- No physical directional CSS classes (`pl-`, `pr-`, `ml-`, `mr-`, `left-`, `right-`) anywhere in frontend
- RTL Arabic correct on every page
- Dark mode correct on every page
- Responsive at 375px, 768px, 1280px on every page
- All existing functionality preserved — no regressions on any page
- Backend dependency tracker complete — all "coming soon" items mapped to a roadmap phase
- `pnpm build` + `pnpm lint` + `tsc --noEmit` pass on all branches

**Required reading:** `guides/09-design-tokens.md`, `stitch-screen-map.md`, `docs/superpowers/specs/2026-03-30-phase-1.75-design-system-redesign.md`

**Status:** ✅ Complete (Waves 1–2c)

---

## Phase 2: Import & Templates ✅
**Unlocks:** User onramp. Without import, users must enter transactions manually — too much friction.

### Deliverables
- File upload endpoint (CSV, Excel, PDF)
- Encoding detection (chardet for Windows-1256)
- CSV parser with column mapping UI
- Excel parser with sheet selection
- PDF text extraction via pdfplumber
- HSBC CC PDF preset (verified)
- Duplicate detection (account + date + amount + description)
- Preview table with per-row status and toggles
- Atomic commit (insert rows + update balance)
- Import template CRUD (save, reuse, link to account)
- Account-linked template auto-detection
- Rate limiting and file size limits for upload endpoints _(deferred from Phase 1.5)_

### Success Criteria
- User uploads a CSV → maps columns → previews → imports in under 2 minutes
- Second import to same account auto-applies saved template
- Duplicates correctly detected and auto-deselected
- HSBC CC PDF parses correctly with card variant detection

### Implementation Sequence

**Backend:**
1. File upload endpoint — `routers/import.py` → `POST /api/v1/import/parse` (multipart, returns rows preview)
2. Encoding detection service — `services/import/encoding.py` (chardet, Windows-1256 fallback)
3. CSV parser — `services/import/csv_parser.py` (column mapping, date format inference)
4. Excel parser — `services/import/excel_parser.py` (openpyxl, sheet selection)
5. PDF text parser — `services/import/pdf_parser.py` (pdfplumber, table extraction)
6. Bank preset registry — `services/import/presets/` (HSBC CC parser as first preset)
7. Duplicate detection service — `services/import/duplicate_checker.py` (account + date + amount + description hash)
8. Import commit endpoint — `POST /api/v1/import/commit` (atomic: INSERT rows + UPDATE account balance)
9. Import template model + migration — `models/import_template.py`, `models/account_import_template.py`
10. Template CRUD router — `routers/import_templates.py` (save, list, delete, link to account)

**Frontend:**
11. Import wizard step 1 — file upload drag-and-drop, account selector
12. Import mapping step — column mapper UI with date format selector
13. Import preview step — table with per-row toggle, duplicate badges, commit button

**Required reading:** `01-architecture.md`, `02-data-models.md`, `03-features/import.md`

**Status:** ✅ Complete (Units 2A–2C)

---

## Phase 3: Debts & Installments ✅
**Unlocks:** Debt tracking is a primary use case for Egyptian users. Installments are cultural.

### Deliverables
- Bank loan CRUD with amortization engine (PMT formula)
- Debt payment recording with principal/interest split
- Installment status logic (paid/overdue/upcoming)
- Auto-match suggestions (linked account transactions near due date)
- Person CRUD (name, name_ar, phone, email, relationship)
- P2P debt CRUD with 3 repayment modes (lump sum, equal splits, custom splits)
- P2P debt splits table and schedule
- Person card with per-currency balances and base currency total
- Credit card installment plans with per-card utilization
- Store installment plans with merchant tracking
- Financing app accounts (ValU, Souhoola, Sympl, Forsa, Tru, etc.) with per-app utilization
- Financing app installment plans linked to BNPL accounts
- Debt page with 5 tabs (loans, CC installments, financing apps, store installments, P2P)
- Credit card statement cycle — statement generation date, current vs statement balance, minimum payment calculation, payment reminder integration _(deferred from Phase 1.5)_
- Transaction pending vs posted state for credit card reconciliation _(deferred from Phase 1.5)_

### Success Criteria
- Amortization schedule matches standard PMT calculation
- P2P person card shows correct per-currency net balances
- Credit card utilization correctly computed across concurrent plans
- Overdue installments flagged visually

### Implementation Sequence

**Backend:**
1. Debt model + migration — `models/debt.py` (bank_loan, personal_lent, personal_borrowed)
2. Amortization service — `services/amortization.py` (PMT formula, payment schedule generation, early payoff)
3. Debt payment model + migration — `models/debt_payment.py`
4. Person model + migration — `models/person.py`
5. P2P debt splits model + migration — `models/p2p_debt_split.py`
6. Installment plan model + migration — `models/installment_plan.py` (`source_account_id` FK)
7. Debt router — `routers/debts.py` (CRUD + payment recording + amortization schedule endpoint)
8. Persons router — `routers/persons.py` (CRUD + per-currency balance endpoint)
9. Installments router — `routers/installments.py` (CRUD per type)

**Frontend:**
10. Debts page — 5-tab layout (loans, CC installments, financing apps, store installments, P2P)
11. Loan detail — amortization table, payment form, progress bar
12. P2P person card — per-currency nets, debt list, payment recording
13. Installment form — create plan, link to source account

**Required reading:** `02-data-models.md`, `03-features/debts.md`, `03-features/financing-apps.md`

**Status:** ✅ Complete (Phases 3A–3D). Phase 3E (CC Statement Cycle & Pending/Posted Transactions) deferred to Phase 4.

### Deferred from Phase 3 → Phase 4
- Credit card statement cycle — statement generation date, current vs statement balance, minimum payment calculation _(plan: `docs/superpowers/plans/phase-3/2026-04-02-phase-3e-cc-statement-cycle.md`)_
- Transaction pending vs posted state for credit card reconciliation

---

## Phase 3.5: UX Polish Sprint 🔨
**Unlocks:** Production-quality UX before adding new features. Fixes critical bugs, standardizes patterns, enhances cards.

> **Execution plan:** `docs/superpowers/specs/phase-3.5-ux-polish-sprint.md`

### Background
Post-Phase 3 browser audit (April 2026) found 20+ UX issues across the app: critical bugs (negative values in wrong colors, missing form fields), inconsistent patterns (3 date formats, mixed form types), and missing polish (no required markers, truncated labels, no empty states).

### Deliverables

**Unit 1 — Critical Bug Fixes**
- Net worth card: red for negative, green for positive
- Credit card "Available" balance: red when negative
- Transaction form: add Account selector (default to last-used account)
- Category dropdown: replace `__uncategorized__` with human-readable label
- Date format: standardize to dd/mm/yyyy everywhere (shared `formatDate()` utility)

**Unit 2 — Form UX Improvements**
- Convert Add Account form from center modal to side sheet (consistency)
- Add required field markers (*) to all forms
- Fix raw enum values in dropdowns (e.g., `credit_card` → "Credit Card")
- Fix "Opening Balance" → "Current Balance Due" for credit cards
- Fix truncated filter labels ("Max amoun" → "Max amount")
- Add inline form validation (error messages on blur + submit)

**Unit 3 — Placeholder & Status Text Cleanup**
- Replace "Coming in Phase X" with subtle clock icon (no text)
- Standardize stat card placeholders across all pages
- Add clock icon + tooltip to disabled sidebar items (Budgets, Gam3eya)

**Unit 4 — Account Card Enhancements**
- 3-dot action menu (Edit, Delete, View Transactions, Transfer)
- Hover states (shadow, border, cursor)
- Account type sub-labels
- Last activity indicator
- Balance trend indicator (↑/↓ arrow) — may need backend endpoint
- Warning state for negative balances
- Consistent status badges across all card types

**Unit 5 — Navigation & Cross-Linking**
- Breadcrumb navigation on all detail pages
- Link transactions to related debts
- Dashboard cards clickable → navigate to detail pages

**Unit 6 — Miscellaneous Polish**
- Empty state designs (no accounts, no transactions, no debts)
- FAB button tooltips
- Success toast after form submissions

### Success Criteria
- All 5 critical bugs fixed
- All forms use side sheet pattern with required markers and inline validation
- All dates display as dd/mm/yyyy
- All placeholder text uses consistent clock icon pattern
- Account cards enhanced with action menus, hover states, status badges
- `pnpm build` + `pnpm lint` + `tsc --noEmit` pass
- No physical directional CSS classes

### Implementation Sequence
Units 1–6, in order. See execution plan for full details.

**Required reading:** `guides/09-design-tokens.md`, `docs/superpowers/specs/phase-3.5-ux-polish-sprint.md`

**Status:** ✅ Complete (PR #51)

---

## Phase 3.75: UX Critique & Cleanup ✅
**Unlocks:** Production-quality UX, accessibility compliance, real dashboard data, global search. Pulls forward transaction summary endpoint from Phase 4.

> **Design spec:** `docs/superpowers/specs/2026-04-04-phase-3.75-ux-critique-design.md`
> **Implementation plan:** `docs/superpowers/plans/2026-04-04-phase-3.75-ux-critique.md`

### Background
Post-Phase 3.5 UX critique audit (April 2026) identified 26 findings across accessibility, mobile layout, forms, visual hierarchy, dashboard, and technical debt.

### Deliverables

**Backend:**
- `GET /api/v1/transactions/summary` — period + filter-aware transaction aggregation (BL-009, BL-015)
- `GET /api/v1/accounts/{id}/balance-history` — balance trend indicator (BL-006)
- `last_transaction_date` on AccountResponse (BL-007)
- `GET /api/v1/transactions/last-used-account` (BL-008)
- `debt_id` on TransactionResponse (BL-047)

**Frontend — Accessibility:**
- Skip-to-content link (WCAG 2.1 AA)
- MoneyDisplay +/− prefix for color-blind users
- Loan card semantic `<Link>` instead of `<div onClick>`
- `<ComingSoon>` wrapper for consistent disabled patterns

**Frontend — Mobile & Layout:**
- `<ResponsiveActions>` overflow menu for navbar buttons on mobile
- Net worth hero vertical stacking on small screens
- Shared FAB component on Account Detail
- Sidebar section label visibility increase

**Frontend — Forms:**
- Edit Transaction migrated from Dialog to FormSheet
- Textarea for notes fields
- CurrencyInput with inline currency symbol
- DatePicker with calendar popover (dd/mm/yyyy)

**Frontend — Visual Polish:**
- StatCard tinted backgrounds (replaces heavy gradients)
- Dark mode border contrast fix
- Institution-based credit card gradients with dark mode variants
- Mobile transaction row overflow menu
- Transfers page subtitle

**Frontend — Dashboard:**
- Getting Started onboarding card (zero-data state)
- Accounts at a Glance widget
- Monthly Activity widget (uses transaction summary endpoint)
- Live stat cards for monthly income/spending

**Frontend — Search & Refactor:**
- Cmd+K command palette (pages + accounts)
- Declarative `<NavbarActions>` portal component (replaces imperative setActions)

### Success Criteria
- All 26 UX critique findings addressed
- Skip-to-content link visible on Tab focus
- Navbar buttons collapse on mobile (<640px)
- Dashboard shows real data from transaction summary endpoint
- All forms use FormSheet, DatePicker, CurrencyInput, Textarea
- `pnpm build` + `pnpm lint` + `tsc --noEmit` pass
- `pytest` passes for all new backend code

### Backlog Items Resolved
BL-006, BL-007, BL-008, BL-009, BL-015, BL-030 (pre-verified), BL-031 (pre-verified), BL-042 (pre-verified), BL-047

**Required reading:** `docs/superpowers/specs/2026-04-04-phase-3.75-ux-critique-design.md`, `guides/09-design-tokens.md`

**Status:** ✅ Complete (PR #53)

---

## Phase 4: Dashboard & Charts
**Unlocks:** The "open app, glance, close" experience. Makes all previous data useful at a glance.

### Deliverables
- Single API endpoint returning all dashboard data
- 4 stat cards (net worth, monthly spending, active debts, upcoming 30d)
- Net worth timeline (Plotly area chart, stacked composition, time range toggle)
- Income vs expenses (Plotly bar chart, 6 months)
- Spending by category (Plotly donut, top 8 + other, clickable)
- Upcoming payments list (next 30 days, overdue pinned)
- Asset summary cards (by type, value + change %)
- Base currency selector
- Mobile responsive layout

### Success Criteria
- Dashboard loads in single API call, renders within 500ms
- Net worth includes accounts + assets - debts across currencies
- Category donut click navigates to filtered transaction list
- All charts render correctly in both LTR and RTL

### Implementation Sequence

**Backend:**
1. Dashboard aggregation service — `services/dashboard.py` (net worth, monthly totals, upcoming payments, category breakdown)
2. Dashboard router — `routers/dashboard.py` → `GET /api/v1/dashboard` (single endpoint, all data)
3. FX conversion integration — ensure multi-currency net worth conversion routes through USD hub

**Frontend:**
4. Dashboard page — stat cards grid + charts grid layout
5. Net worth timeline — Plotly area chart with stacked composition + time range toggle
6. Income vs expenses — Plotly bar chart (6 months, RTL-aware)
7. Category donut — Plotly donut, top 8, click → navigate to filtered transactions
8. Upcoming payments list — next 30 days, overdue pinned first
9. Base currency selector — persists to household settings

**Required reading:** `03-features/dashboard.md`, `03-features/exchange-rates.md`, `guides/09-design-tokens.md`

---

## Phase 5: Gam3eya
**Deliverables:** Full Gam3eya CRUD, payment schedule, contribution/payout recording, transaction linking, active/completed tabs, net position tracking.

### Success Criteria
- Payment schedule generates correct months from parameters
- Contributions and payouts create linked transactions with Savings category
- Net position = 0 at cycle completion

### Implementation Sequence

**Backend:**
1. Gam3eya model + migration — `models/gam3eya.py`, `models/gam3eya_payout_split.py`
2. Gam3eya service — `services/gam3eya.py` (schedule generation, contribution/payout recording, net position)
3. Gam3eya router — `routers/gam3eyas.py` (CRUD + payment + schedule endpoint)

**Frontend:**
4. Gam3eya list page — active/completed tabs, create form
5. Gam3eya detail — payment schedule calendar, contribution/payout form

**Required reading:** `02-data-models.md`, `03-features/gam3eya.md`

---

## Phase 6: Assets
**Deliverables:** Asset CRUD (6 types), transaction linking, ownership vs operating cost split, value history, auto-price fetch (gold/silver), net worth integration, value timeline chart.

### Success Criteria
- ROI computed from ownership cost only (excludes operating)
- Gold/silver auto-price updates all commodity assets
- Assets appear in net worth calculation on dashboard

### Implementation Sequence

**Backend:**
1. Asset model + migration — `models/asset.py`, `models/asset_value_history.py`
2. Gold/silver price service — `services/asset_pricing.py` (OXR or external API fetch → save to value history)
3. Asset service — `services/assets.py` (ROI computation, ownership vs operating cost split, net worth contribution)
4. Asset router — `routers/assets.py` (CRUD + valuation history + `/auto-price`)

**Frontend:**
5. Assets page — portfolio grid by type, total value, net worth contribution
6. Asset detail — value timeline chart, transaction list (maintenance, insurance, fuel), create expense form

**Required reading:** `02-data-models.md`, `03-features/assets.md`

---

## Phase 7: Budgets & Savings Goals
**Deliverables:** Budget CRUD with per-category allocations, real-time spent computation, auto-suggest, recurring budgets, rollover. Savings goal CRUD with progress tracking, account-linked auto-update.
- Category hierarchy reporting aggregation (parent category rollup in budget reports) _(deferred from Phase 1.5)_

### Success Criteria
- Budget states (under/warning/over) trigger at correct thresholds
- Auto-suggest uses 3-month spending average
- Account-linked savings goals update automatically with balance changes

### Implementation Sequence

**Backend:**
1. Budget + budget_category models + migration — `models/budget.py`
2. Savings goal model + migration — `models/savings_goal.py`
3. Budget service — `services/budgets.py` (real-time spent computation, auto-suggest, rollover logic)
4. Budget router — `routers/budgets.py` (CRUD + `/suggest` endpoint)
5. Savings goals router — `routers/savings_goals.py` (CRUD + progress update)

**Frontend:**
6. Budgets page — category progress bars (green/amber/red states), create budget form
7. Savings goals page — goal cards with progress rings, target date countdown

**Required reading:** `02-data-models.md`, `03-features/budgets.md`

---

## Phase 8: Forecasting
**Deliverables:** 12-month cash flow projection from all 9 data sources, debt payoff timelines, negative balance alerts, non-recurring expense estimation, Plotly charts (cash flow bars + debt payoff lines).

### Success Criteria
- Projection correctly aggregates recurring rules, debts, installments, Gam3eyas, P2P splits, and estimated non-recurring
- Negative months flagged with drill-down to contributing items
- Debt-free date computed correctly

### Implementation Sequence

**Backend:**
1. Recurring rules model + migration — `models/recurring_rule.py`
2. Forecasting service — `services/forecasting.py` (aggregate 9 data sources, non-recurring estimation, debt payoff timelines)
3. Scenario overlay service — `services/forecasting_scenario.py` (temporary overlay, not persisted)
4. Forecasting router — `routers/forecasting.py` (`/cash-flow`, `/debt-payoff`, `/scenarios`)

**Frontend:**
5. Forecasting page — monthly cash flow bar chart (Plotly), debt payoff timeline chart
6. Scenario panel — add/remove override assumptions, see projection change live

**Required reading:** `02-data-models.md`, `03-features/forecasting.md`

---

## Phase 9: AI Categorization
**Deliverables:** Pluggable AI provider system (Claude, OpenAI, Azure OpenAI, Ollama), categorization pipeline (rules → AI → fallback), confidence tiers, batch categorization after import, feedback loop (correction → rule), settings page.

### Success Criteria
- Rule engine handles >70% of recurring merchants after 1 month of corrections
- AI calls decrease over time as rules accumulate
- Provider switch works without data loss

### Implementation Sequence

**Backend:**
1. AI provider interface — `ai/base.py` (`AIProvider` ABC with `categorize()`, `generate_insight()`)
2. Provider implementations — `ai/claude.py`, `ai/openai.py`, `ai/azure_openai.py`, `ai/ollama.py`
3. AI router — `ai/router.py` (provider selection from household settings, fallback chain)
4. Categorization rules model + migration — `models/categorization_rule.py`
5. Rule engine service — `services/categorization/rules.py` (pattern matching, exact/contains/regex, confidence)
6. AI categorization service — `services/categorization/ai.py` (batch call, confidence tiers, feedback loop)
7. Categorization router — `routers/categorization.py` (`/batch`, `/rules` CRUD)

**Frontend:**
8. Category settings page — rule list, create rule form, edit/delete
9. Post-import categorization review — show AI suggestions with confidence badges, confirm/reject

**Required reading:** `01-architecture.md`, `03-features/categories.md`, `03-features/settings.md`

---

## Phase 10: Multi-User & Household
**Deliverables:** Household management, member invitation (email + code), 4 roles with permission enforcement, child accounts with linked-account scoping, household switcher, activity log.

### Success Criteria
- RLS enforces household isolation at database level
- Child sees only linked accounts
- Admin can invite, change roles, remove members
- Activity log tracks all mutations with user attribution

### Implementation Sequence

**Backend:**
1. Household invitation model + migration — `models/household_invitation.py` (invite_code, expires_at)
2. Child linked accounts model + migration — `models/child_linked_account.py`
3. Activity log model + migration — `models/household_activity_log.py`
4. Permission enforcement middleware — `services/permissions.py` (role-based permission checks per action)
5. Multi-user router — `routers/households.py` (invite + accept + role change + remove + activity log)
6. Household switcher service — `services/household_switcher.py`

**Frontend:**
7. Household settings page — member list, role badges, invite form, invite code display
8. Accept invitation page — landing page for invite links
9. Household switcher — top nav dropdown for users in multiple households
10. Child account scoped view — conditional sidebar filtering for child role

**Required reading:** `02-data-models.md`, `03-features/multi-user.md`

---

## Phase 11: Notifications
**Deliverables:** Notification engine with daily scheduler, deduplication, 4 channels (in-app, email, Telegram, WhatsApp placeholder), payment reminders, budget alerts, per-user preferences, quiet hours.
- APScheduler job persistence strategy (external store or queue) _(deferred from Phase 1.5)_

### Success Criteria
- Payment reminders arrive 3 days before, day of, and 1 day after due date
- Telegram bot connection flow works end-to-end
- No duplicate notifications for same event

### Implementation Sequence

**Backend:**
1. Notification + notification_delivery models (already in Phase 1 migration, enable usage here)
2. Notification service — `services/notifications/engine.py` (trigger evaluation, dedup_key generation)
3. Daily scheduler — `services/notifications/scheduler.py` (APScheduler or cron, runs all 16 trigger checks)
4. Email channel — `services/notifications/channels/email.py`
5. Telegram channel — `services/notifications/channels/telegram.py` (bot token from settings)
6. Notification preferences model + migration — `models/notification_preferences.py`
7. Notifications router — `routers/notifications.py` (list, mark read, preferences CRUD)

**Frontend:**
8. Notification bell + slide-out panel — bell badge with unread count, slide-out list
9. Notification preferences page — per-trigger, per-channel toggles, quiet hours

**Required reading:** `02-data-models.md`, `03-features/notifications.md`

---

## Phase 12: Reports & Export
**Deliverables:** 7 report types, on-screen rendering, PDF export (RTL, charts), Excel export (formatted), CSV export (BOM), async generation for large reports, Supabase Storage for files.

### Success Criteria
- PDF renders correctly in Arabic RTL with embedded Plotly charts
- Large reports generate async with notification on completion
- All report filters work correctly

### Implementation Sequence

**Backend:**
1. `report_jobs` model + migration — `models/report_job.py` (DB-backed async tracking)
2. Report generation service — `services/reports/generator.py` (7 report types, SQL aggregations)
3. PDF renderer — `services/reports/pdf.py` (WeasyPrint or ReportLab, RTL, embedded charts)
4. Excel renderer — `services/reports/excel.py` (openpyxl, formatted headers, currency formatting)
5. CSV renderer — `services/reports/csv.py` (UTF-8 BOM)
6. Supabase Storage integration — `services/storage.py` (upload, expiring URLs)
7. Reports router — `routers/reports.py` (`/generate`, `/jobs/{id}`, `/download/{id}`)

**Frontend:**
8. Reports page — report type tile grid, filter form, generate button
9. Job status polling — poll `/jobs/{id}` until completed, show download button

**Required reading:** `02-data-models.md`, `03-features/reports.md`

---

## Phase 13: Settings & Polish
**Deliverables:** All settings pages (10 pages), onboarding wizard, data export/import, danger zone operations, subscription/billing page, UI polish pass.

### Success Criteria
- All settings persist correctly and sync across devices
- Onboarding wizard completes in under 3 minutes
- Danger zone operations require proper confirmation

### Implementation Sequence

**Backend:**
1. Settings router — `routers/settings.py` (`GET /api/v1/settings`, `PUT /api/v1/settings/{key}`, bulk update)
2. Data export endpoint — `GET /api/v1/settings/export` (returns ZIP with CSV of all tables)
3. Data import endpoint — `POST /api/v1/settings/import` (restore from ZIP)
4. Account deletion endpoint — `DELETE /api/v1/settings/account` (cascade soft delete all household data)
5. Exchange rates router — `routers/exchange_rates.py` (OXR fetch, manual entry, `/latest`)

**Frontend:**
6. Onboarding wizard — 4-step flow: household name → base currency → first account → first transaction
7. Settings shell — sidebar with 10 pages (AI, Locale, Notifications, People, Categories, Data, Household, Subscription, Exchange Rates)
8. AI settings page — provider selector, API key input, model dropdown, test connection
9. Locale settings page — language, calendar, number format, numeral system
10. Data & billing page — export buttons, subscription details, danger zone

**Required reading:** `03-features/settings.md`, `03-features/exchange-rates.md`, `04-user-flows.md`

---

## Phases 14–20: Premium & Future Features
Delivered after core platform is stable. Each is independent — order can shift based on user demand.

| Phase | Key Dependency | Premium Gate |
|-------|---------------|-------------|
| 14. Scanned PDF OCR | Landing AI API key | Yes — premium only |
| 15. Receipt Scanning | AI provider configured | Yes — premium only |
| 16. Subscription Tracking | Transaction history (Phase 1) | No — free feature |
| 17. Telegram/WhatsApp Bot | Notification system (Phase 11) | Partial — basic free, advanced premium |
| 18. Islamic Finance Mode | Categories + assets (Phases 1, 6) | No — free feature |
| 19. Scenario Planning | Forecasting (Phase 8) | Yes — premium only |
| 20. Mobile PWA | All frontend phases | No — free feature |

### Phase 14 — Scanned PDF OCR
**Sequence:** 1) Add Landing AI client to `services/import/pdf_ocr.py`  2) Extend import pipeline to detect scanned PDFs (pdfplumber returns empty text → route to OCR)  3) Add OCR credit tracking to `app_settings`  4) Gate behind premium check in import endpoint

**Required reading:** `03-features/import.md`, `03-features/settings.md`

### Phase 15 — Receipt Scanning
**Sequence:** 1) Add `parse_receipt()` to AI provider interface and implementations  2) Build receipt upload endpoint `POST /api/v1/receipts/parse`  3) Supabase Storage bucket for receipt images  4) Frontend: camera/upload receipt flow → pre-filled transaction form

**Required reading:** `03-features/receipts.md`, `01-architecture.md`

### Phase 16 — Subscription Tracking
**Sequence:** 1) Subscription detection service (scan transactions for recurring charges by merchant + amount + interval)  2) API endpoint `GET /api/v1/subscriptions/detected`  3) Allow user to promote a detected subscription to a recurring rule  4) Frontend: subscriptions card on dashboard or dedicated settings page

**Required reading:** `03-features/transactions.md`, `03-features/forecasting.md`

### Phase 17 — Telegram/WhatsApp Bot
**Sequence:** 1) Extend Telegram channel to support inbound messages (webhook)  2) Bot command handlers: `/balance`, `/add <amount> <description>`, `/report`  3) Intent parsing service (NLP or structured command)  4) WhatsApp via Twilio or WhatsApp Business API (webhook)

**Required reading:** `03-features/notifications.md`

### Phase 18 — Islamic Finance Mode
**Sequence:** 1) Add Zakat calculation service (`services/zakat.py` — nisab threshold, eligible assets)  2) Shariah compliance tag on categories and transactions  3) Zakat report (special report type)  4) Frontend: Zakat calculator page in settings, compliance badge on transaction list

**Required reading:** `03-features/assets.md`, `03-features/categories.md`

### Phase 19 — Scenario Planning
**Sequence:** 1) Extend forecasting service with scenario overlay params  2) Scenario storage model (household-scoped, not affecting real forecast)  3) Frontend: scenario builder UI, side-by-side comparison chart

**Required reading:** `03-features/forecasting.md`

### Phase 20 — Mobile PWA
**Sequence:** 1) `next-pwa` configuration, service worker, app manifest  2) Responsive layout audit across all pages  3) Touch-optimized interactions (swipe to delete, bottom sheet forms)  4) Offline read mode (TanStack Query cache + service worker)

**Required reading:** `03-features/dashboard.md`, `04-user-flows.md`, `guides/09-design-tokens.md`

---

## Dependency Graph

```
Phase 1 (Foundation) ✅
  └── Phase 1.5 (Gap Remediation & Polish) ✅
        └── Phase 1.75 (Design System & Page Redesign) ✅
              ├── Phase 2 (Import) ✅
              ├── Phase 3 (Debts) ✅
              │     └── Phase 3.5 (UX Polish Sprint) 🔨 ← YOU ARE HERE
              │           └── Phase 4 (Dashboard & Charts)
              │                 └── Phase 8 (Forecasting) ←── also needs Phase 5, 7
              ├── Phase 5 (Gam3eya)
              ├── Phase 6 (Assets)
              ├── Phase 7 (Budgets)
              ├── Phase 9 (AI Categorization)
              ├── Phase 10 (Multi-User)
              │     └── Phase 11 (Notifications)
              ├── Phase 12 (Reports) ←── benefits from all data phases
              └── Phase 13 (Settings)

Phase 14–20: independent, after core stable
```

## Milestone Mapping

| Milestone | Phases | Outcome |
|-----------|--------|---------|
| **v1.0 — Core** | 1, 1.5, 1.75, 2, 3, 3.5, 4 | Usable single-user finance tracker with import and dashboard |
| **v1.1 — Egyptian Features** | 5–6 | Gam3eya + assets = distinctly MENA product |
| **v1.2 — Smart Money** | 7–9 | Budgets + forecasting + AI = intelligent finance tool |
| **v1.3 — Family Platform** | 10–11 | Multi-user + notifications = household product, SaaS-ready |
| **v1.4 — Complete Product** | 12–13 | Reports + settings + polish = production-grade |
| **v2.0 — Premium** | 14–20 | OCR, receipts, bots, Islamic finance = differentiated platform |
