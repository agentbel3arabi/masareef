"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Trash2, Pencil } from "lucide-react";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useDeleteTransaction, useUpdateTransaction } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { CURRENCIES, parseMajorToMinor, formatAmount } from "@/lib/money";
import type { Transaction } from "@/hooks/use-transactions";

interface TransactionRowProps {
  transaction: Transaction;
  showAccount?: boolean;
}

export function TransactionRow({ transaction }: TransactionRowProps) {
  const t = useTranslations();
  const locale = useLocale();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const deleteTx = useDeleteTransaction();
  const updateTx = useUpdateTransaction();

  // Edit form state — pre-filled from the transaction
  const exponent = CURRENCIES[transaction.currency]?.exponent ?? 2;
  const initialAmount = formatAmount(Math.abs(transaction.amount_minor), transaction.currency);

  const [date, setDate] = useState(transaction.date);
  const [description, setDescription] = useState(transaction.description || "");
  const [amount, setAmount] = useState(initialAmount);
  const [type, setType] = useState<"debit" | "credit">(transaction.type as "debit" | "credit");
  const [notes, setNotes] = useState(transaction.notes || "");
  const [categoryId, setCategoryId] = useState<number | "">(
    transaction.category?.id ?? ""
  );

  const { data: categoriesData } = useCategories(type === "debit" ? "expense" : "income");

  const amountStep = (1 / Math.pow(10, exponent)).toFixed(exponent);

  const handleDelete = async () => {
    await deleteTx.mutateAsync(transaction.id);
    setDeleteOpen(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountMinor = parseMajorToMinor(amount, exponent);
    const signedAmount = type === "debit" ? -Math.abs(amountMinor) : Math.abs(amountMinor);

    await updateTx.mutateAsync({
      id: transaction.id,
      data: {
        account_id: transaction.account_id,
        date,
        description,
        amount_minor: signedAmount,
        type,
        currency: transaction.currency,
        category_id: categoryId || undefined,
        notes: notes || undefined,
      },
    });

    setEditOpen(false);
  };

  const openEdit = () => {
    // Reset form state to current transaction values each time the dialog opens
    setDate(transaction.date);
    setDescription(transaction.description || "");
    setAmount(formatAmount(Math.abs(transaction.amount_minor), transaction.currency));
    setType(transaction.type as "debit" | "credit");
    setNotes(transaction.notes || "");
    setCategoryId(transaction.category?.id ?? "");
    setEditOpen(true);
  };

  return (
    <>
      <tr className="border-b hover:bg-accent/50 transition-colors">
        <td className="px-4 py-3 text-sm">{transaction.date}</td>
        <td className="px-4 py-3 text-sm">
          <div>{transaction.description || "—"}</div>
          {transaction.notes && (
            <div className="text-xs text-muted-foreground">{transaction.notes}</div>
          )}
        </td>
        <td className="px-4 py-3">
          {transaction.category ? (
            <Badge variant="secondary" className="gap-1.5">
              {transaction.category.color && (
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: transaction.category.color }}
                />
              )}
              {locale === "ar" && transaction.category.name_ar
                ? transaction.category.name_ar
                : transaction.category.name_en}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">{t("transactions.uncategorized")}</span>
          )}
        </td>
        <td className="px-4 py-3 text-end">
          <MoneyDisplay
            amount={transaction.amount_minor}
            currency={transaction.currency}
            colorize
            showCurrency={false}
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={openEdit}
              aria-label={t("common.edit")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
              aria-label={t("common.delete")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("transactions.deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("transactions.deleteConfirmDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTx.isPending}
            >
              {deleteTx.isPending ? t("common.loading") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("transactions.editTransaction")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === "debit" ? "default" : "outline"}
                className="flex-1"
                onClick={() => { setType("debit"); setCategoryId(""); }}
              >
                {t("transactions.expense")}
              </Button>
              <Button
                type="button"
                variant={type === "credit" ? "default" : "outline"}
                className="flex-1"
                onClick={() => { setType("credit"); setCategoryId(""); }}
              >
                {t("transactions.incomeType")}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>{t("common.date")}</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t("common.description")}</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("transactions.descriptionPlaceholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t("transactions.category")}</Label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{t("transactions.uncategorized")}</option>
                {(categoriesData?.data || []).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {locale === "ar" && cat.name_ar ? cat.name_ar : cat.name_en}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>{t("common.amount")} ({transaction.currency})</Label>
              <Input
                type="number"
                step={amountStep}
                min={amountStep}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t("transactions.notes")}</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={updateTx.isPending}>
                {updateTx.isPending ? t("common.loading") : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
