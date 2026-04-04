"use client";

import { useTranslations, useLocale } from "next-intl";
import { useTransactionSummary } from "@/hooks/use-transaction-summary";
import { formatAmount, formatAmountAr } from "@/lib/money";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MonthActivity() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { data, isLoading } = useTransactionSummary({ period: "month" });
  const summary = data?.data;

  const fmt = (amount: number, currency: string) =>
    locale === "ar"
      ? formatAmountAr(amount, currency)
      : formatAmount(amount, currency);

  if (isLoading) return <Card className="h-56 animate-pulse" />;

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-4">{t("monthActivity")}</h3>
      {summary ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {t("totalIncome")}
            </span>
            <span className="text-sm font-bold text-green-600 dark:text-green-400">
              +{fmt(summary.total_income, summary.currency)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {t("totalExpenses")}
            </span>
            <span className="text-sm font-bold text-red-600 dark:text-red-400">
              −{fmt(summary.total_expenses, summary.currency)}
            </span>
          </div>
          <hr className="border-border" />
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">{t("netFlow")}</span>
            <span
              className={cn(
                "text-sm font-bold",
                summary.net_flow >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {summary.net_flow >= 0 ? "+" : "−"}
              {fmt(Math.abs(summary.net_flow), summary.currency)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {t("transactionCount", { count: summary.transaction_count })}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">
          {t("noActivity")}
        </p>
      )}
    </Card>
  );
}
