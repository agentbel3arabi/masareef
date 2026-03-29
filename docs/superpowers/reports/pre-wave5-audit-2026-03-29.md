# Pre-Wave 5 Full Codebase Audit

**Date:** 2026-03-29
**Scope:** Full static analysis + E2E Playwright visual audit of all pages
**Baseline:** main branch, post-Wave 4 merge (commit `231f9d9`)
**Verdict:** Ready for Wave 5 with targeted fixes

---

## Executive Summary

| Severity | Frontend | Backend | E2E-Only | Total |
|----------|----------|---------|----------|-------|
| CRITICAL | 3 | 0 | 0 | 3 |
| MAJOR | 8 | 3 | 1 | 12 |
| MINOR | 7 | 4 | 2 | 13 |
| **Total** | **18** | **7** | **3** | **28** |

The codebase is solid after Wave 4. No production blockers. The 3 CRITICAL items are:
1. **F1**: Transaction form uses physical `side="right"` instead of logical `side="end"` (RTL violation)
2. **F15**: No landing page — `/` redirects to `/dashboard`
3. **F17**: Missing `--color-surface` CSS variable from design tokens

All 3 are addressed within Wave 5 scope (F1 and F17 in Unit 1.5L, F15 IS Unit 1.5L).

**Console errors across all pages:** 0 errors, 1 recurring warning (logo image aspect ratio).

---

## Section 1: Frontend Code Review Findings

### 1.1 Global / Cross-Cutting

| # | Sev | File | Finding | Fix |
|---|-----|------|---------|-----|
| F1 | CRITICAL | `components/transactions/transaction-form.tsx:79` | `side="right"` on SheetContent — physical direction, breaks RTL semantics. Mobile nav correctly uses `side="start"`. E2E shows sheet opens from left in RTL (component auto-flips), but code should use logical direction | Change to `side="end"` |
| F2 | MAJOR | `app/(auth)/layout.tsx:10` | Hardcoded hex colors `#004D20` and `#1DB954` — not in design tokens | Replace with `from-primary/80 via-primary to-primary/60` or define auth-gradient tokens |
| F3 | MAJOR | `components/layout/sidebar.tsx:41-43` | Sidebar tagline "فلوسك متظبطة بالقرش" — hardcoded Arabic, `text-[11px]`, not in i18n. **User intended "مصاريف منظمة بذكاء"** — wrong text. No English fallback | Fix text, move to i18n, use `text-xs` token |
| F4 | MAJOR | `components/layout/navbar.tsx` | No user avatar — only logout button. Avatar component exists in `ui/avatar.tsx` but unused. Stitch designs show avatar in header | Add Avatar with user initials and dropdown menu |
| F5 | MAJOR | `app/(app)/dashboard/page.tsx` | Dashboard is skeleton placeholder — 4 "Coming Soon" cards + 2 empty chart boxes. Expected for current phase but looks unfinished | Acceptable — add informational empty state text |
| F6 | MINOR | No `error.tsx` in any route | Relies on component-level ErrorBoundary — no Next.js filesystem error boundaries | Add `error.tsx` to `(app)/` group |
| F7 | MINOR | No `loading.tsx` in any route | Loading handled via inline `isLoading` state — no Suspense-based loading | Add `loading.tsx` with skeleton layouts |
| F8 | MINOR | `components/ui/avatar.tsx:78` | `AvatarGroup` uses `-space-x-2` — physical directional class | Convert to `-space-x-2 rtl:space-x-reverse` |
| F9 | MINOR | `components/ui/dropdown-menu.tsx:138` | Physical animation direction classes (`data-[side=left]:slide-in-from-right-2`) | Acceptable for Base-UI positioning data attributes |

### 1.2 Accounts Page

| # | Sev | File | Finding | Fix |
|---|-----|------|---------|-----|
| F10 | MAJOR | `app/(app)/accounts/page.tsx` | Stitch design shows accounts **grouped by type** with section headers and count badges. E2E confirms grouping works when data has section headers (e.g., "بطاقة ائتمان" visible) but needs verification with multiple account types | Verify with multi-type data; add count badges per section |
| F11 | MINOR | `components/accounts/account-card.tsx` | No utilization progress bar on credit card cards — Stitch shows utilization bar with % label | Integrate `UtilizationBar` component into credit card variant |

### 1.3 Transactions Page

