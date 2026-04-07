# Technology Stack — Additional Libraries for Phases 4-12+

**Project:** Masareef
**Researched:** 2026-04-07
**Scope:** Libraries needed beyond the existing FastAPI + Next.js 16 + Supabase stack

## Existing Stack (Not Re-Researched)

The core stack is locked and validated through Phase 3.8: FastAPI 0.115+, Next.js 16.1.6, React 19, Supabase (PostgreSQL + Auth + Realtime), SQLAlchemy 2.0 async, TanStack Query 5, shadcn/ui (base-nova), Tailwind CSS 4, next-intl 4.8, pnpm 10, uv. See `.planning/codebase/STACK.md` for full details.

## Recommended Additions

### Charts & Data Visualization (Dashboard Phase)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| react-plotly.js | 2.6.0 | React wrapper for Plotly.js | **Already mandated** in CLAUDE.md. Last published 4 years ago but still gets 400k+ weekly downloads. Works with plotly.js 2.x underneath. The wrapper is thin -- it just bridges Plotly to React. Must use `next/dynamic` with `ssr: false` because Plotly assumes browser globals. | HIGH |
| plotly.js-dist | 2.35.x | Plotly.js distribution (peer dep) | Lighter than full `plotly.js` -- excludes source maps and dev tooling. Use `plotly.js-dist` not `plotly.js-dist-min` to keep debugging possible. | HIGH |

**Integration pattern for Next.js App Router:**
```typescript
// components/charts/PlotlyChart.tsx
"use client";
import dynamic from "next/dynamic";
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });
```

**Why not alternatives:** Recharts and Chart.js are explicitly forbidden in CLAUDE.md. Plotly is the right choice for this app anyway -- it handles RTL layouts, multi-currency formatting, and interactive financial charts (waterfall, candlestick, sankey) that simpler libraries cannot.

### AI Categorization Pipeline

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| litellm | 1.82.x+ | Multi-provider LLM gateway | Unified OpenAI-format API for 140+ providers. Swap between OpenAI, Anthropic, Gemini without code changes. Supports structured outputs via `response_format`. Active development (40k GitHub stars, releases every week). | HIGH |
| instructor | 1.7.x+ | Structured LLM output extraction | Built on Pydantic V2 -- returns validated Python objects from LLM calls. 3M+ monthly downloads. Works with litellm as backend. Handles retries when validation fails. Perfect for "return a CategoryPrediction model" use cases. | HIGH |

**Why litellm + instructor (not PydanticAI):**
- litellm handles provider routing, cost tracking, and fallbacks -- essential for a consumer app where you want OpenAI primary with Anthropic fallback
- instructor is schema-first extraction -- define a Pydantic model, get it back validated. No agent overhead
- PydanticAI (v1.77) is great for agentic workflows but overkill for categorization. Masareef needs "classify this transaction" not "run an agent"
- Both integrate with the existing Pydantic V2 stack seamlessly

**Architecture pattern:**
```python
import instructor
import litellm

client = instructor.from_litellm(litellm.acompletion)

class CategoryPrediction(BaseModel):
    category_id: UUID
    confidence: float
    reasoning: str

prediction = await client.create(
    model="gpt-4o-mini",  # cheap, fast, good for classification
    response_model=CategoryPrediction,
    messages=[{"role": "user", "content": f"Categorize: {description}"}],
)
```

**Why not raw OpenAI SDK:** Vendor lock-in. litellm lets you switch providers with a config change, which matters when Gemini 3.x or a cheaper model drops.

### Email Notifications

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| resend | 2.27.0 | Email sending API (Python SDK) | Modern email API with generous free tier (100 emails/day free). Python SDK is async-compatible. Clean API, good deliverability, no SMTP server management. Works from FastAPI BackgroundTasks. | MEDIUM |
| fastapi-mail | 1.4.x | SMTP email sending | Alternative if self-hosted SMTP is preferred. Async-native, Jinja2 templates, built for FastAPI. Less polished than Resend but no external dependency. | MEDIUM |

