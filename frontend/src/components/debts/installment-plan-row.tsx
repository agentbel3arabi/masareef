"use client";

import { useTranslations } from "next-intl";
import { MoneyDisplay } from "@/components/shared/money-display";
import { ProgressBar } from "@/components/shared/progress-bar";
import { StatusBadge } from "@/components/debts/status-badge";
import type { InstallmentResponse } from "@/lib/types/debts";

interface InstallmentPlanRowProps {
  plan: InstallmentResponse;
  showAccentBorder?: boolean;
  onClick?: () => void;
}

export function InstallmentPlanRow({
  plan,
  showAccentBorder = true,
  onClick,
}: InstallmentPlanRowProps) {
  const t = useTranslations("debts.installment");

  const progressPct =
    plan.total_months > 0
      ? Math.round((plan.months_paid / plan.total_months) * 100)
      : 0;

  return (
    <div
      className={`bg-muted/30 p-5 rounded-lg grid grid-cols-1 md:grid-cols-5 gap-4 items-center ${
        showAccentBorder ? "border-s-4 border-s-primary" : ""
      } ${onClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {/* Product / Name */}
      <div className="md:col-span-1">
        <p className="font-bold text-foreground">{plan.name}</p>
        {plan.merchant_name && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {plan.merchant_name}
          </p>
        )}
        <StatusBadge
          status={plan.status === "active" ? "active" : "completed"}
          className="mt-1"
        />
      </div>

      {/* Monthly + Total */}
      <div>
        <p className="text-[10px] text-muted-foreground font-medium uppercase mb-0.5">
          {t("monthlyAmount")}
        </p>
        <MoneyDisplay
          amount={plan.monthly_amount_minor}
          currency={plan.currency}
          size="sm"
          className="font-bold"
        />
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {t("totalAmount")}:{" "}
          <MoneyDisplay
            amount={plan.total_amount_minor}
            currency={plan.currency}
            size="sm"
            showCurrency={false}
          />
        </p>
      </div>

      {/* Progress */}
      <div className="md:col-span-2">
        <div className="flex justify-between items-end mb-1">
          <p className="text-[10px] text-muted-foreground font-medium uppercase">
            {t("progress")}
          </p>
          <p className="text-[10px] font-bold text-primary">
            {t("months", { paid: plan.months_paid, total: plan.total_months })}
          </p>
        </div>
        <ProgressBar value={progressPct} colorClass="bg-primary" size="sm" />
      </div>

      {/* Remaining */}
      <div className="text-end">
        <p className="text-[10px] text-muted-foreground font-medium uppercase mb-0.5">
          {t("remaining")}
        </p>
        <MoneyDisplay
          amount={plan.remaining_minor}
          currency={plan.currency}
          size="sm"
          className="font-bold"
        />
      </div>
    </div>
  );
}
