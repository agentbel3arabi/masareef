"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAccounts } from "@/hooks/use-accounts";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Card } from "@/components/ui/card";
import { formatEnumLabel } from "@/lib/enum-labels";

export function AccountsGlance() {
  const t = useTranslations("dashboard");
  const { data, isLoading } = useAccounts();
  const accounts = data?.data ?? [];

  if (isLoading) return <Card className="h-56 animate-pulse" />;
  if (accounts.length === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">{t("accountsGlance")}</h3>
      <div className="space-y-2 max-h-44 overflow-y-auto">
        {accounts.slice(0, 8).map((acct) => (
          <Link
            key={acct.id}
            href={`/accounts/${acct.id}`}
            className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{acct.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatEnumLabel(acct.type)}
              </p>
            </div>
            <MoneyDisplay
              amount={acct.displayed_balance_minor}
              currency={acct.currency}
              colorize
              size="sm"
            />
          </Link>
        ))}
      </div>
    </Card>
  );
}
