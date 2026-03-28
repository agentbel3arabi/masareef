# Unit 1I: Design Polish, Logos & Locale Switching — Design Spec

**Date:** 2026-03-28
**Goal:** Apply Masareef design tokens to the frontend, integrate brand logos, enable English/LTR support with a locale toggle, complete the i18n sweep of all hardcoded strings, and polish existing pages to match Stitch design patterns.

**Prerequisite:** Unit 1H (Transactions UI) must be complete and merged.

---

## 1. Design Tokens

### Problem
The current frontend uses shadcn's default grayscale theme (`globals.css` has generic HSL values). The Masareef design tokens in `docs/guides/09-design-tokens.md` define a distinct visual identity with emerald primary, slate surfaces, Inter + Noto Sans Arabic fonts, and tiered border radii.

### Changes

**`frontend/src/app/globals.css`** — Replace all CSS custom properties:

| Token | Light mode | Dark mode |
|---|---|---|
| `--background` | `#FFFFFF` | `#0F172A` |
| `--foreground` | `#0F172A` | `#F8FAFC` |
| `--card` | `#FFFFFF` | `#1E293B` |
| `--card-foreground` | `#0F172A` | `#F8FAFC` |
| `--popover` | `#FFFFFF` | `#1E293B` |
| `--popover-foreground` | `#0F172A` | `#F8FAFC` |
| `--primary` | `#16A34A` (emerald) | `#16A34A` |
| `--primary-foreground` | `#FFFFFF` | `#FFFFFF` |
| `--secondary` | `#F8FAFC` | `#1E293B` |
| `--secondary-foreground` | `#0F172A` | `#F8FAFC` |
| `--muted` | `#F8FAFC` | `#1E293B` |
| `--muted-foreground` | `#64748B` | `#94A3B8` |
| `--accent` | `#F8FAFC` | `#1E293B` |
| `--accent-foreground` | `#0F172A` | `#F8FAFC` |
| `--destructive` | `#EF4444` | `#EF4444` |
| `--destructive-foreground` | `#FFFFFF` | `#FFFFFF` |
| `--border` | `#E2E8F0` | `rgba(255, 255, 255, 0.08)` |
| `--input` | `#E2E8F0` | `rgba(255, 255, 255, 0.08)` |
| `--ring` | `#16A34A` | `#16A34A` |

Note: HSL conversion required — `globals.css` uses HSL triples (e.g., `142.1 76.2% 36.3%` for `#16A34A`). All hex values above are the targets; implementation converts to HSL format.

**Additional CSS variables:**
- `--warning: #F59E0B` (amber — for warnings, due-soon, budget alerts)
- `--radius-card: 10px` — cards, modals, large containers
- `--radius-input: 6px` — inputs, buttons
- `--radius-badge: 4px` — badges, chips, tags

**Fonts** — Load via `next/font/google` in `layout.tsx`:
- **Inter** — Latin body and heading text
- **Noto Sans Arabic** — Arabic body and heading text
- Set as CSS variables `--font-sans` applied to `<html>` element
- Both fonts declared in a single `next/font` configuration with `variable` option

**`tailwind.config.ts`** — Update:
- `fontFamily.sans` to reference the CSS variable
- `borderRadius.lg/md/sm` to map to the new tiered variables

### Scope
- Only `globals.css`, `layout.tsx`, and `tailwind.config.ts` are modified
- All existing shadcn components inherit the new tokens via CSS variables — zero component code changes
- Dark mode variables updated in the `.dark` selector

---

## 2. Logo Placement

### Logo files
From `logos/svg/transparent/`:
- `horizontal.svg` — dark marks on transparent (for light surfaces)
- `horizontal-white.svg` — white marks on transparent (for dark surfaces)
- `icon.svg` — standalone mark, dark
- `icon-white.svg` — standalone mark, white
- `favicon.svg` — browser tab icon

### Placement plan

| Location | Logo type | Light mode file | Dark mode file | Size |
|---|---|---|---|---|
| Sidebar (desktop) | horizontal | `transparent/horizontal.svg` | `transparent/horizontal-white.svg` | ~140x32px |
| Navbar (mobile) | icon | `transparent/icon.svg` | `transparent/icon-white.svg` | ~24x24px |
| Browser tab (favicon) | favicon | `transparent/favicon.svg` | — | 32x32 / 16x16 |
| Login/signup pages | stacked | `transparent/stacked.svg` | `transparent/stacked-white.svg` | ~120x80px |

### Implementation
- Copy required SVG files to `frontend/public/logos/` for `next/image` access
- Create a `Logo` shared component that reads `resolvedTheme` from `next-themes` and switches between light/dark variants
- Replace text branding in sidebar (`{t("common.appName")}`) with `<Logo />` component
- Replace text branding in navbar (mobile) with icon variant
- Add `favicon.ico` to `frontend/src/app/` (Next.js App Router convention)
- Add `<link rel="apple-touch-icon">` in metadata

---

## 3. Locale Switching

### Mechanism
- **Storage:** Cookie (`NEXT_LOCALE`) + `localStorage` fallback
- **Default:** Arabic (`ar`)
- **Reading:** `i18n/request.ts` reads the `NEXT_LOCALE` cookie to determine locale (replacing the current hardcoded `"ar"`)
- **Direction:** `layout.tsx` already dynamically sets `dir="rtl"` or `dir="ltr"` based on locale — no changes needed

