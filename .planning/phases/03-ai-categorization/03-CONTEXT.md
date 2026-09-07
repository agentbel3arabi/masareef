# Phase 3: AI Categorization - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers automatic transaction categorization — a rules engine for known merchants, LLM fallback (via litellm) for unknowns, user correction feedback loop that creates rules, batch categorization after import, on-demand categorization from the transactions page, inline suggestion on manual transaction save, and a rules management UI. A new `categorization_rules` table is created. The existing `Transaction.ai_categorized` and `ai_confidence` columns are used to track AI-applied categories. Token budget tracking with admin UI controls cost.

</domain>

<decisions>
## Implementation Decisions

### LLM Provider Strategy
- **D-01:** Use **litellm** as the unified LLM routing layer. Single library handles Claude/OpenAI/Azure/Ollama via config string. No custom AIProvider abstract class for MVP — litellm already provides that abstraction. Add **instructor** for structured output (typed category suggestions).
- **D-02:** API keys managed as **system-wide environment variables** (e.g., `LITELLM_API_KEY`, `AI_MODEL`). All households share the same provider config. No per-household provider settings.
- **D-03:** **Token budget tracking** — track actual token usage per household per month in a `ai_usage_tracking` table. Configurable monthly limit in admin settings UI. At 80% consumption, show warning notification. At 100%, stop AI calls and notify user. Transactions fall back to "Uncategorized" when budget is exhausted.

### Rule Creation & Matching
- **D-04:** **Every user correction creates a rule immediately.** User corrects AI-assigned (or unassigned) category once → rule created with confidence 1.0 (user-confirmed). No 3-correction threshold — single correction is already a clear signal.
- **D-05:** **Contains match only** at launch. Pattern is a substring match against transaction description. Covers 90%+ of cases. Regex and exact match deferred — can be added later if needed.
- **D-06:** **Merchant name extraction via first-significant-token heuristic.** Strip numbers, dates, and branch codes from description. Use the first meaningful word(s) as the rule pattern. E.g., "CARREFOUR CITY STARS 0284" → "CARREFOUR".

### Review UI Flow
- **D-07:** **Inline review on transactions page** — no separate review page. AI-categorized transactions show badges next to their category. Users change categories via the existing transaction edit flow. Add a "Needs review" filter to the transactions page for AI-suggested items.
- **D-08:** **All confidence tiers get badges**, color-coded: green (>95% auto-applied), yellow (75-95% suggested), red (<75% low confidence). Users always know what AI touched. This differs from the feature spec's "silent auto-assign" for >95% — user visibility wins.
- **D-09:** **Bulk approve available** — "Approve all AI suggestions" button on the filtered "Needs review" view. Confirms all pending suggestions at once. Individual reject is done by changing the category (which also creates a correction rule per D-04).

### Categorization Triggers
- **D-10:** Three triggers for batch categorization:
  1. **After import commit** — BackgroundTask fires automatically (wire up existing stub in `import_service.py:499`)
  2. **On-demand from transactions page** — "Categorize uncategorized" button triggers batch categorization for visible uncategorized transactions
  3. **On manual transaction save** — when user creates a transaction without selecting a category, suggest one inline using rule engine only (no async AI call, instant)
- **D-11:** **Backfill is optional via button** — "Categorize past transactions" button in settings/categorization page. User explicitly triggers backfill of all existing uncategorized transactions. No automatic backfill on deploy.

### Claude's Discretion
- Exact litellm model string and fallback chain configuration
- `categorization_rules` table schema details (columns, indexes) — follow feature spec as guide
- `ai_usage_tracking` table schema
- Batch size for AI calls (feature spec suggests 20)
- Loading states and error handling for categorization operations
- Rules management page layout and interaction patterns

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Feature Specification
- `docs/03-features/categories.md` — Full categorization spec: three-layer pipeline, rule engine matching, AI provider request/response format, confidence tiers, batch categorization, feedback loop, acceptance criteria
- `docs/01-architecture.md` §AI Provider System (lines 273-317) — AIProvider interface design, provider config schema, confidence tiers, background task system

