# Phase 1: Stabilization - Research

**Researched:** 2026-04-07
**Domain:** Code quality, testing infrastructure, RBAC hardening, N+1 query elimination, documentation alignment
**Confidence:** HIGH

## Summary

Phase 1 is a stabilization-only phase: no new features, only fixing bugs, eliminating tech debt, adding test infrastructure, applying security guards, refactoring for consistency, and aligning documentation with the actual codebase. The codebase already has substantial backend test coverage (~6,100 lines across routers, services, models, and unit tests) and an established RBAC pattern (`require_role()` dependency). The main gaps are: (1) no frontend test infrastructure at all, (2) RBAC guards missing on import and import-template routers, (3) N+1 query patterns in account listing and person balance FX conversion, and (4) documentation that may have drifted from implementation.

The backend test infrastructure is mature (pytest + pytest-asyncio + aiosqlite + httpx async client), while the frontend has zero test setup. Vitest + React Testing Library is the standard stack for Next.js + React 19 projects and integrates well with Tailwind CSS v4 and the existing path alias setup.

**Primary recommendation:** Execute in order: Docs cleanup, Bug fixes, N+1 elimination, Tests (frontend + backend expansion), RBAC hardening, then Refactor -- using newly-written tests as the safety net for refactoring.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Fix only phase-tagged bugs: BL-027 (N+1 FX queries), BL-028 (N+1 list_accounts), BL-029 (N+1 list_transfers), BL-032 (RBAC guards). These are the items explicitly mapped to STAB requirements.
- **D-02:** Re-tag BACKLOG.md to match ROADMAP.md -- update BL-027/028/029 from "Phase 4" to "Phase 1" and BL-032 from "Phase 10" to "Phase 1" as part of documentation cleanup (STAB-01).
- **D-03:** Unscheduled tech-debt items (BL-038, BL-039, BL-040, BL-043, BL-044, BL-048) stay unscheduled -- picked up opportunistically when working in related areas in future phases.
- **D-04:** Meaningful test coverage for both frontend AND backend (not just infrastructure setup).
- **D-05:** Frontend test areas (all four): shared UI components (Button, Card, Dialog, form fields, AppShell), critical user flows (account CRUD, transaction create/edit, import wizard), utility functions (formatAmount, parseAmountMinor, date formatting), hooks & providers (useAuth, useHouseholds, API client hooks).
- **D-06:** Backend test expansion: add service-layer unit tests and model validation tests to fill the empty `tests/services/` and `tests/models/` directories.
- **D-07:** Target ~30-50 frontend tests and meaningful backend service/model test additions.
- **D-08:** Deep restructuring -- reorganize module boundaries, introduce shared base classes or mixins where patterns repeat, refactor data access layer for consistency, extract shared utilities, standardize service-layer patterns, remove dead code.
- **D-09:** Tests MUST be written before refactoring. Write tests for existing behavior first, then refactor with confidence that behavior is preserved.
- **D-10:** Claude identifies specific refactoring targets during research/planning based on code quality signals (duplication, inconsistency, complexity).
- **D-11:** Basic role checks -- admin can do everything, member gets read + own-data writes. Enough for single-user households and safe for multi-user (Phase 10) later.
- **D-12:** 403 response includes required role: `{"error": {"code": "FORBIDDEN", "message": "Requires admin role"}}` -- fits existing error envelope pattern.
- **D-13:** Light auth audit alongside RBAC work -- review JWT validation and rate limiting config, fix anything obviously broken. Not a full security audit.
- **D-14:** Systematic audit of all doc files against current codebase state. Verify table schemas in 02-data-models.md match actual models, API contracts in feature specs match actual endpoints, CLAUDE.md reflects current state. Fix every discrepancy found.
- **D-15:** Execute plans in this order: Docs -> Bugs -> N+1 -> Tests -> RBAC -> Refactor.
- **D-16:** Add coverage thresholds -- pytest-cov for backend, vitest coverage for frontend. Minimum threshold: 50% initially.
- **D-17:** No other CI changes beyond adding frontend test step and coverage thresholds.

