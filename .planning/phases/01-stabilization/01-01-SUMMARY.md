---
phase: 01-stabilization
plan: 01
subsystem: docs
tags: [documentation, backlog, roadmap, data-models, feature-specs, architecture]

requires:
  - phase: none
    provides: first plan in stabilization phase
provides:
  - Accurate project documentation aligned with codebase state
  - BACKLOG.md items re-tagged to correct phases per ROADMAP.md
  - Roadmap status updated (Phase 3.8 marked complete)
affects: [all subsequent Phase 1 plans, any plan referencing docs]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - BACKLOG.md
    - CLAUDE.md
    - docs/01-architecture.md
    - docs/02-data-models.md
    - docs/03-features/accounts.md
    - docs/03-features/transactions.md
    - docs/03-features/categories.md
    - docs/03-features/debts.md
    - docs/05-roadmap.md
    - docs/guides/08-testing.md

key-decisions:
  - "Replaced stale institution TEXT column with institution_id FK in accounts table docs"
  - "Marked all AI-related code (app/ai/) as NOT YET IMPLEMENTED -- Phase 3 in architecture doc"
  - "Replaced aspirational file listings in architecture doc with actual codebase contents"

patterns-established: []

requirements-completed: [STAB-01, STAB-02]

duration: 10min
completed: 2026-04-07
---

# Phase 1 Plan 01: Documentation Audit and BACKLOG.md Re-tagging Summary

**Full doc audit aligning 10 documentation files with actual codebase -- fixed 25+ discrepancies across architecture, data models, feature specs, and testing guide; re-tagged 4 backlog items to Phase 1; marked Phase 3.8 complete in roadmap.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-07T10:34:03Z
- **Completed:** 2026-04-07T10:44:47Z
- **Tasks:** 2/2
- **Files modified:** 10

## Accomplishments

### Task 1: Re-tag BACKLOG.md and update roadmap status
- Re-tagged BL-027 (N+1 FX queries), BL-028 (N+1 list_accounts), BL-029 (N+1 list_transfers) from Phase 4 to Phase 1
- Re-tagged BL-032 (RBAC guards) from Phase 10 to Phase 1
- Moved BL-027/028/029 detail sections from "Phase 4" to new "Phase 1 -- Stabilization" section
- Updated backlog summary counts: Phase 1 gained 4 items, Phase 4 lost 3 (18->15), Phase 10 lost 1 (1->0)
- Confirmed BL-038/039/040/043/044/048 remain Unscheduled per D-03
- Marked Phase 3.8 as complete in roadmap overview table, section heading, and dependency graph
- Updated dependency graph: added Phase 3.75 and 3.8 as completed, removed stale "YOU ARE HERE" marker

### Task 2: Systematic doc audit -- verify docs match codebase
- **docs/01-architecture.md:** Fixed Tailwind v3 -> v4; replaced aspirational router listing (14 non-existent files) with actual 12 routers; replaced aspirational model listing with actual 15 model files; replaced aspirational service listing with actual 15 service files; replaced aspirational schema listing with actual 14 schema files; marked AI directory as NOT YET IMPLEMENTED; added dependencies_rbac.py
- **docs/02-data-models.md:** Added 6 missing columns to accounts table (name_ar, institution_id, iban, account_number, account_tier, branch); replaced stale institution TEXT with institution_id FK; added is_system to categories; added payment_day_of_month and payment_frequency to debts; added payment_frequency and institution_type enums; added financial_institutions table; replaced stale reconciliations with reconciliation_records matching ORM; added annual_rate_bps, payment_day_of_month, notes to installment_plans
- **docs/03-features/accounts.md:** Added balance-history and obligations endpoints
- **docs/03-features/transactions.md:** Added last-used-account and summary endpoints; marked transactions/{id}/page as NOT YET IMPLEMENTED
- **docs/03-features/categories.md:** Marked 4 categorization-rules/batch endpoints as NOT YET IMPLEMENTED -- Phase 3
- **docs/03-features/debts.md:** Added GET payments, bulk-payment, bulk-past-payments, and reactivate endpoints
- **docs/guides/08-testing.md:** Replaced skeleton test directory tree with complete actual structure showing all 8 model tests, 10 service tests, 18 router tests, 7 unit tests, 5 integration tests
- **CLAUDE.md:** Fixed router count from 14 to 12

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 2a0acc8 | docs(01-01): re-tag backlog items to Phase 1 and update roadmap status |
| 2 | ffb4eab | docs(01-01): systematic doc audit -- align all docs with actual codebase |

## Deviations from Plan

None -- plan executed exactly as written.

## Self-Check: PASSED

All 10 modified files verified present. Both task commits (2a0acc8, ffb4eab) verified in git log.
