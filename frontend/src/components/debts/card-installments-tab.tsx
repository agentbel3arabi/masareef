"use client";

import { useTranslations } from "next-intl";
import { CreditCard } from "lucide-react";
import { useInstallments } from "@/hooks/use-installments";
import { EmptyState } from "@/components/shared/empty-state";

export function CardInstallmentsTab() {
  const t = useTranslations();
  const { data, isLoading, error } = useInstallments({ type: "credit_card" });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">
        {t("error.title")}: {error.message}
      </p>
    );
  }

  const plans = data?.data ?? [];

  if (plans.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title={t("emptyStates.installments.title")}
        description={t("emptyStates.installments.description")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className="rounded-xl bg-card p-6 shadow-sm border border-border"
        >
          <p className="font-bold text-foreground">{plan.name}</p>
          <p className="text-sm text-muted-foreground">
            {plan.merchant_name ?? "\u2014"}
          </p>
        </div>
      ))}
    </div>
  );
}
