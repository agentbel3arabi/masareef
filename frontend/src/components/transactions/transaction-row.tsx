"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Trash2, Pencil } from "lucide-react";
import { CategoryIcon, getCategoryIcon } from "@/lib/category-icon";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { CURRENCIES, parseMajorToMinor } from "@/lib/money";
import { AccountPill } from "./account-pill";
import type { Transaction } from "@/hooks/use-transactions";
import type { Account } from "@/hooks/use-accounts";

interface TransactionRowProps {
  transaction: Transaction;
  showAccount?: boolean;
  account?: Account;
  bulkMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: number) => void;
}

export function TransactionRow({
  transaction,
  showAccount,
  account,
  bulkMode = false,
  selected = false,
  onToggleSelect,
}: TransactionRowProps) {
  const t = useTranslations();
  const locale = useLocale();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const deleteTx = useDeleteTransaction();
  const updateTx = useUpdateTransaction();

  // Edit form state — pre-filled from the transaction
  const exponent = CURRENCIES[transaction.currency]?.exponent ?? 2;
  const initialAmount = (Math.abs(transaction.amount_minor) / Math.pow(10, exponent)).toFixed(exponent);

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

    await updateTx.mutateAsync({
      id: transaction.id,
      date,
      description,
      amount_minor: Math.abs(amountMinor),
      type,
      category_id: categoryId || null,
      notes: notes || undefined,
    });

    setEditOpen(false);
  };

  const openEdit = () => {
    // Reset form state to current transaction values each time the dialog opens
    setDate(transaction.date);
    setDescription(transaction.description || "");
    setAmount((Math.abs(transaction.amount_minor) / Math.pow(10, exponent)).toFixed(exponent));
    setType(transaction.type as "debit" | "credit");
    setNotes(transaction.notes || "");
    setCategoryId(transaction.category?.id ?? "");
    setEditOpen(true);
  };

  return (
    <>
      <tr
        className={`border-b transition-colors group ${
          selected ? "bg-primary/10 border-s-2 border-primary" : "hover:bg-muted/40"
        }`}
      >
        {bulkMode && (
          <td className="px-4 py-3 w-10">
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggleSelect?.(transaction.id)}
              aria-label={t("transactions.selectTransaction", { id: transaction.id })}
            />
          </td>
        )}
        <td className="px-4 py-3 text-sm">{transaction.date}</td>
        <td className="px-4 py-3 text-sm">
          <div>{transaction.description || "—"}</div>
          {transaction.notes && (
            <div className="text-xs text-muted-foreground">{transaction.notes}</div>
          )}
        </td>
        {showAccount && (
          <td className="px-4 py-3">
            {account ? (
              <AccountPill
                accountId={account.id}
                accountName={account.name}
                accountType={account.type}
              />
            ) : null}
          </td>
        )}
        <td className="px-4 py-3">
          {transaction.category ? (
            <span className="inline-flex items-center gap-1.5 text-sm">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-muted text-muted-foreground shrink-0">
                {transaction.category.icon && getCategoryIcon(transaction.category.icon) ? (
                  <CategoryIcon icon={transaction.category.icon} className="h-3.5 w-3.5" />
                ) : transaction.category.color ? (
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: transaction.category.color }} />
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                )}
              </span>
              <span className="truncate max-w-[100px]">
                {locale === "ar" && transaction.category.name_ar
                  ? transaction.category.name_ar
                  : transaction.category.name_en}
              </span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
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
          {!bulkMode && (
            <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
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
          )}
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
                className="grow"
                onClick={() => { setType("debit"); setCategoryId(""); }}
              >
                {t("transactions.expense")}
              </Button>
              <Button
                type="button"
                variant={type === "credit" ? "default" : "outline"}
                className="grow"
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
              <Select
                value={categoryId === "" ? "__uncategorized__" : String(categoryId)}
                onValueChange={(val) => setCategoryId(val === "__uncategorized__" ? "" : Number(val))}
              >
                <SelectTrigger className="w-full">
                  {categoryId !== "" && categoriesData?.data?.find(c => c.id === categoryId) ? (
                    <span className="flex items-center gap-2">
                      <CategoryIcon icon={categoriesData.data.find(c => c.id === categoryId)!.icon} className="h-4 w-4 shrink-0" />
                      {(() => { const cat = categoriesData.data.find(c => c.id === categoryId)!; return locale === "ar" && cat.name_ar ? cat.name_ar : cat.name_en; })()}
                    </span>
                  ) : (
                    <SelectValue placeholder={t("transactions.uncategorized")} />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__uncategorized__">{t("transactions.uncategorized")}</SelectItem>
                  {(categoriesData?.data || []).map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      <span className="flex items-center gap-2">
                        <CategoryIcon icon={cat.icon} className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {locale === "ar" && cat.name_ar ? cat.name_ar : cat.name_en}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