**Recommendation:** Use **Resend** for production (reliability, deliverability tracking, no SMTP hassle). Use **Jinja2 templates** for email HTML -- the backend already has Jinja2 as a transitive dep. Do NOT use react-email on the backend -- that's a Node.js tool and adds unnecessary complexity to a Python backend.

**Why not SendGrid/Mailgun:** Resend is simpler, cheaper at Masareef's scale, and has a better developer experience. SendGrid's Python SDK is bloated. Mailgun works but Resend is the 2025+ default for new projects.

### Telegram Bot Notifications

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| python-telegram-bot | 22.7 | Telegram Bot API wrapper | Mature, async-native (v20+), well-documented, actively maintained (Mar 2026 release). Supports Bot API 9.5. Use webhook mode with FastAPI for production. | HIGH |

**Integration approach:** Run the Telegram bot in webhook mode, not polling. FastAPI exposes a `/webhook/telegram` endpoint. The bot application is initialized in FastAPI's lifespan context manager. This avoids event loop conflicts that plague polling-mode setups.

**Why not aiogram:** python-telegram-bot has larger community, better docs, and webhook mode works cleanly with FastAPI. aiogram is good but unnecessary when PTB does the job.

### PDF Report Generation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| WeasyPrint | 68.1 | HTML/CSS to PDF conversion | Write reports as Jinja2 HTML templates, render to PDF. Supports RTL/Arabic text (improved in recent versions). No headless browser needed. Pure Python rendering engine. | MEDIUM |

**Why WeasyPrint over ReportLab:** Masareef reports need Arabic RTL text, tables, and charts. Writing this as HTML templates is dramatically faster than ReportLab's programmatic API. WeasyPrint renders CSS `direction: rtl` natively. The 7 report types in the roadmap would take 3x longer with ReportLab.

**RTL caveat:** WeasyPrint's RTL support has improved significantly (v64-68) but may need testing with complex Arabic table layouts. Flag as needing validation during the Reports phase.

**Why not Playwright/Puppeteer PDF:** Adds a headless Chromium dependency to the Docker image (400MB+). WeasyPrint is ~50MB. Not worth it for financial reports.

### Excel Report Generation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| XlsxWriter | 3.2.9 | Excel file creation | 3-5x faster than openpyxl for write-only workloads. Rich formatting, charts, conditional formatting. Masareef already has openpyxl for reading imports -- XlsxWriter handles the write side. | HIGH |

**Why both openpyxl AND XlsxWriter:** openpyxl (already installed) reads uploaded Excel bank statements during import. XlsxWriter generates new Excel reports. Different tools for different jobs -- XlsxWriter is write-only but much faster and produces better-formatted output.

### PWA (Progressive Web App)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @serwist/next | 9.5.7 | Service worker tooling for Next.js | Successor to next-pwa. Works with Next.js 16 + Turbopack (next-pwa does not). Based on Google Workbox. Provides precaching, runtime caching, offline fallback. | HIGH |
| serwist | 9.5.7 | Core service worker library | Peer dependency for @serwist/next. Handles cache strategies, background sync. | HIGH |

