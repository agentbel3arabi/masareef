# Wave 4: Page Fidelity — Design Spec

**Date:** 2026-03-29
**Status:** Approved
**Scope:** Bring all Phase 1 pages to full Stitch fidelity — accounts, transactions, transfers, dashboard, and sidebar — plus a site-wide logo audit pass

---

## 1. Context

Wave 3 is complete (Units 1.5F, 1.5G, 1.5H merged). The app now has error boundaries, toasts, loading skeletons, empty states, mobile nav, a polished auth flow, and a working onboarding wizard. Wave 4 closes the remaining visual gap between the current pages and the Stitch designs before Wave 5 (landing page + workflow formalization).

All three Wave 4 units run in parallel after Wave 3 merges to main.

```
Wave 3 merged
      ↓
┌─────────┬─────────┬──────────┐
│  1.5I   │  1.5J   │  1.5K    │
│Accounts │Transact.│Transfers │
│Fidelity │Fidelity │+Dashboard│
│         │         │+Sidebar  │
└─────────┴─────────┴──────────┘
      ↓ (all three merge to main)
   Wave 5 starts
```

---

## 2. Brand Decision: Tagline

**Decided:** The official Masareef tagline is:

> **فلوسك متظبطة بالقرش**

- Egyptian Arabic dialect — authentic and conversational
- "القرش" (piaster) is a MENA cultural anchor implying precision down to the smallest unit
- "متظبطة" conveys confident, complete control
- **Always displayed in Arabic regardless of UI locale** — it is a brand element, not UI copy
- Replaces the Stitch-generated placeholder "The Financial Atelier" everywhere in the codebase

**Affected locations:**
- Sidebar (below logo)
- Auth pages left panel (login, signup) — verify in 1.5H output
- Landing page navigation bar — handled in Wave 5 (Unit 1.5L)

**Action required:** Remove all instances of "The Financial Atelier" from the codebase during 1.5K implementation. Do not use it anywhere.

---

## 3. Logo Audit Decision

**Problem:** Logo sizes are too small across all placements:
- Sidebar expanded: `width={140} height={32}` inside a `h-16` (64px) container — undersized
- Mobile navbar icon: `width={28} height={28}` inside `h-16` — very small (this is the "collapsed" state on mobile)

**Fix (Task 0 in Unit 1.5K):**

| Placement | Current | Target | Component |
|---|---|---|---|
| Sidebar (expanded, horizontal) | 140×32 | 160×40 | `sidebar.tsx` |
| Mobile navbar (icon) | 28×28 | 36×36 | `navbar.tsx` |
| Auth left panel | Set in 1.5H | Verify ≥ 48px height | `(auth)/layout.tsx` |
| Onboarding | Set in 1.5H | Verify ≥ 40px height | `(onboarding)/layout.tsx` |
| Landing page | Not yet built | Wave 5 sets sizes | — |

**Code change:** Add a `LOGO_SIZES` constants object in `logo.tsx` so all placements use named sizes, not magic numbers:

```tsx
export const LOGO_SIZES = {
  sidebar: { width: 160, height: 40 },
  mobileNav: { width: 36, height: 36 },
  authPanel: { width: 180, height: 44 },
  onboarding: { width: 160, height: 40 },
} as const;
```

---

## 4. Unit 1.5I: Accounts Page Fidelity

**Branch:** `feature/1.5I-accounts-fidelity`
**Stitch refs:** `docs/stitch-designs/html/06-accounts.html`, `docs/stitch-designs/html/07-account-detail.html`

### 4.1 Net Worth Summary Bar

- Green gradient header at top of accounts page
- Displays: total net worth (from `GET /api/v1/accounts/net-worth`), account count, currency count
- Multi-currency breakdown available on expand/click
- Responsive: stacks vertically on mobile
- Uses skeleton from Unit 1.5F during load

### 4.2 Credit Card Utilization Bars

- Progress bar below balance on `credit_card` and `financing_app` account cards
- Calculation: `utilization = (abs(balance) / credit_limit) * 100`
- Color thresholds: green (<50%), amber (50–80%), red (>80%)
- Label row: "X% utilized" start-aligned, "Limit: {formatted_limit}" end-aligned
- Only rendered when `credit_limit` is set and > 0

### 4.3 Credit Card Billing Info

- `billing_cycle_day` and `payment_due_day` fields in create/edit account form (conditional: only for `credit_card` and `financing_app` types)
- On account card: "Payment due in X days" badge
- Badge color: green (>7 days), amber (3–7 days), red (≤3 days or overdue)

### 4.4 Edit/Delete Actions