### Data Models
- `docs/02-data-models.md` — Canonical table schemas. New tables (`categorization_rules`, `ai_usage_tracking`) must be added here after migration.
- `backend/app/models/transaction.py` — Transaction model with existing `ai_categorized` (bool) and `ai_confidence` (float) columns
- `backend/app/models/category.py` — Category model with `is_predefined`, `is_system`, `household_id`

### Existing Services
- `backend/app/services/category.py` — Category CRUD service (list_categories used for available categories in AI prompt)
- `backend/app/services/import_/import_service.py` lines 499-502 — Background task stub for AI categorization after import commit
- `backend/app/services/transaction.py` — Transaction CRUD service (update transaction category)

### Architecture & Conventions
- `CLAUDE.md` §D — API conventions, money rules, dependency injection pattern, error envelope
- `.planning/codebase/CONVENTIONS.md` — Current coding patterns (service-layer isolation, Pydantic V2, async patterns)
- `.planning/codebase/STRUCTURE.md` — Directory and module organization

### Design Reference
- `docs/stitch-designs/html/19c-settings-categories.html` — Category management design screen
- `docs/guides/09-design-tokens.md` — Design tokens for UI styling

### Testing
- `docs/guides/08-testing.md` — Test strategy, fixtures, coverage requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Transaction model** (`backend/app/models/transaction.py`): Already has `ai_categorized` bool and `ai_confidence` float columns — ready for categorization results
- **Category service** (`backend/app/services/category.py`): `list_categories()` with household scoping — provides available categories for AI prompt context
- **Import service stub** (`backend/app/services/import_/import_service.py:499`): Commented-out `background_tasks.add_task(ai_categorize_batch)` — wire-up point for post-import categorization
- **Existing transaction filters** (`frontend/src/app/(app)/transactions/page.tsx`): Transactions page with filtering — extend with "Needs review" filter
- **StatCard + badge patterns** from Phase 2 dashboard — reusable for AI badge indicators

### Established Patterns
- **Service-layer isolation** — categorization service is pure business logic, router handles HTTP + BackgroundTasks
- **Dependency injection** — `get_db_session`, `get_household_id`, `get_member_role`
- **Pydantic V2** — `model_dump()`, `model_config = {"from_attributes": True}`
- **TanStack Query** — all frontend data fetching, cache invalidation on mutation
- **Response envelope** — `{"data": {...}, "meta": {...}}`

### Integration Points
- **Import router** (`backend/app/routers/import_.py`): Add BackgroundTasks parameter to commit endpoint
- **Transaction router** (`backend/app/routers/transactions.py`): Add categorize-batch endpoint
- **Frontend transactions page**: Add AI badge component, "Needs review" filter, bulk approve button
- **Alembic**: New migration for `categorization_rules` and `ai_usage_tracking` tables
- **pyproject.toml**: Add litellm + instructor dependencies

</code_context>

<specifics>
## Specific Ideas

- Token budget tracking in admin UI with 80%/100% notification thresholds — this is a Phase 7 (Settings) UI concern but the backend tracking table and logic belong in Phase 3
- Color-coded AI badges (green/yellow/red) for confidence visibility — user wants full transparency on all AI-touched transactions, even high-confidence ones
- First-significant-token heuristic for merchant extraction — simple string processing, no NLP needed

</specifics>

<deferred>
## Deferred Ideas

- **Per-household AI provider settings** — system-wide keys for MVP. Multi-tenant provider config can be added in a future phase if needed.
- **Regex match type for rules** — contains-only at launch. Add regex support if users request more complex patterns.
- **Exact match type** — contains covers 90%+ of cases. Add if false positive rate is too high.
- **Nightly scheduled categorization job** — APScheduler cron for catching stragglers. Add if on-demand + post-import triggers aren't sufficient.
- **LLM-assisted merchant name extraction** — first-significant-token heuristic for now. Upgrade to LLM extraction if heuristic quality is poor.
- **Token budget admin UI** — the settings page for configuring budget lives in Phase 7. Phase 3 builds the backend tracking + API. A minimal display can be added to the rules management page.

</deferred>

---

*Phase: 03-ai-categorization*
*Context gathered: 2026-04-08*
