"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Receipt, Plus, ArrowLeftRight } from "lucide-react";
import { useAccount } from "@/hooks/use-accounts";
import { useTransactions, type TransactionFilters } from "@/hooks/use-transactions";
import { useNavbarActions } from "@/contexts/navbar-actions-context";
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
  const tAccounts = useTranslations("accounts");
  const params = useParams();
  const accountId = Number(params.id);
  const { setActions } = useNavbarActions();

  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [txFilters, setTxFilters] = useState<TransactionFilters>({
    account_id: accountId,
    page: 1,
    page_size: 50,
    sort: "-date",
  });

  const { data: accountData, isLoading: accountLoading } = useAccount(accountId);
  const { data: txData, isLoading: txLoading } = useTransactions(txFilters);

  useEffect(() => {
    setActions(
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
          <ArrowLeftRight className="h-4 w-4 me-1" />
          {tAccounts("transferFunds")}
        </Button>
        <Button size="sm" variant="outline" disabled>
          {tAccounts("accountStatements")}
        </Button>
      </div>
    );
    return () => setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Early returns AFTER all hooks
  if (accountLoading) return <p className="p-6 text-muted-foreground">{t("common.loading")}</p>;
  if (!accountData?.data) return <p className="p-6 text-muted-foreground">{t("accounts.notFound")}</p>;

  const account = accountData.data;
  const isEmpty = !txLoading && (txData?.data?.length ?? 0) === 0;

  return (
    <div className="space-y-6">
      {/* Account header — breadcrumb, name, balance, stats */}
      <AccountBalanceHeader account={account} />

      {/* Transactions section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">{t("transactions.heading")}</h2>
          <Button
            variant={bulkMode ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              if (bulkMode) { setBulkMode(false); setSelectedIds(new Set()); }
              else setBulkMode(true);
            }}
          >
            {bulkMode ? t("transactions.cancel") : t("transactions.manage")}
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
            bulkMode={bulkMode}
            selectedIds={selectedIds}
            onToggleSelect={(id) => setSelectedIds(prev => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            })}
            onSelectAll={(ids) => setSelectedIds(ids.length === 0 ? new Set() : new Set(ids))}
          />
        )}
      </div>

      {/* FAB — add transaction */}
      <button
        onClick={() => setCreateOpen(true)}
        aria-label={t("transactions.addTransaction")}
        className="fixed bottom-6 end-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg hover:shadow-xl active:scale-95 transition-all"
      >
        <Plus className="h-6 w-6" />
      </button>

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