### LocaleToggle component
- Lives in navbar, next to existing `ThemeToggle`
- Simple button showing "ع" when English is active, "EN" when Arabic is active (shows the language you'd switch TO)
- On click: sets `NEXT_LOCALE` cookie, sets `localStorage`, calls `router.refresh()`
- Uses `useLocale()` from `next-intl` to read current state

### Cookie reading in `i18n/request.ts`
- Import `cookies` from `next/headers`
- Read `NEXT_LOCALE` cookie, fallback to `"ar"` if absent
- Return the matching message file

### Roadmap note
Cookie/localStorage is Phase 1 only. Phase 17 (Settings) should migrate to a backend `user_preferences.locale` column and sync on login. Add this as a note in the implementation plan.

---

## 4. i18n Sweep

### Scope
Audit all pages and components built in Units 1F–1H. Extract every hardcoded string to translation keys in both `ar.json` and `en.json`.

### New translation namespaces

**`accounts` (expand existing):**
- `accounts.empty` — empty state message
- `accounts.createTitle` — "Create Account" dialog title
- `accounts.type` — "Type" label
- `accounts.currency` — "Currency" label
- `accounts.institution` — "Institution" label
- `accounts.initialBalance` — "Initial Balance" label
- `accounts.quickTransfer` — "Quick Transfer" button label

**`transactions` (new):**
- `transactions.title` — page heading
- `transactions.date` — table header
- `transactions.description` — table header
- `transactions.category` — table header
- `transactions.amount` — table header
- `transactions.uncategorized` — "Uncategorized" badge text
- `transactions.search` — search placeholder
- `transactions.allTypes` — "All types" filter option
- `transactions.expenses` — "Expenses" filter option
- `transactions.income` — "Income" filter option
- `transactions.noResults` — empty table message
- `transactions.total` — "{count} total" pagination text
- `transactions.previous` — "Previous" pagination button
- `transactions.next` — "Next" pagination button
- `transactions.newTransaction` — form sheet title
- `transactions.expense` — "Expense" type toggle
- `transactions.incomeType` — "Income" type toggle
- `transactions.notes` — "Notes" label
- `transactions.addTransaction` — "Add Transaction" button

**`transfers` (new):**
- `transfers.title` — page heading
- `transfers.newTransfer` — "New Transfer" button
- `transfers.fromAccount` — "From Account" label
- `transfers.toAccount` — "To Account" label
- `transfers.exchangeRate` — "Exchange Rate ({from} to {to})" label
- `transfers.transferBetween` — dialog title
- `transfers.transfer` — submit button
- `transfers.noTransfers` — empty state
- `transfers.date` / `transfers.from` / `transfers.to` / `transfers.amount` — table headers
- `transfers.selectAccount` — "Select..." placeholder

**`common` (expand):**
- `common.loading` (exists)
- `common.save` (exists)
- `common.noResults` — generic empty state
- `common.notFound` — "Not found" message
- `common.date` — "Date" generic label
- `common.description` — "Description" generic label
- `common.amount` — "Amount" generic label

### Approach
- Components switch from hardcoded strings to `useTranslations("namespace")` + `t("key")` calls
- Both `ar.json` and `en.json` updated simultaneously
- Arabic translations provided for all new keys (not machine-translated — based on the existing Arabic-first copy from Stitch designs)

---

## 5. Page Polish

Apply Stitch design patterns to existing pages. NOT pixel-perfect recreation — structural improvements using the new design tokens.

### Reference screens (via Stitch MCP or HTML files)
- `06-accounts.html` → accounts grid
- `07-account-detail.html` → account detail
- `07b-transactions-global.html` → global transactions
- `02-login.html` → login page

### Accounts grid page
- Card hover effect: `hover:-translate-y-1 transition-transform`
- Account type icons with colored background circles
- Better section headers per account type group
- **Quick transfer button** — adds a small "Transfer" shortcut button on each account card or as a floating action, opens the transfer form dialog pre-filled with the account

### Account detail page
- Balance display: larger MoneyDisplay with currency, trend indicator placeholder
- Transaction table: subtle row striping (`even:bg-muted/30`), category badges with colored dots
- Better loading/error states with skeleton placeholders

### Global transactions page
- Filter bar: styled select elements matching Input component look, better spacing
- Category badges: colored dot + text label pattern (consistent with Stitch designs)

### Transfers page
- Keep as dedicated route with transfer history table
- Transfer form remains a Dialog/Sheet (not inline)
- Arrow icon between from/to in history table

### Auth pages (login/signup)
- Add stacked logo above auth form (centered)
- Match Stitch `02-login.html` layout: centered card, subtle shadow, appropriate spacing

---

## 6. Stitch MCP Integration

Use the Stitch MCP server tools to analyze existing design screens in the Stitch project. This provides more accurate component extraction than manually reading HTML:
- Load screen details via MCP for structural reference
- Cross-reference with design tokens doc when MCP output conflicts
- Design tokens doc (`09-design-tokens.md`) always wins on conflicts

---

## Task Sequence (Foundation-First)

1. **Design tokens + fonts** — `globals.css`, `layout.tsx`, `tailwind.config.ts`
2. **Logo placement** — Copy SVGs, create `Logo` component, update sidebar/navbar/auth pages, add favicon
3. **Locale toggle + i18n infrastructure** — `LocaleToggle` component, update `i18n/request.ts`, cookie reading
4. **i18n sweep** — Audit all pages, add keys to `ar.json`/`en.json`, update components
5. **Page polish** — Accounts grid, account detail, transactions, transfers, auth pages
6. **Build verification** — `pnpm build && pnpm lint`, visual check in both locales + both themes

---

## Out of Scope

- Dashboard page content (Phase 4)
- Debts/budgets pages (later phases)
- Backend user preferences for locale (Phase 17 — Settings)
- Unit tests for frontend (no test infrastructure yet)
- Mobile responsive breakpoints beyond what already exists
- PWA manifest / service worker
