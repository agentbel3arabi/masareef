# Unit 1G: Accounts UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Accounts page (grid of account cards grouped by type) and Account Detail page (transaction table with filters, balance header). These are the first data-driven pages in the app.

**Architecture:** Pages use TanStack Query hooks to fetch from FastAPI. Components follow shadcn/ui patterns. All money display uses the `formatAmount` utility. CSS uses logical properties only — no `pl-`/`pr-`/`ml-`/`mr-`/`left-`/`right-`/`text-left`/`text-right`.

**Tech Stack:** Next.js App Router, TanStack Query, shadcn/ui, Tailwind CSS

**Required reading:** `CLAUDE.md` (RTL rules), `03-features/accounts.md`, `guides/09-design-tokens.md`, `stitch-designs/html/06-accounts.html`, `stitch-designs/html/07-account-detail.html`

---

## File Structure

```
frontend/src/
├── app/(app)/
│   └── accounts/
│       ├── page.tsx                  # Accounts grid page
│       └── [id]/
│           └── page.tsx              # Account detail page
├── components/
│   ├── accounts/
│   │   ├── account-card.tsx          # Single account card
│   │   ├── account-grid.tsx          # Grid grouped by type
│   │   ├── create-account-dialog.tsx # Create account form dialog
│   │   └── account-balance-header.tsx # Detail page header
│   └── shared/
│       └── money-display.tsx         # Reusable money display component
├── hooks/
│   └── use-accounts.ts              # TanStack Query hooks for accounts API
```

---

### Task 1: Account Query Hooks

**Files:**
- Create: `frontend/src/hooks/use-accounts.ts`

- [ ] **Step 1: Write the hooks**

Create `frontend/src/hooks/use-accounts.ts`:
```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";

export interface Account {
  id: number;
  name: string;
  type: string;
  currency: string;
  balance_minor: number;
  displayed_balance_minor: number;
  institution: string | null;
  credit_limit: number | null;
  billing_cycle_day: number | null;
  payment_due_day: number | null;
  opened_at: string | null;
  is_active: boolean;
}

export interface CreateAccountInput {
  name: string;
  type: string;
  currency: string;
  initial_balance?: number;
  institution?: string;
  credit_limit?: number;
  billing_cycle_day?: number;
  payment_due_day?: number;
  opened_at?: string;
}

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: () => apiGet<Account[]>("/api/v1/accounts"),
  });
}

export function useAccount(id: number) {
  return useQuery({
    queryKey: ["accounts", id],
    queryFn: () => apiGet<Account>(`/api/v1/accounts/${id}`),
    enabled: !!id,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAccountInput) => apiPost<Account>("/api/v1/accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/api/v1/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/use-accounts.ts
git commit -m "feat(frontend): add TanStack Query hooks for accounts API"
```

---

### Task 2: MoneyDisplay Shared Component

**Files:**
- Create: `frontend/src/components/shared/money-display.tsx`

- [ ] **Step 1: Write the component**

Create `frontend/src/components/shared/money-display.tsx`:
```tsx
"use client";

import { formatAmount, formatAmountAr, CURRENCIES } from "@/lib/money";
import { cn } from "@/lib/utils";

interface MoneyDisplayProps {
  amount: number;           // Minor units
  currency: string;
  locale?: "ar" | "en";
  showCurrency?: boolean;
  colorize?: boolean;       // Green for positive, red for negative
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function MoneyDisplay({
  amount,
  currency,
  locale = "ar",
  showCurrency = true,
  colorize = false,
  className,
  size = "md",
}: MoneyDisplayProps) {
  const formatted = locale === "ar"
    ? formatAmountAr(amount, currency)
    : formatAmount(amount, currency);

  const symbol = CURRENCIES[currency]?.symbol ?? currency;

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl font-bold",
  };

  return (
    <span
      className={cn(
        sizeClasses[size],
        "tabular-nums",
        colorize && amount > 0 && "text-green-600 dark:text-green-400",
        colorize && amount < 0 && "text-red-600 dark:text-red-400",
        className
      )}
    >
      {formatted}
      {showCurrency && <span className="text-muted-foreground ms-1">{symbol}</span>}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/shared/money-display.tsx
git commit -m "feat(frontend): add MoneyDisplay component with RTL and colorization support"
```

