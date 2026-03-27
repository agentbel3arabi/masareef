"use client";

import { useTranslations } from "next-intl";
import { useAccounts } from "@/hooks/use-accounts";
import { AccountGrid } from "@/components/accounts/account-grid";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";

export default function AccountsPage() {
  const t = useTranslations("accounts");
  const { data, isLoading, error } = useAccounts();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <CreateAccountDialog />
      </div>

      {isLoading && <p className="text-muted-foreground">{t("loading") || "Loading..."}</p>}
      {error && <p className="text-destructive">Error: {error.message}</p>}
      {data?.data && <AccountGrid accounts={data.data} />}
      {data?.data?.length === 0 && !isLoading && (
        <p className="text-muted-foreground text-center py-12">
          No accounts yet. Click &ldquo;Add Account&rdquo; to get started.
        </p>
      )}
    </div>
  );
}
