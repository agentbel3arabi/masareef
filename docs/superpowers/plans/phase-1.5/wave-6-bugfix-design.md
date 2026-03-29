# Phase 1.5 Wave 6: Bug Fix + Design Fidelity

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 18 reported bugs and design gaps discovered during Unit 1.5L UAT. Ensure all existing pages match their Stitch designs and all functional flows (auth, onboarding, transactions) work end-to-end.

**Architecture:** Two sequential branches — functional bugs first, then design fidelity. Stitch MCP used for design reference before implementing UI changes.

**Tech Stack:** Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui (base-nova), next-intl, Supabase auth

**Design spec:** Stitch project `3967836651870677827` + static HTML in `docs/stitch-designs/html/`

---

## Stitch Design References

| Page/Component | Stitch HTML File | Stitch Screen Map |
|---------------|-----------------|-------------------|
| Sidebar | `05-dashboard.html` | Sidebar section |
| Dashboard | `05-dashboard.html` | Full page |
| Accounts grid | `06-accounts.html` | Full page |
| Account detail | `07-account-detail.html` | Full page |
| Transactions global | `07b-transactions-global.html` | Full page |
| Transaction form | `21-transaction-form.html` | Sheet/modal |
| Auth: Login | `02-login.html` | Full page |
| Auth: Registration | `03-registration.html` | Full page |
| Onboarding | `04-onboarding.html` | Full page |
| Empty states | `23-empty-states.html` | Cross-cutting |

---

## Bug Index

| # | Category | Bug | Severity | Branch |
|---|----------|-----|----------|--------|
| 1 | Auth | Login doesn't redirect after login | HIGH | Branch 1 |
| 2 | Auth | Signup no confirmation email message | HIGH | Branch 1 |
| 3 | Auth | No duplicate email error handling | MEDIUM | Branch 1 |
| 4 | Auth | Auth page logos too small | LOW | Branch 2 |
| 5 | Onboarding | Silent failures, no retry UI | HIGH | Branch 1 |
| 6 | Layout | No sidebar collapse button | MEDIUM | Branch 2 |
| 7 | Layout | Logo has excess left spacing | LOW | Branch 2 |
| 8 | Layout | Brand tagline needs better design | LOW | Branch 2 |
| 9 | Layout | Sidebar missing Help + Logout at bottom | MEDIUM | Branch 2 |
| 10 | Layout | Need floating + FAB for add transaction | MEDIUM | Branch 2 |
| 11 | Transactions | Transaction creation error | HIGH | Branch 1 |
| 12 | Transactions | Credit card transaction error | HIGH | Branch 1 |
| 13 | Transactions | Form padding/spacing issues | LOW | Branch 2 |
| 14 | Transactions | Category shows number, no icons | MEDIUM | Branch 2 |
| 15 | Design | Accounts page doesn't match Stitch | MEDIUM | Branch 2 |
| 16 | Design | Transactions page doesn't match Stitch | MEDIUM | Branch 2 |
| 17 | Design | Account detail missing components | MEDIUM | Branch 2 |
| 18 | Design | Many components missing from designs | MEDIUM | Branch 2 |

---

## Branch 1: `fix/auth-onboarding-bugs`

**Prerequisite:** Unit 1.5L merged to main. ✅

