# Project Research Summary

**Project:** Masareef
**Domain:** AI-powered personal finance platform (Egypt/MENA)
**Researched:** 2026-04-07
**Confidence:** HIGH

## Executive Summary

Masareef is a well-understood product type — a personal finance manager (PFM) — but built for a market with meaningfully different requirements: Egyptian/MENA users who track multi-currency balances, rotating savings groups (Gam3eya), store installment plans, and import Arabic bank statements. The core technical stack (FastAPI, Next.js 16, Supabase, SQLAlchemy async) is locked and validated through Phase 3.8. The remaining work (Phases 4-12+) is additive: dashboard visualization, AI categorization, budgets, notifications, reports, multi-user, forecasting, Telegram integration, and PWA. Research confirms the recommended library choices for each of these areas with high confidence.

The recommended build order prioritizes daily engagement first. A dashboard with Plotly charts makes the app feel alive and drives retention; AI categorization removes the friction of uncategorized imports; budgets satisfy the core PFM expectation. Gam3eya is the highest-value Egypt-specific differentiator and should ship before multi-user or forecasting, which are complex and can wait. Notifications and reports complete the launch-readiness picture. Multi-user, forecasting, Telegram bot, and PWA are post-MVP quality-of-life features.

The three highest-risk areas are bundle size from Plotly (critical to lazy-load and use plotly.js-dist, not plotly.js), LLM cost spiral without a rules engine (rules must come first — target 80%+ coverage before any LLM call), and WeasyPrint Arabic rendering quality in PDF reports (validate early with real bank statement data, not at release time). APScheduler's multi-worker duplicate-job problem is also serious and requires running a single scheduler worker. All four are preventable with disciplined architecture — none require technology changes.

## Key Findings

### Recommended Stack

The existing stack requires no changes. New capabilities in Phases 4-12 are served by targeted library additions. For charts, react-plotly.js (2.6.0) with plotly.js-dist (2.35.x) is mandated by CLAUDE.md and validated as the right choice for financial visualization with RTL support. For AI categorization, litellm (1.82.x) provides multi-provider LLM routing and instructor (1.7.x) provides Pydantic V2 structured output extraction — together they give provider flexibility and validated Pydantic model returns. For notifications, Resend (2.27.0) covers email and python-telegram-bot (22.7) covers Telegram in webhook mode. WeasyPrint (68.1) renders server-side Arabic RTL PDF reports via Jinja2 HTML templates, and XlsxWriter (3.2.9) handles Excel report writes (openpyxl already exists for reading imports). Serwist (9.5.7 with @serwist/next) is the maintained successor to next-pwa and is the only viable PWA option for Next.js 16 + Turbopack. APScheduler 3.10.4 (not 4.x — still alpha) runs cron jobs in FastAPI's event loop.

**Core technologies added:**
- react-plotly.js + plotly.js-dist: interactive financial charts — only RTL-capable chart library, mandated by CLAUDE.md
- litellm + instructor: AI categorization pipeline — provider-agnostic routing + Pydantic-validated structured outputs
- Resend: transactional email — simplest async-compatible option, good deliverability, generous free tier
- python-telegram-bot 22.7: Telegram expense logging — async-native, webhook mode integrates cleanly with FastAPI
- WeasyPrint 68.1: server-side PDF with Arabic RTL — HTML/CSS templating dramatically faster to develop than programmatic APIs
- XlsxWriter 3.2.9: Excel report generation — 3-5x faster than openpyxl for write-only workloads
- @serwist/next 9.5.7: PWA service worker — only maintained option compatible with Next.js 16 Turbopack
- APScheduler 3.10.4: recurring cron jobs — use v3, not v4 (v4 is still alpha as of Apr 2026)

### Expected Features

Features research is grounded in competitive analysis and MENA market behavior. The existing features (accounts, transactions, transfers, import, categories, debts, installments, Gam3eya model, financial institutions) form a complete foundation. What remains is the analytics, automation, and notification layer.

**Must have (table stakes):**
- Dashboard with spending charts — daily engagement hook, makes the app feel alive
- Budget tracking — core PFM feature with category-level limits, multi-currency aware
- Spending by category report — "where does my money go?" with pie/bar chart
- Income vs. expenses trend report — basic financial health indicator
- CSV export — users expect to download their own data
- Bill reminders and notifications — critical for MENA market with many installment plans
- Mobile-friendly layout — 70%+ MENA users are mobile-first (already responsive)