- Pencil + trash icon buttons appear on account card hover
- Edit: opens dialog pre-filled with current values
- Delete: opens confirmation dialog
- Confirmation warns if account has transactions: "This account has N transactions. The account will be hidden but transaction history is preserved."

### 4.5 Category Icons

- Transaction rows in account detail page show category icon + name
- Category dropdown in transaction form shows icon alongside name

### Acceptance Criteria

- [ ] Net worth bar displays with correct multi-currency aggregation
- [ ] Utilization bars render with correct color thresholds
- [ ] Credit card billing fields appear/hide based on account type
- [ ] Payment due badge shows correct countdown
- [ ] Edit/delete actions work from account cards
- [ ] Category icons visible in transaction rows and dropdowns
- [ ] Page visually matches Stitch screen 06 at functional fidelity level
- [ ] RTL layout correct (logical CSS only — no `pl-`, `pr-`, `left-`, `right-`)
- [ ] CI green

---

## 5. Unit 1.5J: Transactions Page Fidelity

**Branch:** `feature/1.5J-transactions-fidelity`
**Stitch ref:** `docs/stitch-designs/html/07b-transactions-global.html`

### 5.1 Advanced Filter Bar

Horizontal bar above transaction table:
- Search input (existing — restyle to match Stitch)
- Account dropdown (all active accounts, "All Accounts" default)
- Category dropdown (hierarchical with icons, "All Categories" default)
- Type segmented control: All / Debit / Credit
- Date range: from/to date inputs
- Amount range: min/max inputs (currency-aware minor unit formatting)
- "Reset filters" button — clears all to defaults

Responsive: wraps to 2 rows on tablet, stacks vertically on mobile.

### 5.2 Bulk Manage Mode

- "Manage" toggle button in page header → activates bulk mode
- Bulk mode: checkboxes on each row + "Select All" in header
- Floating toolbar when items selected: "X selected" count, "Delete" button, "Re-categorize" dropdown
- Delete: confirmation dialog → bulk-delete API → success toast
- Re-categorize: category picker → bulk-categorize API → success toast
- "Cancel" exits bulk mode and deselects all

### 5.3 Account Pills

- Each transaction row shows a colored badge with the account name
- Badge color maps to account type: blue (bank), purple (credit card), green (cash), orange (digital wallet), amber (financing app)
- Clicking the pill navigates to account detail page

### 5.4 Transaction Row Polish

- Category badge: icon + color dot + name
- Notes: secondary text below description (smaller, muted)
- Edit/delete ghost icon buttons appear on row hover, hidden by default
- Dates: locale-aware formatting via `next-intl`

### Acceptance Criteria

- [ ] All 7 filter dimensions rendered in filter bar
- [ ] Filters compose correctly and update results in real time
- [ ] "Reset filters" clears all filters to defaults
- [ ] Bulk manage: select, delete, re-categorize all work end-to-end
- [ ] Account pills visible with correct type colors, clicking navigates to account
- [ ] Category icons in badges
- [ ] Hover actions on rows
- [ ] Page visually matches Stitch screen 07b at functional fidelity level
- [ ] RTL layout correct
- [ ] CI green

---

## 6. Unit 1.5K: Transfers + Dashboard + Sidebar Polish

**Branch:** `feature/1.5K-transfers-dashboard-sidebar`
**Stitch refs:** `docs/stitch-designs/html/05-dashboard.html`

### 6.1 Logo Audit Pass (Task 0 — do this first)

See Section 3 above for full details.

Steps:
1. Add `LOGO_SIZES` constants to `logo.tsx`
2. Update `sidebar.tsx` to use `LOGO_SIZES.sidebar`
3. Update `navbar.tsx` to use `LOGO_SIZES.mobileNav`
4. Check auth page and onboarding logo sizes from 1.5H — resize to targets if needed
5. Grep for "The Financial Atelier" across entire codebase — remove every instance
6. Add tagline "فلوسك متظبطة بالقرش" below the logo in the sidebar (small, muted text, always Arabic)

### 6.2 Transfers Page Polish

- From/to accounts rendered as mini account cards: account type icon + name + institution
- Amount colorized: outgoing red (source account), incoming green (destination)
- Date formatted consistently with transactions page (locale-aware, `next-intl`)
- Delete confirmation dialog styled consistently with account delete pattern

### 6.3 Dashboard Placeholder Upgrade

Replace the current text placeholder with a structured preview:
- 4 stat card skeletons with icons and labels: "Net Worth", "Monthly Spending", "Active Debts", "Upcoming (30d)"
- Each card shows a "Coming in Phase 4" badge
- 2 chart placeholder areas below cards with "Charts coming soon" message
- Purpose: gives users a visual sense of what's coming, not a blank page

