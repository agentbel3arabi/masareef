"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Wallet, ArrowLeftRight, Plus, Trash2, Upload } from "lucide-react";
import { useNavbarActions } from "@/contexts/navbar-actions-context";
import { useAccounts, useNetWorth, useDeleteAccount } from "@/hooks/use-accounts";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
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
  const tImport = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();

  const { data, isLoading, error } = useAccounts();
  const { data: nwResponse } = useNetWorth();

  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("EGP");
  const {
    bulkMode: manageMode,
    selectedIds: selectedAccountIds,
    enterBulkMode: enterManageMode,
    exitBulkMode: exitManageMode,
    toggleSelect: toggleSelectAccount,
    selectAll: selectAllAccounts,
  } = useBulkSelection();

  const deleteAccount = useDeleteAccount();

  const { setActions } = useNavbarActions();

  useEffect(() => {
    if (!manageMode) {
      setActions(
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={enterManageMode}>
            {t("manage")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => router.push("/import")}>
            <Upload className="h-4 w-4 me-1" />
            {tImport("import")}
          </Button>
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
    } else if (selectedAccountIds.size === 0) {
      setActions(
        <Button variant="secondary" size="sm" onClick={exitManageMode}>
          {t("cancel")}
        </Button>
      );
    } else {
      setActions(
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedAccountIds.size} {selectedAccountIds.size === 1 ? t("accountSelected") : t("accountsSelected")}
          </span>
          <Button
            variant="destructive"
            size="sm"
            disabled={deleteAccount.isPending}
            onClick={async () => {
              const idsArray = [...selectedAccountIds];
              const results = await Promise.allSettled(
                idsArray.map((id) => deleteAccount.mutateAsync(id))
              );
              const failedIds = new Set(
                idsArray.filter((_, i) => results[i].status === "rejected")
              );
              if (failedIds.size === 0) {
                exitManageMode();
              } else {
                // Keep only the failed IDs selected; remain in manage mode for retry
                selectAllAccounts([...failedIds]);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5 me-1" />
            {t("deleteSelected")}
          </Button>
          <Button variant="ghost" size="sm" onClick={exitManageMode}>
            {t("cancel")}
          </Button>
        </div>
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manageMode, [...selectedAccountIds].sort().join(','), deleteAccount.isPending, locale]);

  useEffect(() => () => setActions(null), [setActions]);

  const nw = nwResponse?.data;
  const accounts = data?.data ?? [];
  const baseCurrency = nw?.base_currency ?? "EGP";

  // Compute assets and liabilities — only same-currency accounts to avoid cross-currency mixing
  const assetsMinor = accounts
    .filter((a) => a.currency === baseCurrency && a.displayed_balance_minor > 0)
    .reduce((s, a) => s + a.displayed_balance_minor, 0);
  const liabilitiesMinor = accounts
    .filter((a) => a.currency === baseCurrency && a.displayed_balance_minor < 0)
    .reduce((s, a) => s + Math.abs(a.displayed_balance_minor), 0);

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
          {DISPLAY_CURRENCIES.map((cur) => {
            const isBase = cur === baseCurrency;
            return (
              <button
                key={cur}
                onClick={() => isBase && setDisplayCurrency(cur)}
                disabled={!isBase}
                title={!isBase ? t("comingSoon") : undefined}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  cur === displayCurrency
                    ? "bg-background shadow-sm text-foreground"
                    : isBase
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-muted-foreground/40 cursor-not-allowed"
                )}
              >
                {cur}
              </button>
            );
          })}
        </div>
      </section>

      {/* Account grid — already grouped by type */}
      {isLoading && <AccountGridSkeleton />}
      {error && (
        <p className="text-destructive">
          {t("error")}: {error.message}
        </p>
      )}
      {!isLoading && accounts.length > 0 && (
        <AccountGrid
          accounts={accounts}
          manageMode={manageMode}
          selectedIds={selectedAccountIds}
          onSelect={toggleSelectAccount}
        />
      )}
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
