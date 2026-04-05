"use client";

import { useTranslations, useLocale } from "next-intl";
import { MoneyDisplay } from "@/components/shared/money-display";
import type { Account } from "@/hooks/use-accounts";

const TYPE_LABEL_KEYS: Record<string, string> = {
  bank_account: "bankAccount",
  credit_card: "creditCard",
  cash_wallet: "cashWallet",
  digital_wallet: "digitalWallet",
  financing_app: "financingApp",
};

interface AccountBalanceHeaderProps {
  account: Account;
}

export function AccountBalanceHeader({ account }: AccountBalanceHeaderProps) {
  const t = useTranslations("accounts");
  const locale = useLocale();
  const typeLabel = t(TYPE_LABEL_KEYS[account.type] ?? "bankAccount");
  const institutionName = account.institution
    ? (locale === "ar" ? account.institution.name_ar : account.institution.name_en)
    : null;

  const initials = account.institution
    ? account.institution.name_en.slice(0, 2).toUpperCase()
    : null;

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {typeLabel}
        {institutionName && (
          <span className="text-muted-foreground/50"> • {institutionName}</span>
        )}
      </p>

      {/* Account name + institution logo */}
      <div className="flex items-center gap-3">
        {account.institution && (
          <div className="shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-muted text-muted-foreground font-bold text-sm overflow-hidden">
            {account.institution.logo_url ? (
              <img
                src={account.institution.logo_url}
                alt={institutionName ?? ""}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
        )}
        <h1 className="text-2xl font-bold text-foreground">{account.name}</h1>
      </div>

      {/* Balance */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          {t("balance")}
        </p>
        <MoneyDisplay
          amount={account.displayed_balance_minor}
          currency={account.currency}
          size="lg"
          colorize
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/40">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("incomeThisMonth")}</p>
          <p className="text-base font-semibold text-foreground">—</p>
          <p className="text-xs text-muted-foreground/60">{t("comingSoon")}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("expensesThisMonth")}</p>
          <p className="text-base font-semibold text-foreground">—</p>
          <p className="text-xs text-muted-foreground/60">{t("comingSoon")}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("avgTransaction")}</p>
          <p className="text-base font-semibold text-foreground">—</p>
          <p className="text-xs text-muted-foreground/60">{t("comingSoon")}</p>
        </div>
      </div>
    </div>
  );
}
