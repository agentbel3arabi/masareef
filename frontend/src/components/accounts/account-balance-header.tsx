"use client";

import { useTranslations } from "next-intl";
import { MoneyDisplay } from "@/components/shared/money-display";
import type { Account } from "@/hooks/use-accounts";

interface AccountBalanceHeaderProps {
  account: Account;
}

export function AccountBalanceHeader({ account }: AccountBalanceHeaderProps) {
  const t = useTranslations("accounts");

  return (
    <div className="flex items-center justify-between p-6 rounded-lg bg-card border">
      <div>
        <h1 className="text-2xl font-bold">{account.name}</h1>
        {account.institution && (
          <p className="text-muted-foreground">{account.institution}</p>
        )}
      </div>
      <div className="text-end">
        <p className="text-sm text-muted-foreground">{t("balance")}</p>
        <MoneyDisplay
          amount={account.displayed_balance_minor}
          currency={account.currency}
          size="lg"
          colorize
        />
      </div>
    </div>
  );
}
