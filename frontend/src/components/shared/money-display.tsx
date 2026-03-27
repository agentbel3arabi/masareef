"use client";

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
  locale = "ar",
  showCurrency = true,
  colorize = false,
  className,
  size = "md",
}: MoneyDisplayProps) {
  const formatted = locale === "ar"
    ? formatAmountAr(amount, currency)
    : formatAmount(amount, currency);

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
      {formatted}
      {showCurrency && <span className="text-muted-foreground ms-1">{symbol}</span>}
    </span>
  );
}
