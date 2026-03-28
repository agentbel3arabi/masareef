# Wave 3: UI Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Layer foundational UX infrastructure onto the existing pages — error recovery, user feedback (toasts), loading states (skeletons), empty states, mobile navigation, and a polished auth + onboarding flow — so the app feels production-quality before the page-fidelity pass in Wave 4.

**Tech Stack:** Next.js 16, React 19, TypeScript, shadcn/ui (base-nova), Tailwind v4, TanStack Query, next-intl, Sonner, FastAPI (Python 3.12), Pydantic v2, SQLAlchemy async

**Prerequisites:** Wave 2 merged (units 1.5C, 1.5D, 1.5E on main). Frontend CI green.

**Design spec:** `docs/superpowers/specs/2026-03-28-phase-1.5-gap-remediation-design.md` (Section 6)

**Stitch references:**
- Unit 1.5H (auth): `docs/stitch-designs/html/02-login.html`, `docs/stitch-designs/html/03-registration.html`, `docs/stitch-designs/html/04-onboarding.html`
- Unit 1.5G (empty states): `docs/stitch-designs/html/23-empty-states.html`

---

## Unit Execution Order

```
1.5F → (1.5G || 1.5H in parallel after 1.5F merges)
```

1.5F builds the toast infrastructure and skeleton primitives that 1.5G and 1.5H both use. Once 1.5F is on main, 1.5G and 1.5H can proceed in parallel on separate branches.

---

## File Map

### Unit 1.5F: Error Boundaries + Toasts + Loading Skeletons

| File | Change |
|------|--------|
| `frontend/src/components/shared/error-boundary.tsx` | NEW — React error boundary component |
| `frontend/src/app/(app)/layout.tsx` | MODIFY — wrap children with ErrorBoundary |
| `frontend/src/lib/api-client.ts` | MODIFY — add typed `ApiError` class, export it |
| `frontend/src/hooks/use-api-mutation.ts` | NEW — mutation wrapper with toast on success/error |
| `frontend/src/components/shared/skeletons/account-card-skeleton.tsx` | NEW |
| `frontend/src/components/shared/skeletons/transaction-row-skeleton.tsx` | NEW |
| `frontend/src/components/shared/skeletons/page-header-skeleton.tsx` | NEW |
| `frontend/src/components/shared/skeletons/filter-bar-skeleton.tsx` | NEW |
| `frontend/src/app/(app)/accounts/page.tsx` | MODIFY — skeleton during load |
| `frontend/src/app/(app)/transactions/page.tsx` | MODIFY — skeleton during load |
| `frontend/src/app/(app)/transfers/page.tsx` | MODIFY — skeleton during load |
| `frontend/src/hooks/use-accounts.ts` | MODIFY — mutations use useApiMutation |
| `frontend/src/hooks/use-transactions.ts` | MODIFY — mutations use useApiMutation |
| `frontend/src/hooks/use-transfers.ts` | MODIFY — mutations use useApiMutation |
| `frontend/messages/en.json` | MODIFY — toast message keys |
| `frontend/messages/ar.json` | MODIFY — toast message keys |

### Unit 1.5G: Empty States + Mobile Navigation Drawer

| File | Change |
|------|--------|
| `frontend/src/components/shared/empty-state.tsx` | NEW — reusable EmptyState component |
| `frontend/src/components/layout/mobile-nav-drawer.tsx` | NEW — Sheet-based mobile nav |
| `frontend/src/components/layout/navbar.tsx` | MODIFY — add hamburger menu button |
| `frontend/src/app/(app)/accounts/page.tsx` | MODIFY — use EmptyState |
| `frontend/src/app/(app)/transactions/page.tsx` | MODIFY — use EmptyState |
| `frontend/src/app/(app)/transfers/page.tsx` | MODIFY — use EmptyState |
| `frontend/src/app/(app)/accounts/[id]/page.tsx` | MODIFY — use EmptyState (no transactions) |
| `frontend/messages/en.json` | MODIFY — empty state strings |
| `frontend/messages/ar.json` | MODIFY — empty state strings |

### Unit 1.5H: Auth Redesign + Onboarding Wizard

| File | Change |
|------|--------|
| `backend/app/routers/households.py` | NEW — `POST /api/v1/households` + `GET /api/v1/auth/household-status` |
| `backend/app/main.py` | MODIFY — register households router |
| `backend/tests/integration/test_households_api.py` | NEW — household creation tests |
| `frontend/src/app/(auth)/layout.tsx` | MODIFY — split-panel layout |
| `frontend/src/app/(auth)/login/page.tsx` | MODIFY — left marketing panel + right form |
| `frontend/src/app/(auth)/signup/page.tsx` | MODIFY — left marketing panel + right form |
| `frontend/src/app/(onboarding)/layout.tsx` | NEW — minimal centered layout |
| `frontend/src/app/(onboarding)/onboarding/page.tsx` | NEW — 4-step wizard |
| `frontend/src/components/onboarding/step-household.tsx` | NEW |
| `frontend/src/components/onboarding/step-currency.tsx` | NEW |
| `frontend/src/components/onboarding/step-first-account.tsx` | NEW |
| `frontend/src/components/onboarding/step-done.tsx` | NEW |
| `frontend/src/hooks/use-households.ts` | NEW — household creation + status hooks |
| `frontend/src/middleware.ts` | NEW — auth guard + onboarding redirect |
| `frontend/messages/en.json` | MODIFY — onboarding strings |
| `frontend/messages/ar.json` | MODIFY — onboarding strings |

---

## Unit 1.5F: Error Boundaries + Toast Notifications + Loading Skeletons

### Pre-condition check

Sonner's `<Toaster />` is already mounted in `frontend/src/app/providers.tsx`. No setup needed.

---

### Task 1: Add typed ApiError class to api-client.ts

**File:** `frontend/src/lib/api-client.ts`

- [ ] **Step 1: Add `ApiError` class and update all throw sites**

Replace the file with this updated version:

