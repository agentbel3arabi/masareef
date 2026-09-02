# Phase 3: AI Categorization — Research

**Researched:** 2026-04-08
**Domain:** LLM routing (litellm + instructor), rules engine, background tasks (FastAPI), transaction categorization UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use **litellm** as unified LLM routing layer (Claude/OpenAI/Azure/Ollama via config string). No custom AIProvider abstract class for MVP.
- **D-02:** API keys managed as **system-wide environment variables** (`LITELLM_API_KEY`, `AI_MODEL`). No per-household provider settings.
- **D-03:** **Token budget tracking** via `ai_usage_tracking` table. Monthly limit in admin settings (Phase 7 UI). 80% warning notification; 100% stop + notify. Fallback to "Uncategorized".
- **D-04:** **Every user correction creates a rule immediately** (confidence 1.0). No 3-correction threshold.
- **D-05:** **Contains match only** at launch. Pattern = substring of transaction description.
- **D-06:** **Merchant name extraction via first-significant-token heuristic.** Strip numbers, dates, branch codes. Use first meaningful word(s). E.g., "CARREFOUR CITY STARS 0284" → "CARREFOUR".
- **D-07:** **Inline review on transactions page** — no separate review page. "Needs review" filter for AI-suggested items.
- **D-08:** **All confidence tiers get badges** (green >95%, yellow 75-95%, red <75%). User always sees what AI touched.
- **D-09:** **Bulk approve** — "Approve all AI suggestions" button on filtered view. Individual reject = category change (also creates correction rule).
- **D-10:** Three categorization triggers: (1) after import commit via BackgroundTask, (2) on-demand from transactions page, (3) on manual transaction save (rule engine only, instant).
- **D-11:** **Backfill is optional** — triggered explicitly from settings/categorization page.

### Claude's Discretion

- Exact litellm model string and fallback chain configuration
- `categorization_rules` table schema details (columns, indexes)
- `ai_usage_tracking` table schema
- Batch size for AI calls (feature spec suggests 20)
- Loading states and error handling for categorization operations
- Rules management page layout and interaction patterns

### Deferred Ideas (OUT OF SCOPE)

- Per-household AI provider settings
- Regex match type for rules
- Exact match type for rules
- Nightly scheduled categorization job (APScheduler cron)
- LLM-assisted merchant name extraction
- Token budget admin UI (Phase 7; Phase 3 builds backend tracking + API only)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AICAT-01 | System auto-applies rules from user corrections (single correction = auto-rule per D-04) | Rule engine schema, correction feedback loop, `categorization_rules` table design |
| AICAT-02 | System falls back to LLM (Claude/OpenAI) for unknown merchants | litellm + instructor integration, structured output, prompt design |
| AICAT-03 | User can review and approve/reject AI categorization suggestions | "Needs review" filter on transactions page, bulk approve endpoint, badge UI |
| AICAT-04 | User can manage categorization rules (view, edit, delete) | `GET/POST/PUT/DELETE /api/v1/categorization-rules` endpoints, rules management page |
</phase_requirements>

---

## Summary

Phase 3 builds a three-layer categorization pipeline on top of Phase 2's transaction infrastructure. The rule engine runs in-process (no external calls, sub-millisecond). litellm routes LLM calls with instructor enforcing structured output — this eliminates all manual JSON parsing and provider-specific response handling. Background tasks handle post-import categorization (the stub at `import_service.py:499` is already plumbed in; it just needs the BackgroundTasks parameter added). The frontend extends the existing transactions page with a "Needs review" filter, color-coded AI badges, and a bulk-approve button — no new page required.

Two new tables are needed: `categorization_rules` (the rule store) and `ai_usage_tracking` (token budget). The `backend/app/ai/` directory does not yet exist — it must be created from scratch. The architecture doc shows the placeholder structure. Token budget enforcement belongs in the categorization service, not the router.

