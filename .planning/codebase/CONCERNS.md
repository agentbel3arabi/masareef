# Codebase Concerns

**Analysis Date:** 2026-04-07

## Tech Debt

### [BL-027] N+1 FX queries in compute_persons_balances_bulk

**Issue:** `compute_persons_balances_bulk()` in `backend/app/services/person.py` (lines 314-327) calls `convert_to_base()` inside a loop over each person's balances. This triggers a separate FX rate lookup for each person when converting to base currency.

**Files:** `backend/app/services/person.py` (lines 219-334)

**Impact:** O(N) database queries for FX rates when batching person balance computations. Becomes noticeable with 10+ household members with mixed currencies.

**Fix approach:** Prefetch all required FX rates once before the loop. Move the `get_latest_rates()` call outside the loop and pass the cached rates dict to `convert_to_base()`.

---

### [BL-028] N+1 query in list_accounts (balance per account)

**Issue:** `list_accounts()` in `backend/app/routers/accounts.py` (line 175) has a TODO comment: `# TODO: batch balance computation to avoid N+1 queries`. The function loops over each account calling `compute_displayed_balance()` per account (lines 177-178).

**Files:** `backend/app/routers/accounts.py` (lines 94-193)

**Impact:** Displayed balance is computed individually per account, generating N additional queries/calculations for N accounts. The balance calculation involves looking up related transactions and splits.

**Fix approach:** Batch compute balances for all accounts in a single query or aggregation. Consider caching balance at the account table level and updating on transaction changes, or batch-query and compute at the service layer.

---

### [BL-029] N+1 query in list_transfers (per-row credit leg)

**Issue:** `list_transfers()` in `backend/app/services/transfer.py` had a TODO in an earlier phase. The current implementation (lines 156-241) does use a joined query to fetch both debit and credit legs together, but the comment suggests historical per-row lookups existed.

**Files:** `backend/app/services/transfer.py` (lines 156-241)

**Impact:** If the JOIN is not correctly executed or if fallback code exists elsewhere, transfers will be fetched inefficiently.

**Fix approach:** Verify the JOIN in `list_transfers()` is being used at all call sites. The current code looks correct but should be validated in integration.

---

### [BL-034] Frontend test infrastructure

**Issue:** No frontend test framework, test configuration, or tests exist. No Vitest, Jest, or React Testing Library setup. No unit or integration tests for any frontend component, hook, or utility.

**Files:** `frontend/` (entire src directory)

**Impact:** Frontend changes have no automated test safety net. Regressions go undetected until manual QA or production. Critical for a 15+ phase product with frequent UI iterations.

**Fix approach:** Set up Vitest or Jest with React Testing Library. Create test fixtures and example tests for shared components (`Button`, `Card`, form fields) and critical hooks (`useAuth`, `useHouseholds`). Integrate into CI pipeline.

---

### [BL-038] Cross-page PDF transaction duplicate detection

**Issue:** If a transaction appears at the last row of page N and the first row of page N+1 in a bank PDF (page-overflow artifact), both rows will be imported as separate transactions. The duplicate detection operates within a single parse job, not across pages.

**Files:** `backend/app/services/import_/import_service.py`, `backend/app/services/import_/excel_parser.py`

**Impact:** Low frequency. User ends up with duplicate transactions and must manually delete. No data loss but poor UX.

**Fix approach:** Enhance PDF parser to detect row-level duplicates across page boundaries. Compare last rows of page N with first rows of page N+1 using transaction fingerprinting (date + amount + description).

---

### [BL-039] list_transfers account_id filter matches only debit leg

**Issue:** `list_transfers()` account_id filter (lines 178-179 in `backend/app/services/transfer.py`) only checks `Transaction.account_id == account_id` for the debit leg. The API spec says "filter by either leg" but implementation only checks source.

**Files:** `backend/app/services/transfer.py` (lines 156-241, specifically lines 178-179)

**Impact:** Transfers where a given account is the destination will not appear in filtered results. User sees incomplete transfer history.

**Fix approach:** Modify filter to check OR condition: `(Transaction.account_id == account_id) OR (credit_leg.account_id == account_id)`.

---

### [BL-040] TransactionResponse.is_split computed dynamically

**Issue:** `TransactionResponse.is_split` always returns `False`. There is no `is_split` column on the Transaction model; computing it dynamically would require checking if splits exist via the relationship.

