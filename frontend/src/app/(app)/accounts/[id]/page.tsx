"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Receipt, Plus, ArrowLeftRight, Trash2 } from "lucide-react";
import { useAccount } from "@/hooks/use-accounts";
import { useTransactions, useBulkDeleteTransactions, useBulkCategorizeTransactions, type TransactionFilters } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { useNavbarActions } from "@/contexts/navbar-actions-context";
import { AccountBalanceHeader } from "@/components/accounts/account-balance-header";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionFilterBar } from "@/components/transactions/transaction-filters";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransferForm } from "@/components/transfers/transfer-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryIcon } from "@/lib/category-icon";

export default function AccountDetailPage() {
  const t = useTranslations();
  const tEmpty = useTranslations("emptyStates");
  const tAccounts = useTranslations("accounts");
  const locale = useLocale();
  const params = useParams();
  const accountId = Number(params.id);
  const { setActions } = useNavbarActions();

  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data: categoriesData } = useCategories();
  const bulkDelete = useBulkDeleteTransactions();
  const bulkCategorize = useBulkCategorizeTransactions();
  const [txFilters, setTxFilters] = useState<TransactionFilters>({
    account_id: accountId,
    page: 1,
    page_size: 50,
    sort: "-date",
  });

  const { data: accountData, isLoading: accountLoading } = useAccount(accountId);
  const { data: txData, isLoading: txLoading } = useTransactions(txFilters);

  useEffect(() => {
    const normalActions = (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
          <ArrowLeftRight className="h-4 w-4 me-1" />
          {tAccounts("transferFunds")}
        </Button>
        <Button size="sm" variant="outline" disabled>
          {tAccounts("accountStatements")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setBulkMode(true)}>
          {t("transactions.manage")}
        </Button>
      </div>
    );

    if (!bulkMode) {
      setActions(normalActions);
    } else if (selectedIds.size === 0) {
      setActions(
        <Button variant="secondary" size="sm" onClick={() => { setBulkMode(false); setSelectedIds(new Set()); }}>
          {t("transactions.cancel")}
        </Button>
      );
    } else {
      setActions(
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("transactions.selectedCount", { count: selectedIds.size })}</span>
          <Select
            onValueChange={async (val) => {
              try {
                await bulkCategorize.mutateAsync({ ids: [...selectedIds], category_id: Number(val) });
                setBulkMode(false); setSelectedIds(new Set());
              } catch (error) {
                console.error("Bulk categorize failed:", error);
              }
            }}
            disabled={bulkCategorize.isPending}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder={t("transactions.recategorize")} />
            </SelectTrigger>
            <SelectContent>
              {(categoriesData?.data || []).map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  <span className="flex items-center gap-2">
                    <CategoryIcon icon={cat.icon} className="h-3.5 w-3.5 shrink-0" />
                    {locale === "ar" && cat.name_ar ? cat.name_ar : cat.name_en}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="destructive"
            size="sm"
            disabled={bulkDelete.isPending}
            onClick={async () => {
              try {
                await bulkDelete.mutateAsync({ ids: [...selectedIds] });
                setBulkMode(false); setSelectedIds(new Set());
              } catch (error) {
                console.error("Bulk delete failed:", error);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5 me-1" />
            {t("transactions.deleteSelected")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setBulkMode(false); setSelectedIds(new Set()); }}>
            {t("transactions.cancel")}
          </Button>
        </div>
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkMode, [...selectedIds].sort().join(','), bulkDelete.isPending, bulkCategorize.isPending, categoriesData, locale]);

  useEffect(() => () => setActions(null), [setActions]);

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
        <h2 className="text-base font-semibold mb-4">{t("transactions.heading")}</h2>
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