| # | Sev | File | Finding | Fix |
|---|-----|------|---------|-----|
| F12 | MAJOR | `components/transactions/transaction-form.tsx:120-131` | Category selector is a bare `<select>` element — not shadcn/ui Select. E2E screenshot confirms native browser dropdown styling | Replace with shadcn/ui Select component |
| F13 | MINOR | `components/transactions/transaction-form.tsx` | No currency badge next to amount input. Amount input is basic — Stitch design shows large centered typography with "EGP" badge | Style amount input per Stitch design |

### 1.4 Transfers Page

| # | Sev | File | Finding | Fix |
|---|-----|------|---------|-----|
| F14 | MAJOR | `components/transfers/transfer-form.tsx` | Missing cross-currency alert box and FX rate preview card shown in Stitch `22-transfer-form.html` | Defer to Phase 2 — single-currency transfers work fine |

### 1.5 Landing Page

| # | Sev | File | Finding | Fix |
|---|-----|------|---------|-----|
| F15 | CRITICAL | `app/page.tsx` | **No landing page** — `/` redirects to `/dashboard`. E2E confirmed: navigating to `http://localhost:3000/` redirects to `/dashboard` | Unit 1.5L will implement this |

### 1.6 Design Token Compliance

| # | Sev | File | Finding | Fix |
|---|-----|------|---------|-----|
| F16 | MINOR | `globals.css` | Button `rounded-lg` resolves to `--radius` (10px), but canonical design tokens specify buttons should be 6px | Define `--radius-button: 0.375rem` and apply to button component |
| F17 | CRITICAL | `globals.css` | No `--color-surface` token. Design tokens doc specifies Surface: `#F8FAFC` (light) / `#1E293B` (dark) as distinct from Background | Add `--surface` CSS variable |

### 1.7 i18n & Settings

| # | Sev | File | Finding | Fix |
|---|-----|------|---------|-----|
| F18 | MINOR | `components/layout/sidebar.tsx:42` | Tagline hardcoded Arabic — same as F3 | See F3 |
| F19 | MAJOR | `app/(app)/settings/page.tsx` | **Settings page does not exist** — sidebar links to `/settings` which returns Next.js default 404. E2E screenshot `11-settings-404.png` confirms | Add placeholder settings page or mark nav item as disabled |

---

## Section 2: Backend Code Review Findings

### 2.1 Models

| # | Sev | File | Finding | Fix |
|---|-----|------|---------|-----|
| B1 | MINOR | `models/category.py` | Category model has `created_at` but no `updated_at` — inconsistent with TimestampMixin pattern | Add `updated_at` or document as intentional |
| B2 | MINOR | `models/transaction.py` (TransactionSplit) | TransactionSplit lacks `is_active` — hard-deleted instead of soft-deleted | Document as intentional (child records deleted with parent) |

### 2.2 API Routes

| # | Sev | File | Finding | Fix |
|---|-----|------|---------|-----|
| B3 | MAJOR | `routers/accounts.py` | `/api/v1/accounts/net-worth` declared AFTER `/{account_id}` — FastAPI matches first, so `net-worth` could be interpreted as account_id | Move `net-worth` route ABOVE `/{account_id}` |
| B4 | MINOR | `main.py:49` | Health endpoint lacks return type annotation | Add `-> dict[str, str]` |

### 2.3 Schemas

| # | Sev | File | Finding | Fix |
|---|-----|------|---------|-----|
| B5 | MAJOR | `schemas/common.py` | `SuccessResponse.data: Any` and `ErrorDetail.details: list[Any]` — loose typing | Consider `Generic[T]` for type-safe responses; acceptable for now |
| B6 | MAJOR | All schemas | Enum fields received as `type: str` instead of Python enum types — no runtime validation | Add Pydantic validators or Literal types for enums |

### 2.4 Tests

| # | Sev | File | Finding | Fix |
|---|-----|------|---------|-----|
| B7 | MINOR | Various | Not all endpoints meet 4-test minimum (happy path, auth failure, wrong household, validation). 134 tests across 28 files — good coverage overall | Track per-endpoint gaps; fill as endpoints are touched |

---

## Section 3: E2E Visual & Functional Findings

### 3.1 Screenshots Captured

