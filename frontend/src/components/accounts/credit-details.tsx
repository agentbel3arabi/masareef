"use client";

import { useTranslations, useLocale } from "next-intl";
import { formatAmount, formatAmountAr } from "@/lib/money";
import { cn } from "@/lib/utils";

interface CreditDetailsProps {
  balanceMinor: number;
  creditLimit: number;
  currency: string;
  compact?: boolean;
}

export function CreditDetails({
  balanceMinor,
  creditLimit,
  currency,
  compact = false,
}: CreditDetailsProps) {
  const t = useTranslations("accounts");
  const locale = useLocale();
  const fmt = (amount: number) =>
    locale === "ar"
      ? formatAmountAr(amount, currency)
      : formatAmount(amount, currency);

  const usedMinor = Math.max(0, -balanceMinor);
  const availableMinor = creditLimit - usedMinor;
  const utilization =
    creditLimit > 0 ? (usedMinor / creditLimit) * 100 : 0;
  const availableColor =
    utilization > 80
      ? "text-destructive"
      : utilization > 50
        ? "text-amber-500"
        : "text-primary";

  return (
    <div className={cn("space-y-1", compact ? "text-[10px]" : "text-xs")}>
      <div className="flex gap-3 text-muted-foreground">
        <span>
          {t("limit")}:{" "}
          <span className="text-foreground/70">{fmt(creditLimit)}</span>
        </span>
        <span>
          {t("available")}:{" "}
          <span className={availableColor}>
            {fmt(Math.max(0, availableMinor))}
          </span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            utilization > 80
              ? "bg-red-500"
              : utilization > 50
                ? "bg-amber-500"
                : "bg-green-500"
          )}
          style={{ width: `${Math.min(100, utilization)}%` }}
        />
      </div>
    </div>
  );
}
