"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useTransactions, type TransactionFilters } from "@/hooks/use-transactions";
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
