# Wave 2b: Core App Pages Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the visual presentation of 5 app pages (Dashboard, Accounts, Account Detail, Transactions, Transfers) to match their Stitch design references while preserving all existing logic.

**Architecture:** Each page migrates to the Wave 1 shared components — `PageHeader`, `StatCard`, `SummaryBar`, `FilterBar`, `DataTable`, `FormSheet` — as their structural backbone. Logic layers (TanStack Query hooks, form handlers, filter state) are preserved unchanged. Only markup and styling changes.

**Stitch screens (Masareef v2 project `512491289865585341`):**
- 05-dashboard: `7d23140e94ef4ff6abd9cf63bc89b8a1`
- 06-accounts: `a07aa13e99cc41a288be41d0847b0fc3`
- 07-account-detail: `d0908a8ee1f14f9fa7d4d36017a284e1`
- 07b-transactions-global: `7de800603d8f4631abd678fdf89f303d`

**Tech Stack:** Next.js 16, React, TypeScript, Tailwind CSS v4, shadcn/ui base-nova, TanStack Query, next-intl

**Branch:** `feature/1.75-app-pages-redesign` (cut from `main` after Wave 2a merges)

**CSS rules:** Use logical properties exclusively — `ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`, `text-start`, `text-end`. Never `pl-`, `pr-`, `ml-`, `mr-`, `left-`, `right-`, `text-left`, `text-right`.

---

## File Map

| File | Action | Reason |
|------|--------|--------|
| `messages/en.json` | Modify | Add dashboard section + account-detail keys |
| `messages/ar.json` | Modify | Same keys in Arabic |
| `src/components/transactions/transaction-form.tsx` | Modify | Migrate to FormSheet, remove internal SheetTrigger |
| `src/components/transfers/transfer-form.tsx` | Modify | Migrate to FormSheet, remove Dialog/DialogTrigger |
| `src/components/dashboard/recent-transactions.tsx` | Create | Mini recent-transactions widget for dashboard |
| `src/app/(app)/dashboard/page.tsx` | Modify | Real StatCards, recent transactions, PageHeader |
| `src/app/(app)/accounts/page.tsx` | Modify | PageHeader, SummaryBar, controlled TransferForm |
| `src/components/accounts/account-balance-header.tsx` | Modify | Stats row layout, type badge, action buttons |
| `src/components/transactions/transaction-filters.tsx` | Modify | Add `hideAccountFilter` prop |
| `src/app/(app)/accounts/[id]/page.tsx` | Modify | PageHeader, FilterBar, updated account header |
| `src/app/(app)/transactions/page.tsx` | Modify | PageHeader, SummaryBar, FilterBar wrapper |
| `src/app/(app)/transfers/page.tsx` | Modify | PageHeader, DataTable, FormSheet for form |
| `src/components/dashboard/stat-card-placeholder.tsx` | Delete | Replaced by real StatCard |
| `src/components/accounts/net-worth-bar.tsx` | Delete | Replaced by SummaryBar in accounts page |

---

## Task 1: i18n additions (en.json + ar.json)

**Files:**
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

- [ ] **Step 1: Add dashboard keys to en.json**

In `frontend/messages/en.json`, replace the `"dashboard"` block:

```json
"dashboard": {
  "title": "Dashboard",
  "subtitle": "Your financial overview",
  "netWorth": "Net Worth",
  "monthlySpending": "Monthly Spending",
  "activeDebts": "Active Debts",
  "upcoming": "Upcoming (30d)",
  "recentTransactions": "Recent Transactions",
  "viewAll": "View all",
  "noRecentTransactions": "No recent transactions yet.",
  "comingSoonPhase2": "Coming in Phase 2",
  "comingSoonPhase3": "Coming in Phase 3",
  "comingSoonPhase4": "Coming in Phase 4",
  "chartsComingSoon": "Charts coming in Phase 4"
}
```

Also add `"netFlow"` to the **`"transactions"`** section (used by the transactions page SummaryBar):

```json
"netFlow": "Net Flow"
```

(Add this alongside existing keys in the `"transactions"` block.)

- [ ] **Step 2: Add account-detail keys to accounts section in en.json**

In `frontend/messages/en.json`, add to the `"accounts"` block (after `"name": "Account Name"`):

```json
"incomeThisMonth": "Income this month",
"expensesThisMonth": "Expenses this month",
"avgTransaction": "Avg. Transaction",
"accountStatements": "Account Statements",
"transferFunds": "Transfer Funds",
"comingSoon": "Coming soon",
"totalAccounts": "Accounts"
```

- [ ] **Step 3: Add same keys to ar.json dashboard block**

In `frontend/messages/ar.json`, replace the `"dashboard"` block:

```json
"dashboard": {
  "title": "لوحة التحكم",
  "subtitle": "نظرة عامة على أموالك",
  "netWorth": "صافي الثروة",
  "monthlySpending": "الإنفاق الشهري",
  "activeDebts": "الديون النشطة",
  "upcoming": "القادم (30 يوم)",
  "recentTransactions": "آخر المعاملات",
  "viewAll": "عرض الكل",
  "noRecentTransactions": "لا توجد معاملات حديثة بعد.",
  "comingSoonPhase2": "قادم في المرحلة 2",
  "comingSoonPhase3": "قادم في المرحلة 3",
  "comingSoonPhase4": "قادم في المرحلة 4",
  "chartsComingSoon": "الرسوم البيانية قادمة في المرحلة 4"
}
```

Also add `"netFlow"` to the ar.json **`"transactions"`** section:

```json
"netFlow": "صافي التدفق"
```

- [ ] **Step 4: Add account-detail keys to ar.json accounts section**

Add to `"accounts"` block in `ar.json`:

