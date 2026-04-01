# Phase 3D-1: Debts Frontend Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the frontend foundation for the debts feature — TypeScript types mirroring all backend schemas, TanStack Query hooks for every debt/installment/person API endpoint, i18n translations (EN + AR), sidebar nav activation, and a 5-tab page shell with empty states.

**Architecture:** Client-side page (`"use client"`) at `/debts` with a tab bar switching between 5 tab content areas. Each tab loads data independently via its own TanStack Query hook. Types in a single `lib/types/debts.ts` file mirror the backend Pydantic schemas. i18n adds `debts`, `persons`, and `installments` namespaces to both `messages/en.json` and `messages/ar.json`.

**Tech Stack:** Next.js App Router, TypeScript strict mode, TanStack Query, next-intl, shadcn/ui, Tailwind CSS v4 with logical properties, Lucide icons.

**Required Reading:**
- `docs/03-features/debts.md` — Feature spec with API contracts
- `docs/03-features/financing-apps.md` — Financing apps feature spec
- `docs/stitch-designs/html/10-debts-loans.html` — Loans tab design reference
- `docs/guides/09-design-tokens.md` — Canonical design tokens
- `docs/superpowers/handoff/phase-3-unit-3C.md` — Backend completion handoff

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `frontend/src/lib/types/debts.ts` | All TypeScript interfaces mirroring backend schemas |
| Create | `frontend/src/hooks/use-debts.ts` | TanStack Query hooks for `/api/v1/debts` endpoints |
| Create | `frontend/src/hooks/use-installments.ts` | TanStack Query hooks for `/api/v1/installments` endpoints |
| Create | `frontend/src/hooks/use-persons.ts` | TanStack Query hooks for `/api/v1/persons` endpoints |
| Create | `frontend/src/app/(app)/debts/page.tsx` | 5-tab debts page shell with tab switching |
| Create | `frontend/src/components/debts/debts-tab-content.tsx` | Wrapper that renders the active tab content |
| Create | `frontend/src/components/debts/loans-tab.tsx` | Loans tab placeholder (data-fetching + empty state) |
| Create | `frontend/src/components/debts/card-installments-tab.tsx` | CC installments tab placeholder |
| Create | `frontend/src/components/debts/financing-apps-tab.tsx` | Financing apps tab placeholder |
| Create | `frontend/src/components/debts/store-installments-tab.tsx` | Store installments tab placeholder |
| Create | `frontend/src/components/debts/p2p-tab.tsx` | P2P debts tab placeholder |
| Modify | `frontend/src/lib/nav-items.ts` | Enable debts nav item (remove `disabled: true`) |
| Modify | `frontend/messages/en.json` | Add `debts`, `persons`, `installments` i18n keys |
| Modify | `frontend/messages/ar.json` | Add `debts`, `persons`, `installments` i18n keys |

---

### Task 1: TypeScript Types

**Files:**
- Create: `frontend/src/lib/types/debts.ts`

- [ ] **Step 1: Create types file with all debt-related interfaces**

