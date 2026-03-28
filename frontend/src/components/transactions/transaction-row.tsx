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
