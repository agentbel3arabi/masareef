"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RequiredLabel } from "@/components/shared/required-label";
import { FieldError } from "@/components/shared/field-error";
import { FormSheet } from "@/components/shared/form-sheet";
import { CurrencyInput } from "@/components/shared/currency-input";
import { DatePicker } from "@/components/shared/date-picker";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { useAccounts } from "@/hooks/use-accounts";
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
  accountId?: number;
  accountCurrency?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionForm({
  accountId,
  accountCurrency,
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
  const [selectedAccountId, setSelectedAccountId] = useState<number | "">(accountId ?? "");
  const [submitted, setSubmitted] = useState(false);

  const { data: accountsData } = useAccounts();
  const accounts = accountsData?.data ?? [];

  // Reset account selection when form opens
  /* eslint-disable react-hooks/set-state-in-effect -- intentional reset on open */
  useEffect(() => {
    if (open) {
      setSelectedAccountId(accountId ?? "");
    }
  }, [open, accountId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const activeAccountId = accountId ?? (selectedAccountId || undefined);
  const selectedAccount = accounts.find((a) => a.id === activeAccountId);
  const effectiveCurrency = selectedAccount?.currency ?? accountCurrency ?? "EGP";

  const createTx = useCreateTransaction();
  const { data: categoriesData } = useCategories(type === "debit" ? "expense" : "income");
  const selectedCategory = categoriesData?.data?.find((c) => c.id === categoryId);

  const exponent = CURRENCIES[effectiveCurrency]?.exponent ?? 2;
  const amountStep = (1 / Math.pow(10, exponent)).toFixed(exponent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!activeAccountId || !amount || !date) return;
    const amountMinor = Math.abs(parseMajorToMinor(amount, exponent));
    if (amountMinor === 0) return;

    try {
      await createTx.mutateAsync({
        account_id: activeAccountId,
        date,
        description,
        amount_minor: amountMinor,
        type,
        currency: effectiveCurrency,
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

        {!accountId && (
          <div className="space-y-2">
            <RequiredLabel required>{t("transactions.account")}</RequiredLabel>
            <Select
              value={selectedAccountId ? String(selectedAccountId) : ""}
              onValueChange={(val) => setSelectedAccountId(Number(val))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("transactions.selectAccount")} />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter((a) => a.is_active !== false)
                  .map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}{a.institution ? ` · ${locale === "ar" ? a.institution.name_ar : a.institution.name_en}` : ""} ({a.currency})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <FieldError show={submitted && !selectedAccountId} message={t("common.fieldRequired")} />
          </div>
        )}

        <div className="space-y-2">
          <RequiredLabel required>{t("common.date")}</RequiredLabel>
          <DatePicker value={date} onChange={setDate} />
        </div>

        <div className="space-y-2">
          <RequiredLabel required>{t("common.description")}</RequiredLabel>
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
                <span className="text-muted-foreground">{t("transactions.uncategorized")}</span>
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
          <RequiredLabel required>{t("common.amount")}</RequiredLabel>
          <CurrencyInput
            currency={effectiveCurrency}
            step={amountStep}
            min={amountStep}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <FieldError show={submitted && !amount} message={t("common.fieldRequired")} />
        </div>

        <div className="space-y-2">
          <Label>{t("transactions.notes")}</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="resize-y" />
        </div>

        <Button type="submit" className="w-full" disabled={createTx.isPending || !activeAccountId}>
          {createTx.isPending ? t("common.loading") : t("common.save")}
        </Button>
      </form>
    </FormSheet>
  );
}