```typescript
import { createClient } from "@/lib/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown[];
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown[];

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.status = status;
    this.details = body.details;
  }
}

interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    page_size: number;
  };
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

async function handleError(res: Response): Promise<never> {
  let body: ApiErrorBody = { code: "UNKNOWN_ERROR", message: `API error: ${res.status}` };
  try {
    const json = await res.json();
    if (json?.error) body = json.error;
  } catch {}
  throw new ApiError(res.status, body);
}

export async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) await handleError(res);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) await handleError(res);
  return res.json();
}

export async function apiPut<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) await handleError(res);
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE", headers });
  if (!res.ok && res.status !== 204) await handleError(res);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api-client.ts
git commit -m "feat(frontend): add typed ApiError class to api-client"
```

---

### Task 2: Add toast message i18n keys

**Files:** `frontend/messages/en.json`, `frontend/messages/ar.json`

- [ ] **Step 1: Add toast keys to `en.json`**

Add a `"toast"` section:

```json
"toast": {
  "accountCreated": "Account created",
  "accountDeleted": "Account deleted",
  "accountUpdated": "Account updated",
  "transactionCreated": "Transaction recorded",
  "transactionDeleted": "Transaction deleted",
  "transactionUpdated": "Transaction updated",
  "transferCreated": "Transfer created",
  "transferDeleted": "Transfer deleted",
  "error": "Something went wrong",
  "tryAgain": "Please try again"
}
```

- [ ] **Step 2: Add matching keys to `ar.json`**

```json
"toast": {
  "accountCreated": "تم إنشاء الحساب",
  "accountDeleted": "تم حذف الحساب",
  "accountUpdated": "تم تحديث الحساب",
  "transactionCreated": "تم تسجيل المعاملة",
  "transactionDeleted": "تم حذف المعاملة",
  "transactionUpdated": "تم تحديث المعاملة",
  "transferCreated": "تم إنشاء التحويل",
  "transferDeleted": "تم حذف التحويل",
  "error": "حدث خطأ ما",
  "tryAgain": "يرجى المحاولة مرة أخرى"
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/messages/
git commit -m "feat(i18n): add toast notification message keys"
```

---

### Task 3: Create useApiMutation hook

**File:** `frontend/src/hooks/use-api-mutation.ts`

- [ ] **Step 1: Create the hook**

```typescript
"use client";

import { useMutation, UseMutationOptions, UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api-client";

interface UseApiMutationOptions<TData, TVariables>
  extends Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn"> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  successMessage?: string;
  errorMessage?: string;
}

export function useApiMutation<TData, TVariables = void>(
  options: UseApiMutationOptions<TData, TVariables>
): UseMutationResult<TData, Error, TVariables> {
  const t = useTranslations("toast");
  const { successMessage, errorMessage, onSuccess, onError, ...rest } = options;

  return useMutation({
    ...rest,
    onSuccess: (data, variables, context) => {
      if (successMessage) toast.success(successMessage);
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      const message =
        error instanceof ApiError ? error.message : (errorMessage ?? t("error"));
      toast.error(message);
      onError?.(error, variables, context);
    },
  });
}
```

- [ ] **Step 2: Update `use-accounts.ts` to use useApiMutation for mutations**

Replace `useCreateAccount` and `useDeleteAccount` with:

```typescript
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useTranslations } from "next-intl";

export function useCreateAccount() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (data: CreateAccountInput) => apiPost<Account>("/api/v1/accounts", data),
    successMessage: t("accountCreated"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (id: number) => apiDelete(`/api/v1/accounts/${id}`),
    successMessage: t("accountDeleted"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
```

- [ ] **Step 3: Update `use-transactions.ts` and `use-transfers.ts` similarly**

Apply same pattern to `useCreateTransaction`, `useUpdateTransaction`, `useDeleteTransaction`, `useCreateTransfer`, `useDeleteTransfer`.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && pnpm exec tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat(frontend): add useApiMutation hook with toast integration"
```

---

### Task 4: Create loading skeleton components

**Files:** `frontend/src/components/shared/skeletons/`

- [ ] **Step 1: Create `account-card-skeleton.tsx`**

```typescript
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function AccountCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-2">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-3 w-16 rounded bg-muted mt-1" />
      </CardHeader>
      <CardContent>
        <div className="h-7 w-32 rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

export function AccountGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <AccountCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `transaction-row-skeleton.tsx`**

```typescript
export function TransactionRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 animate-pulse border-b">
      <div className="h-4 w-20 rounded bg-muted" />
      <div className="h-4 flex-1 rounded bg-muted" />
      <div className="h-5 w-16 rounded-full bg-muted" />
      <div className="h-4 w-24 rounded bg-muted" />
    </div>
  );
}

export function TransactionTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <TransactionRowSkeleton key={i} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `page-header-skeleton.tsx`**

```typescript
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between mb-6 animate-pulse">
      <div className="h-8 w-36 rounded bg-muted" />
      <div className="h-9 w-28 rounded-md bg-muted" />
    </div>
  );
}
```

- [ ] **Step 4: Create `filter-bar-skeleton.tsx`**

```typescript
export function FilterBarSkeleton() {
  return (
    <div className="flex items-center gap-3 mb-4 animate-pulse">
      <div className="h-9 flex-1 max-w-xs rounded-md bg-muted" />
      <div className="h-9 w-28 rounded-md bg-muted" />
      <div className="h-9 w-28 rounded-md bg-muted" />
    </div>
  );
}
```

- [ ] **Step 5: Create `index.ts` barrel export**

```typescript
export * from "./account-card-skeleton";
export * from "./transaction-row-skeleton";
export * from "./page-header-skeleton";
export * from "./filter-bar-skeleton";
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/shared/skeletons/
git commit -m "feat(frontend): add loading skeleton components"
```

---

### Task 5: Create ErrorBoundary component

**File:** `frontend/src/components/shared/error-boundary.tsx`

- [ ] **Step 1: Create ErrorBoundary**

```typescript
"use client";

import { Component, ReactNode } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center p-8">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground" dir="rtl" lang="ar">
              حدث خطأ ما
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false, message: "" })}
            >
              Try Again / حاول مجدداً
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Go Home / الرئيسية</Link>
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: Wrap `(app)/layout.tsx` with ErrorBoundary**

