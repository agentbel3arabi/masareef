---
phase: 01-stabilization
plan: 05
subsystem: testing
tags: [vitest, react-testing-library, pytest, frontend-tests, backend-tests, tdd]

requires:
  - phase: 01-04
    provides: Vitest + React Testing Library infrastructure, test-utils.tsx

provides:
  - 94 frontend tests across 10 test files covering 4 areas (utilities, UI, forms, hooks)
  - 28 backend tests across 3 test files (services + models)
  - Safety net for refactoring in Plan 07

affects: [01-07, all-future-phases]

tech-stack:
  added: []
  patterns:
    - "base-ui component testing with data-slot selectors (not role queries)"
    - "getAllBy* pattern for React 19 strict mode double-render compatibility"
    - "fireEvent.submit for bypassing jsdom native HTML5 validation"
    - "Mock patterns for next-intl, Supabase client, FormSheet, Select"

key-files:
  created:
    - frontend/src/lib/__tests__/money.test.ts
    - frontend/src/lib/__tests__/utils.test.ts
    - frontend/src/components/ui/__tests__/button.test.tsx
    - frontend/src/components/ui/__tests__/card.test.tsx
    - frontend/src/components/ui/__tests__/dialog.test.tsx
    - frontend/src/components/layout/__tests__/app-shell.test.tsx
    - frontend/src/hooks/__tests__/use-accounts.test.ts
    - frontend/src/hooks/__tests__/use-auth.test.ts
    - frontend/src/components/accounts/__tests__/account-form.test.tsx
    - frontend/src/components/transactions/__tests__/transaction-form.test.tsx
    - backend/tests/services/test_account_service.py
    - backend/tests/services/test_debt_service.py
    - backend/tests/models/test_account_model.py
  modified: []

key-decisions:
  - "Use data-slot selectors instead of role queries for base-ui components to avoid focus guard interference"
  - "Use getAllBy* patterns throughout to handle React 19 strict mode double rendering in jsdom"
  - "Use fireEvent.submit instead of user.click on submit buttons to bypass jsdom native required validation"
  - "Mock FormSheet, Select, CurrencyInput, DatePicker as simple HTML for reliable form testing"

patterns-established:
  - "base-ui testing: query by data-slot attribute, not ARIA role (focus guards create duplicates)"
  - "React 19 strict mode: always use getAllBy*/queryAll* or container.querySelector for elements"
  - "Form testing: use fireEvent.submit to trigger handleSubmit, bypassing jsdom required validation"
  - "Backend unit tests: mock AsyncSession with MagicMock/AsyncMock for service layer testing"

requirements-completed: [STAB-05]

duration: 21min
completed: 2026-04-07
---

# Phase 01 Plan 05: Test Coverage Summary

**94 frontend tests and 28 backend tests providing safety net across money utilities, UI components, account/transaction forms, hooks, and service layer**

## What Was Built

### Frontend Tests (94 tests across 10 files)

**Priority 1 -- Utility Functions (25 tests)**
- `money.test.ts`: formatAmount (all 7 currencies, zero, negative, large), formatAmountAr, parseMajorToMinor (various formats, edge cases), formatWithCurrency
- `utils.test.ts`: cn() class merging, Tailwind conflict resolution, falsy inputs, conditional objects

**Priority 2 -- UI Components (20 tests)**
- `button.test.tsx`: All 6 variants render, click handler, disabled state, className, sizes
- `card.test.tsx`: Composition (Header/Content/Footer), data-slot, size prop
- `dialog.test.tsx`: Open/close, close button toggle, footer rendering

**Priority 3 -- Critical User Flows (21 tests)**
- `account-form.test.tsx`: Form title, inputs, type/currency options, institution selector, validation error, submit with data, closed state, date input
- `transaction-form.test.tsx`: Form title, expense/income toggle, description/amount/date/category/notes fields, submit button, closed state, amount conversion, validation

**Priority 4 -- Layout Components (4 tests)**
- `app-shell.test.tsx`: Sidebar, navbar, children rendering, skip-to-content link

**Priority 5 -- Hooks (10 tests)**
- `use-accounts.test.ts`: Loading, success, error states, correct API path
- `use-auth.test.ts`: Initial state, auth state change, signOut, redirect, cleanup

### Backend Tests (28 tests across 3 files)

**Account Service (11 tests)**
- `compute_displayed_balance`: Zero transactions, with transactions, applies_to_balance filter
- `compute_displayed_balances_batch`: Empty accounts, matches individual, groups by cutoff date
- `get_balance_cutoff_date`: Returns opened_at or None
- IBAN helpers: normalize, validate (valid/invalid)

**Debt Service (6 tests)**
- `soft_delete_debt`: Without payments, preserves payments by default, with delete_transactions (linked/unlinked), payment amount validation, integer enforcement

**Account Model (11 tests)**
- Enum values, nullable constraints, currency length, defaults, FKs, check constraints, name_ar column

## Test Results

- Frontend: `pnpm test` -- 94 passed, 0 failed
- Backend: `pytest --ignore=tests/integration` -- 488 passed, 66% coverage (exceeds 50% threshold)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] base-ui focus guards create duplicate role="button" elements**
- **Found during:** Task 1, Button tests
- **Issue:** base-ui Button renders focus guard elements with role="button", causing `getByRole("button")` to fail with "multiple elements found"
- **Fix:** Used `container.querySelector("[data-slot='button']")` instead of role queries
- **Files modified:** button.test.tsx

**2. [Rule 1 - Bug] React 19 strict mode double-renders all components**
- **Found during:** Task 1, all component tests
- **Issue:** React 19 strict mode double-invokes render functions in development/test, causing all `getByText`/`getByTestId` queries to find multiple elements
- **Fix:** Used `getAllBy*` patterns and `container.querySelector` throughout
- **Files modified:** All component test files

**3. [Rule 3 - Blocking] jsdom native form validation blocks onSubmit**
- **Found during:** Task 1, form submission tests
- **Issue:** `<Input required>` causes jsdom to block form submission via button click, preventing `handleSubmit` from firing
- **Fix:** Used `fireEvent.submit(form)` which bypasses native HTML5 validation
- **Files modified:** account-form.test.tsx, transaction-form.test.tsx

## Self-Check: PASSED
