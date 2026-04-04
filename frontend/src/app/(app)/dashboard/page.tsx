"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { TrendingUp, ShoppingCart, HandCoins, Clock } from "lucide-react";
import { useAccounts, useNetWorth } from "@/hooks/use-accounts";
import { useDebts } from "@/hooks/use-debts";
import { useInstallments } from "@/hooks/use-installments";
import { useTransactions } from "@/hooks/use-transactions";
import { useTransactionSummary } from "@/hooks/use-transaction-summary";
import { StatCard } from "@/components/shared/stat-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { GettingStartedCard } from "@/components/dashboard/getting-started-card";
import { AccountsGlance } from "@/components/dashboard/accounts-glance";
import { MonthActivity } from "@/components/dashboard/month-activity";
import { formatAmount, formatAmountAr } from "@/lib/money";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { data: nwResponse, isLoading: netWorthLoading } = useNetWorth();
  const nw = nwResponse?.data;

  const { data: debtsData, isLoading: debtsLoading } = useDebts({
    status: "active",
  });
  const { data: installmentsData, isLoading: installmentsLoading } =
    useInstallments({ status: "active" });
  const { data: accountsData } = useAccounts();
  const { data: transactionsData } = useTransactions({ page_size: 1 });
  const { data: summaryData, isLoading: summaryLoading } =
    useTransactionSummary({ period: "month" });
  const summary = summaryData?.data;

  const activeDebtsCount =
    (debtsData?.data?.length ?? 0) + (installmentsData?.data?.length ?? 0);
  const debtsStatsLoading = debtsLoading || installmentsLoading;

  const activeDebtsValue = debtsStatsLoading
    ? "..."
    : activeDebtsCount > 0
      ? String(activeDebtsCount)
      : t("noDebts");

  const netWorthMinor = nw?.total_base_minor ?? 0;

  const netWorthValue = netWorthLoading
    ? "..."
    : nw
      ? locale === "ar"
        ? formatAmountAr(nw.total_base_minor, nw.base_currency)
        : formatAmount(nw.total_base_minor, nw.base_currency)
      : "—";

  const fmt = (amount: number, currency: string) =>
    locale === "ar"
      ? formatAmountAr(amount, currency)
      : formatAmount(amount, currency);

  const monthlyIncomeValue = summaryLoading
    ? "..."
    : summary
      ? `+${fmt(summary.total_income, summary.currency)}`
      : "—";

  const monthlySpendingValue = summaryLoading
    ? "..."
    : summary
      ? fmt(summary.total_expenses, summary.currency)
      : "—";

  // Getting started state
  const hasAccounts = (accountsData?.data?.length ?? 0) > 0;
  const hasTransactions = (transactionsData?.meta?.total ?? 0) > 0;
  const hasDebts = activeDebtsCount > 0;
  const isNewUser = !hasAccounts;

  const [dismissed, setDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("masareef_onboarding_dismissed") === "true"
  );

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("masareef_onboarding_dismissed", "true");
  };

  return (
    <div className="space-y-6">
      {/* Getting Started card for new users */}
      {!dismissed && (!hasAccounts || !hasTransactions) && (
        <GettingStartedCard
          hasAccounts={hasAccounts}
          hasTransactions={hasTransactions}
          hasDebts={hasDebts}
          onDismiss={handleDismiss}
        />
      )}

      {/* Stat cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label={t("netWorth")}
          value={netWorthValue}
          variant={
            netWorthLoading
              ? "accent"
              : netWorthMinor >= 0
                ? "success"
                : "destructive"
          }
        />
        <StatCard
          icon={ShoppingCart}
          label={t("monthlyIncome")}
          value={monthlyIncomeValue}
          variant={
            summaryLoading
              ? "accent"
              : summary && summary.total_income > 0
                ? "success"
                : "default"
          }
        />
        <StatCard
          icon={HandCoins}
          label={t("monthlySpending")}
          value={monthlySpendingValue}
          variant={
            summaryLoading
              ? "accent"
              : summary && summary.total_expenses > 0
                ? "destructive"
                : "default"
          }
        />
        <Link href="/debts" className="block">
          <StatCard
            icon={Clock}
            label={t("activeDebts")}
            value={activeDebtsValue}
            trend={
              activeDebtsCount > 0
                ? {
                    direction: "flat",
                    text: t("activeDebtsCount", { count: activeDebtsCount }),
                  }
                : undefined
            }
            className="cursor-pointer hover:shadow-md transition-shadow"
          />
        </Link>
      </div>

      {/* Accounts Glance + Month Activity + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Accounts + Month Activity — 2/3 width */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AccountsGlance />
          <MonthActivity />
        </div>

        {/* Recent transactions — 1/3 width */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">
              {t("recentTransactions")}
            </h2>
            <Link
              href="/transactions"
              className="text-xs text-primary hover:underline"
            >
              {t("viewAll")}
            </Link>
          </div>
          <RecentTransactions />
        </div>
      </div>
    </div>
  );
}
