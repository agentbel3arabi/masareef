# Unit 1H: Transactions UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the transaction form (create/edit), transfer form, global transactions page, and integrate the transaction table into the account detail page from Unit 1G. This completes the Phase 1 frontend.

**Architecture:** Transaction form is a slide-out sheet (shadcn Sheet). Transactions table supports 7 filter dimensions + pagination. The transfer form handles same-currency and cross-currency transfers with FX rate input.

**Tech Stack:** Next.js App Router, TanStack Query, shadcn/ui, Tailwind CSS

**Required reading:** `CLAUDE.md` (RTL rules), `03-features/transactions.md`, `03-features/transfers.md`, `guides/09-design-tokens.md`, `stitch-designs/html/07-account-detail.html`, `stitch-designs/html/07b-transactions-global.html`, `stitch-designs/html/21-transaction-form.html`, `stitch-designs/html/22-transfer-form.html`

---

## File Structure

```
frontend/src/
├── app/(app)/
│   ├── accounts/[id]/page.tsx        # MODIFY: integrate transaction table
│   ├── transactions/page.tsx          # NEW: global transactions page
│   └── transfers/page.tsx             # NEW: transfers page
├── components/
│   ├── transactions/
│   │   ├── transaction-table.tsx      # Data table with filters
│   │   ├── transaction-form.tsx       # Create/edit sheet
│   │   ├── transaction-filters.tsx    # Filter bar
│   │   └── transaction-row.tsx        # Single table row
│   └── transfers/
│       ├── transfer-form.tsx          # Create transfer dialog
│       └── transfer-list.tsx          # Transfers table
├── hooks/
│   ├── use-transactions.ts            # NEW: TanStack Query hooks
│   └── use-transfers.ts              # NEW: TanStack Query hooks
```

---

### Task 1: Transaction Query Hooks

**Files:**
- Create: `frontend/src/hooks/use-transactions.ts`

- [ ] **Step 1: Write the hooks**