**Files:** `backend/app/schemas/transaction.py`, backend transaction services

**Impact:** API clients cannot determine if a transaction has splits without additional endpoint call. UI cannot show "split" badge or icon.

**Fix approach:** Either (1) add `is_split` computed column to Transaction model, (2) eager-load splits in transaction queries and compute in response building, or (3) add a database column tracking split count.

---

### [BL-043] Import template format field unconstrained string

**Issue:** `ImportTemplateCreate.format` is an unconstrained `str` field. Passing an invalid format like `"pdf"` or `"json"` succeeds at creation but silently fails at parse time with no error feedback.

**Files:** `backend/app/schemas/import_template.py`, `backend/app/routers/import_templates.py` (lines 53-71)

**Impact:** User creates unusable import template and discovers the issue only when trying to import, wasting time.

**Fix approach:** Replace `format: str` with `format: Literal["csv", "excel"]` or a `FileFormat` enum. Add validation in schema.

---

### [BL-044] Generic[T] response typing (uses Any)

**Issue:** API response typing uses `Any` instead of proper `Generic[T]` parameterization. Common response wrapper like `SuccessResponse` likely has untyped `data` field.

**Files:** `backend/app/schemas/common.py`

**Impact:** Frontend API client loses type safety. Responses are typed as `SuccessResponse[Any]` instead of `SuccessResponse[AccountResponse]`, preventing TypeScript from inferring correct data shapes.

**Fix approach:** Implement Generic[T] on response classes:
```python
from typing import Generic, TypeVar

T = TypeVar("T")

class SuccessResponse(BaseModel, Generic[T]):
    data: T
    meta: Optional[PaginationMeta] = None
```

---

### [BL-048] Debt remaining calculation uses principal not actual

**Issue:** `get_account_obligations()` in `backend/app/services/account.py` uses `d.principal_minor` as remaining balance instead of computing actual remaining after payments. Correct calculation requires summing the payment history.

**Files:** `backend/app/services/account.py`

**Impact:** Account obligations endpoint shows inflated debt remaining. If a user has made partial payments, the remaining amount shown is incorrect.

**Fix approach:** Calculate actual remaining: `principal_minor - sum(debt_payments.amount_minor)` for each debt. Pre-compute this as a view or add a trigger to denormalize.

---

## Security Considerations

### [BL-032] RBAC guards on remaining routers

**Issue:** Only `persons.py` (with manual inline checks) and `debts.py` routers have RBAC enforcement via `require_role()`. Other mutation endpoints lack role-based checks:
- `accounts.py`: POST/PUT/DELETE have `require_role()` ✅
- `categories.py`: POST/PUT/DELETE have `require_role()` ✅
- `transactions.py`: POST/PUT/DELETE have `require_role()` ✅
- `transfers.py`: POST/DELETE have `require_role()` ✅
- `installments.py`: POST/PUT/DELETE have `require_role()` ✅
- `import_.py`: POST endpoints have NO role guard ❌
- `import_templates.py`: POST/PUT/DELETE have NO role guard ❌
- `financial_institutions.py`: Unknown — needs verification

**Files:**
- `backend/app/routers/import_.py` (lines 33-112)
- `backend/app/routers/import_templates.py` (lines 41-137)
- `backend/app/routers/financial_institutions.py`

**Risk:** Any household member (including VIEWER role) can create import templates, link them, and trigger imports. No role filtering on mutation operations means VIEWER users have write access to transaction data.

**Current mitigation:** All users in a household share the same `household_id`, so data isolation is at the household level. RLS policies at the database level provide a safety net. But application-layer RBAC is inconsistent.

**Recommendations:**
1. Add `require_role(HouseholdRole.ADMIN, HouseholdRole.MEMBER)` to all `POST/PUT/DELETE` endpoints in `import_.py` and `import_templates.py`
2. Audit `financial_institutions.py` for RBAC coverage
3. Create a shared `@check_rbac` decorator to ensure no endpoint is missed in future

---

### [BL-033] Frontend auth middleware (route protection)

**Issue:** No `middleware.ts` file exists in `frontend/src/`. Unauthenticated users can navigate directly to `/dashboard`, `/accounts`, `/debts`, and other protected routes. No server-side auth check redirects them to login.