```typescript
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { ErrorBoundary } from "@/components/shared/error-boundary";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-auto p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shared/error-boundary.tsx frontend/src/app/(app)/layout.tsx
git commit -m "feat(frontend): add ErrorBoundary to app layout"
```

---

### Task 6: Apply skeletons to pages

- [ ] **Step 1: Update `accounts/page.tsx`**

Replace `{isLoading && <p ...>Loading...</p>}` with:

```typescript
import { AccountGridSkeleton } from "@/components/shared/skeletons";
// ...
{isLoading && <AccountGridSkeleton />}
```

- [ ] **Step 2: Update `transactions/page.tsx`**

Replace loading text with:

```typescript
import { TransactionTableSkeleton, FilterBarSkeleton } from "@/components/shared/skeletons";
// ...
{isLoading && (
  <>
    <FilterBarSkeleton />
    <TransactionTableSkeleton />
  </>
)}
```

- [ ] **Step 3: Update `transfers/page.tsx`** similarly with `TransactionTableSkeleton`.

- [ ] **Step 4: Verify TypeScript compiles and lint passes**

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/
git commit -m "feat(frontend): apply loading skeletons to accounts, transactions, transfers pages"
```

---

### Task 7: Push Unit 1.5F PR

- [ ] **Step 1: Push and create PR**

```bash
git push -u origin feature/1.5F-error-boundaries-toasts
```

PR title: `feat(frontend): error boundaries, typed ApiError, toast mutations, loading skeletons (#1.5F)`

- [ ] **Step 2: Request Copilot code review**
- [ ] **Step 3: Fix Copilot findings (if any)**

---

### Unit 1.5F UAT Checklist

Standard:
- [ ] CI pipeline green (lint + tsc + build)
- [ ] No new console errors
- [ ] RTL spot-check: switch to Arabic, verify fallback messages are bilingual
- [ ] Dark mode spot-check: skeletons readable in dark mode
- [ ] Mobile spot-check: error boundary renders correctly at 375px

Phase-specific:
- [ ] Intentionally crash a page (throw in a component) → ErrorBoundary shows, not white screen
- [ ] Delete an account → success toast appears ("Account deleted")
- [ ] Submit an invalid form → error toast appears with API error message
- [ ] Open accounts page with slow connection → skeleton cards show during load
- [ ] Open transactions page → skeleton rows show during load
- [ ] All existing create/delete/update mutations still work (no regressions)

---

## Unit 1.5G: Empty States Library + Mobile Navigation Drawer

**Branch:** `feature/1.5G-empty-states-mobile-nav`
**Prerequisite:** 1.5F merged to main, rebase this branch onto main before starting.

---

### Task 8 (prereq): Make CreateAccountDialog accept controlled props

**File:** `frontend/src/components/accounts/create-account-dialog.tsx`

**Why:** Confirmed by reading the component — `open` state is fully private. The EmptyState CTA in Task 10 needs to programmatically open the dialog from `accounts/page.tsx`, which requires controlled props.

- [ ] **Step 1: Add optional `open` and `onOpenChange` props**

Change the component signature from:
```typescript
export function CreateAccountDialog() {
  const [open, setOpen] = useState(false);
```

To:
```typescript
interface CreateAccountDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateAccountDialog({ open: controlledOpen, onOpenChange: controlledOnOpenChange }: CreateAccountDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
```

This keeps the existing uncontrolled usage (`<CreateAccountDialog />`) working unchanged while enabling the controlled usage (`<CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} />`).

- [ ] **Step 2: Verify existing usage in `accounts/page.tsx` still works (no props = uncontrolled)**

```bash
cd frontend && pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/accounts/create-account-dialog.tsx
git commit -m "feat(accounts): add optional controlled open/onOpenChange props to CreateAccountDialog"
```

---

### Task 9: Create EmptyState component

**File:** `frontend/src/components/shared/empty-state.tsx`

Reference: `docs/stitch-designs/html/23-empty-states.html` — centered layout, 48px muted icon, semibold title, muted description, primary CTA.

- [ ] **Step 1: Create the component**

```typescript
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1 max-w-xs">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action && (
        <Button onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/shared/empty-state.tsx
git commit -m "feat(frontend): add reusable EmptyState component"
```

---

### Task 10: Add empty state i18n keys

- [ ] **Step 1: Add to `en.json`**

```json
"emptyStates": {
  "accounts": {
    "title": "No accounts yet",
    "description": "Add your first account to get started tracking your finances.",
    "action": "Add Account"
  },
  "transactions": {
    "title": "No transactions yet",
    "description": "Record your first transaction or import a bank statement.",
    "action": "Add Transaction"
  },
  "transfers": {
    "title": "No transfers yet",
    "description": "Create a transfer to move money between your accounts.",
    "action": "New Transfer"
  },
  "accountTransactions": {
    "title": "No transactions",
    "description": "This account has no transaction history yet.",
    "action": "Add Transaction"
  },
  "searchResults": {
    "title": "No results found",
    "description": "Try adjusting your filters or search terms."
  }
}
```

- [ ] **Step 2: Add to `ar.json`**

```json
"emptyStates": {
  "accounts": {
    "title": "لا توجد حسابات بعد",
    "description": "أضف حسابك الأول لتبدأ تتبع أموالك.",
    "action": "إضافة حساب"
  },
  "transactions": {
    "title": "لا توجد معاملات بعد",
    "description": "سجّل أول معاملة أو استورد كشف حساب بنكي.",
    "action": "إضافة معاملة"
  },
  "transfers": {
    "title": "لا توجد تحويلات بعد",
    "description": "أنشئ تحويلاً لنقل الأموال بين حساباتك.",
    "action": "تحويل جديد"
  },
  "accountTransactions": {
    "title": "لا توجد معاملات",
    "description": "لا يوجد تاريخ معاملات لهذا الحساب بعد.",
    "action": "إضافة معاملة"
  },
  "searchResults": {
    "title": "لا توجد نتائج",
    "description": "حاول تعديل الفلاتر أو مصطلحات البحث."
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/messages/
git commit -m "feat(i18n): add empty state message keys"
```

---

### Task 11: Apply EmptyState to pages

- [ ] **Step 1: Update `accounts/page.tsx`**

Replace:
```typescript
{data?.data?.length === 0 && !isLoading && (
  <p className="text-muted-foreground text-center py-12">{t("emptyState")}</p>
)}
```

With:
```typescript
import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
// CreateAccountDialog now accepts controlled props (added in Task 8 prereq)
const [createOpen, setCreateOpen] = useState(false);
// ...
{data?.data?.length === 0 && !isLoading && (
  <EmptyState
    icon={Wallet}
    title={tEmpty("accounts.title")}
    description={tEmpty("accounts.description")}
    action={{ label: tEmpty("accounts.action"), onClick: () => setCreateOpen(true) }}
  />
)}
<CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} />
```

- [ ] **Step 2: Update `transactions/page.tsx`**

Apply EmptyState for zero-results (no transactions at all) and for filter empty state (filters applied, no matches).

- [ ] **Step 3: Update `transfers/page.tsx`**

Apply EmptyState for no transfers.

- [ ] **Step 4: Update `accounts/[id]/page.tsx`**

Apply EmptyState for account with no transactions. Action: "Add Transaction" opens transaction form.

- [ ] **Step 5: Verify TSC and lint**

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm lint
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/ frontend/src/components/accounts/
git commit -m "feat(frontend): apply EmptyState component to all pages"
```

---

### Task 12: Create mobile navigation drawer

**File:** `frontend/src/components/layout/mobile-nav-drawer.tsx`

- [ ] **Step 1: Extract nav items to shared constant**

In `sidebar.tsx`, the `navItems` array is defined inline. Extract it to a shared location so mobile drawer and desktop sidebar both use it:

Create `frontend/src/components/layout/nav-items.ts`:

```typescript
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Receipt,
  HandCoins,
  PiggyBank,
  Settings,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "nav.dashboard" },
  { href: "/accounts", icon: Wallet, label: "nav.accounts" },
  { href: "/transactions", icon: Receipt, label: "nav.transactions" },
  { href: "/transfers", icon: ArrowLeftRight, label: "nav.transfers" },
  { href: "/debts", icon: HandCoins, label: "nav.debts" },
  { href: "/budgets", icon: PiggyBank, label: "nav.budgets" },
  { href: "/settings", icon: Settings, label: "nav.settings" },
];
```

Update `sidebar.tsx` to import from `nav-items.ts` instead of defining inline.

- [ ] **Step 2: Create `mobile-nav-drawer.tsx`**

```typescript
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { navItems } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function MobileNavDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations();

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open navigation</span>
          </Button>
        }
      />
      <SheetContent side="start" className="w-64 p-0">
        <div className="flex h-16 items-center px-6 border-b">
          <Logo variant="horizontal" width={140} height={32} />
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {t(item.label)}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 3: Update `navbar.tsx` to include the hamburger**

