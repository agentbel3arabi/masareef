"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Wallet } from "lucide-react";
import { useAccounts } from "@/hooks/use-accounts";
import { AccountGrid } from "@/components/accounts/account-grid";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";
import { TransferForm } from "@/components/transfers/transfer-form";
import { AccountGridSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";

export default function AccountsPage() {
  const t = useTranslations("accounts");
  const tEmpty = useTranslations("emptyStates");
  const { data, isLoading, error } = useAccounts();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <TransferForm />
          <CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} />
        </div>
      </div>

      {isLoading && <AccountGridSkeleton />}
      {error && <p className="text-destructive">{t("error")}: {error.message}</p>}
      {data?.data && data.data.length > 0 && <AccountGrid accounts={data.data} />}
      {!isLoading && data?.data?.length === 0 && (
        <EmptyState
          icon={Wallet}
          title={tEmpty("accounts.title")}
          description={tEmpty("accounts.description")}
          action={{ label: tEmpty("accounts.action"), onClick: () => setCreateOpen(true) }}
        />
      )}
    </div>
  );
}
