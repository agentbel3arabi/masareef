"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Wallet, ArrowLeftRight, Plus } from "lucide-react";
import { useNavbarActions } from "@/contexts/navbar-actions-context";
import { useAccounts, useNetWorth } from "@/hooks/use-accounts";
import { AccountGrid } from "@/components/accounts/account-grid";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";
import { TransferForm } from "@/components/transfers/transfer-form";
import { AccountGridSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatAmount, formatAmountAr } from "@/lib/money";

const DISPLAY_CURRENCIES = ["EGP", "USD", "SAR"] as const;
type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export default function AccountsPage() {
  const t = useTranslations("accounts");
  const tEmpty = useTranslations("emptyStates");
  const tTransfers = useTranslations("transfers");
  const locale = useLocale();

  const { data, isLoading, error } = useAccounts();
  const { data: nwResponse } = useNetWorth();

  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("EGP");

  const { setActions } = useNavbarActions();

  useEffect(() => {
    setActions(
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
          <ArrowLeftRight className="h-4 w-4 me-1" />
          {tTransfers("newTransfer")}
        </Button>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 me-1" />
          {t("addAccount")}
        </Button>
      </div>
    );
    return () => setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nw = nwResponse?.data;
  const accounts = data?.data ?? [];

  // Compute assets and liabilities from accounts list
  const assetsMinor = accounts
    .filter((a) => a.displayed_balance_minor > 0)
    .reduce((s, a) => s + a.displayed_balance_minor, 0);
  const liabilitiesMinor = accounts
    .filter((a) => a.displayed_balance_minor < 0)
    .reduce((s, a) => s + Math.abs(a.displayed_balance_minor), 0);

  const baseCurrency = nw?.base_currency ?? "EGP";

  const fmt = (amount: number, currency: string) =>
    locale === "ar"
      ? formatAmountAr(amount, currency)
      : formatAmount(amount, currency);

  // Only EGP (base currency) is live; others are backend dependency
  const netWorthDisplay =
    displayCurrency === baseCurrency && nw
      ? fmt(nw.total_base_minor, baseCurrency)
      : displayCurrency !== baseCurrency
      ? "—"
      : "—";

  const assetsDisplay =
    displayCurrency === baseCurrency
      ? fmt(assetsMinor, baseCurrency)
      : "—";

  const liabilitiesDisplay =
    displayCurrency === baseCurrency
      ? fmt(liabilitiesMinor, baseCurrency)
      : "—";

  return (
    <div className="space-y-8">
      {/* Net worth hero */}
      <section className="rounded-lg bg-card p-8 flex flex-wrap items-center justify-between gap-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {t("netWorth")}
            </p>
            <p className="text-4xl font-black tracking-tight text-foreground">
              {netWorthDisplay}
            </p>
          </div>
          <div className="flex gap-8 border-s border-border ps-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {t("assets")}
              </p>
              <p className="text-xl font-bold text-primary">{assetsDisplay}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {t("liabilities")}
              </p>
              <p className="text-xl font-bold text-destructive">{liabilitiesDisplay}</p>
            </div>
          </div>
        </div>

        {/* Currency switcher */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
          {DISPLAY_CURRENCIES.map((cur) => (
            <button
              key={cur}
              onClick={() => setDisplayCurrency(cur)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                cur === displayCurrency
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {cur}
            </button>
          ))}
        </div>
      </section>

      {/* Account grid — already grouped by type */}
      {isLoading && <AccountGridSkeleton />}
      {error && (
        <p className="text-destructive">
          {t("error")}: {error.message}
        </p>
      )}
      {!isLoading && accounts.length > 0 && <AccountGrid accounts={accounts} />}
      {!isLoading && accounts.length === 0 && (
        <EmptyState
          icon={Wallet}
          title={tEmpty("accounts.title")}
          description={tEmpty("accounts.description")}
          action={{ label: tEmpty("accounts.action"), onClick: () => setCreateOpen(true) }}
        />
      )}

      <CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} />
      <TransferForm open={transferOpen} onOpenChange={setTransferOpen} />
    </div>
  );
}
