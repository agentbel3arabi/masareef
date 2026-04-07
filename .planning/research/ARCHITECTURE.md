# Architecture Patterns for Upcoming Phases

**Domain:** AI-powered personal finance platform
**Researched:** 2026-04-07
**Scope:** Architecture additions for dashboard, AI, notifications, reports, PWA

## Existing Architecture (Not Changed)

The core architecture is locked: FastAPI async backend, Supabase PostgreSQL with RLS, Next.js 16 App Router frontend, household-scoped multi-tenancy. See `docs/01-architecture.md`. The patterns below extend this architecture for new capabilities.

## New Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| AI Categorization Service | Classify transactions using LLM providers | Transaction Service, Category Service, litellm |
| AI Rule Engine | Apply user-confirmed rules before hitting LLM | Transaction Service, Rule Store (DB) |
| Notification Scheduler | Schedule and dispatch reminders/alerts | APScheduler, Notification Service |
| Notification Dispatcher | Send via email/Telegram/in-app | Resend API, Telegram Bot API, Supabase Realtime |
| Report Generator | Build PDF/Excel/CSV reports | WeasyPrint, XlsxWriter, all data services |
| Telegram Bot Handler | Process webhook updates, create transactions | FastAPI webhook endpoint, Transaction Service |
| Chart Data Aggregator | Pre-compute dashboard aggregations | Transaction Service, Account Service |

## Pattern 1: AI Categorization Pipeline

**What:** Three-tier classification: rules first, then embedding similarity, then LLM fallback.

**Why:** LLM calls are expensive. Most transactions match simple rules ("UBER" = Transportation). Only novel descriptions need AI.

```
Transaction arrives (uncategorized)
  |
  v
[Rule Engine] -- match merchant name / regex patterns
  |  matched? --> assign category, done
  |  no match? -->
  v
[LLM Classifier] -- litellm + instructor
  |  returns CategoryPrediction (Pydantic model)
  |  confidence >= 0.8? --> assign category
  |  confidence < 0.8? --> flag for user review
  |
  v
[Feedback Loop] -- user confirms/corrects
  |  --> create new rule from confirmed classification
```

**Key decisions:**
- Use `gpt-4o-mini` for classification (cheap, fast, good enough)
- Batch classify during import commit (BackgroundTasks), not one-by-one
- Store rules in `categorization_rules` table for fast re-application
- Fallback chain in litellm config: OpenAI -> Anthropic -> Gemini

### Anti-Pattern: Classifying Every Transaction via LLM

**Why bad:** At 500 transactions/month, that's ~$5/month per user in API costs. Rules handle 80%+ of transactions for free.

**Instead:** Rules first, LLM only for unknowns.

## Pattern 2: Notification Architecture

**What:** Event-driven notifications with pluggable delivery channels.

```
[Event Source] --> [Notification Service] --> [Channel Dispatcher]
                                          |
                                          +--> In-App (Supabase Realtime)
                                          +--> Email (Resend)
                                          +--> Telegram (python-telegram-bot)
```

**Event sources:**
- Scheduled: Bill due dates, budget period resets, gam3eya payment reminders
- Triggered: Budget threshold exceeded, large transaction detected, import complete
- System: Exchange rate significant change, forecast deviation alert

**Key decisions:**
- Store all notifications in `notifications` table regardless of delivery channel
- APScheduler runs in FastAPI's event loop via `AsyncIOScheduler`
- User preferences control which channels receive which notification types
- Telegram bot uses webhook mode (POST to `/api/v1/webhooks/telegram`)

### Anti-Pattern: Polling-Based Notifications

**Why bad:** Checking "should I send a notification?" every minute wastes resources and creates delays.

**Instead:** Event-driven. Budget threshold check happens when a transaction is created/updated, not on a timer.

## Pattern 3: Report Generation

**What:** Template-based report generation with async processing.

```
User requests report
  |
  v
[Report Service] -- query data, aggregate
  |
  v
[Template Engine] -- Jinja2 HTML template (for PDF) or direct write (for Excel)
  |
  +--> WeasyPrint --> PDF (with Arabic RTL support)
  +--> XlsxWriter --> Excel
  +--> csv module --> CSV
  |
  v
[File Storage] -- temporary file, served via StreamingResponse
```

**Key decisions:**
- Reports are generated on-demand, not pre-computed
- Large reports (>1000 transactions) use BackgroundTasks with a "report ready" notification
- PDF templates live in `backend/templates/reports/` as Jinja2 HTML
- Charts in PDF reports: Plotly can export static images server-side (plotly.py), embed as `<img>` in HTML template before WeasyPrint renders
- Excel reports use XlsxWriter directly (no pandas DataFrame intermediate -- faster for structured financial data)

### Anti-Pattern: Client-Side PDF Generation

**Why bad:** Large datasets crash browser tabs. Arabic RTL rendering is inconsistent across browsers' print-to-PDF.

**Instead:** Server-side generation with WeasyPrint. Consistent output, handles Arabic properly.

## Pattern 4: Dashboard Data Flow

**What:** Aggregated dashboard data served via dedicated endpoints, not computed client-side.

```
[Dashboard API endpoints]
  |
  +--> GET /api/v1/dashboard/summary      -- account totals, net worth
  +--> GET /api/v1/dashboard/spending      -- spending by category/period
  +--> GET /api/v1/dashboard/trends        -- income vs expense over time
  +--> GET /api/v1/dashboard/upcoming      -- upcoming bills, gam3eya payments
```

**Key decisions:**
- Server computes aggregations (SQL GROUP BY with date_trunc) -- don't send raw transactions to client
- TanStack Query caches dashboard data with 5-minute stale time
- Invalidate on transaction create/update/delete via Supabase Realtime events
- Chart data shape matches Plotly's expected format (arrays of x/y values) to minimize client transformation

### Anti-Pattern: Fetching All Transactions for Client-Side Aggregation

**Why bad:** User with 10,000 transactions sends 2MB payload for a pie chart that needs 15 numbers.

**Instead:** SQL aggregation on the server. Return only the chart-ready data.

## Pattern 5: PWA Service Worker Strategy

**What:** Offline-first for read operations, online-required for writes.

```
[Serwist Service Worker]
  |
  +--> Precache: App shell, static assets, fonts
  +--> Runtime cache (StaleWhileRevalidate): API responses for dashboard, accounts
  +--> Network-first: Transaction mutations, auth
  +--> Offline fallback: Show cached dashboard, "You're offline" for mutations
```

**Key decisions:**
- Do NOT cache transaction creation offline (financial data must be server-authoritative)
- DO cache read-only dashboard data for instant loading
- manifest.json with Arabic app name, MENA-appropriate theme colors
- Install prompt after 3rd visit (not immediately)

## Scalability Considerations

| Concern | Current (100 users) | At 10K users | At 100K users |
|---------|---------------------|--------------|---------------|
| AI categorization | Direct LLM calls per batch | Add Redis queue for batch jobs | Dedicated worker process, embedding pre-filter |
| Dashboard aggregation | SQL GROUP BY per request | Materialized views or Redis cache | Pre-computed aggregation tables, refresh on write |
| PDF generation | Inline in request | BackgroundTasks | Dedicated report worker, S3 storage for generated files |
| Notifications | APScheduler in-process | APScheduler in-process (fine to 10K) | Celery or dedicated notification service |
| Telegram webhooks | Single FastAPI endpoint | Same (Telegram handles queuing) | Same (webhook model scales linearly) |

**Current scale target is 100-1000 users.** The architecture supports this without any specialized infrastructure. Optimize later based on actual usage patterns.
