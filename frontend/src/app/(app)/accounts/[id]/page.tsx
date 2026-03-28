"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAccount } from "@/hooks/use-accounts";
import { AccountBalanceHeader } from "@/components/accounts/account-balance-header";

export default function AccountDetailPage() {
  const t = useTranslations("accounts");
  const params = useParams();
  const accountId = Number(params.id);
  const { data, isLoading, error } = useAccount(accountId);

  if (isLoading) return <p className="text-muted-foreground">{t("loading")}</p>;
  if (error) return <p className="text-destructive">{t("error")}: {error.message}</p>;
  if (!data?.data) return <p className="text-muted-foreground">{t("notFound")}</p>;

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
