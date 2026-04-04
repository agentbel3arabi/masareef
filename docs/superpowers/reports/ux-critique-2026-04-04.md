# Masareef UX Critique Report

**Date:** 4 April 2026
**Scope:** Full frontend audit — Dashboard, Accounts, Transactions, Transfers, Debts, Layout, Forms, Mobile
**Phase context:** Post Phase 3.5 (UX Polish Sprint complete), pre-Phase 4 (Dashboard & Charts)

---

## Overall Impression

Masareef has a solid foundation: the component library is well-structured, design tokens are properly wired through CSS variables, RTL support uses logical properties correctly, and the shared component abstractions (StatCard, EmptyState, FormSheet, FAB, MoneyDisplay) create good consistency. The Arabic-first approach is genuinely embedded, not bolted on.

That said, there are meaningful UX gaps — some structural, some polish — that would significantly improve the experience before Phase 4 brings charts and the dashboard to life.

---

## 1. Information Architecture & Navigation

### 1.1 Dashboard feels hollow

The Dashboard currently shows four stat cards (two are placeholder dashes), two empty chart boxes with faded icons, and a recent transactions list. For the primary landing screen, it communicates "this app isn't ready yet" rather than "here's your financial picture."

**Recommendation:** Before Phase 4 delivers real charts, improve the dashboard interim state. Replace the dashed-border chart placeholders with more informative content that uses data you already have — e.g., a "Your accounts at a glance" mini-grid showing account balances, or a "This month's activity" summary card pulling from transaction data. The current empty boxes waste prime screen real estate.

**Severity:** High — first impression issue

### 1.2 No global search

There's no search bar in the navbar or sidebar. For a finance app where users frequently look for specific transactions by merchant name, amount, or date, this is a significant gap. The transaction page has filters, but users shouldn't need to navigate there first.

**Recommendation:** Add a command-palette style search (Cmd/Ctrl+K) that searches across transactions, accounts, and debts. Even a simple navbar search input that routes to filtered transaction results would be a big win.

**Severity:** Medium — becomes high as data volume grows

### 1.3 Sidebar section labels are too subtle

The sidebar section labels ("OVERVIEW", "FINANCE", "PLANNING", "SETTINGS") use `text-[10px]` at 60% opacity. They're barely readable, especially for an app targeting a broad audience including non-technical users.

**Recommendation:** Increase to `text-[11px]` and raise opacity to at least `text-muted-foreground/80`. The labels serve an important wayfinding purpose — don't sacrifice readability for minimalism.

**Severity:** Low

### 1.4 Transfers page lacks context

The Transfers page is a flat table with no summary stats (unlike Transactions, which has income/expenses/net/count cards). It also has no subtitle text explaining the page purpose.

**Recommendation:** Add a subtitle ("Track money moved between your accounts") and at minimum a count stat card. Consider showing "Total transferred this month" as a summary.

**Severity:** Low

---

## 2. Forms & Data Entry

### 2.1 Edit Transaction uses center Dialog, not FormSheet

The "New Transaction" form correctly uses a side sheet (FormSheet), but the "Edit Transaction" form in `transaction-row.tsx` uses a center `<Dialog>`. This is inconsistent with the Phase 3.5 decision that all forms should use side sheets.

**Recommendation:** Migrate the edit transaction form to use FormSheet, matching the create flow. This also gives it more vertical room for the form fields.

**Severity:** Medium — consistency issue users will notice

### 2.2 No confirmation feedback on form submissions

The `TransactionForm` closes the sheet on success but there's no visible success toast. Phase 3.5 Unit 6.4 specced success toasts using sonner, but the transaction form's `handleSubmit` doesn't trigger one. Verify this across all forms (loan, installment, transfer, P2P debt).

**Recommendation:** Add `toast.success(t("transactions.created"))` (or equivalent) in every form's success path. The sonner infrastructure is already in place.

**Severity:** Medium — users need confirmation their action succeeded

### 2.3 Date input doesn't enforce dd/mm/yyyy visually

The date fields use `<Input type="date">`, which renders using the browser's locale. On many browsers this defaults to mm/dd/yyyy. Phase 3.5 standardized display dates to dd/mm/yyyy via `formatDate()`, but the input fields may not match.

**Recommendation:** Consider a custom date picker component (e.g., a popover calendar from shadcn/ui) that renders dd/mm/yyyy consistently regardless of browser locale. This is especially important for Egyptian users who expect day-first dates.

**Severity:** Medium — locale-sensitive issue

### 2.4 Amount input lacks currency symbol inline

The amount field shows the currency code in the label ("Amount (EGP)") but the input itself is a plain number field. Finance apps typically show the currency symbol inside the input for clarity.

**Recommendation:** Add an input adornment (prefix or suffix) showing the currency symbol. For example, an "EGP" chip inside the input end, or the `£E` symbol at the start.

**Severity:** Low — polish

### 2.5 No textarea for notes

The "Notes" field in the transaction form uses `<Input>` (single line). Notes can be multi-line (receipts, context, reminders).

