"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Receipt, Search } from "lucide-react";
import { useTransactions, type TransactionFilters } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionFilterBar } from "@/components/transactions/transaction-filters";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { BulkToolbar } from "@/components/transactions/bulk-toolbar";
import { TransactionTableSkeleton, FilterBarSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("nav.transactions")}</h1>
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
                      // No accounts yet — direct user to create one first
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
