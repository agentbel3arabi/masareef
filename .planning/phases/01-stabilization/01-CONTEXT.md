# Phase 1: Stabilization - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers a clean, documented, and tested codebase — ready to build on without carrying forward known bugs or technical debt. No new features are added. The focus is: fix bugs, eliminate tech debt, add test infrastructure, apply RBAC guards, refactor for consistency, and align all documentation with the actual codebase state.

</domain>

<decisions>
## Implementation Decisions

### Bug Scope & Priority
- **D-01:** Fix only phase-tagged bugs: BL-027 (N+1 FX queries), BL-028 (N+1 list_accounts), BL-029 (N+1 list_transfers), BL-032 (RBAC guards). These are the items explicitly mapped to STAB requirements.
- **D-02:** Re-tag BACKLOG.md to match ROADMAP.md — update BL-027/028/029 from "Phase 4" to "Phase 1" and BL-032 from "Phase 10" to "Phase 1" as part of documentation cleanup (STAB-01).
- **D-03:** Unscheduled tech-debt items (BL-038, BL-039, BL-040, BL-043, BL-044, BL-048) stay unscheduled — picked up opportunistically when working in related areas in future phases.

### Test Coverage Depth
- **D-04:** Meaningful test coverage for both frontend AND backend (not just infrastructure setup).
- **D-05:** Frontend test areas (all four): shared UI components (Button, Card, Dialog, form fields, AppShell), critical user flows (account CRUD, transaction create/edit, import wizard), utility functions (formatAmount, parseAmountMinor, date formatting), hooks & providers (useAuth, useHouseholds, API client hooks).
- **D-06:** Backend test expansion: add service-layer unit tests and model validation tests to fill the empty `tests/services/` and `tests/models/` directories.
- **D-07:** Target ~30-50 frontend tests and meaningful backend service/model test additions.

### Refactoring Boundaries
- **D-08:** Deep restructuring — reorganize module boundaries, introduce shared base classes or mixins where patterns repeat, refactor data access layer for consistency, extract shared utilities, standardize service-layer patterns, remove dead code.
- **D-09:** Tests MUST be written before refactoring. Write tests for existing behavior first, then refactor with confidence that behavior is preserved.
- **D-10:** Claude identifies specific refactoring targets during research/planning based on code quality signals (duplication, inconsistency, complexity).

### RBAC & Security
- **D-11:** Basic role checks — admin can do everything, member gets read + own-data writes. Enough for single-user households and safe for multi-user (Phase 10) later.
- **D-12:** 403 response includes required role: `{"error": {"code": "FORBIDDEN", "message": "Requires admin role"}}` — fits existing error envelope pattern.
- **D-13:** Light auth audit alongside RBAC work — review JWT validation and rate limiting config, fix anything obviously broken. Not a full security audit.

### Documentation Cleanup
- **D-14:** Systematic audit of all doc files against current codebase state. Verify table schemas in 02-data-models.md match actual models, API contracts in feature specs match actual endpoints, CLAUDE.md reflects current state. Fix every discrepancy found.

### Plan Execution Order
- **D-15:** Execute plans in this order: Docs → Bugs → N+1 → Tests → RBAC → Refactor. Docs first (establishes ground truth), bugs (small fixes), N+1 (performance), tests (safety net), RBAC (security), refactor last (uses tests as safety net).

### CI Pipeline
- **D-16:** Add coverage thresholds — pytest-cov for backend, vitest coverage for frontend. Minimum threshold: 50% initially.
- **D-17:** No other CI changes beyond adding frontend test step and coverage thresholds. Keep scope minimal.

### Claude's Discretion
- Claude identifies specific refactoring targets during research/planning (D-10)
- Claude determines which backend services and models need tests based on risk and complexity

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Configuration
- `CLAUDE.md` — Master project guide with coding conventions, API patterns, and tooling
- `.planning/PROJECT.md` — Project vision, constraints, key decisions
- `.planning/REQUIREMENTS.md` — STAB-01 through STAB-07 acceptance criteria
- `.planning/ROADMAP.md` — Phase 1 success criteria and plan list

### Bug & Tech Debt Tracking
- `BACKLOG.md` — All open items with IDs, categories, and phase tags (re-tag BL-027/028/029/032 to Phase 1)

### Architecture & Data Models
- `docs/01-architecture.md` — System design, tech choices, auth flow (source of truth for technical decisions)
- `docs/02-data-models.md` — All table schemas (canonical, verify against actual models during audit)

### Feature Specs (verify against actual endpoints)
- `docs/03-features/accounts.md` — Account API contracts
- `docs/03-features/transactions.md` — Transaction API contracts
- `docs/03-features/transfers.md` — Transfer API contracts
- `docs/03-features/import.md` — Import API contracts
- `docs/03-features/categories.md` — Category API contracts
- `docs/03-features/debts.md` — Debt API contracts

### Testing
- `docs/guides/08-testing.md` — Test strategy, fixtures, coverage requirements

### CI/CD
- `.github/workflows/backend.yml` — Backend CI pipeline
- `.github/workflows/frontend.yml` — Frontend CI pipeline

### Codebase Analysis
- `.planning/codebase/CONCERNS.md` — Known tech debt with file locations and fix approaches
- `.planning/codebase/CONVENTIONS.md` — Current coding patterns
- `.planning/codebase/TESTING.md` — Current test infrastructure and patterns
- `.planning/codebase/STRUCTURE.md` — Directory and module organization

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Backend test fixtures: `backend/tests/conftest.py` has full async test setup (DB, auth, client overrides)
- Backend router tests: 7 test files exist in `backend/tests/routers/`
- Frontend has no test infrastructure — needs Vitest + RTL from scratch
- shadcn/ui components in `frontend/src/components/ui/` — test targets for UI component coverage

### Established Patterns
- Backend: FastAPI dependency injection (get_db_session, get_current_user, get_household_id, get_member_role)
- Backend: Service-layer isolation — business logic in `app/services/`, HTTP in `app/routers/`
- Backend: Pydantic V2 schemas in `app/schemas/` with `model_dump()` exclusively
- Frontend: TanStack Query for server state, Supabase client for auth, next-intl for i18n
- Frontend: App Router with `(app)`, `(auth)`, `(onboarding)` route groups

### Integration Points
- RBAC: `get_member_role()` dependency already exists — needs enforcement logic in routers
- N+1 fixes: `app/services/person.py`, `app/routers/accounts.py`, `app/services/transfer.py`
- CI: `.github/workflows/frontend.yml` needs test step added; both workflows need coverage steps

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User wants comprehensive stabilization with deep restructuring gated behind tests.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-stabilization*
*Context gathered: 2026-04-07*