**Recommendation:** Switch to `<textarea>` or a shadcn Textarea component with 2-3 rows default height and auto-expand.

**Severity:** Low

---

## 3. Visual Hierarchy & Data Scannability

### 3.1 Stat cards are visually heavy when colored

The StatCard component applies full gradient backgrounds (`bg-gradient-to-br from-green-600 to-green-700`) for success/destructive variants. When the Net Worth card is green and the other three stat cards are plain white, the color imbalance draws the eye aggressively to one card while making the others feel inert.

**Recommendation:** Consider a lighter treatment for colored stat cards — e.g., a tinted background (`bg-green-50 dark:bg-green-950/20`) with a colored left border accent, rather than a full gradient. This maintains semantic meaning without overwhelming the visual hierarchy.

**Severity:** Medium — affects scannability on Dashboard and Transactions pages

### 3.2 Transaction table action buttons visible by default on mobile

In `transaction-row.tsx`, the edit/delete buttons use `opacity-100 sm:opacity-0 sm:group-hover:opacity-100`. This means on mobile, every row shows two action buttons at all times. With many transactions, this adds visual noise and reduces the space available for actual data.

**Recommendation:** On mobile, use a swipe-to-reveal pattern, a long-press context menu, or move actions behind a single `⋮` icon per row (like the account cards already do).

**Severity:** Medium — mobile usability

### 3.3 Account Detail page FAB is not using the shared component

The Account Detail page (`accounts/[id]/page.tsx`, line 189-195) has a raw `<button>` that duplicates the FAB styling instead of using the shared `<FAB>` component. This means it lacks the tooltip that other FABs have.

**Recommendation:** Replace with `<FAB onClick={...} ariaLabel={...} tooltip={...} />` for consistency and tooltip support.

**Severity:** Low — code consistency

### 3.4 Credit card design could be more distinct

The credit card component has a nice physical-card aesthetic with gradients and masked numbers, but the two gradient options (slate and emerald) alternate by account ID — not by card network or brand. Two HSBC cards could look completely different, which undermines the mental model.

**Recommendation:** Allow the institution or a user-chosen color to drive the gradient. Alternatively, use a single consistent gradient and differentiate cards by institution logo or badge instead.

**Severity:** Low — aesthetic

---

## 4. Mobile Experience

### 4.1 Navbar action buttons overflow on small screens

The Accounts page injects four buttons into the navbar (`Manage`, `Import`, `Transfer`, `Add Account`). On screens narrower than ~640px, these will overflow the navbar since there's no responsive handling. The Account Detail page similarly loads four action buttons.

**Recommendation:** On mobile, collapse the secondary actions into a `⋮` dropdown menu, keeping only the primary CTA visible. Or move the actions below the page header as a button bar.

**Severity:** High — usability broken on mobile

### 4.2 Mobile nav drawer lacks section grouping

The desktop sidebar groups nav items into sections (Overview, Finance, Planning, Settings) with labels. The mobile drawer (`mobile-nav-drawer.tsx`) shows a flat list without any section labels or dividers.

**Recommendation:** Add section dividers and labels matching the desktop sidebar structure. This helps orientation especially as more nav items are added.

**Severity:** Low

### 4.3 Net worth hero section doesn't stack on mobile

The Accounts page hero section uses `flex-wrap` but the left section (net worth + assets/liabilities separated by a `border-s` divider) assumes horizontal layout. On narrow screens, the divider and `ps-10` padding will look odd when wrapped.

**Recommendation:** At mobile breakpoint, switch to a vertical stack layout for net worth / assets / liabilities, removing the side border and using top borders instead.

**Severity:** Medium

---

## 5. Empty States & Onboarding

### 5.1 Dashboard has no first-run experience

When a new user logs in with zero accounts and zero transactions, the Dashboard shows four "—" stat cards and empty chart placeholders. There's no guidance on what to do first.

**Recommendation:** Detect the zero-data state and show a "Getting started" card or checklist: (1) Add your first account, (2) Record or import transactions, (3) Set up your debts. This could be a simple checklist card that replaces the stat cards row.

**Severity:** High — new user experience

### 5.2 Empty states are generic

The EmptyState component works well structurally, but the copy is quite generic ("No transactions yet. Record your first transaction"). Finance is emotional — users feel vulnerable sharing their data.

**Recommendation:** Make empty states warmer and more helpful. For example: "Your transaction history will appear here. Add your first one manually, or import a bank statement to get started quickly." Consider adding a secondary action link (e.g., "Learn about importing" or "Watch a 30-second demo").

**Severity:** Low — copy refinement

---

## 6. Accessibility

### 6.1 Loan card uses div with onClick for navigation

The `LoanCard` in `loans-tab.tsx` uses a `<div>` with `onClick`, `role="button"`, and `tabIndex={0}`. While it adds keyboard handling, this pattern has accessibility issues: screen readers won't announce it as a link, and it doesn't support standard link behaviors (middle-click to open in new tab, right-click context menu).

