---
phase: 01
slug: stabilization
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-07
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| client → API (import) | Untrusted user uploads bank statements and commits transactions | File content, transaction data (sensitive financial) |
| client → API (templates) | Untrusted user creates/modifies import templates | Template config (low sensitivity) |
| client → API (institutions) | Untrusted user creates/modifies financial institutions | Institution metadata (low sensitivity) |
| client → API (accounts) | Account balance data returned to client | Balance aggregations (sensitive financial) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-01-01 | N/A | Documentation files | accept | Documentation-only changes; no runtime impact | closed |
| T-01-02 | N/A | transfer.py cleanup | accept | Comment removal; regression test confirms transfer JOIN correctness | closed |
| T-01-03 | Information Disclosure | compute_displayed_balances_batch | mitigate | `list_accounts()` called first with `household_id` — accounts are household-scoped before reaching batch; no cross-household data leakage possible (account.py:518, 590) | closed |
| T-01-04 | Tampering | Balance computation | mitigate | Regression tests in `test_accounts.py` verify batch balance matches individual balance; SQL aggregation groups by cutoff date | closed |
| T-01-05 | N/A | Test infrastructure | accept | devDependencies only; no production impact | closed |
| T-01-05b | N/A | Test files | accept | Dev-only code; no production impact | closed |
| T-01-06 | Elevation of Privilege | import_.py POST /parse, /commit | mitigate | `require_role(ADMIN, MEMBER)` on both endpoints (import_.py:47, 112); VIEWER rejection verified in `test_rbac_guards.py` | closed |
| T-01-07 | Elevation of Privilege | import_templates.py POST/PUT/DELETE | mitigate | `require_role(ADMIN, MEMBER)` on all 5 mutation endpoints (lines 60, 83, 99, 113, 138); 5 VIEWER rejection tests in `test_rbac_guards.py` | closed |
| T-01-08 | Elevation of Privilege | financial_institutions.py POST/PUT/DELETE | mitigate | `require_role(ADMIN, MEMBER)` on POST, PUT, DELETE (lines 131, 149, 168); 3 VIEWER rejection tests in `test_rbac_guards.py` | closed |
| T-01-09 | Spoofing | JWT validation | accept | Light audit confirmed ES256/HS256 handling correct; 401 on invalid tokens; rate limiter verifies signature before trusting JWT sub | closed |
| T-01-10 | Elevation of Privilege | debts.py, persons.py | mitigate | VIEWER check before P2P conditional in `create_debt`; `_check_p2p_write` blocks VIEWER on all debt mutations; `persons.py` all mutations block VIEWER via inline `get_member_role` checks | closed |
| T-01-11 | Tampering | Business logic extraction | mitigate | 499 backend + 94 frontend tests passed after all refactoring; no public API signatures changed (SUMMARY-07) | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01-01 | T-01-09 | JWT issuance delegated to Supabase (managed service). python-jose handles verification with correct algorithm. Light audit in Plan 06 confirmed no issues. | gsd-security-auditor | 2026-04-07 |
| AR-01-02 | T-01-10 | debts.py and persons.py retain inline RBAC checks (not `require_role`) because P2P-specific logic requires CHILD restrictions that `require_role` alone cannot express. Documented architectural decision in 01-06-SUMMARY.md. | gsd-security-auditor | 2026-04-07 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-07 | 11 | 11 | 0 | gsd-security-auditor (claude-sonnet-4-6) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-07
