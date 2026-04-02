"use client";

import { useTranslations } from "next-intl";
import { MoneyDisplay } from "@/components/shared/money-display";
import type { FinancingAppDetail } from "@/lib/types/debts";

interface FinancingAppProviderCardProps {
  app: FinancingAppDetail;
  currency?: string;
}

export function FinancingAppProviderCard({
  app,
  currency = "EGP",
}: FinancingAppProviderCardProps) {
  const t = useTranslations("debts.financingApps");

  const utilPct = Math.max(0, Math.min(100, Math.round(app.utilization_percent)));
  const ringColor =
    utilPct < 50
      ? "text-green-500"
      : utilPct < 80
        ? "text-amber-500"
        : "text-red-500";

  const circumference = 2 * Math.PI * 34;
  const offset = circumference - (utilPct / 100) * circumference;

  const isInactive = app.active_plans_count === 0;

  return (
    <div
      className={`min-w-[300px] bg-card rounded-xl p-6 flex items-start justify-between shadow-sm border ${
        isInactive
          ? "border-dashed border-border opacity-60"
          : "border-border"
      }`}
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">
            {app.name}
            {app.name_ar ? ` (${app.name_ar})` : ""}
          </h3>
          <p className="text-xs text-muted-foreground">
            {app.active_plans_count} {t("activePlans")}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
            {t("monthlyCommitment")}
          </p>
          <MoneyDisplay
            amount={app.monthly_commitment_minor}
            currency={currency}
            size="lg"
          />
        </div>
        <div className="flex gap-4 pt-2">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold">
              {t("used")}
            </p>
            <MoneyDisplay
              amount={app.balance_minor}
              currency={currency}
              size="sm"
              className="font-semibold"
            />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-bold">
              {t("available")}
            </p>
            <MoneyDisplay
              amount={app.available_minor}
              currency={currency}
              size="sm"
              className="font-semibold text-primary"
            />
          </div>
        </div>
      </div>

      {/* Circular utilization ring */}
      <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle
            className="text-muted"
            cx="40"
            cy="40"
            r="34"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="6"
          />
          {utilPct > 0 && (
            <circle
              className={ringColor}
              cx="40"
              cy="40"
              r="34"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          )}
        </svg>
        <span className="absolute text-sm font-bold">{utilPct}%</span>
      </div>
    </div>
  );
}
