---
phase: 01-stabilization
plan: 07
subsystem: backend-frontend
tags: [refactoring, dead-code, font-weights, test-factories, service-layer]
dependency_graph:
  requires: [01-04, 01-05, 01-06]
  provides: [clean-service-layer, shared-test-factories, canonical-font-weights]
  affects: [backend/app/routers/accounts.py, backend/app/services/account.py, backend/app/services/import_/import_service.py, backend/tests/factories.py]
tech_stack:
  added: []
  patterns: [service-layer-extraction, shared-test-factories, font-weight-consolidation]
key_files:
  created:
    - backend/tests/factories.py
  modified:
    - backend/app/routers/accounts.py
    - backend/app/services/account.py
    - backend/app/services/import_/import_service.py
    - backend/tests/routers/test_transactions.py
    - backend/tests/routers/test_debts.py
    - frontend/src/components/layout/mobile-nav-drawer.tsx
    - frontend/src/components/layout/navbar.tsx
    - frontend/src/components/layout/locale-toggle.tsx
    - frontend/src/components/layout/sidebar.tsx
    - frontend/src/app/(app)/debts/page.tsx
    - frontend/src/app/(app)/accounts/page.tsx
    - frontend/src/app/(app)/accounts/bank/[slug]/page.tsx
    - frontend/src/app/(app)/transactions/page.tsx
    - frontend/src/app/(app)/transfers/page.tsx
    - frontend/src/app/(app)/people/page.tsx
    - frontend/src/app/(app)/import/page.tsx
    - frontend/src/app/(auth)/layout.tsx
    - frontend/src/app/(auth)/login/page.tsx
    - frontend/src/app/(auth)/signup/page.tsx
decisions:
  - "Moved _build_account_response from router to service layer as _build_account_dict (pure function, no DB)"
  - "Refactored import_service.py via function extraction rather than file splitting -- single file with focused helpers"
  - "Font weight consolidation applied to layout and app components; shadcn/ui components left unchanged per plan"
metrics:
  duration: 12m
  completed: "2026-04-07T11:44:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 21
---

# Phase 01 Plan 07: Codebase Refactoring Summary

Extracted router business logic to services, created shared test factories, refactored import service for clarity, removed dead code, and consolidated frontend font weights to canonical 400/600.

## Completed Tasks

### Task 1: Extract router business logic to services and create shared test factories

| Metric | Value |
|--------|-------|
| Commit | b79fff0 |
| Files changed | 5 |

**Router extraction:**
- Moved batch query logic (last_tx_date, monthly_stats, institution preloading, balance computation) from `accounts.py` router into `account.py` service as `list_accounts_with_stats()`
- Added `get_account_detail()` service function for single account GET with balance
- Moved `_build_account_response` to service layer as `_build_account_dict()` -- pure function with no DB access
- Router `list_accounts` handler reduced from ~100 lines to ~10 lines
- Router file reduced from 418 to 255 lines total

**Shared test factories:**
- Created `backend/tests/factories.py` with `create_test_account`, `create_test_category`, `create_test_transaction`, `create_test_debt`
- Migrated `test_transactions.py` to import from `tests.factories` (removed 3 local helpers)
- Migrated `test_debts.py` to import from `tests.factories` (removed 1 local helper)
- All 499 backend tests pass after migration

### Task 2: Dead code removal, stale comments, and frontend font weight consolidation

| Metric | Value |
|--------|-------|
| Commit | 0e2b9bb |
| Files changed | 16 |

**Import service refactoring:**
- Extracted `parse_upload()` from 195 lines down to 86 lines via 7 focused helper functions:
  `_parse_rows_csv`, `_parse_rows_excel`, `_parse_rows`, `_dedup_and_complete`, `_parse_pdf`, `_try_linked_template`, `_parse_csv_auto`, `_parse_excel_auto`
- Extracted `_get_account_or_404()` shared between `parse_upload` and `commit_import` (eliminated duplicate account lookup)
- No public API signatures changed

**Dead code audit:**
- `ruff check app/ --select F401`: 0 unused imports found
- `ruff check app/ --select F811,E711`: 0 unreachable code issues
- No stale TODO/FIXME comments found in backend/app/

**Frontend font weight consolidation:**
- Changed `font-medium` (500) to `font-normal` (400) in: sidebar, navbar, mobile-nav-drawer, locale-toggle, debts, import, signup pages
- Changed `font-bold` (700) to `font-semibold` (600) in: accounts, accounts/bank/[slug], transactions, transfers, people, debts, auth/layout, login, signup pages
- `components/ui/` intentionally unchanged (upstream shadcn conventions)
- All 94 frontend tests pass

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

| Check | Result |
|-------|--------|
| `uv run pytest --ignore=tests/integration -x` (excl. pre-existing config failure) | 499 passed |
| `pnpm test` | 94 passed |
| `ruff check app/ --select F401` | 0 errors |
| `grep font-medium frontend/src/components/layout/` | 0 matches |
| `grep font-bold frontend/src/components/layout/` | 0 matches |
| `wc -l backend/app/routers/accounts.py` | 255 (down from 418) |
| `ls backend/tests/factories.py` | exists |

## Self-Check: PASSED
