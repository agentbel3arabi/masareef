# Phase 1: Stabilization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 01-stabilization
**Areas discussed:** Bug scope & priority, Test coverage depth, Refactoring boundaries, RBAC & security scope, Doc cleanup approach, Plan execution order, CI pipeline changes

---

## Bug Scope & Priority

| Option | Description | Selected |
|--------|-------------|----------|
| Phase-tagged only | Fix only BL-027/028/029 (N+1) and BL-032 (RBAC) — items in STAB requirements. Re-tag BACKLOG. | ✓ |
| All tech-debt items | Fix all 'tech-debt' category items regardless of phase tag | |
| Everything open | Fix all 18 open bugs + tech-debt items | |

**User's choice:** Phase-tagged only
**Notes:** User confirmed re-tagging BACKLOG to match ROADMAP (BL-027/028/029 → Phase 1, BL-032 → Phase 1). Unscheduled items stay unscheduled.

---

## Test Coverage Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Infrastructure + smoke tests | Vitest + RTL + CI, 1 smoke test per page, ~10-15 tests | |
| Meaningful coverage | Same setup + critical user interactions, ~30-50 tests | ✓ |
| Infrastructure only | Just tooling, one example test | |

**User's choice:** Meaningful coverage
**Notes:** All four frontend areas selected (UI components, user flows, utilities, hooks/providers). Backend tests also expanded (service-layer + model tests).

---

## Refactoring Boundaries

| Option | Description | Selected |
|--------|-------------|----------|
| Light cleanup | Remove dead code, fix naming, align imports | |
| Moderate restructuring | + extract shared utilities, standardize service patterns | |
| Deep restructuring | + reorganize modules, shared base classes, data access consistency | ✓ |

**User's choice:** Deep restructuring
**Notes:** Tests must be written BEFORE refactoring for safety. Claude identifies specific refactoring targets during planning.

---

## RBAC & Security Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Basic role checks | Admin can do everything, member gets read + own-data writes | ✓ |
| Full RBAC with permissions | Permissions matrix per resource per role | |
| Guard skeleton only | Default-allow, infrastructure for Phase 10 | |

**User's choice:** Basic role checks
**Notes:** 403 includes required role message. Light auth audit alongside RBAC work (review JWT validation, rate limiting). Not a full security audit.

---

## Doc Cleanup Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Systematic audit | Audit all docs against codebase, fix every discrepancy | ✓ |
| Known conflicts only | Fix known contradictions only | |
| Codebase-driven rewrite | Regenerate docs from codebase state | |

**User's choice:** Systematic audit
**Notes:** None

---

## Plan Execution Order

| Option | Description | Selected |
|--------|-------------|----------|
| Docs → Bugs → N+1 → Tests → RBAC → Refactor | Logical dependency chain, tests before refactor | ✓ |
| Tests → Docs → Bugs → N+1 → RBAC → Refactor | Tests first as safety net for everything | |
| You decide | Claude determines optimal order | |

**User's choice:** Docs → Bugs → N+1 → Tests → RBAC → Refactor
**Notes:** None

---

## CI Pipeline Changes

| Option | Description | Selected |
|--------|-------------|----------|
| Coverage thresholds | pytest-cov + vitest coverage, minimum thresholds | ✓ |
| Stricter type checking | Upgrade pyright basic → standard | |
| Keep CI as-is | Just add frontend test step | |
| You decide | Claude evaluates | |

**User's choice:** Coverage thresholds
**Notes:** Minimum 50% threshold initially. No other CI changes beyond test step + coverage.

---

## Claude's Discretion

- Identify specific refactoring targets during research/planning
- Determine which backend services and models need tests based on risk and complexity

## Deferred Ideas

None — discussion stayed within phase scope.
