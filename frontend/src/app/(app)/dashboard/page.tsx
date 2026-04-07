"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { TrendingUp, ShoppingCart, HandCoins, Clock } from "lucide-react";
import { useAccounts, useNetWorth } from "@/hooks/use-accounts";
import { useDebts } from "@/hooks/use-debts";
import { useInstallments } from "@/hooks/use-installments";
import { useTransactions } from "@/hooks/use-transactions";
import { useUpdateHouseholdSettings } from "@/hooks/use-households";
import {
  useStatCards,
  useIncomeVsExpenses,
  useSpendingByCategory,
  useNetWorthTrend,
} from "@/hooks/use-dashboard";
import { StatCard } from "@/components/shared/stat-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { GettingStartedCard } from "@/components/dashboard/getting-started-card";
import { AccountsGlance } from "@/components/dashboard/accounts-glance";
import { NetWorthChart } from "@/components/dashboard/net-worth-chart";
import { IncomeExpensesChart } from "@/components/dashboard/income-expenses-chart";
import { SpendingByCategoryChart } from "@/components/dashboard/spending-by-category-chart";
import { ChartGrid } from "@/components/dashboard/chart-grid";
import {
  TimeRangeToggle,
  timeRangeToMonths,
  type TimeRange,
} from "@/components/dashboard/time-range-toggle";
import { CompareToggle } from "@/components/dashboard/compare-toggle";
import { BaseCurrencySelector } from "@/components/dashboard/base-currency-selector";
import { DeltaSummaryCard } from "@/components/dashboard/delta-summary-card";
import { ChartSkeleton } from "@/components/dashboard/chart-skeleton";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount, formatAmountAr } from "@/lib/money";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  // --- State ---
  const [timeRange, setTimeRange] = useState<TimeRange>("6M");
  const [compareEnabled, setCompareEnabled] = useState(false);

  // Get initial base currency from net worth endpoint (household's base currency)
  const { data: nwResponse } = useNetWorth();
  const nw = nwResponse?.data;
  const [baseCurrency, setBaseCurrency] = useState("EGP");

  // Sync base currency from household data on first load
  const initialCurrency = nw?.base_currency;
  useEffect(() => {
    if (initialCurrency) {
      setBaseCurrency(initialCurrency);
    }
  }, [initialCurrency]);

  const updateHouseholdSettings = useUpdateHouseholdSettings();

  const handleCurrencyChange = (newCurrency: string) => {
    const previousCurrency = baseCurrency;
    setBaseCurrency(newCurrency);
    updateHouseholdSettings.mutate(
      { base_currency: newCurrency },
      { onError: () => setBaseCurrency(previousCurrency) }
    );
  };

  // --- Dashboard data hooks ---
  const months = timeRangeToMonths(timeRange);
  const {
    data: statCardsRes,
    isLoading: statCardsLoading,
    isError: statCardsError,
    refetch: refetchStatCards,
  } = useStatCards({ base_currency: baseCurrency });
  const statCards = statCardsRes?.data;

  const {
    data: incomeExpensesRes,
    isLoading: incomeExpensesLoading,
    isError: incomeExpensesError,
    refetch: refetchIncomeExpenses,
  } = useIncomeVsExpenses({ months, base_currency: baseCurrency });
  const incomeExpensesData = incomeExpensesRes?.data ?? [];

  const {
    data: spendingRes,
    isLoading: spendingLoading,
    isError: spendingError,
    refetch: refetchSpending,
  } = useSpendingByCategory({ base_currency: baseCurrency });
  const spendingData = spendingRes?.data ?? [];

  const {
    data: netWorthTrendRes,
    isLoading: netWorthTrendLoading,
    isError: netWorthTrendError,
    refetch: refetchNetWorthTrend,
  } = useNetWorthTrend({ months, base_currency: baseCurrency });
  const netWorthTrendData = netWorthTrendRes?.data ?? [];

  // --- Existing data for getting started ---
  const { data: accountsData } = useAccounts();
  const { data: transactionsData } = useTransactions({ page_size: 1 });
  const { data: debtsData, isLoading: debtsLoading } = useDebts({ status: "active" });
  const { data: installmentsData, isLoading: installmentsLoading } = useInstallments({
    status: "active",
  });

  const activeDebtsCount =
    (debtsData?.data?.length ?? 0) + (installmentsData?.data?.length ?? 0);

  const hasAccounts = (accountsData?.data?.length ?? 0) > 0;
  const hasTransactions = (transactionsData?.meta?.total ?? 0) > 0;
  const hasDebts = activeDebtsCount > 0;
  const [dismissed, setDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("masareef_onboarding_dismissed") === "true"
  );

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("masareef_onboarding_dismissed", "true");
  };

  // --- Formatting helpers ---
  const fmt = (amount: number, currency: string) =>
    locale === "ar" ? formatAmountAr(amount, currency) : formatAmount(amount, currency);

  // --- Compare delta calculation ---
  const showDelta = compareEnabled && incomeExpensesData.length >= 2;
  const currentMonthExpenses =
    incomeExpensesData.length >= 1
      ? incomeExpensesData[incomeExpensesData.length - 1].expenses_minor
      : 0;
  const previousMonthExpenses =
    incomeExpensesData.length >= 2
      ? incomeExpensesData[incomeExpensesData.length - 2].expenses_minor
      : 0;

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

      {/* Toolbar row: currency selector + time range toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <BaseCurrencySelector value={baseCurrency} onChange={handleCurrencyChange} />
        <TimeRangeToggle value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {statCardsLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-28" />
                  </div>
                </div>
                <Skeleton className="h-3 w-24 mt-2" />
              </Card>
            ))}
          </>
        ) : statCardsError ? (
          <Card className="col-span-full p-4 text-center">
            <p className="text-sm text-destructive">{t("couldntLoadDashboard")}</p>
            <button
              onClick={() => refetchStatCards()}
              className="text-xs text-primary mt-1 hover:underline"
            >
              {t("tapToRetry")}
            </button>
          </Card>
        ) : statCards ? (
          <>
            <StatCard
              icon={TrendingUp}
              label={t("netWorth")}
              value={fmt(statCards.net_worth.value_minor, statCards.net_worth.currency)}
              variant={statCards.net_worth.value_minor >= 0 ? "success" : "destructive"}
              trend={
                statCards.net_worth.trend
                  ? {
                      direction: statCards.net_worth.trend.direction,
                      text: fmt(
                        statCards.net_worth.trend.absolute_delta,
                        statCards.net_worth.currency
                      ),
                      percentChange: statCards.net_worth.trend.percentage,
                    }
                  : undefined
              }
            />
            <StatCard
              icon={ShoppingCart}
              label={t("spentThisMonth")}
              value={fmt(statCards.spending.value_minor, statCards.spending.currency)}
              variant={statCards.spending.value_minor > 0 ? "destructive" : "default"}
              trend={
                statCards.spending.trend
                  ? {
                      direction: statCards.spending.trend.direction,
                      text: fmt(
                        statCards.spending.trend.absolute_delta,
                        statCards.spending.currency
                      ),
                      percentChange: statCards.spending.trend.percentage,
                    }
                  : undefined
              }
            />
            <StatCard
              icon={HandCoins}
              label={t("activeDebts")}
              value={
                statCards.active_debts.count != null
                  ? String(statCards.active_debts.count)
                  : t("noDebts")
              }
              variant="default"
              trend={
                statCards.active_debts.trend
                  ? {
                      direction: statCards.active_debts.trend.direction,
                      text: fmt(
                        statCards.active_debts.trend.absolute_delta,
                        statCards.active_debts.currency
                      ),
                      percentChange: statCards.active_debts.trend.percentage,
                    }
                  : undefined
              }
            />
            <StatCard
              icon={Clock}
              label={t("dueNext30Days")}
              value={fmt(
                statCards.upcoming_payments.value_minor,
                statCards.upcoming_payments.currency
              )}
              variant="default"
              trend={
                statCards.upcoming_payments.trend
                  ? {
                      direction: statCards.upcoming_payments.trend.direction,
                      text: fmt(
                        statCards.upcoming_payments.trend.absolute_delta,
                        statCards.upcoming_payments.currency
                      ),
                      percentChange: statCards.upcoming_payments.trend.percentage,
                    }
                  : undefined
              }
            />
          </>
        ) : null}
      </div>

      {/* Chart grid row 1: Net Worth (8 cols) + Income vs Expenses (4 cols) */}
      <ChartGrid>
        <Card className="lg:col-span-8 p-8">
          <h3 className="text-xl font-bold mb-4">{t("netWorthTrend")}</h3>
          {netWorthTrendLoading ? (
            <ChartSkeleton variant="area" className="border-0 p-0" />
          ) : netWorthTrendError ? (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-sm text-destructive">{t("couldntLoadChart")}</p>
              <button
                onClick={() => refetchNetWorthTrend()}
                className="text-xs text-primary mt-1 hover:underline"
              >
                {t("tapToRetry")}
              </button>
            </div>
          ) : (
            <NetWorthChart data={netWorthTrendData} baseCurrency={baseCurrency} />
          )}
        </Card>

        <Card className="lg:col-span-4 p-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">{t("cashFlow")}</h3>
            <CompareToggle enabled={compareEnabled} onChange={setCompareEnabled} />
          </div>
          {showDelta && (
            <div className="mb-3">
              <DeltaSummaryCard
                currentMinor={currentMonthExpenses}
                previousMinor={previousMonthExpenses}
                currency={baseCurrency}
              />
            </div>
          )}
          {incomeExpensesLoading ? (
            <ChartSkeleton variant="bar" className="border-0 p-0" />
          ) : incomeExpensesError ? (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-sm text-destructive">{t("couldntLoadChart")}</p>
              <button
                onClick={() => refetchIncomeExpenses()}
                className="text-xs text-primary mt-1 hover:underline"
              >
                {t("tapToRetry")}
              </button>
            </div>
          ) : (
            <IncomeExpensesChart
              data={incomeExpensesData}
              baseCurrency={baseCurrency}
              compareEnabled={compareEnabled}
            />
          )}
        </Card>
      </ChartGrid>

      {/* Chart grid row 2: Spending by Category (full width per D-03) */}
      <ChartGrid>
        <Card className="lg:col-span-12 p-8">
          <h3 className="text-xl font-bold mb-4">{t("spendingByCategory")}</h3>
          {spendingLoading ? (
            <ChartSkeleton variant="donut" className="border-0 p-0" />
          ) : spendingError ? (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-sm text-destructive">{t("couldntLoadChart")}</p>
              <button
                onClick={() => refetchSpending()}
                className="text-xs text-primary mt-1 hover:underline"
              >
                {t("tapToRetry")}
              </button>
            </div>
          ) : (
            <SpendingByCategoryChart data={spendingData} baseCurrency={baseCurrency} />
          )}
        </Card>
      </ChartGrid>

      {/* Bottom section: Accounts Glance + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AccountsGlance />
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">{t("recentTransactions")}</h2>
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
