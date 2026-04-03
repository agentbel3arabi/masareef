"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { useCreateDebt, useUpdateDebt } from "@/hooks/use-debts";
import { useAccounts } from "@/hooks/use-accounts";
import { CURRENCIES, parseMajorToMinor, formatAmount } from "@/lib/money";
import type { DebtResponse, PaymentFrequency } from "@/lib/types/debts";

interface BankLoanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: DebtResponse;
}

const CURRENCY_CODES = Object.keys(CURRENCIES);

const FREQUENCY_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  annual: 12,
};

export function BankLoanForm({ open, onOpenChange, initialData }: BankLoanFormProps) {
  const t = useTranslations("debts.form.loan");
  const isEdit = !!initialData;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t("editTitle") : t("title")}
      description={t("description")}
    >
      <BankLoanFormContent
        key={initialData?.id ?? "new"}
        initialData={initialData}
        onOpenChange={onOpenChange}
      />
    </FormSheet>
  );
}

function BankLoanFormContent({
  initialData,
  onOpenChange,
}: Omit<BankLoanFormProps, "open">) {
  const t = useTranslations("debts.form.loan");
  const tFreq = useTranslations("debts.frequency");
  const router = useRouter();
  const isEdit = !!initialData;

  const [name, setName] = useState(initialData?.name ?? "");
  const [institution, setInstitution] = useState(initialData?.institution ?? "");
  const [currency, setCurrency] = useState(initialData?.currency ?? "EGP");
  const [principal, setPrincipal] = useState(
    initialData ? formatAmount(initialData.principal_minor, initialData.currency) : ""
  );
  const [annualRate, setAnnualRate] = useState(
    initialData?.annual_rate_bps ? String(initialData.annual_rate_bps / 100) : ""
  );
  const [tenureMonths, setTenureMonths] = useState(
    initialData ? String(initialData.tenure_months) : ""
  );
  const [startDate, setStartDate] = useState(initialData?.start_date ?? "");
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>(
    initialData?.payment_frequency ?? "monthly"
  );
  const [paymentDayOfMonth, setPaymentDayOfMonth] = useState(
    initialData?.payment_day_of_month ? String(initialData.payment_day_of_month) : ""
  );
  const [linkedAccountId, setLinkedAccountId] = useState(
    initialData?.linked_account_id ? String(initialData.linked_account_id) : ""
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const createMutation = useCreateDebt();
  const updateMutation = useUpdateDebt();
  const { data: accountsData } = useAccounts();
  const accounts = (accountsData?.data ?? []).filter(
    (a) => a.type === "bank_account"
  );

  const selectedAccount = accounts.find(
    (a) => String(a.id) === linkedAccountId
  );

  // Auto-set payment day from start date when not yet set
  /* eslint-disable react-hooks/set-state-in-effect -- intentional one-time sync from start_date */
  useEffect(() => {
    if (startDate && !paymentDayOfMonth) {
      const day = new Date(startDate).getDate();
      setPaymentDayOfMonth(String(Math.min(day, 28)));
    }
  }, [startDate]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const livePreview = useMemo(() => {
    if (!principal || !tenureMonths) return null;
    const principalMinor = parseMajorToMinor(principal, CURRENCIES[currency]?.exponent ?? 2);
    const rateBps = annualRate ? Math.round(parseFloat(annualRate) * 100) : 0;
    const tenure = parseInt(tenureMonths, 10);
    const freqMonths = FREQUENCY_MONTHS[paymentFrequency] ?? 1;
    const numPeriods = Math.floor(tenure / freqMonths);
    if (numPeriods <= 0 || principalMinor <= 0) return null;

    let periodicPayment: number;
    if (rateBps === 0) {
      periodicPayment = Math.ceil(principalMinor / numPeriods);
    } else {
      const periodRate = (rateBps * freqMonths) / (10000 * 12);
      const factor = Math.pow(1 + periodRate, numPeriods);
      periodicPayment = Math.ceil(principalMinor * (periodRate * factor) / (factor - 1));
    }
    const totalCost = periodicPayment * numPeriods;
    const totalInterest = totalCost - principalMinor;

    return { periodicPayment, totalCost, totalInterest };
  }, [principal, tenureMonths, annualRate, currency, paymentFrequency]);

  const resetFields = () => {
    setName("");
    setInstitution("");
    setCurrency("EGP");
    setPrincipal("");
    setAnnualRate("");
    setTenureMonths("");
    setStartDate("");
    setPaymentFrequency("monthly");
    setPaymentDayOfMonth("");
    setLinkedAccountId("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && initialData) {
      updateMutation.mutate(
        {
          id: initialData.id,
          name,
          institution: institution || null,
          linked_account_id:
            linkedAccountId && linkedAccountId !== "__none__"
              ? parseInt(linkedAccountId, 10)
              : null,
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
          type: "bank_loan" as const,
          name,
          institution: institution || null,
          principal_minor: parseMajorToMinor(principal, CURRENCIES[currency]?.exponent ?? 2),
          currency,
          annual_rate_percent: annualRate ? parseFloat(annualRate) : undefined,
          tenure_months: parseInt(tenureMonths, 10),
          start_date: startDate,
          payment_frequency: paymentFrequency,
          payment_day_of_month: paymentDayOfMonth ? parseInt(paymentDayOfMonth, 10) : null,
          linked_account_id:
            linkedAccountId && linkedAccountId !== "__none__"
              ? parseInt(linkedAccountId, 10)
              : null,
          notes: notes || null,
        },
        {
          onSuccess: (response) => {
            const isStartInPast = startDate && new Date(startDate) < new Date(new Date().toISOString().split("T")[0]);
            if (isStartInPast && response.data) {
              const debtId = (response.data as DebtResponse).id;
              router.push(`/debts/loans/${debtId}?setup=true`);
            } else {
              onOpenChange(false);
              resetFields();
            }
          },
        }
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <RequiredLabel required htmlFor="loan-name">{t("name")}</RequiredLabel>
          <Input
            id="loan-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="loan-institution">{t("institution")}</Label>
          <Input
            id="loan-institution"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
          />
        </div>

        {!isEdit && (
          <div className="space-y-2">
            <Label>{t("currency")}</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v ?? "EGP")}>
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
        )}

        <div className="space-y-2">
          <RequiredLabel required htmlFor="loan-principal">{t("principal")}</RequiredLabel>
          <Input
            id="loan-principal"
            type="number"
            step={String(Math.pow(10, -(CURRENCIES[currency]?.exponent ?? 2)))}
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            required
            disabled={isEdit}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="loan-rate">{t("rate")}</Label>
          <Input
            id="loan-rate"
            type="number"
            step="0.01"
            value={annualRate}
            onChange={(e) => setAnnualRate(e.target.value)}
            disabled={isEdit}
          />
        </div>

        <div className="space-y-2">
          <RequiredLabel required htmlFor="loan-tenure">{t("tenure")}</RequiredLabel>
          <Input
            id="loan-tenure"
            type="number"
            value={tenureMonths}
            onChange={(e) => setTenureMonths(e.target.value)}
            required
            disabled={isEdit}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("paymentFrequency")}</Label>
          <Select
            value={paymentFrequency}
            onValueChange={(v) => setPaymentFrequency(v as PaymentFrequency)}
            disabled={isEdit}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["monthly", "quarterly", "semi_annual", "annual"] as const).map((freq) => (
                <SelectItem key={freq} value={freq}>
                  {tFreq(freq)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <RequiredLabel required htmlFor="loan-start">{t("startDate")}</RequiredLabel>
          <Input
            id="loan-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            disabled={isEdit}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("paymentDayOfMonth")}</Label>
          <Select
            value={paymentDayOfMonth}
            onValueChange={(v) => setPaymentDayOfMonth(v ?? "")}
            disabled={isEdit}
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

        <div className="space-y-2">
          <Label>{t("linkedAccount")}</Label>
          <Select value={linkedAccountId} onValueChange={(v) => setLinkedAccountId(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("selectAccount")}>
                {linkedAccountId === "__none__"
                  ? t("none")
                  : selectedAccount?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("none")}</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={String(acc.id)}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="loan-notes">{t("notes")}</Label>
          <textarea
            id="loan-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {livePreview && !isEdit && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{tFreq(`paymentLabel.${paymentFrequency}`)}</span>
              <MoneyDisplay amount={livePreview.periodicPayment} currency={currency} size="md" className="font-bold text-primary" />
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

        <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
          {createMutation.isPending || updateMutation.isPending ? t("saving") : isEdit ? t("update") : t("submit")}
        </Button>
      </form>
  );
}
