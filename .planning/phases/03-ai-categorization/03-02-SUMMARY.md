---
phase: 03-ai-categorization
plan: 02
subsystem: backend/ai
tags: [litellm, instructor, llm, budget-guard, categorization, ai]
dependency_graph:
  requires:
    - 03-01  # ai_usage_tracking model (created here as well for parallel execution)
  provides:
    - llm_client.suggest_category
    - llm_client.suggest_categories_batch
    - budget_guard.check_budget
    - budget_guard.record_usage
    - budget_guard.get_usage
  affects:
    - backend/app/ai/
    - backend/app/models/ai_usage_tracking.py
    - backend/app/config.py
tech_stack:
  added:
    - litellm>=1.83.4
    - instructor>=1.15.1
  patterns:
    - instructor.from_litellm(litellm.acompletion) for async structured output
    - asyncio.Semaphore for bounded batch concurrency
    - SELECT FOR UPDATE for race-condition-safe budget reads
    - Atomic UPDATE increment for token usage
key_files:
  created:
    - backend/app/ai/__init__.py
    - backend/app/ai/llm_client.py
    - backend/app/ai/budget_guard.py
    - backend/app/models/ai_usage_tracking.py
    - backend/tests/unit/test_llm_client.py
    - backend/tests/unit/test_budget_guard.py
  modified:
    - backend/pyproject.toml
    - backend/uv.lock
    - backend/app/config.py
    - backend/.env.example
decisions:
  - Use instructor.from_litellm(litellm.acompletion) — async pattern avoids blocking event loop (RESEARCH.md Pitfall 5)
  - CategorySuggestion defined inline in llm_client.py (not imported from Plan 01 schemas) for parallel wave execution independence
  - ai_usage_tracking.py created in this plan (parallel with Plan 01) — Plan 01's version will be identical; merge resolves via squash
  - MagicMock used in test _make_usage helper — SQLAlchemy ORM __new__ bypasses instance state initialization
metrics:
  completed: 2026-04-08
  tasks: 2
  files_created: 6
  files_modified: 4
---

# Phase 03 Plan 02: LLM Client + Budget Guard Summary

**One-liner:** litellm + instructor async LLM client for structured CategorySuggestion output with household token budget enforcement via SELECT FOR UPDATE and atomic increment.

## What Was Built

### Task 1: Dependencies + Config (commit `6e31a69`)

- Installed `litellm>=1.83.4` and `instructor>=1.15.1` via `uv add`
- Added AI config settings to `Settings` class with safe defaults:
  - `AI_MODEL = "claude-3-5-haiku-20241022"`
  - `LITELLM_API_KEY = ""` (empty default — app doesn't crash without it)
  - `AI_MONTHLY_TOKEN_LIMIT = 500000`
  - `AI_BATCH_SIZE = 20`
  - `AI_MAX_CONCURRENCY = 5`
- Updated `.env.example` with AI Categorization section

### Task 2: LLM Client + Budget Guard — TDD (commits `73272d3`, `8d4cafb`)

**RED:** 19 failing tests covering all plan acceptance criteria.

**GREEN:** All 19 tests pass.

**`backend/app/ai/llm_client.py`**
- `CategorySuggestion(BaseModel)` — Pydantic schema with `category_id`, `confidence (ge=0.0, le=1.0)`, `reasoning`
- `_client = instructor.from_litellm(litellm.acompletion)` — async, not sync (Pitfall 5 mitigation)
- `suggest_category()` — validates returned `category_id` against `available_categories` set; returns `None` for hallucinated IDs (Pitfall 2 mitigation); rounds confidence to 4 decimal places
- `suggest_categories_batch()` — `asyncio.Semaphore(max_concurrency)` bounds concurrent LLM calls; returns `list[tuple[int, CategorySuggestion | None]]`
- Prompt injection mitigation (T-3-02): description passed as user content data, not interpolated into instruction text

**`backend/app/ai/budget_guard.py`**
- `get_or_create_usage()` — `SELECT ... FOR UPDATE` on `ai_usage_tracking` row (Pitfall 4 / T-3-03 mitigation)
- `check_budget()` — returns `True` when `monthly_limit is None` (unlimited); `tokens_used < monthly_limit` otherwise
- `record_usage()` — atomic `UPDATE ... SET tokens_used = tokens_used + N` (no read-modify-write)
- `get_usage()` — read-only view for display

**`backend/app/models/ai_usage_tracking.py`**
- `AIUsageTracking` SQLAlchemy model: `household_id`, `year_month` (TEXT "YYYY-MM"), `tokens_used`, `monthly_limit` (nullable = unlimited)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Created ai_usage_tracking.py model in this worktree**
- **Found during:** Task 2 (GREEN phase) — `budget_guard.py` imports `AIUsageTracking` which Plan 01 was supposed to create
- **Issue:** Plan 01 runs in parallel in a separate worktree; model doesn't exist in this worktree's git tree
- **Fix:** Created `backend/app/models/ai_usage_tracking.py` here. Plan 01's version will be identical in schema; squash merge will resolve naturally
- **Files modified:** `backend/app/models/ai_usage_tracking.py`
- **Commit:** `8d4cafb`

**2. [Rule 1 - Bug] Fixed test _make_usage helper to use MagicMock**
- **Found during:** Task 2 (GREEN phase) — `AIUsageTracking.__new__()` bypasses SQLAlchemy instance state initialization, causing `AttributeError: 'NoneType' object has no attribute 'set'`
- **Fix:** Replaced `AIUsageTracking.__new__(AIUsageTracking)` with `MagicMock()` in the test helper
- **Files modified:** `backend/tests/unit/test_budget_guard.py`
- **Commit:** `8d4cafb`

**3. [Rule 1 - Bug] pyproject.toml and config.py changes applied to worktree directly**
- **Found during:** Task 2 — the `uv add` and Edit tool calls from Task 1 went to the main repo, not this worktree
- **Fix:** Re-applied all Task 1 changes (litellm/instructor deps, config settings, .env.example) to the worktree's files and ran `uv sync` in the worktree
- **Files modified:** `backend/pyproject.toml`, `backend/uv.lock`, `backend/app/config.py`, `backend/.env.example`
- **Commit:** `8d4cafb`

## Threat Mitigations Applied

| Threat ID | Mitigation | Location |
|-----------|-----------|----------|
| T-3-02 | Description passed as user content data, not system prompt instruction | `llm_client.py:_build_prompt()` |
| T-3-03 | SELECT FOR UPDATE + atomic UPDATE increment | `budget_guard.py:get_or_create_usage()`, `record_usage()` |
| T-3-06 | Validate `category_id in valid_ids` before returning suggestion | `llm_client.py:suggest_category()` |

## Test Results

```
19 passed in 4.44s
tests/unit/test_llm_client.py — 11 tests
tests/unit/test_budget_guard.py — 8 tests
```

## Self-Check: PASSED

| Item | Status |
|------|--------|
| backend/app/ai/__init__.py | FOUND |
| backend/app/ai/llm_client.py | FOUND |
| backend/app/ai/budget_guard.py | FOUND |
| backend/app/models/ai_usage_tracking.py | FOUND |
| backend/tests/unit/test_llm_client.py | FOUND |
| backend/tests/unit/test_budget_guard.py | FOUND |
| .planning/phases/03-ai-categorization/03-02-SUMMARY.md | FOUND |
| commit 6e31a69 | FOUND |
| commit 73272d3 | FOUND |
| commit 8d4cafb | FOUND |
