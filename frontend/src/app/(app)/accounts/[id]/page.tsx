"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Receipt } from "lucide-react";
import { useAccount } from "@/hooks/use-accounts";
import { useTransactions } from "@/hooks/use-transactions";
import { AccountBalanceHeader } from "@/components/accounts/account-balance-header";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { EmptyState } from "@/components/shared/empty-state";

export default function AccountDetailPage() {
  const t = useTranslations();
  const tEmpty = useTranslations("emptyStates");
  const params = useParams();
  const accountId = Number(params.id);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: accountData, isLoading: accountLoading } = useAccount(accountId);
  const { data: txData, isLoading: txLoading } = useTransactions({
    account_id: accountId,
    page,
    page_size: 50,
  });

  if (accountLoading) return <p>{t("common.loading")}</p>;
  if (!accountData?.data) return <p>{t("common.notFound")}</p>;

  const account = accountData.data;
  const isEmpty = !txLoading && (txData?.data?.length ?? 0) === 0;

  return (
    <div className="space-y-6">
      <AccountBalanceHeader account={account} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("transactions.heading")}</h2>
        <TransactionForm
          accountId={account.id}
          accountCurrency={account.currency}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      </div>

      {txLoading ? (
        <p>{t("common.loading")}</p>
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
          page={page}
          pageSize={50}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