**Files:** `frontend/src/middleware.ts` (missing)

**Current behavior:**
- Landing page (`page.tsx`) redirects authenticated users to `/dashboard` ✅
- Individual protected pages have `useAuth()` hook that triggers redirect on mount, but a brief window exists where unauthenticated users see the page

**Risk:** Information disclosure if pages render sensitive data server-side or cache state before redirect. User confusion (brief loading of wrong page before redirect).

**Fix approach:** Create `frontend/src/middleware.ts` using Next.js middleware:
```typescript
import { type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function middleware(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname.startsWith("/(auth)");
  const isAppPage = request.nextUrl.pathname.startsWith("/(app)");

  if (isAppPage && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
}

export const config = {
  matcher: ["/(app)/:path*", "/(auth)/:path*"],
};
```

---

## Performance Bottlenecks

### compute_displayed_balance in account listing

**Issue:** `list_accounts()` calls `compute_displayed_balance()` in a loop (line 178 in `backend/app/routers/accounts.py`). This function queries transaction balance and splits for each account individually.

**Files:** `backend/app/routers/accounts.py` (lines 94-193), `backend/app/services/account.py` (compute_displayed_balance function)

**Cause:** Balance is a computed field (sum of transactions with `applies_to_balance=True` minus splits), not a denormalized column.

**Improvement path:**
1. Short term: Batch load balances via a single query grouping by account_id and summing amounts
2. Long term: Denormalize `displayed_balance_minor` as a column, updated atomically with transactions via trigger or service-layer bookkeeping

---

### Person balances with FX conversion per person

**Issue:** `compute_person_balances()` calls `convert_to_base()` which re-fetches FX rates on each call, even when called from `compute_persons_balances_bulk()` for the same currencies.

**Files:** `backend/app/services/person.py` (lines 219-334)

**Cause:** FX rates are fetched inside `convert_to_base()` for each person's balance conversion.

**Improvement path:** Pass FX rates as a parameter to `convert_to_base()`. Cache rates at the household level during bulk operations.

---

## Fragile Areas

### Debt payment cascade and linked transactions

**Issue:** When a debt is deleted, linked payment transactions should optionally be soft-deleted with correct balance reversal. The UI shows a "Coming soon" for this feature (BL-019).

**Files:** `backend/app/models/debt.py` (cascade rules), `backend/app/services/debt.py`, `backend/app/routers/debts.py`

**Why fragile:** Deleting a debt without deleting linked transactions creates orphaned transactions. Deleting linked transactions requires:
1. Finding all `DebtPayment` records for the debt
2. Finding all transactions linked via `debt_payment_id` or `debt_id`
3. Soft-deleting those transactions
4. Reversing balance effects for each deleted transaction

**Safe modification:** Write comprehensive tests covering:
- Debt with no payments (should be safe to delete)
- Debt with payments (with optional cascade)
- Balance reversal correctness (especially for split transactions)
- Cross-currency debt payments

**Test coverage:** Gaps in delete cascade testing.

---

### Import template and linked accounts relationship

**Issue:** Import templates can be linked to multiple accounts. If an account is deleted, orphaned template links remain.

**Files:** `backend/app/services/import_template.py`, `backend/app/services/account.py`

**Why fragile:** No cascade delete on the join table. If a template is linked to 5 accounts and one account is deleted, the template still references 4 accounts but the UI may get confused.

**Safe modification:** Add cascade delete to `import_template_links` table when account is deleted.

---

### Credit card installment progression logic

**Issue:** The spec defines automatic progression of credit card installment months as "paid" based on elapsed time. Currently computed client-side in frontend (months_elapsed / total_months). Backend has no cron job or on-read hook to update this server-side.

**Files:** `backend/app/services/installment.py`, `backend/app/schemas/installment.py`, frontend installment components

**Why fragile:** If frontend logic diverges from backend expectations, or if the progression logic changes, the system falls out of sync. Data consistency is not guaranteed.

**Safe modification:** Implement backend cron job via APScheduler to mark elapsed installment months as "paid" nightly. Update `months_paid` column based on current date vs start_month + number of months elapsed.

---

## Scaling Limits

### APScheduler without persistence

**Issue:** `APScheduler` is configured but jobs are not persisted. If the server restarts, all scheduled jobs are lost.

