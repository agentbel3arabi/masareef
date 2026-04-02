"use client";

import { useTranslations } from "next-intl";
import { Landmark } from "lucide-react";
import { useDebts } from "@/hooks/use-debts";
import { EmptyState } from "@/components/shared/empty-state";

export function LoansTab() {
  const t = useTranslations();
  const { data, isLoading, error } = useDebts({ type: "bank_loan" });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
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

  const loans = data?.data ?? [];

  if (loans.length === 0) {
    return (
      <EmptyState
        icon={Landmark}
        title={t("emptyStates.debts.title")}
        description={t("emptyStates.debts.description")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {loans.map((loan) => (
        <div
          key={loan.id}
          className="rounded-xl bg-card p-6 shadow-sm border border-border"
        >
          <p className="font-bold text-foreground">{loan.name}</p>
          <p className="text-sm text-muted-foreground">
            {loan.institution ?? "\u2014"}
          </p>
        </div>
      ))}
    </div>
  );
}
