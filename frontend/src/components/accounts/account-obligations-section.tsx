"use client";

import { useTranslations } from "next-intl";
import { HandCoins, ShoppingCart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { useAccountObligations } from "@/hooks/use-account-obligations";
import type { ObligationDebt, ObligationInstallment } from "@/lib/types/obligations";

interface AccountObligationsSectionProps {
  accountId: number;
  accountType: string;
  currency: string;
}

function DebtRow({ debt, currency }: { debt: ObligationDebt; currency: string }) {
  const t = useTranslations("accounts.obligations");
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <HandCoins className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{debt.name}</p>
          <p className="text-xs text-muted-foreground">
            {t("monthlyPayment")}: <MoneyDisplay amount={debt.monthly_payment_minor} currency={currency} className="inline text-xs" />
          </p>
        </div>
      </div>
      <div className="text-end shrink-0">
        <p className="text-sm font-semibold">
          <MoneyDisplay amount={debt.remaining_minor} currency={currency} className="inline text-sm" />
        </p>
        <p className="text-xs text-muted-foreground">{t("remaining")}</p>
      </div>
    </div>
  );
}

function InstallmentRow({ inst, currency }: { inst: ObligationInstallment; currency: string }) {
  const t = useTranslations("accounts.obligations");
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
          <ShoppingCart className="h-4 w-4 text-amber-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{inst.name}</p>
          {inst.merchant_name && (
            <p className="text-xs text-muted-foreground truncate">{inst.merchant_name}</p>
          )}
          <p className="text-xs text-muted-foreground">
            <MoneyDisplay amount={inst.monthly_amount_minor} currency={currency} className="inline text-xs" /> / {t("remainingMonths", { count: inst.remaining_months })}
          </p>
        </div>
      </div>
      <div className="text-end shrink-0">
        <p className="text-sm font-semibold">
          <MoneyDisplay amount={inst.remaining_minor} currency={currency} className="inline text-sm" />
        </p>
        <p className="text-xs text-muted-foreground">{t("remaining")}</p>
      </div>
    </div>
  );
}

export function AccountObligationsSection({ accountId, accountType, currency }: AccountObligationsSectionProps) {
  const t = useTranslations("accounts.obligations");
  const { data, isLoading } = useAccountObligations(accountId);
  const obligations = data?.data;

  const hasDebts = (obligations?.debts?.length ?? 0) > 0;
  const hasInstallments = (obligations?.installments?.length ?? 0) > 0;
  const isEmpty = !hasDebts && !hasInstallments;

  if (isLoading) {
    return null;
  }

  if (isEmpty) {
    return null;
  }

  const sectionTitle =
    accountType === "bank_account" ? t("linkedLoans") : t("installmentPlans");

  return (
    <div>
      <h2 className="text-base font-semibold mb-4">{sectionTitle}</h2>
      <Card className="p-4">
        {hasDebts &&
          obligations!.debts.map((debt) => (
            <DebtRow key={`debt-${debt.id}`} debt={debt} currency={currency} />
          ))}
        {hasInstallments &&
          obligations!.installments.map((inst) => (
            <InstallmentRow key={`inst-${inst.id}`} inst={inst} currency={currency} />
          ))}
      </Card>
    </div>
  );
}
