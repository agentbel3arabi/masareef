"use client";

import { useTranslations } from "next-intl";
import { AccountCard } from "./account-card";
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
  manageMode?: boolean;
  selectedIds?: Set<number>;
  onSelect?: (id: number) => void;
}

export function AccountGrid({ accounts, manageMode, selectedIds, onSelect }: AccountGridProps) {
  const t = useTranslations();

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    label: t(TYPE_LABELS[type] || type),
    items: accounts.filter((a) => a.type === type),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-8">
      {grouped.map((group) => (
        <section key={group.type}>
          <h2 className="text-lg font-semibold mb-4">{group.label}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((account) => (
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
      ))}
    </div>
  );
}
