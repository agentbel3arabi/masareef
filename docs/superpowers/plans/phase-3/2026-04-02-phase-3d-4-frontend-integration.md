# Phase 3D-4: Frontend Integration — Account Obligations, Dashboard Stats, Person Management

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Phase 3 backend data into account detail pages (obligations section), dashboard stat cards (active debts count), and a standalone person management page.

**Architecture:** All backend endpoints already exist — no new backend work needed. Frontend work creates new hooks and components following the established TanStack Query + shadcn/ui patterns. The account obligations section renders differently per account type (bank → linked loans, credit card/financing app → installment plans). Dashboard replaces the placeholder stat card with real data from the debts list endpoint. Person management adds a dedicated page reusing the existing PersonForm with edit mode (completed in Plan 3D-3).

**Tech Stack:** Next.js 16 (App Router), TypeScript strict mode, shadcn/ui (base-nova), TanStack Query, next-intl, Tailwind CSS v4 (logical properties only)

**Prerequisites:** Plan 3D-3 must be completed first — it provides edit mode for PersonForm and delete UI patterns used by the person management page.

**Required Reading:**
- `docs/03-features/debts.md` — debts feature spec
- `docs/03-features/accounts.md` — account detail spec
- `frontend/src/hooks/use-debts.ts` — existing hook patterns
- `frontend/src/hooks/use-persons.ts` — person hook patterns
- `frontend/src/components/shared/stat-card.tsx` — StatCard component API

---

## File Structure

### New Files
- `frontend/src/lib/types/obligations.ts` — TypeScript types for account obligations
- `frontend/src/hooks/use-account-obligations.ts` — TanStack Query hook for obligations endpoint
- `frontend/src/components/accounts/account-obligations-section.tsx` — obligations UI component
- `frontend/src/app/(app)/people/page.tsx` — standalone person management page
- `frontend/src/components/people/person-card.tsx` — person card with balance display
- `frontend/src/components/people/person-list.tsx` — person list with CRUD actions

### Modified Files
- `frontend/src/app/(app)/accounts/[id]/page.tsx` — add obligations section below header
- `frontend/src/app/(app)/dashboard/page.tsx` — replace "Active Debts" placeholder with real data
- `frontend/src/lib/nav-items.ts` — add People page link in Planning section
- `frontend/src/components/layout/sidebar.tsx` — include `/people` in Planning section filter
- `frontend/messages/en.json` — add i18n strings for obligations, people page
- `frontend/messages/ar.json` — add i18n strings for obligations, people page

---

## Task 1: Obligation Types + Hook

**Files:**
- Create: `frontend/src/lib/types/obligations.ts`
- Create: `frontend/src/hooks/use-account-obligations.ts`

- [ ] **Step 1: Create obligation TypeScript types**

Create `frontend/src/lib/types/obligations.ts`:

```typescript
export interface ObligationDebt {
  id: number;
  type: string;
  name: string;
  monthly_payment_minor: number;
  remaining_minor: number;
  status: string;
}

export interface ObligationInstallment {
  id: number;
  type: string;
  name: string;
  merchant_name: string | null;
  monthly_amount_minor: number;
  remaining_minor: number;
  remaining_months: number;
  status: string;
}

export interface AccountObligationsResponse {
  debts: ObligationDebt[];
  installments: ObligationInstallment[];
}
```

- [ ] **Step 2: Create the obligations hook**

Create `frontend/src/hooks/use-account-obligations.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type { AccountObligationsResponse } from "@/lib/types/obligations";

export function useAccountObligations(accountId: number) {
  return useQuery({
    queryKey: ["accounts", accountId, "obligations"],
    queryFn: () =>
      apiGet<AccountObligationsResponse>(
        `/api/v1/accounts/${accountId}/obligations`
      ),
    enabled: Number.isFinite(accountId) && accountId > 0,
  });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && pnpm exec tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors related to the new files.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/types/obligations.ts frontend/src/hooks/use-account-obligations.ts
git commit -m "feat(debts): add obligation types and useAccountObligations hook"
```

---

## Task 2: AccountObligationsSection Component

**Files:**
- Create: `frontend/src/components/accounts/account-obligations-section.tsx`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

- [ ] **Step 1: Add i18n strings for obligations**

Add to the `"accounts"` section in `frontend/messages/en.json`:

```json
"obligations": {
  "title": "Obligations",
  "linkedLoans": "Linked Loans",
  "installmentPlans": "Installment Plans",
  "monthlyPayment": "Monthly Payment",
  "remaining": "Remaining",
  "remainingMonths": "{count} months left",
  "noObligations": "No obligations linked to this account.",
  "merchant": "Merchant"
}
```

Add the matching Arabic translations to `frontend/messages/ar.json`:

```json
"obligations": {
  "title": "الالتزامات",
  "linkedLoans": "القروض المرتبطة",
  "installmentPlans": "خطط التقسيط",
  "monthlyPayment": "القسط الشهري",
  "remaining": "المتبقي",
  "remainingMonths": "{count} شهر متبقي",
  "noObligations": "لا توجد التزامات مرتبطة بهذا الحساب.",
  "merchant": "التاجر"
}
```

- [ ] **Step 2: Create the obligations section component**

Create `frontend/src/components/accounts/account-obligations-section.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { HandCoins, ShoppingCart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { useAccountObligations } from "@/hooks/use-account-obligations";
import type { ObligationDebt, ObligationInstallment } from "@/lib/types/obligations";

interface AccountObligationsSectionProps {
  accountId: number;
  accountType: string;
  currency: string;
}

function DebtRow({ debt, currency }: { debt: ObligationDebt; currency: string }) {
  const t = useTranslations("accounts.obligations");
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <HandCoins className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{debt.name}</p>
          <p className="text-xs text-muted-foreground">
            {t("monthlyPayment")}: <MoneyDisplay amount={debt.monthly_payment_minor} currency={currency} className="inline text-xs" />
          </p>
        </div>
      </div>
      <div className="text-end shrink-0">
        <p className="text-sm font-semibold">
          <MoneyDisplay amount={debt.remaining_minor} currency={currency} className="inline text-sm" />
        </p>
        <p className="text-xs text-muted-foreground">{t("remaining")}</p>
      </div>
    </div>
  );
}

function InstallmentRow({ inst, currency }: { inst: ObligationInstallment; currency: string }) {
  const t = useTranslations("accounts.obligations");
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
          <ShoppingCart className="h-4 w-4 text-amber-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{inst.name}</p>
          {inst.merchant_name && (
            <p className="text-xs text-muted-foreground truncate">{inst.merchant_name}</p>
          )}
          <p className="text-xs text-muted-foreground">
            <MoneyDisplay amount={inst.monthly_amount_minor} currency={currency} className="inline text-xs" /> / {t("remainingMonths", { count: inst.remaining_months })}
          </p>
        </div>
      </div>
      <div className="text-end shrink-0">
        <p className="text-sm font-semibold">
          <MoneyDisplay amount={inst.remaining_minor} currency={currency} className="inline text-sm" />
        </p>
        <p className="text-xs text-muted-foreground">{t("remaining")}</p>
      </div>
    </div>
  );
}

export function AccountObligationsSection({ accountId, accountType, currency }: AccountObligationsSectionProps) {
  const t = useTranslations("accounts.obligations");
  const { data, isLoading } = useAccountObligations(accountId);
  const obligations = data?.data;

  const hasDebts = (obligations?.debts?.length ?? 0) > 0;
  const hasInstallments = (obligations?.installments?.length ?? 0) > 0;
  const isEmpty = !hasDebts && !hasInstallments;

  if (isLoading) {
    return null;
  }

  if (isEmpty) {
    return null;
  }

  const sectionTitle =
    accountType === "bank_account" ? t("linkedLoans") : t("installmentPlans");

  return (
    <div>
      <h2 className="text-base font-semibold mb-4">{sectionTitle}</h2>
      <Card className="p-4">
        {hasDebts &&
          obligations!.debts.map((debt) => (
            <DebtRow key={`debt-${debt.id}`} debt={debt} currency={currency} />
          ))}
        {hasInstallments &&
          obligations!.installments.map((inst) => (
            <InstallmentRow key={`inst-${inst.id}`} inst={inst} currency={currency} />
          ))}
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && pnpm exec tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/accounts/account-obligations-section.tsx frontend/messages/en.json frontend/messages/ar.json
git commit -m "feat(accounts): add AccountObligationsSection component with i18n"
```

---

## Task 3: Wire Obligations into Account Detail Page

**Files:**
- Modify: `frontend/src/app/(app)/accounts/[id]/page.tsx`

- [ ] **Step 1: Add import for AccountObligationsSection**

At the top of `frontend/src/app/(app)/accounts/[id]/page.tsx`, add the import alongside existing imports:

