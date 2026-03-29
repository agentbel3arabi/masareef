"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftRight, Trash2 } from "lucide-react";
import { useTransfers, useDeleteTransfer } from "@/hooks/use-transfers";
import { TransferForm } from "@/components/transfers/transfer-form";
import { AccountMiniCard } from "@/components/transfers/account-mini-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { TransactionTableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";

export default function TransfersPage() {
  const t = useTranslations();
  const tEmpty = useTranslations("emptyStates");
  const [page] = useState(1);
  const { data, isLoading } = useTransfers(page);
  const deleteTransfer = useDeleteTransfer();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const transfers = data?.data || [];
  const isEmpty = !isLoading && transfers.length === 0;
  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t("nav.transfers")}</h1>
        <TransferForm open={createOpen} onOpenChange={setCreateOpen} />
      </div>

      {isLoading ? (
        <TransactionTableSkeleton />
      ) : isEmpty ? (
        <EmptyState
          icon={ArrowLeftRight}
          title={tEmpty("transfers.title")}
          description={tEmpty("transfers.description")}
          action={{ label: tEmpty("transfers.action"), onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-start text-sm font-medium">{t("transfers.date")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium">{t("transfers.from")}</th>
                <th className="px-4 py-3 text-center text-sm font-medium"></th>
                <th className="px-4 py-3 text-start text-sm font-medium">{t("transfers.to")}</th>
                <th className="px-4 py-3 text-end text-sm font-medium">{t("transfers.amount")}</th>
                <th className="px-4 py-3 w-16">
                  <span className="sr-only">{t("transfers.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((transfer) => (
                <tr key={transfer.transfer_id} className="border-b hover:bg-accent/50 transition-colors group">
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {dateFormatter.format(new Date(transfer.date))}
                  </td>
                  <td className="px-4 py-3">
                    {transfer.from_account ? <AccountMiniCard {...transfer.from_account} /> : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">→</td>
                  <td className="px-4 py-3">
                    {transfer.to_account ? <AccountMiniCard {...transfer.to_account} /> : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <MoneyDisplay
                      amount={-transfer.source_amount}
                      currency={transfer.from_account?.currency ?? "EGP"}
                      colorize
                      showCurrency
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity"
                      onClick={() => setDeleteId(transfer.transfer_id)}
                      aria-label={t("common.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("transfers.deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("transfers.deleteConfirmDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteTransfer.isPending}
              onClick={async () => {
                if (deleteId) {
                  await deleteTransfer.mutateAsync(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              {deleteTransfer.isPending ? t("common.loading") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
