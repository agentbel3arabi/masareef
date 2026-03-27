# Masareef (مصاريف) — Product Overview

## What This Is

Masareef is an AI-powered personal finance platform built for Egyptian and MENA users. It replaces complex Google Sheets setups with automated bank statement import, intelligent transaction categorization, debt and installment management, asset tracking, and 12-month cash flow forecasting.

The product is designed for power users who manage multiple currencies, track installment plans, participate in Gam3eyas (rotating savings clubs), and need full Arabic RTL support — none of which mainstream Western finance apps provide.

## The Problem

Egyptian and MENA users have no serious personal finance tool. The landscape:

- **Western apps** (YNAB, Monarch Money, Copilot) have zero Arabic support, no EGP awareness, no installment culture, no Gam3eya, and depend on bank sync APIs (Plaid) that don't exist in Egypt.
- **Arabic apps** (Masareefy) are mobile-only with basic features — no import, no forecasting, no debt tracking, no multi-user.
- **Self-hosted tools** (Firefly III, Actual Budget) have no Arabic/RTL support and assume Western financial patterns.
- **Google Sheets** is what power users actually use — flexible but fragile, unshareable, and impossible to scale.

**No product exists that combines:** Arabic-first UX + manual bank import (PDF/CSV) + installment/debt tracking + multi-currency + AI categorization + family finance + asset management.

## Who It's For

### Primary Persona: The Egyptian Power User
- Ages 25–45, manages household finances
- Uses 2–4 bank accounts + credit cards across EGP/USD/SAR
- Has active installment plans (phone, appliances, furniture — interest-free is cultural norm)
- Participates in at least one Gam3eya
- Downloads bank statements manually (PDF or CSV)
- Wants visibility into "where does my money actually go?"

### Secondary Persona: The MENA Family
- Household with shared finances (joint accounts, shared Gam3eya, P2P debts between relatives)
- Needs role-based access (admin, spouse, child, extended family)
- Culturally sensitive P2P debt tracking (who owes whom is private)

### Tertiary Persona: The Expat / Multi-Currency User
- Egyptian working in Gulf (SAR/AED income, EGP expenses)
- Needs real-time FX conversion and unified net worth across currencies
- Tracks gold/real estate as wealth stores against EGP devaluation

## Goals

1. **Be the default finance app for Arabic-speaking users** — the first product that treats Arabic, RTL, and MENA financial patterns as first-class, not afterthoughts.
2. **Make bank statement import feel like bank sync** — auto-detect bank, auto-parse, auto-categorize. Three clicks from PDF to categorized transactions.
3. **Enable household finance management** — multi-user with role-based access, shared budgets, family Gam3eyas, and P2P debt tracking. This is the SaaS unlock.
4. **Track the full financial picture** — accounts, debts, installments, financing apps (ValU, Souhoola, Sympl, etc.), assets (gold, real estate, vehicles), recurring expenses, and forecasted cash flow in one place.
5. **Monetize via freemium SaaS** — free tier for individuals, paid tier for households and premium features (AI categorization, advanced reports, unlimited import).

## Non-Goals

- **Not a bank.** No money movement, no payments, no card issuance. Read-only financial tracking.
- **Not an investment platform.** Asset tracking (gold, real estate) for net worth visibility, not trading or portfolio optimization.
- **Not Open Banking dependent.** Designed for manual import markets. If Egyptian banks eventually expose APIs, we integrate — but we never depend on it.
- **Not AI-first.** AI enhances (categorization, insights, receipt scanning) but the app must be fully functional with AI disabled or unavailable.
- **Not a replacement for accounting software.** Personal and household finance only. No invoicing, no tax filing, no business P&L.

## Design Principles

### 1. Arabic First, English Always
Every screen is designed for Arabic RTL first, then verified in English LTR. Arabic is the primary experience, not a translation. Typography, layout flow, number formatting, and date display are all Arabic-native.

### 2. Import is the Onramp
The first experience is importing a bank statement. If import fails or confuses, the user leaves forever. Auto-detect bank, auto-map columns, auto-categorize, confirm in 3 clicks. See [06-research.md](./06-research.md) for competitor feature gaps that validate this approach.

### 3. Numbers Speak Louder
Financial data must be scannable in under 2 seconds. Large prominent numbers, semantic color coding (green = income, red = expense, amber = warning). Every screen answers "how much?" before "what?" or "why?".

### 4. Family Without Friction
Multi-user respects MENA family dynamics — shared visibility where wanted, privacy where needed. Spouse sees joint accounts but not personal ones. Parents oversee children without micromanaging.

### 5. Offline Confidence
Core operations (view balances, add transactions, browse history) work without internet. Data syncs when connection returns. Unreliable connectivity should never block basic usage.

### 6. Smart Defaults, No Walls
Works beautifully out of the box with zero configuration. AI fills categories, recurring rules auto-detect, budgets suggest themselves. Every default is overridable for power users.

### 7. Privacy as Architecture
Privacy is structural, not a toggle. Supabase Row Level Security scopes every query to the authenticated user's household. Zero telemetry by default. P2P debt data has additional access controls.

### 8. Delight in the Details
Smooth animations on balance changes, celebration on debt payoff, streak badges for daily logging, satisfying micro-interactions. Finance apps are boring — this one isn't.

## Competitive Position

Masareef occupies a **blue ocean**: the intersection of Arabic-first UX, manual-import markets, and MENA financial patterns. No existing product covers this space.

| Dimension | Masareef | YNAB | Monarch | Firefly III | Masareefy |
|-----------|---------|------|---------|-------------|-----------|
| Arabic RTL | Native | No | No | Partial | Native |
| Multi-currency | Core feature | Single only | Limited | Yes | Basic |
| Bank import (no API) | PDF + CSV + AI | No | No | CSV only | No |
| Installment tracking | First-class | No | No | No | No |
| BNPL / Financing apps | Built-in (ValU, Souhoola, etc.) | No | No | No | No |
| Gam3eya | Built-in | No | No | No | No |
| Asset management | Yes | No | No | No | No |
| AI categorization | Multi-provider | No | Basic | ML rules | No |
| Family multi-user | Role-based | Shared login | Household | Unlimited | No |
| Pricing | Freemium SaaS | $109/yr | $99/yr | Free (self-host) | Free |

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+ (App Router), TypeScript, shadcn/ui, Tailwind CSS v4 |
| Charts | Plotly (react-plotly.js) |
| Backend | FastAPI (Python) |
| ORM | SQLAlchemy 2.0 + Alembic |
| Validation | Pydantic v2 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| File Storage | Supabase Storage |
| Real-time | Supabase Realtime |
| AI Providers | Claude (Anthropic), OpenAI, Azure OpenAI, Ollama |
| Import | pandas, openpyxl, pdfplumber, chardet |
| Testing | pytest + Playwright (Python) |
| Deployment | Docker Compose (FastAPI + Next.js) |

> Full architecture details in [01-architecture.md](./01-architecture.md).
> Data models in [02-data-models.md](./02-data-models.md).
> Individual feature specs in [03-features/](./03-features/).
> UI reference designs in [stitch-designs/](./stitch-designs/) — 32 screens with screenshots and HTML code. See [CLAUDE.md](./CLAUDE.md) for usage rules and canonical design tokens.