**Recommendation:** Wrap the card content in a Next.js `<Link>` component (like the bank account cards already do), with the expand/action buttons using `e.stopPropagation()` to prevent navigation.

**Severity:** Medium — accessibility

### 6.2 No skip-to-content link

The AppShell doesn't include a "Skip to main content" link for keyboard users. With a sidebar and navbar, keyboard users must tab through all nav items to reach the page content.

**Recommendation:** Add a visually-hidden skip link at the top of the AppShell that becomes visible on focus: `<a href="#main" className="sr-only focus:not-sr-only ...">Skip to content</a>`, and add `id="main"` to the `<main>` element.

**Severity:** Medium — WCAG 2.1 AA requirement

### 6.3 Color as sole indicator in MoneyDisplay

The `MoneyDisplay` component uses green/red color as the only differentiator between income and expense amounts. Users with color vision deficiency (8% of males) cannot distinguish these.

**Recommendation:** Add a secondary indicator — a `+`/`-` prefix, or an up/down arrow icon, alongside the color. The transaction type column helps, but the amount itself should be self-describing.

**Severity:** Medium — accessibility

### 6.4 Disabled elements lack consistent pattern

Disabled sidebar items use `cursor-not-allowed` + 40% opacity + a Clock icon + tooltip. The disabled notification bell in the navbar uses `cursor-not-allowed` + 40% opacity but no tooltip. The disabled "Account Statements" button uses `disabled` attribute. Three different patterns for "not available yet."

**Recommendation:** Create a shared `ComingSoon` wrapper component that applies consistent disabled styling, tooltip, and clock icon across all contexts.

**Severity:** Low — consistency

---

## 7. Performance & Technical UX

### 7.1 Navbar actions cause unnecessary re-renders

Every page with navbar actions (Accounts, Transactions, Account Detail, Transfers) uses a `useEffect` with complex dependency arrays to inject buttons into the navbar context. The dependency on `[...selectedIds].sort().join(',')` forces a re-render on every selection change. The `eslint-disable` comments on every page suggest this pattern is fighting React's model.

**Recommendation:** Refactor the navbar actions pattern. Consider a declarative approach where pages render a `<NavbarActions>` portal component that mounts its children into the navbar slot, rather than imperatively calling `setActions()` in effects.

**Severity:** Medium — developer experience and potential perf issues

### 7.2 Bulk action code is duplicated across pages

The bulk selection + delete logic appears nearly identically in Accounts, Transactions, Account Detail, and Transfers pages. Each has its own `useEffect` managing navbar actions for manage mode.

**Recommendation:** Extract a `useBulkActionNavbar` hook or a `<BulkActionBar>` component that encapsulates the enter/exit manage mode, selection count display, and action buttons.

**Severity:** Low — tech debt that will compound

---

## 8. Dark Mode

### 8.1 Dark mode border contrast is too low

In the dark theme, `--border` is set to `217.2 32.6% 17.5%` — the same value as `--card` and `--muted`. This means card borders are invisible against the card background in dark mode, making it hard to distinguish between cards and the page surface.

**Recommendation:** Lighten the dark mode `--border` value to something like `217.2 32.6% 24%` (or `rgba(255,255,255,0.12)` equivalent) so borders are subtly visible.

**Severity:** Medium — dark mode usability

### 8.2 Credit card gradient doesn't adapt to dark mode

The credit card face uses hardcoded gradients (`from-slate-800 to-slate-900` and `from-emerald-800 to-emerald-900`). These work in light mode but may blend into the dark mode card background.

**Recommendation:** Add dark mode variants for the credit card gradients, or use slightly lighter tones in dark mode to maintain contrast against the dark surface.

**Severity:** Low

---

## Priority Summary

### Must-fix (before Phase 4)

1. **Navbar action overflow on mobile** — buttons break layout on small screens
2. **Dashboard first-run experience** — zero-data state is confusing for new users
3. **Edit Transaction Dialog → FormSheet** — inconsistency with Phase 3.5 decision
4. **Skip-to-content link** — WCAG requirement
5. **Color-only money indicators** — accessibility for color-blind users

### Should-fix (during or alongside Phase 4)

6. **Dashboard interim content** — replace empty chart boxes with useful data
7. **Success toasts on form submissions** — confirm actions to users
8. **Dark mode border contrast** — cards invisible in dark mode
9. **StatCard color treatment** — gradient too heavy, disrupts hierarchy
10. **Mobile transaction row actions** — too much visual noise

### Nice-to-have (Phase 5+)

11. **Global search / command palette**
12. **Custom date picker for dd/mm/yyyy input**
13. **Currency symbol in amount inputs**
14. **Textarea for notes fields**
15. **Mobile nav drawer section grouping**
16. **Refactor navbar actions pattern**
17. **Extract bulk action code into shared hook**

---

*Report generated from code review of `frontend/src/` post Phase 3.5 merge (commit 6ff2a47).*