**Should have (differentiators):**
- AI transaction categorization — auto-categorize imports, no manual tagging (major friction reduction)
- Gam3eya tracking — no competing app does this; extremely common in Egypt
- Household multi-user with roles — family finance with parent/spouse/child access
- 12-month cash flow forecast — project future balance with recurring transactions and debts
- Telegram bot for expense logging — common UX pattern in MENA
- PDF reports with Arabic RTL — professional exportable reports that render correctly in Arabic
- Asset tracking — car, property, gold alongside liquid assets for true net worth

**Defer to post-MVP (v2+):**
- Forecasting — complex, requires solid recurring transaction detection; build data foundation first
- Multi-user — high complexity, launch as single-user first
- Telegram bot — nice-to-have, not blocking launch
- PWA — enhancement over responsive web, not MVP blocker
- Asset tracking — niche, defer until user demand confirms it

**Anti-features (explicitly not building):**
- Open Banking API — no Egyptian standard exists
- Crypto/DeFi tracking — out of scope
- Native mobile app — PWA covers 90% of mobile needs
- AI financial advice — regulatory risk

### Architecture Approach

The core architecture (FastAPI async, Supabase RLS, Next.js App Router, household-scoped multi-tenancy) is unchanged. New phases extend it with seven new components: an AI Categorization Service (rules engine first, LLM fallback), an AI Rule Engine (stores and applies confirmed merchant rules), a Notification Scheduler (APScheduler in FastAPI event loop), a Notification Dispatcher (Resend/Telegram/Supabase Realtime fan-out), a Report Generator (Jinja2 + WeasyPrint + XlsxWriter), a Telegram Bot Handler (webhook endpoint), and a Chart Data Aggregator (server-side SQL GROUP BY for dashboard endpoints). A critical architectural principle throughout: compute aggregations on the server using SQL — never send raw transactions to the client for client-side computation.

**Major components:**
1. AI Categorization Service — three-tier pipeline: rules match first, LLM classify on miss, user feedback creates new rule
2. Notification Dispatcher — event-driven fan-out to in-app (Supabase Realtime), email (Resend), Telegram
3. Report Generator — Jinja2 HTML templates rendered to PDF via WeasyPrint, direct XlsxWriter for Excel
4. Chart Data Aggregator — dedicated `/api/v1/dashboard/*` endpoints returning pre-aggregated chart-ready data
5. Telegram Bot Handler — webhook endpoint in FastAPI, processes natural language expense entries
6. PWA Service Worker — Serwist with StaleWhileRevalidate for reads, network-first for mutations

### Critical Pitfalls

1. **Plotly bundle size explosion** — use plotly.js-dist (not plotly.js), lazy-load via next/dynamic with ssr:false, check pnpm build output for chunks >500KB
2. **LLM cost spiral without rules layer** — build the rules engine before any LLM integration; target 80%+ rule-match rate; track llm_calls_per_import metric
3. **WeasyPrint Arabic rendering bugs** — test with real Arabic bank statement data early; use Noto Sans Arabic font; test mixed Arabic/English content ("مشتريات UBER 150 EGP")
4. **APScheduler duplicate jobs in multi-worker** — run Uvicorn with --workers 1 for the scheduler process, or use PostgresJobStore for shared state
5. **Dashboard N+1 queries** — use SQL GROUP BY with SUM/COUNT; one query per dashboard widget; enable SQL echo in dev and fail any dashboard endpoint generating >5 queries

## Implications for Roadmap

### Phase 4: Dashboard & Charts
**Rationale:** Highest daily engagement value; all dependencies (accounts, transactions, categories) already exist. Makes the app feel complete and alive.
**Delivers:** Plotly-powered dashboard with net worth, spending by category, income vs. expenses trend, upcoming bills
**Addresses:** Dashboard with spending charts, income vs. expenses report (table stakes)
**Uses:** react-plotly.js + plotly.js-dist, dedicated `/api/v1/dashboard/*` aggregation endpoints
**Avoids:** Pitfall 1 (bundle size) via lazy-load; Pitfall 5 (N+1 queries) via SQL aggregation
**Research flag:** Standard patterns — skip research phase

### Phase 5: AI Transaction Categorization
**Rationale:** Imports are live but transactions sit uncategorized. AI categorization eliminates the biggest post-import friction point. Must come after dashboard (which visualizes category data) to immediately show the value of good categorization.
**Delivers:** Rules engine + LLM fallback pipeline, user correction feedback loop, categorization_rules table
**Addresses:** AI categorization differentiator
**Uses:** litellm + instructor, BackgroundTasks
**Avoids:** Pitfall 2 (cost spiral) by building rules engine first; Pitfall 13 (retry loops) by setting max_retries=2
**Research flag:** Needs research — LLM cost modeling and rules engine schema design need upfront thought