**Primary recommendation:** Build in order: (1) schema + rule engine service, (2) litellm/instructor pipeline with budget tracking, (3) wire BackgroundTask trigger + on-demand endpoint, (4) frontend badge + filter + bulk-approve, (5) rules management page.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| litellm | 1.83.4 | Unified LLM routing (Claude/OpenAI/Azure/Ollama via one API) | D-01: locked decision. One `litellm.completion()` call works across all providers without custom adapters. [VERIFIED: PyPI registry] |
| instructor | 1.15.1 | Structured output from LLM responses | Wraps litellm client; enforces Pydantic schema on responses. Eliminates manual JSON parsing. [VERIFIED: PyPI registry] |
| fastapi.BackgroundTasks | (built-in) | Fire-and-forget categorization after import commit | Already used in project; async-safe within request lifecycle. [ASSUMED] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| asyncpg | 0.29.0 | Async PostgreSQL driver | Already in stack; no change needed |
| sqlalchemy[asyncio] | 2.0+ | ORM for new tables | Already in stack |
| pydantic v2 | 2.7+ | Structured output schemas for instructor | Already in stack |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| litellm | direct anthropic SDK | Loses provider agnosticism; D-01 locks litellm |
| instructor | manual JSON parsing | Fragile; no retry on malformed response; instructor handles both |

**Installation:**
```bash
uv add "litellm>=1.83.4" "instructor>=1.15.1"
```

**Version verification:** litellm 1.83.4, instructor 1.15.1 confirmed current as of 2026-04-08. [VERIFIED: PyPI registry]

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
backend/app/
├── ai/                              # NEW — AI categorization module
│   ├── __init__.py
│   ├── categorization_service.py    # Rule engine + LLM pipeline orchestrator
│   ├── rule_engine.py               # Pure rule matching logic (no DB)
│   ├── llm_client.py                # litellm + instructor integration
│   ├── merchant_extractor.py        # First-significant-token heuristic
│   └── budget_guard.py              # Token budget enforcement
├── models/
│   ├── categorization_rule.py       # NEW — CategorizationRule ORM model
│   └── ai_usage_tracking.py         # NEW — AIUsageTracking ORM model
├── schemas/
│   └── categorization.py            # NEW — rule CRUD + batch result schemas
├── routers/
│   └── categorization.py            # NEW — /api/v1/categorization-rules + /categorize-batch
└── services/
    └── categorization.py             # NEW — business logic wrapper (calls ai/ module)

alembic/versions/
└── NNN_add_categorization_tables.py  # NEW migration

frontend/src/
├── hooks/
│   └── use-categorization.ts         # NEW — rules CRUD + batch trigger hooks
├── components/
│   ├── transactions/
│   │   └── ai-badge.tsx              # NEW — color-coded confidence badge
│   └── settings/
│       └── categorization-rules.tsx  # NEW — rules management table + actions
└── app/(app)/
    └── settings/categorization/
        └── page.tsx                  # NEW — rules management page + backfill button
```

### Pattern 1: litellm + instructor Structured Output

**What:** instructor patches the litellm client to enforce Pydantic schema validation on LLM responses with automatic retry on parse failure.

**When to use:** Any LLM call where the response must conform to a known shape.

```python
# Source: instructor docs + litellm docs [VERIFIED: PyPI registry, assumed API shape]
import instructor
import litellm
from pydantic import BaseModel, Field

client = instructor.from_litellm(litellm.completion)

class CategorySuggestion(BaseModel):
    category_id: int = Field(description="ID of the matched category")
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str

async def suggest_category(
    description: str,
    available_categories: list[dict],
    model: str = "claude-3-5-haiku-20241022",
) -> CategorySuggestion:
    return await client.chat.completions.create(  # type: ignore[return-value]
        model=model,
        response_model=CategorySuggestion,
        messages=[
            {
                "role": "user",
                "content": build_prompt(description, available_categories),
            }
        ],
    )
