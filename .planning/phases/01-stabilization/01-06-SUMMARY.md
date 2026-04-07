---
phase: 01-stabilization
plan: 06
subsystem: backend-auth
tags: [rbac, security, auth-audit]
dependency_graph:
  requires: [01-05]
  provides: [rbac-enforcement, error-envelope-403]
  affects: [import, import-templates, financial-institutions, debts]
tech_stack:
  added: []
  patterns: [require_role-dependency-guard, error-envelope-format]
key_files:
  created:
    - backend/tests/routers/test_rbac_guards.py
  modified:
    - backend/app/dependencies_rbac.py
    - backend/app/routers/import_.py
    - backend/app/routers/import_templates.py
    - backend/app/routers/financial_institutions.py
    - backend/app/routers/debts.py
    - BACKLOG.md
decisions:
  - "debts.py and persons.py retain inline RBAC checks (get_member_role + manual checks) because they need CHILD-specific P2P logic that require_role alone cannot express"
  - "households.py POST /households exempt from RBAC -- no household context exists during onboarding"
  - "import_.py GET /presets remains unguarded -- read-only endpoint available to all roles"
metrics:
  duration: 373s
  completed: "2026-04-07T11:30:11Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 7
---

# Phase 01 Plan 06: RBAC Enforcement Summary

Applied require_role guards to all unprotected mutation endpoints (import, import-templates, financial-institutions), standardized 403 error response to envelope format, fixed VIEWER gap in debts.py create_debt, completed light auth audit.

## Changes Made

### Task 1: Standardize RBAC error format and apply guards

**Error format standardization:**
- Updated `require_role()` in `dependencies_rbac.py` to return error envelope format: `{"error": {"code": "FORBIDDEN", "message": "Requires admin, member role"}}`
- Previous format was a plain string which didn't match the project's error envelope convention

**Import router (`import_.py`):**
- Added `require_role(ADMIN, MEMBER)` to POST `/parse` and POST `/commit`
- GET `/presets` remains unguarded (read-only)

**Import templates router (`import_templates.py`):**
- Added `require_role(ADMIN, MEMBER)` to all 5 mutation endpoints: POST (create), PUT (update), DELETE (delete), POST (link), DELETE (unlink)
- GET (list) remains unguarded

**Financial institutions router (`financial_institutions.py`):**
- Added `require_role(ADMIN, MEMBER)` to POST (create), PUT (update), DELETE (delete)
- GET endpoints remain unguarded

**Debts router audit:**
- Fixed gap: `create_debt` only blocked VIEWER for P2P debt types, not for bank_loan. Moved VIEWER check before type-specific checks so all debt creation is blocked for VIEWER.
- All other mutation endpoints already block VIEWER via `_check_p2p_write` inline checks
- Retains inline checks (not `require_role`) because CHILD role has P2P-specific restrictions

**Persons router audit:**
- All mutations (create, update, delete) already block VIEWER and CHILD via inline checks
- No changes needed -- adequately guarded

**Households router audit:**
- POST `/households` exempt from RBAC: called during onboarding when user has no household yet
- GET `/auth/household-status` is read-only, no RBAC needed

**Light auth audit (D-13):**
- JWT validation: properly handles both ES256 (JWKS) and HS256 algorithms
- `get_current_user()`: validates JWT, extracts `sub`, returns UUID. Returns 401 for missing/invalid tokens
- Rate limiter: verifies HS256 signature before trusting JWT sub claim, falls back to IP
- No security issues found

### Task 2: Comprehensive RBAC guard tests and BL-032 closure

- Created `test_rbac_guards.py` with 14 tests
- VIEWER rejection tests for all guarded mutation endpoints (8 endpoints)
- Error envelope format verification test
- MEMBER pass-through tests (non-403)
- VIEWER read access tests (GET still allowed)
- Marked BL-032 as Done in BACKLOG.md

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed VIEWER gap in debts.py create_debt**
- **Found during:** Task 1, Step 5 (debts.py audit)
- **Issue:** VIEWER role could create bank_loan debts -- the VIEWER check was only inside the P2P conditional
- **Fix:** Moved `if role == HouseholdRole.VIEWER` check before the type-specific conditional so it blocks all debt creation
- **Files modified:** backend/app/routers/debts.py
- **Commit:** 079fba4

## Verification Results

| Check | Result |
|-------|--------|
| RBAC guard tests (14/14) | PASSED |
| require_role in import_.py | 3 (1 import + 2 guards) |
| require_role in import_templates.py | 6 (1 import + 5 guards) |
| require_role in financial_institutions.py | 4 (1 import + 3 guards) |
| FORBIDDEN in dependencies_rbac.py | Present |
| BL-032 in BACKLOG.md | Done |
| Full test suite (excl integration + pre-existing config) | 499 passed |

## Commits

| Hash | Message |
|------|---------|
| 36a0a75 | test(01-06): add failing RBAC guard tests for viewer role rejection |
| 079fba4 | feat(01-06): standardize RBAC error format and apply guards to unprotected routers |
| 62c308d | test(01-06): comprehensive RBAC guard tests and close BL-032 |
