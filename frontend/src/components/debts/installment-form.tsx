"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { FieldError } from "@/components/shared/field-error";
import { FormSheet } from "@/components/shared/form-sheet";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredLabel } from "@/components/shared/required-label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useCreateInstallment, useUpdateInstallment } from "@/hooks/use-installments";
import { useAccounts } from "@/hooks/use-accounts";
import { CURRENCIES, parseMajorToMinor, formatAmount } from "@/lib/money";
import type {
  InstallmentType,
  InstallmentResponse,
} from "@/lib/types/debts";

interface InstallmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: InstallmentType;
  initialData?: InstallmentResponse;
}

const INSTALLMENT_TYPES: InstallmentType[] = [
  "credit_card",
  "store",
  "financing_app",
];

const FINANCING_PROVIDERS = ["ValU", "Souhoola", "Sympl", "Forsa", "Tru", "Contact", "Shahry"];

const CURRENCY_CODES = Object.keys(CURRENCIES);

export function InstallmentForm({
  open,
  onOpenChange,
  defaultType,
  initialData,
}: InstallmentFormProps) {
  const t = useTranslations("debts.form.installment");
  const isEdit = !!initialData;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t("editTitle") : t("title")}
      description={isEdit ? t("editDescription") : t("description")}
    >
      <InstallmentFormContent
        key={initialData?.id ?? "new"}
        initialData={initialData}
        defaultType={defaultType}
        onOpenChange={onOpenChange}
      />
    </FormSheet>
  );
}

