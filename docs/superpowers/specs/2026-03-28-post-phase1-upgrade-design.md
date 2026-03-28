# Post-Phase 1 Frontend Stack Upgrade — Design

**Date:** 2026-03-28
**Status:** Approved
**Scope:** Next.js 14 → 16, Tailwind v3 → v4, shadcn new-york → base-nova
**Prerequisite:** Phase 1 fully merged (Units 1A–1J) and UAT approved
**Tracks with:** GitHub Issue #12

---

## Decision

Skip Next.js 15 entirely. Upgrade directly from Next.js 14.2.x to Next.js 16.x.

**Rationale:**
- Next.js 16 is stable at v16.1.6 as of March 2026
- Breaking changes between 15→16 are config renames and async sitemap `id` — none apply to this codebase
- Doing the upgrade once (14→16) avoids a redundant intermediate migration
- The high-effort work is Tailwind v4 + shadcn base-nova, not the Next.js version bump itself

---

## Sequencing

```
Phase 1 complete (1I + 1J merged)
        ↓
UAT 1: Phase 1 functional acceptance
        ↓
PR 1: Next.js 16 + React 19   [chore PR, low risk]
        ↓
UAT 2: Smoke test — no regressions after upgrade
        ↓
PR 2: Tailwind v4 + shadcn base-nova   [chore PR, medium-high effort]
        ↓
UAT 3: Visual + RTL regression test
        ↓
Phase 2: Import & Templates begins
```

Both PRs must land **before** Phase 2 frontend work starts. Any shadcn component added during Phase 2 on the old stack would need to be re-done after the base-nova migration.

---

## UAT 1 — Phase 1 Functional Acceptance

Triggered after Units 1I + 1J merge to `main`. Full end-to-end journey on the current stack.

**Checklist:**
- [ ] Create household, sign up, log in — auth flow works
- [ ] Create accounts (all 5 types): bank_account, credit_card, cash_wallet, digital_wallet, financing_app
- [ ] Verify account balances compute correctly
- [ ] Record transactions (debit + credit), verify balance impact and soft delete
- [ ] Create transfers — same-currency and cross-currency — verify both account balances update atomically
- [ ] Categorize transactions; search and filter across 7 dimensions
- [ ] Bulk re-categorize and bulk delete
- [ ] Locale toggle: Arabic (RTL) ↔ English (LTR) switches correctly across all pages
- [ ] Brand logos render correctly in sidebar, navbar, and auth screen

---

## PR 1 — Next.js 16 + React 19

**Risk:** Low. Most Masareef pages are `"use client"`. No usage of PPR, `experimental.dynamicIO`, `serverRuntimeConfig`, sitemaps, or `next/legacy/image`.

**Scope:**
- Bump `next` → `16.x`, `react` / `react-dom` → `19.x` in `package.json`
- Rename `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize` in `next.config.*` if present
- Remove any `next/legacy/image` imports — replace with `next/image`
- Audit Server Component layouts for async `params` / `searchParams` requirement (Next.js 15 change that carries forward) — most pages are client components so impact is minimal, but `app/layout.tsx` and any layout files must be checked
- CI green, TypeScript clean, `pnpm build` passes

---

## UAT 2 — Post-PR1 Smoke Test

Lightweight confirmation that the Next.js/React upgrade introduced no regressions.

**Checklist:**
- [ ] Auth flow: login, signup, session persistence across page refresh
- [ ] TanStack Query data fetching: accounts, transactions, transfers pages load data correctly
- [ ] Middleware still protects all authenticated routes (redirect to login when unauthenticated)
- [ ] `pnpm build` passes with no TypeScript errors in CI

---

## PR 2 — Tailwind v4 + shadcn base-nova

**Risk:** Medium-High. Tailwind v4 is a CSS-first rewrite. shadcn base-nova switches from `@radix-ui/react-*` to `@base-ui/react` primitives and regenerates all component files. RTL logical property re-verification is a manual step that cannot be automated.

**Scope:**
- Upgrade `tailwindcss` v3 → v4
- Migrate config: remove `tailwind.config.ts`; move all theme tokens to CSS-first `@theme` block in `globals.css`
- Update CSS variables: HSL format → oklch (Tailwind v4 default); remap all Masareef design tokens (colors, spacing, radii, typography)
- Verify `tailwindcss-animate` compatibility with v4; update or replace if needed
- Re-run `shadcn init` with base-nova style
- Re-add every shadcn component: `pnpm dlx shadcn@latest add -y <component>` for all components in `frontend/src/components/ui/`
- **RTL audit:** inspect every regenerated component file for physical directional classes (`pl-`, `pr-`, `ml-`, `mr-`, `left-0`, `right-0`, `text-left`, `text-right`) and convert to logical equivalents (`ps-`, `pe-`, `ms-`, `me-`, `start-0`, `end-0`, `text-start`, `text-end`)
- Re-apply all Masareef design token overrides that were previously set in component files
- CI green, TypeScript clean, `pnpm build` passes

---

## UAT 3 — Visual + RTL Regression Test

The most thorough gate. Tailwind v4 and shadcn regeneration can silently break layout and spacing.

**Checklist:**

Arabic (RTL) — all pages:
- [ ] Accounts grid and detail page
- [ ] Transactions table, filters, form
- [ ] Transfers page and form
- [ ] Auth: login and signup pages
- [ ] Sidebar and navbar layout

English (LTR) — all pages:
- [ ] Accounts grid and detail page
- [ ] Transactions table, filters, form
- [ ] Transfers page and form
- [ ] Auth: login and signup pages
- [ ] Sidebar and navbar layout

Design token verification:
- [ ] Brand colors match `guides/09-design-tokens.md`
- [ ] Typography (Inter + Noto Sans Arabic) loads correctly
- [ ] Border radii and spacing match design spec

Component-level checks:
- [ ] Dialog, Sheet, Select, Dropdown, Form fields — alignment and spacing correct in both RTL and LTR
- [ ] No physical directional CSS classes survive in production build (`grep -r "pl-\|pr-\|ml-\|mr-\| left-0\| right-0"` in `src/`)
- [ ] MoneyDisplay renders correctly with Arabic-Indic numerals in Arabic locale
