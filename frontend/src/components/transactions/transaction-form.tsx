"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
import { Plus } from "lucide-react";

interface TransactionFormProps {
  accountId: number;
  accountCurrency?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TransactionForm({
  accountId,
  accountCurrency = "EGP",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: TransactionFormProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && controlledOnOpenChange !== undefined;
  const open = isControlled ? (controlledOpen as boolean) : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next);
    }
    controlledOnOpenChange?.(next);
  };
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"debit" | "credit">("debit");
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");

  const createTx = useCreateTransaction();
  const { data: categoriesData } = useCategories(type === "debit" ? "expense" : "income");

  const exponent = CURRENCIES[accountCurrency]?.exponent ?? 2;
  const amountStep = (1 / Math.pow(10, exponent)).toFixed(exponent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountMinor = parseMajorToMinor(amount, exponent);

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

    setOpen(false);
    setDescription("");
    setAmount("");
    setNotes("");
    setCategoryId("");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button size="sm" />}>
        <Plus className="h-4 w-4 me-1" />
        {t("transactions.addTransaction")}
      </SheetTrigger>
      <SheetContent side="end" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("transactions.newTransaction")}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
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
              value={categoryId === "" ? undefined : String(categoryId)}
              onValueChange={(val) => setCategoryId(val ? Number(val) : "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("transactions.uncategorized")} />
              </SelectTrigger>
              <SelectContent>
                {(categoriesData?.data || []).map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.icon && (
                      <span className="me-2 text-muted-foreground">{cat.icon}</span>
                    )}
                    {locale === "ar" && cat.name_ar ? cat.name_ar : cat.name_en}
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
      </SheetContent>
    </Sheet>
  );
}
