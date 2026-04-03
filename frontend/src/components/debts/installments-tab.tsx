"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  CreditCard,
  Smartphone,
  Store,
  ChevronDown,
  Package,
  Pencil,
  Trash2,
  Banknote,
} from "lucide-react";
import { useInstallments, useDeleteInstallment } from "@/hooks/use-installments";
import { useAccounts, type Account } from "@/hooks/use-accounts";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/shared/money-display";
import { ProgressBar } from "@/components/shared/progress-bar";
import { InstallmentPlanRow } from "@/components/debts/installment-plan-row";
import { InstallmentForm } from "@/components/debts/installment-form";
import { BNPLBulkPayment } from "@/components/debts/bnpl-bulk-payment";
import { DeleteConfirmation } from "@/components/shared/delete-confirmation";
import { formatAmount, formatAmountAr, CURRENCIES } from "@/lib/money";
import type { InstallmentResponse, InstallmentType } from "@/lib/types/debts";

interface InstallmentsTabProps {
  onAddClick?: () => void;
}

type SectionType = "credit_card" | "financing_app" | "store";

const SECTION_CONFIG: {
  key: SectionType;
  icon: typeof CreditCard;
  i18nKey: string;
  defaultType: InstallmentType;
}[] = [
  { key: "credit_card", icon: CreditCard, i18nKey: "creditCard", defaultType: "credit_card" },
  { key: "financing_app", icon: Smartphone, i18nKey: "bnpl", defaultType: "financing_app" },
  { key: "store", icon: Store, i18nKey: "store", defaultType: "store" },
];

function groupBy<T>(items: T[], keyFn: (item: T) => number): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