---

### Task 3: Account Card and Grid Components

**Files:**
- Create: `frontend/src/components/accounts/account-card.tsx`
- Create: `frontend/src/components/accounts/account-grid.tsx`

- [ ] **Step 1: Write account card**

Create `frontend/src/components/accounts/account-card.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Wallet, CreditCard, Banknote, Smartphone, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import type { Account } from "@/hooks/use-accounts";

const typeIcons: Record<string, typeof Wallet> = {
  bank_account: Wallet,
  credit_card: CreditCard,
  cash_wallet: Banknote,
  digital_wallet: Smartphone,
  financing_app: ShoppingBag,
};

interface AccountCardProps {
  account: Account;
}

export function AccountCard({ account }: AccountCardProps) {
  const t = useTranslations("accounts");
  const Icon = typeIcons[account.type] || Wallet;

  return (
    <Link href={`/accounts/${account.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
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
          {account.type === "credit_card" && account.credit_limit && (
            <p className="text-xs text-muted-foreground mt-1">
              {t("available")}:{" "}
              <MoneyDisplay
                amount={account.credit_limit + account.displayed_balance_minor}
                currency={account.currency}
                size="sm"
                showCurrency={false}
              />
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Write account grid**

Create `frontend/src/components/accounts/account-grid.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import { AccountCard } from "./account-card";
import type { Account } from "@/hooks/use-accounts";

const TYPE_ORDER = ["bank_account", "credit_card", "cash_wallet", "digital_wallet", "financing_app"];

const TYPE_LABELS: Record<string, string> = {
  bank_account: "accounts.bankAccount",
  credit_card: "accounts.creditCard",
  cash_wallet: "accounts.cashWallet",
  digital_wallet: "accounts.digitalWallet",
  financing_app: "accounts.financingApp",
};

interface AccountGridProps {
  accounts: Account[];
}

export function AccountGrid({ accounts }: AccountGridProps) {
  const t = useTranslations();

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    label: t(TYPE_LABELS[type] || type),
    items: accounts.filter((a) => a.type === type),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-8">
      {grouped.map((group) => (
        <section key={group.type}>
          <h2 className="text-lg font-semibold mb-4">{group.label}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/accounts/
git commit -m "feat(frontend): add AccountCard and AccountGrid components"
```

---

### Task 4: Create Account Dialog

**Files:**
- Create: `frontend/src/components/accounts/create-account-dialog.tsx`

- [ ] **Step 1: Write the dialog**

Create `frontend/src/components/accounts/create-account-dialog.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateAccount } from "@/hooks/use-accounts";
import { CURRENCIES } from "@/lib/money";
import { Plus } from "lucide-react";

const ACCOUNT_TYPES = [
  { value: "bank_account", label: "accounts.bankAccount" },
  { value: "credit_card", label: "accounts.creditCard" },
  { value: "cash_wallet", label: "accounts.cashWallet" },
  { value: "digital_wallet", label: "accounts.digitalWallet" },
  { value: "financing_app", label: "accounts.financingApp" },
];

export function CreateAccountDialog() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("bank_account");
  const [currency, setCurrency] = useState("EGP");
  const [institution, setInstitution] = useState("");
  const [initialBalance, setInitialBalance] = useState("");

  const createAccount = useCreateAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const balanceMinor = initialBalance
      ? Math.round(parseFloat(initialBalance) * 100)
      : 0;

    await createAccount.mutateAsync({
      name,
      type,
      currency,
      initial_balance: balanceMinor,
      institution: institution || undefined,
    });

    setOpen(false);
    setName("");
    setType("bank_account");
    setCurrency("EGP");
    setInstitution("");
    setInitialBalance("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 me-2" />
          {t("accounts.addAccount")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("accounts.addAccount")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("common.name") || "Name"}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ACCOUNT_TYPES.map((t_item) => (
                <option key={t_item.value} value={t_item.value}>
                  {t(t_item.label)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {Object.entries(CURRENCIES).map(([code, info]) => (
                <option key={code} value={code}>
                  {code} — {info.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Institution</Label>
            <Input
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g., CIB, HSBC"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("accounts.balance")}</Label>
            <Input
              type="number"
              step="0.01"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <Button type="submit" className="w-full" disabled={createAccount.isPending}>
            {createAccount.isPending ? t("common.loading") : t("common.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/accounts/create-account-dialog.tsx
git commit -m "feat(frontend): add CreateAccountDialog with type, currency, and balance fields"
```

---

### Task 5: Accounts Page

**Files:**
- Create: `frontend/src/app/(app)/accounts/page.tsx`

- [ ] **Step 1: Write the page**

Create `frontend/src/app/(app)/accounts/page.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import { useAccounts } from "@/hooks/use-accounts";
import { AccountGrid } from "@/components/accounts/account-grid";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";

export default function AccountsPage() {
  const t = useTranslations("accounts");
  const { data, isLoading, error } = useAccounts();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <CreateAccountDialog />
      </div>

      {isLoading && <p className="text-muted-foreground">{t("loading") || "Loading..."}</p>}
      {error && <p className="text-destructive">Error: {error.message}</p>}
      {data?.data && <AccountGrid accounts={data.data} />}
      {data?.data?.length === 0 && !isLoading && (
        <p className="text-muted-foreground text-center py-12">
          No accounts yet. Click "Add Account" to get started.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/\(app\)/accounts/
git commit -m "feat(frontend): add Accounts page with grid, create dialog, and loading states"
```

---

### Task 6: Account Detail Page

**Files:**
- Create: `frontend/src/app/(app)/accounts/[id]/page.tsx`
- Create: `frontend/src/components/accounts/account-balance-header.tsx`

- [ ] **Step 1: Write balance header**

Create `frontend/src/components/accounts/account-balance-header.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import { MoneyDisplay } from "@/components/shared/money-display";
import type { Account } from "@/hooks/use-accounts";

interface AccountBalanceHeaderProps {
  account: Account;
}

export function AccountBalanceHeader({ account }: AccountBalanceHeaderProps) {
  const t = useTranslations("accounts");

  return (
    <div className="flex items-center justify-between p-6 rounded-lg bg-card border">
      <div>
        <h1 className="text-2xl font-bold">{account.name}</h1>
        {account.institution && (
          <p className="text-muted-foreground">{account.institution}</p>
        )}
      </div>
      <div className="text-end">
        <p className="text-sm text-muted-foreground">{t("balance")}</p>
        <MoneyDisplay
          amount={account.displayed_balance_minor}
          currency={account.currency}
          size="lg"
          colorize
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write account detail page**

Create `frontend/src/app/(app)/accounts/[id]/page.tsx`:
```tsx
"use client";

import { useParams } from "next/navigation";
import { useAccount } from "@/hooks/use-accounts";
import { AccountBalanceHeader } from "@/components/accounts/account-balance-header";

export default function AccountDetailPage() {
  const params = useParams();
  const accountId = Number(params.id);
  const { data, isLoading, error } = useAccount(accountId);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;
  if (!data?.data) return <p>Account not found</p>;

  const account = data.data;

  return (
    <div className="space-y-6">
      <AccountBalanceHeader account={account} />

      {/* Transaction table will be added in Unit 1H */}
      <div className="rounded-lg border p-6 text-center text-muted-foreground">
        Transaction table — coming in Unit 1H
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(app\)/accounts/ frontend/src/components/accounts/account-balance-header.tsx
git commit -m "feat(frontend): add Account detail page with balance header"
```

---

### Task 7: Verify Build

- [ ] **Step 1: Build and lint**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend
pnpm build && pnpm lint
```

- [ ] **Step 2: Visual verification**

Run `pnpm dev`, navigate to `/accounts`. Verify:
- Add Account dialog opens and form renders
- After creating an account, it appears in the grid
- Clicking an account navigates to detail page
- RTL layout is correct (sidebar on right, text flows right-to-left)
- Dark mode works on all new components

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix(frontend): resolve accounts UI issues"
```
