"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Receipt, Search } from "lucide-react";
import { useTransactions, type TransactionFilters } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionFilterBar } from "@/components/transactions/transaction-filters";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransactionTableSkeleton, FilterBarSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";

function hasActiveFilters(filters: TransactionFilters): boolean {
  return !!(filters.q || filters.type || filters.category_id || filters.date_from || filters.date_to);
}

export default function TransactionsPage() {
  const t = useTranslations();
  const tEmpty = useTranslations("emptyStates");
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    page_size: 50,
    sort: "-date",
  });
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useTransactions(filters);
  const { data: accountsData } = useAccounts();
  const firstAccountId = accountsData?.data?.[0]?.id;
  const isEmpty = !isLoading && (data?.data?.length ?? 0) === 0;
  const filtersActive = hasActiveFilters(filters);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("nav.transactions")}</h1>

      {isLoading ? (
        <>
          <FilterBarSkeleton />
          <TransactionTableSkeleton />
        </>
      ) : (
        <>
          <TransactionFilterBar filters={filters} onChange={setFilters} />
          {isEmpty ? (
            filtersActive ? (
              <EmptyState
                icon={Search}
                title={tEmpty("searchResults.title")}
                description={tEmpty("searchResults.description")}
              />
            ) : (
              <>
                <EmptyState
                  icon={Receipt}
                  title={tEmpty("transactions.title")}
                  description={tEmpty("transactions.description")}
                  action={
                    firstAccountId !== undefined
                      ? { label: tEmpty("transactions.action"), onClick: () => setCreateOpen(true) }
                      : undefined
                  }
                />
                {firstAccountId !== undefined && (
                  <TransactionForm
                    accountId={firstAccountId}
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                  />
                )}
              </>
            )
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
        </>
      )}
    </div>
  );
}