```typescript
import { AccountObligationsSection } from "@/components/accounts/account-obligations-section";
```

- [ ] **Step 2: Add obligations section between header and transactions**

In the return JSX of `AccountDetailPage`, after `<AccountBalanceHeader account={account} />` and before the transactions `<div>`, add:

```typescript
      {/* Obligations section — only renders for accounts with linked debts/installments */}
      <AccountObligationsSection
        accountId={account.id}
        accountType={account.type}
        currency={account.currency}
      />
```

- [ ] **Step 3: Verify the build**

Run: `cd frontend && pnpm exec tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/\(app\)/accounts/\[id\]/page.tsx
git commit -m "feat(accounts): wire obligations section into account detail page"
```

---

## Task 4: Dashboard — Replace Active Debts Placeholder

**Files:**
- Modify: `frontend/src/app/(app)/dashboard/page.tsx`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

- [ ] **Step 1: Add i18n strings for dashboard debt stats**

Add to the `"dashboard"` section in `frontend/messages/en.json`:

```json
"activeDebtsCount": "{count} active",
"upcomingPayments": "Upcoming Payments",
"upcomingCount": "{count} due in 30d",
"noDebts": "No debts"
```

Add matching Arabic translations in `frontend/messages/ar.json`:

```json
"activeDebtsCount": "{count} نشط",
"upcomingPayments": "الدفعات القادمة",
"upcomingCount": "{count} مستحقة خلال 30 يوم",
"noDebts": "لا توجد ديون"
```

- [ ] **Step 2: Import useDebts and useInstallments in dashboard**

At the top of `frontend/src/app/(app)/dashboard/page.tsx`, add:

```typescript
import { useDebts } from "@/hooks/use-debts";
import { useInstallments } from "@/hooks/use-installments";
```

- [ ] **Step 3: Add debt/installment queries inside DashboardPage**

Inside the `DashboardPage` component, after the `nw` variable block, add:

```typescript
  const { data: debtsData, isLoading: debtsLoading } = useDebts({ status: "active" });
  const { data: installmentsData, isLoading: installmentsLoading } = useInstallments({ status: "active" });

  const activeDebtsCount = (debtsData?.data?.length ?? 0) + (installmentsData?.data?.length ?? 0);
  const debtsStatsLoading = debtsLoading || installmentsLoading;

  const activeDebtsValue = debtsStatsLoading
    ? "..."
    : activeDebtsCount > 0
      ? String(activeDebtsCount)
      : t("noDebts");
```

- [ ] **Step 4: Replace the placeholder StatCard**

Replace the fourth `StatCard` in the grid (the one with `comingSoonPhase3`):

```typescript
        <StatCard
          icon={Clock}
          label={t("activeDebts")}
          value={activeDebtsValue}
          trend={
            activeDebtsCount > 0
              ? { direction: "flat", text: t("activeDebtsCount", { count: activeDebtsCount }) }
              : undefined
          }
        />
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd frontend && pnpm exec tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/\(app\)/dashboard/page.tsx frontend/messages/en.json frontend/messages/ar.json
git commit -m "feat(dashboard): replace active debts placeholder with real data"
```

---

## Task 5: Person Card Component

**Files:**
- Create: `frontend/src/components/people/person-card.tsx`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

- [ ] **Step 1: Add i18n strings for the people page**

Add a new `"people"` section in `frontend/messages/en.json`:

```json
"people": {
  "title": "People",
  "subtitle": "Manage people for personal debt tracking",
  "addPerson": "Add Person",
  "noPeople": "No people added yet",
  "noPeopleDescription": "Add a person to start tracking personal debts.",
  "theyOweYou": "They owe you",
  "youOweThem": "You owe them",
  "settled": "Settled",
  "editPerson": "Edit",
  "deletePerson": "Delete",
  "deleteConfirmTitle": "Delete Person",
  "deleteConfirmDescription": "Are you sure you want to delete {name}? This action cannot be undone.",
  "hasActiveDebts": "Cannot delete — this person has active debts.",
  "cancel": "Cancel",
  "confirm": "Delete"
}
```

Add matching Arabic translations in `frontend/messages/ar.json`:

```json
"people": {
  "title": "الأشخاص",
  "subtitle": "إدارة الأشخاص لتتبع الديون الشخصية",
  "addPerson": "إضافة شخص",
  "noPeople": "لم يتم إضافة أشخاص بعد",
  "noPeopleDescription": "أضف شخصاً لبدء تتبع الديون الشخصية.",
  "theyOweYou": "مدين لك",
  "youOweThem": "أنت مدين له",
  "settled": "مسوّى",
  "editPerson": "تعديل",
  "deletePerson": "حذف",
  "deleteConfirmTitle": "حذف شخص",
  "deleteConfirmDescription": "هل أنت متأكد من حذف {name}؟ لا يمكن التراجع عن هذا الإجراء.",
  "hasActiveDebts": "لا يمكن الحذف — هذا الشخص لديه ديون نشطة.",
  "cancel": "إلغاء",
  "confirm": "حذف"
}
```

- [ ] **Step 2: Create person card component**

Create `frontend/src/components/people/person-card.tsx`:

```typescript
"use client";

import { useTranslations, useLocale } from "next-intl";
import { Pencil, Trash2, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/shared/money-display";
import { cn } from "@/lib/utils";
import type { PersonResponse } from "@/lib/types/debts";

interface PersonCardProps {
  person: PersonResponse;
  onEdit: (person: PersonResponse) => void;
  onDelete: (person: PersonResponse) => void;
}

export function PersonCard({ person, onEdit, onDelete }: PersonCardProps) {
  const t = useTranslations("people");
  const tPersons = useTranslations("persons");
  const locale = useLocale();

  const displayName = locale === "ar" && person.name_ar ? person.name_ar : person.name;
  const balances = person.balances;
  const byCurrency = balances?.by_currency ?? {};
  const hasCurrencyBalances = Object.keys(byCurrency).length > 0;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        {/* Left: avatar + info */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            {person.relationship && (
              <p className="text-xs text-muted-foreground">
                {tPersons(`relationships.${person.relationship}`)}
              </p>
            )}
            {person.phone && (
              <p className="text-xs text-muted-foreground mt-0.5">{person.phone}</p>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(person)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(person)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Balances */}
      {hasCurrencyBalances && (
        <div className="mt-3 pt-3 border-t border-border space-y-1">
          {Object.entries(byCurrency).map(([currency, amount]) => {
            const isPositive = amount > 0;
            const isNegative = amount < 0;
            return (
              <div key={currency} className="flex items-center justify-between text-xs">
                <span className={cn(
                  "font-medium",
                  isPositive && "text-emerald-600",
                  isNegative && "text-destructive",
                  !isPositive && !isNegative && "text-muted-foreground",
                )}>
                  {isPositive ? t("theyOweYou") : isNegative ? t("youOweThem") : t("settled")}
                </span>
                <MoneyDisplay
                  amount={Math.abs(amount)}
                  currency={currency}
                  className={cn(
                    "inline text-xs font-semibold",
                    isPositive && "text-emerald-600",
                    isNegative && "text-destructive",
                  )}
                />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && pnpm exec tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/people/person-card.tsx frontend/messages/en.json frontend/messages/ar.json
git commit -m "feat(people): add PersonCard component with balance display and i18n"
```

---

## Task 6: Person List + Delete Confirmation

**Files:**
- Create: `frontend/src/components/people/person-list.tsx`

- [ ] **Step 1: Create person list component with delete dialog**

Create `frontend/src/components/people/person-list.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonCard } from "@/components/people/person-card";
import { usePersons, useDeletePerson } from "@/hooks/use-persons";
import type { PersonResponse } from "@/lib/types/debts";

interface PersonListProps {
  onEdit: (person: PersonResponse) => void;
  onAdd: () => void;
}

export function PersonList({ onEdit, onAdd }: PersonListProps) {
  const t = useTranslations("people");
  const tCommon = useTranslations("common");
  const { data, isLoading } = usePersons();
  const deleteMutation = useDeletePerson();
  const [deleteTarget, setDeleteTarget] = useState<PersonResponse | null>(null);

  const persons = data?.data ?? [];

  if (isLoading) {
    return <p className="text-muted-foreground text-sm py-4">{tCommon("loading")}</p>;
  }

  if (persons.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("noPeople")}
        description={t("noPeopleDescription")}
        action={{ label: t("addPerson"), onClick: onAdd }}
      />
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {persons.map((person) => (
          <PersonCard
            key={person.id}
            person={person}
            onEdit={onEdit}
            onDelete={setDeleteTarget}
          />
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmDescription", { name: deleteTarget?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                }
              }}
            >
              {deleteMutation.isPending ? tCommon("loading") : t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && pnpm exec tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/people/person-list.tsx
git commit -m "feat(people): add PersonList component with delete confirmation"
```