```typescript
// frontend/src/lib/types/debts.ts

/**
 * TypeScript interfaces mirroring backend Pydantic schemas for Phase 3.
 * All monetary amounts are integers in minor units.
 */

// ── Debts ──────────────────────────────────────────────────

export type DebtType = "bank_loan" | "personal_lent" | "personal_borrowed";
export type DebtStatus = "active" | "paid_off";
export type RepaymentMode = "lump_sum" | "equal_splits" | "custom_splits";

export interface DebtResponse {
  id: number;
  type: DebtType;
  person_id: number | null;
  linked_account_id: number | null;
  name: string;
  institution: string | null;
  principal_minor: number;
  currency: string;
  annual_rate_bps: number;
  tenure_months: number;
  start_date: string;
  monthly_payment_minor: number;
  repayment_mode: RepaymentMode | null;
  due_date: string | null;
  status: DebtStatus;
  notes: string | null;
  is_active: boolean;
  total_paid_minor: number;
  remaining_minor: number;
}

export interface DebtCreateInput {
  type: DebtType;
  name: string;
  institution?: string | null;
  principal_minor: number;
  currency: string;
  annual_rate_percent?: number;
  tenure_months: number;
  start_date: string;
  linked_account_id?: number | null;
  notes?: string | null;
  person_id?: number | null;
  repayment_mode?: RepaymentMode | null;
  due_date?: string | null;
  split_count?: number | null;
  splits?: SplitInput[] | null;
}

export interface DebtUpdateInput {
  name?: string;
  institution?: string | null;
  linked_account_id?: number | null;
  notes?: string | null;
}

export interface SplitInput {
  amount_minor: number;
  due_date: string;
}

export interface PaymentCreate {
  date: string;
  amount_minor: number;
  transaction_id?: number | null;
  notes?: string | null;
}

export interface PaymentResponse {
  id: number;
  debt_id: number;
  date: string;
  amount_minor: number;
  principal_minor: number | null;
  interest_minor: number | null;
  transaction_id: number | null;
  notes: string | null;
}

export type ScheduleRowStatus = "paid" | "overdue" | "upcoming";

export interface ScheduleRow {
  payment_number: number;
  date: string;
  payment_minor: number;
  principal_minor: number;
  interest_minor: number;
  remaining_minor: number;
  status: ScheduleRowStatus;
}

export interface MatchSuggestion {
  transaction_id: number;
  date: string;
  amount_minor: number;
  description: string;
  score: number;
}

export interface P2PDebtSplitResponse {
  id: number;
  debt_id: number;
  amount_minor: number;
  due_date: string;
  paid: boolean;
  payment_id: number | null;
  status: ScheduleRowStatus;
}

// ── Installments ───────────────────────────────────────────

export type InstallmentType = "credit_card" | "store" | "financing_app";
export type LifecycleStatus = "active" | "completed";

export interface InstallmentResponse {
  id: number;
  type: InstallmentType;
  name: string;
  merchant_name: string | null;
  source_account_id: number | null;
  linked_account_id: number | null;
  total_amount_minor: number;
  monthly_amount_minor: number;
  total_months: number;
  start_month: string;
  currency: string;
  status: LifecycleStatus;
  is_active: boolean;
  months_paid: number;
  remaining_months: number;
  remaining_minor: number;
}

export interface InstallmentCreateInput {
  type: InstallmentType;
  name: string;
  merchant_name?: string | null;
  source_account_id?: number | null;
  linked_account_id?: number | null;
  total_amount_minor: number;
  monthly_amount_minor: number;
  total_months: number;
  start_month: string;
  currency: string;
}

export interface InstallmentUpdateInput {
  name?: string;
  merchant_name?: string | null;
  linked_account_id?: number | null;
}

export interface FinancingAppDetail {
  account_id: number;
  name: string;
  name_ar: string | null;
  credit_limit_minor: number;
  balance_minor: number;
  available_minor: number;
  utilization_percent: number;
  active_plans_count: number;
  monthly_commitment_minor: number;
}

export interface FinancingAppsTotals {
  total_limit_minor: number;
  total_used_minor: number;
  total_available_minor: number;
  total_monthly_minor: number;
  total_remaining_minor: number;
}

export interface FinancingAppsSummary {
  apps: FinancingAppDetail[];
  totals: FinancingAppsTotals;
}

// ── Persons ────────────────────────────────────────────────

export type PersonRelationship =
  | "family"
  | "friend"
  | "colleague"
  | "business"
  | "other";

export interface PersonBalances {
  by_currency: Record<string, number>; // currency → net_minor
  total_base_minor: number;
  base_currency: string;
  fx_warnings: string[];
}

export interface PersonResponse {
  id: number;
  name: string;
  name_ar: string | null;
  phone: string | null;
  email: string | null;
  relationship: PersonRelationship | null;
  notes: string | null;
  is_active: boolean;
  balances: PersonBalances | null;
}

export interface PersonCreateInput {
  name: string;
  name_ar?: string | null;
  phone?: string | null;
  email?: string | null;
  relationship?: PersonRelationship | null;
  notes?: string | null;
}

export interface PersonUpdateInput {
  name?: string;
  name_ar?: string | null;
  phone?: string | null;
  email?: string | null;
  relationship?: PersonRelationship | null;
  notes?: string | null;
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd frontend && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `debts.ts`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/types/debts.ts
git commit -m "feat(debts): add TypeScript types for debts, installments, persons"
```

---

### Task 2: Debts TanStack Query Hooks

**Files:**
- Create: `frontend/src/hooks/use-debts.ts`

- [ ] **Step 1: Create debts hooks file**

