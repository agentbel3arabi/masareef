"use client";

import { useTranslations } from "next-intl";
import { CreditCard } from "lucide-react";
import { MoneyDisplay } from "@/components/shared/money-display";
import { cn } from "@/lib/utils";
import type { Account } from "@/hooks/use-accounts";
import type { InstallmentResponse } from "@/lib/types/debts";

interface CardUtilizationSummaryProps {
  account: Account;
  plans: InstallmentResponse[];
}

export function CardUtilizationSummary({
  account,
  plans,
}: CardUtilizationSummaryProps) {
  const t = useTranslations("debts.financingApps");

  const totalCommitted = plans.reduce(
    (sum, p) => sum + p.remaining_minor,
    0
  );
  const monthlyCommitment = plans.reduce(
    (sum, p) => (p.status === "active" ? sum + p.monthly_amount_minor : sum),
    0
  );
  const creditLimit = account.credit_limit ?? 0;
  const utilPct =
    creditLimit > 0
      ? Math.min(100, Math.round((totalCommitted / creditLimit) * 100))
      : 0;

  const ringColor =
    utilPct < 50
      ? "text-green-500"
      : utilPct < 80
        ? "text-amber-500"
        : "text-red-500";

  const utilLabel =
    utilPct < 50
      ? t("healthy")
      : utilPct < 80
        ? t("moderate")
        : t("high");

  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (utilPct / 100) * circumference;

  return (
    <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{account.name}</h3>
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                utilPct >= 80
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : utilPct >= 50
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              )}
            >
              {utilLabel}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">
              {t("monthlyCommitment")}
            </p>
            <MoneyDisplay
              amount={monthlyCommitment}
              currency={account.currency}
              size="md"
              className="font-bold"
            />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">
              {t("committed")}
            </p>
            <MoneyDisplay
              amount={totalCommitted}
              currency={account.currency}
              size="md"
              className="font-bold"
            />
          </div>
        </div>
        <div className="pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground">
            {t("creditLimit")}:{" "}
            <MoneyDisplay
              amount={creditLimit}
              currency={account.currency}
              size="sm"
              showCurrency
            />
          </p>
        </div>
      </div>

      {/* Circular Progress */}
      <div className="relative flex flex-col items-center">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle
            className="text-muted"
            cx="48"
            cy="48"
            r="40"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="8"
          />
          <circle
            className={ringColor}
            cx="48"
            cy="48"
            r="40"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{utilPct}%</span>
        </div>
      </div>
    </div>
  );
}
