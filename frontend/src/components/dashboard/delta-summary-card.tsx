"use client";

import { useTranslations, useLocale } from "next-intl";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatAmount, formatAmountAr } from "@/lib/money";
import { cn } from "@/lib/utils";

interface DeltaSummaryCardProps {
  currentMinor: number;
  previousMinor: number;
  currency: string;
}

export function DeltaSummaryCard({ currentMinor, previousMinor, currency }: DeltaSummaryCardProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const fmt = (v: number) =>
    locale === "ar" ? formatAmountAr(v, currency) : formatAmount(v, currency);

  const delta = currentMinor - previousMinor;
  const pct =
    previousMinor !== 0
      ? Math.round((Math.abs(delta) / Math.abs(previousMinor)) * 100)
      : null;
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;

  return (
    <Card className="p-3 flex items-center justify-between gap-4 text-xs">
      <div className="flex items-center gap-4">
        <span className="text-muted-foreground">
          {t("currentMonth")}:{" "}
          <span className="font-bold text-foreground">{fmt(currentMinor)}</span>
        </span>
        <span className="text-muted-foreground">
          {t("previousMonth")}:{" "}
          <span className="font-bold text-foreground">{fmt(previousMinor)}</span>
        </span>
      </div>
      <div
        className={cn(
          "flex items-center gap-1 font-bold",
          direction === "up" && "text-destructive",
          direction === "down" && "text-primary",
          direction === "flat" && "text-muted-foreground"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{fmt(Math.abs(delta))}</span>
        {pct !== null && <span>({pct}%)</span>}
        <span className="font-normal text-muted-foreground ms-1">{t("vsLastMonth")}</span>
      </div>
    </Card>
  );
}
