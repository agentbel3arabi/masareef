"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Receipt, ArrowLeftRight, Trash2, Upload, Settings } from "lucide-react";
import { useAccount } from "@/hooks/use-accounts";
import { useTransactions, useBulkDeleteTransactions, useBulkCategorizeTransactions, type TransactionFilters } from "@/hooks/use-transactions";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { useCategories } from "@/hooks/use-categories";
import { NavbarActions } from "@/components/layout/navbar-actions-portal";
import { AccountBalanceHeader } from "@/components/accounts/account-balance-header";
import { AccountObligationsSection } from "@/components/accounts/account-obligations-section";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionFilterBar } from "@/components/transactions/transaction-filters";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransferForm } from "@/components/transfers/transfer-form";
import { EmptyState } from "@/components/shared/empty-state";
import { ResponsiveActions } from "@/components/shared/responsive-actions";
import { FAB } from "@/components/shared/fab";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ComingSoon } from "@/components/shared/coming-soon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryIcon } from "@/lib/category-icon";

export default function AccountDetailPage() {
  const t = useTranslations();
  const tEmpty = useTranslations("emptyStates");
  const tAccounts = useTranslations("accounts");
  const locale = useLocale();
  const params = useParams();
  const router = useRouter();
  const accountId = Number(params.id);
  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const { bulkMode, selectedIds, enterBulkMode, exitBulkMode, toggleSelect, selectAll } = useBulkSelection();

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

  // Early returns AFTER all hooks
  if (accountLoading) return <p className="p-6 text-muted-foreground">{t("common.loading")}</p>;
  if (!accountData?.data) return <p className="p-6 text-muted-foreground">{t("accounts.notFound")}</p>;

  const account = accountData.data;
  const isEmpty = !txLoading && (txData?.data?.length ?? 0) === 0;

  return (
    <div className="space-y-6">
      {/* Account header — breadcrumb, name, balance, stats */}
      <AccountBalanceHeader account={account} />

      {/* Obligations section — only renders for accounts with linked debts/installments */}
      <AccountObligationsSection
        accountId={account.id}
        currency={account.currency}
      />

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
            onToggleSelect={toggleSelect}
            onSelectAll={selectAll}
          />
        )}
      </div>

      {/* FAB — add transaction */}
      <FAB
        onClick={() => setCreateOpen(true)}
        ariaLabel={t("transactions.addTransaction")}
        tooltip={t("transactions.addTransaction")}
      />

      <TransactionForm
        accountId={account.id}
        accountCurrency={account.currency}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <TransferForm open={transferOpen} onOpenChange={setTransferOpen} />

      {!bulkMode ? (
        <NavbarActions>
          <ResponsiveActions
            primary={
              <Button size="sm" variant="outline" onClick={enterBulkMode}>
                <Settings className="h-4 w-4 me-1" />
                {t("transactions.manage")}
              </Button>
            }
            secondary={
              <>
                <Button size="sm" variant="outline" onClick={() => router.push(`/import?accountId=${accountId}`)}>
                  <Upload className="size-4 me-1" />
                  {t("nav.import")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
                  <ArrowLeftRight className="h-4 w-4 me-1" />
                  {tAccounts("transferFunds")}
                </Button>
                <ComingSoon>
                  <Button size="sm" variant="outline" disabled>
                    <Receipt className="h-4 w-4 me-1" />
                    {tAccounts("accountStatements")}
                  </Button>
                </ComingSoon>
              </>
            }
            secondaryMenuItems={
              <>
                <DropdownMenuItem onClick={() => router.push(`/import?accountId=${accountId}`)}>
                  <Upload className="h-4 w-4 me-1" />
                  {t("nav.import")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTransferOpen(true)}>
                  <ArrowLeftRight className="h-4 w-4 me-1" />
                  {tAccounts("transferFunds")}
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Receipt className="h-4 w-4 me-1" />
                  {tAccounts("accountStatements")}
                </DropdownMenuItem>
              </>
            }
          />
        </NavbarActions>
      ) : selectedIds.size === 0 ? (
        <NavbarActions>
          <Button variant="secondary" size="sm" onClick={exitBulkMode}>
            {t("transactions.cancel")}
          </Button>
        </NavbarActions>
      ) : (
        <NavbarActions>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("transactions.selectedCount", { count: selectedIds.size })}</span>
            <Select
              onValueChange={async (val) => {
                try {
                  await bulkCategorize.mutateAsync({ ids: [...selectedIds], category_id: Number(val) });
                  exitBulkMode();
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
                  exitBulkMode();
                } catch (error) {
                  console.error("Bulk delete failed:", error);
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5 me-1" />
              {t("transactions.deleteSelected")}
            </Button>
            <Button variant="ghost" size="sm" onClick={exitBulkMode}>
              {t("transactions.cancel")}
            </Button>
          </div>
        </NavbarActions>
      )}
    </div>
  );
}
