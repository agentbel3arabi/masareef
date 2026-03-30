# Phase 1.5: Master Orchestration Plan

> **For agentic workers:** This is a sequencing plan, not an implementation plan. Each unit links to its own detailed plan. Use superpowers:subagent-driven-development or superpowers:executing-plans on the per-unit plans.

---

## Current Status

| Wave | Status | Plan File |
|------|--------|-----------|
| Wave 1 — Infrastructure | ✅ Complete (PRs #16, #17) | `docs/superpowers/plans/upgrade/` |
| Wave 2 — Backend | ✅ Complete (PRs merged) | `docs/superpowers/plans/phase-1.5/wave-2-backend.md` |
| Wave 3 — UI Foundation | ✅ Complete (PRs #19, #20 + 1.5F) | `docs/superpowers/plans/phase-1.5/wave-3-ui-foundation.md` |
| Wave 4 — Page Fidelity | ✅ Complete (PRs #21, #22, #23) | `docs/superpowers/plans/phase-1.5/wave-4-page-fidelity.md` |
| Pre-Wave 5 Audit | ✅ Complete | `docs/superpowers/reports/pre-wave5-audit-2026-03-29.md` |
| Wave 5 — Landing (1.5L) | ✅ Complete (PR #24) | `docs/superpowers/plans/phase-1.5/wave-5-*.md` |
| Wave 5 — Workflow (1.5M) | ✅ Complete (PRs #24, #TBD) | `docs/superpowers/plans/phase-1.5/wave-5-unit-1.5L.md`, `wave-5-unit-1.5M.md` |
| Wave 6 — Bug Fix (Branch 1) | ✅ Complete (PR #25) | `docs/superpowers/plans/phase-1.5/wave-6-bugfix-design.md` |
| Wave 6 — Design Fidelity (Branch 2) | ✅ Complete (PR #26) — page redesigns deferred | `docs/superpowers/plans/phase-1.5/wave-6-bugfix-design.md` |

## Pre-Wave 5 Audit

Full codebase audit completed 2026-03-29 (28 findings: 3 CRITICAL, 12 MAJOR, 13 MINOR). Report: `docs/superpowers/reports/pre-wave5-audit-2026-03-29.md`. All findings assigned to Wave 5 units — no hotfix branches needed. Unit 1.5L absorbs ~2.5 hours of polish fixes alongside the landing page; Unit 1.5M gets the backend route order fix.

## Wave 6 — Bug Fix & Design Fidelity

UAT of Unit 1.5L revealed 18 bugs and design gaps. Wave 6 plan: `docs/superpowers/plans/phase-1.5/wave-6-bugfix-design.md`.

**Branch 1 (`fix/auth-onboarding-bugs`)** — ✅ Complete (PR #25). Fixed:
- Login redirect (cookie pickup via full-page navigation)
- Signup confirmation screen + duplicate email detection (empty identities)
- Onboarding error handling + expanded account creation form
- Transaction creation (try-catch, positive amount_minor)
- Backend multi-household `get_household_id` crash (limit+ordering)
- Onboarding layout Logo SSR fix

**Branch 2 (`fix/design-fidelity-v2`)** — ✅ Complete (PR #26). Shipped:
- Sidebar: collapse/expand toggle with localStorage, help/logout at bottom, RTL-aware icons, aria-labels
- Transactions: floating action button (FAB) for new transaction
- Auth pages: increased logo sizes, fixed login/signup 500 (server/client boundary bug)
- Transaction form: improved spacing, category shows icon + name

**Deferred to dedicated design phase:**
- Accounts page full redesign (matching Stitch 06-accounts.html)
- Transactions page full redesign (matching Stitch 07b-transactions-global.html)
- Account detail page redesign (matching Stitch 07-account-detail.html)

## Next Step

**Phase 1.5 is complete.** All 5 waves (13 units) have been merged to main. Next: Phase 1.75 (Design System & Page Redesign).

---

**Goal:** Close all Phase 1 gaps — infrastructure upgrades, backend completeness, UI foundation, page fidelity, landing page, and workflow formalization — before starting Phase 2 (Import & Templates).

**Design spec:** `docs/superpowers/specs/2026-03-28-phase-1.5-gap-remediation-design.md`

---

## Wave Sequence

```
Wave 1: Infrastructure Upgrade     ← Plans exist (docs/superpowers/plans/upgrade/)
  ├── Unit 1.5A: Next.js 16 + React 19
  └── Unit 1.5B: Tailwind v4 + shadcn base-nova

Wave 2: Backend Completeness       ← Plan: docs/superpowers/plans/phase-1.5/wave-2-backend.md
  ├── Unit 1.5C: Net-worth endpoint + credit card validation
  ├── Unit 1.5D: Category filter child-inclusion + absolute amount filter
  └── Unit 1.5E: Category hierarchy (parent_category_id) + tree endpoint

Wave 3: UI Foundation              ← Plan: written just-in-time after Wave 2 merges
  ├── Unit 1.5F: Error boundaries + toasts + loading skeletons
  ├── Unit 1.5G: Empty states + mobile nav drawer
  └── Unit 1.5H: Auth redesign + onboarding wizard

Wave 4: Page Fidelity              ← Plan: written just-in-time after Wave 3 merges
  ├── Unit 1.5I: Accounts page fidelity
  ├── Unit 1.5J: Transactions page fidelity
  └── Unit 1.5K: Transfers + dashboard + sidebar polish

Wave 5: Landing & Process          ← Plan: written just-in-time after Wave 4 merges
  ├── Unit 1.5L: Landing page
  └── Unit 1.5M: Workflow formalization + roadmap updates
```

---

## Dependencies

```
1.5A ──→ 1.5B ──→ (Wave 2 starts)
                      │
              ┌───────┼───────┐
              ▼       ▼       ▼
            1.5C    1.5D    1.5E (can run in parallel)
              │       │       │
              └───────┼───────┘
                      ▼
               (Wave 3 starts)
              ┌───────┼───────┐
              ▼       ▼       ▼
            1.5F    1.5G    1.5H (1.5F first, then G+H parallel)
              │       │       │
              └───────┼───────┘
                      ▼
               (Wave 4 starts)
              ┌───────┼───────┐
              ▼       ▼       ▼
            1.5I    1.5J    1.5K (can run in parallel)
              │       │       │
              └───────┼───────┘
                      ▼
               (Wave 5 starts)
              ┌───────┴───────┐
              ▼               ▼
            1.5L            1.5M (parallel)
```

---

## Unit Execution Workflow (every unit)

```
1. Plan     → brainstorm/spec already done; write implementation plan if not yet written
2. Execute  → code in feature branch (feature/1.5X-short-slug)
3. PR       → push branch, open PR to main
4. Review   → request GitHub Copilot code review (mandatory)
5. Fix      → address Copilot findings
6. UAT      → user tests against unit-specific checklist
7. Fix      → address UAT findings (if any)
8. Merge    → squash merge to main
```

---

## Branch Naming

| Unit | Branch |
|------|--------|
| 1.5A | `chore/upgrade-nextjs16-react19` |
| 1.5B | `chore/upgrade-tailwind-v4-shadcn-base-nova` |
| 1.5C | `feature/1.5C-net-worth-endpoint` |
| 1.5D | `feature/1.5D-category-child-filter` |
| 1.5E | `feature/1.5E-category-hierarchy` |
| 1.5F | `feature/1.5F-error-boundaries-toasts` |
| 1.5G | `feature/1.5G-empty-states-mobile-nav` |
| 1.5H | `feature/1.5H-auth-redesign-onboarding` |
| 1.5I | `feature/1.5I-accounts-fidelity` |
| 1.5J | `feature/1.5J-transactions-fidelity` |
| 1.5K | `feature/1.5K-transfers-dashboard-sidebar` |
| 1.5L | `feature/1.5L-landing-page` |
| 1.5M | `chore/1.5M-workflow-roadmap-updates` |

---

## Plan File Locations

| Wave | Plan File |
|------|-----------|
| Wave 1 (1.5A) | `docs/superpowers/plans/upgrade/pr1-nextjs16-react19.md` |
| Wave 1 (1.5B) | `docs/superpowers/plans/upgrade/pr2-tailwind-shadcn-base-nova.md` |
| Wave 2 | `docs/superpowers/plans/phase-1.5/wave-2-backend.md` |
| Wave 3 | `docs/superpowers/plans/phase-1.5/wave-3-ui-foundation.md` ✅ |
| Wave 4 | `docs/superpowers/plans/phase-1.5/wave-4-page-fidelity.md` ✅ |
| Wave 5 | Write now (Wave 4 on main) |

---

## Scope Adjustments (from codebase analysis)

The gap analysis spec assumed some features were missing that are actually already implemented. Adjustments:

| Spec Item | Actual Status | Adjustment |
|-----------|---------------|------------|
| Transaction advanced filters (7 dims) | Already implemented in `transaction_service.list_transactions` | Unit 1.5D scope reduced to child-category filter + absolute amount filter |
| Bulk delete + re-categorize | Already implemented in service + router | No new work needed — remove from Unit 1.5D |
| Account update endpoint | Already implemented (`PUT /api/v1/accounts/{id}`) | Remove from Unit 1.5C |
| Category icons | Already in model + seeded on all 18 predefined categories | Remove icon seeding from Unit 1.5E |
| Household base_currency | Already exists in Household model (default "EGP") | Remove migration from Unit 1.5C |

These adjustments mean **Wave 2 is significantly smaller** than originally estimated. Units 1.5C and 1.5D are light; 1.5E (category hierarchy) is the main backend work.

---

## Success Criteria

Phase 1.5 is complete when all 11 success criteria from the design spec (Section 11) are met. The final check is Unit 1.5M which updates the roadmap and documents the workflow.
