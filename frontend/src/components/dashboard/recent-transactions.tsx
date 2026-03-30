"use client";

import { useTranslations, useLocale } from "next-intl";
import { CreditCard } from "lucide-react";
import { useTransactions } from "@/hooks/use-transactions";
import { MoneyDisplay } from "@/components/shared/money-display";
import { CategoryIcon } from "@/lib/category-icon";

export function RecentTransactions() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { data, isLoading } = useTransactions({ page: 1, page_size: 5, sort: "-date" });

  if (isLoading) {
    return (
      <div className="rounded-lg border overflow-hidden animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
            <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-36 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  // useTransactions returns ApiResponse<Transaction[]> — the array is at data.data
  const transactions = data?.data ?? [];

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        {t("noRecentTransactions")}
      </p>
    );
  }

  const dateFormatter = new Intl.DateTimeFormat(
    locale === "ar" ? "ar-EG" : "en-US",
    { dateStyle: "medium" }
  );

  return (
    <div className="rounded-lg border overflow-hidden">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {tx.category?.icon
              ? <CategoryIcon icon={tx.category.icon} className="h-4 w-4" />
              : <CreditCard className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{tx.description}</p>
            <p className="text-xs text-muted-foreground">
              {dateFormatter.format(new Date(tx.date))}
            </p>
          </div>
          <MoneyDisplay
            amount={tx.amount_minor}
            currency={tx.currency}
            colorize
          />
        </div>
      ))}
    </div>
  );
}