### Phase 6: Budgets
**Rationale:** Core PFM table stake. Requires good categorization (Phase 5) to be useful. Also creates the event source for budget-threshold notifications in Phase 7.
**Delivers:** Category-level budget limits with multi-currency handling, budget vs. actual charts, budget period management
**Addresses:** Budget tracking (table stakes)
**Avoids:** Pitfall 10 (multi-currency aggregation) by showing per-currency budget limits
**Research flag:** Standard patterns — skip research phase

### Phase 7: Notifications
**Rationale:** Budget alerts (needs Phase 6), bill reminders (needs existing debt/installment data), gam3eya payment reminders. Event-driven wiring of events already happening in the system.
**Delivers:** In-app notifications (Supabase Realtime), email (Resend), per-user channel preferences, scheduled bill reminders
**Addresses:** Bill reminders / notifications (table stakes)
**Uses:** APScheduler 3.10.4, Resend, Notification Dispatcher
**Avoids:** Pitfall 4 (duplicate sends) via single scheduler worker; Pitfall 8 (email deliverability) via Resend + DKIM/SPF
**Research flag:** Standard patterns — skip research phase

### Phase 8: Reports & Export
**Rationale:** Users need data portability. PDF reports are the last table-stakes feature before launch. Validate Arabic rendering in isolation — issues here should not delay anything else.
**Delivers:** CSV export, Excel export (XlsxWriter), 7 PDF report types with Arabic RTL (WeasyPrint), async large-report generation
**Addresses:** Export to CSV, PDF reports with Arabic
**Uses:** WeasyPrint 68.1, XlsxWriter 3.2.9, Jinja2 templates, StreamingResponse
**Avoids:** Pitfall 3 (Arabic rendering bugs) by testing with real bank data early; Pitfall 11 (XlsxWriter memory) via constant_memory mode
**Research flag:** Needs research — WeasyPrint Arabic complex table rendering needs prototype validation before committing to full scope

### Phase 9: Gam3eya (Full Feature)
**Rationale:** Data model exists but needs a dedicated phase for scheduling, payout tracking, and payment reminders. Key differentiator for Egyptian market — no competing app has this. Launch before multi-user to have a unique story.
**Delivers:** Gam3eya round management, payment scheduling, payout tracking, integration with notifications (Phase 7)
**Addresses:** Gam3eya differentiator
**Research flag:** Standard patterns — custom domain logic, no external dependencies to research

### Phase 10: Multi-User & Household
**Rationale:** High complexity — invitation flow, role-based access, activity log, permission checks on every endpoint. All data is already household-scoped. Defer until single-user experience is polished.
**Delivers:** Household invitation system, role management (owner/member), activity log, per-user notification preferences
**Addresses:** Household multi-user differentiator
**Avoids:** Permission escalation by server-side role checks on every endpoint
**Research flag:** Needs research — invitation flow UX and role permission matrix need design research; MENA family finance dynamics differ from Western PFM assumptions

### Phase 11: Forecasting
**Rationale:** Requires good transaction history and recurring transaction detection — only meaningful after 6+ months of user data. Benefits from budgets (Phase 6) as an input.
**Delivers:** 12-month cash flow projection, recurring transaction detection, debt/gam3eya schedule integration
**Addresses:** 12-month cash flow forecast differentiator
**Avoids:** Stale exchange rate pitfall by refreshing rates before forecast computation
**Research flag:** Needs research — recurring transaction detection algorithm is non-trivial; research time-series vs. rule-based approaches at 100-1000 user scale

### Phase 12: Telegram Bot
**Rationale:** Nice-to-have differentiator. Stable auth and transaction API already exist. Adds a new expense entry channel without changing existing flows.
**Delivers:** Telegram bot for expense logging via natural language, webhook endpoint, account/category selection via bot UI
**Addresses:** Telegram bot differentiator
**Uses:** python-telegram-bot 22.7, webhook mode in FastAPI
**Avoids:** Pitfall 6 (webhook injection) via X-Telegram-Bot-Api-Secret-Token verification
**Research flag:** Standard patterns — well-documented webhook integration

### Phase 13: PWA
**Rationale:** Enhancement, not a feature. Best done after core feature set is stable — service worker caching of an in-flux app creates confusion.
**Delivers:** Offline read access to dashboard, add-to-home-screen, push notifications foundation
**Uses:** @serwist/next 9.5.7, manifest.json with Arabic app name
**Avoids:** Pitfall 9 (install prompt fatigue) by deferring prompt to 3rd visit
**Research flag:** Standard patterns — Serwist docs are thorough, cache strategies are well-established

