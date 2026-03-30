"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { TrendingUp, ShoppingCart, HandCoins, Clock, BarChart3 } from "lucide-react";
import { useNetWorth } from "@/hooks/use-accounts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { formatAmount, formatAmountAr } from "@/lib/money";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  // useNetWorth returns { data: ApiResponse<NetWorthData> | undefined, isLoading, ... }
  // The actual NetWorthData lives at data.data
  const { data: nwResponse, isLoading: netWorthLoading } = useNetWorth();
  const nw = nwResponse?.data;

  const netWorthValue = netWorthLoading
    ? "..."
    : nw
    ? locale === "ar"
      ? `${formatAmountAr(nw.total_base_minor, nw.base_currency)} ${nw.base_currency}`
      : `${formatAmount(nw.total_base_minor, nw.base_currency)} ${nw.base_currency}`
    : "—";

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label={t("netWorth")}
          value={netWorthValue}
        />
        <StatCard
          icon={ShoppingCart}
          label={t("monthlySpending")}
          value="—"
          trend={{ direction: "flat", text: t("comingSoonPhase2") }}
        />
        <StatCard
          icon={HandCoins}
          label={t("activeDebts")}
          value="—"
          trend={{ direction: "flat", text: t("comingSoonPhase3") }}
        />
        <StatCard
          icon={Clock}
          label={t("upcoming")}
          value="—"
          trend={{ direction: "flat", text: t("comingSoonPhase3") }}
        />
      </div>

      {/* Recent transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">{t("recentTransactions")}</h2>
          <Link
            href="/transactions"
            className="text-sm text-primary hover:underline"
          >
            {t("viewAll")}
          </Link>
        </div>
        <RecentTransactions />
      </div>

      {/* Chart placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-xl border bg-muted/30 flex flex-col items-center justify-center h-56 gap-3"
          >
            <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("chartsComingSoon")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
