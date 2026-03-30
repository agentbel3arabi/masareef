"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Receipt, Plus } from "lucide-react";
import { useAccount } from "@/hooks/use-accounts";
import { useTransactions, type TransactionFilters } from "@/hooks/use-transactions";
import { AccountBalanceHeader } from "@/components/accounts/account-balance-header";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionFilterBar } from "@/components/transactions/transaction-filters";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransferForm } from "@/components/transfers/transfer-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function AccountDetailPage() {
  const t = useTranslations();
  const tEmpty = useTranslations("emptyStates");
  const params = useParams();
  const accountId = Number(params.id);

  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [txFilters, setTxFilters] = useState<TransactionFilters>({
    account_id: accountId,
    page: 1,
    page_size: 50,
    sort: "-date",
  });

  const { data: accountData, isLoading: accountLoading } = useAccount(accountId);
  const { data: txData, isLoading: txLoading } = useTransactions(txFilters);

  if (accountLoading) return <p className="p-6 text-muted-foreground">{t("common.loading")}</p>;
  if (!accountData?.data) return <p className="p-6 text-muted-foreground">{t("accounts.notFound")}</p>;

  const account = accountData.data;
  const isEmpty = !txLoading && (txData?.data?.length ?? 0) === 0;

  return (
    <div className="space-y-6">
      {/* Account header — breadcrumb, name, balance, actions, stats */}
      <AccountBalanceHeader
        account={account}
        onTransfer={() => setTransferOpen(true)}
      />

      {/* Transactions section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">{t("transactions.heading")}</h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 me-1" />
            {t("transactions.addTransaction")}
          </Button>
        </div>
        <TransactionFilterBar
          filters={txFilters}
          onChange={(f) => setTxFilters({ ...f, account_id: accountId })}
          hideAccountFilter
        />

        {txLoading ? (
          <p className="text-muted-foreground text-sm py-4">{t("common.loading")}</p>
        ) : isEmpty ? (
          <EmptyState
            icon={Receipt}
            title={tEmpty("accountTransactions.title")}
            description={tEmpty("accountTransactions.description")}
            action={{ label: tEmpty("accountTransactions.action"), onClick: () => setCreateOpen(true) }}
          />
        ) : (
          <TransactionTable
            transactions={txData?.data || []}
            total={txData?.meta?.total || 0}
            page={txFilters.page || 1}
            pageSize={txFilters.page_size || 50}
            onPageChange={(p) => setTxFilters({ ...txFilters, page: p })}
          />
        )}
      </div>

      <TransactionForm
        accountId={account.id}
        accountCurrency={account.currency}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <TransferForm open={transferOpen} onOpenChange={setTransferOpen} />
    </div>
  );
}
