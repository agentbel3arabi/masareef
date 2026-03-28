# Unit 1I: Design Polish, Logos & Locale Switching — Session Handoff

## What Was Done

Unit 1I applied Masareef brand tokens, integrated logos, enabled locale switching, completed the i18n sweep, and polished all Phase 1 pages. No new backend work.

### Deliverables

- **Design tokens** (`globals.css`): Emerald primary `#16A34A` → `142.1 76.2% 36.3%`, slate surfaces, amber warning, `--radius: 0.625rem`, full dark mode
- **Fonts** (`layout.tsx`, `tailwind.config.ts`): Inter + Noto Sans Arabic via `next/font/google` with CSS variables `--font-inter` / `--font-noto-arabic`; `fontFamily.sans` in Tailwind uses both
- **Logo component** (`components/shared/logo.tsx`): Theme-aware `<Logo variant="horizontal|stacked|icon" width height />` using `useTheme()` from `next-themes`; SVGs copied to `frontend/public/logos/`
- **Logo placements**: Sidebar → horizontal (140×32), Navbar mobile → icon (28×28), Auth layout → stacked (120×80), Favicon → SVG via metadata
- **Locale toggle** (`components/layout/locale-toggle.tsx`): Cookie-based AR↔EN switcher; sets `NEXT_LOCALE` cookie + localStorage, calls `router.refresh()`
- **i18n request** (`i18n/request.ts`): Reads `NEXT_LOCALE` cookie, falls back to `defaultLocale` ("ar")
- **Translation keys** (`ar.json`, `en.json`): Full `transactions` (18 keys) and `transfers` (13 keys) namespaces added
- **i18n sweep**: All 8 Unit 1H components updated — `transaction-row`, `transaction-table`, `transaction-form`, `transaction-filters`, `transfer-form`, `transfers/page`, `accounts/[id]/page`, `transactions/page`
- **Account cards** (`account-card.tsx`): Per-type icon colors (blue/purple/green/amber/rose) + `hover:-translate-y-1 transition-all duration-200`
- **Accounts page** (`accounts/page.tsx`): `<TransferForm />` added next to `<CreateAccountDialog />`
- **Transaction table** (`transaction-table.tsx`): `<tbody className="[&>tr:nth-child(even)]:bg-muted/30">`
- **Category badges** (`transaction-row.tsx`): Colored dot + text pattern (`Badge` with `gap-1.5` and inline `<span>` for dot)
- **Category hook** (`hooks/use-categories.ts`): `useCategories(type?: "expense" | "income")` — TanStack Query, query key `["categories", type]`
- **Category selector** (`transaction-form.tsx`): `<select>` between Description and Amount; filters by expense/income based on debit/credit toggle; `category_id` included in mutation payload

### Key Decisions

- **Favicon via metadata** — ImageMagick not available, used `metadata.icons: { icon: "/logos/favicon.svg" }` instead of `.ico`
- **`px-` allowed** — Symmetric shorthand classes are fine per CLAUDE.md; only asymmetric directional classes (`pl-`, `pr-`, etc.) are forbidden
- **Category select uses native `<select>`** — Not shadcn `Select` — simpler, works well for this use case; can be upgraded in later phase if needed
- **i18n uses `useTranslations` in client components, `getTranslations` in server components** — The sweep adapted per component type

### Known Gaps (Not Blocking)

- **`name_en` hardcoded in category options** — Category names show English; locale-aware display (switching between `name_en`/`name_ar`) is a future enhancement
- **No toast/error feedback** — Mutation errors still silent (consistent with prior units)
- **Frontend tests** — Still no test infrastructure

## PR

- PR #13 open, Copilot review requested
- Branch: `feature/unit-1I-design-polish`
- Worktree: `.worktrees/unit-1I`

## Next Steps

- PR #13 awaiting Copilot review → human review → squash merge
- Next unit: **Unit 1J** — Integration tests (plan already exists at `docs/superpowers/plans/phase-1/unit-1J.md`)
