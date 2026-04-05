"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { BankGroupSection } from "./bank-group-section";
import { IndependentSection } from "./independent-section";
import { AccountCard } from "./account-card";
import type { Account } from "@/hooks/use-accounts";

interface AccountGridProps {
  accounts: Account[];
  baseCurrency: string;
  manageMode?: boolean;
  selectedIds?: Set<number>;
  onSelect?: (id: number) => void;
}

/** Types grouped by institution (bank_account + credit_card) */
const INSTITUTION_TYPES = new Set(["bank_account", "credit_card"]);

export function AccountGrid({
  accounts,
  baseCurrency,
  manageMode,
  selectedIds,
  onSelect,
}: AccountGridProps) {
  const t = useTranslations("accounts");

  const { institutionGroups, ungrouped, financingApps, digitalWallets, cashWallets } =
    useMemo(() => {
      const groups = new Map<
        string,
        { institution: NonNullable<Account["institution"]>; accounts: Account[] }
      >();
      const _ungrouped: Account[] = [];
      const _financingApps: Account[] = [];
      const _digitalWallets: Account[] = [];
      const _cashWallets: Account[] = [];

      for (const acc of accounts) {
        if (acc.type === "financing_app") {
          _financingApps.push(acc);
        } else if (acc.type === "digital_wallet") {
          _digitalWallets.push(acc);
        } else if (acc.type === "cash_wallet") {
          _cashWallets.push(acc);
        } else if (INSTITUTION_TYPES.has(acc.type) && acc.institution) {
          const slug = acc.institution.slug;
          if (!groups.has(slug)) {
            groups.set(slug, { institution: acc.institution, accounts: [] });
          }
          groups.get(slug)!.accounts.push(acc);
        } else {
          _ungrouped.push(acc);
        }
      }

      return {
        institutionGroups: Array.from(groups.values()),
        ungrouped: _ungrouped,
        financingApps: _financingApps,
        digitalWallets: _digitalWallets,
        cashWallets: _cashWallets,
      };
    }, [accounts]);

  return (
    <div className="space-y-8">
      {/* Institution-grouped sections */}
      {institutionGroups.map((group) => (
        <BankGroupSection
          key={group.institution.slug}
          institution={group.institution}
          accounts={group.accounts}
          baseCurrency={baseCurrency}
          manageMode={manageMode}
          selectedIds={selectedIds}
          onSelect={onSelect}
        />
      ))}

      {/* Ungrouped bank/credit accounts (no institution) */}
      {ungrouped.length > 0 && (
        <IndependentSection
          title={t("bankAccount")}
          accounts={ungrouped}
          baseCurrency={baseCurrency}
          manageMode={manageMode}
          selectedIds={selectedIds}
          onSelect={onSelect}
        />
      )}

      {/* Independent sections */}
      <IndependentSection
        title={t("financingApp")}
        accounts={financingApps}
        baseCurrency={baseCurrency}
        manageMode={manageMode}
        selectedIds={selectedIds}
        onSelect={onSelect}
      />

      <IndependentSection
        title={t("digitalWallet")}
        accounts={digitalWallets}
        baseCurrency={baseCurrency}
        manageMode={manageMode}
        selectedIds={selectedIds}
        onSelect={onSelect}
      />

      <IndependentSection
        title={t("cashWallet")}
        accounts={cashWallets}
        baseCurrency={baseCurrency}
        manageMode={manageMode}
        selectedIds={selectedIds}
        onSelect={onSelect}
      />
    </div>
  );
}
