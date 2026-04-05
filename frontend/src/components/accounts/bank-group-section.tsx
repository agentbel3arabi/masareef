"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatAmount, formatAmountAr } from "@/lib/money";
import { cn } from "@/lib/utils";
import { AccountCard } from "./account-card";
import type { Account } from "@/hooks/use-accounts";

interface BankGroupSectionProps {
  institution: NonNullable<Account["institution"]>;
  accounts: Account[];
  baseCurrency: string;
  manageMode?: boolean;
  selectedIds?: Set<number>;
  onSelect?: (id: number) => void;
}

export function BankGroupSection({
  institution,
  accounts,
  baseCurrency,
  manageMode,
  selectedIds,
  onSelect,
}: BankGroupSectionProps) {
  const t = useTranslations("accounts");
  const locale = useLocale();
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);

  const displayName =
    locale === "ar" ? institution.name_ar : institution.name_en;
  const initials = institution.name_en.slice(0, 2).toUpperCase();

  // Compute totals per currency
  const currencyTotals = new Map<string, number>();
  for (const acc of accounts) {
    currencyTotals.set(
      acc.currency,
      (currencyTotals.get(acc.currency) ?? 0) + acc.displayed_balance_minor
    );
  }
  const isMultiCurrency = currencyTotals.size > 1;

  // Total in base currency (only same-currency accounts)
  const baseCurrencyTotal = currencyTotals.get(baseCurrency) ?? 0;

  const fmt = (amount: number, currency: string) =>
    locale === "ar"
      ? formatAmountAr(amount, currency)
      : formatAmount(amount, currency);

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        {/* Logo / Initials — clickable to bank detail */}
        <button
          type="button"
          onClick={() => router.push(`/accounts/bank/${institution.slug}`)}
          className="shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-muted text-muted-foreground font-bold text-sm overflow-hidden hover:ring-2 hover:ring-primary/40 transition-all"
          title={displayName}
        >
          {institution.logo_url ? (
            <img
              src={institution.logo_url}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </button>

        {/* Name + count — clickable */}
        <button
          type="button"
          onClick={() => router.push(`/accounts/bank/${institution.slug}`)}
          className="flex flex-col items-start min-w-0 hover:underline"
        >
          <span className="text-sm font-semibold text-foreground truncate">
            {displayName}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {accounts.length}{" "}
            {accounts.length === 1
              ? t("bankDetail.account")
              : t("bankDetail.accounts")}
          </span>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Total balance */}
        <div className="text-end shrink-0">
          <span
            className={cn(
              "text-sm font-bold",
              baseCurrencyTotal >= 0 ? "text-primary" : "text-destructive"
            )}
          >
            {fmt(baseCurrencyTotal, baseCurrency)}
          </span>
          {isMultiCurrency && (
            <span className="block text-[10px] text-muted-foreground">
              {t("multiCurrency")}
            </span>
          )}
        </div>

        {/* Expand / collapse */}
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Account cards grid */}
      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              manageMode={manageMode}
              selected={selectedIds?.has(account.id)}
              onSelect={onSelect}
              hideInstitution
            />
          ))}
        </div>
      )}
    </section>
  );
}
