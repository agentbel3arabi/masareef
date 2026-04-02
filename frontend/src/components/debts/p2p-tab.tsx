"use client";

import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { useDebts } from "@/hooks/use-debts";
import { EmptyState } from "@/components/shared/empty-state";

export function P2PTab() {
  const t = useTranslations();
  const {
    data: lentData,
    isLoading: lentLoading,
    error: lentError,
  } = useDebts({ type: "personal_lent" });
  const {
    data: borrowedData,
    isLoading: borrowedLoading,
    error: borrowedError,
  } = useDebts({ type: "personal_borrowed" });

  const isLoading = lentLoading || borrowedLoading;
  const error = lentError || borrowedError;

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

  const lent = lentData?.data ?? [];
  const borrowed = borrowedData?.data ?? [];
  const allP2P = [...lent, ...borrowed];

  if (allP2P.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("emptyStates.p2p.title")}
        description={t("emptyStates.p2p.description")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {allP2P.map((debt) => (
        <div
          key={debt.id}
          className="rounded-xl bg-card p-6 shadow-sm border border-border"
        >
          <p className="font-bold text-foreground">{debt.name}</p>
          <p className="text-sm text-muted-foreground">{debt.type}</p>
        </div>
      ))}
    </div>
  );
}