```typescript
// frontend/src/hooks/use-debts.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import type {
  DebtResponse,
  DebtCreateInput,
  DebtUpdateInput,
  PaymentCreate,
  PaymentResponse,
  ScheduleRow,
  MatchSuggestion,
  P2PDebtSplitResponse,
} from "@/lib/types/debts";

export function useDebts(params?: { type?: string; status?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set("type", params.type);
  if (params?.status) searchParams.set("status", params.status);
  const qs = searchParams.toString();
  const path = `/api/v1/debts${qs ? `?${qs}` : ""}`;

  return useQuery({
    queryKey: ["debts", params?.type ?? "all", params?.status ?? "all"],
    queryFn: () => apiGet<DebtResponse[]>(path),
  });
}

export function useDebt(id: number) {
  return useQuery({
    queryKey: ["debts", id],
    queryFn: () => apiGet<DebtResponse>(`/api/v1/debts/${id}`),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreateDebt() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (data: DebtCreateInput) =>
      apiPost<DebtResponse>("/api/v1/debts", data),
    successMessage: t("debtCreated"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["persons"] });
    },
  });
}

export function useUpdateDebt() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: ({ id, ...body }: DebtUpdateInput & { id: number }) =>
      apiPut<DebtResponse>(`/api/v1/debts/${id}`, body),
    successMessage: t("debtUpdated"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
    },
  });
}

export function useDeleteDebt() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (id: number) => apiDelete(`/api/v1/debts/${id}`),
    successMessage: t("debtDeleted"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["persons"] });
    },
  });
}

export function useAmortizationSchedule(debtId: number) {
  return useQuery({
    queryKey: ["debts", debtId, "amortization"],
    queryFn: () =>
      apiGet<{ schedule: ScheduleRow[] }>(
        `/api/v1/debts/${debtId}/amortization`
      ),
    enabled: Number.isFinite(debtId) && debtId > 0,
  });
}

export function useDebtPayments(debtId: number) {
  return useQuery({
    queryKey: ["debts", debtId, "payments"],
    queryFn: () =>
      apiGet<PaymentResponse[]>(`/api/v1/debts/${debtId}/payments`),
    enabled: Number.isFinite(debtId) && debtId > 0,
  });
}

export function useRecordPayment(debtId: number) {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (data: PaymentCreate) =>
      apiPost<PaymentResponse>(`/api/v1/debts/${debtId}/payments`, data),
    successMessage: t("paymentRecorded"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["debts", debtId] });
      queryClient.invalidateQueries({ queryKey: ["persons"] });
    },
  });
}

export function useMatchSuggestions(debtId: number) {
  return useQuery({
    queryKey: ["debts", debtId, "match-suggestions"],
    queryFn: () =>
      apiGet<{ suggestions: MatchSuggestion[] }>(
        `/api/v1/debts/${debtId}/match-suggestions`
      ),
    enabled: Number.isFinite(debtId) && debtId > 0,
  });
}

export function useMarkDebtPaid() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (id: number) =>
      apiPost<DebtResponse>(`/api/v1/debts/${id}/mark-paid`, {}),
    successMessage: t("debtMarkedPaid"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["persons"] });
    },
  });
}

export function useDebtSplits(debtId: number) {
  return useQuery({
    queryKey: ["debts", debtId, "splits"],
    queryFn: () =>
      apiGet<P2PDebtSplitResponse[]>(`/api/v1/debts/${debtId}/splits`),
    enabled: Number.isFinite(debtId) && debtId > 0,
  });
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd frontend && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `use-debts.ts`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/use-debts.ts
git commit -m "feat(debts): add TanStack Query hooks for debt endpoints"
```

---

### Task 3: Installments TanStack Query Hooks

**Files:**
- Create: `frontend/src/hooks/use-installments.ts`

- [ ] **Step 1: Create installments hooks file**

