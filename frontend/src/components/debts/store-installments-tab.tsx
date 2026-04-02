"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Store, ShoppingBag, CheckCircle2, ChevronDown } from "lucide-react";
import { useInstallments } from "@/hooks/use-installments";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { ProgressBar } from "@/components/shared/progress-bar";
import { StatusBadge } from "@/components/debts/status-badge";
import { InstallmentForm } from "@/components/debts/installment-form";
import { formatAmount, formatAmountAr, CURRENCIES } from "@/lib/money";
import type { InstallmentResponse } from "@/lib/types/debts";

export function StoreInstallmentsTab() {
  const t = useTranslations();
  const tInstallment = useTranslations("debts.installment");
  const locale = useLocale();
  const { data, isLoading, error } = useInstallments({ type: "store" });
  const [showCompleted, setShowCompleted] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
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
        icon={Store}
        title={t("emptyStates.installments.title")}
        description={t("emptyStates.installments.description")}
        action={{
          label: t("debts.actions.addInstallment"),
          onClick: () => setShowCreateForm(true),
        }}
      />
    );
  }

  const active = plans.filter((p) => p.status === "active");
  const completed = plans.filter((p) => p.status === "completed");
  const baseCurrency = plans[0]?.currency ?? "EGP";

  const totalMonthly = active.reduce((s, p) => s + p.monthly_amount_minor, 0);
  const fmt = (minor: number) =>
    locale === "ar"
      ? `${formatAmountAr(minor, baseCurrency)} ${CURRENCIES[baseCurrency]?.symbol ?? baseCurrency}`
      : `${formatAmount(minor, baseCurrency)} ${CURRENCIES[baseCurrency]?.symbol ?? baseCurrency}`;

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          icon={ShoppingBag}
          label={t("debts.summary.monthlyPayments")}
          value={fmt(totalMonthly)}
        />
        <StatCard
          icon={Store}
          label={tInstallment("activeInstallments")}
          value={tInstallment("activePlansCount", { count: active.length })}
          trend={{
            direction: "flat",
            text: `${tInstallment("remaining")}: ${fmt(active.reduce((s, p) => s + p.remaining_minor, 0))}`,
          }}
        />
      </div>

      {/* Active Plans */}
      {active.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {tInstallment("activeInstallments")}
          </h3>
          <div className="space-y-4">
            {active.map((plan) => (
              <StorePlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>
      )}

      {/* Completed Section */}
      {completed.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full flex items-center justify-between p-4 bg-muted/50 rounded-xl text-foreground hover:bg-muted transition-colors"
          >
            <span className="font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              {tInstallment("completedPlans")} ({completed.length})
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                showCompleted ? "rotate-180" : ""
              }`}
            />
          </button>
          {showCompleted && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {completed.map((plan) => (
                <div
                  key={plan.id}
                  className="p-4 bg-card/60 border border-border rounded-xl flex justify-between items-center opacity-70"
                >
                  <div>
                    <h5 className="text-sm font-bold text-muted-foreground">
                      {plan.merchant_name
                        ? `${plan.merchant_name} — ${plan.name}`
                        : plan.name}
                    </h5>
                    <p className="text-xs text-muted-foreground/60">
                      <MoneyDisplay
                        amount={plan.total_amount_minor}
                        currency={plan.currency}
                        size="sm"
                        showCurrency
                      />{" "}
                      {tInstallment("totalPaid")}
                    </p>
                  </div>
                  <StatusBadge status="completed" />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <InstallmentForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        defaultType="store"
      />
    </div>
  );
}

/* ── Store Plan Card (inline sub-component) ── */
function StorePlanCard({ plan }: { plan: InstallmentResponse }) {
  const tInstallment = useTranslations("debts.installment");
  const progressPct =
    plan.total_months > 0
      ? Math.round((plan.months_paid / plan.total_months) * 100)
      : 0;

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-foreground">
              {plan.merchant_name
                ? `${plan.merchant_name} — ${plan.name}`
                : plan.name}
            </h4>
            <StatusBadge status="active" />
          </div>
        </div>
        <div className="text-end">
          <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">
            {tInstallment("monthlyPayment")}
          </p>
          <MoneyDisplay
            amount={plan.monthly_amount_minor}
            currency={plan.currency}
            size="md"
            className="font-bold text-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-4">
        <div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">
            {tInstallment("totalAmount")}
          </p>
          <MoneyDisplay
            amount={plan.total_amount_minor}
            currency={plan.currency}
            size="sm"
            className="font-semibold"
          />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">
            {tInstallment("duration")}
          </p>
          <span className="text-sm font-semibold text-foreground">
            {tInstallment("monthsLabel", { count: plan.total_months })}
          </span>
        </div>
        <div className="text-end">
          <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">
            {tInstallment("remaining")}
          </p>
          <MoneyDisplay
            amount={plan.remaining_minor}
            currency={plan.currency}
            size="sm"
            className="font-semibold"
          />
        </div>
      </div>

      <ProgressBar value={progressPct} showLabel colorClass="bg-primary" />
    </div>
  );
}
