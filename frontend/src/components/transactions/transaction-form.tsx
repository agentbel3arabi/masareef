"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSheet } from "@/components/shared/form-sheet";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { CURRENCIES, parseMajorToMinor } from "@/lib/money";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryIcon } from "@/lib/category-icon";

interface TransactionFormProps {
  accountId: number;
  accountCurrency?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionForm({
  accountId,
  accountCurrency = "EGP",
  open,
  onOpenChange,
}: TransactionFormProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"debit" | "credit">("debit");
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");

  const createTx = useCreateTransaction();
  const { data: categoriesData } = useCategories(type === "debit" ? "expense" : "income");
  const selectedCategory = categoriesData?.data?.find((c) => c.id === categoryId);

  const exponent = CURRENCIES[accountCurrency]?.exponent ?? 2;
  const amountStep = (1 / Math.pow(10, exponent)).toFixed(exponent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountMinor = Math.abs(parseMajorToMinor(amount, exponent));
    if (amountMinor === 0) return;

    try {
      await createTx.mutateAsync({
        account_id: accountId,
        date,
        description,
        amount_minor: amountMinor,
        type,
        currency: accountCurrency,
        category_id: categoryId || undefined,
        notes: notes || undefined,
      });

      onOpenChange(false);
      setDescription("");
      setAmount("");
      setNotes("");
      setCategoryId("");
    } catch {
      // Error toast shown by useApiMutation.onError — keep form open for retry
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("transactions.newTransaction")}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
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
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
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
              {selectedCategory ? (
                <span className="flex items-center gap-2">
                  <CategoryIcon icon={selectedCategory.icon} className="h-4 w-4 shrink-0" />
                  {locale === "ar" && selectedCategory.name_ar
                    ? selectedCategory.name_ar
                    : selectedCategory.name_en}
                </span>
              ) : (
                <SelectValue placeholder={t("transactions.uncategorized")} />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__uncategorized__">
                {t("transactions.uncategorized")}
              </SelectItem>
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
          <Label>{t("common.amount")} ({accountCurrency})</Label>
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

        <Button type="submit" className="w-full" disabled={createTx.isPending}>
          {createTx.isPending ? t("common.loading") : t("common.save")}
        </Button>
      </form>
    </FormSheet>
  );
}
