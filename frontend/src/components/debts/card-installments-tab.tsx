"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CreditCard } from "lucide-react";
import { useInstallments } from "@/hooks/use-installments";
import { useAccounts } from "@/hooks/use-accounts";
import { EmptyState } from "@/components/shared/empty-state";
import { CardUtilizationSummary } from "@/components/debts/card-utilization-summary";
import { InstallmentPlanRow } from "@/components/debts/installment-plan-row";
import { InstallmentForm } from "@/components/debts/installment-form";
import type { InstallmentResponse } from "@/lib/types/debts";

export function CardInstallmentsTab() {
  const t = useTranslations();
  const { data, isLoading, error } = useInstallments({ type: "credit_card" });
  const { data: accountsResponse } = useAccounts();
  const accounts = accountsResponse?.data ?? [];
  const [showCreateForm, setShowCreateForm] = useState(false);

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

  const plans = data?.data ?? [];

  if (plans.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title={t("emptyStates.installments.title")}
        description={t("emptyStates.installments.description")}
        action={{
          label: t("debts.actions.addInstallment"),
          onClick: () => setShowCreateForm(true),
        }}
      />
    );
  }

  // Group plans by source_account_id
  const creditCards = accounts.filter((a) => a.type === "credit_card");
  const grouped = new Map<number, InstallmentResponse[]>();
  for (const plan of plans) {
    const key = plan.source_account_id ?? 0;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(plan);
  }

  return (
    <div className="space-y-8">
      {/* Utilization Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {creditCards
          .filter((card) => grouped.has(card.id))
          .map((card) => (
            <CardUtilizationSummary
              key={card.id}
              account={card}
              plans={grouped.get(card.id) ?? []}
            />
          ))}
      </div>

      {/* Plans Grouped by Card */}
      <div className="space-y-8">
        {creditCards
          .filter((card) => grouped.has(card.id))
          .map((card) => {
            const cardPlans = grouped.get(card.id) ?? [];
            return (
              <section key={card.id}>
                <div className="flex items-center gap-2 mb-4">
                  <h4 className="text-base font-bold text-foreground">
                    {card.name}
                  </h4>
                  <span className="text-sm text-muted-foreground">
                    — {cardPlans.filter((p) => p.status === "active").length}{" "}
                    active plans
                  </span>
                </div>
                <div className="space-y-3">
                  {cardPlans.map((plan) => (
                    <InstallmentPlanRow key={plan.id} plan={plan} />
                  ))}
                </div>
              </section>
            );
          })}

        {/* Plans without a source account */}
        {grouped.has(0) && (
          <section>
            <h4 className="text-base font-bold text-foreground mb-4">
              Unlinked Plans
            </h4>
            <div className="space-y-3">
              {grouped.get(0)!.map((plan) => (
                <InstallmentPlanRow key={plan.id} plan={plan} />
              ))}
            </div>
          </section>
        )}
      </div>

      <InstallmentForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        defaultType="credit_card"
      />
    </div>
  );
}
