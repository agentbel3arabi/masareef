"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeftRight, Trash2, Plus } from "lucide-react";
import { useTransfers, useDeleteTransfer, type Transfer } from "@/hooks/use-transfers";
import { useNavbarActions } from "@/contexts/navbar-actions-context";
import { TransferForm } from "@/components/transfers/transfer-form";
import { AccountMiniCard } from "@/components/transfers/account-mini-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TransactionTableSkeleton } from "@/components/shared/skeletons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export default function TransfersPage() {
  const t = useTranslations();
  const tEmpty = useTranslations("emptyStates");
  const locale = useLocale();

  const { setActions } = useNavbarActions();

  const [page] = useState(1);
  const { data, isLoading } = useTransfers(page);
  const deleteTransfer = useDeleteTransfer();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedTransferIds, setSelectedTransferIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!bulkMode) {
      setActions(
        <Button variant="outline" size="sm" onClick={() => { setBulkMode(true); setSelectedTransferIds(new Set()); }}>
          {t("transactions.manage")}
        </Button>
      );
    } else if (selectedTransferIds.size === 0) {
      setActions(
        <Button variant="secondary" size="sm" onClick={() => { setBulkMode(false); setSelectedTransferIds(new Set()); }}>
          {t("common.cancel")}
        </Button>
      );
    } else {
      setActions(
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{selectedTransferIds.size} {t("transfers.selected")}</span>
          <Button
            variant="destructive"
            size="sm"
            disabled={deleteTransfer.isPending}
            onClick={async () => {
              await Promise.all([...selectedTransferIds].map((id) => deleteTransfer.mutateAsync(id)));
              setBulkMode(false);
              setSelectedTransferIds(new Set());
            }}
          >
            <Trash2 className="h-3.5 w-3.5 me-1" />
            {t("common.delete")} ({selectedTransferIds.size})
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setBulkMode(false); setSelectedTransferIds(new Set()); }}>
            {t("common.cancel")}
          </Button>
        </div>
      );
    }
    return () => setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkMode, selectedTransferIds.size]);

  const transfers = (data?.data ?? []) as Transfer[];
  const isEmpty = !isLoading && transfers.length === 0;

  const dateFormatter = new Intl.DateTimeFormat(
    locale === "ar" ? "ar-EG" : "en-US",
    { dateStyle: "medium" }
  );

  const allSelected =
    transfers.length > 0 && transfers.every((tr) => selectedTransferIds.has(tr.transfer_id));

  const baseColumns = [
    {
      key: "date",
      header: t("transfers.date"),
      render: (row: Transfer) => (
        <span className="text-sm text-muted-foreground">
          {dateFormatter.format(new Date(row.date))}
        </span>
      ),
    },
    {
      key: "from",
      header: t("transfers.from"),
      render: (row: Transfer) =>
        row.from_account ? (
          <AccountMiniCard {...row.from_account} />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "arrow",
      header: "",
      className: "w-8 text-center",
      render: () => (
        <ArrowLeftRight className="h-4 w-4 mx-auto text-muted-foreground/40" />
      ),
    },
    {
      key: "to",
      header: t("transfers.to"),
      render: (row: Transfer) =>
        row.to_account ? (
          <AccountMiniCard {...row.to_account} />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "amount",
      header: t("transfers.amount"),
      className: "text-end",
      render: (row: Transfer) => (
        <MoneyDisplay
          amount={-row.source_amount}
          currency={row.from_account?.currency ?? "EGP"}
          colorize
          showCurrency
        />
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-16",
      render: (row: Transfer) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteId(row.transfer_id);
          }}
          aria-label={t("common.delete")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const checkboxColumn = {
    key: "checkbox",
    header: (
      <Checkbox
        checked={allSelected}
        onCheckedChange={(checked) => {
          if (checked) setSelectedTransferIds(new Set(transfers.map((tr) => tr.transfer_id)));
          else setSelectedTransferIds(new Set());
        }}
      />
    ),
    className: "w-10",
    render: (row: Transfer) => (
      <Checkbox
        checked={selectedTransferIds.has(row.transfer_id)}
        onCheckedChange={() => {
          setSelectedTransferIds((prev) => {
            const next = new Set(prev);
            next.has(row.transfer_id) ? next.delete(row.transfer_id) : next.add(row.transfer_id);
            return next;
          });
        }}
      />
    ),
  };

  const columns = bulkMode ? [checkboxColumn, ...baseColumns] : baseColumns;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <h1 className="text-2xl font-bold text-foreground">{t("nav.transfers")}</h1>

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
        <DataTable
          columns={columns}
          data={transfers}
          keyExtractor={(row) => row.transfer_id}
        />
      )}

      {/* FAB */}
      <button
        onClick={() => setCreateOpen(true)}
        aria-label={t("transfers.newTransfer")}
        className="fixed bottom-6 end-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg hover:shadow-xl active:scale-95 transition-all"
      >
        <Plus className="h-6 w-6" />
      </button>

      <TransferForm open={createOpen} onOpenChange={setCreateOpen} />

      <Dialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
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