### Task 1: Create branch

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef
git checkout main && git pull
git checkout -b fix/auth-onboarding-bugs
```

---

### Task 2: Fix login redirect (Bug #1)

**Files:**
- Modify: `frontend/src/app/(auth)/login/page.tsx`

**Root cause:** `router.push("/dashboard")` fires before Supabase session cookie is established. The server-side auth check on `/dashboard` doesn't see the session yet.

**Fix:**
1. After `signInWithPassword()` succeeds, add `router.refresh()` before or alongside `router.push("/dashboard")` to force Next.js to re-run server components with the new cookies
2. Alternative: use `window.location.href = "/dashboard"` for a full page navigation that picks up new cookies

**Acceptance criteria:**
- [ ] Login with valid credentials → lands on `/dashboard` without manual refresh
- [ ] Login with invalid credentials → shows error message, stays on login page

---

### Task 3: Fix signup confirmation flow (Bug #2)

**Files:**
- Modify: `frontend/src/app/(auth)/signup/page.tsx`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

**Root cause:** After `signUp()`, page redirects to `/dashboard` instead of showing "check your email" message.

**Fix:**
1. Add state: `const [showConfirmation, setShowConfirmation] = useState(false)`
2. On successful signup: `setShowConfirmation(true)` instead of `router.push("/dashboard")`
3. Render confirmation screen:
   - CheckCircle icon
   - "Check your email" heading
   - "We sent a confirmation link to {email}. Click it to activate your account."
   - "Go to Login" button → `/login`
   - "Didn't receive it? Resend" link (calls `supabase.auth.resend()`)

**i18n keys to add:**
```json
"signup": {
  "confirmTitle": "Check your email",
  "confirmDescription": "We sent a confirmation link to {email}. Click it to activate your account.",
  "goToLogin": "Go to Login",
  "resendEmail": "Didn't receive it? Resend"
}
```

**Acceptance criteria:**
- [ ] Signup with new email → shows "check your email" screen
- [ ] "Go to Login" link works
- [ ] Does NOT redirect to dashboard

---

### Task 4: Fix duplicate email error (Bug #3)

**Files:**
- Modify: `frontend/src/app/(auth)/signup/page.tsx`

**Root cause:** Supabase error message may not be user-friendly.

**Fix:**
1. After catching error from `signUp()`, check if message contains "already registered" or similar
2. Show enhanced error: "This email is already registered." with a "Log in instead" link
3. Add i18n keys for the enhanced error message

**Acceptance criteria:**
- [ ] Signup with already-registered email → shows clear error + "Log in instead" link

---

### Task 5: Fix onboarding errors (Bug #5)

**Files:**
- Modify: `frontend/src/app/(onboarding)/onboarding/page.tsx`

**Root cause:** Household creation failures are silently caught. User sees no feedback and may advance to step 4 without a household.

**Fix:**
1. Add `const [stepError, setStepError] = useState("")` state
2. In step 3 submit handler, on catch: `setStepError(error.message)` and display error in UI
3. Show error message with "Retry" button on step 3
4. Only advance to step 4 if `createHousehold` succeeded (check return value)
5. Add explicit loading indicator during API calls (beyond just button disabled state)

**Acceptance criteria:**
- [ ] If household creation fails → shows error with retry option
- [ ] Only reaches step 4 if household was actually created
- [ ] Loading state visible during API calls

---

### Task 6: Fix transaction creation errors (Bugs #11, #12)

**Files:**
- Modify: `frontend/src/components/transactions/transaction-form.tsx`

**Root cause:** Need to investigate — could be amount conversion, missing fields, or credit card validation.

**Steps:**
1. Read the backend transaction router to verify expected request shape
2. Add try/catch with explicit error display around `createTx.mutateAsync()`
3. Check if credit card transactions need special handling (signed amounts, credit limit validation)
4. Verify `parseMajorToMinor()` works correctly for all currency exponents
5. Test with both regular account and credit card account

**Acceptance criteria:**
- [ ] Create transaction on bank account → succeeds
- [ ] Create transaction on credit card → succeeds
- [ ] If creation fails → shows error toast with message from backend
- [ ] Amount conversion is correct (minor units)

---

### Task 7: Final verification (Branch 1)

- [ ] `pnpm build` passes
- [ ] `pnpm lint` clean
- [ ] `tsc --noEmit` clean
- [ ] Manual test: signup → email confirm → login → onboarding → dashboard → add transaction

---

## Branch 2: `fix/design-fidelity-v2`

**Prerequisite:** Branch 1 merged to main.

**Pre-work:** Before starting implementation, use Stitch MCP to analyze the relevant design screens for each component being updated. Extract layout patterns, spacing, component structure.

### Task 8: Create branch

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef
git checkout main && git pull
git checkout -b fix/design-fidelity-v2
```

---

### Task 9: Sidebar redesign (Bugs #6, #7, #8, #9)

**Files:**
- Modify: `frontend/src/components/layout/sidebar.tsx`
- Modify: `frontend/src/app/(app)/layout.tsx`
- Create: `frontend/src/contexts/sidebar-context.tsx` (or use useState in layout)

**Stitch reference:** `05-dashboard.html` — sidebar section