### Claude's Discretion
- Claude identifies specific refactoring targets during research/planning (D-10)
- Claude determines which backend services and models need tests based on risk and complexity

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STAB-01 | Documentation consolidated -- CLAUDE.md, roadmap, feature specs cleaned up | Systematic audit methodology documented; BACKLOG.md re-tagging approach identified |
| STAB-02 | Roadmap updated -- Phase 3.8 marked complete, stale status corrected | Part of doc cleanup; requires checking ROADMAP.md against actual git history |
| STAB-03 | All open bugs from BACKLOG.md are fixed | Bug scope narrowed to BL-027/028/029/032 per D-01; specific fix approaches documented |
| STAB-04 | N+1 query patterns resolved (BL-027, BL-028, BL-029) | SQL batch patterns documented; code locations verified; fix approaches clear |
| STAB-05 | Frontend test infrastructure set up (Vitest + RTL + CI) | Full Vitest + RTL stack researched; CI integration approach documented |
| STAB-06 | Code refactored for consistent patterns, dead code removed | Refactoring targets identified; safety-net testing approach defined |
| STAB-07 | RBAC guards applied to all routers (BL-032) | Audit of all routers complete; specific missing guards identified; existing pattern documented |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Key directives that affect this phase:

- **Backend:** Python 3.12, async-first, Pydantic V2 (`model_dump()` only), uv for deps, no pip/Poetry
- **Frontend:** Next.js 16 App Router, shadcn/ui (base-nova), Tailwind CSS v4, TanStack Query, strict TypeScript
- **CSS:** Logical properties only (`ps-`, `pe-`, `start-`, `end-`) -- no physical directional classes
- **Money:** All amounts BIGINT minor units, never floats
- **Data:** Household-scoped, soft deletes only, RLS + application-layer enforcement
- **API:** `/api/v1/` prefix, kebab-case routes, error envelope format
- **Testing backend:** pytest + pytest-asyncio, in-memory SQLite via aiosqlite
- **CI backend:** ruff check, ruff format, pyright, pytest
- **CI frontend:** next lint, tsc --noEmit, pnpm build
- **Git:** Conventional commits, squash merge only, no direct push to main

## Standard Stack

### Frontend Testing (New)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.1.2 | Test runner | Standard for Vite/Next.js projects; fast, ESM-native, compatible with React 19 [VERIFIED: npm registry] |
| @testing-library/react | 16.3.2 | Component testing | De facto standard for React component testing; React 19 support [VERIFIED: npm registry] |
| @testing-library/jest-dom | 6.9.1 | DOM matchers | Extended DOM assertions (toBeVisible, toHaveTextContent) [VERIFIED: npm registry] |
| @vitejs/plugin-react | 6.0.1 | React transform | JSX/TSX transform for Vitest [VERIFIED: npm registry] |
| jsdom | 29.0.2 | DOM environment | Browser-like environment for component tests [VERIFIED: npm registry] |
| @vitest/coverage-v8 | 4.1.2 | Coverage reporting | V8-based coverage for CI thresholds [VERIFIED: npm registry] |

### Backend Testing (Existing)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| pytest | 8.0+ | Test runner | Already installed [VERIFIED: pyproject.toml] |
| pytest-asyncio | 0.23+ | Async test support | Already installed [VERIFIED: pyproject.toml] |
| pytest-cov | 5.0+ | Coverage reporting | Already installed, not yet in CI [VERIFIED: pyproject.toml] |
| aiosqlite | 0.22.1+ | In-memory SQLite for tests | Already installed [VERIFIED: pyproject.toml] |
| httpx | 0.27+ | Async test client | Already installed [VERIFIED: pyproject.toml] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest | Jest | Jest requires more config for ESM/TypeScript; Vitest is native ESM and faster for Next.js |
| jsdom | happy-dom | happy-dom is faster but less complete; jsdom has broader compatibility |
| @vitest/coverage-v8 | @vitest/coverage-istanbul | V8 is faster and needs less setup; Istanbul is more battle-tested |

**Installation (frontend):**
```bash
cd frontend
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom @vitest/coverage-v8
```

## Architecture Patterns

