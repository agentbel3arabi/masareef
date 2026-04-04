# Session Handoff Note — Phase 3.5: UX Polish Sprint

**Date:** 2026-04-04
**PR:** #51 — Phase 3.5 — UX Polish Sprint
**Branch:** main (squash merged)

---

## 1. What Was Completed

**PR #51 (main implementation):**

**New files:**
- `frontend/src/lib/date.ts` — centralized `formatDate()` and `formatRelativeDate()` utilities (dd/mm/yyyy format)
- `frontend/src/lib/enum-labels.ts` — `formatEnumLabel()` with override map for human-readable enum display
- `frontend/src/components/shared/required-label.tsx` — `<RequiredLabel>` with red asterisk for required fields
- `frontend/src/components/shared/coming-soon-value.tsx` — `<ComingSoonValue>` with Clock icon for placeholder stats
- `frontend/src/components/ui/breadcrumb.tsx` — shadcn breadcrumb component (base-nova, logical CSS audited)
- `frontend/src/components/ui/tooltip.tsx` — shadcn tooltip component (base-nova)

**Modified files:**
- Account cards (bank, credit, other) — added 3-dot dropdown menu, hover states, sub-labels, negative balance warning, status badges
- `create-account-dialog.tsx` — converted from Dialog to FormSheet (side sheet)
- `loan-detail-content.tsx`, `p2p-detail-content.tsx` — added breadcrumbs
- `sidebar.tsx` — disabled items (Budgets, Gam3eya) show Clock icon + "Coming soon" tooltip
- `dashboard/page.tsx` — placeholder stat cards use ComingSoonValue, chart areas use muted/dashed styling
- Transaction/transfer forms — RequiredLabel applied, filter placeholders shortened
- 8+ components — formatDate() applied for dd/mm/yyyy standardization
- FAB component — added tooltip prop
- i18n files — new keys for all added features

**Completion sprint (post-merge fixes):**

**New files:**
- `frontend/src/components/shared/field-error.tsx` — shared inline validation error component

**Modified files:**
- `transaction-form.tsx`, `transaction-row.tsx` — fixed BL-004 (`<SelectValue>` → `<span>` for uncategorized display)
- `transactions/page.tsx`, `transfers/page.tsx` — added Settings icon to Manage buttons
- `loan-detail-content.tsx`, `p2p-detail-content.tsx` — moved actions from inline to navbar via `useNavbarActions`
- `use-debts.ts` — converted `useBulkPastPayments` and `useBulkPayment` to `useApiMutation` with toast feedback
- 8 form components — added inline validation with `<FieldError>` and `submitted` state pattern

---

## 2. Key Decisions & Rationale

- **`useNavbarActions` for detail pages** — extended the existing pattern (used on all list pages) to debt detail pages. Actions appear in the top navbar with `variant="outline" size="sm"` + icon, matching the established UX pattern.
- **`FieldError` component over validation library** — simple `show`/`message` component was sufficient since validation is just required-field checking. No need for Formik, React Hook Form, or Zod at this stage.
- **`<span>` over `<SelectValue>` for custom display** — `<SelectValue>` renders the raw value string when a value is set, ignoring the `placeholder` prop. Always use custom render inside `<SelectTrigger>` when the display needs to differ from the value.
- **`formatDate()` centralized** — all date display goes through `lib/date.ts` to ensure dd/mm/yyyy format (Egyptian convention). Handles both YYYY-MM-DD strings and Date objects.

---

## 3. Known Gaps / Deferred

- **BL-006: Account balance trend indicator** — needs `GET /api/v1/accounts/{id}/balance-history` backend endpoint. Target: Phase 4.
- **BL-007: Account last activity date** — needs most recent transaction date per account. Target: Phase 4.
- **BL-008: Default account for new transaction** — needs last transaction's account_id query. Target: Phase 3.5 (backend-dep).
- **BL-047: Transaction to debt cross-link** — needs `debt_id` exposed in transaction response. Target: Phase 3.5 (backend-dep).
- **BL-034: Frontend test infrastructure** — no tests exist. Target: Unscheduled.

---

## 4. What's Next

- Next phase: Phase 4 — Dashboard & Charts
- First thing to do: Read `docs/03-features/dashboard.md` and `docs/05-roadmap.md` Phase 4 section
- Dependencies: Backend endpoints for BL-009 through BL-013 (transaction summaries, debt stats, chart data)

---

## 5. PRs Merged

- **PR #51** — Phase 3.5 — UX Polish Sprint — merged ✅

---

## 6. Test Status

- Unit tests: N/A (no frontend test infrastructure, BL-034)
- Integration tests: N/A
- CI: frontend build passes ✅

---

## 7. Notes / Surprises

- **`<SelectValue>` gotcha:** The `placeholder` prop on `<SelectValue>` only renders when NO value is set on the Select. Once any value is selected (including sentinel values like `"__uncategorized__"`), `<SelectValue>` renders the raw value string. This caused BL-004. Always use custom JSX inside `<SelectTrigger>` when you need control over the display.
- **useEffect deps in navbar actions:** When placing interactive buttons (with loading states like `markPaid.isPending`) in navbar via `useEffect`, include the loading state in the dependency array so the navbar re-renders when the mutation state changes.