```

**Batch handling:** litellm does not natively batch N transactions in one call. The service loops in groups of 20 (per spec), calling `suggest_category()` per transaction. Use `asyncio.gather()` for concurrent calls within each batch, with a semaphore to cap concurrency. [ASSUMED — standard pattern for async batch LLM calls]

### Pattern 2: Rule Engine (Pure In-Process)

**What:** Ordered match against `categorization_rules` table. First match wins. No external calls.

```python
# Source: feature spec categories.md, D-05 (contains-only at launch)
async def apply_rule_engine(
    session: AsyncSession,
    household_id: uuid.UUID,
    description: str,
) -> tuple[int | None, float | None]:
    """Returns (category_id, confidence) or (None, None) if no match."""
    rules = await load_active_rules(session, household_id)
    for rule in rules:  # ordered by confidence DESC, hit_count DESC
        if rule.match_type == "contains" and rule.pattern.lower() in description.lower():
            await increment_hit_count(session, rule.id)
            return rule.category_id, rule.confidence
    return None, None
```

### Pattern 3: Merchant Name Extraction (First-Significant-Token)

**What:** Strip noise tokens from raw bank description to extract the merchant name for rule creation.

```python
# Source: D-06 [ASSUMED — pattern follows common bank statement normalization]
import re

_NOISE_PATTERN = re.compile(
    r"\b(\d{4,}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|[A-Z]{2,3}\d+|\d+[A-Z]{2,3})\b",
    re.IGNORECASE,
)

def extract_merchant_name(description: str, max_tokens: int = 2) -> str:
    """Strip noise, return first significant token(s) uppercased."""
    cleaned = _NOISE_PATTERN.sub("", description).strip()
    tokens = [t for t in cleaned.split() if len(t) >= 3]
    return " ".join(tokens[:max_tokens]).upper()
```

### Pattern 4: BackgroundTask Wire-up (Post-Import)

**What:** The import commit endpoint fires AI categorization as a background task after committing transactions. The stub already exists at `import_service.py:499`.

```python
# backend/app/routers/import_.py — add BackgroundTasks to commit endpoint
from fastapi import BackgroundTasks