function InstallmentFormContent({
  initialData,
  defaultType,
  onOpenChange,
}: Omit<InstallmentFormProps, "open">) {
  const t = useTranslations("debts.form.installment");
  const tCommon = useTranslations("common");
  const isEdit = !!initialData;

  const [type, setType] = useState<InstallmentType>(
    initialData?.type ?? defaultType ?? "credit_card"
  );
  const [name, setName] = useState(initialData?.name ?? "");
  const [merchantName, setMerchantName] = useState(
    initialData?.merchant_name ?? ""
  );
  const [currency, setCurrency] = useState(initialData?.currency ?? "EGP");
  const [totalAmount, setTotalAmount] = useState(
    initialData
      ? formatAmount(initialData.total_amount_minor, initialData.currency)
      : ""
  );
  const [annualRate, setAnnualRate] = useState(
    initialData ? String(initialData.annual_rate_bps / 100) : "0"
  );
  const [totalMonths, setTotalMonths] = useState(
    initialData ? String(initialData.total_months) : ""
  );
  const [startDate, setStartDate] = useState(initialData?.start_month ?? "");
  const [paymentDayOfMonth, setPaymentDayOfMonth] = useState(
    initialData?.payment_day_of_month ? String(initialData.payment_day_of_month) : ""
  );
  const [sourceAccountId, setSourceAccountId] = useState(
    initialData?.source_account_id ? String(initialData.source_account_id) : ""
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const createMutation = useCreateInstallment();
  const updateMutation = useUpdateInstallment();
  const { data: accountsData } = useAccounts();

  const filteredAccounts = useMemo(() => {
    const allAccounts = accountsData?.data ?? [];
    if (type === "credit_card" || type === "store") {
      return allAccounts.filter((a) => a.type === "credit_card");
    }
    if (type === "financing_app") {
      return allAccounts.filter((a) => a.type === "financing_app");
    }
    return [];
  }, [accountsData, type]);

  const selectedAccount = filteredAccounts.find(
    (a) => String(a.id) === sourceAccountId
  );

  const sourceRequired = type === "credit_card" || type === "financing_app";
  const [submitted, setSubmitted] = useState(false);

  // Auto-set payment day from start date when not yet set
  /* eslint-disable react-hooks/set-state-in-effect -- intentional one-time sync from start_date */
  useEffect(() => {
    if (startDate && !paymentDayOfMonth) {
      const day = new Date(startDate).getDate();
      setPaymentDayOfMonth(String(Math.min(day, 28)));
    }
  }, [startDate]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  // Live preview calculation (matches loan form amortization)
  const livePreview = useMemo(() => {
    if (!totalAmount || !totalMonths) return null;
    const exponent = CURRENCIES[currency]?.exponent ?? 2;
    const totalMinor = parseMajorToMinor(totalAmount, exponent);
    const rateBps = annualRate ? Math.round(parseFloat(annualRate) * 100) : 0;
    const months = parseInt(totalMonths, 10);
    if (months <= 0 || totalMinor <= 0) return null;

    let monthlyPayment: number;
    if (rateBps === 0) {
      monthlyPayment = Math.ceil(totalMinor / months);
    } else {
      const periodRate = rateBps / (10000 * 12);
      const factor = Math.pow(1 + periodRate, months);
      monthlyPayment = Math.ceil(totalMinor * (periodRate * factor) / (factor - 1));
    }
    const totalCost = monthlyPayment * months;
    const totalInterest = totalCost - totalMinor;

    return { monthlyPayment, totalCost, totalInterest };
  }, [totalAmount, totalMonths, annualRate, currency]);

  const resetFields = () => {
    setType(defaultType ?? "credit_card");
    setName("");
    setMerchantName("");
    setCurrency("EGP");
    setTotalAmount("");
    setAnnualRate("0");
    setTotalMonths("");
    setStartDate("");
    setPaymentDayOfMonth("");
    setSourceAccountId("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!isEdit && (!name.trim() || !totalAmount || !totalMonths || !startDate)) return;
    if (!isEdit && sourceRequired && (!sourceAccountId || sourceAccountId === "__none__")) return;
    if (isEdit && !name.trim()) return;
    const exponent = CURRENCIES[currency]?.exponent ?? 2;

    // Calculate monthly amount from live preview for submission
    const monthlyAmountMinor = livePreview?.monthlyPayment ?? Math.ceil(parseMajorToMinor(totalAmount, exponent) / parseInt(totalMonths || "1", 10));

    if (isEdit && initialData) {
      updateMutation.mutate(
        {
          id: initialData.id,
          name,
          merchant_name: merchantName || null,
          linked_account_id: null,
          notes: notes || null,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          type,
          name,
          merchant_name: merchantName || null,
          source_account_id:
            sourceAccountId && sourceAccountId !== "__none__"
              ? parseInt(sourceAccountId, 10)
              : null,
          linked_account_id: null,
          total_amount_minor: parseMajorToMinor(totalAmount, exponent),
          monthly_amount_minor: monthlyAmountMinor,
          total_months: parseInt(totalMonths, 10),
          start_month: startDate,
          currency,
          annual_rate_bps: Math.round(parseFloat(annualRate || "0") * 100),
          payment_day_of_month: paymentDayOfMonth ? parseInt(paymentDayOfMonth, 10) : null,
          notes: notes || null,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            resetFields();
          },
        }
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        {/* Installment Type — create only */}
        {!isEdit && (
          <div className="space-y-2">
            <Label>{t("type")}</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType((v ?? "credit_card") as InstallmentType);
                setSourceAccountId("");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>{t(`types.${type}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {INSTALLMENT_TYPES.map((it) => (
                  <SelectItem key={it} value={it}>
                    {t(`types.${it}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Plan Name */}
        <div className="space-y-2">
          <RequiredLabel required htmlFor="inst-name">{t("name")}</RequiredLabel>
          {type === "financing_app" && !isEdit ? (
            <>
              <Input
                id="inst-name"
                list="provider-suggestions"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("selectProvider")}
                required
              />
              <datalist id="provider-suggestions">
                {FINANCING_PROVIDERS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </>
          ) : (
            <Input
              id="inst-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <FieldError show={submitted && !name.trim()} message={tCommon("fieldRequired")} />
        </div>

        {/* Merchant Name */}
        <div className="space-y-2">
          <Label htmlFor="inst-merchant">{t("merchant")}</Label>
          <Input
            id="inst-merchant"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
          />
        </div>

        {!isEdit && (
          <>
            {/* Currency */}
            <div className="space-y-2">
              <Label>{t("currency")}</Label>
              <Select
                value={currency}
                onValueChange={(v) => setCurrency(v ?? "EGP")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectCurrency")} />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code} — {CURRENCIES[code].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Total Amount */}
            <div className="space-y-2">
              <RequiredLabel required htmlFor="inst-total">{t("totalAmount")}</RequiredLabel>
              <Input
                id="inst-total"
                type="number"
                step={String(
                  Math.pow(10, -(CURRENCIES[currency]?.exponent ?? 2))
                )}
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                required
                min="0.01"
              />
              <FieldError show={submitted && !totalAmount} message={tCommon("fieldRequired")} />
            </div>

            {/* Annual Rate */}
            <div className="space-y-2">
              <Label htmlFor="inst-rate">{t("rate")}</Label>
              <Input
                id="inst-rate"
                type="number"
                step="0.01"
                min="0"
                value={annualRate}
                onChange={(e) => setAnnualRate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t("rateHint")}</p>
            </div>

            {/* Tenure (months) */}
            <div className="space-y-2">
              <RequiredLabel required htmlFor="inst-months">{t("tenure")}</RequiredLabel>
              <Input
                id="inst-months"
                type="number"
                min="1"
                value={totalMonths}
                onChange={(e) => setTotalMonths(e.target.value)}
                required
              />
              <FieldError show={submitted && !totalMonths} message={tCommon("fieldRequired")} />
            </div>

            {/* Live Preview */}
            {livePreview && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t("livePreview.monthlyPayment")}</span>
                  <MoneyDisplay amount={livePreview.monthlyPayment} currency={currency} size="md" className="font-bold text-primary" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t("livePreview.totalCost")}</span>
                  <MoneyDisplay amount={livePreview.totalCost} currency={currency} size="sm" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t("livePreview.totalInterest")}</span>
                  <MoneyDisplay amount={livePreview.totalInterest} currency={currency} size="sm" />
                </div>
                {paymentDayOfMonth && (
                  <p className="text-xs text-muted-foreground">{t("livePreview.paymentDay", { day: paymentDayOfMonth })}</p>
                )}
              </div>
            )}

            {/* Start Date */}
            <div className="space-y-2">
              <RequiredLabel required htmlFor="inst-start">{t("startDate")}</RequiredLabel>
              <Input
                id="inst-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <FieldError show={submitted && !startDate} message={tCommon("fieldRequired")} />
            </div>

            {/* Payment Day of Month */}
            <div className="space-y-2">
              <Label>{t("paymentDayOfMonth")}</Label>
              <Select
                value={paymentDayOfMonth}
                onValueChange={(v) => setPaymentDayOfMonth(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="1-28" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      {String(day)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Linked Account (Source Account) */}
            <div className="space-y-2">
              <RequiredLabel required={sourceRequired}>
                {t("linkedAccount")}
              </RequiredLabel>
              <Select
                value={sourceAccountId}
                onValueChange={(v) => setSourceAccountId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectAccount")}>
                    {selectedAccount?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {!sourceRequired && (
                    <SelectItem value="__none__">{t("none")}</SelectItem>
                  )}
                  {filteredAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={String(acc.id)}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError
                show={submitted && sourceRequired && (!sourceAccountId || sourceAccountId === "__none__")}
                message={tCommon("fieldRequired")}
              />
            </div>
          </>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="inst-notes">{t("notes")}</Label>
          <textarea
            id="inst-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? t("saving") : isEdit ? t("update") : t("submit")}
        </Button>
      </form>
  );
}
