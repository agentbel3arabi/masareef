# Backlog Archive

Completed and cancelled items from [`BACKLOG.md`](../BACKLOG.md).
Organized by the phase in which items were resolved.

---

## Summary

| ID | Item | Category | Resolved In | Status |
|----|------|----------|-------------|--------|
| BL-049 | Financing app used/available from balance | backend-dep | Phase 3C | ✅ Done |
| BL-050 | Card installment row to account detail link | backend-dep | Phase 3D | ✅ Done |
| BL-051 | Interest rate field on installment form | backend-dep | Phase 3D | ✅ Done |
| BL-052 | N+1 query in list_persons | tech-debt | Phase 3B | ✅ Done |
| BL-053 | repayment_mode None validation | bug | Phase 3B | ✅ Done |
| BL-054 | Rate limiting and file size limits | deferred | Phase 1.5 | ✅ Done |
| BL-055 | P2P debt types (personal_lent, personal_borrowed) | deferred | Phase 3B | ✅ Done |
| BL-056 | Error handling architecture | deferred | Phase 2 | ✅ Done |
| BL-001 | Net worth card green color for negative values | bug | Phase 3.5 | ✅ Done |
| BL-002 | Credit card available balance green for negative | bug | Phase 3.5 | ✅ Done |
| BL-003 | Transaction form missing account selector | bug | Phase 3.5 | ✅ Done |
| BL-004 | Category dropdown shows raw __uncategorized__ | bug | Phase 3.5 | ✅ Done |
| BL-005 | Date format standardization (dd/mm/yyyy) | bug | Phase 3.5 | ✅ Done |

---

## Resolved During Backfill (2026-04-03)

Items that were deferred in earlier phases but confirmed resolved by the time this backlog was created.

### BL-049: Financing app used/available from balance

**Category:** backend-dep  
**Origin:** backend-dependencies.md #16 (placeholder tracking)  
**Resolved in:** Phase 3C (financing-apps summary endpoint)  
**Resolution date:** 2026-04-03 (backfill)  
**Context:** Frontend needed to display which financing apps are "used" (active) vs. "available" (not yet linked). Required a backend endpoint to fetch this data.  
**Resolution:** Financing apps summary endpoint was implemented in Phase 3C, providing the data structure needed to populate the frontend balance section and show app statuses.  
**Status:** ✅ Done

---

### BL-050: Card installment row to account detail link

**Category:** backend-dep  
**Origin:** backend-dependencies.md #18 (placeholder tracking)  
**Resolved in:** Phase 3D (debts section redesign)  
**Resolution date:** 2026-04-03 (backfill)  
**Context:** Frontend installment card rows in the debts section needed a navigation link to the account detail page (for the originating account of the installment).  
**Resolution:** During Phase 3D, the debts section was redesigned and installment cards now include proper navigation links to their associated accounts.  
**Status:** ✅ Done

---

### BL-051: Interest rate field on installment form

**Category:** backend-dep  
**Origin:** backend-dependencies.md #14 (placeholder tracking)  
**Resolved in:** Phase 3D  
**Resolution date:** 2026-04-03 (backfill)  
**Context:** Installment form needed a field to capture the annual interest rate (APR) so users could track and see financing costs. Database schema needed the column to store this value.  
**Resolution:** The `annual_rate_bps` column exists in the `installments` table (stored as basis points × 10,000), and the form field was implemented to allow users to input and edit this value.  
**Status:** ✅ Done

---

### BL-052: N+1 query in list_persons

**Category:** tech-debt  
**Origin:** Phase 3B handoff notes  
**Resolved in:** Phase 3B  
**Resolution date:** 2026-04-03 (backfill)  
**Context:** The `list_persons()` backend function was fetching person records and then computing balances individually in a loop, causing N database queries for N persons.  
**Resolution:** Fixed by implementing `compute_persons_balances_bulk()` which computes all person balances in a single aggregated query, eliminating the N+1 pattern.  
**Status:** ✅ Done

---

### BL-053: repayment_mode None validation

**Category:** bug  
**Origin:** Phase 3B handoff notes  
**Resolved in:** Phase 3B  
**Resolution date:** 2026-04-03 (backfill)  
**Context:** P2P debts were allowing `repayment_mode` to be `None`, which caused ambiguity when planning how a debt should be repaid.  
**Resolution:** Added validation to require a valid `repayment_mode` enum value for all P2P debts. The field is now non-nullable and must be set during creation.  
**Status:** ✅ Done

