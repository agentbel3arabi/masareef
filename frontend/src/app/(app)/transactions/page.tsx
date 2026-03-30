"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Plus, Receipt, Search, TrendingUp, TrendingDown, ArrowLeftRight, Hash } from "lucide-react";
import { useTransactions, type TransactionFilters } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionFilterBar } from "@/components/transactions/transaction-filters";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { BulkToolbar } from "@/components/transactions/bulk-toolbar";
import { TransactionTableSkeleton, FilterBarSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
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

  // Page-level summary stats from current page data
  const visibleTxs = data?.data ?? [];
  const firstCurrency = visibleTxs[0]?.currency ?? "EGP";
  const pageIncome = visibleTxs
    .filter((tx) => tx.type === "credit")
    .reduce((sum, tx) => sum + tx.amount_minor, 0);
  const pageExpenses = visibleTxs
    .filter((tx) => tx.type === "debit")
    .reduce((sum, tx) => sum + Math.abs(tx.amount_minor), 0);
  const pageNet = pageIncome - pageExpenses;
  const totalCount = data?.meta?.total ?? 0;

  const fmt = (amount: number) =>
    locale === "ar"
      ? formatAmountAr(amount, firstCurrency)
      : formatAmount(amount, firstCurrency);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("nav.transactions")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("transactions.subtitle")}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label={t("transactions.income")}
          value={visibleTxs.length > 0 ? fmt(pageIncome) : "—"}
        />
        <StatCard
          icon={TrendingDown}
          label={t("transactions.expenses")}
          value={visibleTxs.length > 0 ? fmt(pageExpenses) : "—"}
        />
        <StatCard
          icon={ArrowLeftRight}
          label={t("transactions.netFlow")}
          value={visibleTxs.length > 0 ? fmt(pageNet) : "—"}
        />
        <StatCard
          icon={Hash}
          label={t("transactions.count")}
          value={isLoading ? "..." : String(totalCount)}
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

          {/* Section header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("transactions.list")}
            </h2>
            <div className="flex items-center gap-2">
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
            </div>
          </div>

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
                    if (firstAccountId !== undefined) setCreateOpen(true);
                    else router.push("/accounts");
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