```json
"incomeThisMonth": "الدخل هذا الشهر",
"expensesThisMonth": "المصروفات هذا الشهر",
"avgTransaction": "متوسط المعاملة",
"accountStatements": "كشف الحساب",
"transferFunds": "تحويل الأموال",
"comingSoon": "قريباً",
"totalAccounts": "الحسابات"
```

- [ ] **Step 5: Verify TypeScript types**

```bash
cd frontend && pnpm exec tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add messages/
git commit -m "feat(1.75): add i18n keys for Wave 2b page redesigns"
```

---

## Task 2: Migrate TransactionForm to FormSheet

**Files:**
- Modify: `frontend/src/components/transactions/transaction-form.tsx`

The current form has an internal `SheetTrigger` and can operate uncontrolled. Since all usage sites (AccountDetailPage, TransactionsPage FAB) already pass `open`/`onOpenChange`, we simplify to always-controlled and swap `Sheet`/`SheetContent` for `FormSheet`.

- [ ] **Step 1: Rewrite transaction-form.tsx**

Replace the entire file content:

```tsx
"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSheet } from "@/components/shared/form-sheet";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { CURRENCIES, parseMajorToMinor } from "@/lib/money";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TransactionFormProps {
  accountId: number;
  accountCurrency?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionForm({
  accountId,
  accountCurrency = "EGP",
  open,
  onOpenChange,
}: TransactionFormProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"debit" | "credit">("debit");
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");

  const createTx = useCreateTransaction();
  const { data: categoriesData } = useCategories(type === "debit" ? "expense" : "income");
  const selectedCategory = categoriesData?.data?.find((c) => c.id === categoryId);

  const exponent = CURRENCIES[accountCurrency]?.exponent ?? 2;
  const amountStep = (1 / Math.pow(10, exponent)).toFixed(exponent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountMinor = Math.abs(parseMajorToMinor(amount, exponent));
    if (amountMinor === 0) return;

    try {
      await createTx.mutateAsync({
        account_id: accountId,
        date,
        description,
        amount_minor: amountMinor,
        type,
        currency: accountCurrency,
        category_id: categoryId || undefined,
        notes: notes || undefined,
      });

      onOpenChange(false);
      setDescription("");
      setAmount("");
      setNotes("");
      setCategoryId("");
    } catch {
      // Error toast shown by useApiMutation.onError — keep form open for retry
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("transactions.newTransaction")}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={type === "debit" ? "default" : "outline"}
            className="flex-1"
            onClick={() => { setType("debit"); setCategoryId(""); }}
          >
            {t("transactions.expense")}
          </Button>
          <Button
            type="button"
            variant={type === "credit" ? "default" : "outline"}
            className="flex-1"
            onClick={() => { setType("credit"); setCategoryId(""); }}
          >
            {t("transactions.incomeType")}
          </Button>
        </div>

        <div className="space-y-2">
          <Label>{t("common.date")}</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label>{t("common.description")}</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("transactions.descriptionPlaceholder")}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>{t("transactions.category")}</Label>
          <Select
            value={categoryId === "" ? "__uncategorized__" : String(categoryId)}
            onValueChange={(val) => setCategoryId(val === "__uncategorized__" ? "" : Number(val))}
          >
            <SelectTrigger className="w-full">
              {selectedCategory ? (
                <span className="flex items-center gap-2">
                  {selectedCategory.icon && <span>{selectedCategory.icon}</span>}
                  {locale === "ar" && selectedCategory.name_ar
                    ? selectedCategory.name_ar
                    : selectedCategory.name_en}
                </span>
              ) : (
                <SelectValue placeholder={t("transactions.uncategorized")} />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__uncategorized__">
                {t("transactions.uncategorized")}
              </SelectItem>
              {(categoriesData?.data || []).map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  {cat.icon && (
                    <span className="me-2 text-muted-foreground">{cat.icon}</span>
                  )}
                  {locale === "ar" && cat.name_ar ? cat.name_ar : cat.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("common.amount")} ({accountCurrency})</Label>
          <Input
            type="number"
            step={amountStep}
            min={amountStep}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>{t("transactions.notes")}</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <Button type="submit" className="w-full" disabled={createTx.isPending}>
          {createTx.isPending ? t("common.loading") : t("common.save")}
        </Button>
      </form>
    </FormSheet>
  );
}
```