**Changes:**
1. **Collapse button** (Bug #6): Add ChevronsLeft/ChevronsRight toggle in sidebar header. Collapsed state: w-16 showing only icons. Expanded: w-64. Store preference in localStorage. Animate with `transition-all duration-200`.
2. **Logo left spacing** (Bug #7): Remove excess padding before logo. Use `ps-4` not `ps-6` or more.
3. **Tagline design** (Bug #8): Redesign tagline as a subtle, smaller text integrated cleanly below logo. Use `text-[10px]` or `text-xs` with `text-muted-foreground/60`. In collapsed state, hide tagline.
4. **Help + Logout at bottom** (Bug #9): Add `mt-auto` section at sidebar bottom with:
   - Help link (CircleHelp icon + "Help" label)
   - Logout button (LogOut icon + "Sign Out" label)
   - In collapsed state, show only icons

**Acceptance criteria:**
- [ ] Sidebar has visible collapse/expand toggle on desktop
- [ ] Collapsed sidebar shows icons only, expanded shows full labels
- [ ] Logo starts from left edge without excess space
- [ ] Tagline is subtle and well-designed
- [ ] Help and Logout pinned to sidebar bottom
- [ ] Preference persists across page navigations

---

### Task 10: Floating action button (Bug #10)

**Files:**
- Modify: `frontend/src/app/(app)/transactions/page.tsx`
- Modify: `frontend/src/components/transactions/transaction-form.tsx`

**Fix:**
1. Remove the "Add Transaction" header button
2. Add a floating action button (FAB) in the bottom-end corner: `fixed bottom-6 end-6 z-50`
3. Primary gradient background, rounded-full, Plus icon
4. Opens the transaction form Sheet on click
5. On mobile, the FAB should also be visible and accessible

**Acceptance criteria:**
- [ ] Green floating + button visible in bottom-right (or bottom-left in RTL)
- [ ] Clicking FAB opens transaction form
- [ ] FAB visible on mobile and desktop

---

### Task 11: Auth page logos (Bug #4)

**Files:**
- Modify: `frontend/src/app/(auth)/layout.tsx`
- Modify: `frontend/src/components/shared/logo.tsx`

**Stitch reference:** `02-login.html`, `03-registration.html`

**Fix:**
1. Increase logo sizes on auth pages (both desktop marketing panel and mobile form panel)
2. Reference Stitch login/registration designs for proper sizing and placement
3. Update `LOGO_SIZES.authPanel` if needed

**Acceptance criteria:**
- [ ] Logos look prominent and properly sized on login/signup pages
- [ ] Both desktop and mobile layouts look balanced

---

### Task 12: Transaction form design (Bugs #13, #14)

**Files:**
- Modify: `frontend/src/components/transactions/transaction-form.tsx`

**Stitch reference:** `21-transaction-form.html`

**Changes:**
1. **Padding/spacing** (Bug #13): Match form field spacing to Stitch design. Adjust gap between fields, section padding, label-to-input spacing.
2. **Category display** (Bug #14):
   - Fix SelectValue to show category name (not number) when selected
   - Map category `icon` field to rendered emoji/icon in the dropdown
   - When selected, show icon + name in the trigger

**Acceptance criteria:**
- [ ] Form spacing matches Stitch transaction form design
- [ ] Category dropdown shows icons next to names
- [ ] Selected category shows name (not number) in the trigger

---

### Task 13: Accounts page fidelity (Bugs #15, #17)

**Files:**
- Modify: `frontend/src/app/(app)/accounts/page.tsx`
- Modify: `frontend/src/app/(app)/accounts/[id]/page.tsx`
- May modify account card components

**Stitch reference:** `06-accounts.html`, `07-account-detail.html`

**Changes:**
1. Compare current accounts grid against `06-accounts.html` — fix card layout, stats cards, summary section
2. Compare account detail page against `07-account-detail.html` — add missing components (balance history, transaction list within account, account stats)
3. Implement missing components identified in design comparison

**Acceptance criteria:**
- [ ] Accounts grid page matches Stitch `06-accounts.html` at functional fidelity level
- [ ] Account detail page matches Stitch `07-account-detail.html` at functional fidelity level

---

### Task 14: Transactions page fidelity (Bug #16)

**Files:**
- Modify: `frontend/src/app/(app)/transactions/page.tsx`
- May modify transaction list/table components

**Stitch reference:** `07b-transactions-global.html`

**Changes:**
1. Compare current page against `07b-transactions-global.html`
2. Fix filter bar layout, table styling, summary stats
3. Add any missing components from the design

**Acceptance criteria:**
- [ ] Transactions page matches Stitch `07b-transactions-global.html` at functional fidelity level

---

### Task 15: Final verification (Branch 2)

- [ ] `pnpm build` passes
- [ ] `pnpm lint` clean
- [ ] `tsc --noEmit` clean
- [ ] Visual check all pages at 375px, 768px, 1280px
- [ ] RTL check — switch to Arabic, verify all pages flip correctly
- [ ] Dark mode check — verify all pages render correctly

---

## Execution Order

```
1. Branch 1: fix/auth-onboarding-bugs
   ├── Task 1: Create branch
   ├── Task 2: Login redirect fix
   ├── Task 3: Signup confirmation flow
   ├── Task 4: Duplicate email error
   ├── Task 5: Onboarding error handling
   ├── Task 6: Transaction creation errors
   ├── Task 7: Final verification
   ├── Push → PR → Copilot review → Fix → UAT → Merge
   │
2. Stitch Design Session
   ├── Analyze sidebar from 05-dashboard.html
   ├── Analyze transaction form from 21-transaction-form.html
   ├── Analyze accounts from 06-accounts.html + 07-account-detail.html
   ├── Analyze transactions from 07b-transactions-global.html
   │
3. Branch 2: fix/design-fidelity-v2
   ├── Task 8: Create branch
   ├── Task 9: Sidebar redesign (collapse, logo, tagline, help/logout)
   ├── Task 10: Floating action button
   ├── Task 11: Auth page logos
   ├── Task 12: Transaction form design (spacing, category display)
   ├── Task 13: Accounts page fidelity
   ├── Task 14: Transactions page fidelity
   ├── Task 15: Final verification
   ├── Push → PR → Copilot review → Fix → UAT → Merge
```

---

## Summary

| Branch | Tasks | Bugs Fixed |
|--------|-------|------------|
| `fix/auth-onboarding-bugs` | 7 | #1, #2, #3, #5, #11, #12 |
| `fix/design-fidelity-v2` | 8 | #4, #6, #7, #8, #9, #10, #13, #14, #15, #16, #17, #18 |
| **Total** | **15** | **18 bugs** |
