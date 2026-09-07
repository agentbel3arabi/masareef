"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Receipt, Search, TrendingUp, TrendingDown, ArrowLeftRight, Hash, Settings } from "lucide-react";
import { useTransactions, type TransactionFilters } from "@/hooks/use-transactions";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { useAccounts } from "@/hooks/use-accounts";
import { NavbarActions } from "@/components/layout/navbar-actions-portal";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionFilterBar } from "@/components/transactions/transaction-filters";
import { BulkToolbar } from "@/components/transactions/bulk-toolbar";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransactionTableSkeleton, FilterBarSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { FAB } from "@/components/shared/fab";
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
  const { bulkMode, selectedIds, enterBulkMode, exitBulkMode, toggleSelect, selectAll } = useBulkSelection();

  const { data, isLoading } = useTransactions(filters);
  const { data: accountsData } = useAccounts();
  const firstAccountId = accountsData?.data?.[0]?.id;
  const isEmpty = !isLoading && (data?.data?.length ?? 0) === 0;
  const filtersActive = hasActiveFilters(filters);

  const accountsMap: Record<number, Account> = {};
  for (const acc of accountsData?.data ?? []) {
    accountsMap[acc.id] = acc;
  }

  // Page-level summary stats from current page data
  const visibleTxs = data?.data ?? [];
  const totalCount = data?.meta?.total ?? 0;

  // Only show totals when all visible transactions share the same currency
  const currencies = [...new Set(visibleTxs.map((tx) => tx.currency).filter(Boolean))];
  const singleCurrency = currencies.length === 1 ? currencies[0] : undefined;

  const pageIncome = singleCurrency
    ? visibleTxs.filter((tx) => tx.type === "credit").reduce((sum, tx) => sum + tx.amount_minor, 0)
    : 0;
  const pageExpenses = singleCurrency
    ? visibleTxs.filter((tx) => tx.type === "debit").reduce((sum, tx) => sum + Math.abs(tx.amount_minor), 0)
    : 0;
  const pageNet = pageIncome - pageExpenses;

  const fmt = (amount: number) =>
    singleCurrency
      ? locale === "ar"
        ? formatAmountAr(amount, singleCurrency)
        : formatAmount(amount, singleCurrency)
      : "—";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t("nav.transactions")}</h1>
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
          {bulkMode && selectedIds.size > 0 && (
            <BulkToolbar
              selectedIds={[...selectedIds]}
              onCancel={exitBulkMode}
              needsReview={!!filters.needs_review}
            />
          )}
          <TransactionFilterBar filters={filters} onChange={setFilters} />

          {/* Section header */}
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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

      <FAB
        onClick={() => setCreateOpen(true)}
        ariaLabel={t("transactions.addTransaction")}
        tooltip={t("transactions.newTransaction")}
      />
      <TransactionForm
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {!bulkMode ? (
        <NavbarActions>
          <Button variant="outline" size="sm" onClick={enterBulkMode}>
            <Settings className="h-4 w-4 me-1" />
            {t("transactions.manage")}
          </Button>
        </NavbarActions>
      ) : (
        <NavbarActions>
          <Button variant="secondary" size="sm" onClick={exitBulkMode}>
            {t("transactions.cancel")}
          </Button>
        </NavbarActions>
      )}
    </div>
  );
}
