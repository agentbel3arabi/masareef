---
phase: 03-ai-categorization
plan: "01"
subsystem: backend
tags: [ai, categorization, rule-engine, migration, orm, pydantic]
dependency_graph:
  requires: []
  provides:
    - categorization_rules table (migrated)
    - ai_usage_tracking table (migrated)
    - CategorizationRule ORM model
    - AIUsageTracking ORM model
    - apply_rule_engine / upsert_rule / load_active_rules
    - extract_merchant_name
    - Pydantic schemas: RuleCreate, RuleResponse, CategorySuggestion, BatchCategorizationRequest
  affects:
    - Plans 03-02 through 03-05 (all depend on rule engine and ORM models)
tech_stack:
  added: []
  patterns:
    - TDD red-green cycle for unit tests
    - AsyncMock pattern for SQLAlchemy async session mocking
    - Household-scoped queries (T-3-01 mitigation)
key_files:
  created:
    - backend/alembic/versions/011_add_categorization_tables.py
    - backend/app/models/categorization_rule.py
    - backend/app/models/ai_usage_tracking.py
    - backend/app/ai/__init__.py
    - backend/app/ai/merchant_extractor.py
    - backend/app/ai/rule_engine.py
    - backend/app/schemas/categorization.py
    - backend/tests/unit/test_merchant_extractor.py
    - backend/tests/services/test_categorization.py
  modified: []
decisions:
  - "max_tokens=1 default in extract_merchant_name — plan behavior spec says CARREFOUR CITY STARS → CARREFOUR (single token); action code said max_tokens=2 which conflicts; behavior spec is authoritative"
  - "ai_usage_tracking.household_id is NOT a FK — per plan spec, allows lightweight tracking without join constraints"
  - "Rule engine uses load_active_rules then Python-level iteration for contains match — simpler than DB-level LIKE, correct per plan spec"
metrics:
  duration_seconds: 246
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_created: 9
  files_modified: 0
---

# Phase 03 Plan 01: DB Schema, Rule Engine, Merchant Extractor Summary

**One-liner:** Alembic migration for categorization_rules + ai_usage_tracking tables, CategorizationRule/AIUsageTracking ORM models, contains-match rule engine with confidence ordering and hit-count tracking, first-token merchant extractor with payment-network blocklist, 17 passing unit tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Alembic migration + ORM models + Pydantic schemas | 01db538 | 011_add_categorization_tables.py, categorization_rule.py, ai_usage_tracking.py, categorization.py, ai/__init__.py |
| 2 (RED) | Failing tests for merchant extractor and rule engine | f33d8ec | test_merchant_extractor.py, test_categorization.py |
| 2 (GREEN) | Rule engine + merchant extractor implementation | a57dbf9 | merchant_extractor.py, rule_engine.py |

## Verification Results

- `uv run pytest tests/unit/test_merchant_extractor.py tests/services/test_categorization.py -x -v` — 17 passed, 2 warnings
- `uv run python -c "from app.models.categorization_rule import CategorizationRule; ..."` — OK
- `uv run python -c "from app.schemas.categorization import RuleCreate, RuleResponse, ..."` — OK

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] max_tokens default corrected from 2 to 1**

- **Found during:** Task 2 TDD GREEN phase
- **Issue:** Plan action code specified `max_tokens: int = 2` but plan behavior spec states `extract_merchant_name("CARREFOUR CITY STARS 0284") returns "CARREFOUR"` (single token). With `max_tokens=2`, the function returned `"CARREFOUR CITY"`.
- **Fix:** Changed default to `max_tokens: int = 1` to match the authoritative behavior spec. Callers can still pass `max_tokens=2` explicitly when multi-token output is desired.
- **Files modified:** `backend/app/ai/merchant_extractor.py`
- **Commit:** a57dbf9

## Known Stubs

None — this plan is purely backend infrastructure with no UI components.

## Threat Surface Scan

No new network endpoints or auth paths introduced in this plan. All files are internal backend modules (models, services, migration). The categorization_rules table has RLS-ready household_id scoping as required by T-3-01.

## Self-Check: PASSED

- [x] `backend/alembic/versions/011_add_categorization_tables.py` — exists
- [x] `backend/app/models/categorization_rule.py` — exists
- [x] `backend/app/models/ai_usage_tracking.py` — exists
- [x] `backend/app/ai/__init__.py` — exists
- [x] `backend/app/ai/merchant_extractor.py` — exists
- [x] `backend/app/ai/rule_engine.py` — exists
- [x] `backend/app/schemas/categorization.py` — exists
- [x] `backend/tests/unit/test_merchant_extractor.py` — exists
- [x] `backend/tests/services/test_categorization.py` — exists
- [x] Commit 01db538 — verified
- [x] Commit f33d8ec — verified
- [x] Commit a57dbf9 — verified
