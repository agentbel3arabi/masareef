import { useTranslations, useLocale } from "next-intl";
import { formatAmount, formatAmountAr, CURRENCIES } from "@/lib/money";

interface UtilizationBarProps {
  balanceMinor: number;      // displayed_balance_minor (negative for credit used)
  creditLimitMinor: number;  // credit_limit
  currency: string;
}

export function UtilizationBar({ balanceMinor, creditLimitMinor, currency }: UtilizationBarProps) {
  const t = useTranslations("accounts");
  const locale = useLocale();

  const used = Math.max(0, -balanceMinor);
  const pct = creditLimitMinor > 0 ? Math.min(100, Math.round((used / creditLimitMinor) * 100)) : 0;

  const barColor =
    pct < 50 ? "bg-green-500" :
    pct < 80 ? "bg-amber-500" :
    "bg-red-500";

  const symbol = CURRENCIES[currency]?.symbol ?? currency;
  const formattedLimit =
    locale === "ar"
      ? `${formatAmountAr(creditLimitMinor, currency)} ${symbol}`
      : `${formatAmount(creditLimitMinor, currency)} ${symbol}`;

  return (
    <div className="mt-2 space-y-1">
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{t("utilized", { pct })}</span>
        <span>{t("limit")}: {formattedLimit}</span>
      </div>
    </div>
  );
}
