"use client";

import { useParams } from "next/navigation";
import { useAccount } from "@/hooks/use-accounts";
import { AccountBalanceHeader } from "@/components/accounts/account-balance-header";

export default function AccountDetailPage() {
  const params = useParams();
  const accountId = Number(params.id);
  const { data, isLoading, error } = useAccount(accountId);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;
  if (!data?.data) return <p>Account not found</p>;

  const account = data.data;

  return (
    <div className="space-y-6">
      <AccountBalanceHeader account={account} />

      {/* Transaction table will be added in Unit 1H */}
      <div className="rounded-lg border p-6 text-center text-muted-foreground">
        Transaction table — coming in Unit 1H
      </div>
    </div>
  );
}