Create `frontend/src/hooks/use-transactions.ts`:
```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";

export interface Transaction {
  id: number;
  account_id: number;
  date: string;
  description: string;
  amount_minor: number;
  currency: string;
  type: string;
  category?: {
    id: number;
    name_en: string;
    name_ar: string | null;
    color: string | null;
  } | null;
  is_split: boolean;
  transfer_id: string | null;
  asset_id: number | null;
  ai_categorized: boolean;
  ai_confidence: number | null;
  notes: string | null;
}

export interface TransactionFilters {
  account_id?: number;
  q?: string;
  type?: string;
  category_id?: number;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  has_category?: boolean;
  sort?: string;
  page?: number;
  page_size?: number;
}

export interface CreateTransactionInput {
  account_id: number;
  date: string;
  description?: string;
  amount_minor: number;
  type: string;
  currency: string;
  category_id?: number;
  notes?: string;
}

export function useTransactions(filters: TransactionFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const queryString = params.toString();
  const path = `/api/v1/transactions${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: () => apiGet<Transaction[]>(path),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTransactionInput) =>
      apiPost<Transaction>("/api/v1/transactions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/api/v1/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/use-transactions.ts
git commit -m "feat(frontend): add TanStack Query hooks for transactions API"
```

---

### Task 2: Transaction Table Component

**Files:**
- Create: `frontend/src/components/transactions/transaction-row.tsx`
- Create: `frontend/src/components/transactions/transaction-table.tsx`

- [ ] **Step 1: Write transaction row**

Create `frontend/src/components/transactions/transaction-row.tsx`:
```tsx
"use client";

import { MoneyDisplay } from "@/components/shared/money-display";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/hooks/use-transactions";

interface TransactionRowProps {
  transaction: Transaction;
  showAccount?: boolean;
}

export function TransactionRow({ transaction, showAccount = false }: TransactionRowProps) {
  return (
    <tr className="border-b hover:bg-accent/50 transition-colors">
      <td className="px-4 py-3 text-sm">{transaction.date}</td>
      <td className="px-4 py-3 text-sm">
        <div>{transaction.description || "—"}</div>
        {transaction.notes && (
          <div className="text-xs text-muted-foreground">{transaction.notes}</div>
        )}
      </td>
      <td className="px-4 py-3">
        {transaction.category ? (
          <Badge
            variant="secondary"
            style={{ borderColor: transaction.category.color || undefined }}
          >
            {transaction.category.name_en}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Uncategorized</span>
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
    </tr>
  );
}
```

- [ ] **Step 2: Write transaction table**

Create `frontend/src/components/transactions/transaction-table.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import { TransactionRow } from "./transaction-row";
import { Button } from "@/components/ui/button";
import type { Transaction } from "@/hooks/use-transactions";

interface TransactionTableProps {
  transactions: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  showAccount?: boolean;
}

export function TransactionTable({
  transactions,
  total,
  page,
  pageSize,
  onPageChange,
  showAccount = false,
}: TransactionTableProps) {
  const t = useTranslations();
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-start text-sm font-medium">Date</th>
              <th className="px-4 py-3 text-start text-sm font-medium">Description</th>
              <th className="px-4 py-3 text-start text-sm font-medium">Category</th>
              <th className="px-4 py-3 text-end text-sm font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} transaction={tx} showAccount={showAccount} />
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
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
            {total} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/transactions/
git commit -m "feat(frontend): add TransactionTable and TransactionRow components"
```

---

### Task 3: Transaction Form (Create/Edit Sheet)

**Files:**
- Create: `frontend/src/components/transactions/transaction-form.tsx`

- [ ] **Step 1: Write the form**

Create `frontend/src/components/transactions/transaction-form.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { CURRENCIES } from "@/lib/money";
import { Plus } from "lucide-react";

interface TransactionFormProps {
  accountId?: number;
  accountCurrency?: string;
}

export function TransactionForm({ accountId, accountCurrency = "EGP" }: TransactionFormProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"debit" | "credit">("debit");
  const [notes, setNotes] = useState("");

  const createTx = useCreateTransaction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const exponent = CURRENCIES[accountCurrency]?.exponent ?? 2;
    const amountMinor = Math.round(parseFloat(amount) * Math.pow(10, exponent));

    await createTx.mutateAsync({
      account_id: accountId!,
      date,
      description,
      amount_minor: amountMinor,
      type,
      currency: accountCurrency,
    });

    setOpen(false);
    setDescription("");
    setAmount("");
    setNotes("");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 me-1" />
          Add Transaction
        </Button>
      </SheetTrigger>
      <SheetContent side="end" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New Transaction</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={type === "debit" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setType("debit")}
            >
              Expense
            </Button>
            <Button
              type="button"
              variant={type === "credit" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setType("credit")}
            >
              Income
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Carrefour City Stars"
            />
          </div>

          <div className="space-y-2">
            <Label>Amount ({accountCurrency})</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button type="submit" className="w-full" disabled={createTx.isPending}>
            {createTx.isPending ? t("common.loading") : t("common.save")}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/transactions/transaction-form.tsx
git commit -m "feat(frontend): add transaction form sheet with debit/credit toggle"
```

---

### Task 4: Integrate Transaction Table into Account Detail

**Files:**
- Modify: `frontend/src/app/(app)/accounts/[id]/page.tsx`

- [ ] **Step 1: Update account detail page**

Replace `frontend/src/app/(app)/accounts/[id]/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "@/hooks/use-accounts";
import { useTransactions } from "@/hooks/use-transactions";
import { AccountBalanceHeader } from "@/components/accounts/account-balance-header";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionForm } from "@/components/transactions/transaction-form";

export default function AccountDetailPage() {
  const params = useParams();
  const accountId = Number(params.id);
  const [page, setPage] = useState(1);

  const { data: accountData, isLoading: accountLoading } = useAccount(accountId);
  const { data: txData, isLoading: txLoading } = useTransactions({
    account_id: accountId,
    page,
    page_size: 50,
  });

  if (accountLoading) return <p>Loading...</p>;
  if (!accountData?.data) return <p>Account not found</p>;

  const account = accountData.data;

  return (
    <div className="space-y-6">
      <AccountBalanceHeader account={account} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Transactions</h2>
        <TransactionForm accountId={account.id} accountCurrency={account.currency} />
      </div>

      {txLoading ? (
        <p>Loading transactions...</p>
      ) : (
        <TransactionTable
          transactions={txData?.data || []}
          total={txData?.meta?.total || 0}
          page={page}
          pageSize={50}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/\(app\)/accounts/\[id\]/page.tsx
git commit -m "feat(frontend): integrate transaction table into account detail page"
```

---

### Task 5: Global Transactions Page

**Files:**
- Create: `frontend/src/app/(app)/transactions/page.tsx`
- Create: `frontend/src/components/transactions/transaction-filters.tsx`

- [ ] **Step 1: Write filter bar**

Create `frontend/src/components/transactions/transaction-filters.tsx`:
```tsx
"use client";

import { Input } from "@/components/ui/input";
import type { TransactionFilters } from "@/hooks/use-transactions";

interface TransactionFilterBarProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
}

export function TransactionFilterBar({ filters, onChange }: TransactionFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <Input
        placeholder="Search..."
        value={filters.q || ""}
        onChange={(e) => onChange({ ...filters, q: e.target.value, page: 1 })}
        className="max-w-xs"
      />
      <select
        value={filters.type || ""}
        onChange={(e) => onChange({ ...filters, type: e.target.value || undefined, page: 1 })}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">All types</option>
        <option value="debit">Expenses</option>
        <option value="credit">Income</option>
      </select>
      <Input
        type="date"
        value={filters.date_from || ""}
        onChange={(e) => onChange({ ...filters, date_from: e.target.value || undefined, page: 1 })}
        className="max-w-[160px]"
      />
      <Input
        type="date"
        value={filters.date_to || ""}
        onChange={(e) => onChange({ ...filters, date_to: e.target.value || undefined, page: 1 })}
        className="max-w-[160px]"
      />
    </div>
  );
}
```

- [ ] **Step 2: Write global transactions page**

Create `frontend/src/app/(app)/transactions/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useTransactions, TransactionFilters } from "@/hooks/use-transactions";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionFilterBar } from "@/components/transactions/transaction-filters";

export default function TransactionsPage() {
  const t = useTranslations("nav");
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    page_size: 50,
    sort: "-date",
  });

  const { data, isLoading } = useTransactions(filters);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("transactions")}</h1>

      <TransactionFilterBar filters={filters} onChange={setFilters} />

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <TransactionTable
          transactions={data?.data || []}
          total={data?.meta?.total || 0}
          page={filters.page || 1}
          pageSize={filters.page_size || 50}
          onPageChange={(p) => setFilters({ ...filters, page: p })}
          showAccount
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/transactions/transaction-filters.tsx frontend/src/app/\(app\)/transactions/
git commit -m "feat(frontend): add global transactions page with search, type, and date filters"
```

---

### Task 6: Transfer Hooks, Form, and Page

**Files:**
- Create: `frontend/src/hooks/use-transfers.ts`
- Create: `frontend/src/components/transfers/transfer-form.tsx`
- Create: `frontend/src/app/(app)/transfers/page.tsx`

- [ ] **Step 1: Write transfer hooks**

Create `frontend/src/hooks/use-transfers.ts`:
```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api-client";

export interface Transfer {
  transfer_id: string;
  date: string;
  description: string;
  from_account: { id: number; name: string; currency: string };
  to_account: { id: number; name: string; currency: string };
  source_amount: number;
  target_amount: number;
  fx_rate_minor_units: number | null;
}

export interface CreateTransferInput {
  from_account_id: number;
  to_account_id: number;
  amount_minor: number;
  date: string;
  description?: string;
  fx_rate_minor_units?: number;
}

export function useTransfers(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ["transfers", page, pageSize],
    queryFn: () => apiGet<Transfer[]>(`/api/v1/transfers?page=${page}&page_size=${pageSize}`),
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTransferInput) => apiPost("/api/v1/transfers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
```

- [ ] **Step 2: Write transfer form**

Create `frontend/src/components/transfers/transfer-form.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccounts, Account } from "@/hooks/use-accounts";
import { useCreateTransfer } from "@/hooks/use-transfers";
import { CURRENCIES } from "@/lib/money";
import { ArrowLeftRight } from "lucide-react";

export function TransferForm() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const exponent = CURRENCIES[fromAccount?.currency || "EGP"]?.exponent ?? 2;
    const amountMinor = Math.round(parseFloat(amount) * Math.pow(10, exponent));

    await createTransfer.mutateAsync({
      from_account_id: Number(fromId),
      to_account_id: Number(toId),
      amount_minor: amountMinor,
      date,
      description: description || undefined,
      fx_rate_minor_units: isCrossCurrency && fxRate
        ? Math.round(parseFloat(fxRate) * 10000)
        : undefined,
    });

    setOpen(false);
    setFromId("");
    setToId("");
    setAmount("");
    setDescription("");
    setFxRate("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <ArrowLeftRight className="h-4 w-4 me-2" />
          New Transfer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Between Accounts</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>From Account</Label>
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Select...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>To Account</Label>
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Select...</option>
              {accounts.filter((a) => a.id !== Number(fromId)).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Amount ({fromAccount?.currency || ""})</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {isCrossCurrency && (
            <div className="space-y-2">
              <Label>
                Exchange Rate ({fromAccount?.currency} to {toAccount?.currency})
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
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., ATM withdrawal"
            />
          </div>

          <Button type="submit" className="w-full" disabled={createTransfer.isPending}>
            {createTransfer.isPending ? t("common.loading") : "Transfer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Write transfers page**

Create `frontend/src/app/(app)/transfers/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useTransfers } from "@/hooks/use-transfers";
import { TransferForm } from "@/components/transfers/transfer-form";
import { MoneyDisplay } from "@/components/shared/money-display";
import { ArrowRight } from "lucide-react";

export default function TransfersPage() {
  const t = useTranslations("nav");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTransfers(page);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("transfers")}</h1>
        <TransferForm />
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-start text-sm font-medium">Date</th>
                <th className="px-4 py-3 text-start text-sm font-medium">From</th>
                <th className="px-4 py-3 text-center text-sm font-medium"></th>
                <th className="px-4 py-3 text-start text-sm font-medium">To</th>
                <th className="px-4 py-3 text-end text-sm font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(data?.data || []).map((transfer) => (
                <tr key={transfer.transfer_id} className="border-b">
                  <td className="px-4 py-3 text-sm">{transfer.date}</td>
                  <td className="px-4 py-3 text-sm">{transfer.from_account?.name}</td>
                  <td className="px-4 py-3 text-center">
                    <ArrowRight className="h-4 w-4 inline text-muted-foreground" />
                  </td>
                  <td className="px-4 py-3 text-sm">{transfer.to_account?.name}</td>
                  <td className="px-4 py-3 text-end">
                    <MoneyDisplay
                      amount={transfer.source_amount}
                      currency={transfer.from_account?.currency || "EGP"}
                      showCurrency
                    />
                  </td>
                </tr>
              ))}
              {(!data?.data || data.data.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No transfers yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/use-transfers.ts frontend/src/components/transfers/ frontend/src/app/\(app\)/transfers/
git commit -m "feat(frontend): add transfer form and transfers page with cross-currency support"
```

---

### Task 7: Final Build Verification

- [ ] **Step 1: Build and lint**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend
pnpm build && pnpm lint
```

- [ ] **Step 2: Visual verification**

Run `pnpm dev` and verify:
- Accounts page: grid renders, create dialog works
- Account detail: balance header + transaction table + add transaction
- Transactions page: filters work, pagination works
- Transfers page: transfer form with account selectors, FX rate for cross-currency
- RTL layout: sidebar on right, text flows right-to-left
- Dark mode: all new components render correctly

- [ ] **Step 3: Backend integration test**

Run both servers:
```bash
# Terminal 1: Backend
cd backend && uv run uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend && pnpm dev
```

Create an account, add a transaction, verify balance updates.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "fix(frontend): resolve Phase 1 UI issues"
```