### 6.4 Sidebar Polish

- Active nav item: primary-colored text + 2px accent border on the start edge (matches Stitch sidebar)
- Section grouping with small muted section labels:
  - **Overview:** Dashboard
  - **Finance:** Accounts, Transactions, Transfers
  - **Planning:** Debts, Budgets (items dimmed/disabled — routes don't exist yet)
  - **Settings:** Settings
- Tagline "فلوسك متظبطة بالقرش" displayed below the logo in the sidebar header (small, muted, always Arabic)
- No "The Financial Atelier" anywhere

### Acceptance Criteria

- [ ] Logo sizes updated at all placements per Section 3 targets
- [ ] No instance of "The Financial Atelier" remains in the codebase
- [ ] Tagline "فلوسك متظبطة بالقرش" visible in sidebar below logo
- [ ] `LOGO_SIZES` constants used everywhere — no magic numbers
- [ ] Transfers page shows mini account cards for from/to
- [ ] Transfer amounts colorized correctly
- [ ] Dashboard shows 4 stat card skeletons with "Coming in Phase 4" badges
- [ ] Sidebar has section grouping with muted labels
- [ ] Active nav item has start-border accent
- [ ] Planning items (Debts, Budgets) are dimmed/disabled
- [ ] RTL layout correct
- [ ] CI green

---

## 7. Stitch References Summary

| Unit | Stitch Files |
|---|---|
| 1.5I | `06-accounts.html`, `07-account-detail.html` |
| 1.5J | `07b-transactions-global.html` |
| 1.5K | `05-dashboard.html` |

---

## 8. Files Affected (Overview)

### Unit 1.5I
| File | Change |
|---|---|
| `frontend/src/app/(app)/accounts/page.tsx` | Add net worth bar, utilization bars, billing badge, edit/delete actions |
| `frontend/src/app/(app)/accounts/[id]/page.tsx` | Add category icons to transaction rows |
| `frontend/src/components/accounts/net-worth-bar.tsx` | NEW |
| `frontend/src/components/accounts/utilization-bar.tsx` | NEW |
| `frontend/src/components/accounts/billing-badge.tsx` | NEW |
| `frontend/src/hooks/use-accounts.ts` | Add net-worth query |
| `frontend/messages/en.json` | Add i18n keys |
| `frontend/messages/ar.json` | Add i18n keys |

### Unit 1.5J
| File | Change |
|---|---|
| `frontend/src/app/(app)/transactions/page.tsx` | Add filter bar, bulk mode, account pills, row polish |
| `frontend/src/components/transactions/filter-bar.tsx` | NEW |
| `frontend/src/components/transactions/bulk-toolbar.tsx` | NEW |
| `frontend/src/components/transactions/account-pill.tsx` | NEW |
| `frontend/src/hooks/use-transactions.ts` | Add bulk delete/categorize mutations, filter params |
| `frontend/messages/en.json` | Add i18n keys |
| `frontend/messages/ar.json` | Add i18n keys |

### Unit 1.5K
| File | Change |
|---|---|
| `frontend/src/components/shared/logo.tsx` | Add `LOGO_SIZES` constants |
| `frontend/src/components/layout/sidebar.tsx` | Logo size, tagline, section grouping, active state |
| `frontend/src/components/layout/navbar.tsx` | Logo size update |
| `frontend/src/app/(auth)/layout.tsx` | Verify/fix logo size, remove "The Financial Atelier" |
| `frontend/src/app/(onboarding)/layout.tsx` | Verify/fix logo size |
| `frontend/src/app/(app)/transfers/page.tsx` | Account mini cards, colorized amounts |
| `frontend/src/app/(app)/dashboard/page.tsx` | Structured placeholder with stat cards |
| `frontend/src/components/dashboard/stat-card-placeholder.tsx` | NEW |
| `frontend/messages/en.json` | Add i18n keys |
| `frontend/messages/ar.json` | Add i18n keys |

---

## 9. Success Criteria (Wave 4 Complete)

- [ ] All Phase 1 pages match Stitch designs at functional fidelity level
- [ ] Logo sizes correct at all placements (sidebar, mobile navbar, auth, onboarding)
- [ ] "فلوسك متظبطة بالقرش" tagline in sidebar — no "The Financial Atelier" anywhere
- [ ] Advanced transaction filtering works across all 7 dimensions
- [ ] Bulk operations (delete, re-categorize) work end-to-end
- [ ] Net worth aggregation displays correctly with multi-currency
- [ ] Credit card utilization and billing info visible on account cards
- [ ] Transfers, dashboard, and sidebar all polished
- [ ] RTL layout correct on every updated page
- [ ] All three units CI green and merged to main