- [ ] **Step 2: Verify tsc + lint**

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm lint
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/transactions/transaction-form.tsx
git commit -m "refactor(1.75): migrate TransactionForm to FormSheet, headless-only"
```

---

## Task 3: Migrate TransferForm to FormSheet

**Files:**
- Modify: `frontend/src/components/transfers/transfer-form.tsx`
- Modify: `frontend/src/app/(app)/accounts/page.tsx` (caller update)

The `TransferForm` currently uses `Dialog`/`DialogTrigger`. The accounts page uses it uncontrolled (it renders its own trigger). After this task, `TransferForm` is always controlled and the caller provides the trigger button.

- [ ] **Step 1: Rewrite transfer-form.tsx**

Replace the entire file content:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSheet } from "@/components/shared/form-sheet";
import { useAccounts } from "@/hooks/use-accounts";
import { useCreateTransfer } from "@/hooks/use-transfers";
import { CURRENCIES, parseMajorToMinor } from "@/lib/money";

interface TransferFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferForm({ open, onOpenChange }: TransferFormProps) {
  const t = useTranslations();
  const { data: accountsData } = useAccounts();
  const createTransfer = useCreateTransfer();

  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [fxRate, setFxRate] = useState("");

  const accounts = accountsData?.data || [];
  const fromAccount = accounts.find((a) => a.id === Number(fromId));
  const toAccount = accounts.find((a) => a.id === Number(toId));
  const isCrossCurrency = fromAccount && toAccount && fromAccount.currency !== toAccount.currency;

  const fromExponent = CURRENCIES[fromAccount?.currency || "EGP"]?.exponent ?? 2;
  const amountStep = (1 / Math.pow(10, fromExponent)).toFixed(fromExponent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountMinor = parseMajorToMinor(amount, fromExponent);

    await createTransfer.mutateAsync({
      from_account_id: Number(fromId),
      to_account_id: Number(toId),
      amount_minor: amountMinor,
      date,
      description: description || undefined,
      fx_rate_minor_units: isCrossCurrency && fxRate
        ? parseMajorToMinor(fxRate, 4)
        : undefined,
    });

    onOpenChange(false);
    setFromId("");
    setToId("");
    setAmount("");
    setDescription("");
    setFxRate("");
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("transfers.transferBetween")}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>{t("transfers.fromAccount")}</Label>
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">{t("transfers.selectAccount")}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>{t("transfers.toAccount")}</Label>
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">{t("transfers.selectAccount")}</option>
            {accounts.filter((a) => a.id !== Number(fromId)).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>{t("common.amount")} ({fromAccount?.currency || ""})</Label>
          <Input
            type="number"
            step={amountStep}
            min={amountStep}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        {isCrossCurrency && (
          <div className="space-y-2">
            <Label>
              {t("transfers.exchangeRate", {
                from: fromAccount?.currency,
                to: toAccount?.currency,
              })}
            </Label>
            <Input
              type="number"
              step="0.0001"
              value={fxRate}
              onChange={(e) => setFxRate(e.target.value)}
              placeholder="e.g., 0.0199"
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>{t("common.date")}</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label>{t("common.description")}</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("transfers.descriptionPlaceholder")}
          />
        </div>

        <Button type="submit" className="w-full" disabled={createTransfer.isPending}>
          {createTransfer.isPending ? t("common.loading") : t("transfers.transfer")}
        </Button>
      </form>
    </FormSheet>
  );
}
```

- [ ] **Step 2: Update AccountsPage to manage transfer form state**

In `frontend/src/app/(app)/accounts/page.tsx`, the `TransferForm` was used as `<TransferForm />` (uncontrolled). Update it:

Replace:
```tsx
import { TransferForm } from "@/components/transfers/transfer-form";
```

The `useState` import is already there. Add `transferOpen` state and update the JSX:

```tsx
// Add to the existing useState imports area:
const [transferOpen, setTransferOpen] = useState(false);

// In JSX — replace <TransferForm /> with:
<Button
  size="sm"
  variant="outline"
  onClick={() => setTransferOpen(true)}
>
  <ArrowLeftRight className="h-4 w-4 me-1" />
  {t("transfers.newTransfer")}
</Button>
<TransferForm open={transferOpen} onOpenChange={setTransferOpen} />
```

Add `ArrowLeftRight` to the lucide import at the top:
```tsx
import { Wallet, ArrowLeftRight } from "lucide-react";
```

Also add the missing `t` import for `"transfers"` namespace — use `useTranslations()` (already imported) but add a `tTransfers` reference:
```tsx
const tTransfers = useTranslations("transfers");
```

Wait, looking at the current AccountsPage more carefully:
```tsx
const t = useTranslations("accounts");
const tEmpty = useTranslations("emptyStates");
```

Add a third:
```tsx
const tTransfers = useTranslations("transfers");
```

And use `tTransfers("newTransfer")` in the button.

Full updated file content for `frontend/src/app/(app)/accounts/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Wallet, ArrowLeftRight } from "lucide-react";
import { useAccounts } from "@/hooks/use-accounts";
import { AccountGrid } from "@/components/accounts/account-grid";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";
import { TransferForm } from "@/components/transfers/transfer-form";
import { AccountGridSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { NetWorthBar } from "@/components/accounts/net-worth-bar";
import { Button } from "@/components/ui/button";

export default function AccountsPage() {
  const t = useTranslations("accounts");
  const tEmpty = useTranslations("emptyStates");
  const tTransfers = useTranslations("transfers");
  const { data, isLoading, error } = useAccounts();
  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTransferOpen(true)}
          >
            <ArrowLeftRight className="h-4 w-4 me-1" />
            {tTransfers("newTransfer")}
          </Button>
          <CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} />
        </div>
      </div>

      <NetWorthBar />

      {isLoading && <AccountGridSkeleton />}
      {error && <p className="text-destructive">{t("error")}: {error.message}</p>}
      {data?.data && data.data.length > 0 && <AccountGrid accounts={data.data} />}
      {!isLoading && data?.data?.length === 0 && (
        <EmptyState
          icon={Wallet}
          title={tEmpty("accounts.title")}
          description={tEmpty("accounts.description")}
          action={{ label: tEmpty("accounts.action"), onClick: () => setCreateOpen(true) }}
        />
      )}

      <TransferForm open={transferOpen} onOpenChange={setTransferOpen} />
    </div>
  );
}
```

- [ ] **Step 3: Verify tsc + lint**

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm lint
```

Expected: 0 errors. If TypeScript reports an error about `TransferForm` no longer accepting an uncontrolled signature, the fix is already in the new `TransferForm` interface above.

- [ ] **Step 4: Commit**

```bash
git add src/components/transfers/transfer-form.tsx src/app/(app)/accounts/page.tsx
git commit -m "refactor(1.75): migrate TransferForm to FormSheet, headless-only"
```

---

## Task 4: Rebuild Dashboard page

**Files:**
- Create: `frontend/src/components/dashboard/recent-transactions.tsx`
- Modify: `frontend/src/app/(app)/dashboard/page.tsx`

The current dashboard uses `StatCardPlaceholder` and has no real data. The new dashboard shows: `PageHeader`, 4 `StatCard` widgets (1 real net worth, 3 coming-soon), a recent transactions list, and chart placeholders.

- [ ] **Step 1: Create recent-transactions.tsx**

Create `frontend/src/components/dashboard/recent-transactions.tsx`:

```tsx
"use client";

