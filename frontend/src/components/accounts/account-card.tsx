"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Wallet, CreditCard, Banknote, Smartphone, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import type { Account } from "@/hooks/use-accounts";

const typeIcons: Record<string, typeof Wallet> = {
  bank_account: Wallet,
  credit_card: CreditCard,
  cash_wallet: Banknote,
  digital_wallet: Smartphone,
  financing_app: ShoppingBag,
};

interface AccountCardProps {
  account: Account;
}

export function AccountCard({ account }: AccountCardProps) {
  const t = useTranslations("accounts");
  const Icon = typeIcons[account.type] || Wallet;

  return (
    <Link href={`/accounts/${account.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate">
              {account.name}
            </CardTitle>
            {account.institution && (
              <p className="text-xs text-muted-foreground">{account.institution}</p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <MoneyDisplay
            amount={account.displayed_balance_minor}
            currency={account.currency}
            size="lg"
            colorize
          />
          {account.type === "credit_card" && account.credit_limit != null && (
            <p className="text-xs text-muted-foreground mt-1">
              {t("available")}:{" "}
              <MoneyDisplay
                amount={account.credit_limit + account.displayed_balance_minor}
                currency={account.currency}
                size="sm"
                showCurrency={false}
              />
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
