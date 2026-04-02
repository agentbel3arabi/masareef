# Session Handoff Note — Phase 3, Unit 3D-4: Frontend Integration

**Date:** 2025-07-18
**PR:** #50 — feat(frontend): Phase 3D-4 — Wire debt/people components into pages + navigation
**Branch:** feature/phase-3d-4-frontend-integration

---

## 1. What Was Completed

All 7 tasks from the Phase 3D-4 plan executed and committed.

**New files:**
- `frontend/src/lib/types/obligations.ts` — ObligationDebt, ObligationInstallment, AccountObligationsResponse types
- `frontend/src/hooks/use-account-obligations.ts` — TanStack Query hook for fetching account-linked obligations
- `frontend/src/components/accounts/account-obligations-section.tsx` — Section showing linked loans/installments on account detail
- `frontend/src/components/people/person-card.tsx` — PersonCard with avatar, relationship, phone, per-currency balance display
- `frontend/src/components/people/person-list.tsx` — Grid of PersonCards with AlertDialog delete confirmation + empty state
- `frontend/src/app/(app)/people/page.tsx` — Standalone person management page with create/edit/delete flows

**Modified files:**
- `frontend/src/app/(app)/accounts/[id]/page.tsx` — Added AccountObligationsSection between header and transactions
- `frontend/src/app/(app)/dashboard/page.tsx` — Replaced Active Debts placeholder StatCard with real useDebts+useInstallments count
- `frontend/src/lib/nav-items.ts` — Added `/people` nav entry after `/debts` using Users icon
- `frontend/src/components/layout/sidebar.tsx` — Added `/people` to Planning section filter
- `frontend/messages/en.json` — Added 25+ i18n keys for obligations, dashboard stats, people
- `frontend/messages/ar.json` — Matching Arabic translations for all above

---

## 2. Key Decisions & Rationale

- **PersonCard uses `editPerson ?? undefined` instead of `editPerson`** — PersonForm expects `PersonResponse | undefined`, not `PersonResponse | null`. Nullish coalescing converts cleanly.
- **Users icon shared between People and Gam3eya** — Both nav items use the `Users` icon from lucide-react. Since Gam3eya is disabled, no visual confusion. Can differentiate later if needed.
- **Obligations hook uses `/accounts/{id}/obligations` endpoint** — This endpoint doesn't exist yet in the backend. The hook will return empty data until Phase 3E or later implements it. No UI error shown (graceful empty state).
- **Dashboard stat uses separate useDebts + useInstallments hooks** — Rather than a dedicated endpoint, we compute `activeDebtsCount` client-side from two existing hooks. Simple and avoids new backend work.

---

## 3. Known Gaps / Deferred

- **Account obligations endpoint** — `GET /api/v1/accounts/{id}/obligations` not yet implemented in backend. Hook is ready, UI shows nothing until backend delivers. Target: Phase 3E or later.
- **Person delete API** — PersonList has delete confirmation UI, but the actual `DELETE /api/v1/people/{id}` soft-delete call depends on backend RBAC being wired. Already built in 3D-3.
- **Person balance display** — PersonCard renders `balances.by_currency` from PersonResponse. If backend doesn't populate this field yet, the balance section gracefully hides.

---

## 4. What's Next

- Next unit: Phase 3E or Phase 4 per roadmap
- First thing to do: Check `docs/05-roadmap.md` for next phase, read its plan
- Merge PR #50 after CI passes and Copilot review completes

---

## 5. PRs Merged

- **PR #50** — feat(frontend): Phase 3D-4 — Wire debt/people components into pages + navigation — pending review

---

## 6. Test Status

- Unit tests: N/A (frontend-only, no unit test files for new components yet)
- TypeScript: `tsc --noEmit` passes clean
- Build: `pnpm build` succeeds, `/people` route generated
- Lint: 0 errors (3 pre-existing warnings in unrelated files)
- CI: pending (PR just created)

---

## 7. Notes / Surprises

- The subagent needed to fix a TypeScript null vs undefined mismatch on PersonForm's `initialData` prop — plan code passed `null` but the component expects `undefined`. Minor but good to know PersonForm typing is strict.
- All 12 files changed are frontend-only. No backend changes in this unit.
- The 3 lint warnings (transfers page) are pre-existing from Phase 3C and unrelated to this work.