```typescript
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";

export function Navbar() {
  const { user, signOut } = useAuth();
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="md:hidden">
        <MobileNavDrawer />
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <LocaleToggle />
        <ThemeToggle />
        {user && (
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Verify TSC + lint + build**

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm lint && pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/
git commit -m "feat(frontend): add mobile navigation drawer with hamburger menu"
```

---

### Task 13: Mobile responsiveness audit

- [ ] **Step 1: Test at 375px (iPhone SE) in browser dev tools**

Check all 4 pages (accounts, transactions, transfers, account detail) for:
- Horizontal scroll (none expected)
- Text truncation (verify with long account names)
- Touch targets ≥ 44px for interactive elements

- [ ] **Step 2: Fix any issues found**

Common fixes:
- Add `min-w-0 truncate` to flex children that overflow
- Increase padding on action buttons

- [ ] **Step 3: Commit any fixes**

```bash
git add frontend/src/
git commit -m "fix(frontend): mobile layout fixes from 375px audit"
```

---

### Task 14: Push Unit 1.5G PR

- [ ] **Step 1: Push and create PR**

```bash
git push -u origin feature/1.5G-empty-states-mobile-nav
```

PR title: `feat(frontend): empty states library + mobile navigation drawer (#1.5G)`

- [ ] **Step 2: Request Copilot code review**
- [ ] **Step 3: Fix Copilot findings (if any)**

---

### Unit 1.5G UAT Checklist

Standard:
- [ ] CI pipeline green
- [ ] No new console errors
- [ ] RTL spot-check: drawer opens from right side in Arabic locale
- [ ] Dark mode spot-check: empty state icons/text readable
- [ ] Mobile spot-check: no horizontal scroll at 375px

Phase-specific:
- [ ] Accounts page with no accounts → EmptyState shows with "Add Account" CTA
- [ ] Clicking "Add Account" in EmptyState → opens create account dialog
- [ ] Transactions page with no transactions → EmptyState shows
- [ ] Transfers page with no transfers → EmptyState shows
- [ ] Account detail with no transactions → EmptyState shows
- [ ] Below md breakpoint → hamburger icon visible in navbar
- [ ] Hamburger click → drawer opens with all nav items
- [ ] Click nav item in drawer → navigates and drawer closes
- [ ] Desktop (≥ md) → sidebar visible, hamburger hidden

---

## Unit 1.5H: Auth Redesign + Onboarding Wizard

**Branch:** `feature/1.5H-auth-redesign-onboarding`
**Prerequisite:** 1.5F merged to main, rebase onto main before starting.

Stitch references (load before implementation):
- `docs/stitch-designs/html/02-login.html` — split layout with marketing left panel
- `docs/stitch-designs/html/03-registration.html` — same split, signup form
- `docs/stitch-designs/html/04-onboarding.html` — wizard with step dots

---

### Task 14: Backend — household creation endpoints

**Files:** `backend/app/routers/households.py` (NEW), `backend/app/main.py` (MODIFY)

**Rationale:** The existing `get_household_id` dependency auto-provisions a household on first API call. To gate new users into the onboarding wizard, we add:
1. `GET /api/v1/auth/household-status` — returns `{ has_household: bool }` without triggering auto-provision
2. `POST /api/v1/households` — creates household + adds user as admin member

