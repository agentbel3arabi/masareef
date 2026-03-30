"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Wallet, ArrowLeftRight } from "lucide-react";
import { useAccounts, useNetWorth } from "@/hooks/use-accounts";
import { AccountGrid } from "@/components/accounts/account-grid";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";
import { TransferForm } from "@/components/transfers/transfer-form";
import { AccountGridSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryBar } from "@/components/shared/summary-bar";
import { Button } from "@/components/ui/button";
import { formatAmount, formatAmountAr } from "@/lib/money";

export default function AccountsPage() {
  const t = useTranslations("accounts");
  const tEmpty = useTranslations("emptyStates");
  const tTransfers = useTranslations("transfers");
  const locale = useLocale();

  const { data, isLoading, error } = useAccounts();
  const { data: netWorthData } = useNetWorth();

  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const nw = netWorthData?.data;
  const netWorthValue = nw
    ? locale === "ar"
      ? formatAmountAr(nw.total_base_minor, nw.base_currency)
      : formatAmount(nw.total_base_minor, nw.base_currency)
    : "—";

  const summaryItems = [
    { label: t("netWorth"), value: netWorthValue },
    {
      label: t("totalAccounts"),
      value: nw ? String(nw.account_count) : "—",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTransferOpen(true)}
            >
              <ArrowLeftRight className="h-4 w-4 me-1" />
              {tTransfers("newTransfer")}
            </Button>
            <CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} />
          </>
        }
      />

      <SummaryBar items={summaryItems} />

      {isLoading && <AccountGridSkeleton />}
      {error && (
        <p className="text-destructive">
          {t("error")}: {error.message}
        </p>
      )}
      {data?.data && data.data.length > 0 && (
        <AccountGrid accounts={data.data} />
      )}
      {!isLoading && data?.data?.length === 0 && (
        <EmptyState
          icon={Wallet}
          title={tEmpty("accounts.title")}
          description={tEmpty("accounts.description")}
          action={{ label: tEmpty("accounts.action"), onClick: () => setCreateOpen(true) }}
        />
      )}

      <TransferForm open={transferOpen} onOpenChange={setTransferOpen} />
    </div>
  );
}
