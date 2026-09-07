---
phase: 03-ai-categorization
plan: "04"
subsystem: frontend
tags: [ai-categorization, transactions, i18n, rtl]
dependency_graph:
  requires: ["03-03"]
  provides: ["ai-badge-ui", "categorization-hooks", "needs-review-filter", "bulk-approve"]
  affects: ["transactions-page"]
tech_stack:
  added: []
  patterns: ["TanStack Query mutation with invalidation", "base-nova Tooltip", "next-intl translations"]
key_files:
  created:
    - frontend/src/components/transactions/ai-badge.tsx
    - frontend/src/hooks/use-categorization.ts
  modified:
    - frontend/src/components/transactions/transaction-row.tsx
    - frontend/src/components/transactions/transaction-filters.tsx
    - frontend/src/components/transactions/bulk-toolbar.tsx
    - frontend/src/hooks/use-transactions.ts
    - frontend/messages/en.json
    - frontend/messages/ar.json
decisions:
  - "TooltipTrigger used without asChild — base-nova render prop pattern not needed here as trigger wraps child directly"
  - "needs_review filter handled by existing generic Object.entries loop in useTransactions — no special-case code needed"
  - "Approve All in BulkToolbar gated by needsReview prop from parent to avoid showing on non-AI-review contexts"
metrics:
  duration_seconds: 202
  completed_date: "2026-04-08"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 6
---

# Phase 03 Plan 04: AI Categorization UI Summary

**One-liner:** Color-coded AI confidence badges on transaction rows, needs-review filter toggle, and batch-approve workflow with AR+EN copy.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | AiBadge component + categorization hooks | da77e9f | ai-badge.tsx, use-categorization.ts |
| 2 | Badge rendering, needs_review filter, bulk approve, i18n | 449a934 | transaction-row.tsx, transaction-filters.tsx, bulk-toolbar.tsx, use-transactions.ts, en.json, ar.json |

## What Was Built

**AiBadge (`ai-badge.tsx`):** Renders a pill badge with three color tiers per D-08 spec — green (`>95%`), yellow (`75-95%`), red (`<75%`). Green tier is display-only; yellow/red show a tooltip "AI suggested — click category to correct". Uses `text-[10px] font-bold` typography per UI-SPEC. No physical directional CSS classes.

**Categorization hooks (`use-categorization.ts`):** Three TanStack Query mutations wrapping the backend categorization API:
- `useCategorizeBatch` → `POST /api/v1/categorization-rules/categorize-batch`
- `useApproveBatch` → `POST /api/v1/categorization-rules/approve-batch`
- `useCorrectCategory` → `POST /api/v1/categorization-rules/correct`
All three invalidate `["transactions"]` on success.

**Transaction row badge rendering:** `AiBadge` renders inline with the category chip in a `flex items-center gap-1` wrapper when `transaction.ai_categorized && transaction.ai_confidence !== null`.

**Needs Review filter:** Toggle button in `TransactionFilterBar` — `variant="default"` when active, `variant="outline"` when inactive. Maps to `needs_review=true` query param via the existing generic `Object.entries` filter serializer in `useTransactions`.

**Bulk Approve:** `BulkToolbar` accepts a `needsReview` prop. When true, renders an "Approve All" button using `useApproveBatch`. Shows `Loader2` spinner while pending. Success shows `approveSuccess` toast with count; failure shows `approveFailed` toast.

**i18n:** `categorization` namespace added to both `en.json` and `ar.json` covering all badge, filter, and toolbar copy strings.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All UI is wired to real backend endpoints defined in Plan 03-03.

## Threat Flags

None. Frontend sends transaction IDs to backend which validates household ownership (T-3-10 accepted per threat model).

## Self-Check: PASSED

- `frontend/src/components/transactions/ai-badge.tsx` — FOUND
- `frontend/src/hooks/use-categorization.ts` — FOUND
- Commit `da77e9f` — FOUND
- Commit `449a934` — FOUND
- No physical directional CSS classes in modified files — CONFIRMED