@router.post("/api/v1/import/commit")
async def commit_import(
    data: ImportCommitRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    result = await import_service.commit_import(session, household_id, data, background_tasks)
    return SuccessResponse(data=result.model_dump())

# backend/app/services/import_/import_service.py — activate stub
background_tasks.add_task(
    categorization_service.categorize_batch_by_import,
    str(batch_id),
    str(household_id),
)
```

The background task must create its **own DB session** — it cannot reuse the request session (closed after response). [ASSUMED — standard FastAPI background task pattern]

### Pattern 5: Token Budget Enforcement

```python
# backend/app/ai/budget_guard.py [ASSUMED — project-specific design]
async def check_budget(session: AsyncSession, household_id: uuid.UUID) -> bool:
    """Returns True if household has remaining AI budget. Side-effect: updates usage."""
    usage = await get_current_month_usage(session, household_id)
    limit = await get_household_limit(session, household_id)
    if limit is None:
        return True  # no limit configured
    if usage.tokens_used >= limit:
        return False  # budget exhausted
    return True
```

### Pattern 6: Confidence Badge (Frontend)

```tsx
// frontend/src/components/transactions/ai-badge.tsx
// D-08: green >95%, yellow 75-95%, red <75%
// Use logical CSS classes only (CLAUDE.md §E rule 4)
function AiBadge({ confidence }: { confidence: number }) {
  const color =
    confidence > 0.95 ? "bg-green-100 text-green-700" :
    confidence >= 0.75 ? "bg-yellow-100 text-yellow-700" :
    "bg-red-100 text-red-700";

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      AI {Math.round(confidence * 100)}%
    </span>
  );
}
```

### Anti-Patterns to Avoid

- **Direct anthropic/openai SDK in the service layer.** litellm is the abstraction — go through it, not around it.
- **Reusing the request DB session in BackgroundTask.** Always create a fresh session with `async_sessionmaker` in background tasks.
- **Calling LLM synchronously in the request handler.** All LLM calls go through BackgroundTask or the on-demand batch endpoint — never block a request.
- **Storing LLM confidence as a float column and computing on it without rounding.** Use `round(confidence, 4)` before storing; float precision causes badge tier boundary issues.
- **Floats for money.** Irrelevant to this phase but the project rule applies everywhere.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-provider LLM routing | Custom AIProvider abstract class | litellm | 100+ provider integrations, retry logic, fallback chain already built |
| Structured LLM output | Manual JSON parsing + validation | instructor | Handles parse errors, automatic retry on schema mismatch, Pydantic-native |
| Rate limiting / concurrency | Custom semaphore pool | asyncio.Semaphore (stdlib) | Simple, zero deps; instructor handles LLM-level retries |

**Key insight:** The architecture doc (`01-architecture.md` lines 276-317) shows a custom `AIProvider` abstract class with four provider implementations. D-01 explicitly replaces all of that with litellm. Don't build what the architecture doc shows — it's superseded by the decision.

---

## Common Pitfalls

### Pitfall 1: BackgroundTask Session Reuse

**What goes wrong:** The request-scoped `AsyncSession` is closed when the response is sent. The background task executes after the response and finds a dead session — `asyncpg.exceptions.InterfaceError: cannot perform operation: another operation is in progress`.

**Why it happens:** FastAPI closes the session in the Depends generator's finally block. Background tasks run after the response is committed.

**How to avoid:** Import `async_sessionmaker` from `database.py` and create a fresh session at the start of the background task function.

**Warning signs:** `InterfaceError`, `asyncpg connection closed` in background task logs.

### Pitfall 2: LLM Category ID Hallucination

**What goes wrong:** LLM returns a `category_id` that doesn't exist in the household's category list. If applied directly, it silently orphans the transaction (FK constraint allows NULL but wrong ID fails on FK check).

**Why it happens:** LLM context window truncation or model drift — it invents plausible-looking IDs.

**How to avoid:** After getting `CategorySuggestion` from instructor, validate `category_id` is in the set fetched from `list_categories()` before applying. Reject and fall through to Uncategorized if invalid.

**Warning signs:** FK constraint violations in logs; transactions with phantom category IDs.

### Pitfall 3: Rule Pattern Too Broad

**What goes wrong:** Pattern "VISA" matches all Visa transactions across every merchant, collapsing them to one category.

**Why it happens:** First-significant-token heuristic picks up bank/network identifiers instead of merchant names. E.g., "VISA CARREFOUR CITY STARS" → heuristic picks "VISA".

**How to avoid:** Maintain a blocklist of common payment network tokens to skip during extraction: `["VISA", "MASTERCARD", "AMEX", "VALU", "ATM", "POS", "DEBIT", "CREDIT"]`. Skip to the next token if the first match is on the blocklist.

**Warning signs:** One rule matching hundreds of transactions with wildly different merchants.

### Pitfall 4: Budget Race Condition

**What goes wrong:** Two concurrent background tasks both read the usage count, both conclude budget is available, both proceed — overspending the limit.

**Why it happens:** Non-atomic read-then-write on `ai_usage_tracking`.

**How to avoid:** Use a PostgreSQL `UPDATE ... RETURNING` pattern to atomically increment usage and check the limit in one query. Or use `SELECT FOR UPDATE` on the usage row.

**Warning signs:** Token usage visibly exceeds configured limit in the tracking table.

### Pitfall 5: instructor Async Usage with litellm

**What goes wrong:** instructor's `from_litellm()` default is synchronous. Calling it in an async route blocks the event loop.

**Why it happens:** `litellm.completion` is sync; the async equivalent is `litellm.acompletion`.

**How to avoid:** Use `instructor.from_litellm(litellm.acompletion)` and `await` the call. [ASSUMED — verify against instructor docs; instructor v1.x exposes async variants]

**Warning signs:** Event loop blocked; concurrent requests queue behind LLM calls.

---

## Code Examples

### categorization_rules Table Schema (Alembic migration fragment)

```python
# Source: feature spec categories.md + D-04/D-05 [VERIFIED: existing migration pattern]
op.create_table(
    "categorization_rules",
    sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
    sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column("pattern", sa.Text, nullable=False),
    sa.Column("match_type", sa.Text, nullable=False, server_default="contains"),
    sa.Column("category_id", sa.Integer, sa.ForeignKey("categories.id"), nullable=False),
    sa.Column("confidence", sa.Float, nullable=False, server_default="1.0"),
    sa.Column("hit_count", sa.Integer, nullable=False, server_default="0"),
    sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
)
op.create_index(
    "ix_categorization_rules_household",
    "categorization_rules",
    ["household_id"],
)
op.create_index(
    "ix_categorization_rules_household_active",
    "categorization_rules",
    ["household_id", "is_active"],
)
```

### ai_usage_tracking Table Schema

```python
# Source: D-03 [ASSUMED — project-specific design]
op.create_table(
    "ai_usage_tracking",
    sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
    sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column("year_month", sa.Text, nullable=False),   # e.g. "2026-04"
    sa.Column("tokens_used", sa.Integer, nullable=False, server_default="0"),
    sa.Column("monthly_limit", sa.Integer, nullable=True),  # null = unlimited
    sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
)
op.create_index(
    "ix_ai_usage_household_month",
    "ai_usage_tracking",
    ["household_id", "year_month"],
    unique=True,
)
```

### Correcting a Category (Creates Rule)

```python
# backend/app/services/categorization.py [ASSUMED — project-specific pattern]
async def apply_correction(
    session: AsyncSession,
    household_id: uuid.UUID,
    transaction_id: int,
    category_id: int,
) -> None:
    """User corrected a category. Update transaction + upsert rule."""
    tx = await get_transaction(session, household_id, transaction_id)

    # 1. Update transaction
    tx.category_id = category_id
    tx.ai_categorized = True   # marks as user-confirmed
    tx.ai_confidence = 1.0

    # 2. Upsert rule (D-04: single correction = rule, confidence 1.0)
    merchant = extract_merchant_name(tx.description or "")
    if merchant:
        await upsert_rule(session, household_id, merchant, "contains", category_id, confidence=1.0)

    await session.flush()