| # | File | Viewport | Description |
|---|------|----------|-------------|
| 1 | `01-dashboard-desktop.png` | 1440px | Dashboard RTL Arabic — 4 stat cards, 2 chart placeholders |
| 2 | `02-accounts-desktop.png` | 1440px | Accounts with net worth bar, "بطاقة ائتمان" section header |
| 3 | `03-transactions-desktop.png` | 1440px | Transactions with 7-dim filter bar, empty state |
| 4 | `04-transfers-desktop.png` | 1440px | Transfers with empty state |
| 5 | `05-dashboard-mobile-375.png` | 375px | Mobile dashboard — sidebar hidden, hamburger visible |
| 6 | `06-mobile-nav-drawer.png` | 375px | Mobile nav drawer — opens from start (RTL-correct) |
| 7 | `07-dashboard-dark-mode.png` | 1440px | Dark mode — colors invert correctly |
| 8 | `08-dashboard-english-ltr.png` | 1440px | English LTR — layout flips correctly |
| 9 | `09-transaction-form-rtl.png` | 1440px | Transaction form sheet in RTL — slides from left (end) |
| 10 | `10-account-detail.png` | 1440px | Account detail page — header card + empty transactions |
| 11 | `11-settings-404.png` | 1440px | Settings page — Next.js default 404 |
| 12 | `12-dashboard-tablet-768.png` | 768px | Tablet dashboard — sidebar visible, 2-col stat cards |
| 13 | `13-accounts-tablet-768.png` | 768px | Tablet accounts — sidebar + single-col account cards |

### 3.2 E2E-Only Findings (not caught in static analysis)

| # | Sev | Finding | Evidence |
|---|-----|---------|----------|
| E1 | MAJOR | **Settings page 404** — sidebar links to `/settings` which doesn't exist. Returns Next.js default 404 page (no custom 404 either) | `11-settings-404.png` |
| E2 | MINOR | **Logo aspect ratio warning** — console warning on every page: "Image with src ... has an aspect ratio that differs from width/height attributes". Logo SVG dimensions don't match `LOGO_SIZES` constants | Recurring in console across all pages |
| E3 | MINOR | **Tablet layout tight** — at 768px (md breakpoint), sidebar renders at 256px leaving only ~512px for content. Stat cards go to 2-col, charts stack single-col. Functional but cramped | `12-dashboard-tablet-768.png`, `13-accounts-tablet-768.png` |

### 3.3 Verified Known Issues

| Issue | Status | Evidence |
|-------|--------|----------|
| Sidebar tagline "مصاريف منظمة بذكاء" | **Wrong text**: shows "فلوسك متظبطة بالقرش" instead | All desktop screenshots |
| Transaction form padding/spacing | Form renders cleanly, labels right-aligned in RTL | `09-transaction-form-rtl.png` |
| Button styling | Buttons render with primary green, correct rounding | All screenshots |
| Overall spacing/typography | Clean and consistent across pages | All screenshots |
| User avatar | **Missing**: only logout icon in navbar, no avatar | `01-dashboard-desktop.png` (navbar area) |

### 3.4 Console Error Summary

| Page | Errors | Warnings |
|------|--------|----------|
| `/dashboard` | 0 | 1 (logo aspect ratio) |
| `/accounts` | 0 | 1 (logo aspect ratio) |
| `/accounts/126` | 0 | 1 (logo aspect ratio) |
| `/transactions` | 0 | 1 (logo aspect ratio) |
| `/transfers` | 0 | 1 (logo aspect ratio) |
| `/settings` | 1 (404 resource) | 0 |

### 3.5 Responsive Behavior Summary

| Breakpoint | Sidebar | Layout | Status |
|------------|---------|--------|--------|
| 375px (mobile) | Hidden, hamburger menu | Single column | Good |
| 768px (tablet) | Visible (md:flex) | Constrained 2-col | Functional but tight |
| 1440px (desktop) | Visible | Full grid layouts | Good |

### 3.6 RTL Correctness

- Sidebar: Correct (border-end, text-end alignment)
- Mobile nav drawer: Correct (opens from start = right in RTL)
- Transaction form sheet: Visually correct (opens from end = left in RTL) but code uses physical `side="right"`
- Filter bar: Correct (inputs flow RTL)
- Stat cards: Correct (icon position, text alignment)
- Dark mode: Correct (token-based colors invert properly)
- English LTR: Correct (full layout flip including sidebar)

---

## Section 4: Prioritized Fix List

### Must Fix Before/Within Wave 5

