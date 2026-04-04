"use client";

import { useLocale } from "next-intl";
import { formatAmount, formatAmountAr, CURRENCIES } from "@/lib/money";
import { cn } from "@/lib/utils";

interface MoneyDisplayProps {
  amount: number;           // Minor units
  currency: string;
  locale?: "ar" | "en";
  showCurrency?: boolean;
  colorize?: boolean;       // Green for positive, red for negative
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function MoneyDisplay({
  amount,
  currency,
  locale,
  showCurrency = true,
  colorize = false,
  className,
  size = "md",
}: MoneyDisplayProps) {
  const activeLocale = useLocale();
  const effectiveLocale = locale ?? (activeLocale === "ar" ? "ar" : "en");
  const formatted = effectiveLocale === "ar"
    ? formatAmountAr(amount, currency)
    : formatAmount(amount, currency);

  const showSign = colorize && amount !== 0;
  const displayFormatted = showSign
    ? (effectiveLocale === "ar"
        ? formatAmountAr(Math.abs(amount), currency)
        : formatAmount(Math.abs(amount), currency))
    : formatted;
  const signPrefix = showSign ? (amount > 0 ? "+" : "\u2212") : "";

  const symbol = CURRENCIES[currency]?.symbol ?? currency;

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl font-bold",
  };

  return (
    <span
      className={cn(
        sizeClasses[size],
        "tabular-nums",
        colorize && amount > 0 && "text-green-600 dark:text-green-400",
        colorize && amount < 0 && "text-red-600 dark:text-red-400",
        className
      )}
    >
      {signPrefix}{displayFormatted}
      {showCurrency && <span className="text-muted-foreground ms-1">{symbol}</span>}
    </span>
  );
}
