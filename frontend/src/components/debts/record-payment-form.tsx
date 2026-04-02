"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FormSheet } from "@/components/shared/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRecordPayment } from "@/hooks/use-debts";
import { CURRENCIES } from "@/lib/money";

interface RecordPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtId: number;
  currency: string;
}

function toMinor(displayValue: string, currency: string): number {
  const exp = CURRENCIES[currency]?.exponent ?? 2;
  return Math.round(parseFloat(displayValue || "0") * Math.pow(10, exp));
}

export function RecordPaymentForm({
  open,
  onOpenChange,
  debtId,
  currency,
}: RecordPaymentFormProps) {
  const t = useTranslations("debts.form.payment");
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useRecordPayment(debtId);

  const resetFields = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setAmount("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(
      {
        date,
        amount_minor: toMinor(amount, currency),
        notes: notes || null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          resetFields();
        },
      }
    );
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="payment-date">{t("date")}</Label>
          <Input
            id="payment-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment-amount">{t("amount")}</Label>
          <Input
            id="payment-amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment-notes">{t("notes")}</Label>
          <textarea
            id="payment-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? t("saving") : t("submit")}
        </Button>
      </form>
    </FormSheet>
  );
}
