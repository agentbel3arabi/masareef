"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, Landmark, CreditCard, Wallet, TrendingUp } from "lucide-react";
import { useInstitutionSummary } from "@/hooks/use-institutions";
import { StatCard } from "@/components/shared/stat-card";
import { AccountCard } from "@/components/accounts/account-card";
import { Button } from "@/components/ui/button";
import { formatAmount, formatAmountAr } from "@/lib/money";
import type { Account } from "@/hooks/use-accounts";

export default function BankDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("accounts.bankDetail");
  const tAccounts = useTranslations("accounts");
  const locale = useLocale();
  const slug = params.slug as string;

  const { data, isLoading } = useInstitutionSummary(slug);

  const fmt = (amount: number, currency: string) =>
    locale === "ar"
      ? formatAmountAr(amount, currency)
      : formatAmount(amount, currency);

  if (isLoading) {
    return (
      <div className="p-6 text-muted-foreground">{tAccounts("loading")}</div>
    );
  }

  if (!data?.data) {
    return (
      <div className="p-6 text-muted-foreground">{t("notFound")}</div>
    );
  }

  const { institution, accounts: rawAccounts, summary } = data.data;
  const accounts = rawAccounts as Account[];
  const displayName =
    locale === "ar" ? institution.name_ar : institution.name_en;
  const secondaryName =
    locale === "ar" ? institution.name_en : institution.name_ar;
  const initials = institution.name_en.slice(0, 2).toUpperCase();

  const baseCurrency = summary.base_currency;

  // Compute deposit vs credit totals
  const depositAccounts = accounts.filter((a) => a.type === "bank_account");
  const creditAccounts = accounts.filter((a) => a.type === "credit_card");

  const totalDeposits = depositAccounts.reduce(
    (sum, a) => sum + Math.max(0, a.displayed_balance_minor),
    0
  );
  const totalCreditUsed = creditAccounts.reduce(
    (sum, a) => sum + Math.max(0, -a.displayed_balance_minor),
    0
  );
  const totalCreditLimit = creditAccounts.reduce(
    (sum, a) => sum + (a.credit_limit ?? 0),
    0
  );
  const availableCredit = totalCreditLimit - totalCreditUsed;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/accounts")}
        className="gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToAccounts")}
      </Button>

      {/* Bank header */}
      <div className="flex items-center gap-4">
        <div className="shrink-0 flex items-center justify-center h-14 w-14 rounded-xl bg-muted text-muted-foreground font-bold text-lg overflow-hidden">
          {institution.logo_url ? (
            <img
              src={institution.logo_url}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
          {secondaryName && (
            <p className="text-sm text-muted-foreground">{secondaryName}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {summary.account_count}{" "}
            {summary.account_count === 1 ? t("account") : t("accounts")}
          </p>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Landmark}
          label={t("totalDeposits")}
          value={fmt(totalDeposits, baseCurrency)}
          variant="success"
        />
        <StatCard
          icon={CreditCard}
          label={t("totalCreditUsed")}
          value={fmt(totalCreditUsed, baseCurrency)}
          variant="destructive"
        />
        <StatCard
          icon={Wallet}
          label={t("availableCredit")}
          value={fmt(Math.max(0, availableCredit), baseCurrency)}
          variant="accent"
        />
        <StatCard
          icon={TrendingUp}
          label={t("netPosition")}
          value={fmt(summary.total_base_minor, baseCurrency)}
          variant={summary.total_base_minor >= 0 ? "success" : "destructive"}
        />
      </div>

      {/* Account list */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              hideInstitution
            />
          ))}
        </div>
      )}
    </div>
  );
}
