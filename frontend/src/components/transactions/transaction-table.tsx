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
              <th className="px-4 py-3 text-start text-sm font-medium">{t("transactions.date")}</th>
              <th className="px-4 py-3 text-start text-sm font-medium">{t("transactions.description")}</th>
              <th className="px-4 py-3 text-start text-sm font-medium">{t("transactions.category")}</th>
              <th className="px-4 py-3 text-end text-sm font-medium">{t("transactions.amount")}</th>
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