The auto-provision in `dependencies.py` is left intact as a fallback (so existing tests and users are unaffected). The frontend middleware gates new users before any auto-provision can fire.

- [ ] **Step 1: Create `backend/app/routers/households.py`**

```python
import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.dependencies import get_current_user, get_db_session
from app.models.enums import HouseholdRole
from app.models.household import Household, HouseholdMember
from app.schemas.common import SuccessResponse

router = APIRouter(prefix="/api/v1", tags=["households"])


class HouseholdCreate(BaseModel):
    name: str
    base_currency: str = "EGP"


from pydantic import BaseModel


@router.get("/auth/household-status")
async def get_household_status(
    session: AsyncSession = Depends(get_db_session),
    user_id: uuid.UUID = Depends(get_current_user),
) -> SuccessResponse:
    """Check if authenticated user has a household. Does NOT auto-provision."""
    result = await session.execute(
        select(HouseholdMember.household_id).where(HouseholdMember.user_id == user_id)
    )
    household_id = result.scalar_one_or_none()
    return SuccessResponse(data={"has_household": household_id is not None})


@router.post("/households", status_code=status.HTTP_201_CREATED)
async def create_household(
    data: HouseholdCreate,
    session: AsyncSession = Depends(get_db_session),
    user_id: uuid.UUID = Depends(get_current_user),
) -> SuccessResponse:
    """Create a household and add the current user as admin. Called during onboarding step 1."""
    # Prevent creating a second household
    existing = await session.execute(
        select(HouseholdMember.household_id).where(HouseholdMember.user_id == user_id)
    )
    if existing.scalar_one_or_none():
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": {"code": "ALREADY_HAS_HOUSEHOLD", "message": "User already belongs to a household"}},
        )

    household = Household(name=data.name, base_currency=data.base_currency)
    session.add(household)
    await session.flush()
    member = HouseholdMember(
        household_id=household.id,
        user_id=user_id,
        role=HouseholdRole.ADMIN,
        display_name="Owner",
    )
    session.add(member)
    await session.flush()
    return SuccessResponse(data={"id": str(household.id), "name": household.name, "base_currency": household.base_currency})
```

- [ ] **Step 2: Register router in `backend/app/main.py`**

Find the `app.include_router(...)` block and add:

```python
from app.routers.households import router as households_router
app.include_router(households_router)
```

- [ ] **Step 3: Write failing tests for household endpoints**

Create `backend/tests/integration/test_households_api.py`:

```python
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_household_status_returns_true(client: AsyncClient, auth_headers: dict):
    """Authenticated user with auto-provisioned household → has_household: true."""
    resp = await client.get("/api/v1/auth/household-status", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["has_household"] is True


@pytest.mark.asyncio
async def test_create_household_conflict(client: AsyncClient, auth_headers: dict):
    """Creating a second household returns 409."""
    resp = await client.post(
        "/api/v1/households",
        json={"name": "Second Household", "base_currency": "USD"},
        headers=auth_headers,
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_onboarding_sequence(client: AsyncClient, fresh_user_headers: dict):
    """Full onboarding sequence: create household → create account → verify account exists.

    This test verifies there is no race condition between household creation and the
    subsequent account creation. The account endpoint calls get_household_id which
    queries the DB for the household created moments before.

    Requires a fresh_user_headers fixture that provides auth headers for a user
    with NO pre-existing household (i.e., auto-provision must not have fired).
    If your conftest only provides auth_headers (which auto-provisions), skip this
    test and verify the sequence manually in UAT instead.
    """
    # Step 1: Create household
    h_resp = await client.post(
        "/api/v1/households",
        json={"name": "Test Household", "base_currency": "EGP"},
        headers=fresh_user_headers,
    )
    assert h_resp.status_code == 201
    assert h_resp.json()["data"]["name"] == "Test Household"

    # Step 2: Immediately create an account (same session, no delay)
    a_resp = await client.post(
        "/api/v1/accounts",
        json={"name": "My Bank", "type": "bank_account", "currency": "EGP"},
        headers=fresh_user_headers,
    )
    assert a_resp.status_code == 201
    assert a_resp.json()["data"]["name"] == "My Bank"

    # Step 3: Verify account is retrievable
    list_resp = await client.get("/api/v1/accounts", headers=fresh_user_headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) == 1
```

**Note on `fresh_user_headers` fixture:** This requires a test user with no household. If the current `conftest.py` only provides `auth_headers` (which auto-provisions), implement `fresh_user_headers` as a separate fixture that creates a new Supabase test user. If that's too complex for the test environment, mark this test with `@pytest.mark.skip(reason="requires fresh_user_headers fixture — verify sequence in UAT")` and add it to the UAT checklist explicitly.

- [ ] **Step 4: Run tests**

```bash
cd backend && uv run pytest tests/integration/test_households_api.py -v
```

Expected: both tests PASS (auto-provision creates household in `auth_headers` fixture, so `has_household` is true and second creation is 409).

- [ ] **Step 5: Run full suite**

```bash
cd backend && uv run pytest -v
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/households.py backend/app/main.py backend/tests/integration/test_households_api.py
git commit -m "feat(households): add household-status and create-household endpoints"
```

---

### Task 15: Create useHouseholds hook

**File:** `frontend/src/hooks/use-households.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useQueryClient } from "@tanstack/react-query";

interface HouseholdStatus {
  has_household: boolean;
}

interface HouseholdCreate {
  name: string;
  base_currency: string;
}

interface Household {
  id: string;
  name: string;
  base_currency: string;
}

export function useHouseholdStatus() {
  return useQuery({
    queryKey: ["household-status"],
    queryFn: () => apiGet<HouseholdStatus>("/api/v1/auth/household-status"),
    retry: false,
  });
}

export function useCreateHousehold() {
  const queryClient = useQueryClient();
  return useApiMutation({
    mutationFn: (data: HouseholdCreate) =>
      apiPost<Household>("/api/v1/households", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household-status"] });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/use-households.ts
git commit -m "feat(frontend): add useHouseholdStatus and useCreateHousehold hooks"
```

---

### Task 16: Create middleware.ts for auth + onboarding routing