```

### Supabase Realtime Event After Batch Categorization

```python
# backend/app/ai/categorization_service.py
# After batch completes, emit Supabase realtime event so frontend invalidates cache
# Per CLAUDE.md §D — event: "transaction:categorized" on household:{id} channel
# Frontend invalidates ["transactions"] query key and shows toast
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|--------------|--------|
| Custom per-provider SDK wrappers | litellm unified routing | D-01 decision | No more provider-specific code |
| 3-correction threshold for rule creation | Single correction = immediate rule | D-04 decision | Simpler service logic, faster learning |
| Separate review page for AI suggestions | Inline "Needs review" filter on transactions page | D-07 decision | No new page; extends existing transactions filters |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| litellm | LLM pipeline | Not installed | — | Install via `uv add litellm` |
| instructor | Structured output | Not installed | — | Install via `uv add instructor` |
| PostgreSQL | Data layer | Running (Supabase) | Current | — |
| LLM API key | AI calls | System env var (`AI_MODEL`, `LITELLM_API_KEY`) | Unknown | Uncategorized fallback (D-03) |

**Missing dependencies with no fallback:**
- litellm and instructor: must be installed before categorization service can be implemented. Migration and rule engine can proceed without them.

**Missing dependencies with fallback:**
- LLM API key: if absent at runtime, categorization falls through to "Uncategorized" per D-03. The service must handle `litellm.exceptions.AuthenticationError` gracefully.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest + pytest-asyncio |
| Config file | `backend/pyproject.toml` — `[tool.pytest.ini_options]` |
| Quick run command | `uv run pytest tests/ -k "categoriz" -x` |
| Full suite command | `uv run pytest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AICAT-01 | Correction creates rule immediately | unit | `uv run pytest tests/services/test_categorization.py::test_correction_creates_rule -x` | Wave 0 |
| AICAT-01 | Rule engine matches contains pattern | unit | `uv run pytest tests/services/test_categorization.py::test_rule_engine_contains_match -x` | Wave 0 |
| AICAT-01 | Rule hit_count increments on match | unit | `uv run pytest tests/services/test_categorization.py::test_rule_hit_count_increments -x` | Wave 0 |
| AICAT-02 | LLM called when no rule matches | unit (mocked) | `uv run pytest tests/services/test_categorization.py::test_llm_fallback_called -x` | Wave 0 |
| AICAT-02 | Invalid category_id from LLM rejected | unit (mocked) | `uv run pytest tests/services/test_categorization.py::test_llm_invalid_category_rejected -x` | Wave 0 |
| AICAT-02 | Budget exhausted skips LLM | unit | `uv run pytest tests/services/test_categorization.py::test_budget_exhausted_skips_llm -x` | Wave 0 |
| AICAT-03 | GET /api/v1/transactions?needs_review=true filters AI-suggested | integration | `uv run pytest tests/routers/test_categorization.py::test_needs_review_filter -x` | Wave 0 |
| AICAT-03 | POST /api/v1/transactions/categorize-batch happy path | integration | `uv run pytest tests/routers/test_categorization.py::test_batch_categorize -x` | Wave 0 |
| AICAT-04 | GET /api/v1/categorization-rules lists household rules | integration | `uv run pytest tests/routers/test_categorization.py::test_list_rules -x` | Wave 0 |
| AICAT-04 | DELETE /api/v1/categorization-rules/{id} soft-deletes rule | integration | `uv run pytest tests/routers/test_categorization.py::test_delete_rule -x` | Wave 0 |

### Sampling Rate

- **Per task commit:** `uv run pytest tests/ -k "categoriz" -x`
- **Per wave merge:** `uv run pytest`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/services/test_categorization.py` — unit tests for rule engine, LLM fallback (mocked), budget guard, merchant extractor
- [ ] `tests/routers/test_categorization.py` — router integration tests (4 per endpoint minimum)
- [ ] `tests/unit/test_merchant_extractor.py` — pure unit tests for extract_merchant_name() with various bank description formats
- [ ] No framework install needed — pytest infrastructure already in place

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | JWT handled by existing dependencies.py |
| V3 Session Management | no | Stateless API |
| V4 Access Control | yes | `household_id` scoping on all rule queries; `require_role(ADMIN, MEMBER)` on mutation endpoints |
| V5 Input Validation | yes | Pydantic v2 on all rule inputs; pattern max-length constraint to prevent oversized regex-like strings |
| V6 Cryptography | no | LLM API keys in env vars (not in DB) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-household rule access | Spoofing | `WHERE household_id = :hid` on every query; RLS backup |
| LLM prompt injection via transaction description | Tampering | Send description as data field (not instruction); don't interpolate as system prompt |
| Excessive AI spend via crafted import | Elevation of Privilege | Token budget check before every LLM call batch (D-03) |
| Rule pattern DoS (10,000-char pattern) | DoS | `max_length=200` on pattern field via Pydantic `Field(max_length=200)` |

