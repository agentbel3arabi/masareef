---
phase: 03-ai-categorization
plan: "03"
subsystem: backend
tags: [ai, categorization, fastapi, background-tasks, alembic]
dependency_graph:
  requires: ["03-01", "03-02"]
  provides: ["categorization-service", "categorization-router", "needs-review-filter", "schema-migration"]
  affects: ["import-pipeline", "transactions-endpoint"]
tech_stack:
  added: []
  patterns:
    - "background task with own session (RESEARCH.md Pitfall 1 mitigation)"
    - "rule engine first, LLM fallback orchestration pattern"
    - "approve vs correct distinction (D-09 vs D-04)"
key_files:
  created:
    - backend/app/services/categorization.py
    - backend/app/routers/categorization.py
    - backend/tests/routers/test_categorization.py
  modified:
    - backend/app/schemas/categorization.py
    - backend/app/routers/import_.py
    - backend/app/services/import_/import_service.py
    - backend/app/routers/transactions.py
    - backend/app/services/transaction.py
    - backend/app/main.py
    - backend/app/models/__init__.py
    - backend/tests/conftest.py
decisions:
  - "approve_batch sets ai_confidence=1.0 but does NOT create rules (D-09 confirmed)"
  - "apply_correction always upserts a rule with confidence=1.0 (D-04)"
  - "categorize_batch_background creates its own async session to avoid request session reuse (RESEARCH.md Pitfall 1)"
  - "models/__init__.py updated to register CategorizationRule and AIUsageTracking for SQLite test DB"
metrics:
  duration: "~25 minutes"
  completed: "2026-04-08"
  tasks: 2
  files_created: 3
  files_modified: 8
---

# Phase 03 Plan 03: Categorization Service + Router + Schema Push Summary

Categorization orchestration layer: rule engine first, LLM fallback per household budget, correction creates rules (D-04), approval confirms without rules (D-09), import commit fires background task, transactions endpoint gains needs_review filter. Both DB tables pushed to Supabase.

## Tasks Completed

| Task | Description | Status | Commit |
|------|-------------|--------|--------|
| 1 | Categorization service + router + import wiring + needs_review filter | Done | 86c357c |
| 2 | Supabase schema push (alembic upgrade head) | Done | (no new files — migration pre-existed) |
| 3 | Human verify checkpoint | Awaiting | — |

## What Was Built

### Categorization Service (`backend/app/services/categorization.py`)

Four async functions:

- **`categorize_transactions(session, household_id, transaction_ids)`** — loads transactions (household-scoped, T-3-01), applies rule engine per transaction, batches unmatched to LLM if budget allows (via `check_budget`), records token usage, returns `CategorizationResult` list with source="rule"|"ai"|"uncategorized"
- **`apply_correction(session, household_id, transaction_id, category_id)`** — sets category + ai_confidence=1.0, extracts merchant via `extract_merchant_name`, upserts rule at confidence=1.0 (D-04)
- **`approve_batch(session, household_id, transaction_ids)`** — sets ai_confidence=1.0 on AI-categorized transactions, does NOT create rules (D-09)
- **`categorize_batch_background(batch_id, household_id)`** — creates own DB session via `async_session_factory` (RESEARCH.md Pitfall 1 mitigation), loads uncategorized transactions from import batch, calls `categorize_transactions`, commits

### Categorization Router (`backend/app/routers/categorization.py`)

Prefix: `/api/v1/categorization-rules`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/categorize-batch` | Trigger batch categorization |
| POST | `/approve-batch` | Confirm AI suggestions (D-09: no rules) |
| POST | `/correct` | User correction + rule upsert (D-04) |

All endpoints: ADMIN or MEMBER role, household-scoped service calls.

### Import Wiring

- `import_.py` router: added `background_tasks: BackgroundTasks` parameter to `commit_import`
- `import_service.py`: replaced stub comment with `background_tasks.add_task(categorize_batch_background, batch_id, household_id)` after flush

### Transactions Filter

- `routers/transactions.py`: added `needs_review: bool = Query(False)` parameter, passed to service
- `services/transaction.py`: when `needs_review=True`, adds filters `ai_categorized IS TRUE AND ai_confidence < 0.95`

### Schema Push

- `alembic upgrade head` applied migration `a3f8c29d4e71`
- Tables verified: `categorization_rules`, `ai_usage_tracking`
- Indexes verified: `ix_categorization_rules_household`, `ix_categorization_rules_household_active`, `ix_ai_usage_household_month` (unique)

### Tests

8 router integration tests in `tests/routers/test_categorization.py`:
- `test_categorize_batch_empty_list` — empty input → 200 with empty results
- `test_categorize_batch_returns_results` — mocked service results flow through
- `test_approve_batch_returns_count` — approved count returned
- `test_approve_batch_empty` — empty list returns 0
- `test_correct_category_ok` — correction returns ok=True
- `test_correct_category_not_found` — ValueError → 404
- `test_needs_review_filter_true` — filter returns 200 (no AI-categorized txs → empty)
- `test_needs_review_filter_false_no_change` — default filter still returns regular txs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Added CategorizationRule and AIUsageTracking to models `__init__.py`**
- **Found during:** Task 1 (TDD setup)
- **Issue:** SQLite test DB (created via `Base.metadata.create_all`) didn't include the new AI tables because they weren't exported from `app.models.__init__`
- **Fix:** Added imports and `__all__` entries for `AIUsageTracking` and `CategorizationRule` in `app/models/__init__.py`; added both to conftest imports
- **Files modified:** `backend/app/models/__init__.py`, `backend/tests/conftest.py`
- **Commit:** 86c357c

**2. [Rule 3 - Blocking] Copied `.env` from main project to worktree**
- **Found during:** Task 1 (RED phase)
- **Issue:** Worktree had no `.env` file; Settings() raised ValidationError blocking all tests
- **Fix:** Copied `.env` from `/home/gharib/projects/masareef/backend/.env` to worktree backend directory
- **Note:** `.env` not committed (in `.gitignore`)

## Pre-existing Test Failures (Out of Scope)

| Test | Reason | Status |
|------|--------|--------|
| `tests/test_config.py::test_settings_loads_defaults` | Local `.env` has extra CORS origin vs test expectation | Pre-existing |
| `tests/integration/test_transactions_api.py` | Needs real Supabase DB; asyncpg loop conflict in test env | Pre-existing |

563 tests pass when these two are excluded.

## Known Stubs

None — all service functions are fully implemented. Background task wiring is active (not a stub).

## Threat Flags

None — no new network endpoints or auth paths beyond what's in the plan's threat model.

## Self-Check: PASSED

- `/home/gharib/projects/masareef/.claude/worktrees/agent-aef8f594/backend/app/services/categorization.py` — EXISTS
- `/home/gharib/projects/masareef/.claude/worktrees/agent-aef8f594/backend/app/routers/categorization.py` — EXISTS
- `/home/gharib/projects/masareef/.claude/worktrees/agent-aef8f594/backend/tests/routers/test_categorization.py` — EXISTS
- Commit `86c357c` — EXISTS (feat(03-03): categorization service, router, import wiring, needs_review filter)
- Tables `categorization_rules` and `ai_usage_tracking` — VERIFIED IN SUPABASE
- 8/8 categorization tests PASS
