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
  const allSelected =
    transactions.length > 0 && transactions.every((tx) => selectedIds.has(tx.id));

  return (
    <div>
      <div className="rounded-lg border overflow-x-auto">
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
              <th className="px-4 py-3 text-start text-sm font-medium">
                {t("transactions.date")}
              </th>
              <th className="px-4 py-3 text-start text-sm font-medium">
                {t("transactions.description")}
              </th>
              {showAccount && (
                <th className="px-4 py-3 text-start text-sm font-medium">
                  {t("nav.accounts")}
                </th>
              )}
              <th className="px-4 py-3 text-start text-sm font-medium">
                {t("transactions.category")}
              </th>
              <th className="px-4 py-3 text-end text-sm font-medium">
                {t("transactions.amount")}
              </th>
              <th className="px-4 py-3 w-20">
                <span className="sr-only">{t("transactions.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
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
                <td
                  colSpan={bulkMode ? 7 : 6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
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