export function InstallmentsTab({ onAddClick }: InstallmentsTabProps) {
  const t = useTranslations("installments");
  const tDebts = useTranslations("debts");
  const tDetail = useTranslations("debts.detail");
  const locale = useLocale();
  const { data, isLoading, error } = useInstallments();
  const { data: accountsResponse } = useAccounts();
  const accounts = accountsResponse?.data ?? [];
  const deleteMutation = useDeleteInstallment();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    credit_card: true,
    financing_app: true,
    store: true,
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createDefaultType, setCreateDefaultType] = useState<InstallmentType>("credit_card");
  const [editingPlan, setEditingPlan] = useState<InstallmentResponse | null>(null);
  const [bulkPayOpen, setBulkPayOpen] = useState(false);

  const allPlans = data?.data ?? [];

  // Group plans by type
  const plansByType = useMemo(() => {
    const map: Record<SectionType, InstallmentResponse[]> = {
      credit_card: [],
      financing_app: [],
      store: [],
    };
    for (const plan of allPlans) {
      if (plan.type in map) {
        map[plan.type as SectionType].push(plan);
      }
    }
    return map;
  }, [allPlans]);

  const accountMap = useMemo(() => {
    const map = new Map<number, Account>();
    for (const acc of accounts) {
      map.set(acc.id, acc);
    }
    return map;
  }, [accounts]);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fmt = (minor: number, currency: string) =>
    locale === "ar"
      ? `${formatAmountAr(minor, currency)} ${CURRENCIES[currency]?.symbol ?? currency}`
      : `${formatAmount(minor, currency)} ${CURRENCIES[currency]?.symbol ?? currency}`;

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
        {error.message}
      </p>
    );
  }

  if (allPlans.length === 0) {
    return (
      <>
        <EmptyState
          icon={Package}
          title={t("noPlans")}
          description={tDebts("subtitle")}
          action={
            onAddClick
              ? { label: tDebts("actions.addInstallment"), onClick: onAddClick }
              : {
                  label: tDebts("actions.addInstallment"),
                  onClick: () => setShowCreateForm(true),
                }
          }
        />
        <InstallmentForm
          open={showCreateForm}
          onOpenChange={setShowCreateForm}
          defaultType={createDefaultType}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {SECTION_CONFIG.map(({ key, icon: Icon, i18nKey, defaultType }) => {
        const sectionPlans = plansByType[key];
        if (sectionPlans.length === 0) return null;

        const isOpen = openSections[key] ?? true;
        const isBnpl = key === "financing_app";

        // Group plans by source_account_id
        const plansByAccount = groupBy(sectionPlans, (p) => p.source_account_id ?? 0);

        return (
          <section key={key} className="rounded-xl border border-border overflow-hidden">
            {/* Section Header */}
            <div
              className={`w-full flex items-center justify-between p-4 transition-colors ${
                isBnpl
                  ? "bg-violet-50 dark:bg-violet-950/20 hover:bg-violet-100 dark:hover:bg-violet-950/30"
                  : "bg-muted/50 hover:bg-muted"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleSection(key)}
                className="font-bold flex items-center gap-2 bg-transparent border-none cursor-pointer p-0"
              >
                <Icon className={`h-4 w-4 ${isBnpl ? "text-violet-600 dark:text-violet-400" : ""}`} />
                {t(i18nKey)}
                <span className="text-sm text-muted-foreground font-normal">
                  ({sectionPlans.length})
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isBnpl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBulkPayOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors"
                >
                  <Banknote className="h-3.5 w-3.5" />
                  {t("bulkPay")}
                </button>
              )}
            </div>

            {/* Section Content */}
            {isOpen && (
              <div className="p-4 space-y-4">
                {Array.from(plansByAccount.entries()).map(([accountId, plans]) => {
                  const account = accountId > 0 ? accountMap.get(accountId) : null;
                  const accountName = account
                    ? locale === "ar" && account.name_ar
                      ? account.name_ar
                      : account.name
                    : tDebts("installment.unlinkedPlans");

                  const activePlans = plans.filter((p) => p.status === "active");
                  const monthlyTotal = activePlans.reduce(
                    (sum, p) => sum + p.monthly_amount_minor,
                    0
                  );
                  const baseCurrency = plans[0]?.currency ?? "EGP";

                  // Utilization for credit cards / financing apps
                  const creditLimit = account?.credit_limit ?? 0;
                  const totalCommitted = plans.reduce(
                    (sum, p) => sum + p.remaining_minor,
                    0
                  );
                  const utilPct =
                    creditLimit > 0
                      ? Math.min(100, Math.round((totalCommitted / creditLimit) * 100))
                      : 0;
                  const showUtilization =
                    (key === "credit_card" || key === "financing_app") && creditLimit > 0;

                  return (
                    <div
                      key={accountId}
                      className={`border border-border rounded-lg overflow-hidden ${
                        isBnpl ? "border-s-4 border-s-violet-500" : ""
                      }`}
                    >
                      {/* Account header */}
                      <div className="p-4 bg-card flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-foreground">{accountName}</h4>
                          <p className="text-xs text-muted-foreground">
                            {t("activePlans", { count: activePlans.length })}
                            {" · "}
                            {t("monthlyCommitment", {
                              amount: fmt(monthlyTotal, baseCurrency),
                            })}
                            {showUtilization && (
                              <>
                                {" · "}
                                {t("utilized", { percent: utilPct })}
                              </>
                            )}
                          </p>
                          {showUtilization && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {t("creditLimit", {
                                amount: fmt(creditLimit, baseCurrency),
                              })}
                            </p>
                          )}
                        </div>
                        {showUtilization && (
                          <div className="w-24">
                            <ProgressBar
                              value={utilPct}
                              size="sm"
                              colorClass={
                                isBnpl
                                  ? "bg-violet-500"
                                  : utilPct >= 80
                                    ? "bg-red-500"
                                    : utilPct >= 50
                                      ? "bg-amber-500"
                                      : "bg-green-500"
                              }
                              showLabel
                            />
                          </div>
                        )}
                      </div>

                      {/* Plans */}
                      <div className="divide-y divide-border">
                        {plans.map((plan) => (
                          <div key={plan.id} className="relative group">
                            <div className="px-4 py-3">
                              <InstallmentPlanRow
                                plan={plan}
                                showAccentBorder={false}
                              />
                            </div>
                            <div
                              className="absolute top-2 end-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 bg-background/80 backdrop-blur text-muted-foreground hover:text-foreground"
                                onClick={() => setEditingPlan(plan)}
                                aria-label={tDetail("edit")}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <DeleteConfirmation
                                itemName={plan.name}
                                onConfirm={() => deleteMutation.mutate(plan.id)}
                                isPending={deleteMutation.isPending}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 bg-background/80 backdrop-blur text-muted-foreground hover:text-destructive"
                                    aria-label={tDetail("delete")}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {/* Create / Edit forms */}
      <InstallmentForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        defaultType={createDefaultType}
      />

      {editingPlan && (
        <InstallmentForm
          open={!!editingPlan}
          onOpenChange={(open) => {
            if (!open) setEditingPlan(null);
          }}
          initialData={editingPlan}
          defaultType={editingPlan.type}
        />
      )}

      <BNPLBulkPayment open={bulkPayOpen} onOpenChange={setBulkPayOpen} />
    </div>
  );
}
