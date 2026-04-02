"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Pencil, Smartphone, Receipt, Plus, Trash2 } from "lucide-react";
import { useInstallments, useFinancingAppsSummary, useDeleteInstallment } from "@/hooks/use-installments";
import { EmptyState } from "@/components/shared/empty-state";
import { MoneyDisplay } from "@/components/shared/money-display";
import { FinancingAppProviderCard } from "@/components/debts/financing-app-provider-card";
import { InstallmentPlanRow } from "@/components/debts/installment-plan-row";
import { InstallmentForm } from "@/components/debts/installment-form";
import { DeleteConfirmation } from "@/components/shared/delete-confirmation";
import type { InstallmentResponse } from "@/lib/types/debts";

export function FinancingAppsTab() {
  const t = useTranslations();
  const locale = useLocale();
  const { data: plansData, isLoading: plansLoading, error: plansError } =
    useInstallments({ type: "financing_app" });
  const { data: summaryData, isLoading: summaryLoading } =
    useFinancingAppsSummary();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InstallmentResponse | null>(null);
  const deleteMutation = useDeleteInstallment();
  const tDetail = useTranslations("debts.detail");

  const isLoading = plansLoading || summaryLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (plansError) {
    return (
      <p className="text-destructive text-sm">
        {t("error.title")}: {plansError.message}
      </p>
    );
  }

  const plans = plansData?.data ?? [];
  const summary = summaryData?.data;

  if (plans.length === 0 && (!summary || summary.apps.length === 0)) {
    return (
      <>
        <EmptyState
          icon={Smartphone}
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
          defaultType="financing_app"
        />
      </>
    );
  }

  // Group plans by source_account_id (which is the financing app account)
  const grouped = new Map<number, InstallmentResponse[]>();
  for (const plan of plans) {
    const key = plan.source_account_id ?? 0;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(plan);
  }

  // Summary endpoint returns totals without explicit currency; default to EGP
  // TODO: Add currency to FinancingAppsSummary.totals when backend supports it
  const baseCurrency = summary?.totals
    ? "EGP"
    : plans[0]?.currency ?? "EGP";

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

      {/* Provider Overview Cards */}
      {summary && summary.apps.length > 0 && (
        <section>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {t("debts.financingApps.providersOverview")}
          </h2>
          <div className="flex gap-6 overflow-x-auto pb-4 -mx-2 px-2">
            {summary.apps.map((app) => (
              <FinancingAppProviderCard
                key={app.account_id}
                app={app}
                currency={baseCurrency}
              />
            ))}
          </div>
        </section>
      )}

      {/* Plans Grouped by Provider */}
      {summary && summary.apps.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            {t("debts.financingApps.installmentBreakdown")}
          </h2>
          {summary.apps.map((app) => {
            const appPlans = grouped.get(app.account_id) ?? [];
            if (appPlans.length === 0 && app.active_plans_count === 0) {
              return (
                <div key={app.account_id} className="space-y-3">
                  <h3 className="text-sm font-bold text-muted-foreground">
                    {locale === "ar" && app.name_ar ? app.name_ar : app.name} — {t("debts.financingApps.noActivePlans")}
                  </h3>
                  <div className="py-8 text-center border-2 border-dashed border-border rounded-xl bg-muted/20">
                    <Receipt className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {t("debts.financingApps.noPlansYet", { name: locale === "ar" && app.name_ar ? app.name_ar : app.name })}
                    </p>
                  </div>
                </div>
              );
            }
            return (
              <div key={app.account_id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    {locale === "ar" && app.name_ar ? app.name_ar : app.name} —{" "}
                    {t("debts.financingApps.activePlansLabel", { count: app.active_plans_count })}
                  </h3>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-3">
                  {appPlans.map((plan) => (
                    <div key={plan.id} className="relative group">
                      <InstallmentPlanRow
                        plan={plan}
                        showAccentBorder={false}
                      />
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
              </div>
            );
          })}
        </section>
      )}

      {/* BNPL Summary Footer */}
      {summary && (
        <section className="bg-muted/50 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 border border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {t("debts.financingApps.bnplSummary")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("debts.financingApps.bnplDescription")}
            </p>
          </div>
          <div className="flex gap-8 text-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                {t("debts.financingApps.totalMonthly")}
              </p>
              <MoneyDisplay
                amount={summary.totals.total_monthly_minor}
                currency={baseCurrency}
                size="lg"
                className="text-primary"
              />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                {t("debts.financingApps.totalRemaining")}
              </p>
              <MoneyDisplay
                amount={summary.totals.total_remaining_minor}
                currency={baseCurrency}
                size="lg"
              />
            </div>
          </div>
        </section>
      )}

      <InstallmentForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        defaultType="financing_app"
      />

      {editingPlan && (
        <InstallmentForm
          open={!!editingPlan}
          onOpenChange={(open) => { if (!open) setEditingPlan(null); }}
          initialData={editingPlan}
          defaultType="financing_app"
        />
      )}
    </div>
  );
}
