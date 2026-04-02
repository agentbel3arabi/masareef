# Session Handoff Note — Phase 3D-2: Interactive Debts UI (All Waves)

**Date:** 2026-04-03
**PR:** #48 — feat(debts): Phase 3D-2 — Interactive Debts UI
**Branch:** `feature/phase-3d-2-interactive-debts-ui`

---

## 1. What Was Completed

Replaced ALL placeholder tab components with rich interactive UI across 5 waves: shared components, tab rewrites (Loans, P2P, Installments), forms, detail pages, and i18n polish.

### Wave 1: Shared Components (prior session)
- `frontend/src/components/shared/progress-bar.tsx` — Horizontal progress bar (value, colorClass, size, showLabel)
- `frontend/src/components/debts/status-badge.tsx` — Status pill badge (active/completed/overdue/settled/defaulted/pending)
- `frontend/src/components/debts/installment-form.tsx` — Stub placeholder (FormSheet with "Coming soon")

### Wave 2: Tab Rewrites
- `frontend/src/components/debts/loans-tab.tsx` — REWRITTEN: summary stats, expandable LoanCard with APR badge/info grid/progress, lazy-loaded amortization preview, collapsible completed section
- `frontend/src/components/debts/p2p-tab.tsx` — REWRITTEN: person-grouped cards with avatar, relationship badge, balance-by-currency, net balance, expand/collapse debt list

### Wave 3: Installment Tabs (prior session) + Forms
**Installment tabs (prior session):**
- `frontend/src/components/debts/installment-plan-row.tsx` — Reusable installment plan row
- `frontend/src/components/debts/card-utilization-summary.tsx` — Credit card utilization with SVG ring
- `frontend/src/components/debts/financing-app-provider-card.tsx` — BNPL provider card
- `frontend/src/components/debts/card-installments-tab.tsx` — REWRITTEN with per-card grouping
- `frontend/src/components/debts/store-installments-tab.tsx` — REWRITTEN with summary stats + plan cards
- `frontend/src/components/debts/financing-apps-tab.tsx` — REWRITTEN with per-app grouping

**Forms (this session):**
- `frontend/src/components/debts/bank-loan-form.tsx` — FormSheet: 9 fields, currency select, account selector, minor-unit conversion
- `frontend/src/components/debts/p2p-debt-form.tsx` — FormSheet: person select, lent/borrowed toggle, repayment mode
- `frontend/src/components/debts/record-payment-form.tsx` — FormSheet: date, amount, notes with debtId/currency props
- `frontend/src/components/debts/person-form.tsx` — FormSheet: name, name_ar (dir=rtl), phone, email, relationship, notes

**Wiring:**
- `frontend/src/components/debts/loans-tab.tsx` — Modified: Add Loan button + BankLoanForm
- `frontend/src/components/debts/p2p-tab.tsx` — Modified: Add Debt + Add Person buttons + both forms

### Wave 4: Detail Pages
- `frontend/app/(app)/debts/loans/[id]/page.tsx` — Server component route
- `frontend/src/components/debts/loan-detail-content.tsx` — Full amortization table, payment history, record payment + mark as paid
- `frontend/app/(app)/debts/p2p/[id]/page.tsx` — Server component route
- `frontend/src/components/debts/p2p-detail-content.tsx` — Split timeline, lump sum info, payment history, action buttons

### Wave 5: i18n + Polish
- `frontend/messages/en.json` — ~90 new i18n keys across debts.*, persons.* namespaces
- `frontend/messages/ar.json` — Matching Arabic translations for all new keys
- All 14 debts components wired with `useTranslations()` — zero hardcoded English strings remaining (except keyboard event names and the installment-form stub)

---

## 2. Key Decisions & Rationale

- **Expand/collapse pattern**: `useState<number | null>(null)` for single-expanded-item accordion. Simpler than shadcn Accordion for this use case.
- **Amortization preview in LoansTab**: Shows first 3 rows inline, full table on detail page. Avoids fetching full schedule until needed.
- **PersonDebtCard grouping**: P2P tab groups debts by person (not by lent/borrowed). Each person card shows all currencies and net balance. This matches the Stitch design.
- **Split timeline**: P2P detail uses a vertical dot+line timeline (green=paid, red=overdue, gray=upcoming) with logical CSS properties (start/end) for RTL support.
- **Forms use toMinor()**: All money inputs display as decimal (1250.00) but convert to minor units (125000) before API call using `Math.round(parseFloat(value) * Math.pow(10, exponent))`.
- **InstallmentForm deferred**: Left as stub — full form has complex type-specific field visibility that needs its own planning unit.

---

## 3. Known Gaps / Deferred

- **InstallmentForm**: Still a stub with "Coming soon". Needs dedicated planning for CC/store/financing-app field switching logic.
- **Auto-match suggestions**: Loan detail page has space for transaction auto-match but the UI isn't built yet (depends on backend endpoint).
- **Edit forms**: Only "Add" forms exist. Edit/update forms for existing debts not yet built.
- **Delete actions**: No soft-delete UI for debts/persons yet.
- **P2P custom splits**: Form has lump-sum and equal-splits modes. Custom split amounts per installment not yet implemented.

---

## 4. What's Next

- Merge PR #48 after review
- Phase 3D-2 is now complete — move to next phase per roadmap
- Next logical work: Phase 3E (Budgets) or deferred InstallmentForm improvements

---

## 5. PRs

- **PR #48** — feat(debts): Phase 3D-2 — Interactive Debts UI — open, pushed

---

## 6. Test Status

- Unit tests: N/A (frontend components, no unit tests in scope)
- TypeScript: `tsc --noEmit` passes ✅
- CSS audit: zero physical directional classes ✅
- Production build: `pnpm build` passes ✅
- Lint: Not run separately (build includes lint)

---

## 7. Notes / Surprises

- `shadcn base-nova` Avatar uses `<Avatar size="default">` with sizes: "default"(h-8), "sm"(h-6), "lg"(h-10)
- Next.js 16 page params are `Promise<{ id: string }>` — must `await params` in server components
- `PersonResponse.balances.by_currency` is `Record<string, number>` where positive = they owe you
- The `useTranslations()` hook from next-intl accepts dotted namespace paths like `useTranslations("debts.form.loan")`
- Keyboard event `e.key === "Enter"` is NOT a hardcoded UI string — grep patterns should exclude it
