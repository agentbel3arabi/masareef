# Phase 3: AI Categorization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 03-ai-categorization
**Areas discussed:** LLM provider strategy, Rule creation & matching, Review UI flow, Categorization triggers

---

## LLM Provider Strategy

### Provider Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| litellm | Single library handles multi-provider routing with unified API. Add instructor for structured output. | ✓ |
| Custom AIProvider ABC | Build full abstract class from architecture doc (ClaudeProvider, OpenAIProvider, etc.) | |
| Single SDK (anthropic) | Start with Anthropic SDK only. Simplest possible. | |

**User's choice:** litellm
**Notes:** Avoids building custom abstraction layer — litellm already provides multi-provider routing.

### API Key Management

| Option | Description | Selected |
|--------|-------------|----------|
| System-wide env vars | Single set of API keys in .env. All households share the same provider. | ✓ |
| Per-household settings | Each household stores its own AI provider + API key. | |
| System default + household override | System-wide keys as default, households can optionally bring their own. | |

**User's choice:** System-wide env vars
**Notes:** Simplest for self-hosted single-user MVP.

### Cost Guardrails

| Option | Description | Selected |
|--------|-------------|----------|
| Simple monthly cap | Track API calls per household per month. Hard-stop at configurable limit. | |
| No guardrails for MVP | Rules engine handles most transactions over time. Add limits later. | |
| Token budget tracking | Track actual token usage per household. More precise. | ✓ |

**User's choice:** Token budget tracking
**Notes:** User chose the most precise option over simpler call-count cap.

### Token Budget Details

| Option | Description | Selected |
|--------|-------------|----------|
| Env var + fallback to uncategorized | MONTHLY_TOKEN_BUDGET env var. Silent fallback when exceeded. | |
| Admin UI + warning notification | Configurable in settings. Warn at 80%, stop at 100%, notify user. | ✓ |
| Per-provider tracking | Track tokens separately for each provider. | |

**User's choice:** Admin UI + warning notification
**Notes:** User wants visibility and control over token consumption.

---

## Rule Creation & Matching

### Auto-rule Creation Threshold

| Option | Description | Selected |
|--------|-------------|----------|
| Every correction creates a rule | User corrects once → rule created immediately with confidence 1.0. | ✓ |
| After 3 identical corrections | Matches AICAT-01 spec literally. More conservative. | |
| Create rule at 1, auto-apply at 3 | Hybrid: create at first correction, auto-apply after 3. | |

**User's choice:** Every correction creates a rule
**Notes:** Single correction is a clear signal. No waiting for 3 corrections.

### Match Types at Launch

| Option | Description | Selected |
|--------|-------------|----------|
| Contains only | Substring match against description. Covers 90%+ of cases. | ✓ |
| Exact + Contains | Both full-string and substring match. | |
| All three (exact/contains/regex) | Full spec implementation including regex. | |

**User's choice:** Contains only
**Notes:** Simplest option that covers the vast majority of cases.

### Merchant Name Extraction

| Option | Description | Selected |
|--------|-------------|----------|
| First significant token | Strip numbers/dates/codes, use first meaningful word(s). | ✓ |
| Full description as pattern | Use entire description as contains-match pattern. | |
| LLM-assisted extraction | Ask LLM to extract merchant name. Most accurate but costly. | |

**User's choice:** First significant token
**Notes:** Simple heuristic, no NLP or LLM cost.

---

## Review UI Flow

### Review Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Inline on transactions page | AI badges on transactions, "Needs review" filter. No new pages. | ✓ |
| Separate review queue | Dedicated /categorization-review page with batch list. | |
| Post-import review step | Review screen after import commit, inline with import flow. | |

**User's choice:** Inline on transactions page
**Notes:** Reuses existing transactions page, simplest to build.

### Confidence Tier Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Badge + filter | >95% silent, 75-95% AI badge, <75% uncategorized with tooltip. | |
| All tiers get badges | Every AI-categorized transaction gets color-coded badge (green/yellow/red). | ✓ |
| Notification-driven | Notification after batch categorization, filtered list on click. | |

**User's choice:** All tiers get badges
**Notes:** User wants full transparency on all AI-touched transactions, even high-confidence ones.

### Batch Actions

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, bulk approve | "Approve all AI suggestions" button on filtered view. | ✓ |
| Per-transaction only | Each transaction reviewed individually. | |
| Approve all + undo | Auto-approve everything with 30-second undo banner. | |

**User's choice:** Bulk approve
**Notes:** Bulk approve for efficiency, individual reject by changing category (which creates correction rule).

---

## Categorization Triggers

### Batch Categorization Triggers (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| After import commit | BackgroundTask fires after import. Wire up existing stub. | ✓ |
| On-demand from transactions page | "Categorize uncategorized" button triggers batch. | ✓ |
| Scheduled nightly job | APScheduler cron for catching stragglers. | |
| On manual transaction save | Suggest category inline using rule engine (no async AI). | ✓ |

**User's choice:** After import commit + On-demand + On manual save
**Notes:** Three triggers. Nightly job deferred — on-demand covers the gap.

### Backfill Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, on first run | Auto-backfill all existing uncategorized on deploy. | |
| No, only new transactions | Only categorize post-Phase 3 transactions. | |
| Optional via button | "Categorize past transactions" button in settings. User decides. | ✓ |

**User's choice:** Optional via button
**Notes:** User prefers explicit consent for touching existing data.

---

## Claude's Discretion

- litellm model string and fallback chain configuration
- categorization_rules and ai_usage_tracking table schemas
- Batch size for AI calls
- Loading states and error handling
- Rules management page layout

## Deferred Ideas

- Per-household AI provider settings
- Regex and exact match types for rules
- Nightly scheduled categorization job
- LLM-assisted merchant name extraction
- Full token budget admin UI (Phase 7)