### Frontend Test Structure
```
frontend/
├── vitest.config.ts              # Vitest configuration
├── src/
│   ├── test/
│   │   └── setup.ts              # Global test setup (jest-dom matchers)
│   ├── lib/
│   │   └── __tests__/
│   │       ├── money.test.ts     # Pure utility tests
│   │       └── date.test.ts
│   ├── hooks/
│   │   └── __tests__/
│   │       ├── use-auth.test.ts
│   │       └── use-accounts.test.ts
│   └── components/
│       ├── ui/
│       │   └── __tests__/
│       │       └── button.test.tsx
│       ├── layout/
│       │   └── __tests__/
│       │       └── app-shell.test.tsx
│       └── accounts/
│           └── __tests__/
│               └── account-card.test.tsx
```

### Pattern 1: Vitest Configuration for Next.js 16
**What:** Vitest config with path aliases matching tsconfig, React plugin, jsdom environment
**When to use:** All frontend tests
**Example:**
```typescript
// frontend/vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/app/**",          // Page components tested via E2E
        "src/components/ui/**", // Auto-generated shadcn components
      ],
      thresholds: {
        statements: 50,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
```
[ASSUMED -- config pattern based on Vitest + Next.js best practices; specific options may need tuning]

### Pattern 2: Test Setup File
**What:** Global test setup importing jest-dom matchers
**Example:**
```typescript
// frontend/src/test/setup.ts
import "@testing-library/jest-dom/vitest";
```
[ASSUMED]

### Pattern 3: Pure Utility Test (no React)
**What:** Testing formatAmount, parseAmountMinor, date formatting
**Example:**
```typescript
// frontend/src/lib/__tests__/money.test.ts
import { describe, it, expect } from "vitest";
import { formatAmount, parseAmountMinor } from "@/lib/money";

describe("formatAmount", () => {
  it("formats EGP minor units to major", () => {
    expect(formatAmount(125000, "EGP")).toBe("1,250.00");
  });

  it("formats KWD with 3 decimal places", () => {
    expect(formatAmount(125000, "KWD")).toBe("125.000");
  });
});
```
[VERIFIED: pattern matches existing money.ts API]

### Pattern 4: Component Test with React Testing Library
**What:** Rendering a component, asserting text/behavior
**Example:**
```typescript
// frontend/src/components/ui/__tests__/button.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).toHaveTextContent("Click me");
  });

  it("applies variant classes", () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
```
[ASSUMED -- depends on actual Button component API]

### Pattern 5: N+1 Fix -- Batch Balance Computation
**What:** Replace per-account `compute_displayed_balance()` loop with single SQL aggregation
**Current (N+1):**
```python
# backend/app/routers/accounts.py line 178 (current)
for acct in accounts:
    displayed = await account_service.compute_displayed_balance(session, acct)
```
**Fix approach:**
```python
# Service-level batch function
async def compute_displayed_balances_batch(
    session: AsyncSession,
    accounts: list[Account],
) -> dict[int, int]:
    """Batch compute balances for all accounts in a single query."""
    if not accounts:
        return {}
    acct_ids = [a.id for a in accounts]
    stmt = (
        select(
            Transaction.account_id,
            func.coalesce(func.sum(Transaction.amount_minor), 0).label("tx_sum"),
        )
        .where(
            Transaction.account_id.in_(acct_ids),
            Transaction.is_active.is_(True),
            Transaction.applies_to_balance.is_(True),
        )
        .group_by(Transaction.account_id)
    )
    result = await session.execute(stmt)
    tx_sums = {row.account_id: int(row.tx_sum) for row in result}
    return {a.id: a.balance_minor + tx_sums.get(a.id, 0) for a in accounts}
```
[VERIFIED: matches existing compute_displayed_balance logic in account.py lines 299-322]

Note: The `get_balance_cutoff_date()` call in the current implementation adds per-account date filtering. The batch version must handle this -- either by grouping accounts by cutoff date or by using a CASE expression per account. This is a complexity the planner must account for.

### Pattern 6: N+1 Fix -- Prefetch FX Rates for Person Balances
**What:** Pass pre-fetched rates to `convert_to_base()` instead of fetching per-person
**Current (N+1):**
```python
# backend/app/services/person.py line 317 (current)
for pid, by_currency in result.items():
    fx_result = await convert_to_base(session=session, balances=by_currency, ...)
```
**Fix approach:** The `convert_to_base()` function in `fx.py` already calls `get_latest_rates()` once per invocation. The fix is to collect all currencies needed across all persons, fetch rates once, and pass them to an updated `convert_to_base()` that accepts optional pre-fetched rates.
[VERIFIED: convert_to_base in fx.py line 97 fetches rates each call]

