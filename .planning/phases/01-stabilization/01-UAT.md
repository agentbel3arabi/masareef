---
status: complete
phase: 01-stabilization
source:
  - 01-01-SUMMARY.md
  - 01-02-SUMMARY.md
  - 01-03-SUMMARY.md
  - 01-04-SUMMARY.md
  - 01-05-SUMMARY.md
  - 01-06-SUMMARY.md
  - 01-07-SUMMARY.md
started: 2026-04-07T00:00:00Z
updated: 2026-04-07T03:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Backend test suite passes
expected: Run `cd backend && uv run pytest --ignore=tests/integration -x`. All tests pass, 0 failures, coverage ≥ 50%.
result: pass

### 2. Frontend test suite passes
expected: Run `cd frontend && pnpm test`. All 94 tests pass with 0 failures.
result: pass

### 3. VIEWER role is blocked from mutations
expected: A household member with VIEWER role gets a 403 error (with envelope format `{"error": {"code": "FORBIDDEN", ...}}`) when attempting any write operation — creating/editing/deleting accounts, transactions, debts, import runs, import templates, or financial institutions.
result: skipped
reason: covered by passing RBAC guard test suite (14 tests)

### 4. Transfer list shows account names
expected: Navigate to the Transfers page (or call GET /api/v1/transfers). Each transfer entry shows both the source and destination account names (e.g. "CIB Savings → HSBC Current") — not null or empty strings.
result: pass

### 5. Account list loads with correct balances
expected: Navigate to the Accounts page. All accounts display correct balances. No duplicate or missing entries. The page loads in one request without the server issuing N individual balance queries per account.
result: pass

### 6. Font weights look correct in the UI
expected: Open the app and look at the sidebar and navbar. Navigation labels (Home, Accounts, etc.) use normal weight text (not medium/bold). Page headings and card titles use semibold — visually clearly bolder than body text, but not excessively heavy. No text appears thicker than expected for its role.
result: pass

### 7. Import endpoint rejects VIEWER role
expected: A VIEWER role user attempting POST /api/v1/import/parse or POST /api/v1/import/commit receives a 403 response with the error envelope format. ADMIN and MEMBER roles can still parse and commit imports normally.
result: skipped
reason: covered by passing RBAC guard test suite (14 tests)

## Summary

total: 7
passed: 5
issues: 0
pending: 0
skipped: 2

## Gaps

[none]
