"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Smartphone, Receipt } from "lucide-react";
import { useInstallments, useFinancingAppsSummary } from "@/hooks/use-installments";
import { EmptyState } from "@/components/shared/empty-state";
import { MoneyDisplay } from "@/components/shared/money-display";
import { FinancingAppProviderCard } from "@/components/debts/financing-app-provider-card";
import { InstallmentPlanRow } from "@/components/debts/installment-plan-row";
import { InstallmentForm } from "@/components/debts/installment-form";
import type { InstallmentResponse } from "@/lib/types/debts";

export function FinancingAppsTab() {
  const t = useTranslations();
  const { data: plansData, isLoading: plansLoading, error: plansError } =
    useInstallments({ type: "financing_app" });
  const { data: summaryData, isLoading: summaryLoading } =
    useFinancingAppsSummary();
  const [showCreateForm, setShowCreateForm] = useState(false);

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
      <EmptyState
        icon={Smartphone}
        title={t("emptyStates.installments.title")}
        description={t("emptyStates.installments.description")}
        action={{
          label: t("debts.actions.addInstallment"),
          onClick: () => setShowCreateForm(true),
        }}
      />
    );
  }

  // Group plans by source_account_id (which is the financing app account)
  const grouped = new Map<number, InstallmentResponse[]>();
  for (const plan of plans) {
    const key = plan.source_account_id ?? 0;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(plan);
  }

  const baseCurrency = summary?.totals
    ? "EGP"
    : plans[0]?.currency ?? "EGP";

  return (
    <div className="space-y-8">
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
                    {app.name} — No active plans
                  </h3>
                  <div className="py-8 text-center border-2 border-dashed border-border rounded-xl bg-muted/20">
                    <Receipt className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No active installment plans with {app.name} yet.
                    </p>
                  </div>
                </div>
              );
            }
            return (
              <div key={app.account_id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    {app.name}
                    {app.name_ar ? ` (${app.name_ar})` : ""} —{" "}
                    {app.active_plans_count} active plans
                  </h3>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {appPlans.map((plan) => (
                    <InstallmentPlanRow
                      key={plan.id}
                      plan={plan}
                      showAccentBorder={false}
                    />
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
    </div>
  );
}
