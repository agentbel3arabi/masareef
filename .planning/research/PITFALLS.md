# Domain Pitfalls

**Domain:** Personal finance platform with AI, charts, notifications, reports
**Researched:** 2026-04-07

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Plotly.js Bundle Size Explosion

**What goes wrong:** Importing full `plotly.js` adds 3-8MB to the client bundle, making the app unusably slow on MENA mobile networks.
**Why it happens:** `plotly.js` includes every chart type, locale, and transform. Developers import it without realizing the size.
**Consequences:** First load takes 10+ seconds on 3G. Users abandon the app.
**Prevention:** Use `plotly.js-dist` (not `plotly.js`). Consider `plotly.js-basic-dist` if only basic chart types are needed (pie, bar, line, scatter). Use `next/dynamic` with `ssr: false` to ensure it only loads client-side. Lazy-load chart components -- don't include in the main bundle.
**Detection:** Check `pnpm build` output for bundle size. Any single chunk >500KB is a warning sign.

### Pitfall 2: LLM Costs Spiraling Without Rules Layer

**What goes wrong:** Sending every transaction to GPT-4o-mini for categorization costs $5-20/month per active user at Egyptian transaction volumes (300-500/month).
**Why it happens:** Developers skip the rules engine and go straight to LLM for "simplicity."
**Consequences:** Unsustainable unit economics. Can't offer free tier.
**Prevention:** Build rules engine FIRST. Match merchant names, regex patterns, and user-confirmed rules before any LLM call. Target: 80%+ transactions categorized by rules, <20% need LLM.
**Detection:** Track `llm_calls_per_import` metric. If >50% of transactions hit LLM, the rules engine is underperforming.

### Pitfall 3: WeasyPrint Arabic Rendering Bugs

**What goes wrong:** Arabic text in PDF reports renders with incorrect character joining, wrong bidi ordering, or missing glyphs.
**Why it happens:** WeasyPrint's RTL support has improved but isn't battle-tested with complex Arabic financial tables. Mixed Arabic/English content (common in Egyptian bank data) is especially tricky.
**Consequences:** Reports look unprofessional or are unreadable. Users lose trust.
**Prevention:** Test PDF generation with real Arabic bank statement data early. Use a font that has full Arabic coverage (e.g., Noto Sans Arabic). Set `direction: rtl` and `unicode-bidi: bidi-override` in CSS where needed. Test mixed content: "مشتريات UBER 150 EGP".
**Detection:** Visual review of generated PDFs with Arabic content. Automated test that checks PDF text extraction matches expected Arabic strings.

### Pitfall 4: APScheduler Jobs Running Multiple Times in Multi-Worker Deployments

**What goes wrong:** If Uvicorn runs with multiple workers, each worker starts its own APScheduler instance, and cron jobs execute N times.
**Why it happens:** APScheduler 3.x doesn't have built-in distributed locking. Each worker process is independent.
**Consequences:** Duplicate notifications, duplicate exchange rate fetches, database conflicts.
**Prevention:** Run Uvicorn with `--workers 1` for the instance that runs scheduled jobs. OR use APScheduler's `PostgresJobStore` to share job state. OR run scheduler as a separate process.
**Detection:** Check for duplicate notification entries or duplicate exchange rate records in the database.

### Pitfall 5: Dashboard N+1 Queries

**What goes wrong:** Dashboard endpoint queries accounts, then for each account queries transactions, then for each transaction queries categories. Response time: 2-5 seconds.
**Why it happens:** Service layer iterates in Python instead of using SQL aggregation.
**Consequences:** Slow dashboard, especially for users with many accounts.
**Prevention:** Use SQL `GROUP BY` with `SUM`, `COUNT` at the database level. Return aggregated data, not raw records. Use SQLAlchemy's `func.sum()`, `func.count()` in queries. One query per dashboard widget, not one query per account.
**Detection:** Enable SQL echo in development. Any dashboard endpoint that generates >5 SQL queries needs refactoring.

## Moderate Pitfalls

### Pitfall 6: Telegram Bot Webhook Security

**What goes wrong:** Anyone can POST to the webhook endpoint, injecting fake "messages" that create transactions.
**Prevention:** Verify the `X-Telegram-Bot-Api-Secret-Token` header on every webhook request. python-telegram-bot handles this if you set `secret_token` in `set_webhook()`. Also validate the request comes from Telegram's IP ranges.

### Pitfall 7: react-plotly.js State Mutation

**What goes wrong:** Plotly mutates its `layout` and `data` props directly, violating React's immutability contract. This causes stale renders or infinite re-render loops.
**Prevention:** Pass new object references for `data` and `layout` on every render. Use `useMemo` to avoid unnecessary re-renders. Set `revision` prop to force updates when data changes.

### Pitfall 8: Email Deliverability for Arabic Content

**What goes wrong:** Emails with Arabic subject lines or body content land in spam.
**Prevention:** Configure proper SPF, DKIM, and DMARC records for the sending domain. Resend handles most of this, but the domain DNS records must be set up. Test with Gmail, Outlook, and Yahoo -- all common in MENA.

### Pitfall 9: PWA Install Prompt Timing

**What goes wrong:** Showing "Add to Home Screen" immediately on first visit. Users dismiss it and the browser blocks future prompts for weeks.
**Prevention:** Defer the install prompt. Track visit count, show after 3rd visit or after a meaningful action (e.g., adding first account). Store dismissal in localStorage.

### Pitfall 10: Multi-Currency Dashboard Aggregation

**What goes wrong:** Summing EGP, USD, and SAR amounts into a single "total" number using stale exchange rates, producing misleading net worth figures.
**Prevention:** Show per-currency totals by default. Only show converted total with clear "as of [date] rates" disclaimer. Use the hub-rate system (USD base) already defined in the architecture.

## Minor Pitfalls

### Pitfall 11: XlsxWriter Memory Usage on Large Reports

**What goes wrong:** Building a 50,000-row Excel report in memory before writing.
**Prevention:** Use XlsxWriter's `constant_memory` mode for large reports. Write rows sequentially, don't buffer.

### Pitfall 12: Plotly Locale for Arabic Numbers

**What goes wrong:** Chart axes show Western numerals when user expects Arabic-Indic numerals (optional in some MENA contexts).
**Prevention:** Use Plotly's locale configuration. For Egyptian users, Western numerals are actually standard for financial data, so this may not be an issue -- but validate with users.

### Pitfall 13: instructor Retry Loops

**What goes wrong:** LLM returns invalid data, instructor retries, burns through API credits in a loop.
**Prevention:** Set `max_retries=2` in instructor config. Log failed classifications for manual review rather than infinite retry.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Dashboard & Charts | Bundle size (Pitfall 1), N+1 queries (Pitfall 5) | Lazy-load Plotly, SQL aggregation |
| AI Categorization | Cost spiral (Pitfall 2), retry loops (Pitfall 13) | Rules engine first, max_retries=2 |
| Budgets | Multi-currency aggregation (Pitfall 10) | Per-currency budget limits |
| Forecasting | Stale exchange rates in projections | Refresh rates before forecast computation |
| Notifications | Duplicate sends in multi-worker (Pitfall 4) | Single scheduler worker |
| Reports | Arabic PDF rendering (Pitfall 3) | Early RTL testing with real data |
| Multi-User | Permission escalation via API | Server-side role checks on every endpoint |
| Telegram Bot | Webhook injection (Pitfall 6) | Secret token verification |
| PWA | Install prompt fatigue (Pitfall 9) | Defer to 3rd visit |
