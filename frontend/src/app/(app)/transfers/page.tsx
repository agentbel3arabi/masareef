"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useTransfers, useDeleteTransfer } from "@/hooks/use-transfers";
import { TransferForm } from "@/components/transfers/transfer-form";
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
import { ArrowRight, Trash2 } from "lucide-react";

export default function TransfersPage() {
  const t = useTranslations();
  const [page] = useState(1);
  const { data, isLoading } = useTransfers(page);
  const deleteTransfer = useDeleteTransfer();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("nav.transfers")}</h1>
        <TransferForm />
      </div>

      {isLoading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
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
              {(data?.data || []).map((transfer) => (
                <tr key={transfer.transfer_id} className="border-b">
                  <td className="px-4 py-3 text-sm">{transfer.date}</td>
                  <td className="px-4 py-3 text-sm">{transfer.from_account?.name}</td>
                  <td className="px-4 py-3 text-center">
                    <ArrowRight className="h-4 w-4 inline text-muted-foreground" />
                  </td>
                  <td className="px-4 py-3 text-sm">{transfer.to_account?.name}</td>
                  <td className="px-4 py-3 text-end">
                    <MoneyDisplay
                      amount={transfer.source_amount}
                      currency={transfer.from_account?.currency || "EGP"}
                      showCurrency
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(transfer.transfer_id)}
                      aria-label={t("common.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {(!data?.data || data.data.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {t("transfers.noTransfers")}
                  </td>
                </tr>
              )}
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