```typescript
// frontend/src/hooks/use-installments.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import type {
  InstallmentResponse,
  InstallmentCreateInput,
  InstallmentUpdateInput,
  FinancingAppsSummary,
} from "@/lib/types/debts";

export function useInstallments(params?: {
  type?: string;
  status?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set("type", params.type);
  if (params?.status) searchParams.set("status", params.status);
  const qs = searchParams.toString();
  const path = `/api/v1/installments${qs ? `?${qs}` : ""}`;

  return useQuery({
    queryKey: ["installments", params?.type ?? "all", params?.status ?? "all"],
    queryFn: () => apiGet<InstallmentResponse[]>(path),
  });
}

export function useInstallment(id: number) {
  return useQuery({
    queryKey: ["installments", id],
    queryFn: () => apiGet<InstallmentResponse>(`/api/v1/installments/${id}`),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreateInstallment() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (data: InstallmentCreateInput) =>
      apiPost<InstallmentResponse>("/api/v1/installments", data),
    successMessage: t("installmentCreated"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installments"] });
      queryClient.invalidateQueries({ queryKey: ["financing-apps-summary"] });
    },
  });
}

export function useUpdateInstallment() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: ({ id, ...body }: InstallmentUpdateInput & { id: number }) =>
      apiPut<InstallmentResponse>(`/api/v1/installments/${id}`, body),
    successMessage: t("installmentUpdated"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installments"] });
    },
  });
}

export function useDeleteInstallment() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (id: number) => apiDelete(`/api/v1/installments/${id}`),
    successMessage: t("installmentDeleted"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installments"] });
      queryClient.invalidateQueries({ queryKey: ["financing-apps-summary"] });
    },
  });
}

export function useCompleteInstallment() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (id: number) =>
      apiPost<InstallmentResponse>(
        `/api/v1/installments/${id}/complete`,
        {}
      ),
    successMessage: t("installmentCompleted"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installments"] });
      queryClient.invalidateQueries({ queryKey: ["financing-apps-summary"] });
    },
  });
}

export function useFinancingAppsSummary() {
  return useQuery({
    queryKey: ["financing-apps-summary"],
    queryFn: () =>
      apiGet<FinancingAppsSummary>("/api/v1/financing-apps/summary"),
  });
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd frontend && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `use-installments.ts`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/use-installments.ts
git commit -m "feat(installments): add TanStack Query hooks for installment endpoints"
```

---

### Task 4: Persons TanStack Query Hooks

**Files:**
- Create: `frontend/src/hooks/use-persons.ts`

- [ ] **Step 1: Create persons hooks file**

```typescript
// frontend/src/hooks/use-persons.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import type {
  PersonResponse,
  PersonCreateInput,
  PersonUpdateInput,
} from "@/lib/types/debts";

export function usePersons() {
  return useQuery({
    queryKey: ["persons"],
    queryFn: () => apiGet<PersonResponse[]>("/api/v1/persons"),
  });
}

export function usePerson(id: number) {
  return useQuery({
    queryKey: ["persons", id],
    queryFn: () => apiGet<PersonResponse>(`/api/v1/persons/${id}`),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (data: PersonCreateInput) =>
      apiPost<PersonResponse>("/api/v1/persons", data),
    successMessage: t("personCreated"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
    },
  });
}

export function useUpdatePerson() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: ({ id, ...body }: PersonUpdateInput & { id: number }) =>
      apiPut<PersonResponse>(`/api/v1/persons/${id}`, body),
    successMessage: t("personUpdated"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (id: number) => apiDelete(`/api/v1/persons/${id}`),
    successMessage: t("personDeleted"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
    },
  });
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd frontend && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `use-persons.ts`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/use-persons.ts
git commit -m "feat(persons): add TanStack Query hooks for person endpoints"
```

---

### Task 5: i18n Translations (EN + AR)

**Files:**
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

- [ ] **Step 1: Add English translations**

Add the following top-level keys to `frontend/messages/en.json` (insert before the closing `}`). Add them after the `"landing"` key:

```json
  "debts": {
    "title": "Debts Management",
    "subtitle": "Track and manage your loans and installments",
    "tabs": {
      "loans": "Loans",
      "cardInstallments": "Card Installments",
      "financingApps": "Financing Apps",
      "storeInstallments": "Store Installments",
      "p2p": "P2P"
    },
    "summary": {
      "monthlyPayments": "Monthly Debt Payments",
      "totalRemaining": "Total Active Remaining",
      "activeLoans": "{count} loans",
      "activePlans": "{count} plans"
    },
    "status": {
      "active": "Active",
      "paidOff": "Paid Off",
      "completed": "Completed",
      "paid": "Paid",
      "overdue": "Overdue",
      "upcoming": "Upcoming"
    },
    "loan": {
      "monthlyPayment": "Monthly Payment",
      "remaining": "Remaining",
      "tenure": "{months} months",
      "rate": "{rate}% APR",
      "paid": "{paid} of {total} paid",
      "institution": "Institution",
      "startDate": "Start Date",
      "linkedAccount": "Linked Account"
    },
    "p2p": {
      "lent": "You lent",
      "borrowed": "You borrowed",
      "netOwed": "Net owed",
      "noDebts": "No active debts",
      "lumpSum": "Lump Sum",
      "equalSplits": "Equal Splits",
      "customSplits": "Custom Splits"
    },
    "installment": {
      "monthlyAmount": "Monthly",
      "totalAmount": "Total",
      "months": "{paid}/{total} months",
      "merchant": "Merchant",
      "sourceAccount": "Source Account"
    },
    "financingApps": {
      "creditLimit": "Credit Limit",
      "used": "Used",
      "available": "Available",
      "utilization": "Utilization",
      "activePlans": "Active Plans",
      "monthlyCommitment": "Monthly Commitment",
      "totalMonthly": "Total Monthly (All Apps)",
      "totalRemaining": "Total Remaining (All Apps)"
    },
    "actions": {
      "addLoan": "Add Loan",
      "addDebt": "Add Debt",
      "addInstallment": "Add Installment",
      "recordPayment": "Record Payment",
      "viewSchedule": "View Schedule",
      "markPaid": "Mark as Paid",
      "complete": "Mark Complete"
    }
  },
  "persons": {
    "title": "People",
    "name": "Name",
    "nameAr": "Arabic Name",
    "phone": "Phone",
    "email": "Email",
    "relationship": "Relationship",
    "notes": "Notes",
    "relationships": {
      "family": "Family",
      "friend": "Friend",
      "colleague": "Colleague",
      "business": "Business",
      "other": "Other"
    }
  },
  "installments": {
    "title": "Installment Plans",
    "creditCard": "Credit Card",
    "store": "Store",
    "financingApp": "Financing App"
  }
```