import { useTranslations, useLocale } from "next-intl";
import { useTransactions } from "@/hooks/use-transactions";
import { MoneyDisplay } from "@/components/shared/money-display";

export function RecentTransactions() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { data, isLoading } = useTransactions({ page: 1, page_size: 5, sort: "-date" });

  if (isLoading) {
    return (
      <div className="rounded-lg border overflow-hidden animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
            <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-36 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  const transactions = data?.data ?? [];

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        {t("noRecentTransactions")}
      </p>
    );
  }

  const dateFormatter = new Intl.DateTimeFormat(
    locale === "ar" ? "ar-EG" : "en-US",
    { dateStyle: "medium" }
  );

  return (
    <div className="rounded-lg border overflow-hidden">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm">
            {tx.category?.icon ?? "💳"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{tx.description}</p>
            <p className="text-xs text-muted-foreground">
              {dateFormatter.format(new Date(tx.date))}
            </p>
          </div>
          <MoneyDisplay
            amount={tx.amount_minor}
            currency={tx.currency}
            colorize
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite dashboard/page.tsx**

Replace the entire content of `frontend/src/app/(app)/dashboard/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { TrendingUp, ShoppingCart, HandCoins, Clock, BarChart3 } from "lucide-react";
import { useNetWorth } from "@/hooks/use-accounts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { formatAmount, formatAmountAr } from "@/lib/money";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { data: netWorthData, isLoading: netWorthLoading } = useNetWorth();

  const nw = netWorthData?.data;
  const netWorthValue = netWorthLoading
    ? "..."
    : nw
    ? locale === "ar"
      ? formatAmountAr(nw.total_base_minor, nw.base_currency)
      : formatAmount(nw.total_base_minor, nw.base_currency)
    : "—";

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label={t("netWorth")}
          value={netWorthValue}
        />
        <StatCard
          icon={ShoppingCart}
          label={t("monthlySpending")}
          value="—"
          trend={{ direction: "flat", text: t("comingSoonPhase2") }}
        />
        <StatCard
          icon={HandCoins}
          label={t("activeDebts")}
          value="—"
          trend={{ direction: "flat", text: t("comingSoonPhase3") }}
        />
        <StatCard
          icon={Clock}
          label={t("upcoming")}
          value="—"
          trend={{ direction: "flat", text: t("comingSoonPhase3") }}
        />
      </div>

      {/* Recent transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">{t("recentTransactions")}</h2>
          <Link
            href="/transactions"
            className="text-sm text-primary hover:underline"
          >
            {t("viewAll")}
          </Link>
        </div>
        <RecentTransactions />
      </div>

      {/* Chart placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-xl border bg-muted/30 flex flex-col items-center justify-center h-56 gap-3"
          >
            <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("chartsComingSoon")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify tsc + lint**

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm lint
```

Expected: 0 errors.

- [ ] **Step 4: Delete stat-card-placeholder.tsx**

```bash
rm frontend/src/components/dashboard/stat-card-placeholder.tsx
```

- [ ] **Step 5: Verify build after deletion**

```bash
cd frontend && pnpm exec tsc --noEmit
```

Expected: 0 errors (the file was only imported by the old dashboard/page.tsx which is already replaced).

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/ src/app/(app)/dashboard/
git commit -m "feat(1.75): rebuild dashboard — StatCards, recent transactions, PageHeader"
```

---

## Task 5: Rebuild Accounts page

**Files:**
- Modify: `frontend/src/app/(app)/accounts/page.tsx`
- Modify: `frontend/src/components/accounts/account-balance-header.tsx` (the header used by Account Detail — hold this for Task 6)

The accounts page already has most of the right structure. Key changes:
1. Replace the raw `<h1>` + `<div>` header with `PageHeader`
2. Replace `NetWorthBar` with `SummaryBar` — the Stitch design shows a simple multi-metric card, and using the shared `SummaryBar` ensures consistency across all pages

Note: Task 3 already makes a partial update to this file (changing `TransferForm` to controlled). Task 5 performs a **full rewrite** that incorporates those Task 3 changes plus adds `PageHeader` and `SummaryBar`. Execute Task 3 first, then Task 5 — the final file from Task 5 is the desired state.

- [ ] **Step 1: Update accounts/page.tsx to use PageHeader + SummaryBar**

Replace the entire content of `frontend/src/app/(app)/accounts/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Wallet, ArrowLeftRight, Plus } from "lucide-react";
import { useAccounts, useNetWorth } from "@/hooks/use-accounts";
import { AccountGrid } from "@/components/accounts/account-grid";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";
import { TransferForm } from "@/components/transfers/transfer-form";
import { AccountGridSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryBar } from "@/components/shared/summary-bar";
import { Button } from "@/components/ui/button";
import { formatAmount, formatAmountAr } from "@/lib/money";

export default function AccountsPage() {
  const t = useTranslations("accounts");
  const tEmpty = useTranslations("emptyStates");
  const tTransfers = useTranslations("transfers");
  const locale = useLocale();

  const { data, isLoading, error } = useAccounts();
  const { data: netWorthData } = useNetWorth();

  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const nw = netWorthData?.data;
  const netWorthValue = nw
    ? locale === "ar"
      ? formatAmountAr(nw.total_base_minor, nw.base_currency)
      : formatAmount(nw.total_base_minor, nw.base_currency)
    : "—";

  const summaryItems = [
    { label: t("netWorth"), value: netWorthValue },
    {
      label: t("totalAccounts"),
      value: nw ? String(nw.account_count) : "—",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTransferOpen(true)}
            >
              <ArrowLeftRight className="h-4 w-4 me-1" />
              {tTransfers("newTransfer")}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 me-1" />
              {t("addAccount")}
            </Button>
          </>
        }
      />

      <SummaryBar items={summaryItems} />

      {isLoading && <AccountGridSkeleton />}
      {error && (
        <p className="text-destructive">
          {t("error")}: {error.message}
        </p>
      )}
      {data?.data && data.data.length > 0 && (
        <AccountGrid accounts={data.data} />
      )}
      {!isLoading && data?.data?.length === 0 && (
        <EmptyState
          icon={Wallet}
          title={tEmpty("accounts.title")}
          description={tEmpty("accounts.description")}
          action={{ label: tEmpty("accounts.action"), onClick: () => setCreateOpen(true) }}
        />
      )}

      <CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} />
      <TransferForm open={transferOpen} onOpenChange={setTransferOpen} />
    </div>
  );
}
```

Note: `CreateAccountDialog` is now rendered separately (not as a trigger-containing component). Check how `CreateAccountDialog` works to make sure it accepts `open`/`onOpenChange`:

```bash
cat frontend/src/components/accounts/create-account-dialog.tsx | head -20
```

If `CreateAccountDialog` already accepts `open`/`onOpenChange`, the above is correct. If it has an internal trigger, the `<Button>` + controlled pattern above works.

- [ ] **Step 2: Verify tsc + lint**

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm lint
```

