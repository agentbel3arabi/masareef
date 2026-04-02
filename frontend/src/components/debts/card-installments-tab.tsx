"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { useInstallments, useDeleteInstallment } from "@/hooks/use-installments";
import { useAccounts } from "@/hooks/use-accounts";
import { EmptyState } from "@/components/shared/empty-state";
import { CardUtilizationSummary } from "@/components/debts/card-utilization-summary";
import { InstallmentPlanRow } from "@/components/debts/installment-plan-row";
import { InstallmentForm } from "@/components/debts/installment-form";
import { DeleteConfirmation } from "@/components/shared/delete-confirmation";
import type { InstallmentResponse } from "@/lib/types/debts";

export function CardInstallmentsTab() {
  const t = useTranslations();
  const { data, isLoading, error } = useInstallments({ type: "credit_card" });
  const { data: accountsResponse } = useAccounts();
  const accounts = accountsResponse?.data ?? [];
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InstallmentResponse | null>(null);
  const deleteMutation = useDeleteInstallment();
  const tDetail = useTranslations("debts.detail");

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
      <>
        <EmptyState
          icon={CreditCard}
          title={t("emptyStates.installments.title")}
          description={t("emptyStates.installments.description")}
          action={{
            label: t("debts.actions.addInstallment"),
            onClick: () => setShowCreateForm(true),
          }}
        />
        <InstallmentForm
          open={showCreateForm}
          onOpenChange={setShowCreateForm}
          defaultType="credit_card"
        />
      </>
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
      {/* Add Installment Button */}
      <button
        type="button"
        onClick={() => setShowCreateForm(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        {t("debts.actions.addInstallment")}
      </button>

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
                    — {t("debts.installment.activePlansLabel", { count: cardPlans.filter((p) => p.status === "active").length })}
                  </span>
                </div>
                <div className="space-y-3">
                  {cardPlans.map((plan) => (
                    <div key={plan.id} className="relative group">
                      <InstallmentPlanRow plan={plan} />
                      <div className="absolute top-2 end-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setEditingPlan(plan)}
                          className="inline-flex items-center p-1.5 rounded-md bg-background/80 backdrop-blur text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          aria-label={tDetail("edit")}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <DeleteConfirmation
                          itemName={plan.name}
                          onConfirm={() => deleteMutation.mutate(plan.id)}
                          isPending={deleteMutation.isPending}
                          trigger={
                            <button
                              type="button"
                              className="inline-flex items-center p-1.5 rounded-md bg-background/80 backdrop-blur text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              aria-label={tDetail("delete")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

        {/* Plans without a source account */}
        {grouped.has(0) && (
          <section>
            <h4 className="text-base font-bold text-foreground mb-4">
              {t("debts.installment.unlinkedPlans")}
            </h4>
            <div className="space-y-3">
              {grouped.get(0)!.map((plan) => (
                <div key={plan.id} className="relative group">
                  <InstallmentPlanRow plan={plan} />
                  <div className="absolute top-2 end-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setEditingPlan(plan)}
                      className="inline-flex items-center p-1.5 rounded-md bg-background/80 backdrop-blur text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label={tDetail("edit")}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <DeleteConfirmation
                      itemName={plan.name}
                      onConfirm={() => deleteMutation.mutate(plan.id)}
                      isPending={deleteMutation.isPending}
                      trigger={
                        <button
                          type="button"
                          className="inline-flex items-center p-1.5 rounded-md bg-background/80 backdrop-blur text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          aria-label={tDetail("delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      }
                    />
                  </div>
                </div>
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

      {editingPlan && (
        <InstallmentForm
          open={!!editingPlan}
          onOpenChange={(open) => { if (!open) setEditingPlan(null); }}
          initialData={editingPlan}
          defaultType="credit_card"
        />
      )}
    </div>
  );
}
