# Wave 4: Page Fidelity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring all Phase 1 pages (accounts, transactions, transfers, dashboard, sidebar) to full Stitch design fidelity, fix logo sizes site-wide, and add the official brand tagline.

**Architecture:** Three independent parallel units (1.5I, 1.5J, 1.5K) each on its own branch — all rebased from main after Wave 3 merges. No shared state or sequential dependency between units; each produces a complete, mergeable PR. The only potential merge conflict is `use-transactions.ts` (both 1.5I and 1.5J add `icon` to the `category` inline type) — note on resolution is in each unit.

**Tech Stack:** Next.js 16, React 19, TypeScript, shadcn/ui (base-nova), Tailwind CSS v4, TanStack Query, next-intl, Lucide React, FastAPI (Python 3.12)

**Design spec:** `docs/superpowers/specs/2026-03-29-wave-4-page-fidelity-design.md`

**Stitch refs:** `docs/stitch-designs/html/06-accounts.html`, `docs/stitch-designs/html/07-account-detail.html`, `docs/stitch-designs/html/07b-transactions-global.html`, `docs/stitch-designs/html/05-dashboard.html`

---

## Execution Order

All three units start in parallel after Wave 3 is on main:

```
git checkout main && git pull
git checkout -b feature/1.5I-accounts-fidelity   # Unit 1.5I
git checkout -b feature/1.5J-transactions-fidelity # Unit 1.5J
git checkout -b feature/1.5K-transfers-dashboard-sidebar # Unit 1.5K
```

---

## File Map

### Unit 1.5I: Accounts Page Fidelity

| File | Change |
|---|---|
| `frontend/src/hooks/use-accounts.ts` | ADD `NetWorthData` type, `useNetWorth` hook, `UpdateAccountInput`, `useUpdateAccount` |
| `frontend/src/components/accounts/net-worth-bar.tsx` | NEW — gradient summary bar |
| `frontend/src/components/accounts/utilization-bar.tsx` | NEW — credit utilization progress bar |
| `frontend/src/components/accounts/billing-badge.tsx` | NEW — "Payment due in X days" badge |
| `frontend/src/components/accounts/account-card.tsx` | MODIFY — add hover edit/delete actions, wire utilization bar + billing badge |
| `frontend/src/hooks/use-transactions.ts` | MODIFY — add `icon` field to `Transaction.category` inline type |
| `frontend/src/components/transactions/transaction-row.tsx` | MODIFY — show category icon in badge |
| `frontend/src/app/(app)/accounts/page.tsx` | MODIFY — add `NetWorthBar` above grid |
| `frontend/messages/en.json` | ADD i18n keys |
| `frontend/messages/ar.json` | ADD i18n keys |

### Unit 1.5J: Transactions Page Fidelity

| File | Change |
|---|---|
| `frontend/src/hooks/use-transactions.ts` | ADD `useBulkDeleteTransactions`, `useBulkCategorizeTransactions`; ADD `icon` to category type |
| `frontend/src/components/transactions/transaction-filters.tsx` | REWRITE — full 7-dimension filter bar |
| `frontend/src/components/transactions/account-pill.tsx` | NEW |
| `frontend/src/components/transactions/bulk-toolbar.tsx` | NEW |
| `frontend/src/components/transactions/transaction-row.tsx` | MODIFY — hover-only actions, bulk checkbox, account pill, category icon |
| `frontend/src/components/transactions/transaction-table.tsx` | MODIFY — bulk mode header checkbox, accountsMap prop |
| `frontend/src/app/(app)/transactions/page.tsx` | MODIFY — bulk mode state, accountsMap, updated filter bar |
| `frontend/messages/en.json` | ADD i18n keys |
| `frontend/messages/ar.json` | ADD i18n keys |

### Unit 1.5K: Transfers + Dashboard + Sidebar

| File | Change |
|---|---|
| `frontend/src/components/shared/logo.tsx` | ADD `LOGO_SIZES` constants |
| `frontend/src/components/layout/sidebar.tsx` | MODIFY — logo size, tagline, section grouping, active border |
| `frontend/src/components/layout/navbar.tsx` | MODIFY — logo size |
| `frontend/src/hooks/use-transfers.ts` | MODIFY — add `type` + `institution` to Transfer account objects |
| `frontend/src/components/transfers/account-mini-card.tsx` | NEW |
| `frontend/src/app/(app)/transfers/page.tsx` | MODIFY — use AccountMiniCard, colorize amounts |
| `frontend/src/components/dashboard/stat-card-placeholder.tsx` | NEW |
| `frontend/src/app/(app)/dashboard/page.tsx` | REWRITE — structured placeholder |
| `frontend/messages/en.json` | ADD i18n keys |
| `frontend/messages/ar.json` | ADD i18n keys |

---

## Unit 1.5I: Accounts Page Fidelity

### Task I-1: Add `useNetWorth` hook

**Files:**
- Modify: `frontend/src/hooks/use-accounts.ts`

- [ ] Add `NetWorthData` type and `useNetWorth` hook at the end of `use-accounts.ts`:

```typescript
export interface NetWorthData {
  by_currency: Record<string, number>;
  total_base_minor: number;
  base_currency: string;
  account_count: number;
}

export function useNetWorth() {
  return useQuery({
    queryKey: ["net-worth"],
    queryFn: () => apiGet<NetWorthData>("/api/v1/accounts/net-worth"),
  });
}
```

- [ ] Verify the endpoint exists: `curl http://localhost:8000/api/v1/accounts/net-worth` (with auth). If it returns 404, the Wave 2 unit (1.5C) needs to be confirmed merged.

- [ ] Commit:

```bash
git add frontend/src/hooks/use-accounts.ts
git commit -m "feat(accounts): add useNetWorth hook"
```

---

### Task I-2: Create `NetWorthBar` component

**Files:**
- Create: `frontend/src/components/accounts/net-worth-bar.tsx`

- [ ] Create the component:

```typescript
"use client";

import { useTranslations, useLocale } from "next-intl";
import { TrendingUp } from "lucide-react";
import { useNetWorth } from "@/hooks/use-accounts";
import { formatAmount } from "@/lib/money";

export function NetWorthBar() {
  const t = useTranslations("accounts");
  const locale = useLocale();
  const { data, isLoading } = useNetWorth();

  if (isLoading) {
    return (
      <div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 p-5 mb-6 animate-pulse h-24" />
    );
  }

  if (!data?.data) return null;

  const { by_currency, total_base_minor, base_currency, account_count } = data.data;
  const currencyCount = Object.keys(by_currency).length;

  return (
    <div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 p-5 mb-6 text-primary-foreground">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="h-4 w-4 opacity-80" />
        <span className="text-sm font-medium opacity-80">{t("netWorth")}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight">
        {formatAmount(total_base_minor, base_currency, locale)}
      </p>
      <div className="flex gap-4 mt-2 text-sm opacity-80">
        <span>{t("accountCount", { count: account_count })}</span>
        {currencyCount > 1 && (
          <span>{t("currencyCount", { count: currencyCount })}</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] Verify `formatAmount` exists in `frontend/src/lib/money.ts`. If not, check what the actual export is called and use that.

- [ ] Commit:

```bash
git add frontend/src/components/accounts/net-worth-bar.tsx
git commit -m "feat(accounts): add NetWorthBar component"
```

---

### Task I-3: Wire `NetWorthBar` into `AccountsPage`

**Files:**
- Modify: `frontend/src/app/(app)/accounts/page.tsx`

- [ ] Replace the file content:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { useAccounts } from "@/hooks/use-accounts";
import { AccountGrid } from "@/components/accounts/account-grid";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";
import { TransferForm } from "@/components/transfers/transfer-form";
import { NetWorthBar } from "@/components/accounts/net-worth-bar";
import { AccountGridSkeleton } from "@/components/shared/skeletons";

export default function AccountsPage() {
  const t = useTranslations("accounts");
  const { data, isLoading, error } = useAccounts();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <TransferForm />
          <CreateAccountDialog />
        </div>
      </div>

      <NetWorthBar />

      {isLoading && <AccountGridSkeleton />}
      {error && <p className="text-destructive">{t("error")}: {error.message}</p>}
      {data?.data && data.data.length > 0 && <AccountGrid accounts={data.data} />}
      {data?.data?.length === 0 && !isLoading && (
        <p className="text-muted-foreground text-center py-12">
          {t("emptyState")}
        </p>
      )}
    </div>
  );
}
```

- [ ] Run `pnpm dev` and navigate to `/accounts`. Verify the gradient bar renders above the account grid.

- [ ] Commit:

```bash
git add frontend/src/app/(app)/accounts/page.tsx
git commit -m "feat(accounts): wire NetWorthBar into AccountsPage"
```

---

### Task I-4: Add `useUpdateAccount` hook

**Files:**
- Modify: `frontend/src/hooks/use-accounts.ts`

- [ ] Add `UpdateAccountInput` and `useUpdateAccount` after `useDeleteAccount`:

```typescript
export interface UpdateAccountInput {
  id: number;
  name?: string;
  institution?: string;
  credit_limit?: number;
  billing_cycle_day?: number;
  payment_due_day?: number;
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: ({ id, ...body }: UpdateAccountInput) =>
      apiPut<Account>(`/api/v1/accounts/${id}`, body),
    successMessage: t("accountUpdated"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["net-worth"] });
    },
  });
}
```

- [ ] Add `apiPut` to the imports at the top of `use-accounts.ts`:

```typescript
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
```

- [ ] Commit:

```bash
git add frontend/src/hooks/use-accounts.ts
git commit -m "feat(accounts): add useUpdateAccount hook"
```

---

### Task I-5: Create `UtilizationBar` component

**Files:**
- Create: `frontend/src/components/accounts/utilization-bar.tsx`

- [ ] Create the component:

```typescript
import { useTranslations, useLocale } from "next-intl";
import { formatAmount } from "@/lib/money";

interface UtilizationBarProps {
  balanceMinor: number;      // displayed_balance_minor (negative for credit used)
  creditLimitMinor: number;  // credit_limit
  currency: string;
}

export function UtilizationBar({ balanceMinor, creditLimitMinor, currency }: UtilizationBarProps) {
  const t = useTranslations("accounts");
  const locale = useLocale();

  const used = Math.max(0, -balanceMinor);
  const pct = Math.min(100, Math.round((used / creditLimitMinor) * 100));

  const barColor =
    pct < 50 ? "bg-green-500" :
    pct < 80 ? "bg-amber-500" :
    "bg-red-500";

  return (
    <div className="mt-2 space-y-1">
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{t("utilized", { pct })}</span>
        <span>{t("limit")}: {formatAmount(creditLimitMinor, currency, locale)}</span>
      </div>
    </div>
  );
}
```

- [ ] Commit:

```bash
git add frontend/src/components/accounts/utilization-bar.tsx
git commit -m "feat(accounts): add UtilizationBar component"
```

---

### Task I-6: Create `BillingBadge` component

**Files:**
- Create: `frontend/src/components/accounts/billing-badge.tsx`

- [ ] Create the component:

```typescript
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

interface BillingBadgeProps {
  paymentDueDay: number; // 1-31: day of month payment is due
}

function daysUntilNextOccurrence(dayOfMonth: number): number {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const thisMonth = new Date(year, month, dayOfMonth);
  if (thisMonth <= today) {
    // due date already passed this month — next is next month
    const nextMonth = new Date(year, month + 1, dayOfMonth);
    return Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
  return Math.ceil((thisMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function BillingBadge({ paymentDueDay }: BillingBadgeProps) {
  const t = useTranslations("accounts");
  const days = daysUntilNextOccurrence(paymentDueDay);

  const variant =
    days <= 3 ? "destructive" :
    days <= 7 ? "secondary" :
    "outline";

  const label =
    days === 0 ? t("dueToday") :
    days < 0 ? t("overdue") :
    t("dueInDays", { days });

  return <Badge variant={variant} className="text-xs mt-1">{label}</Badge>;
}
```

- [ ] Commit:

```bash
git add frontend/src/components/accounts/billing-badge.tsx
git commit -m "feat(accounts): add BillingBadge component"
```

---

### Task I-7: Refactor `AccountCard` — hover actions + utilization + billing

**Files:**
- Modify: `frontend/src/components/accounts/account-card.tsx`

This task adds edit/delete hover actions, the utilization bar, and the billing badge. The card's main body navigates to the account detail page. Edit/delete buttons are overlaid in the top-end corner and only visible on hover (`group-hover`).

- [ ] Replace the file content:

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Wallet, CreditCard, Banknote, Smartphone, ShoppingBag, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { MoneyDisplay } from "@/components/shared/money-display";
import { UtilizationBar } from "./utilization-bar";
import { BillingBadge } from "./billing-badge";
import { useUpdateAccount, useDeleteAccount } from "@/hooks/use-accounts";
import type { Account } from "@/hooks/use-accounts";

export const typeIcons: Record<string, typeof Wallet> = {
  bank_account: Wallet,
  credit_card: CreditCard,
  cash_wallet: Banknote,
  digital_wallet: Smartphone,
  financing_app: ShoppingBag,
};

export const typeColors: Record<string, string> = {
  bank_account: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  credit_card: "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  cash_wallet: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
  digital_wallet: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  financing_app: "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
};