---

## Open Questions

1. **instructor async API surface with litellm**
   - What we know: instructor wraps litellm; litellm has `acompletion` for async
   - What's unclear: whether `instructor.from_litellm(litellm.acompletion)` is the correct async pattern vs. `instructor.from_litellm(litellm.completion)` used inside `asyncio.to_thread()`
   - Recommendation: Test both in Wave 0's LLM client module; if `acompletion` path fails, use `asyncio.to_thread()` as fallback. Flag in plan as a "verify first" task.

2. **needs_review filter on existing transactions endpoint**
   - What we know: `GET /api/v1/transactions` accepts filter params; `ai_categorized` field exists on Transaction model
   - What's unclear: "Needs review" should map to `ai_categorized=True AND confidence < 0.95` — this requires adding the filter to the existing transactions router without breaking existing callers
   - Recommendation: Add `needs_review: bool = False` query param that translates to `ai_categorized = True AND ai_confidence < 0.95`. Additive change, backward-compatible.

3. **Bulk approve semantics**
   - What we know: "Approve all AI suggestions" confirms pending suggestions (D-09)
   - What's unclear: Does "approve" set `ai_confidence = 1.0` + create rules, or just mark as confirmed (not creating rules for items the AI got right)?
   - Recommendation: Approve = set `ai_categorized = True`, clear the "needs review" state. Do NOT create rules — the AI was correct, no user correction occurred. Rule creation only on category *change*. This is consistent with D-04 ("user corrects" = rule).

---

## Project Constraints (from CLAUDE.md)

Directives the planner must verify compliance with:

| Directive | Implication for Phase 3 |
|-----------|------------------------|
| All routes prefixed `/api/v1/` | `/api/v1/categorization-rules`, `/api/v1/transactions/categorize-batch` |
| API route style: `kebab-case` | `categorization-rules` not `categorization_rules` |
| Money = BIGINT minor units, never floats | Not directly applicable (confidence scores are floats, amounts unaffected) |
| All data household-scoped | Every categorization_rules query includes `household_id` |
| Soft delete: `is_active = FALSE` | `categorization_rules.is_active` not hard-delete |
| Async-first backend | All service functions `async def`; litellm via `acompletion` |
| Pydantic V2: `model_dump()` not `.dict()` | All schemas use `model_config = {"from_attributes": True}` |
| uv for dependencies | `uv add litellm instructor` |
| Logical CSS properties only | AI badge uses `ps-`, `pe-` not `pl-`, `pr-` |
| No physical directional classes | After adding shadcn components, audit for `pl-`, `pr-`, `left-`, `right-` |
| TanStack Query for frontend state | `useCategorizationRules`, `useCategorize` hooks follow existing pattern |
| i18n via next-intl | All badge/button labels in `ar.json` + `en.json` |
| Session handoff note mandatory | Write handoff after each plan unit |
| BackgroundTasks for fire-and-forget | Post-import categorization uses `background_tasks.add_task()` |
| APScheduler for cron | Not needed this phase (nightly job deferred per scope) |
| `transaction:categorized` Supabase event | Emit on channel `household:{id}` after batch completes; frontend invalidates `["transactions"]` |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `instructor.from_litellm(litellm.acompletion)` is the correct async pattern | Standard Stack, Code Examples | Background task blocks event loop; fix: use `asyncio.to_thread()` |
| A2 | Background tasks must create their own DB session | Architecture Patterns (Pattern 4) | Session already closed by the time task runs; would raise InterfaceError |
| A3 | `asyncio.Semaphore` is sufficient for batch concurrency control | Architecture Patterns | No risk — stdlib, well-understood |
| A4 | "Approve" (bulk approve) does NOT create rules | Open Questions #3 | Over-creates rules; degrades rule quality |
| A5 | `ai_usage_tracking.year_month` as TEXT "YYYY-MM" is sufficient for budget period | Code Examples | No risk; simple, avoids date arithmetic |
| A6 | Merchant blocklist needed for payment network tokens | Common Pitfalls (Pitfall 3) | Without blocklist, broad rules collapse unrelated merchants |

---

## Sources

### Primary (HIGH confidence)

- PyPI registry (`curl pypi.org/pypi/{pkg}/json`) — litellm 1.83.4, instructor 1.15.1 versions confirmed
- `docs/03-features/categories.md` — Three-layer pipeline, confidence tiers, batch size (20), feedback loop, API contracts
- `docs/01-architecture.md` §AI Provider System (lines 273-317) — Architecture placeholder for `backend/app/ai/`
- `backend/app/models/transaction.py` — `ai_categorized: bool`, `ai_confidence: float` columns confirmed
- `backend/app/services/import_/import_service.py:499` — BackgroundTask stub location confirmed
- `backend/app/services/transaction.py` — `bulk_categorize()` already exists; existing `BulkCategorizeRequest` schema in transactions router
- `frontend/src/hooks/use-transactions.ts` — `ai_categorized`, `ai_confidence` in Transaction type; existing filter structure
- `backend/app/config.py` — No AI keys defined yet; needs `AI_MODEL`, `LITELLM_API_KEY` additions
- `.planning/phases/03-ai-categorization/03-CONTEXT.md` — All D-01 through D-11 decisions

### Secondary (MEDIUM confidence)

- Existing Alembic migration pattern (`005_create_phase3_tables.py`) — table/index naming conventions verified
- `backend/app/main.py` — Router registration pattern verified

### Tertiary (LOW confidence — flagged in Assumptions Log)

- instructor async API with litellm (A1) — not directly verified against current docs this session
- Background task session lifecycle (A2) — standard FastAPI pattern, not re-verified this session

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified from PyPI registry
- Architecture: HIGH — codebase directly inspected; patterns match existing code
- Pitfalls: MEDIUM — rule engine and litellm patterns are established; async session pitfall is standard FastAPI
- Validation: HIGH — existing test infrastructure confirmed; only new test files needed

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (litellm releases frequently; re-verify version before install)