**Files:** `backend/app/config.py`, `backend/app/main.py` (scheduler initialization)

**Current capacity:** Works for the current single-instance deployment. Jobs in memory are lost on restart.

**Limit:** When scheduled notifications, budget alerts, and bill reminders are introduced (Phase 11), a restart will silently drop pending notifications. Users miss reminders.

**Scaling path:** Set up APScheduler with a persistent job store (SQL database, Redis, or file-based). Ensure jobs survive restarts and are not duplicated if multiple server instances exist.

---

## Dependencies at Risk

### import_service complexity (384 lines)

**Issue:** `backend/app/services/import_/import_service.py` is 384 lines handling PDF/Excel parsing, duplicate detection, row validation, and commit logic. It's a catch-all for import business logic.

**Files:** `backend/app/services/import_/import_service.py`

**Risk:** High maintenance burden. Changes to any part of the import pipeline require understanding the entire service. Presets (HSBC, etc.) are tightly coupled.

**Migration plan:** Break into smaller services:
- `ImportParser` (PDF/Excel parsing)
- `ImportValidator` (row-level validation)
- `ImportDuplicateDetector` (duplicate detection)
- `ImportCommitter` (atomically apply transactions)
- Bank-specific logic in preset classes (already done for some)

---

## Missing Critical Features

### Dashboard chart endpoints

**Issue:** Dashboard charts (BL-012, BL-013) are not wired to backend. Frontend has placeholder areas. Backend has no endpoints:
- `GET /api/v1/transactions/summary?group_by=month` (income vs expenses)
- `GET /api/v1/transactions/summary?group_by=category` (spending by category)

**Files:**
- Frontend: `frontend/src/app/(app)/dashboard/page.tsx`
- Backend: Missing router endpoints

**Blocks:** Dashboard Phase 4 completion.

---

### Account statement cycle tracking

**Issue:** Credit card accounts have no `statement_date`, `min_payment`, or `billing_cycle` fields. The feature is deferred to Phase 4 (BL-017).

**Files:** `backend/app/models/account.py`

**Impact:** Credit card users cannot see statement balances, minimum payments, or billing cycle info.

---

### BNPL bulk payment backend

**Issue:** BNPL bulk payment wizard (frontend) selects `InstallmentResponse` items, but the backend `bulk_payment` endpoint operates on the `debts` table, not `installment_plans`. Payment tracking for installment_plans uses only `months_paid`, not a full `debt_payments` table (BL-021).

**Files:** `backend/app/routers/debts.py` (bulk_payment endpoint), `backend/app/services/installment.py`

**Impact:** BNPL bulk payments don't work correctly. Users cannot record payments against installment plans in bulk.

---

## Test Coverage Gaps

### Backend transaction delete cascade

**What's not tested:** Soft-delete of a transaction and reversal of balance effects, especially:
- Transaction with splits (split balance reversal)
- Transaction linked to a debt payment
- Transaction that applies to balance vs. does not

**Files:** `backend/tests/routers/test_transactions.py`, `backend/app/services/transaction.py`

**Risk:** Balance reversal could be incorrect after delete. Data integrity issue that goes unnoticed until manual auditing.

**Priority:** High. Add tests for delete scenarios before Phase 4.

---

### Frontend component rendering with auth state

**What's not tested:** Frontend components rendering under different auth states:
- Unauthenticated (should not be possible with middleware, but currently can reach pages)
- Authenticated but no household selected
- Authenticated with viewer role (limited permissions)
- Authenticated with admin role (full permissions)

**Files:** `frontend/src/components/`, `frontend/src/hooks/use-auth.ts`

**Risk:** Permission-aware UI (disabled buttons, hidden fields) may not render correctly. Users see full access or incorrect error states.

**Priority:** Medium. Essential before Phase 13 (multi-user polish).

---

### Import parser edge cases

**What's not tested:**
- PDF with zero transactions
- Excel file with hidden rows/columns
- CSV with BOM (Byte Order Mark)
- Date parsing with non-standard formats
- Duplicate detection across multiple import sessions

**Files:** `backend/app/services/import_/` (all parsers)

**Risk:** Edge case imports fail silently or produce incorrect results. Users lose bank data.

**Priority:** High. Add edge case tests before rolling out to production users.

---

