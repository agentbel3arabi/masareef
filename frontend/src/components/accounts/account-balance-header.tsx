"use client";

import { useTranslations } from "next-intl";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  onTransfer?: () => void;
}

export function AccountBalanceHeader({ account, onTransfer }: AccountBalanceHeaderProps) {
  const t = useTranslations("accounts");
  const typeLabel = t(TYPE_LABEL_KEYS[account.type] ?? "bankAccount");

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {typeLabel}
        {account.institution && (
          <span className="text-muted-foreground/50"> • {account.institution}</span>
        )}
      </p>

      {/* Account name */}
      <h1 className="text-2xl font-bold text-foreground">{account.name}</h1>

      {/* Balance + action buttons */}
      <div className="flex flex-wrap items-end justify-between gap-4">
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
        <div className="flex flex-wrap gap-2">
          {onTransfer && (
            <Button size="sm" onClick={onTransfer}>
              <ArrowLeftRight className="h-4 w-4 me-1" />
              {t("transferFunds")}
            </Button>
          )}
          <Button size="sm" variant="outline" disabled>
            {t("accountStatements")}
          </Button>
        </div>
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