Also add these toast messages inside the existing `"toast"` object:

```json
    "debtCreated": "Debt created successfully",
    "debtUpdated": "Debt updated successfully",
    "debtDeleted": "Debt deleted successfully",
    "debtMarkedPaid": "Debt marked as paid",
    "paymentRecorded": "Payment recorded successfully",
    "installmentCreated": "Installment plan created",
    "installmentUpdated": "Installment plan updated",
    "installmentDeleted": "Installment plan deleted",
    "installmentCompleted": "Installment plan completed",
    "personCreated": "Person created successfully",
    "personUpdated": "Person updated successfully",
    "personDeleted": "Person deleted successfully"
```

Also add these empty state messages inside the existing `"emptyStates"` object:

```json
    "debts": {
      "title": "No debts yet",
      "description": "Add your first loan or debt to start tracking.",
      "action": "Add Debt"
    },
    "installments": {
      "title": "No installment plans yet",
      "description": "Track your credit card, store, or financing app installments.",
      "action": "Add Installment"
    },
    "p2p": {
      "title": "No P2P debts yet",
      "description": "Track money lent to or borrowed from friends and family.",
      "action": "Add Debt"
    },
    "persons": {
      "title": "No people yet",
      "description": "Add a person before creating P2P debts.",
      "action": "Add Person"
    }
```

- [ ] **Step 2: Add Arabic translations**

Add the matching keys to `frontend/messages/ar.json`. Add them after the `"landing"` key:

```json
  "debts": {
    "title": "إدارة الديون",
    "subtitle": "تتبع وإدارة القروض والأقساط",
    "tabs": {
      "loans": "القروض",
      "cardInstallments": "أقساط البطاقات",
      "financingApps": "تطبيقات التمويل",
      "storeInstallments": "أقساط المتاجر",
      "p2p": "ديون شخصية"
    },
    "summary": {
      "monthlyPayments": "الأقساط الشهرية",
      "totalRemaining": "إجمالي المتبقي",
      "activeLoans": "{count} قروض",
      "activePlans": "{count} خطط"
    },
    "status": {
      "active": "نشط",
      "paidOff": "مسدد",
      "completed": "مكتمل",
      "paid": "مدفوع",
      "overdue": "متأخر",
      "upcoming": "قادم"
    },
    "loan": {
      "monthlyPayment": "القسط الشهري",
      "remaining": "المتبقي",
      "tenure": "{months} شهر",
      "rate": "{rate}% سنوياً",
      "paid": "{paid} من {total} مدفوع",
      "institution": "المؤسسة",
      "startDate": "تاريخ البداية",
      "linkedAccount": "الحساب المرتبط"
    },
    "p2p": {
      "lent": "أقرضت",
      "borrowed": "اقترضت",
      "netOwed": "صافي المستحق",
      "noDebts": "لا توجد ديون نشطة",
      "lumpSum": "دفعة واحدة",
      "equalSplits": "أقساط متساوية",
      "customSplits": "أقساط مخصصة"
    },
    "installment": {
      "monthlyAmount": "شهرياً",
      "totalAmount": "الإجمالي",
      "months": "{paid}/{total} شهر",
      "merchant": "التاجر",
      "sourceAccount": "الحساب المصدر"
    },
    "financingApps": {
      "creditLimit": "حد الائتمان",
      "used": "المستخدم",
      "available": "المتاح",
      "utilization": "نسبة الاستخدام",
      "activePlans": "خطط نشطة",
      "monthlyCommitment": "الالتزام الشهري",
      "totalMonthly": "إجمالي الشهري (كل التطبيقات)",
      "totalRemaining": "إجمالي المتبقي (كل التطبيقات)"
    },
    "actions": {
      "addLoan": "إضافة قرض",
      "addDebt": "إضافة دين",
      "addInstallment": "إضافة قسط",
      "recordPayment": "تسجيل دفعة",
      "viewSchedule": "عرض الجدول",
      "markPaid": "تحديد كمسدد",
      "complete": "تحديد كمكتمل"
    }
  },
  "persons": {
    "title": "الأشخاص",
    "name": "الاسم",
    "nameAr": "الاسم بالعربية",
    "phone": "الهاتف",
    "email": "البريد الإلكتروني",
    "relationship": "العلاقة",
    "notes": "ملاحظات",
    "relationships": {
      "family": "عائلة",
      "friend": "صديق",
      "colleague": "زميل",
      "business": "عمل",
      "other": "أخرى"
    }
  },
  "installments": {
    "title": "خطط الأقساط",
    "creditCard": "بطاقة ائتمان",
    "store": "متجر",
    "financingApp": "تطبيق تمويل"
  }
```

