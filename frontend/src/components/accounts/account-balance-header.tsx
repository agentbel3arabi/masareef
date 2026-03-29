"use client";

import { useTranslations } from "next-intl";
import { MoneyDisplay } from "@/components/shared/money-display";
import { typeIcons, typeColors } from "@/components/accounts/account-card";
import { Badge } from "@/components/ui/badge";
import type { Account } from "@/hooks/use-accounts";

interface AccountBalanceHeaderProps {
  account: Account;
}

export function AccountBalanceHeader({ account }: AccountBalanceHeaderProps) {
  const t = useTranslations("accounts");

  const Icon = typeIcons[account.type];
  const iconColor = typeColors[account.type] ?? "bg-primary/10 text-primary";

  return (
    <div className="rounded-2xl bg-card border p-6 md:p-8 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={`rounded-lg p-2 ${iconColor}`}>
                <Icon className="h-5 w-5" />
              </div>
            )}
            <h1 className="text-2xl font-black tracking-tight">{account.name}</h1>
            {account.institution && (
              <Badge variant="secondary" className="text-xs font-semibold">
                {account.institution}
              </Badge>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("balance")}
            </p>
            <MoneyDisplay
              amount={account.displayed_balance_minor}
              currency={account.currency}
              size="lg"
              colorize
              className="text-3xl md:text-4xl font-black"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
