"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredLabel } from "@/components/shared/required-label";
import { FieldError } from "@/components/shared/field-error";
import { FormSheet } from "@/components/shared/form-sheet";
import { useAccounts } from "@/hooks/use-accounts";
import { useCreateTransfer } from "@/hooks/use-transfers";
import { CURRENCIES, parseMajorToMinor } from "@/lib/money";

interface TransferFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferForm({ open, onOpenChange }: TransferFormProps) {
  const t = useTranslations();
  const { data: accountsData } = useAccounts();
  const createTransfer = useCreateTransfer();

  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [fxRate, setFxRate] = useState("");

  const accounts = accountsData?.data || [];
  const fromAccount = accounts.find((a) => a.id === Number(fromId));
  const toAccount = accounts.find((a) => a.id === Number(toId));
  const isCrossCurrency = fromAccount && toAccount && fromAccount.currency !== toAccount.currency;

  const fromExponent = CURRENCIES[fromAccount?.currency || "EGP"]?.exponent ?? 2;
  const amountStep = (1 / Math.pow(10, fromExponent)).toFixed(fromExponent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!fromId || !toId || !amount || !date) return;
    const amountMinor = parseMajorToMinor(amount, fromExponent);

    await createTransfer.mutateAsync({
      from_account_id: Number(fromId),
      to_account_id: Number(toId),
      amount_minor: amountMinor,
      date,
      description: description || undefined,
      fx_rate_minor_units: isCrossCurrency && fxRate
        ? parseMajorToMinor(fxRate, 4)
        : undefined,
    });

    onOpenChange(false);
    setFromId("");
    setToId("");
    setAmount("");
    setDescription("");
    setFxRate("");
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("transfers.transferBetween")}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <RequiredLabel required>{t("transfers.fromAccount")}</RequiredLabel>
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">{t("transfers.selectAccount")}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
          <FieldError show={submitted && !fromId} message={t("common.fieldRequired")} />
        </div>

        <div className="space-y-2">
          <RequiredLabel required>{t("transfers.toAccount")}</RequiredLabel>
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">{t("transfers.selectAccount")}</option>
            {accounts.filter((a) => a.id !== Number(fromId)).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
          <FieldError show={submitted && !toId} message={t("common.fieldRequired")} />
        </div>

        <div className="space-y-2">
          <RequiredLabel required>{t("common.amount")} ({fromAccount?.currency || ""})</RequiredLabel>
          <Input
            type="number"
            step={amountStep}
            min={amountStep}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <FieldError show={submitted && !amount} message={t("common.fieldRequired")} />
        </div>

        {isCrossCurrency && (
          <div className="space-y-2">
            <RequiredLabel required>
              {t("transfers.exchangeRate", {
                from: fromAccount?.currency,
                to: toAccount?.currency,
              })}
            </RequiredLabel>
            <Input
              type="number"
              step="0.0001"
              value={fxRate}
              onChange={(e) => setFxRate(e.target.value)}
              placeholder="e.g., 0.0199"
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <RequiredLabel required>{t("common.date")}</RequiredLabel>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label>{t("common.description")}</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("transfers.descriptionPlaceholder")}
          />
        </div>

        <Button type="submit" className="w-full" disabled={createTransfer.isPending}>
          {createTransfer.isPending ? t("common.loading") : t("transfers.transfer")}
        </Button>
      </form>
    </FormSheet>
  );
}