---

### BL-054: Rate limiting and file size limits

**Category:** deferred  
**Origin:** Phase 1.5 gap remediation spec  
**Resolved in:** Phase 1.5  
**Resolution date:** 2026-04-03 (backfill)  
**Context:** API endpoints needed protection against abuse (rate limiting) and large file uploads (import) needed size constraints.  
**Resolution:** Implemented rate limiting and file size limits via `backend/app/limiter.py`, which provides configurable rate limit rules and file upload size validation across all endpoints.  
**Status:** ✅ Done

---

### BL-055: P2P debt types (personal_lent, personal_borrowed)

**Category:** deferred  
**Origin:** Phase 3A handoff notes  
**Resolved in:** Phase 3B  
**Resolution date:** 2026-04-03 (backfill)  
**Context:** The debts feature needed to distinguish between debts the user lent to others vs. debts the user borrowed from others in P2P lending scenarios.  
**Resolution:** Added `personal_lent` and `personal_borrowed` debt type enum values in Phase 3B. These types allow the app to properly categorize and display P2P debts with the correct directionality.  
**Status:** ✅ Done

---

### BL-056: Error handling architecture

**Category:** deferred  
**Origin:** Phase 1.5 gap remediation spec  
**Resolved in:** Phase 2  
**Resolution date:** 2026-04-03 (backfill)  
**Context:** The backend needed a consistent error response format and architecture for handling and returning errors to the frontend.  
**Resolution:** Established error handling architecture in Phase 2 following the convention outlined in `CLAUDE.md` Section D: standardized error envelope with `error.code`, `error.message`, and `error.details`, along with appropriate HTTP status codes (400, 401, 403, 404, 409, 422, 500).  
**Status:** ✅ Done

---

## Resolved During Phase 3.5 (2026-04-04)

### BL-001: Net worth card green color for negative values

**Category:** bug
**Origin:** Phase 3.5 UX Polish Sprint spec, Unit 1.1
**Resolved in:** Phase 3.5 (PR #51)
**Resolution date:** 2026-04-04
**Context:** Net worth card showed green background when net worth was negative.
**Resolution:** StatCard uses conditional `variant` based on net worth sign — `"success"` when >= 0, `"destructive"` when < 0.
**Status:** ✅ Done

---

### BL-002: Credit card available balance green for negative

**Category:** bug
**Origin:** Phase 3.5 UX Polish Sprint spec, Unit 1.2
**Resolved in:** Phase 3.5 (PR #51)
**Resolution date:** 2026-04-04
**Context:** Credit card "Available" balance showed green text when negative.
**Resolution:** Applied conditional color logic — red/destructive when Available < 0.
**Status:** ✅ Done

---

### BL-003: Transaction form missing account selector

**Category:** bug
**Origin:** Phase 3.5 UX Polish Sprint spec, Unit 1.3
**Resolved in:** Phase 3.5 (PR #51)
**Resolution date:** 2026-04-04
**Context:** New Transaction form had no account dropdown when accessed from global transactions page.
**Resolution:** Added account selector with `selectedAccountId` state, populated from `useAccounts()` hook.
**Status:** ✅ Done

---

### BL-004: Category dropdown shows raw __uncategorized__

**Category:** bug
**Origin:** Phase 3.5 UX Polish Sprint spec, Unit 1.4
**Resolved in:** Phase 3.5 (PR #51 + completion sprint)
**Resolution date:** 2026-04-04
**Context:** Category dropdown showed raw `__uncategorized__` string after selecting uncategorized option.
**Resolution:** Replaced `<SelectValue>` with explicit `<span>` rendering translated label. `<SelectValue>` renders the raw value string when a value is set, ignoring the placeholder prop.
**Status:** ✅ Done

---

### BL-005: Date format standardization (dd/mm/yyyy)

**Category:** bug
**Origin:** Phase 3.5 UX Polish Sprint spec, Unit 1.5
**Resolved in:** Phase 3.5 (PR #51)
**Resolution date:** 2026-04-04
**Context:** Dates were inconsistent — "Apr 3, 2026" on Dashboard, "2026-04-03" in tables.
**Resolution:** Created centralized `formatDate()` utility in `lib/date.ts`, applied across all components.
**Status:** ✅ Done