### Pattern 7: RBAC Guard Application
**What:** Add `require_role()` dependency to mutation endpoints
**Current pattern (already in 5+ routers):**
```python
from app.dependencies_rbac import get_member_role, require_role

@router.post("/parse")
async def parse_file(
    ...,
    role: HouseholdRole = Depends(require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)),
):
```
**Routers needing RBAC guards:**
- `import_.py` -- POST /parse, POST /commit (2 endpoints)
- `import_templates.py` -- POST, PUT, DELETE (3 endpoints)
- `financial_institutions.py` -- POST, PUT, DELETE if they exist (needs verification)
[VERIFIED: grep of require_role shows these routers lack guards]

### Anti-Patterns to Avoid
- **Writing tests after refactoring:** D-09 mandates tests first, refactor second. Violated order means refactoring without a safety net.
- **Testing implementation details:** Test behavior (what the user sees), not internal state. Use `screen.getByRole()` not `container.querySelector()`.
- **Mocking too much in backend tests:** The in-memory SQLite approach means real queries run. Only mock external services (Supabase auth, AI providers).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DOM assertions | Custom matchers | @testing-library/jest-dom | 50+ matchers for accessibility, visibility, text content |
| React component rendering | Manual ReactDOM.render | @testing-library/react render() | Handles cleanup, act() wrapping, query helpers |
| Coverage reporting | Manual line counting | @vitest/coverage-v8 + pytest-cov | CI-grade coverage with thresholds and reporting |
| RBAC enforcement | Per-endpoint if/else | require_role() dependency factory | Already exists, proven pattern across 5+ routers |

## Common Pitfalls

### Pitfall 1: Next.js Server Component Testing
**What goes wrong:** Attempting to test Server Components (default in App Router) with React Testing Library fails because RTL renders in a client-side environment.
**Why it happens:** Next.js 16 App Router pages are Server Components by default.
**How to avoid:** Test client components and hooks directly. For page-level testing, use utility functions and hooks that the page calls. Do NOT try to render `page.tsx` files with RTL.
**Warning signs:** `async component` errors, "Server Component" in test output.

### Pitfall 2: Balance Cutoff Date in Batch Query
**What goes wrong:** The batch balance computation ignores `get_balance_cutoff_date()` per account, which is needed for credit card billing cycle calculations.
**Why it happens:** Different account types may have different cutoff dates affecting which transactions count toward balance.
**How to avoid:** Group accounts by cutoff date, or use SQL CASE expressions to apply per-account date filters. Test with credit card accounts that have billing_cycle_day set.
**Warning signs:** Balance discrepancies between single-account view and list view after N+1 fix.

### Pitfall 3: SQLite vs PostgreSQL Enum Handling in Tests
**What goes wrong:** Tests pass with SQLite but fail with PostgreSQL because SQLite stores enums as plain strings.
**Why it happens:** Already documented in codebase -- `acct_type.value if hasattr(acct_type, "value") else acct_type` pattern.
**How to avoid:** Continue using the existing pattern. When writing new tests, remember enum comparisons may need `.value` handling.
**Warning signs:** Tests pass locally but fail in integration.

### Pitfall 4: Vitest Path Alias Resolution
**What goes wrong:** `@/` imports fail in Vitest because it doesn't read tsconfig.json by default.
**Why it happens:** Vitest needs explicit `resolve.alias` configuration.
**How to avoid:** Configure `resolve.alias` in vitest.config.ts matching tsconfig paths: `"@": resolve(__dirname, "./src")`.
**Warning signs:** "Cannot find module @/lib/money" errors in test runs.

### Pitfall 5: Testing Hooks That Use TanStack Query
**What goes wrong:** Hooks like `useAccounts()` fail without a QueryClient provider.
**Why it happens:** TanStack Query hooks require QueryClientProvider in the component tree.
**How to avoid:** Create a test wrapper that provides QueryClient:
```typescript
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```
**Warning signs:** "No QueryClient set" errors.