### Phase Ordering Rationale

- Dashboard first: zero missing dependencies, highest daily engagement, makes app feel complete
- AI categorization before budgets: categorized data makes budget analysis meaningful
- Notifications after budgets: budget threshold exceeded is the most important notification trigger
- Reports in isolation: Arabic rendering issues should not block other phases
- Gam3eya before multi-user: unique market story at launch without multi-user complexity
- Multi-user and forecasting late: highest complexity, require stable data foundation
- Telegram and PWA last: enhancements to an already-functional product

### Research Flags

Phases needing `/gsd-research-phase` during planning:
- **Phase 5 (AI Categorization):** LLM cost modeling with real Egyptian transaction volumes; rules engine schema design
- **Phase 8 (Reports):** WeasyPrint Arabic rendering with complex mixed-content financial tables — prototype before committing to scope
- **Phase 10 (Multi-User):** Invitation flow UX, role permission matrix, MENA family finance dynamics
- **Phase 11 (Forecasting):** Recurring transaction detection algorithm approach at 100-1000 user scale

Phases with standard patterns (skip research phase):
- **Phase 4 (Dashboard):** Plotly + Next.js integration researched and confirmed
- **Phase 6 (Budgets):** Standard envelope budgeting
- **Phase 7 (Notifications):** APScheduler + event-driven dispatch is well-documented
- **Phase 9 (Gam3eya):** Fully custom domain logic, no external library research needed
- **Phase 12 (Telegram Bot):** python-telegram-bot webhook mode is well-documented
- **Phase 13 (PWA):** Serwist documentation is thorough

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All library choices verified against official sources, PyPI, and GitHub. Version pinning validated. APScheduler alpha warning confirmed. |
| Features | HIGH | Based on direct competitive analysis (06-research.md) and existing roadmap (05-roadmap.md). MENA market nuances well-understood from prior research. |
| Architecture | HIGH | Standard extensions of the locked architecture. AI pipeline, notification dispatch, and report generation follow established backend patterns. |
| Pitfalls | HIGH | All pitfalls are concrete and specific to the actual libraries being used. Prevention strategies are actionable. |

**Overall confidence:** HIGH

### Gaps to Address

- **WeasyPrint Arabic rendering with financial tables:** Confidence is MEDIUM for complex mixed Arabic/English table layouts. Prototype during Phase 8 planning before committing to full scope.
- **LLM cost per Egyptian user:** Estimated $5-20/month without rules engine, but actual EGP transaction description variety is unknown. Track empirically during Phase 5 beta.
- **Forecasting algorithm approach:** Recurring transaction detection is under-specified. Research during Phase 11 planning whether rule-based (same amount +/- 5%, same day) vs. ML approaches are appropriate at 100-1000 user scale.
- **Multi-user invitation UX for MENA context:** Family finance dynamics differ in MENA (head-of-household model). Validate role structure with target users before Phase 10 implementation.

## Sources

### Primary (HIGH confidence)
- react-plotly.js GitHub — v2.6.0, 416k weekly downloads, Next.js App Router integration confirmed
- LiteLLM docs (docs.litellm.ai) — v1.82.x+, 140+ providers, structured output support
- Instructor docs (python.useinstructor.com) — Pydantic V2 structured LLM output
- python-telegram-bot PyPI — v22.7, Mar 2026 release, async webhook mode
- WeasyPrint GitHub releases — v68.1, Jan 2026, RTL improvements
- XlsxWriter PyPI — v3.2.9, Sep 2025, constant_memory mode confirmed
- Serwist Next.js docs (serwist.pages.dev) — v9.5.7, Turbopack compatibility confirmed
- Resend Python SDK PyPI — v2.27.0, Apr 2026
- APScheduler PyPI — v3.10.4 stable; v4.0.0a6 pre-release (confirmed not production-ready)

### Secondary (MEDIUM confidence)
- dev.to Next.js + Plotly integration guide — App Router ssr:false pattern
- PydanticAI vs Instructor comparison (medium.com) — confirms instructor is right choice for classification vs. agentic workflows
- WeasyPrint RTL issue tracker — ongoing improvements, complex table layouts need validation

### Tertiary (LOW confidence — needs validation)
- LLM cost projections ($5-20/month per user) — based on gpt-4o-mini pricing at 300-500 transactions/month; actual Egyptian transaction description diversity unknown
- WeasyPrint Arabic financial table rendering quality — improved in v64-68 but complex mixed-content layouts not independently validated

---
*Research completed: 2026-04-07*
*Ready for roadmap: yes*
