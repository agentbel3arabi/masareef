"use client";

import { useTranslations } from "next-intl";
import { useAccounts } from "@/hooks/use-accounts";
import { AccountGrid } from "@/components/accounts/account-grid";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";
import { TransferForm } from "@/components/transfers/transfer-form";

export default function AccountsPage() {
  const t = useTranslations("accounts");
  const { data, isLoading, error } = useAccounts();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <TransferForm />
          <CreateAccountDialog />
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">{t("loading")}</p>}
      {error && <p className="text-destructive">{t("error")}: {error.message}</p>}
      {data?.data && data.data.length > 0 && <AccountGrid accounts={data.data} />}
      {data?.data?.length === 0 && !isLoading && (
        <p className="text-muted-foreground text-center py-12">
          {t("emptyState")}
        </p>
      )}
    </div>
  );
}