**File:** `frontend/src/middleware.ts`

- [ ] **Step 1: Create middleware**

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/signup"];
const ONBOARDING_ROUTE = "/onboarding";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Unauthenticated: allow public routes, redirect everything else to /login
  if (!session) {
    if (PUBLIC_ROUTES.includes(pathname)) return response;
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated: redirect away from auth pages
  if (pathname === "/login" || pathname === "/signup") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Authenticated: check household for non-onboarding routes
  // TODO(perf): This fetch runs on every navigation for authenticated users.
  // For users who have completed onboarding (99% of sessions), it's a fast no-op DB lookup.
  // If middleware latency becomes measurable, replace with a short-lived cookie
  // set on the /onboarding completion response — e.g., Set-Cookie: masareef_has_household=1; Max-Age=3600
  // and check `request.cookies.get("masareef_has_household")` here before fetching.
  if (pathname !== ONBOARDING_ROUTE) {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const statusRes = await fetch(`${apiUrl}/api/v1/auth/household-status`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (statusRes.ok) {
        const { data } = await statusRes.json();
        if (!data.has_household) {
          return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url));
        }
      }
    } catch {
      // If household-status call fails, allow through (don't block the user)
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logos|fonts).*)"],
};
```

**Note:** The household status check in middleware makes a server-side fetch on every navigation. This is acceptable for v1 (it's a fast lightweight endpoint). A more scalable approach (JWT claim or cookie) can be added in Phase 2.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/middleware.ts
git commit -m "feat(frontend): add middleware for auth guard and onboarding redirect"
```

---

### Task 17 (prereq): Add `colorScheme` prop to Logo component

**File:** `frontend/src/components/shared/logo.tsx`

**Why:** Confirmed by reading the component — it reads from `useTheme()` exclusively. On the green gradient marketing panel, we always need the white logo regardless of the user's system theme. Adding a `colorScheme` override prop solves this without breaking existing usage.

- [ ] **Step 1: Add optional `colorScheme` prop**

```typescript
interface LogoProps {
  variant: "horizontal" | "stacked" | "icon";
  width: number;
  height: number;
  className?: string;
  colorScheme?: "auto" | "light" | "dark"; // default: "auto" (reads from theme)
}

export function Logo({ variant, width, height, className, colorScheme = "auto" }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  let theme: "light" | "dark";
  if (colorScheme === "light") {
    theme = "light";
  } else if (colorScheme === "dark") {
    theme = "dark";
  } else {
    theme = mounted && resolvedTheme === "dark" ? "dark" : "light";
  }

  const src = logoFiles[variant][theme];
  // ... rest unchanged
}
```

The marketing panel will use `<Logo variant="horizontal" colorScheme="light" />`, always showing the white logo against the green background regardless of the user's dark/light mode preference.

- [ ] **Step 2: Verify all existing Logo usages compile (no prop changes needed — `colorScheme` defaults to `"auto"`)**

```bash
cd frontend && pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shared/logo.tsx
git commit -m "feat(logo): add colorScheme prop to override theme-based logo selection"
```

---

### Task 18: Auth layout redesign — split panel

**File:** `frontend/src/app/(auth)/layout.tsx`

Reference: `docs/stitch-designs/html/02-login.html` — left panel (gradient/brand, 60%), right panel (form, 40%).

- [ ] **Step 1: Rewrite `(auth)/layout.tsx`**

```typescript
import { Logo } from "@/components/shared/logo";
import { getTranslations } from "next-intl/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-screen">
      {/* Left marketing panel — hidden below md */}
      <div className="hidden md:flex md:w-3/5 flex-col justify-between bg-gradient-to-br from-primary/90 to-primary p-12 text-white">
        <div>
          <Logo variant="horizontal" width={160} height={36} colorScheme="light" />
        </div>
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold leading-tight">
              {t("marketingHeadline")}
            </h1>
            <p className="mt-3 text-lg text-white/80">{t("marketingSubheadline")}</p>
          </div>
          <ul className="space-y-4">
            {["feature1", "feature2", "feature3"].map((key) => (
              <li key={key} className="flex items-start gap-3">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs">✓</span>
                <span className="text-white/90 text-sm">{t(`marketing.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/60">© {new Date().getFullYear()} Masareef</p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-6">
          {/* Logo shown only on mobile (left panel hidden) */}
          <div className="flex justify-center md:hidden">
            <Logo variant="stacked" width={120} height={80} />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add marketing copy i18n keys to `en.json`**

```json
"auth": {
  "marketingHeadline": "Your money, your language, your rules.",
  "marketingSubheadline": "Personal finance built for Egypt & MENA.",
  "marketing": {
    "feature1": "Import bank statements from Egyptian banks — CIB, HSBC, NBE and more",
    "feature2": "AI categorization that understands Arabic merchants",
    "feature3": "Track debts, installments, Gam3eya and assets in one place"
  }
  // ... existing auth keys remain
}
```

- [ ] **Step 3: Add matching Arabic keys to `ar.json`**

```json
"auth": {
  "marketingHeadline": "فلوسك، بلغتك، بقواعدك.",
  "marketingSubheadline": "تطبيق مالي شخصي مصمم لمصر والمنطقة.",
  "marketing": {
    "feature1": "استورد كشوف حساب من البنوك المصرية — CIB وHSBC والبنك الأهلي وغيرها",
    "feature2": "تصنيف تلقائي بالذكاء الاصطناعي يفهم أسماء التجار العرب",
    "feature3": "تتبع الديون والأقساط والجمعيات والأصول في مكان واحد"
  }
}
```

- [ ] **Step 4: Verify the login and signup pages render in the new layout**

```bash
cd frontend && pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/(auth)/layout.tsx frontend/messages/
git commit -m "feat(auth): redesign auth layout to split-panel (marketing left, form right)"
```

---

### Task 19: Update login and signup pages for new layout

**Files:** `frontend/src/app/(auth)/login/page.tsx`, `frontend/src/app/(auth)/signup/page.tsx`

- [ ] **Step 1: Update login page**

Remove the wrapping `<Card>` (the new auth layout provides the container). Simplify to just the form content:

```typescript
export default function LoginPage() {
  // ... state and handler unchanged ...

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{t("auth.login")}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.loginSubtitle")}</p>
      </div>
      <form onSubmit={handleLogin} className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("common.loading") : t("auth.login")}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link href="/signup" className="text-primary hover:underline">{t("auth.signup")}</Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Add `loginSubtitle` and `signupSubtitle` keys to both locale files**

```json
"loginSubtitle": "Sign in to your Masareef account",
"signupSubtitle": "Create your free Masareef account"
```

Arabic:
```json
"loginSubtitle": "سجّل دخولك إلى حسابك في مصاريف",
"signupSubtitle": "أنشئ حسابك المجاني في مصاريف"
```

- [ ] **Step 3: Update signup page similarly** (same simplification, remove `<Card>` wrapper)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/(auth)/
git commit -m "feat(auth): update login and signup pages for new split-panel layout"
```

---

### Task 20: Create onboarding wizard

**Files:** `frontend/src/app/(onboarding)/` (new route group)

- [ ] **Step 1: Create `(onboarding)/layout.tsx`** — minimal centered layout with logo

```typescript
import { Logo } from "@/components/shared/logo";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="mb-8">
        <Logo variant="horizontal" width={160} height={36} />
      </div>
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create step components**

**`step-household.tsx`:**
```typescript
interface StepHouseholdProps {
  firstName: string;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}

