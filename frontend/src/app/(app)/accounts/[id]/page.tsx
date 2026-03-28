"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "@/hooks/use-accounts";
import { useTransactions } from "@/hooks/use-transactions";
import { AccountBalanceHeader } from "@/components/accounts/account-balance-header";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionForm } from "@/components/transactions/transaction-form";

export default function AccountDetailPage() {
  const params = useParams();
  const accountId = Number(params.id);
  const [page, setPage] = useState(1);

  const { data: accountData, isLoading: accountLoading } = useAccount(accountId);
  const { data: txData, isLoading: txLoading } = useTransactions({
    account_id: accountId,
    page,
    page_size: 50,
  });

  if (accountLoading) return <p>Loading...</p>;
  if (!accountData?.data) return <p>Account not found</p>;

  const account = accountData.data;

  return (
    <div className="space-y-6">
      <AccountBalanceHeader account={account} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Transactions</h2>
        <TransactionForm accountId={account.id} accountCurrency={account.currency} />
      </div>

      {txLoading ? (
        <p>Loading transactions...</p>
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