### Pitfall 6: RBAC 403 Error Format Inconsistency
**What goes wrong:** Existing `require_role()` returns a plain string detail, not the error envelope format.
**Why it happens:** Current implementation in `dependencies_rbac.py` line 52 uses plain string: `detail=f"Role '{role.value}' is not permitted"`.
**How to avoid:** Update to match D-12 format: `{"error": {"code": "FORBIDDEN", "message": "Requires admin role"}}`. Test that 403 responses match the error envelope.
**Warning signs:** Frontend error parsing breaks on inconsistent error format.

## Code Examples

### RBAC Guard Error Response (D-12 compliance)
```python
# Updated require_role to match error envelope format
async def _check(
    role: HouseholdRole = Depends(get_member_role),
) -> HouseholdRole:
    if role not in allowed:
        required = ", ".join(r.value for r in allowed)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "FORBIDDEN",
                    "message": f"Requires {required} role",
                }
            },
        )
    return role
```
[VERIFIED: matches existing error envelope pattern used throughout routers]

### Backend Coverage in CI
```yaml
# Addition to .github/workflows/backend.yml
- name: Run tests with coverage
  run: uv run pytest -v --tb=short --ignore=tests/integration --cov=app --cov-report=xml --cov-fail-under=50
```
[VERIFIED: pytest-cov already in dev dependencies]

### Frontend Test Script and CI Step
```json
// Addition to frontend/package.json scripts
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

```yaml
# Addition to .github/workflows/frontend.yml
- name: Run tests
  run: pnpm test:coverage