Also add Arabic toast messages inside the existing `"toast"` object:

```json
    "debtCreated": "تم إنشاء الدين بنجاح",
    "debtUpdated": "تم تحديث الدين بنجاح",
    "debtDeleted": "تم حذف الدين بنجاح",
    "debtMarkedPaid": "تم تحديد الدين كمسدد",
    "paymentRecorded": "تم تسجيل الدفعة بنجاح",
    "installmentCreated": "تم إنشاء خطة الأقساط",
    "installmentUpdated": "تم تحديث خطة الأقساط",
    "installmentDeleted": "تم حذف خطة الأقساط",
    "installmentCompleted": "تم إكمال خطة الأقساط",
    "personCreated": "تم إنشاء الشخص بنجاح",
    "personUpdated": "تم تحديث الشخص بنجاح",
    "personDeleted": "تم حذف الشخص بنجاح"
```

Also add Arabic empty states inside the existing `"emptyStates"` object:

```json
    "debts": {
      "title": "لا توجد ديون بعد",
      "description": "أضف أول قرض أو دين لبدء التتبع.",
      "action": "إضافة دين"
    },
    "installments": {
      "title": "لا توجد خطط أقساط بعد",
      "description": "تتبع أقساط بطاقات الائتمان والمتاجر وتطبيقات التمويل.",
      "action": "إضافة قسط"
    },
    "p2p": {
      "title": "لا توجد ديون شخصية بعد",
      "description": "تتبع الأموال المُقرضة أو المُقترضة من الأصدقاء والعائلة.",
      "action": "إضافة دين"
    },
    "persons": {
      "title": "لا يوجد أشخاص بعد",
      "description": "أضف شخصاً قبل إنشاء الديون الشخصية.",
      "action": "إضافة شخص"
    }
```

- [ ] **Step 3: Verify JSON is valid**

Run: `cd frontend && node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('en.json OK')" && node -e "JSON.parse(require('fs').readFileSync('messages/ar.json','utf8')); console.log('ar.json OK')"`
Expected: `en.json OK` then `ar.json OK`

- [ ] **Step 4: Commit**

```bash
git add frontend/messages/en.json frontend/messages/ar.json
git commit -m "feat(i18n): add debts, persons, installments translations (EN + AR)"
```

---

### Task 6: Enable Debts Nav Item

**Files:**
- Modify: `frontend/src/lib/nav-items.ts`

- [ ] **Step 1: Remove `disabled: true` from the debts nav item**

In `frontend/src/lib/nav-items.ts`, change:

```typescript
  { href: "/debts", icon: HandCoins, label: "nav.debts", disabled: true },
```

to:

```typescript
  { href: "/debts", icon: HandCoins, label: "nav.debts" },
```

- [ ] **Step 2: Verify compilation**

Run: `cd frontend && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/nav-items.ts
git commit -m "feat(nav): enable debts navigation item in sidebar"
```

---

### Task 7: Tab Content Components (5 Placeholder Tabs)

