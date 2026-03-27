# Unit 1F: Frontend Shell — Session Handoff

## What Was Done

Unit 1F set up the complete Next.js 14 frontend shell with App Router, shadcn/ui, Tailwind CSS, Supabase Auth integration, TanStack Query, next-intl i18n (Arabic + English), and money formatting utilities.

### Deliverables
- **Next.js 14.2.35** project at `frontend/` with TypeScript, App Router, `src/` directory
- **pnpm** as package manager (v10.32.1 via corepack)
- **Supabase Auth**: browser client (`lib/supabase/client.ts`), server client (`lib/supabase/server.ts`), `useAuth` hook
- **TanStack Query**: config (`lib/query-client.ts`), typed API client (`lib/api-client.ts`) with GET/POST/PUT/DELETE
- **next-intl i18n**: Arabic (default) + English translations, locale config, RTL `dir` attribute
- **Money formatting**: `lib/money.ts` with `formatAmount`, `formatAmountAr`, `formatWithCurrency` — all 7 currencies matching backend config
- **Root layout**: providers wrapper (TanStack Query + next-themes), NextIntlClientProvider, RTL support
- **App shell**: sidebar (7 nav items with lucide icons), top navbar, theme toggle (dark/light/system)
- **Auth pages**: login + signup with Supabase Auth, centered card layout
- **shadcn/ui components**: 12 Radix-based components (new-york style) — button, card, input, label, separator, sheet, dialog, dropdown-menu, avatar, badge, scroll-area, toast
- **CI workflow**: `.github/workflows/frontend.yml` (pnpm install → lint → tsc → build)

### Key Decisions
- **shadcn@3.8.5 pinned** — `shadcn@latest` generates Tailwind v4 "base-nova" style with `@base-ui/react`, incompatible with Next.js 14.2 / Tailwind v3. Documented in CLAUDE.md rule E.7 and Tooling section.
- **Tailwind v3 with HSL CSS variables** — globals.css uses `hsl(var(--...))` format, not `oklch()` (Tailwind v4)
- **Arabic default locale** — `defaultLocale: "ar"`, hardcoded in `i18n/request.ts`. Locale switching deferred to later.
- **Sonner → toast**: shadcn v3 uses the original toast component (not Sonner which is v4's replacement)
- **CSS logical properties in custom code** — sidebar uses `border-e` (not `border-r`), no physical directional classes in hand-written components
- **`useAuth` memoized** — Supabase client created via `useMemo` to prevent re-subscription on every render
- **`makeQueryClient()` DRY** — `providers.tsx` uses the shared factory from `query-client.ts`

### Known Gaps (Not Blocking)
- **`middleware.ts` not created** — planned in file structure for auth redirects + locale detection, but no task step covered it. Unauthenticated users can access `/dashboard` directly. Add in a future unit.
- **`money-display.tsx` shared component not created** — utility `money.ts` exists; React wrapper can be added when first needed
- **Dashboard page has hardcoded English text** — placeholder only; will use i18n when real dashboard is built (Phase 4)
- **shadcn auto-generated components have physical directional CSS** (`right-`, `left-`, `pr-`, `pl-`) — must be converted to logical equivalents (`end-`, `start-`, `pe-`, `ps-`) per-component when first used in a real page for RTL
- **API client `apiGet` sends Content-Type header** — harmless but technically incorrect for GET requests

## Next Steps
- Unit 1F is ready for PR → review → merge
- Frontend CI workflow will validate on PR
- The app shell, auth integration, i18n, and design system foundation are ready for subsequent frontend units to build on
- Next frontend work should start with middleware.ts for auth protection