Expected: 0 errors.

- [ ] **Step 3: Delete net-worth-bar.tsx**

```bash
rm frontend/src/components/accounts/net-worth-bar.tsx
```

- [ ] **Step 4: Verify tsc after deletion**

```bash
cd frontend && pnpm exec tsc --noEmit
```

If `net-worth-bar.tsx` is still imported anywhere, TypeScript will error. Fix: remove the import from any file that still references it. After Task 4 already removed it from accounts/page.tsx above, there should be no remaining references.

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/accounts/page.tsx src/components/accounts/
git commit -m "feat(1.75): rebuild accounts page — PageHeader, SummaryBar, net worth display"
```

---

## Task 6: Rebuild Account Detail page

**Files:**
- Modify: `frontend/src/components/accounts/account-balance-header.tsx`
- Modify: `frontend/src/components/transactions/transaction-filters.tsx`
- Modify: `frontend/src/app/(app)/accounts/[id]/page.tsx`

The Account Detail Stitch design (07-account-detail) shows: account name + type badge + institution, large balance, stats row (income this month, expenses this month, avg transaction — all "coming soon"), transfer + statements action buttons, then filter controls above the transaction list.

### Step A: Redesign AccountBalanceHeader

- [ ] **Step 1: Update account-balance-header.tsx**

Replace the entire file content:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { ArrowLeftRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/shared/money-display";
import { typeIcons, typeColors } from "@/components/accounts/account-card";
import { Wallet } from "lucide-react";
import type { Account } from "@/hooks/use-accounts";

const TYPE_LABEL_KEYS: Record<string, string> = {
  bank_account: "bankAccount",
  credit_card: "creditCard",
  cash_wallet: "cashWallet",
  digital_wallet: "digitalWallet",
  financing_app: "financingApp",
};

interface AccountBalanceHeaderProps {
  account: Account;
  onTransfer?: () => void;
}

export function AccountBalanceHeader({
  account,
  onTransfer,
}: AccountBalanceHeaderProps) {
  const t = useTranslations("accounts");
  const Icon = typeIcons[account.type] ?? Wallet;
  const iconColor = typeColors[account.type] ?? "bg-primary/10 text-primary";
  const typeLabel = t(TYPE_LABEL_KEYS[account.type] ?? "bankAccount");

  return (
    <Card className="p-6">
      {/* Top row: type + institution + balance */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`rounded-lg p-2 shrink-0 ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <Badge variant="secondary" className="mb-1">
              {typeLabel}
            </Badge>
            {account.institution && (
              <p className="text-sm text-muted-foreground">{account.institution}</p>
            )}
          </div>
        </div>
        <div className="sm:text-end">
          <p className="text-xs text-muted-foreground mb-1">{t("balance")}</p>
          <MoneyDisplay
            amount={account.displayed_balance_minor}
            currency={account.currency}
            size="lg"
            colorize
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mt-4">
        {onTransfer && (
          <Button size="sm" variant="outline" onClick={onTransfer}>
            <ArrowLeftRight className="h-4 w-4 me-1" />
            {t("transferFunds")}
          </Button>
        )}
        <Button size="sm" variant="outline" disabled title={t("comingSoon")}>
          {t("accountStatements")}
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
        <div>
          <p className="text-xs text-muted-foreground">{t("incomeThisMonth")}</p>
          <p className="text-sm font-medium text-muted-foreground">—</p>
          <p className="text-xs text-muted-foreground">{t("comingSoon")}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("expensesThisMonth")}</p>
          <p className="text-sm font-medium text-muted-foreground">—</p>
          <p className="text-xs text-muted-foreground">{t("comingSoon")}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("avgTransaction")}</p>
          <p className="text-sm font-medium text-muted-foreground">—</p>
          <p className="text-xs text-muted-foreground">{t("comingSoon")}</p>
        </div>
      </div>
    </Card>
  );
}
```

### Step B: Add hideAccountFilter to TransactionFilterBar

- [ ] **Step 2: Update transaction-filters.tsx to add hideAccountFilter prop**

In `frontend/src/components/transactions/transaction-filters.tsx`, change the interface and add the prop:

```tsx
interface TransactionFilterBarProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
  hideAccountFilter?: boolean;
}

