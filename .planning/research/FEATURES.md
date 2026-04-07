# Feature Landscape

**Domain:** AI-powered personal finance platform (Egypt/MENA)
**Researched:** 2026-04-07
**Scope:** Features needed for Phases 4-12+ (beyond existing Phases 1-3.8)

## Table Stakes

Features users expect from a personal finance app. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Dashboard with spending charts | Every finance app has this. Users need visual summary at a glance. | Medium | Plotly charts, stat cards, period comparison. Drives daily engagement. |
| Budget tracking | Core PFM feature. Users want to set limits and see progress. | Medium | Envelope budgeting with category-level limits. Must handle multi-currency. |
| Spending by category report | Users need to know "where does my money go?" | Low | Pie/bar chart. Depends on good categorization. |
| Income vs expenses report | Basic financial health indicator. | Low | Monthly comparison chart with trend line. |
| Transaction search & filter | Already built (Phase 1). Validate it works well. | Done | Existing feature. |
| Export to CSV | Users expect to download their data. | Low | Built-in Python csv module. No library needed. |
| Bill reminders / notifications | Users forget due dates. MENA market has many installment plans. | Medium | Needs scheduling (APScheduler) + delivery channel. |
| Mobile-friendly layout | 70%+ MENA users are mobile-first. | Medium | Already responsive. PWA takes it further. |

## Differentiators

Features that set Masareef apart. Not expected in generic PFM apps, but valued by MENA users.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI transaction categorization | Auto-categorize bank statement imports. No manual tagging. | High | litellm + instructor pipeline. Multi-provider for cost optimization. |
| Gam3eya (rotating savings) | No existing app tracks this. Extremely common in Egypt. | Medium | Custom data model, payment scheduling, payout tracking. |
| Multi-currency with MENA currencies | Track EGP, USD, SAR, AED, KWD in one place. Real exchange rates. | Medium | Already partially built. Needs dashboard aggregation. |
| Arabic-first RTL interface | Most finance apps are English-first with bad Arabic translations. | Done | Already built and validated through Phase 3.8. |
| Debt/installment management | Track CC installments, store financing, P2P loans in one place. | Done | Built in Phase 3. Needs dashboard integration. |
| Household multi-user | Family finance tracking with roles (parent, spouse, child). | High | Data model exists (household_id). Needs invitation flow, role-based access, activity log. |
| 12-month cash flow forecast | Project future balance considering recurring transactions, debts, gam3eya. | High | Time-series projection. Needs good recurring transaction detection. |
| Telegram bot for expense logging | Log expenses via chat message. Common UX pattern in MENA. | Medium | python-telegram-bot webhook. Natural language parsing. |
| PDF reports with Arabic | Professional financial reports exportable as PDF. | Medium | WeasyPrint with RTL templates. 7 report types planned. |
| Asset tracking | Track car, property, gold values alongside liquid assets. | Medium | Valuation history, cost of ownership, net worth inclusion. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Open Banking API integration | No Egyptian open banking standard exists. Would be vapor-ware. | Manual import (CSV/Excel/PDF) which is already built. |
| Crypto/DeFi tracking | Not relevant to target MENA audience. Adds complexity. | Out of scope permanently. |
| Native mobile app | PWA covers 90% of mobile needs without App Store overhead. | Serwist PWA with offline support. |
| Real-time stock price feeds | Finance app, not trading platform. Asset values are manually updated. | Manual asset valuation with optional refresh. |
| Social features / leaderboards | Privacy-sensitive financial data should not be social. | Keep household-scoped. No public profiles. |
| AI financial advice | Regulatory risk. "This is not financial advice" disclaimers are insufficient. | AI categorization only. No recommendations. |

## Feature Dependencies

```
Dashboard Charts --> Needs: accounts, transactions, categories (all exist)
Budgets --> Needs: categories, transactions (exist)
Forecasting --> Needs: recurring transaction detection, debts, budgets
AI Categorization --> Needs: categories, transactions, import pipeline (all exist)
Notifications --> Needs: budgets (for alerts), debts (for reminders), scheduling
Reports/Export --> Needs: all data models, charts for PDF embedding
Multi-User --> Needs: household model (exists), invitation system, role permissions
Telegram Bot --> Needs: auth system, transaction creation API (exists)
PWA --> Needs: working frontend (exists), can be added any time
Gam3eya --> Needs: accounts, transactions (exist), standalone feature
Asset Tracking --> Needs: accounts (exist), standalone feature
```

## MVP Recommendation

For MVP launch (getting real users), prioritize in this order:

1. **Dashboard & Charts** -- daily engagement hook, makes the app feel alive
2. **AI Categorization** -- reduces friction of imported transactions sitting uncategorized
3. **Budgets** -- core PFM feature users expect
4. **Gam3eya** -- key differentiator for Egyptian market
5. **Notifications (basic)** -- bill reminders, budget alerts via in-app + email
6. **Reports & Export** -- users need to get their data out

**Defer to post-MVP:**
- Forecasting: Complex, needs good data foundation first
- Multi-User: High complexity, can launch as single-user first
- Telegram Bot: Nice-to-have, not blocking launch
- PWA: Enhancement, responsive web works for MVP
- Asset Tracking: Niche feature, defer until user demand confirms
