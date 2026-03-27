# Unit 1G: Accounts UI — Session Handoff

## What Was Done

Unit 1G built the first data-driven frontend pages: the Accounts grid page and Account detail page, with supporting hooks, shared components, and dialogs.

### Deliverables
- **TanStack Query hooks** (`hooks/use-accounts.ts`): `useAccounts`, `useAccount`, `useCreateAccount`, `useDeleteAccount` — typed against `Account` interface matching backend schema
- **MoneyDisplay shared component** (`components/shared/money-display.tsx`): Reusable money formatter with Arabic/English locale, size variants (sm/md/lg), colorization (green positive/red negative), RTL-correct `ms-1` spacing
- **AccountCard component** (`components/accounts/account-card.tsx`): Card with type icon (lucide), name, institution, balance via MoneyDisplay, credit card available amount logic
- **AccountGrid component** (`components/accounts/account-grid.tsx`): Groups accounts by type in canonical order, responsive 1/2/3-column grid
- **CreateAccountDialog** (`components/accounts/create-account-dialog.tsx`): Form dialog with name, type select, currency select, institution, initial balance fields
- **Accounts page** (`app/(app)/accounts/page.tsx`): Grid layout with create dialog, loading/error/empty states
- **Account detail page** (`app/(app)/accounts/[id]/page.tsx`): Balance header with MoneyDisplay, transaction table placeholder for Unit 1H
- **AccountBalanceHeader** (`components/accounts/account-balance-header.tsx`): Name, institution, balance display with `text-end` for RTL
- **Dialog RTL fix**: Converted `right-4` → `end-4`, `sm:text-left` → `sm:text-start`, `sm:space-x-2` → `sm:gap-2` in shadcn dialog.tsx
- **i18n keys added**: `accounts.loading`, `common.name` in both ar.json and en.json

### Key Decisions
- **`data.data` access pattern** — TanStack Query wraps the API envelope (`{ data: T, meta: {...} }`) in its own `data` property, so all consumers use `data?.data` to access the payload. This is deliberate and consistent across all components.
- **MoneyDisplay defaults to Arabic locale** — `locale = "ar"` hardcoded as default prop. Will integrate with `useLocale()` when locale switching is implemented.
- **Balance conversion hardcodes exponent 2** — `CreateAccountDialog` uses `* 100` for minor unit conversion. Works for EGP/USD/EUR/GBP/SAR/AED but incorrect for KWD (exponent 3). Should be fixed with currency-aware conversion when KWD support is prioritized.
- **Raw `<select>` in dialog** — Plan specified native select elements rather than shadcn Select component. Can be upgraded later for visual consistency.
- **Dialog RTL fixed on first real usage** — Per CLAUDE.md mandate to convert shadcn physical CSS to logical properties when a component is first used in a page.

### Known Gaps (Not Blocking)
- **No unit tests** — Frontend test infrastructure not set up yet (planned for later)
- **Hardcoded English strings** in accounts page empty state and account detail loading/error/not-found messages — should be i18n'd when those screens are polished
- **Dialog labels "Type", "Currency", "Institution" are English-only** — no i18n keys; will be addressed when form is polished
- **`useUpdateAccount` hook not created** — Backend PUT endpoint exists but hook deferred until account editing UI is needed
- **middleware.ts still missing** — Auth protection for routes not yet implemented (noted in Unit 1F handoff)

## Next Steps
- PR #10 awaiting Copilot review → human review → squash merge
- Next frontend work: Unit 1H (Transaction table on account detail page)
