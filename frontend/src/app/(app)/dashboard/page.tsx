"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { TrendingUp, ShoppingCart, HandCoins, Clock, BarChart3, PieChart } from "lucide-react";
import { useNetWorth } from "@/hooks/use-accounts";
import { useDebts } from "@/hooks/use-debts";
import { useInstallments } from "@/hooks/use-installments";
import { StatCard } from "@/components/shared/stat-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { formatAmount, formatAmountAr } from "@/lib/money";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { data: nwResponse, isLoading: netWorthLoading } = useNetWorth();
  const nw = nwResponse?.data;

  const { data: debtsData, isLoading: debtsLoading } = useDebts({ status: "active" });
  const { data: installmentsData, isLoading: installmentsLoading } = useInstallments({ status: "active" });

  const activeDebtsCount = (debtsData?.data?.length ?? 0) + (installmentsData?.data?.length ?? 0);
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

  return (
    <div className="space-y-6">
      {/* Stat cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label={t("netWorth")}
          value={netWorthValue}
          variant={netWorthLoading ? "accent" : netWorthMinor >= 0 ? "success" : "destructive"}
        />
        <StatCard
          icon={ShoppingCart}
          label={t("monthlyIncome")}
          value="—"
        />
        <StatCard
          icon={HandCoins}
          label={t("monthlySpending")}
          value="—"
        />
        <Link href="/debts" className="block">
          <StatCard
            icon={Clock}
            label={t("activeDebts")}
            value={activeDebtsValue}
            trend={
              activeDebtsCount > 0
                ? { direction: "flat", text: t("activeDebtsCount", { count: activeDebtsCount }) }
                : undefined
            }
            className="cursor-pointer hover:shadow-md transition-shadow"
          />
        </Link>
      </div>

      {/* Charts + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart placeholders — 2/3 width */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-dashed bg-muted/20 flex flex-col items-center justify-center h-56 gap-3">
            <BarChart3 className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground/50">{t("incomeVsExpenses")}</p>
          </div>
          <div className="rounded-xl border border-dashed bg-muted/20 flex flex-col items-center justify-center h-56 gap-3">
            <PieChart className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground/50">{t("spendingByCategory")}</p>
          </div>
        </div>

        {/* Recent transactions — 1/3 width */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">{t("recentTransactions")}</h2>
            <Link href="/transactions" className="text-xs text-primary hover:underline">
              {t("viewAll")}
            </Link>
          </div>
          <RecentTransactions />
        </div>
      </div>
    </div>
  );
}
