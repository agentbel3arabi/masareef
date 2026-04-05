"use client";

import { useLocale } from "next-intl";
import { formatAmount, formatAmountAr } from "@/lib/money";
import { cn } from "@/lib/utils";
import { AccountCard } from "./account-card";
import type { Account } from "@/hooks/use-accounts";

interface IndependentSectionProps {
  title: string;
  accounts: Account[];
  baseCurrency: string;
  manageMode?: boolean;
  selectedIds?: Set<number>;
  onSelect?: (id: number) => void;
}

export function IndependentSection({
  title,
  accounts,
  baseCurrency,
  manageMode,
  selectedIds,
  onSelect,
}: IndependentSectionProps) {
  const locale = useLocale();

  if (accounts.length === 0) return null;

  // Total in base currency
  const total = accounts
    .filter((a) => a.currency === baseCurrency)
    .reduce((sum, a) => sum + a.displayed_balance_minor, 0);

  const fmt = (amount: number, currency: string) =>
    locale === "ar"
      ? formatAmountAr(amount, currency)
      : formatAmount(amount, currency);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span
          className={cn(
            "text-sm font-bold",
            total >= 0 ? "text-primary" : "text-destructive"
          )}
        >
          {fmt(total, baseCurrency)}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            manageMode={manageMode}
            selected={selectedIds?.has(account.id)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
