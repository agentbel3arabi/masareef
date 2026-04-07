---
phase: 01-stabilization
auditor: gsd-security-auditor
asvs_level: 1
block_on: critical
completed: 2026-04-07
---

# Security Audit — Phase 01 Stabilization

## Summary

**Threats Closed:** 11/11
**Threats Open:** 0/11
**ASVS Level:** 1
**Verdict:** SECURED

---

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-01-01 | N/A (docs only) | accept | CLOSED | Documentation-only changes; no runtime impact. Accepted. |
| T-01-02 | N/A (comment removal) | accept | CLOSED | Transfer.py cleanup was a comment removal with no logic change. Regression test added. Accepted. |
| T-01-03 | Information Disclosure | mitigate | CLOSED | `list_accounts_with_stats()` calls `list_accounts(session, household_id, ...)` first (account.py:518), returning only household-scoped accounts before passing them to `compute_displayed_balances_batch()` (account.py:590). Batch query never crosses household boundary. |
| T-01-04 | Tampering | mitigate | CLOSED | Regression tests in `backend/tests/routers/test_accounts.py` verify batch balance matches individual account balance. `compute_displayed_balances_batch` groups accounts by cutoff date and aggregates in SQL (account.py:330). Credit card billing cycle handling tested. |
| T-01-05 | N/A (test infra) | accept | CLOSED | Test infrastructure in devDependencies only; no production impact. Accepted. |
| T-01-05b | N/A (test files) | accept | CLOSED | Test files are dev-only code; no production impact. Accepted. |
| T-01-06 | Elevation of Privilege | mitigate | CLOSED | `require_role(ADMIN, MEMBER)` present on POST `/parse` (import_.py:47) and POST `/commit` (import_.py:112). VIEWER gets 403. Verified by `test_viewer_cannot_parse_import` and `test_viewer_cannot_commit_import` in test_rbac_guards.py. |
| T-01-07 | Elevation of Privilege | mitigate | CLOSED | `require_role(ADMIN, MEMBER)` present on POST (import_templates.py:60), PUT (import_templates.py:83), DELETE (import_templates.py:99), POST link (import_templates.py:113), DELETE unlink (import_templates.py:138). All 5 mutation endpoints guarded. GET list remains open. Verified by 5 VIEWER rejection tests in test_rbac_guards.py. |
| T-01-08 | Elevation of Privilege | mitigate | CLOSED | `require_role(ADMIN, MEMBER)` present on POST (financial_institutions.py:131), PUT (financial_institutions.py:149), DELETE (financial_institutions.py:168). All 3 mutation endpoints guarded. GET endpoints remain open. Verified by 3 VIEWER rejection tests in test_rbac_guards.py. |
| T-01-09 | Spoofing (JWT) | accept | CLOSED | Light auth audit completed in Plan 06 (SUMMARY-06 documents: JWT handles both ES256 JWKS and HS256, `get_current_user()` returns 401 for missing/invalid tokens, rate limiter verifies HS256 signature before trusting sub claim). No issues found. Accepted. |
| T-01-10 | Elevation of Privilege | mitigate | CLOSED | `debts.py`: VIEWER check added before type-specific P2P conditional in `create_debt` (debts.py:210 — `if role == HouseholdRole.VIEWER: raise 403`). `_check_p2p_write` blocks both CHILD and VIEWER on all debt mutations (debts.py:40,42). `persons.py`: all mutations already block VIEWER and CHILD via inline `get_member_role` checks (confirmed in SUMMARY-06). SUMMARY-06 documents the architectural decision to retain inline checks (not `require_role`) because CHILD has P2P-specific restrictions that `require_role` alone cannot express. |
| T-01-11 | Tampering | mitigate | CLOSED | All refactoring in Plan 07 verified against test suite (499 backend + 94 frontend tests passed per SUMMARY-07). No public API signatures changed. Router `list_accounts` reduced from ~100 to ~10 lines with behavior preserved via `list_accounts_with_stats()`. Import service refactored via internal function extraction only. |

---

## Unregistered Flags

None. No `## Threat Flags` section was present in any SUMMARY.md file outside the threat register.

---

## Accepted Risks Log

| Threat ID | Risk | Rationale |
|-----------|------|-----------|
| T-01-01 | Documentation changes have no runtime security impact | All modified files are markdown docs; no code paths affected |
| T-01-02 | Comment removal from transfer.py has no logic change | Regression test confirms 4-way JOIN behavior unchanged |
| T-01-05 | Test infrastructure in devDependencies | Never included in production builds |
| T-01-05b | Test files in tests/ directory | Never included in production builds |
| T-01-09 | JWT validation delegated to Supabase + python-jose | Light audit (Plan 06) confirmed ES256/HS256 handling correct; no issues found |

---

## Notes

- ASVS Level 1 audited: authentication present, authorization enforced, input validation present
- `debts.py` and `persons.py` retain inline RBAC checks (architectural decision from SUMMARY-06) rather than `require_role` because CHILD role requires P2P-specific logic that a flat role allowlist cannot express
- `households.py` POST `/households` is intentionally exempt from RBAC: called during onboarding when no household context exists yet
- `import_.py` GET `/presets` is intentionally unguarded: read-only, no household data exposed