export function TransactionFilterBar({
  filters,
  onChange,
  hideAccountFilter = false,
}: TransactionFilterBarProps) {
```

Then wrap the Account `<select>` block with a condition:

```tsx
{/* Account — hidden on account detail page */}
{!hideAccountFilter && (
  <select
    value={filters.account_id ?? ""}
    onChange={(e) =>
      onChange({
        ...filters,
        account_id: e.target.value ? Number(e.target.value) : undefined,
        page: 1,
      })
    }
    aria-label={t("transactions.allAccounts")}
    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
  >
    <option value="">{t("transactions.allAccounts")}</option>
    {(accountsData?.data || []).map((acc) => (
      <option key={acc.id} value={acc.id}>
        {acc.name}
      </option>
    ))}
  </select>
)}
```

Also wrap the `TransactionFilterBar` in a `FilterBar` container. Update the return statement to use `FilterBar`:

```tsx
import { FilterBar } from "@/components/shared/filter-bar";

// In return:
return (
  <FilterBar className="mb-4">
    {/* Search */}
    <Input ... />
    {/* Account — hidden on account detail page */}
    {!hideAccountFilter && ( ... )}
    {/* Category */}
    <select ... />
    {/* Type */}
    <select ... />
    {/* Date from */}
    <Input type="date" ... />
    {/* Date to */}
    <Input type="date" ... />
    {/* Amount min */}
    <Input type="number" placeholder={t("transactions.amountMin")} ... />
    {/* Amount max */}
    <Input type="number" placeholder={t("transactions.amountMax")} ... />
    {/* Reset */}
    {hasActiveFilters && ( ... )}
  </FilterBar>
);
```

The outer `<div className="flex flex-wrap gap-2 mb-4 items-end">` is replaced by `<FilterBar className="mb-4">`.

### Step C: Update Account Detail page

- [ ] **Step 3: Rewrite accounts/[id]/page.tsx**

Replace the entire content:

```tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Receipt, Plus } from "lucide-react";
import { useAccount } from "@/hooks/use-accounts";
import { useTransactions, type TransactionFilters } from "@/hooks/use-transactions";
import { AccountBalanceHeader } from "@/components/accounts/account-balance-header";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionFilterBar } from "@/components/transactions/transaction-filters";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransferForm } from "@/components/transfers/transfer-form";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export default function AccountDetailPage() {
  const t = useTranslations();
  const tEmpty = useTranslations("emptyStates");
  const params = useParams();
  const accountId = Number(params.id);

  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [txFilters, setTxFilters] = useState<TransactionFilters>({
    account_id: accountId,
    page: 1,
    page_size: 50,
    sort: "-date",
  });

  const { data: accountData, isLoading: accountLoading } = useAccount(accountId);
  const { data: txData, isLoading: txLoading } = useTransactions(txFilters);

  if (accountLoading) return <p>{t("common.loading")}</p>;
  if (!accountData?.data) return <p>{t("common.notFound")}</p>;

  const account = accountData.data;
  const isEmpty = !txLoading && (txData?.data?.length ?? 0) === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={account.name}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 me-1" />
            {t("transactions.addTransaction")}
          </Button>
        }
      />

      <AccountBalanceHeader
        account={account}
        onTransfer={() => setTransferOpen(true)}
      />

      <div>
        <h2 className="text-base font-semibold mb-3">
          {t("transactions.heading")}
        </h2>
        <TransactionFilterBar
          filters={txFilters}
          onChange={(f) => setTxFilters({ ...f, account_id: accountId })}
          hideAccountFilter
        />

        {txLoading ? (
          <p className="text-muted-foreground text-sm py-4">{t("common.loading")}</p>
        ) : isEmpty ? (
          <EmptyState
            icon={Receipt}
            title={tEmpty("accountTransactions.title")}
            description={tEmpty("accountTransactions.description")}
            action={{ label: tEmpty("accountTransactions.action"), onClick: () => setCreateOpen(true) }}
          />
        ) : (
          <TransactionTable
            transactions={txData?.data || []}
            total={txData?.meta?.total || 0}
            page={txFilters.page || 1}
            pageSize={txFilters.page_size || 50}
            onPageChange={(p) => setTxFilters({ ...txFilters, page: p })}
          />
        )}
      </div>

      <TransactionForm
        accountId={account.id}
        accountCurrency={account.currency}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <TransferForm open={transferOpen} onOpenChange={setTransferOpen} />
    </div>
  );
}
```

- [ ] **Step 4: Verify tsc + lint**

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm lint
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/accounts/account-balance-header.tsx \
        src/components/transactions/transaction-filters.tsx \
        src/app/(app)/accounts/
git commit -m "feat(1.75): rebuild account detail — stats header, FilterBar, PageHeader"
```

---

## Task 7: Rebuild Transactions page

**Files:**
- Modify: `frontend/src/app/(app)/transactions/page.tsx`

Key changes: `PageHeader` replaces the raw `h1` + manage button; `SummaryBar` shows page-level income/expense/net stats; `TransactionFilterBar` now wraps itself in `FilterBar` (done in Task 6); the FAB is already in place.

- [ ] **Step 1: Rewrite transactions/page.tsx**