---

## Task 7: Person Management Page + Navigation

**Files:**
- Create: `frontend/src/app/(app)/people/page.tsx`
- Modify: `frontend/src/lib/nav-items.ts`
- Modify: `frontend/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Create the person management page**

Create `frontend/src/app/(app)/people/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonForm } from "@/components/debts/person-form";
import { PersonList } from "@/components/people/person-list";
import type { PersonResponse } from "@/lib/types/debts";

export default function PeoplePage() {
  const t = useTranslations("people");
  const [formOpen, setFormOpen] = useState(false);
  const [editPerson, setEditPerson] = useState<PersonResponse | null>(null);

  const handleEdit = (person: PersonResponse) => {
    setEditPerson(person);
    setFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditPerson(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
        </div>
        <Button size="sm" onClick={() => { setEditPerson(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 me-1" />
          {t("addPerson")}
        </Button>
      </header>

      {/* Person list */}
      <PersonList onEdit={handleEdit} onAdd={() => setFormOpen(true)} />

      {/* Create/Edit form sheet */}
      <PersonForm
        open={formOpen}
        onOpenChange={handleCloseForm}
        initialData={editPerson}
      />
    </div>
  );
}
```

> **Note:** The `PersonForm` component needs the `initialData` prop added by Plan 3D-3 (edit mode support). If 3D-3 is not complete yet, the `initialData` prop will be ignored and the form will only support creation.

- [ ] **Step 2: Add People to nav items**

In `frontend/src/lib/nav-items.ts`, add a new import for the `Users` icon (already imported) and add the People item after the debts entry:

Find the debts entry:
```typescript
  { href: "/debts", icon: HandCoins, label: "nav.debts" },
```

Add immediately after it:
```typescript
  { href: "/people", icon: Users, label: "nav.people" },
```

> **Note:** The `Users` icon is already imported in this file. The `nav.people` i18n key needs to be added in the next step.

- [ ] **Step 3: Update sidebar to include /people in the Planning section**

In `frontend/src/components/layout/sidebar.tsx`, update the `sectionPlanning` filter at line 27:

Replace:
```typescript
      ["/budgets", "/debts", "/gam3eya"].includes(i.href)
```

With:
```typescript
      ["/budgets", "/debts", "/people", "/gam3eya"].includes(i.href)
```

- [ ] **Step 4: Add nav i18n string**

In `frontend/messages/en.json`, add to the `"nav"` section:

```json
"people": "People"
```

In `frontend/messages/ar.json`, add to the `"nav"` section:

```json
"people": "الأشخاص"
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd frontend && pnpm exec tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors.

- [ ] **Step 6: Verify the build**

Run: `cd frontend && pnpm build 2>&1 | tail -10`
Expected: Build succeeds. The `/people` route is generated.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/\(app\)/people/page.tsx frontend/src/lib/nav-items.ts frontend/src/components/layout/sidebar.tsx frontend/messages/en.json frontend/messages/ar.json
git commit -m "feat(people): add standalone person management page with navigation"
```

---

## Self-Review Checklist

### 1. Spec Coverage
| Spec Requirement | Task | Status |
|---|---|---|
| Account obligations section for bank accounts (linked loans) | Task 2-3 | ✅ DebtRow renders loans |
| Account obligations section for CC/financing apps (installments) | Task 2-3 | ✅ InstallmentRow renders installments |
| Dashboard "Active Debts" stat card with real data | Task 4 | ✅ Queries active debts + installments |
| Person management (list, edit, delete) | Task 5-7 | ✅ Full CRUD page |
| Navigation link for People | Task 7 | ✅ Added to Planning section |

### 2. Placeholder Scan
- No "TBD", "TODO", "implement later" found.
- All code blocks are complete.
- All i18n strings provided in both English and Arabic.

### 3. Type Consistency
- `ObligationDebt` / `ObligationInstallment` — matches backend `schemas/installment.py` exactly
- `PersonResponse` — used consistently from `@/lib/types/debts`
- `MoneyDisplay` — used for all money rendering (never raw numbers)
- Hook patterns follow existing codebase conventions (`useApiMutation`, `apiGet`, `queryKey` arrays)

### 4. CSS Property Audit
- All directional properties use logical equivalents (`me-1`, `ms-2`, `text-end`, `start-0`, `pe-4`, `ps-4`)
- No physical `left-`, `right-`, `pl-`, `pr-`, `ml-`, `mr-`, `text-left`, `text-right` used
