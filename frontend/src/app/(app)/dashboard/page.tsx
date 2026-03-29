"use client";

import { useTranslations } from "next-intl";
import { TrendingUp, ShoppingCart, HandCoins, Clock } from "lucide-react";
import { StatCardPlaceholder } from "@/components/dashboard/stat-card-placeholder";

export default function DashboardPage() {
  const t = useTranslations("dashboard");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
      <p className="text-muted-foreground mb-6 text-sm">{t("subtitle")}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCardPlaceholder label={t("netWorth")} icon={TrendingUp} comingSoon={t("comingSoon")} />
        <StatCardPlaceholder label={t("monthlySpending")} icon={ShoppingCart} comingSoon={t("comingSoon")} />
        <StatCardPlaceholder label={t("activeDebts")} icon={HandCoins} comingSoon={t("comingSoon")} />
        <StatCardPlaceholder label={t("upcoming")} icon={Clock} comingSoon={t("comingSoon")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-xl border bg-muted/30 flex items-center justify-center h-56 text-muted-foreground text-sm"
          >
            {t("chartsComingSoon")}
          </div>
        ))}
      </div>
    </div>
  );
}