**Files:**
- Create: `frontend/src/components/debts/loans-tab.tsx`
- Create: `frontend/src/components/debts/card-installments-tab.tsx`
- Create: `frontend/src/components/debts/financing-apps-tab.tsx`
- Create: `frontend/src/components/debts/store-installments-tab.tsx`
- Create: `frontend/src/components/debts/p2p-tab.tsx`

Each tab fetches its own data and renders either a loading skeleton, an error, or an empty state placeholder. Real content will be built in sub-units 3D-2 through 3D-4.

- [ ] **Step 1: Create loans-tab.tsx**

```tsx
// frontend/src/components/debts/loans-tab.tsx
"use client";

import { useTranslations } from "next-intl";
import { Landmark } from "lucide-react";
import { useDebts } from "@/hooks/use-debts";
import { EmptyState } from "@/components/shared/empty-state";

export function LoansTab() {
  const t = useTranslations();
  const { data, isLoading, error } = useDebts({ type: "bank_loan" });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">
        {t("error.title")}: {error.message}
      </p>
    );
  }

  const loans = data?.data ?? [];

  if (loans.length === 0) {
    return (
      <EmptyState
        icon={Landmark}
        title={t("emptyStates.debts.title")}
        description={t("emptyStates.debts.description")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {loans.map((loan) => (
        <div
          key={loan.id}
          className="rounded-xl bg-card p-6 shadow-sm border border-border"
        >
          <p className="font-bold text-foreground">{loan.name}</p>
          <p className="text-sm text-muted-foreground">
            {loan.institution ?? "—"}
          </p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create card-installments-tab.tsx**

```tsx
// frontend/src/components/debts/card-installments-tab.tsx
"use client";

import { useTranslations } from "next-intl";
import { CreditCard } from "lucide-react";
import { useInstallments } from "@/hooks/use-installments";
import { EmptyState } from "@/components/shared/empty-state";

