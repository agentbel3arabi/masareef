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

const typeColors: Record<string, string> = {
  bank_account: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  credit_card: "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  cash_wallet: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
  digital_wallet: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  financing_app: "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
};

interface AccountCardProps {
  account: Account;
}

export function AccountCard({ account }: AccountCardProps) {
  const t = useTranslations("accounts");
  const Icon = typeIcons[account.type] || Wallet;
  const iconColor = typeColors[account.type] || "bg-primary/10 text-primary";

  return (
    <Link href={`/accounts/${account.id}`}>
      <Card className="hover:bg-accent/50 hover:-translate-y-1 transition-all duration-200 cursor-pointer">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <div className={`rounded-lg p-2 ${iconColor}`}>
            <Icon className="h-5 w-5" />
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
          {(account.type === "credit_card" || account.type === "financing_app") && account.credit_limit != null && (
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