export function StepHousehold({ firstName, value, onChange, onNext }: StepHouseholdProps) {
  const t = useTranslations("onboarding");
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">{t("step1.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("step1.description")}</p>
      </div>
      <div className="space-y-2">
        <Label>{t("step1.householdName")}</Label>
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={`${firstName}'s Household`} />
      </div>
      <Button onClick={onNext} className="w-full" disabled={!value.trim()}>
        {t("common.next")}
      </Button>
    </div>
  );
}
```

**`step-currency.tsx`:** Currency selection cards for 7 currencies. Pre-select EGP.

```typescript
const CURRENCIES = [
  { code: "EGP", name: "Egyptian Pound", nameAr: "جنيه مصري", symbol: "EGP" },
  { code: "USD", name: "US Dollar", nameAr: "دولار أمريكي", symbol: "$" },
  { code: "EUR", name: "Euro", nameAr: "يورو", symbol: "€" },
  { code: "GBP", name: "British Pound", nameAr: "جنيه إسترليني", symbol: "£" },
  { code: "SAR", name: "Saudi Riyal", nameAr: "ريال سعودي", symbol: "SAR" },
  { code: "AED", name: "UAE Dirham", nameAr: "درهم إماراتي", symbol: "AED" },
  { code: "KWD", name: "Kuwaiti Dinar", nameAr: "دينار كويتي", symbol: "KWD" },
];
// Render as clickable cards in a grid; selected card gets primary border/bg
```

**`step-first-account.tsx`:** Simple form: account name, type dropdown, currency (defaults to Step 2 selection), initial balance. Has "Skip" link.

**`step-done.tsx`:** Success icon (CheckCircle, green), "You're all set!" message, "Go to Dashboard" button.

- [ ] **Step 3: Create `(onboarding)/onboarding/page.tsx`** — orchestrates 4 steps

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCreateHousehold } from "@/hooks/use-households";
import { useCreateAccount } from "@/hooks/use-accounts";
import { useAuth } from "@/hooks/use-auth";
import { StepHousehold } from "@/components/onboarding/step-household";
import { StepCurrency } from "@/components/onboarding/step-currency";
import { StepFirstAccount } from "@/components/onboarding/step-first-account";
import { StepDone } from "@/components/onboarding/step-done";

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [householdName, setHouseholdName] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const createHousehold = useCreateHousehold();
  const createAccount = useCreateAccount();

  const firstName = user?.user_metadata?.first_name ?? "You";

  const handleStep1Next = () => setStep(2);
  const handleStep2Next = () => setStep(3);

  const handleStep3Next = async (accountData: { name: string; type: string; initial_balance: number } | null) => {
    // Step 1: Create household
    await createHousehold.mutateAsync({ name: householdName, base_currency: currency });
    // Step 3: Create account (if not skipped)
    if (accountData) {
      await createAccount.mutateAsync({ ...accountData, currency });
    }
    setStep(4);
  };

  const handleStep3Skip = async () => {
    await createHousehold.mutateAsync({ name: householdName, base_currency: currency });
    setStep(4);
  };

  // Step progress dots
  const steps = [1, 2, 3, 4];

  return (
    <div className="space-y-8">
      {/* Progress dots */}
      <div className="flex justify-center gap-2">
        {steps.map((s) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all ${
              s === step ? "w-8 bg-primary" : s < step ? "w-2 bg-primary/50" : "w-2 bg-muted"
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <StepHousehold
          firstName={firstName}
          value={householdName || `${firstName}'s Household`}
          onChange={setHouseholdName}
          onNext={handleStep1Next}
        />
      )}
      {step === 2 && (
        <StepCurrency
          value={currency}
          onChange={setCurrency}
          onNext={handleStep2Next}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <StepFirstAccount
          defaultCurrency={currency}
          onNext={handleStep3Next}
          onSkip={handleStep3Skip}
          onBack={() => setStep(2)}
          isLoading={createHousehold.isPending || createAccount.isPending}
        />
      )}
      {step === 4 && (
        <StepDone onGoToDashboard={() => router.push("/dashboard")} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add onboarding i18n keys to both locale files**

```json
"onboarding": {
  "step1": {
    "title": "Name your household",
    "description": "This is where all your accounts and finances will live.",
    "householdName": "Household name"
  },
  "step2": {
    "title": "Choose your base currency",
    "description": "This is the currency used for net worth and totals."
  },
  "step3": {
    "title": "Add your first account",
    "description": "You can add more accounts anytime.",
    "skip": "Skip, I'll add later"
  },
  "step4": {
    "title": "You're all set!",
    "description": "Your household is ready. Start tracking your finances.",
    "goToDashboard": "Go to Dashboard"
  }
}
```

Arabic:
```json
"onboarding": {
  "step1": {
    "title": "سمِّ مجموعتك المالية",
    "description": "هنا ستعيش جميع حساباتك وأموالك.",
    "householdName": "اسم المجموعة"
  },
  "step2": {
    "title": "اختر عملتك الأساسية",
    "description": "هذه هي العملة المستخدمة لحساب صافي الثروة والإجماليات."
  },
  "step3": {
    "title": "أضف حسابك الأول",
    "description": "يمكنك إضافة المزيد من الحسابات في أي وقت.",
    "skip": "تخطَّ، سأضيف لاحقاً"
  },
  "step4": {
    "title": "كل شيء جاهز!",
    "description": "مجموعتك المالية جاهزة. ابدأ تتبع أموالك الآن.",
    "goToDashboard": "الذهاب إلى لوحة التحكم"
  }
}
```

- [ ] **Step 5: Verify TypeScript compiles + build passes**

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm build
```

- [ ] **Step 6: Commit all onboarding files**

```bash
git add frontend/src/app/(onboarding)/ frontend/src/components/onboarding/ frontend/src/hooks/use-households.ts frontend/messages/
git commit -m "feat(onboarding): add 4-step onboarding wizard with household + account creation"
```

---

### Task 21: Push Unit 1.5H PR

- [ ] **Step 1: Push and create PR**

```bash
git push -u origin feature/1.5H-auth-redesign-onboarding
```

PR title: `feat(auth): split-panel auth redesign + onboarding wizard (#1.5H)`

- [ ] **Step 2: Request Copilot code review**
- [ ] **Step 3: Fix Copilot findings (if any)**

---

### Unit 1.5H UAT Checklist

Standard:
- [ ] CI pipeline green (backend + frontend)
- [ ] No new console errors
- [ ] RTL spot-check: Arabic login/signup renders correctly, onboarding wizard RTL
- [ ] Dark mode spot-check: split-panel auth readable, gradient adjusts
- [ ] Mobile spot-check: below md, only form panel shows (marketing panel hidden)

Phase-specific:
- [ ] `GET /api/v1/auth/household-status` returns `{ has_household: true }` for logged-in user
- [ ] `POST /api/v1/households` returns 409 when user already has a household
- [ ] Login page shows split-panel layout on desktop
- [ ] Signup page shows split-panel layout on desktop
- [ ] On mobile (< md): marketing panel hidden, form full-width
- [ ] Brand gradient covers left 60% on desktop
- [ ] Unauthenticated user at `/dashboard` → redirected to `/login`
- [ ] Authenticated user at `/login` → redirected to `/dashboard`
- [ ] New user (no household) → redirected to `/onboarding`
- [ ] Onboarding step 1: household name defaults to "{firstName}'s Household"
- [ ] Step 2: EGP pre-selected, clicking other currency selects it
- [ ] Step 3: fill name + type → "Next" creates household + account → step 4
- [ ] Step 3: "Skip" creates household only → step 4
- [ ] Step 4: "Go to Dashboard" navigates to `/dashboard`
- [ ] Returning user (has household): goes directly to app, skips onboarding
- [ ] Backend tests: household status + conflict tests pass

---

## Conventions Checklist

- [ ] All routes use `/api/v1/` prefix
- [ ] CSS uses logical properties only (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`)
- [ ] Pydantic V2: `model.model_dump()` only
- [ ] Async SQLAlchemy for all DB operations
- [ ] No physical directional classes (`pl-`, `pr-`, `ml-`, `mr-`, `left-`, `right-`)
- [ ] `SheetContent side="start"` for RTL-safe drawer (not `side="left"`)
- [ ] Toast messages bilingual (Arabic + English keys in both locale files)

## Open Questions / Risks — Resolution Status

1. **Logo `colorScheme` prop — RESOLVED (Task 17 prereq)**
   Confirmed: `logo.tsx` uses `useTheme()` only, no override exists. Task 17 prereq adds a `colorScheme?: "auto" | "light" | "dark"` prop that defaults to `"auto"` (existing behavior unchanged). The marketing panel uses `colorScheme="light"` to always show the white logo against the green gradient.

2. **Middleware + household-status performance — DEFERRED with TODO**
   The fetch runs on every navigation but is a single indexed DB lookup (`WHERE user_id = ?` on `household_members`). Acceptable for v1. A TODO comment is embedded in the middleware code with the exact cookie-based optimization path for when it's needed. No action required now.

3. **CreateAccountDialog controlled prop — RESOLVED (Task 8 prereq)**
   Confirmed: the dialog manages open state privately with no props. Task 8 prereq adds optional `open?: boolean` and `onOpenChange?: (open: boolean) => void` props using an internal/external merge pattern. All existing uncontrolled usages (`<CreateAccountDialog />`) continue working unchanged.

4. **Step 3 account creation timing — TEST ADDED (Task 14)**
   The sequence is: `POST /api/v1/households` completes → `POST /api/v1/accounts` fires. The account endpoint calls `get_household_id` which queries `household_members`. Since both calls are sequential (awaited) and go through the same Postgres connection pool, the household row will be visible to the second call. A `test_onboarding_sequence` integration test is added to Task 14. If a `fresh_user_headers` fixture can't be created, this test is skipped and UAT covers it instead.

5. **`next-intl` in class components — ACCEPTED with documented limitation**
   React's error boundary API requires a class component (`getDerivedStateFromError` and `componentDidCatch` are class lifecycle methods — there is no hook equivalent). Class components cannot call hooks, including `useTranslations()`. The `ErrorBoundary` therefore uses hardcoded bilingual strings directly in JSX (`"Something went wrong"` + `"حدث خطأ ما"` inline). This is a deliberate trade-off:
   - **What works:** Both languages always render correctly; no i18n config needed
   - **What doesn't work:** The strings can't be updated via translation files; adding a third language requires a code change
   - **Why acceptable:** Error boundaries are last-resort fallbacks for unexpected crashes — users see them rarely, and the bilingual approach serves both audiences without requiring locale detection
   - **If translation is needed later:** Wrap `ErrorBoundary` in a thin functional component `ErrorBoundaryProvider` that reads `useTranslations("errors")` and passes the strings down as props to the class component
