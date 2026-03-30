"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Plus, Receipt, Search, TrendingUp, TrendingDown, ArrowLeftRight, Hash, Trash2 } from "lucide-react";
import { useTransactions, useBulkDeleteTransactions, useBulkCategorizeTransactions, type TransactionFilters } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useNavbarActions } from "@/contexts/navbar-actions-context";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionFilterBar } from "@/components/transactions/transaction-filters";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransactionTableSkeleton, FilterBarSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryIcon } from "@/lib/category-icon";
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

  const { setActions } = useNavbarActions();
  const { data: categoriesData } = useCategories();
  const bulkDelete = useBulkDeleteTransactions();
  const bulkCategorize = useBulkCategorizeTransactions();

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

  useEffect(() => {
    if (!bulkMode) {
      setActions(
        <Button variant="outline" size="sm" onClick={() => setBulkMode(true)}>
          {t("transactions.manage")}
        </Button>
      );
    } else if (selectedIds.size === 0) {
      setActions(
        <Button variant="secondary" size="sm" onClick={exitBulkMode}>
          {t("transactions.cancel")}
        </Button>
      );
    } else {
      setActions(
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} {t("transactions.selectedCount", { count: selectedIds.size })}
          </span>
          <Select
            onValueChange={async (val) => {
              await bulkCategorize.mutateAsync({ ids: [...selectedIds], category_id: Number(val) });
              exitBulkMode();
            }}
            disabled={bulkCategorize.isPending}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder={t("transactions.recategorize")} />
            </SelectTrigger>
            <SelectContent>
              {(categoriesData?.data || []).map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  <span className="flex items-center gap-2">
                    <CategoryIcon icon={cat.icon} className="h-3.5 w-3.5 shrink-0" />
                    {locale === "ar" && cat.name_ar ? cat.name_ar : cat.name_en}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="destructive"
            size="sm"
            disabled={bulkDelete.isPending}
            onClick={async () => {
              await bulkDelete.mutateAsync({ ids: [...selectedIds] });
              exitBulkMode();
            }}
          >
            <Trash2 className="h-3.5 w-3.5 me-1" />
            {t("transactions.deleteSelected")}
          </Button>
          <Button variant="ghost" size="sm" onClick={exitBulkMode}>
            {t("transactions.cancel")}
          </Button>
        </div>
      );
    }
    return () => setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkMode, selectedIds.size, categoriesData]);

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
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("transactions.list")}
          </h2>

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
