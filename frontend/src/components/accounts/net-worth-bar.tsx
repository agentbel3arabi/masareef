"use client";

import { useTranslations, useLocale } from "next-intl";
import { TrendingUp } from "lucide-react";
import { useNetWorth } from "@/hooks/use-accounts";
import { formatAmount, formatAmountAr, CURRENCIES } from "@/lib/money";

export function NetWorthBar() {
  const t = useTranslations("accounts");
  const locale = useLocale();
  const { data, isLoading } = useNetWorth();

  if (isLoading) {
    return (
      <div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 p-5 mb-6 animate-pulse h-24" />
    );
  }

  if (!data?.data) return null;

  const { by_currency, total_base_minor, base_currency, account_count } = data.data;
  const currencyCount = Object.keys(by_currency).length;
  const symbol = CURRENCIES[base_currency]?.symbol ?? base_currency;
  const formattedAmount =
    locale === "ar"
      ? formatAmountAr(total_base_minor, base_currency)
      : formatAmount(total_base_minor, base_currency);

  return (
    <div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 p-5 mb-6 text-primary-foreground">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="h-4 w-4 opacity-80" />
        <span className="text-sm font-medium opacity-80">{t("netWorth")}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight tabular-nums">
        {formattedAmount}
        <span className="text-xl font-medium opacity-80 ms-2">{symbol}</span>
      </p>
      <div className="flex gap-4 mt-2 text-sm opacity-80">
        <span>{t("accountCount", { count: account_count })}</span>
        {currencyCount > 1 && (
          <span>{t("currencyCount", { count: currencyCount })}</span>
        )}
      </div>
    </div>
  );
}
