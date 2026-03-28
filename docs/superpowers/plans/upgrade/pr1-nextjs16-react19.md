# Next.js 16 + React 19 Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the frontend from Next.js 14.2.x + React 18 to Next.js 16.x + React 19 with zero feature regressions.

**Architecture:** Pure dependency bump. `next.config.mjs` has no deprecated options. All dynamic pages use `"use client"` with the `useParams()` hook — no Server Component `params` prop migration needed. No `next/legacy/image` in use. Risk is low.

**Tech Stack:** Next.js 16, React 19, pnpm, TypeScript

**Prerequisites:** Phase 1 fully merged (Units 1A–1J), UAT 1 approved.

**Design spec:** `docs/superpowers/specs/2026-03-28-post-phase1-upgrade-design.md`

---

## File Structure

| File | Change |
|------|--------|
| `frontend/package.json` | Bump `next`, `react`, `react-dom`, `eslint-config-next`, `@types/react`, `@types/react-dom` |
| `frontend/next.config.mjs` | No change needed (empty config — no deprecated options present) |
| `frontend/src/` | No source changes expected — audit step confirms this |

---

### Task 1: Pre-upgrade audit — confirm nothing to fix

**Files:**
- Read: `frontend/next.config.mjs`
- Read: `frontend/package.json`
- Search: `frontend/src/`

- [ ] **Step 1: Confirm `next.config.mjs` has no deprecated options**

  ```bash
  cat frontend/next.config.mjs
  ```

  Expected: only `withNextIntl` wrapper and an empty `nextConfig = {}`. No `skipMiddlewareUrlNormalize`, `experimental.dynamicIO`, `serverRuntimeConfig`, or `bundlePagesExternals`.

- [ ] **Step 2: Confirm no `next/legacy/image` imports**

  ```bash
  grep -r "next/legacy/image" frontend/src/ || echo "none found"
  ```

  Expected: `none found`

- [ ] **Step 3: Confirm all dynamic route pages use the client-side `useParams()` hook (not the Server Component `params` prop)**

  ```bash
  grep -r "params\b" frontend/src/app/ --include="*.tsx" -l
  ```

  Open each file listed. Each should start with `"use client"` and use `useParams()` from `next/navigation` — not receive `params` as a function argument. This codebase has one: `(app)/accounts/[id]/page.tsx`.

  Check it:

  ```bash
  head -5 frontend/src/app/\(app\)/accounts/\[id\]/page.tsx
  ```

  Expected first line: `"use client";`

- [ ] **Step 4: Commit nothing — this is an audit only**

  If all three checks pass, proceed to Task 2. If any check fails, fix the issue before bumping versions.

---

### Task 2: Verify ecosystem compatibility

**Files:**
- Read: `frontend/package.json`

These packages have React 19 / Next.js 16 compatibility to confirm before bumping:

- [ ] **Step 1: Confirm next-intl version**

  ```bash
  grep "next-intl" frontend/package.json
  ```

  Expected: `^4.8.3`. next-intl v4+ supports Next.js 15/16 and React 19. No action needed.

- [ ] **Step 2: Confirm @supabase/ssr version**

  ```bash
  grep "@supabase/ssr" frontend/package.json
  ```

  Expected: `^0.9.0`. @supabase/ssr v0.9+ supports Next.js 15/16. No action needed.

- [ ] **Step 3: Confirm @tanstack/react-query version**

  ```bash
  grep "react-query" frontend/package.json
  ```

  Expected: `^5.95.2`. TanStack Query v5 supports React 19. No action needed.

---

### Task 3: Bump package versions

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Update `frontend/package.json` — replace the `dependencies` and `devDependencies` version strings**

  In `dependencies`, change:
  ```json
  "next": "14.2.35",
  "react": "^18",
  "react-dom": "^18",
  ```
  To:
  ```json
  "next": "^16.1.6",
  "react": "^19",
  "react-dom": "^19",
  ```

  In `devDependencies`, change:
  ```json
  "@types/react": "^18",
  "@types/react-dom": "^18",
  "eslint-config-next": "14.2.35",
  ```
  To:
  ```json
  "@types/react": "^19",
  "@types/react-dom": "^19",
  "eslint-config-next": "^16.1.6",
  ```

- [ ] **Step 2: Install updated packages**

  ```bash
  cd frontend && pnpm install
  ```

  Expected: packages resolved and installed, `pnpm-lock.yaml` updated. No peer dependency errors.

---

### Task 4: TypeScript check

**Files:**
- Read output only

- [ ] **Step 1: Run TypeScript compiler**

  ```bash
  cd frontend && pnpm exec tsc --noEmit
  ```

  Expected: no output (zero errors). React 19 changed some type signatures (e.g., `children` prop is no longer implicit on `FC` — but this codebase uses explicit prop types so no impact expected).

- [ ] **Step 2: If errors appear, fix them**

  Common React 19 TypeScript errors:
  - `children` must now be explicitly typed in component props — add `children: React.ReactNode` to any affected interface
  - `ref` handling changes if any component uses `forwardRef` — check the diff

  Fix and re-run `pnpm exec tsc --noEmit` until zero errors.

---

### Task 5: Build and lint check

**Files:**
- Read output only

- [ ] **Step 1: Run production build**

  ```bash
  cd frontend && pnpm build
  ```

  Expected: build completes successfully. Note any warnings but only fix errors.

- [ ] **Step 2: Run lint**

  ```bash
  cd frontend && pnpm lint
  ```

  Expected: no errors. Warnings are acceptable.

---

### Task 6: Commit

- [ ] **Step 1: Stage changes**

  ```bash
  cd frontend && git add package.json pnpm-lock.yaml
  ```

- [ ] **Step 2: Commit**

  ```bash
  git commit -m "chore(frontend): upgrade Next.js 14 → 16, React 18 → 19"
  ```

- [ ] **Step 3: Push and open PR**

  ```bash
  git push -u origin chore/upgrade-nextjs16-react19
  ```

  Open a PR targeting `main`. Title: `chore: upgrade Next.js 14 → 16, React 18 → 19`. CI must pass before merging.

---

## UAT 2 Checklist (run after PR merges to main)

- [ ] Auth flow: login, signup, session persistence across page refresh
- [ ] TanStack Query data fetching: accounts, transactions, transfers pages load data correctly
- [ ] Middleware still protects all authenticated routes (redirect to login when unauthenticated)
- [ ] `pnpm build` passes in CI