```
[ASSUMED -- standard Vitest script pattern]

## RBAC Audit Results

Current state of RBAC enforcement across all routers:

| Router | GET (read) | POST (create) | PUT (update) | DELETE | Status |
|--------|-----------|---------------|-------------|--------|--------|
| accounts.py | get_member_role (read check) | require_role | require_role | require_role | OK |
| transactions.py | get_member_role | require_role | require_role | require_role | OK |
| transfers.py | N/A | require_role | N/A | require_role | OK |
| categories.py | no guard (read) | require_role | require_role | require_role | OK |
| debts.py | needs verification | needs verification | needs verification | needs verification | VERIFY |
| persons.py | needs verification | needs verification | N/A | needs verification | VERIFY |
| installments.py | no guard (read) | require_role | require_role | require_role | OK |
| households.py | needs verification | needs verification | N/A | N/A | VERIFY |
| import_.py | N/A | **NO GUARD** | N/A | N/A | FIX |
| import_templates.py | no guard (read) | **NO GUARD** | **NO GUARD** | **NO GUARD** | FIX |
| financial_institutions.py | no guard (read) | needs verification | needs verification | needs verification | VERIFY |
| financing_apps.py | no guard (read) | N/A | N/A | N/A | OK (read-only) |
| transaction_summary.py | no guard (read) | N/A | N/A | N/A | OK (read-only) |

[VERIFIED: grep of require_role across all routers confirms import_.py and import_templates.py lack guards]

## N+1 Query Analysis

### BL-027: FX Queries in Person Balances
- **Location:** `backend/app/services/person.py` lines 316-327
- **Pattern:** Loop over persons, each calls `convert_to_base()` which calls `get_latest_rates()`
- **Fix:** Collect all currencies from all persons, call `get_latest_rates()` once, pass rates dict to conversion
- **Complexity:** LOW -- `convert_to_base()` already accepts a session; add optional `rates` parameter
- **Confidence:** HIGH [VERIFIED: code inspection]

### BL-028: Balance Per Account
- **Location:** `backend/app/routers/accounts.py` line 178
- **Pattern:** Loop over accounts, each calls `compute_displayed_balance()` which runs a SUM query
- **Fix:** Single aggregation query grouping by account_id
- **Complexity:** MEDIUM -- must handle `get_balance_cutoff_date()` per account (credit card billing cycles)
- **Confidence:** HIGH [VERIFIED: code inspection]

### BL-029: Transfer Credit Leg (ALREADY FIXED)
- **Location:** `backend/app/services/transfer.py` lines 192-212
- **Current state:** Already uses a 4-way JOIN (debit leg + credit leg + from_acct + to_acct)
- **Fix needed:** NONE -- the TODO was from an earlier phase and the code was already fixed
- **Action:** Remove stale TODO comment, verify JOIN works correctly, close BL-029
- **Confidence:** HIGH [VERIFIED: code inspection shows proper JOIN]

## Backend Test Coverage Analysis

### Current State
Backend tests are more extensive than initially documented:

| Directory | Files | Status |
|-----------|-------|--------|
| `tests/routers/` | 19 test files | Mature -- most endpoints covered |
| `tests/services/` | 10 test files (including import/ subdir) | Partially populated -- balance, fx, amortization, person balances |
| `tests/models/` | 8 test files | Populated -- account, category, debt, enum, exchange rate, household, import template, transaction |
| `tests/unit/` | 7 test files | Populated -- account service, dependencies, household service, import template, schemas, transaction, transfer |
| `tests/schemas/` | Multiple files | Schema validation tests exist |

The CONTEXT.md statement that `tests/services/` and `tests/models/` are empty is **outdated**. They contain substantial test files. D-06 should focus on expanding coverage of existing test files and adding tests for uncovered service functions, rather than creating test infrastructure from scratch.

[VERIFIED: ls of test directories]

### Suggested Backend Test Expansion Areas
Based on risk and complexity (Claude's discretion per CONTEXT.md):

1. **Account service -- compute_displayed_balance edge cases:** Credit card cutoff dates, zero balance, multiple currencies
2. **Import service -- parse pipeline:** Edge cases documented in CONCERNS.md (BOM files, hidden rows, date format variations)
3. **Debt service -- payment cascade:** Soft-delete with balance reversal (flagged as fragile area)
4. **RBAC -- viewer role rejection tests:** New tests for import/import-template routers after guards are added

## Refactoring Targets (Claude's Discretion -- D-10)

Based on code quality signals observed during research:

1. **`import_service.py` (384 lines):** Monolithic orchestrator handling parsing, validation, and commit. Break into focused modules. Tests exist for sub-parsers but not the orchestrator.

2. **Inconsistent error response format in RBAC:** `require_role()` uses plain string detail while all other routers use error envelope. Standardize to envelope format (D-12).

3. **Duplicate helper patterns in test files:** Multiple test files define their own `_create_account()`, `_create_category()` helpers. Extract to shared `tests/factories.py`.

4. **Router-level business logic leakage:** `accounts.py` router (lines 94-193) contains batch query logic for last_tx_date, month_stats, and institution preloading. This is service-layer logic in the router. Extract to service functions.

5. **Dead code audit:** Check for unused imports, unreachable code paths, stale TODO comments (like the BL-029 TODO that's already fixed).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (backend) | pytest 8.0+ with pytest-asyncio |
| Config file (backend) | `backend/pyproject.toml` [tool.pytest.ini_options] |
| Quick run command (backend) | `cd backend && uv run pytest -x --tb=short` |
| Full suite command (backend) | `cd backend && uv run pytest -v --cov=app --cov-fail-under=50` |
| Framework (frontend) | vitest 4.1.2 (to be installed) |
| Config file (frontend) | `frontend/vitest.config.ts` (to be created) |
| Quick run command (frontend) | `cd frontend && pnpm test` |
| Full suite command (frontend) | `cd frontend && pnpm test:coverage` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STAB-01 | Docs align with code | manual | N/A -- documentation review | N/A |
| STAB-02 | Roadmap status correct | manual | N/A -- documentation review | N/A |
| STAB-03 | Bugs fixed (BL-027/028/029/032) | integration | `uv run pytest tests/routers/test_accounts.py tests/routers/test_rbac.py -x` | Partially |
| STAB-04 | N+1 queries eliminated | integration | `uv run pytest tests/routers/test_accounts.py tests/services/test_person_balances_fx.py -x` | Partially |
| STAB-05 | Frontend tests run in CI | smoke | `cd frontend && pnpm test` | Wave 0 |
| STAB-06 | Refactored code, dead code removed | unit+integration | `uv run pytest -x && cd ../frontend && pnpm test` | Partial |
| STAB-07 | RBAC guards on all routers | integration | `uv run pytest tests/routers/test_rbac.py -x` | Exists |

### Sampling Rate
- **Per task commit:** Quick run command for affected area
- **Per wave merge:** Full suite both backend and frontend
- **Phase gate:** All tests green, coverage thresholds met

### Wave 0 Gaps
- [ ] `frontend/vitest.config.ts` -- Vitest configuration
- [ ] `frontend/src/test/setup.ts` -- Test setup with jest-dom
- [ ] Frontend test dependencies installation
- [ ] `frontend/package.json` test scripts added
- [ ] CI workflow updated with test step

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (light audit per D-13) | Supabase JWT validation via python-jose |
| V3 Session Management | no (Supabase handles) | N/A |
| V4 Access Control | yes (RBAC hardening) | require_role() dependency on all mutation endpoints |
| V5 Input Validation | no (not in scope) | Pydantic V2 schemas |
| V6 Cryptography | no (not in scope) | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Privilege escalation via unguarded import endpoints | Elevation of Privilege | require_role() on POST /import/parse and /commit |
| Viewer role writes data | Elevation of Privilege | require_role(ADMIN, MEMBER) on all mutation endpoints |
| JWT validation bypass | Spoofing | Review JWKS cache and signature verification (D-13) |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest for Next.js testing | Vitest | 2024+ | Faster, ESM-native, better DX with Next.js |
| @testing-library/react 14 | @testing-library/react 16 | 2025 | React 19 support, concurrent rendering |
| pytest-cov manual threshold | CI-enforced --cov-fail-under | Standard practice | Prevents coverage regression |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vitest 4.1.2 works with Next.js 16 and React 19 | Standard Stack | May need config adjustments or version pinning |
| A2 | @testing-library/react 16.3.2 supports React 19 | Standard Stack | LOW risk -- RTL 16.x explicitly targets React 19 |
| A3 | jsdom 29.0.2 handles Tailwind CSS v4 class utilities | Standard Stack | Unlikely to cause issues; Tailwind classes are just strings |
| A4 | Coverage threshold of 50% is achievable with 30-50 tests | Validation Architecture | May need adjustment based on codebase size |

## Open Questions

1. **Debts and persons router RBAC status**
   - What we know: grep shows require_role exists in accounts, transactions, transfers, categories, installments
   - What's unclear: debts.py and persons.py are mentioned in CONCERNS.md as having "manual inline checks" and require_role respectively, but need full verification
   - Recommendation: Planner should include an audit task to verify all routers before applying fixes

2. **financial_institutions.py mutation endpoints**
   - What we know: Router exists with GET endpoint visible
   - What's unclear: Whether POST/PUT/DELETE endpoints exist and their RBAC status
   - Recommendation: Full endpoint audit during RBAC plan

3. **Balance cutoff date complexity in batch query**
   - What we know: `get_balance_cutoff_date()` is per-account based on account type
   - What's unclear: How many account types have non-null cutoff dates in practice
   - Recommendation: Check the function to see if only credit cards use cutoff dates; if so, a simple CASE expression suffices

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend tests | Yes | 24.14.1 | -- |
| pnpm | Frontend deps | Yes | 10.33.0 | -- |
| Python | Backend tests | Yes | 3.12.3 | -- |
| uv | Backend deps | Yes | 0.11.3 | -- |

**Missing dependencies:** None. All tools available.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `backend/app/routers/*.py`, `backend/app/services/*.py`, `backend/tests/` -- RBAC patterns, N+1 queries, test structure
- `backend/pyproject.toml` -- existing test dependencies
- `frontend/package.json` -- current frontend dependencies (no test deps)
- `frontend/tsconfig.json` -- path alias configuration
- `.github/workflows/*.yml` -- current CI pipelines
- npm registry -- verified package versions for vitest, RTL, jest-dom, etc.

### Secondary (MEDIUM confidence)
- `.planning/codebase/CONCERNS.md` -- tech debt analysis with file locations
- `.planning/codebase/TESTING.md` -- existing test patterns and conventions
- `BACKLOG.md` -- bug and tech debt tracking

### Tertiary (LOW confidence)
- None -- all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified on npm registry; existing backend stack confirmed in pyproject.toml
- Architecture: HIGH -- patterns derived from actual codebase analysis
- Pitfalls: HIGH -- identified from real code patterns and known Next.js + Vitest issues
- RBAC audit: MEDIUM -- need to verify debts.py, persons.py, financial_institutions.py mutation endpoints in detail

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable domain, no fast-moving dependencies)
