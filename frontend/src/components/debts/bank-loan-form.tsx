"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FormSheet } from "@/components/shared/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useCreateDebt, useUpdateDebt } from "@/hooks/use-debts";
import { apiGet, apiPost } from "@/lib/api-client";
import { useAccounts } from "@/hooks/use-accounts";
import { CURRENCIES, parseMajorToMinor, formatAmount } from "@/lib/money";
import type { DebtResponse, ScheduleRow } from "@/lib/types/debts";

interface BankLoanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: DebtResponse;
}

const CURRENCY_CODES = Object.keys(CURRENCIES);

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
  const [linkedAccountId, setLinkedAccountId] = useState(
    initialData?.linked_account_id ? String(initialData.linked_account_id) : ""
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [installmentsPaid, setInstallmentsPaid] = useState("");
  const [isRecordingPayments, setIsRecordingPayments] = useState(false);

  const createMutation = useCreateDebt();
  const updateMutation = useUpdateDebt();
  const { data: accountsData } = useAccounts();
  const accounts = (accountsData?.data ?? []).filter(
    (a) => a.type === "bank_account"
  );

  const selectedAccount = accounts.find(
    (a) => String(a.id) === linkedAccountId
  );

  const isStartDateInPast = startDate
    ? new Date(startDate) < new Date(new Date().toISOString().split("T")[0])
    : false;

  const resetFields = () => {
    setName("");
    setInstitution("");
    setCurrency("EGP");
    setPrincipal("");
    setAnnualRate("");
    setTenureMonths("");
    setStartDate("");
    setLinkedAccountId("");
    setNotes("");
    setInstallmentsPaid("");
  };

  const recordPastPayments = async (debtId: number, count: number) => {
    setIsRecordingPayments(true);
    try {
      const scheduleRes = await apiGet<{ schedule: ScheduleRow[] }>(
        `/api/v1/debts/${debtId}/amortization`
      );
      const schedule = scheduleRes.data.schedule;
      const toRecord = schedule.slice(0, count);
      for (const row of toRecord) {
        await apiPost(`/api/v1/debts/${debtId}/payments`, {
          date: row.date,
          amount_minor: row.payment_minor,
          notes: t("pastPaymentNote"),
        });
      }
    } finally {
      setIsRecordingPayments(false);
    }
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
          linked_account_id:
            linkedAccountId && linkedAccountId !== "__none__"
              ? parseInt(linkedAccountId, 10)
              : null,
          notes: notes || null,
        },
        {
          onSuccess: async (response) => {
            const paidCount = parseInt(installmentsPaid, 10);
            if (paidCount > 0 && response.data) {
              const debtId = (response.data as DebtResponse).id;
              await recordPastPayments(debtId, paidCount);
            }
            onOpenChange(false);
            resetFields();
          },
        }
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="loan-name">{t("name")}</Label>
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

        {!isEdit && (
          <div className="space-y-2">
            <Label htmlFor="loan-principal">{t("principal")}</Label>
            <Input
              id="loan-principal"
              type="number"
              step={String(Math.pow(10, -(CURRENCIES[currency]?.exponent ?? 2)))}
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              required
            />
          </div>
        )}

        {!isEdit && (
          <div className="space-y-2">
            <Label htmlFor="loan-rate">{t("rate")}</Label>
            <Input
              id="loan-rate"
              type="number"
              step="0.01"
              value={annualRate}
              onChange={(e) => setAnnualRate(e.target.value)}
            />
          </div>
        )}

        {!isEdit && (
          <div className="space-y-2">
            <Label htmlFor="loan-tenure">{t("tenure")}</Label>
            <Input
              id="loan-tenure"
              type="number"
              value={tenureMonths}
              onChange={(e) => setTenureMonths(e.target.value)}
              required
            />
          </div>
        )}

        {!isEdit && (
          <div className="space-y-2">
            <Label htmlFor="loan-start">{t("startDate")}</Label>
            <Input
              id="loan-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
        )}

        {!isEdit && isStartDateInPast && (
          <div className="space-y-2">
            <Label htmlFor="loan-paid">{t("installmentsPaid")}</Label>
            <p className="text-xs text-muted-foreground">{t("installmentsPaidHint")}</p>
            <Input
              id="loan-paid"
              type="number"
              min="0"
              max={tenureMonths ? parseInt(tenureMonths, 10) : undefined}
              value={installmentsPaid}
              onChange={(e) => setInstallmentsPaid(e.target.value)}
            />
          </div>
        )}

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

        <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending || isRecordingPayments}>
          {isRecordingPayments ? t("recordingPayments") : createMutation.isPending || updateMutation.isPending ? t("saving") : isEdit ? t("update") : t("submit")}
        </Button>
      </form>
  );
}
