"use client";

import { useTranslations } from "next-intl";
import { AccountCard, typeIcons } from "./account-card";
import type { Account } from "@/hooks/use-accounts";

const TYPE_ORDER = ["bank_account", "credit_card", "cash_wallet", "digital_wallet", "financing_app"];

const TYPE_LABELS: Record<string, string> = {
  bank_account: "accounts.bankAccount",
  credit_card: "accounts.creditCard",
  cash_wallet: "accounts.cashWallet",
  digital_wallet: "accounts.digitalWallet",
  financing_app: "accounts.financingApp",
};

interface AccountGridProps {
  accounts: Account[];
}

export function AccountGrid({ accounts }: AccountGridProps) {
  const t = useTranslations();

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    label: t(TYPE_LABELS[type] || type),
    items: accounts.filter((a) => a.type === type),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-8">
      {grouped.map((group) => {
        const Icon = typeIcons[group.type];
        return (
          <section key={group.type}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                {Icon && <Icon className="h-4.5 w-4.5" />}
                {group.label}
              </h2>
              <span className="text-xs text-muted-foreground font-medium">
                {t("accounts.accountCount", { count: group.items.length })}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.items.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