export function CardInstallmentsTab() {
  const t = useTranslations();
  const { data, isLoading, error } = useInstallments({ type: "credit_card" });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">
        {t("error.title")}: {error.message}
      </p>
    );
  }

  const plans = data?.data ?? [];

  if (plans.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title={t("emptyStates.installments.title")}
        description={t("emptyStates.installments.description")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className="rounded-xl bg-card p-6 shadow-sm border border-border"
        >
          <p className="font-bold text-foreground">{plan.name}</p>
          <p className="text-sm text-muted-foreground">
            {plan.merchant_name ?? "—"}
          </p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create financing-apps-tab.tsx**

```tsx
// frontend/src/components/debts/financing-apps-tab.tsx
"use client";

import { useTranslations } from "next-intl";
import { Smartphone } from "lucide-react";
import { useInstallments } from "@/hooks/use-installments";
import { EmptyState } from "@/components/shared/empty-state";

export function FinancingAppsTab() {
  const t = useTranslations();
  const { data, isLoading, error } = useInstallments({
    type: "financing_app",
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">
        {t("error.title")}: {error.message}
      </p>
    );
  }

  const plans = data?.data ?? [];

  if (plans.length === 0) {
    return (
      <EmptyState
        icon={Smartphone}
        title={t("emptyStates.installments.title")}
        description={t("emptyStates.installments.description")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className="rounded-xl bg-card p-6 shadow-sm border border-border"
        >
          <p className="font-bold text-foreground">{plan.name}</p>
          <p className="text-sm text-muted-foreground">
            {plan.merchant_name ?? "—"}
          </p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create store-installments-tab.tsx**

```tsx
// frontend/src/components/debts/store-installments-tab.tsx
"use client";

import { useTranslations } from "next-intl";
import { Store } from "lucide-react";
import { useInstallments } from "@/hooks/use-installments";
import { EmptyState } from "@/components/shared/empty-state";

export function StoreInstallmentsTab() {
  const t = useTranslations();
  const { data, isLoading, error } = useInstallments({ type: "store" });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">
        {t("error.title")}: {error.message}
      </p>
    );
  }

  const plans = data?.data ?? [];

  if (plans.length === 0) {
    return (
      <EmptyState
        icon={Store}
        title={t("emptyStates.installments.title")}
        description={t("emptyStates.installments.description")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className="rounded-xl bg-card p-6 shadow-sm border border-border"
        >
          <p className="font-bold text-foreground">{plan.name}</p>
          <p className="text-sm text-muted-foreground">
            {plan.merchant_name ?? "—"}
          </p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create p2p-tab.tsx**

```tsx
// frontend/src/components/debts/p2p-tab.tsx
"use client";

import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { useDebts } from "@/hooks/use-debts";
import { EmptyState } from "@/components/shared/empty-state";

export function P2PTab() {
  const t = useTranslations();
  // Fetch both lent and borrowed — backend returns all P2P when type is not bank_loan
  const { data: lentData, isLoading: lentLoading } = useDebts({
    type: "personal_lent",
  });
  const { data: borrowedData, isLoading: borrowedLoading } = useDebts({
    type: "personal_borrowed",
  });

  const isLoading = lentLoading || borrowedLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const lent = lentData?.data ?? [];
  const borrowed = borrowedData?.data ?? [];
  const allP2P = [...lent, ...borrowed];

  if (allP2P.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("emptyStates.p2p.title")}
        description={t("emptyStates.p2p.description")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {allP2P.map((debt) => (
        <div
          key={debt.id}
          className="rounded-xl bg-card p-6 shadow-sm border border-border"
        >
          <p className="font-bold text-foreground">{debt.name}</p>
          <p className="text-sm text-muted-foreground">{debt.type}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Verify all tab components compile**

Run: `cd frontend && pnpm exec tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/debts/
git commit -m "feat(debts): add 5 tab content components with data fetching and empty states"
```

---

### Task 8: Debts Page with 5-Tab Shell

**Files:**
- Create: `frontend/src/app/(app)/debts/page.tsx`

- [ ] **Step 1: Create the debts page with tab navigation**

```tsx
// frontend/src/app/(app)/debts/page.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { LoansTab } from "@/components/debts/loans-tab";
import { CardInstallmentsTab } from "@/components/debts/card-installments-tab";
import { FinancingAppsTab } from "@/components/debts/financing-apps-tab";
import { StoreInstallmentsTab } from "@/components/debts/store-installments-tab";
import { P2PTab } from "@/components/debts/p2p-tab";

const TAB_KEYS = [
  "loans",
  "cardInstallments",
  "financingApps",
  "storeInstallments",
  "p2p",
] as const;

type TabKey = (typeof TAB_KEYS)[number];

const TAB_COMPONENTS: Record<TabKey, React.ComponentType> = {
  loans: LoansTab,
  cardInstallments: CardInstallmentsTab,
  financingApps: FinancingAppsTab,
  storeInstallments: StoreInstallmentsTab,
  p2p: P2PTab,
};

export default function DebtsPage() {
  const t = useTranslations("debts");
  const [activeTab, setActiveTab] = useState<TabKey>("loans");

  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("subtitle")}
          </p>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex border-b border-border overflow-x-auto" role="tablist">
        {TAB_KEYS.map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </nav>

      {/* Active tab content */}
      <div role="tabpanel">
        <ActiveComponent />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd frontend && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Verify build**

Run: `cd frontend && pnpm build 2>&1 | tail -20`
Expected: Build succeeds with `/debts` page in output

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/\(app\)/debts/page.tsx
git commit -m "feat(debts): add 5-tab debts page shell with tab navigation"
```

---

### Task 9: Lint and Type Check

**Files:** None (validation only)

- [ ] **Step 1: Run ESLint**

Run: `cd frontend && pnpm lint 2>&1 | tail -20`
Expected: No errors (warnings acceptable)

- [ ] **Step 2: Run TypeScript type check**

Run: `cd frontend && pnpm exec tsc --noEmit --pretty 2>&1 | tail -20`
Expected: No type errors

- [ ] **Step 3: Run full build**

Run: `cd frontend && pnpm build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 4: Fix any issues found, then commit**

If any issues found in steps 1-3, fix them. Then:

```bash
git add -A
git commit -m "fix(debts): resolve lint and type errors"
```

---

### Task 10: Final Verification and Push

- [ ] **Step 1: Review all files created/modified**

Run: `git --no-pager diff --stat main`
Expected output shows approximately:
- 4 new files in `src/lib/types/` and `src/hooks/`
- 6 new files in `src/components/debts/` and `src/app/(app)/debts/`
- 3 modified files (`nav-items.ts`, `en.json`, `ar.json`)

- [ ] **Step 2: Ensure no physical CSS directional classes**

Run: `cd frontend && grep -rn 'pl-\|pr-\|ml-\|mr-\|left-\|right-\|text-left\|text-right\|border-l\|border-r\|rounded-l\|rounded-r' src/components/debts/ src/app/\(app\)/debts/ || echo "OK: no physical directional classes"`
Expected: `OK: no physical directional classes`

- [ ] **Step 3: Push branch**

```bash
git push origin HEAD
```