Replace the entire content of `frontend/src/app/(app)/transactions/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Plus, Receipt, Search } from "lucide-react";
import { useTransactions, type TransactionFilters } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionFilterBar } from "@/components/transactions/transaction-filters";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { BulkToolbar } from "@/components/transactions/bulk-toolbar";
import {
  TransactionTableSkeleton,
  FilterBarSkeleton,
} from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryBar } from "@/components/shared/summary-bar";
import { Button } from "@/components/ui/button";
import { formatAmount, formatAmountAr } from "@/lib/money";
import type { Account } from "@/hooks/use-accounts";

function hasActiveFilters(filters: TransactionFilters): boolean {
  return !!(
    filters.q ||
    filters.type ||
    filters.category_id ||
    filters.account_id ||
    filters.date_from ||
    filters.date_to ||
    filters.amount_min != null ||
    filters.amount_max != null
  );
}

export default function TransactionsPage() {
  const router = useRouter();
  const t = useTranslations();
  const tEmpty = useTranslations("emptyStates");
  const locale = useLocale();

  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    page_size: 50,
    sort: "-date",
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data, isLoading } = useTransactions(filters);
  const { data: accountsData } = useAccounts();
  const firstAccountId = accountsData?.data?.[0]?.id;
  const isEmpty = !isLoading && (data?.data?.length ?? 0) === 0;
  const filtersActive = hasActiveFilters(filters);

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

  // Page-level summary stats (current page data only)
  const visibleTxs = data?.data ?? [];
  const firstCurrency = visibleTxs[0]?.currency ?? "EGP";
  const pageIncome = visibleTxs
    .filter((tx) => tx.type === "credit")
    .reduce((sum, tx) => sum + tx.amount_minor, 0);
  const pageExpenses = visibleTxs
    .filter((tx) => tx.type === "debit")
    .reduce((sum, tx) => sum + Math.abs(tx.amount_minor), 0);
  const pageNet = pageIncome - pageExpenses;

  const fmt = (amount: number) =>
    locale === "ar"
      ? formatAmountAr(amount, firstCurrency)
      : formatAmount(amount, firstCurrency);

  const summaryItems =
    visibleTxs.length > 0
      ? [
          {
            label: t("transactions.income"),
            value: fmt(pageIncome),
            colorClass: "text-primary",
          },
          {
            label: t("transactions.expenses"),
            value: fmt(pageExpenses),
            colorClass: "text-destructive",
          },
          {
            label: t("transactions.netFlow"),
            value: fmt(pageNet),
            colorClass:
              pageNet >= 0 ? "text-primary" : "text-destructive",
          },
        ]
      : [];

  return (
    <div>
      <div className="mb-6">
        <PageHeader
          title={t("nav.transactions")}
          actions={
            <Button
              variant={bulkMode ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                if (bulkMode) exitBulkMode();
                else setBulkMode(true);
              }}
            >
              {bulkMode ? t("transactions.cancel") : t("transactions.manage")}
            </Button>
          }
        />
      </div>

      {isLoading ? (
        <>
          <FilterBarSkeleton />
          <TransactionTableSkeleton />
        </>
      ) : (
        <>
          <TransactionFilterBar filters={filters} onChange={setFilters} />

          {summaryItems.length > 0 && (
            <SummaryBar items={summaryItems} className="mt-4" />
          )}

          {bulkMode && selectedIds.size > 0 && (
            <BulkToolbar selectedIds={[...selectedIds]} onCancel={exitBulkMode} />
          )}

          {isEmpty ? (
            filtersActive ? (
              <EmptyState
                icon={Search}
                title={tEmpty("searchResults.title")}
                description={tEmpty("searchResults.description")}
              />
            ) : (
              <EmptyState
                icon={Receipt}
                title={tEmpty("transactions.title")}
                description={tEmpty("transactions.description")}
                action={{
                  label: tEmpty("transactions.action"),
                  onClick: () => {
                    if (firstAccountId !== undefined) {
                      setCreateOpen(true);
                    } else {
                      router.push("/accounts");
                    }
                  },
                }}
              />
            )
          ) : (
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
          )}
        </>
      )}

      {firstAccountId !== undefined && (
        <>
          <button
            onClick={() => setCreateOpen(true)}
            aria-label={t("transactions.addTransaction")}
            className="fixed bottom-6 end-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg hover:shadow-xl active:scale-95 transition-all"
          >
            <Plus className="h-6 w-6" />
          </button>
          <TransactionForm
            accountId={firstAccountId}
            open={createOpen}
            onOpenChange={setCreateOpen}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify tsc + lint**

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm lint
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/transactions/page.tsx
git commit -m "feat(1.75): rebuild transactions page — PageHeader, SummaryBar, FilterBar"
```

---

## Task 8: Rebuild Transfers page

**Files:**
- Modify: `frontend/src/app/(app)/transfers/page.tsx`

Key changes: `PageHeader` with action button, `DataTable` replaces the raw `<table>`, `TransferForm` is already migrated to `FormSheet` (Task 3).

- [ ] **Step 1: Rewrite transfers/page.tsx**

Replace the entire content:

```tsx
"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeftRight, Trash2, Plus } from "lucide-react";
import { useTransfers, useDeleteTransfer } from "@/hooks/use-transfers";
import { TransferForm } from "@/components/transfers/transfer-form";
import { AccountMiniCard } from "@/components/transfers/account-mini-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { TransactionTableSkeleton } from "@/components/shared/skeletons";

type Transfer = {
  transfer_id: string;
  date: string;
  from_account: { id: number; name: string; currency: string; type: string } | null;
  to_account: { id: number; name: string; currency: string; type: string } | null;
  source_amount: number;
};

export default function TransfersPage() {
  const t = useTranslations();
  const tEmpty = useTranslations("emptyStates");
  const locale = useLocale();

  const [page] = useState(1);
  const { data, isLoading } = useTransfers(page);
  const deleteTransfer = useDeleteTransfer();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const transfers = (data?.data || []) as Transfer[];
  const isEmpty = !isLoading && transfers.length === 0;

  const dateFormatter = new Intl.DateTimeFormat(
    locale === "ar" ? "ar-EG" : "en-US",
    { dateStyle: "medium" }
  );

  const columns = [
    {
      key: "date",
      header: t("transfers.date"),
      render: (row: Transfer) => (
        <span className="text-sm text-muted-foreground">
          {dateFormatter.format(new Date(row.date))}
        </span>
      ),
    },
    {
      key: "from",
      header: t("transfers.from"),
      render: (row: Transfer) =>
        row.from_account ? (
          <AccountMiniCard {...row.from_account} />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "arrow",
      header: "",
      className: "w-8 text-center text-muted-foreground",
      render: () => "→",
    },
    {
      key: "to",
      header: t("transfers.to"),
      render: (row: Transfer) =>
        row.to_account ? (
          <AccountMiniCard {...row.to_account} />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "amount",
      header: t("transfers.amount"),
      className: "text-end",
      render: (row: Transfer) => (
        <MoneyDisplay
          amount={-row.source_amount}
          currency={row.from_account?.currency ?? "EGP"}
          colorize
          showCurrency
        />
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-16",
      render: (row: Transfer) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteId(row.transfer_id);
          }}
          aria-label={t("common.delete")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.transfers")}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 me-1" />
            {t("transfers.newTransfer")}
          </Button>
        }
      />

      {isLoading ? (
        <TransactionTableSkeleton />
      ) : isEmpty ? (
        <EmptyState
          icon={ArrowLeftRight}
          title={tEmpty("transfers.title")}
          description={tEmpty("transfers.description")}
          action={{ label: tEmpty("transfers.action"), onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={transfers}
          keyExtractor={(row) => row.transfer_id}
        />
      )}

      <TransferForm open={createOpen} onOpenChange={setCreateOpen} />

      <Dialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("transfers.deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("transfers.deleteConfirmDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteTransfer.isPending}
              onClick={async () => {
                if (deleteId) {
                  await deleteTransfer.mutateAsync(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              {deleteTransfer.isPending
                ? t("common.loading")
                : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Verify tsc + lint**

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm lint
```

Expected: 0 errors. If `DataTable` column types cause TypeScript issues, check that `Transfer` type matches the actual API response shape from `useTransfers`. The hook returns a list; cast as needed.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/transfers/page.tsx
git commit -m "feat(1.75): rebuild transfers page — PageHeader, DataTable, FormSheet"
```

---

## Task 9: Final cleanup and full build verification

**Files:**
- Delete: `frontend/src/components/dashboard/stat-card-placeholder.tsx` (done in Task 4, verify it's gone)
- Verify: `net-worth-bar.tsx` is deleted (done in Task 5)
- Run full CI checks

- [ ] **Step 1: Confirm no orphaned imports**

Search for any remaining references to deleted files:

```bash
cd frontend && grep -r "stat-card-placeholder\|net-worth-bar" src/ --include="*.tsx" --include="*.ts"
```

Expected: no output. If there are remaining imports, remove them.

- [ ] **Step 2: Run full build**

```bash
cd frontend && pnpm build
```

Expected: Build succeeds with 0 errors. Review any warnings about missing translation keys.

- [ ] **Step 3: Run lint**

```bash
cd frontend && pnpm lint
```

Expected: 0 errors.

- [ ] **Step 4: Run TypeScript check**

```bash
cd frontend && pnpm exec tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Final cleanup commit (if anything changed)**

```bash
git add -A
git commit -m "chore(1.75): Wave 2b cleanup — remove unused components, fix imports"
```

---

## Self-Review Checklist

Before raising the PR, verify each Wave 2b acceptance criterion:

- [ ] **Dashboard** matches Stitch 05-dashboard: PageHeader, 4 StatCards (1 real net worth, 3 coming-soon), recent transactions list, chart placeholders
- [ ] **Accounts** matches Stitch 06-accounts: PageHeader, SummaryBar with net worth + count, grouped AccountGrid, controlled TransferForm
- [ ] **Account Detail** matches Stitch 07-account-detail: PageHeader, redesigned AccountBalanceHeader with stats row, FilterBar on transaction list
- [ ] **Transactions** matches Stitch 07b: PageHeader, SummaryBar (page-level), FilterBar, FAB functional
- [ ] **Transfers** matches Stitch design: PageHeader, DataTable, FormSheet for form
- [ ] `TransactionForm` is headless (no internal SheetTrigger)
- [ ] `TransferForm` is headless (no internal DialogTrigger)
- [ ] `stat-card-placeholder.tsx` and `net-worth-bar.tsx` deleted
- [ ] All CSS uses logical properties (`ps-`, `pe-`, `ms-`, `me-`, `text-start`, `text-end`)
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm exec tsc --noEmit` passes

---

## Backend Dependencies Discovered

During implementation, update `docs/backend-dependencies.md` for any "coming soon" items:

| # | UI Element | Page | Backend Needed | Target Phase |
|---|-----------|------|---------------|-------------|
| 1 | Monthly Spending StatCard | Dashboard | GET /api/v1/transactions/summary?period=month | Phase 2 |
| 2 | Active Debts StatCard | Dashboard | GET /api/v1/debts (debts module) | Phase 3 |
| 3 | Upcoming Payments StatCard | Dashboard | GET /api/v1/debts/upcoming or forecasting | Phase 3 |
| 4 | Income this month (account detail) | Account Detail | GET /api/v1/accounts/{id}/stats?period=month | Phase 2 |
| 5 | Expenses this month (account detail) | Account Detail | same endpoint | Phase 2 |
| 6 | Avg transaction (account detail) | Account Detail | same endpoint | Phase 2 |
| 7 | Account Statements button | Account Detail | GET /api/v1/accounts/{id}/statements | Phase 5+ |
| 8 | Accurate period totals (transactions page) | Transactions | GET /api/v1/transactions/summary with filters | Phase 2 |