export const typePillColors: Record<string, string> = {
  bank_account: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  credit_card: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  cash_wallet: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  digital_wallet: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  financing_app: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

interface AccountCardProps {
  account: Account;
}

export function AccountCard({ account }: AccountCardProps) {
  const t = useTranslations("accounts");
  const locale = useLocale();
  const Icon = typeIcons[account.type] || Wallet;
  const iconColor = typeColors[account.type] || "bg-primary/10 text-primary";

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Edit form state
  const [name, setName] = useState(account.name);
  const [institution, setInstitution] = useState(account.institution || "");
  const [creditLimit, setCreditLimit] = useState(
    account.credit_limit != null
      ? String(account.credit_limit / 100)
      : ""
  );
  const [billingDay, setBillingDay] = useState(
    account.billing_cycle_day != null ? String(account.billing_cycle_day) : ""
  );
  const [paymentDueDay, setPaymentDueDay] = useState(
    account.payment_due_day != null ? String(account.payment_due_day) : ""
  );

  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  const isCreditType =
    account.type === "credit_card" || account.type === "financing_app";

  const openEdit = () => {
    setName(account.name);
    setInstitution(account.institution || "");
    setCreditLimit(account.credit_limit != null ? String(account.credit_limit / 100) : "");
    setBillingDay(account.billing_cycle_day != null ? String(account.billing_cycle_day) : "");
    setPaymentDueDay(account.payment_due_day != null ? String(account.payment_due_day) : "");
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateAccount.mutateAsync({
      id: account.id,
      name: name || undefined,
      institution: institution || undefined,
      credit_limit: isCreditType && creditLimit ? Math.round(parseFloat(creditLimit) * 100) : undefined,
      billing_cycle_day: isCreditType && billingDay ? parseInt(billingDay) : undefined,
      payment_due_day: isCreditType && paymentDueDay ? parseInt(paymentDueDay) : undefined,
    });
    setEditOpen(false);
  };

  const handleDelete = async () => {
    await deleteAccount.mutateAsync(account.id);
    setDeleteOpen(false);
  };

  return (
    <>
      <div className="relative group">
        <Link href={`/accounts/${account.id}`}>
          <Card className="hover:bg-accent/50 hover:-translate-y-1 transition-all duration-200 cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className={`rounded-lg p-2 ${iconColor}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-medium truncate">
                  {account.name}
                </CardTitle>
                {account.institution && (
                  <p className="text-xs text-muted-foreground">{account.institution}</p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <MoneyDisplay
                amount={account.displayed_balance_minor}
                currency={account.currency}
                size="lg"
                colorize
              />
              {isCreditType && account.credit_limit != null && (
                <UtilizationBar
                  balanceMinor={account.displayed_balance_minor}
                  creditLimitMinor={account.credit_limit}
                  currency={account.currency}
                />
              )}
              {isCreditType && account.payment_due_day != null && (
                <BillingBadge paymentDueDay={account.payment_due_day} />
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Hover action buttons — overlaid top-end corner, hidden until group-hover */}
        <div className="absolute top-2 end-2 hidden group-hover:flex gap-1 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-background/90 shadow-sm hover:bg-background"
            onClick={(e) => { e.preventDefault(); openEdit(); }}
            aria-label={t("editAccount")}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-background/90 shadow-sm hover:bg-destructive hover:text-destructive-foreground"
            onClick={(e) => { e.preventDefault(); setDeleteOpen(true); }}
            aria-label={t("deleteAccount")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editAccount")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>{t("name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t("institution")}</Label>
              <Input
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder={t("institutionPlaceholder")}
              />
            </div>
            {isCreditType && (
              <>
                <div className="space-y-2">
                  <Label>{t("creditLimit")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t("billingCycleDay")}</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={billingDay}
                      onChange={(e) => setBillingDay(e.target.value)}
                      placeholder="1–31"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("paymentDueDay")}</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={paymentDueDay}
                      onChange={(e) => setPaymentDueDay(e.target.value)}
                      placeholder="1–31"
                    />
                  </div>
                </div>
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                {t("cancel") || "Cancel"}
              </Button>
              <Button type="submit" disabled={updateAccount.isPending}>
                {updateAccount.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteAccount")}</DialogTitle>
            <DialogDescription>{t("deleteAccountConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteAccount.isPending}
              onClick={handleDelete}
            >
              {deleteAccount.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] Run `pnpm dev`. Navigate to `/accounts`, hover a card — edit and delete buttons should appear in the top-end corner. Clicking edit opens the dialog pre-filled; credit card accounts show utilization bar and billing badge.

- [ ] Commit:

```bash
git add frontend/src/components/accounts/account-card.tsx
git commit -m "feat(accounts): hover edit/delete, utilization bar, billing badge"
```

---

### Task I-8: Add `icon` to `Transaction.category` type

**Files:**
- Modify: `frontend/src/hooks/use-transactions.ts`

> **Parallel branch note:** Unit 1.5J makes the same change. If 1.5I merges first, 1.5J will get this for free. If 1.5J merges first, skip this task in 1.5I and resolve the merge conflict normally.

- [ ] Add `icon` to the `category` inline type in `use-transactions.ts`:

```typescript
export interface Transaction {
  // ... existing fields ...
  category?: {
    id: number;
    name_en: string;
    name_ar: string | null;
    color: string | null;
    icon: string | null;   // ADD THIS LINE
  } | null;
  // ... rest of fields ...
}
```

- [ ] Commit:

```bash
git add frontend/src/hooks/use-transactions.ts
git commit -m "feat(transactions): add icon field to Transaction.category type"
```

---

### Task I-9: Show category icon in `TransactionRow`

**Files:**
- Modify: `frontend/src/components/transactions/transaction-row.tsx`

- [ ] Replace the category badge section in the `<td>` (around line 99–115):

```typescript
<td className="px-4 py-3">
  {transaction.category ? (
    <Badge variant="secondary" className="gap-1.5">
      {transaction.category.icon ? (
        <span className="text-xs">{transaction.category.icon}</span>
      ) : transaction.category.color ? (
        <span
          className="inline-block h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: transaction.category.color }}
        />
      ) : null}
      {locale === "ar" && transaction.category.name_ar
        ? transaction.category.name_ar
        : transaction.category.name_en}
    </Badge>
  ) : (
    <span className="text-xs text-muted-foreground">{t("transactions.uncategorized")}</span>
  )}
</td>
```

- [ ] Verify in the browser: category badges in account detail should now show the emoji icon (e.g., 🛒, 🏠) if the category has one.

- [ ] Commit:

```bash
git add frontend/src/components/transactions/transaction-row.tsx
git commit -m "feat(transactions): show category icon in transaction row badge"
```

---

### Task I-10: Add i18n keys

**Files:**
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

- [ ] Add to `"accounts"` section in `en.json`:

```json
"netWorth": "Net Worth",
"accountCount": "{count} accounts",
"currencyCount": "{count} currencies",
"utilized": "{pct}% utilized",
"limit": "Limit",
"dueToday": "Due today",
"overdue": "Overdue",
"dueInDays": "Due in {days} days",
"editAccount": "Edit Account",
"deleteAccount": "Delete Account",
"deleteAccountConfirm": "This account will be hidden. Transaction history is preserved.",
"creditLimit": "Credit Limit",
"billingCycleDay": "Billing Cycle Day",
"paymentDueDay": "Payment Due Day",
"cancel": "Cancel",
"name": "Account Name"
```

- [ ] Add to `"accounts"` section in `ar.json`:

```json
"netWorth": "صافي الثروة",
"accountCount": "{count} حساب",
"currencyCount": "{count} عملات",
"utilized": "مستخدم {pct}%",
"limit": "الحد",
"dueToday": "مستحق اليوم",
"overdue": "متأخر",
"dueInDays": "مستحق خلال {days} يوم",
"editAccount": "تعديل الحساب",
"deleteAccount": "حذف الحساب",
"deleteAccountConfirm": "سيتم إخفاء الحساب. سيتم الاحتفاظ بسجل المعاملات.",
"creditLimit": "حد الائتمان",
"billingCycleDay": "يوم دورة الفاتورة",
"paymentDueDay": "يوم استحقاق الدفع",
"cancel": "إلغاء",
"name": "اسم الحساب"
```

- [ ] Run `pnpm build` — must pass with zero TypeScript errors.

- [ ] Commit:

```bash
git add frontend/messages/en.json frontend/messages/ar.json
git commit -m "feat(accounts): add i18n keys for net worth, billing, edit/delete"
```

---

## Unit 1.5J: Transactions Page Fidelity

### Task J-1: Add bulk mutation hooks

**Files:**
- Modify: `frontend/src/hooks/use-transactions.ts`

- [ ] Add `BulkDeleteInput`, `BulkCategorizeInput`, `useBulkDeleteTransactions`, `useBulkCategorizeTransactions` at the end of the file:

```typescript
export interface BulkDeleteInput {
  ids: number[];
}

export interface BulkCategorizeInput {
  ids: number[];
  category_id: number;
}

export function useBulkDeleteTransactions() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (data: BulkDeleteInput) =>
      apiPost<{ deleted: number }>("/api/v1/transactions/bulk/delete", data),
    successMessage: t("bulkDeleted"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useBulkCategorizeTransactions() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (data: BulkCategorizeInput) =>
      apiPost<{ updated: number }>("/api/v1/transactions/bulk/categorize", data),
    successMessage: t("bulkCategorized"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
```

> **Parallel branch note:** Also add `icon: string | null` to the `category` inline type on `Transaction` (same as Task I-8). If 1.5I already merged, skip adding icon and just resolve the conflict.

- [ ] Commit:

```bash
git add frontend/src/hooks/use-transactions.ts
git commit -m "feat(transactions): add bulk delete and categorize hooks"
```

---

### Task J-2: Create `AccountPill` component

**Files:**
- Create: `frontend/src/components/transactions/account-pill.tsx`

- [ ] Create the component. Define pill colors inline so `AccountPill` is self-contained and works on any branch regardless of whether 1.5I has merged:

```typescript
import Link from "next/link";

// Defined locally so this component is independent of 1.5I branch state
const PILL_COLORS: Record<string, string> = {
  bank_account:    "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  credit_card:     "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  cash_wallet:     "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  digital_wallet:  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  financing_app:   "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

interface AccountPillProps {
  accountId: number;
  accountName: string;
  accountType: string;
}

export function AccountPill({ accountId, accountName, accountType }: AccountPillProps) {
  const colorClass = PILL_COLORS[accountType] || "bg-muted text-muted-foreground";
  return (
    <Link href={`/accounts/${accountId}`}>
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${colorClass}`}
      >
        {accountName}
      </span>
    </Link>
  );
}
```

- [ ] Commit:

```bash
git add frontend/src/components/transactions/account-pill.tsx
git commit -m "feat(transactions): add AccountPill component"
```

---

### Task J-3: Rewrite `TransactionFilterBar`

**Files:**
- Modify: `frontend/src/components/transactions/transaction-filters.tsx`

This is a complete rewrite. The new version adds account dropdown, category dropdown (with icons), amount range, and a Reset button.

- [ ] Replace the entire file:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import type { TransactionFilters } from "@/hooks/use-transactions";

const DEFAULT_FILTERS: TransactionFilters = {
  page: 1,
  page_size: 50,
  sort: "-date",
};

interface TransactionFilterBarProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
}

export function TransactionFilterBar({ filters, onChange }: TransactionFilterBarProps) {
  const t = useTranslations();
  const { data: accountsData } = useAccounts();
  const { data: categoriesData } = useCategories();

  const reset = () => onChange(DEFAULT_FILTERS);

  const hasActiveFilters =
    filters.q || filters.account_id || filters.category_id ||
    filters.type || filters.date_from || filters.date_to ||
    filters.amount_min != null || filters.amount_max != null;

  return (
    <div className="flex flex-wrap gap-2 mb-4 items-end">
      {/* Search */}
      <Input
        placeholder={t("transactions.search")}
        value={filters.q || ""}
        onChange={(e) => onChange({ ...filters, q: e.target.value || undefined, page: 1 })}
        className="w-48"
      />

      {/* Account */}
      <select
        value={filters.account_id ?? ""}
        onChange={(e) => onChange({ ...filters, account_id: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">{t("transactions.allAccounts")}</option>
        {(accountsData?.data || []).map((acc) => (
          <option key={acc.id} value={acc.id}>{acc.name}</option>
        ))}
      </select>

      {/* Category */}
      <select
        value={filters.category_id ?? ""}
        onChange={(e) => onChange({ ...filters, category_id: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">{t("transactions.allCategories")}</option>
        {(categoriesData?.data || []).map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.icon ? `${cat.icon} ` : ""}{cat.name_en}
          </option>
        ))}
      </select>

      {/* Type */}
      <select
        value={filters.type || ""}
        onChange={(e) => onChange({ ...filters, type: e.target.value || undefined, page: 1 })}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">{t("transactions.allTypes")}</option>
        <option value="debit">{t("transactions.expenses")}</option>
        <option value="credit">{t("transactions.income")}</option>
      </select>

      {/* Date from */}
      <Input
        type="date"
        value={filters.date_from || ""}
        onChange={(e) => onChange({ ...filters, date_from: e.target.value || undefined, page: 1 })}
        className="w-36"
      />

      {/* Date to */}
      <Input
        type="date"
        value={filters.date_to || ""}
        onChange={(e) => onChange({ ...filters, date_to: e.target.value || undefined, page: 1 })}
        className="w-36"
      />

      {/* Amount min */}
      <Input
        type="number"
        placeholder={t("transactions.amountMin")}
        value={filters.amount_min != null ? String(filters.amount_min) : ""}
        onChange={(e) => onChange({ ...filters, amount_min: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
        className="w-28"
        min="0"
      />

      {/* Amount max */}
      <Input
        type="number"
        placeholder={t("transactions.amountMax")}
        value={filters.amount_max != null ? String(filters.amount_max) : ""}
        onChange={(e) => onChange({ ...filters, amount_max: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
        className="w-28"
        min="0"
      />

      {/* Reset */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={reset} className="gap-1">
          <X className="h-3.5 w-3.5" />
          {t("transactions.resetFilters")}
        </Button>
      )}
    </div>
  );
}
```

- [ ] Commit:

```bash
git add frontend/src/components/transactions/transaction-filters.tsx
git commit -m "feat(transactions): full 7-dimension filter bar with reset"
```

---

### Task J-4: Create `BulkToolbar` component

**Files:**
- Create: `frontend/src/components/transactions/bulk-toolbar.tsx`

- [ ] Create the component:

```typescript
"use client";

import { useTranslations, useLocale } from "next-intl";
import { Trash2, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/use-categories";
import {
  useBulkDeleteTransactions,
  useBulkCategorizeTransactions,
} from "@/hooks/use-transactions";

interface BulkToolbarProps {
  selectedIds: number[];
  onCancel: () => void;
}

export function BulkToolbar({ selectedIds, onCancel }: BulkToolbarProps) {
  const t = useTranslations("transactions");
  const locale = useLocale();
  const { data: categoriesData } = useCategories();
  const bulkDelete = useBulkDeleteTransactions();
  const bulkCategorize = useBulkCategorizeTransactions();

  const handleDelete = async () => {
    if (!confirm(t("bulkDeleteConfirm", { count: selectedIds.length }))) return;
    await bulkDelete.mutateAsync({ ids: selectedIds });
    onCancel();
  };

  const handleCategorize = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = Number(e.target.value);
    if (!categoryId) return;
    await bulkCategorize.mutateAsync({ ids: selectedIds, category_id: categoryId });
    onCancel();
    e.target.value = "";
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
      <span className="text-sm font-medium text-primary">
        {t("selectedCount", { count: selectedIds.length })}
      </span>
      <div className="flex-1" />
      <select
        defaultValue=""
        onChange={handleCategorize}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        disabled={bulkCategorize.isPending}
      >
        <option value="">{t("recategorize")}</option>
        {(categoriesData?.data || []).map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.icon ? `${cat.icon} ` : ""}
            {locale === "ar" && cat.name_ar ? cat.name_ar : cat.name_en}
          </option>
        ))}
      </select>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={bulkDelete.isPending}
        className="gap-1.5"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {t("deleteSelected")}
      </Button>
      <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1">
        <X className="h-3.5 w-3.5" />
        {t("cancel")}
      </Button>
    </div>
  );
}
```

- [ ] Commit:

```bash
git add frontend/src/components/transactions/bulk-toolbar.tsx
git commit -m "feat(transactions): add BulkToolbar component"
```

---

### Task J-5: Modify `TransactionTable` for bulk mode + accountsMap

**Files:**
- Modify: `frontend/src/components/transactions/transaction-table.tsx`

- [ ] Replace the entire file:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { TransactionRow } from "./transaction-row";
import { Button } from "@/components/ui/button";
import type { Transaction } from "@/hooks/use-transactions";
import type { Account } from "@/hooks/use-accounts";

interface TransactionTableProps {
  transactions: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  showAccount?: boolean;
  accountsMap?: Record<number, Account>;
  // Bulk mode
  bulkMode?: boolean;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  onSelectAll?: (ids: number[]) => void;
}

export function TransactionTable({
  transactions,
  total,
  page,
  pageSize,
  onPageChange,
  showAccount = false,
  accountsMap,
  bulkMode = false,
  selectedIds = new Set(),
  onToggleSelect,
  onSelectAll,
}: TransactionTableProps) {
  const t = useTranslations();
  const totalPages = Math.ceil(total / pageSize);
  const allSelected = transactions.length > 0 && transactions.every((tx) => selectedIds.has(tx.id));

  return (
    <div>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              {bulkMode && (
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => {
                      if (checked) onSelectAll?.(transactions.map((tx) => tx.id));
                      else onSelectAll?.([]);
                    }}
                    aria-label={t("transactions.selectAll")}
                  />
                </th>
              )}
              <th className="px-4 py-3 text-start text-sm font-medium">{t("transactions.date")}</th>
              <th className="px-4 py-3 text-start text-sm font-medium">{t("transactions.description")}</th>
              {showAccount && (
                <th className="px-4 py-3 text-start text-sm font-medium">{t("nav.accounts")}</th>
              )}
              <th className="px-4 py-3 text-start text-sm font-medium">{t("transactions.category")}</th>
              <th className="px-4 py-3 text-end text-sm font-medium">{t("transactions.amount")}</th>
              <th className="px-4 py-3 w-20">
                <span className="sr-only">{t("transactions.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-muted/30">
            {transactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                showAccount={showAccount}
                account={accountsMap?.[tx.account_id]}
                bulkMode={bulkMode}
                selected={selectedIds.has(tx.id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={bulkMode ? 7 : 6} className="px-4 py-8 text-center text-muted-foreground">
                  {t("common.noResults")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            {t("common.total", { count: total })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              {t("common.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] Install shadcn Checkbox if not already present:

```bash
pnpm dlx shadcn@latest add -y checkbox
```

Then audit `frontend/src/components/ui/checkbox.tsx` for physical directional CSS (`pl-`, `pr-`, `left-`, `right-`) and convert to logical equivalents.

- [ ] Commit:

```bash
git add frontend/src/components/transactions/transaction-table.tsx frontend/src/components/ui/
git commit -m "feat(transactions): add bulk mode + accountsMap to TransactionTable"
```

---

### Task J-6: Modify `TransactionRow` for bulk checkbox + account pill + hover actions

**Files:**
- Modify: `frontend/src/components/transactions/transaction-row.tsx`

The key changes: add bulk checkbox column, account pill column, make edit/delete buttons visibility controlled by `bulkMode` vs hover, add category icon.

- [ ] At the top of `transaction-row.tsx`, update the import and props:

```typescript
import { Checkbox } from "@/components/ui/checkbox";
import { AccountPill } from "./account-pill";
import type { Account } from "@/hooks/use-accounts";
```

- [ ] Update the `TransactionRowProps` interface:

```typescript
interface TransactionRowProps {
  transaction: Transaction;
  showAccount?: boolean;
  account?: Account;
  bulkMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: number) => void;
}
```

- [ ] Update the function signature:

```typescript
export function TransactionRow({
  transaction,
  showAccount,
  account,
  bulkMode = false,
  selected = false,
  onToggleSelect,
}: TransactionRowProps) {
```

- [ ] Replace the `<tr>` with the updated version that adds bulk checkbox, account pill, hover-only actions:

```typescript
<tr className={`border-b transition-colors group ${selected ? "bg-primary/5" : "hover:bg-accent/50"}`}>
  {bulkMode && (
    <td className="px-4 py-3 w-10">
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggleSelect?.(transaction.id)}
        aria-label={`Select transaction ${transaction.id}`}
      />
    </td>
  )}
  <td className="px-4 py-3 text-sm">{transaction.date}</td>
  <td className="px-4 py-3 text-sm">
    <div>{transaction.description || "—"}</div>
    {transaction.notes && (
      <div className="text-xs text-muted-foreground mt-0.5">{transaction.notes}</div>
    )}
  </td>
  {showAccount && (
    <td className="px-4 py-3">
      {account ? (
        <AccountPill
          accountId={account.id}
          accountName={account.name}
          accountType={account.type}
        />
      ) : null}
    </td>
  )}
  <td className="px-4 py-3">
    {transaction.category ? (
      <Badge variant="secondary" className="gap-1.5">
        {transaction.category.icon ? (
          <span className="text-xs">{transaction.category.icon}</span>
        ) : transaction.category.color ? (
          <span
            className="inline-block h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: transaction.category.color }}
          />
        ) : null}
        {locale === "ar" && transaction.category.name_ar
          ? transaction.category.name_ar
          : transaction.category.name_en}
      </Badge>
    ) : (
      <span className="text-xs text-muted-foreground">{t("transactions.uncategorized")}</span>
    )}
  </td>
  <td className="px-4 py-3 text-end">
    <MoneyDisplay
      amount={transaction.amount_minor}
      currency={transaction.currency}
      colorize
      showCurrency={false}
    />
  </td>
  <td className="px-4 py-3">
    {!bulkMode && (
      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={openEdit}
          aria-label={t("common.edit")}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
          aria-label={t("common.delete")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )}
  </td>
</tr>
```

- [ ] Commit:

```bash
git add frontend/src/components/transactions/transaction-row.tsx
git commit -m "feat(transactions): bulk checkbox, account pill, hover-only actions, category icon"
```

---

### Task J-7: Wire bulk mode + accountsMap into `TransactionsPage`

**Files:**
- Modify: `frontend/src/app/(app)/transactions/page.tsx`

- [ ] Replace the entire file:

```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useTransactions, type TransactionFilters } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionFilterBar } from "@/components/transactions/transaction-filters";
import { BulkToolbar } from "@/components/transactions/bulk-toolbar";
import { Button } from "@/components/ui/button";
import { TransactionTableSkeleton, FilterBarSkeleton } from "@/components/shared/skeletons";
import type { Account } from "@/hooks/use-accounts";

export default function TransactionsPage() {
  const t = useTranslations();
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    page_size: 50,
    sort: "-date",
  });
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data, isLoading } = useTransactions(filters);
  const { data: accountsData } = useAccounts();

  const accountsMap: Record<number, Account> = {};
  for (const acc of accountsData?.data ?? []) {
    accountsMap[acc.id] = acc;
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (ids: number[]) => {
    setSelectedIds(ids.length === 0 ? new Set() : new Set(ids));
  };

  const exitBulkMode = () => {
    setBulkMode(false);
    setSelectedIds(new Set());
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("nav.transactions")}</h1>
        <Button
          variant={bulkMode ? "secondary" : "outline"}
          size="sm"
          onClick={() => { if (bulkMode) exitBulkMode(); else setBulkMode(true); }}
        >
          {bulkMode ? t("transactions.cancel") : t("transactions.manage")}
        </Button>
      </div>

      {isLoading ? (
        <>
          <FilterBarSkeleton />
          <TransactionTableSkeleton />
        </>
      ) : (
        <>
          <TransactionFilterBar filters={filters} onChange={setFilters} />
          {bulkMode && selectedIds.size > 0 && (
            <BulkToolbar selectedIds={[...selectedIds]} onCancel={exitBulkMode} />
          )}
          <TransactionTable
            transactions={data?.data || []}
            total={data?.meta?.total || 0}
            page={filters.page || 1}
            pageSize={filters.page_size || 50}
            onPageChange={(p) => setFilters({ ...filters, page: p })}
            showAccount
            accountsMap={accountsMap}
            bulkMode={bulkMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectAll={selectAll}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] Run `pnpm dev`. Test: open `/transactions`, click "Manage", checkboxes appear. Select a few, re-categorize or delete. Click Cancel, checkboxes disappear.

- [ ] Commit:

```bash
git add frontend/src/app/(app)/transactions/page.tsx
git commit -m "feat(transactions): wire bulk mode and accountsMap into TransactionsPage"
```

---

### Task J-8: Add i18n keys

**Files:**
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

- [ ] Add to `"transactions"` in `en.json`:

```json
"allAccounts": "All Accounts",
"allCategories": "All Categories",
"amountMin": "Min amount",
"amountMax": "Max amount",
"resetFilters": "Reset",
"manage": "Manage",
"cancel": "Cancel",
"selectAll": "Select all",
"selectedCount": "{count} selected",
"recategorize": "Re-categorize…",
"deleteSelected": "Delete",
"bulkDeleteConfirm": "Delete {count} transactions? This cannot be undone.",
"bulkDeleted": "{count} transactions deleted",
"bulkCategorized": "Transactions re-categorized"
```

- [ ] Add to `"toast"` in `en.json`:

```json
"bulkDeleted": "Transactions deleted",
"bulkCategorized": "Transactions re-categorized"
```

- [ ] Add Arabic equivalents to `ar.json` in `"transactions"`:

```json
"allAccounts": "كل الحسابات",
"allCategories": "كل الفئات",
"amountMin": "الحد الأدنى",
"amountMax": "الحد الأقصى",
"resetFilters": "إعادة تعيين",
"manage": "إدارة",
"cancel": "إلغاء",
"selectAll": "تحديد الكل",
"selectedCount": "{count} محدد",
"recategorize": "تصنيف…",
"deleteSelected": "حذف",
"bulkDeleteConfirm": "حذف {count} معاملة؟ لا يمكن التراجع.",
"bulkDeleted": "تم حذف المعاملات",
"bulkCategorized": "تم إعادة تصنيف المعاملات"
```

- [ ] Add to `"toast"` in `ar.json`:

```json
"bulkDeleted": "تم حذف المعاملات",
"bulkCategorized": "تم إعادة تصنيف المعاملات"
```

- [ ] Run `pnpm build` — must pass with zero TypeScript errors.

- [ ] Commit:

```bash
git add frontend/messages/en.json frontend/messages/ar.json
git commit -m "feat(transactions): add i18n keys for filter bar, bulk mode, account pill"
```

---

## Unit 1.5K: Transfers + Dashboard + Sidebar

### Task K-1: Add `LOGO_SIZES` constants + update sidebar and navbar

**Files:**
- Modify: `frontend/src/components/shared/logo.tsx`
- Modify: `frontend/src/components/layout/sidebar.tsx`
- Modify: `frontend/src/components/layout/navbar.tsx`

- [ ] Add `LOGO_SIZES` to `logo.tsx` (after the `logoFiles` definition):

```typescript
export const LOGO_SIZES = {
  sidebar: { width: 160, height: 40 },
  mobileNav: { width: 36, height: 36 },
  authPanel: { width: 180, height: 44 },
  onboarding: { width: 160, height: 40 },
} as const;
```

- [ ] Update `sidebar.tsx` logo usage:

```typescript
import { Logo, LOGO_SIZES } from "@/components/shared/logo";
// ...
<Logo variant="horizontal" {...LOGO_SIZES.sidebar} />
```

- [ ] Update `navbar.tsx` logo usage:

```typescript
import { Logo, LOGO_SIZES } from "@/components/shared/logo";
// ...
<Logo variant="icon" {...LOGO_SIZES.mobileNav} />
```

- [ ] Commit:

```bash
git add frontend/src/components/shared/logo.tsx \
        frontend/src/components/layout/sidebar.tsx \
        frontend/src/components/layout/navbar.tsx
git commit -m "feat(logo): add LOGO_SIZES constants, update sidebar and navbar sizes"
```

---

### Task K-2: Verify auth + onboarding logo sizes, remove "The Financial Atelier"

**Files:**
- Check: `frontend/src/app/(auth)/layout.tsx`
- Check: `frontend/src/app/(onboarding)/layout.tsx` (if it exists — created in 1.5H)

- [ ] Run a grep to find all logo usage and any Stitch placeholder text:

```bash
grep -rn "Financial Atelier\|Logo variant\|LOGO_SIZES" frontend/src/
```

- [ ] For each `<Logo>` found in auth or onboarding layouts: replace hardcoded dimensions with the appropriate `LOGO_SIZES` constant (`LOGO_SIZES.authPanel` or `LOGO_SIZES.onboarding`). If the existing size is already equal to or larger than the target, leave it unchanged.

- [ ] If any file still contains "The Financial Atelier": remove that string. Replace with `"فلوسك متظبطة بالقرش"` where it was used as a tagline, or simply delete it if it was decorative text.

- [ ] Commit:

```bash
git add frontend/src/
git commit -m "fix(logo): verify auth/onboarding sizes, remove Financial Atelier placeholder"
```

---

### Task K-3: Sidebar polish — tagline + section grouping + active state

**Files:**
- Modify: `frontend/src/components/layout/sidebar.tsx`

- [ ] Replace the entire file:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Receipt,
  HandCoins,
  PiggyBank,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo, LOGO_SIZES } from "@/components/shared/logo";

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
};

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "nav.sectionOverview",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "nav.dashboard" },
    ],
  },
  {
    label: "nav.sectionFinance",
    items: [
      { href: "/accounts", icon: Wallet, label: "nav.accounts" },
      { href: "/transactions", icon: Receipt, label: "nav.transactions" },
      { href: "/transfers", icon: ArrowLeftRight, label: "nav.transfers" },
    ],
  },
  {
    label: "nav.sectionPlanning",
    items: [
      { href: "/debts", icon: HandCoins, label: "nav.debts", disabled: true },
      { href: "/budgets", icon: PiggyBank, label: "nav.budgets", disabled: true },
    ],
  },
  {
    label: "nav.sectionSettings",
    items: [
      { href: "/settings", icon: Settings, label: "nav.settings" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-e bg-card">
      <div className="flex flex-col h-16 justify-center px-6 border-b">
        <Link href="/dashboard">
          <Logo variant="horizontal" {...LOGO_SIZES.sidebar} />
        </Link>
        <p className="text-[11px] text-muted-foreground mt-0.5 font-medium" dir="rtl">
          فلوسك متظبطة بالقرش
        </p>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {t(section.label)}
            </p>
            <div className="space-y-0.5 px-2">
              {section.items.map((item) => {
                const isActive = !item.disabled && pathname.startsWith(item.href);
                if (item.disabled) {
                  return (
                    <span
                      key={item.href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/40 cursor-not-allowed"
                    >
                      <item.icon className="h-4 w-4" />
                      {t(item.label)}
                    </span>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors border-s-2",
                      isActive
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {t(item.label)}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] Add section label keys to `en.json` under `"nav"`:

```json
"sectionOverview": "Overview",
"sectionFinance": "Finance",
"sectionPlanning": "Planning",
"sectionSettings": "Settings"
```

- [ ] Add to `ar.json` under `"nav"`:

```json
"sectionOverview": "نظرة عامة",
"sectionFinance": "المالية",
"sectionPlanning": "التخطيط",
"sectionSettings": "الإعدادات"
```

- [ ] Run `pnpm dev`. Verify: tagline appears under logo in Arabic. Section labels visible. Active nav item has green text + start-side border. Debts and Budgets are dimmed and unclickable.

- [ ] Commit:

```bash
git add frontend/src/components/layout/sidebar.tsx \
        frontend/messages/en.json \
        frontend/messages/ar.json
git commit -m "feat(sidebar): section grouping, active border, tagline, disabled planning items"
```

---

### Task K-4: Extend `Transfer` type + update transfers page

**Files:**
- Modify: `frontend/src/hooks/use-transfers.ts`
- Modify: `frontend/src/app/(app)/transfers/page.tsx`

- [ ] First, verify the backend returns `type` and `institution` for transfer accounts:

```bash
curl -s "http://localhost:8000/api/v1/transfers?page=1" \
  -H "Authorization: Bearer <token>" | python3 -m json.tool | grep -A5 "from_account"
```

If `type` and `institution` are present, proceed. If not, add them to the backend transfer schema (`backend/app/schemas/transfer.py`) by adding `type: str` and `institution: str | None` to the account sub-schema, and re-query from the join in `transfer_service.py`.

- [ ] Update `Transfer` interface in `use-transfers.ts`:

```typescript
export interface Transfer {
  transfer_id: string;
  date: string;
  description: string;
  from_account: { id: number; name: string; currency: string; type: string; institution: string | null };
  to_account: { id: number; name: string; currency: string; type: string; institution: string | null };
  source_amount: number;
  target_amount: number;
  fx_rate_minor_units: number | null;
}
```

- [ ] Commit:

```bash
git add frontend/src/hooks/use-transfers.ts
git commit -m "feat(transfers): add type and institution to Transfer account objects"
```

---

### Task K-5: Create `AccountMiniCard` component

**Files:**
- Create: `frontend/src/components/transfers/account-mini-card.tsx`

- [ ] Create the component:

```typescript
import { typeIcons, typeColors } from "@/components/accounts/account-card";

interface AccountMiniCardProps {
  id: number;
  name: string;
  institution: string | null;
  type: string;
  currency: string;
}

export function AccountMiniCard({ id, name, institution, type, currency }: AccountMiniCardProps) {
  const Icon = typeIcons[type] || typeIcons["bank_account"];
  const colorClass = typeColors[type] || "bg-muted text-muted-foreground";

  return (
    <div className="flex items-center gap-2">
      <div className={`rounded-md p-1.5 ${colorClass}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        {institution && (
          <p className="text-xs text-muted-foreground truncate">{institution}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] Commit:

```bash
git add frontend/src/components/transfers/account-mini-card.tsx
git commit -m "feat(transfers): add AccountMiniCard component"
```

---

### Task K-6: Polish `TransfersPage`

**Files:**
- Modify: `frontend/src/app/(app)/transfers/page.tsx`

- [ ] Replace the `from_account` and `to_account` cells in the table with `AccountMiniCard`. Remove the center arrow column; replace with a compact `→` / `←` indicator inline. Colorize amounts: outgoing (source) is destructive/red, incoming (target) is positive/green.

Replace the transfer table body rows with:

```typescript
{(data?.data || []).map((transfer) => (
  <tr key={transfer.transfer_id} className="border-b hover:bg-accent/50 transition-colors">
    <td className="px-4 py-3 text-sm text-muted-foreground">
      {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(transfer.date))}
    </td>
    <td className="px-4 py-3">
      <AccountMiniCard {...transfer.from_account} />
    </td>
    <td className="px-4 py-3 text-center text-muted-foreground">→</td>
    <td className="px-4 py-3">
      <AccountMiniCard {...transfer.to_account} />
    </td>
    <td className="px-4 py-3 text-end">
      <MoneyDisplay amount={-transfer.source_amount} currency={transfer.from_account.currency} colorize showCurrency />
    </td>
    <td className="px-4 py-3">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => setDeleteId(transfer.transfer_id)}
        aria-label={t("common.delete")}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </td>
  </tr>
))}
```

Add `import { AccountMiniCard } from "@/components/transfers/account-mini-card";` at the top. Add `group` to the `<tr>` className.

- [ ] Commit:

```bash
git add frontend/src/app/(app)/transfers/page.tsx
git commit -m "feat(transfers): account mini cards, colorized amounts, hover delete"
```

---

### Task K-7: Create `StatCardPlaceholder` + rewrite `DashboardPage`

**Files:**
- Create: `frontend/src/components/dashboard/stat-card-placeholder.tsx`
- Modify: `frontend/src/app/(app)/dashboard/page.tsx`

- [ ] Create the `StatCardPlaceholder` component:

```typescript
import { type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StatCardPlaceholderProps {
  label: string;
  icon: LucideIcon;
  comingSoon: string;
}

export function StatCardPlaceholder({ label, icon: Icon, comingSoon }: StatCardPlaceholderProps) {
  return (
    <Card className="opacity-75">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground/50" />
      </CardHeader>
      <CardContent>
        <div className="h-7 w-24 rounded bg-muted animate-none" />
        <Badge variant="outline" className="mt-2 text-xs">{comingSoon}</Badge>
      </CardContent>
    </Card>
  );
}
```

- [ ] Rewrite `DashboardPage`:

```typescript
import { TrendingUp, ShoppingCart, HandCoins, Clock } from "lucide-react";
import { StatCardPlaceholder } from "@/components/dashboard/stat-card-placeholder";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-muted-foreground mb-6 text-sm">Charts and insights coming in Phase 4.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCardPlaceholder label="Net Worth" icon={TrendingUp} comingSoon="Coming in Phase 4" />
        <StatCardPlaceholder label="Monthly Spending" icon={ShoppingCart} comingSoon="Coming in Phase 4" />
        <StatCardPlaceholder label="Active Debts" icon={HandCoins} comingSoon="Coming in Phase 4" />
        <StatCardPlaceholder label="Upcoming (30d)" icon={Clock} comingSoon="Coming in Phase 4" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-xl border bg-muted/30 flex items-center justify-center h-56 text-muted-foreground text-sm"
          >
            Charts coming soon
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] Commit:

```bash
git add frontend/src/components/dashboard/ frontend/src/app/(app)/dashboard/page.tsx
git commit -m "feat(dashboard): structured placeholder with stat card skeletons"
```

---

### Task K-8: Final CI check + push

- [ ] Run full frontend CI:

```bash
cd frontend
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Expected output: no errors, build succeeds.

- [ ] If any TypeScript errors appear, fix them (usually missing `type` imports or wrong prop names).

- [ ] Push the branch and open PR:

```bash
git push -u origin feature/1.5K-transfers-dashboard-sidebar
# Open PR on GitHub targeting main
```

---

## UAT Checklists

### Unit 1.5I UAT

- [ ] `/accounts` — green gradient net worth bar appears above account grid
- [ ] Net worth bar shows total, account count, and currency count
- [ ] Credit card account card shows utilization bar with correct color (green/amber/red)
- [ ] Credit card account card shows "Payment due in X days" badge with correct color
- [ ] Hovering any account card reveals pencil + trash icons in top-end corner
- [ ] Clicking pencil opens edit dialog pre-filled; saving updates the card
- [ ] Credit card edit dialog shows credit limit + billing/due day fields
- [ ] Clicking trash opens confirmation dialog; confirming removes the card
- [ ] Transaction rows in account detail show category icon (emoji)
- [ ] RTL layout correct on all modified pages
- [ ] `pnpm build` passes

### Unit 1.5J UAT

- [ ] `/transactions` filter bar has 7 controls: search, account, category, type, date-from, date-to, amount-min, amount-max
- [ ] Each filter updates results immediately on change
- [ ] "Reset" button appears when any filter is active; clicking it clears all
- [ ] Clicking "Manage" shows checkboxes on each row
- [ ] Selecting rows shows the BulkToolbar with count + Delete + Re-categorize
- [ ] Bulk delete removes selected transactions and shows toast
- [ ] Bulk re-categorize updates categories and shows toast
- [ ] "Cancel" exits bulk mode and deselects all
- [ ] Account pills appear on each row in global transactions view, colored by account type
- [ ] Clicking an account pill navigates to the account detail page
- [ ] Edit/delete buttons only visible on row hover (not always shown)
- [ ] RTL layout correct
- [ ] `pnpm build` passes

### Unit 1.5K UAT

- [ ] Sidebar logo is visibly larger than before (160×40 vs 140×32)
- [ ] Mobile navbar logo icon is visibly larger (36×36 vs 28×28)
- [ ] "فلوسك متظبطة بالقرش" tagline appears under the logo in the sidebar in Arabic (even in English mode)
- [ ] Sidebar shows section labels: Overview, Finance, Planning, Settings
- [ ] Debts and Budgets items are dimmed and unclickable
- [ ] Active nav item has primary-colored text + start-side border accent
- [ ] No "The Financial Atelier" text anywhere in the app
- [ ] Transfer rows show account mini cards (icon + name + institution)
- [ ] Transfer amounts: outgoing shown in red
- [ ] Transfer delete button only visible on row hover
- [ ] Dashboard shows 4 stat card placeholders with "Coming in Phase 4" badge
- [ ] Dashboard shows 2 chart placeholder areas
- [ ] RTL layout correct
- [ ] `pnpm build` passes
