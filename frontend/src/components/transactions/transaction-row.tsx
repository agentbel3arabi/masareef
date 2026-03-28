"use client";

import { useTranslations, useLocale } from "next-intl";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/hooks/use-transactions";

interface TransactionRowProps {
  transaction: Transaction;
  showAccount?: boolean;
}

export function TransactionRow({ transaction }: TransactionRowProps) {
  const t = useTranslations();
  const locale = useLocale();
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
          <Badge variant="secondary" className="gap-1.5">
            {transaction.category.color && (
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: transaction.category.color }}
              />
            )}
            {locale === "ar" && transaction.category.name_ar
              ? transaction.category.name_ar
              : transaction.category.name_en}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">{t("transactions.uncategorized")}</span>
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