**Why Serwist over next-pwa:** next-pwa is unmaintained and requires webpack (incompatible with Next.js 16's default Turbopack). Serwist is the maintained fork/successor, works with Turbopack (only needs `--webpack` flag for dev-mode PWA testing, not production).

**Why not manual service worker:** Next.js 16 has official PWA docs showing manual approach, but it lacks precaching, cache versioning, and offline-first strategies. Serwist adds these with minimal config.

### Job Scheduling (Already Specified, Confirming)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| APScheduler | 3.10.4 | Cron-style recurring jobs | Use v3.x (stable), NOT v4.x (still alpha/pre-release as of Apr 2026). v3's `AsyncIOScheduler` works with FastAPI's event loop. Needed for: nightly exchange rate refresh, forecast recalculation, notification scheduling. | HIGH |

**Critical warning:** APScheduler 4.0.0 is still at alpha6 (pre-release). Do NOT use it. Stick with 3.10.x which is production-proven.

### CSV Export

No additional library needed. Python's built-in `csv` module + `io.StringIO` handles CSV export. FastAPI streams it as `StreamingResponse` with `text/csv` content type.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Charts | react-plotly.js | Recharts | Explicitly forbidden in CLAUDE.md |
| Charts | react-plotly.js | Chart.js | Explicitly forbidden in CLAUDE.md |
| AI Provider | litellm | Raw OpenAI SDK | Vendor lock-in, no fallback routing |
| AI Structured Output | instructor | PydanticAI | Overkill for classification; agent framework when we need schema extraction |
| Email | Resend | SendGrid | Bloated SDK, worse DX, overkill pricing |
| Email | Resend | Amazon SES | Complex setup, IAM headaches, not worth it at this scale |
| PDF | WeasyPrint | ReportLab | Programmatic API is 3x slower to develop for RTL HTML reports |
| PDF | WeasyPrint | Playwright PDF | 400MB+ Docker image bloat for a headless browser |
| Excel Write | XlsxWriter | openpyxl (write mode) | 3-5x slower for write-only workloads |
| PWA | Serwist | next-pwa | Unmaintained, incompatible with Turbopack |
| PWA | Serwist | Manual SW | Missing precaching, cache versioning, offline strategies |
| Scheduler | APScheduler 3.x | APScheduler 4.x | v4 is still alpha, not production-ready |
| Telegram | python-telegram-bot | aiogram | Smaller community, no meaningful advantage |

## Installation

### Backend (add via `uv add`)

```bash
# AI Categorization
uv add litellm instructor

# Notifications
uv add resend python-telegram-bot

# Reports
uv add weasyprint xlsxwriter

# Scheduling (if not already added)
uv add apscheduler
```

### Frontend (add via `pnpm add`)

```bash
# Charts
pnpm add react-plotly.js plotly.js-dist

# PWA (when ready for PWA phase)
pnpm add @serwist/next serwist
```

### Dev Dependencies

No additional dev dependencies needed beyond what's already in the stack.

## Version Pinning Strategy

Pin to minor version ranges in `pyproject.toml` and `package.json`. Lock files (`uv.lock`, `pnpm-lock.yaml`) handle exact pinning. Examples:
- `"litellm>=1.82.0,<2.0"` -- litellm releases frequently; cap at major
- `"instructor>=1.7.0,<2.0"` -- same pattern
- `"weasyprint>=68.0,<69.0"` -- WeasyPrint has breaking changes between minors occasionally
- `"react-plotly.js": "^2.6.0"` -- stable, no changes expected

## Sources

- [react-plotly.js GitHub](https://github.com/plotly/react-plotly.js/) -- 2.6.0, 416k weekly downloads
- [Next.js + Plotly integration guide](https://dev.to/composite/how-to-integrate-plotlyjs-on-nextjs-14-with-app-router-1loj)
- [LiteLLM docs](https://docs.litellm.ai/) -- v1.82.x+, 140+ providers
- [Instructor docs](https://python.useinstructor.com/) -- Pydantic V2 structured LLM output
- [PydanticAI vs Instructor comparison](https://medium.com/@mahadevan.varadhan/pydanticai-vs-instructor-structured-llm-ai-outputs-with-python-tools-c7b7b202eb23)
- [python-telegram-bot PyPI](https://pypi.org/project/python-telegram-bot/) -- v22.7, Mar 2026
- [WeasyPrint releases](https://github.com/Kozea/WeasyPrint/releases) -- v68.1, Jan 2026
- [WeasyPrint RTL issue tracker](https://github.com/Kozea/WeasyPrint/issues/106)
- [XlsxWriter PyPI](https://pypi.org/project/xlsxwriter/) -- v3.2.9, Sep 2025
- [Serwist Next.js docs](https://serwist.pages.dev/docs/next/getting-started) -- v9.5.7
- [Next.js PWA official guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Resend Python SDK](https://pypi.org/project/resend/) -- v2.27.0, Apr 2026
- [APScheduler PyPI](https://pypi.org/project/APScheduler/) -- v3.10.4 stable, v4.0.0a6 alpha
- [fastapi-mail PyPI](https://pypi.org/project/fastapi-mail/)