| # | Finding | Effort | Assign To | Why |
|---|---------|--------|-----------|-----|
| F1 | Transaction form `side="right"` → `side="end"` | 1 min | 1.5L | RTL violation — CLAUDE.md Rule 4 |
| F15 | Landing page missing | Major | 1.5L | IS the primary deliverable of Unit 1.5L |
| F17 | Add `--color-surface` CSS variable | 5 min | 1.5L | Design token gap |
| F19/E1 | Settings page 404 — add placeholder or disable nav | 15 min | 1.5L | Broken nav link |
| F2 | Auth layout hardcoded hex colors | 15 min | 1.5L |
| F3/F18 | Sidebar tagline i18n + correct text | 15 min | 1.5L |
| F4 | Missing user avatar in navbar | 30 min | 1.5L |
| F12 | Category selector bare `<select>` → shadcn | 20 min | 1.5L |
| F6/F7 | Add `error.tsx` + `loading.tsx` | 20 min | 1.5L |
| F16 | Button border-radius token alignment | 10 min | 1.5L |
| B3 | Route order fix (net-worth before {id}) | 5 min | 1.5M |
| E2 | Fix logo aspect ratio warning | 10 min | 1.5L |

### Defer to Phase 2+

| # | Finding | Rationale |
|---|---------|-----------|
| F5 | Dashboard charts | Phase 4 scope |
| F8 | AvatarGroup physical spacing | Not used yet |
| F10 | Account grouping count badges | Works; badges are polish |
| F11 | Credit card utilization bar | Nice-to-have visual |
| F13 | Amount input currency badge styling | Functional without it |
| F14 | Transfer FX preview | Phase 2 multi-currency feature |
| E3 | Tablet sidebar tightness | Functional; optimize in Phase 2 |
| B5 | Generic[T] response typing | Works with `Any` |
| B6 | Enum validation in schemas | Runtime catches bad values elsewhere |
| B7 | Test coverage gaps | Fill as endpoints are touched |

---

## Section 5: Wave 5 Scope Implications

### Unit 1.5L (Landing Page) — Additions from Audit

The landing page unit should also address these findings:

1. **F1**: Fix `side="right"` → `side="end"` in transaction-form.tsx (1 min)
2. **F2**: Replace auth layout hardcoded hex with design tokens (15 min)
3. **F3/F18**: Internationalize sidebar tagline, fix text to "مصاريف منظمة بذكاء" (15 min)
4. **F4**: Add user avatar to navbar (30 min)
5. **F6/F7**: Add `error.tsx` + `loading.tsx` to `(app)/` routes (20 min)
6. **F12**: Replace bare `<select>` with shadcn/ui Select (20 min)
7. **F16**: Button border-radius token alignment (10 min)
8. **F17**: Add `--color-surface` CSS variable (5 min)
9. **F19/E1**: Add placeholder settings page or disable nav item (15 min)
10. **E2**: Fix logo LOGO_SIZES to match SVG aspect ratio (10 min)

**Total added scope: ~2.5 hours of polish alongside the landing page build.**

### Unit 1.5M (Workflow/Roadmap) — Additions from Audit

1. **B3**: Fix route order in accounts router (5 min)
2. **B4**: Add return type to health endpoint (1 min)
3. Update `05-roadmap.md` to document audit findings addressed
4. Update `00-master-orchestration.md` to mark Wave 5 complete

### No New Units Needed

All findings fit within existing Wave 5 units. No hotfix branches required.

---

## Appendix: Screenshot Reference

All screenshots are in `docs/superpowers/reports/screenshots/`:

```
01-dashboard-desktop.png      — Dashboard at 1440px, RTL Arabic
02-accounts-desktop.png       — Accounts page with net worth bar
03-transactions-desktop.png   — Transactions with filter bar, empty state
04-transfers-desktop.png      — Transfers with empty state
05-dashboard-mobile-375.png   — Mobile dashboard at 375px
06-mobile-nav-drawer.png      — Mobile navigation drawer (RTL-correct)
07-dashboard-dark-mode.png    — Dark mode dashboard
08-dashboard-english-ltr.png  — English LTR layout
09-transaction-form-rtl.png   — Transaction form sheet in RTL
10-account-detail.png         — Account detail page (HSBC Premier)
11-settings-404.png           — Settings page 404
12-dashboard-tablet-768.png   — Tablet dashboard at 768px
13-accounts-tablet-768.png    — Tablet accounts at 768px
```
