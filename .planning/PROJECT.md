# Masareef (مصاريف)

## What This Is

An AI-powered personal finance platform for Egyptian/MENA users. Built with FastAPI (Python 3.12), Next.js 16, and Supabase (PostgreSQL). Combines Arabic-first bank statement import, multi-currency tracking, debt/installment management, Gam3eya (rotating savings), asset tracking, budgeting, 12-month forecasting, and household multi-user support — features no existing product brings together for this market.

## Core Value

Users can track all their money — across accounts, currencies, debts, and household members — in one Arabic-first platform that understands Egyptian financial patterns.

## Requirements

### Validated

- ✓ Account CRUD (bank, credit card, cash, digital wallet, financing app) with balance computation — Phase 1
- ✓ Transaction CRUD with splits, search, filtering, bulk operations — Phase 1
- ✓ Transfer creation (same-currency and cross-currency with FX) — Phase 1
- ✓ Category system (18 predefined + custom CRUD) — Phase 1
- ✓ Supabase Auth integration (sign-up, login, JWT, household creation) — Phase 1
- ✓ Next.js frontend with RTL Arabic-first layout, dark mode, i18n — Phase 1
- ✓ Bank statement import pipeline with template system (PDF/Excel/CSV) — Phase 2
- ✓ Debt management (loans, P2P, CC installments, store plans, amortization) — Phase 3
- ✓ UX polish (critical bug fixes, form consistency, date standardization) — Phase 3.5
- ✓ Accessibility, mobile layout, form fixes, dashboard widgets, command palette — Phase 3.75
- ✓ Financial institutions directory, account-bank grouping, system categories — Phase 3.8

### Active

- ✓ Codebase stabilization — bug fixes, tech debt cleanup, refactor, test coverage — Phase 01
- [ ] Dashboard & Charts — Plotly visualizations, spending insights, stat cards
- [ ] Gam3eya — rotating savings clubs with payment scheduling
- [ ] Asset tracking — valuation, transaction linking, cost of ownership
- [ ] Budgets & Savings Goals — envelope budgeting, savings targets
- [ ] Forecasting — 12-month cash flow projection, debt payoff estimation
- [ ] AI Categorization — multi-provider AI, rule engine, feedback loop
- [ ] Multi-User & Household — roles, invitations, child accounts, activity log
- [ ] Notifications — bill reminders, budget alerts, Telegram bot, email
- [ ] Reports & Export — 7 report types, PDF/Excel/CSV export
- [ ] Settings & Polish — settings pages, locale, data management, onboarding wizard
- [ ] Scanned PDF import (Premium) — AI OCR for scanned bank statements
- [ ] Receipt Scanning — camera/upload OCR, transaction auto-create
- [ ] Subscription Tracking — auto-detect recurring charges, renewal reminders
- [ ] Telegram/WhatsApp Bot — expense logging via chat, balance queries
- [ ] Islamic Finance Mode — Zakat calculation, Shariah compliance tagging
- [ ] Scenario Planning — what-if forecasting simulations
- [ ] Mobile App (PWA) — progressive web app for native-like mobile

### Out of Scope

- Native mobile app (iOS/Android) — PWA-first strategy, native deferred indefinitely
- Open Banking API integration — no Egyptian open banking standard exists yet
- Crypto/DeFi tracking — not relevant to target audience
- Business/enterprise accounting — personal/household focus only

## Context

- **Market:** No Arabic-first personal finance app combines these features for Egypt/MENA
- **Stack:** FastAPI + Next.js 16 + Supabase monorepo, Docker deployment with Traefik reverse proxy
- **Existing code:** ~8 phases complete (1 through 3.8 + Phase 01 stabilization), 12 backend routers, 16 SQLAlchemy models, full RTL frontend
- **Known issues:** Backlog items reduced after Phase 01 cleanup (BL-027/028/029/032 closed), frontend test infrastructure established, RBAC enforced on all mutation endpoints
- **Target:** MVP launch — enough features and stability to onboard real users
- **Design:** 32 Stitch design screens exist as HTML + PNG reference, design tokens defined

## Constraints

- **Tech stack**: FastAPI (Python 3.12) + Next.js 16 (App Router) + Supabase — locked, all architecture decisions in `docs/01-architecture.md`
- **Money**: All amounts in BIGINT minor units, never floats — non-negotiable
- **i18n**: Arabic-first RTL, CSS logical properties only (no `pl-`, `pr-`, `left-`, `right-`)
- **Data**: Household-scoped multi-tenancy, soft deletes only, RLS + application-layer enforcement
- **Frontend**: shadcn/ui (base-nova), Tailwind v4, TanStack Query, react-plotly.js for charts, next-intl for i18n
- **Backend**: Async-first (async def), Pydantic V2 (model_dump only), uv for deps, no pip/Poetry

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Stabilization phase before new features | User wants to fix bugs, tech debt, and incomplete features before adding more — foundation quality matters | ✓ Complete (Phase 01) |
| Dashboard & Charts as first new feature post-stabilization | Daily engagement hook — visual spending insights drive user retention | — Pending |
| MVP launch as project goal | Ship enough to get real users (roughly through Phase 8), iterate from feedback | — Pending |
| All remaining phases managed by GSD | Full roadmap (stabilization + phases 4–20) tracked in GSD for structured execution | — Pending |
| Phase 3.8 confirmed complete | Merged PR exists (`feat: Phase 3.8`), UAT report written — roadmap status was stale | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-07 after Phase 01 (stabilization) completion*
