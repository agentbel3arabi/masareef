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
import { useCreateDebt } from "@/hooks/use-debts";
import { useAccounts } from "@/hooks/use-accounts";
import { CURRENCIES } from "@/lib/money";

interface BankLoanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toMinor(displayValue: string, currency: string): number {
  const exp = CURRENCIES[currency]?.exponent ?? 2;
  return Math.round(parseFloat(displayValue || "0") * Math.pow(10, exp));
}

const CURRENCY_CODES = Object.keys(CURRENCIES);

export function BankLoanForm({ open, onOpenChange }: BankLoanFormProps) {
  const t = useTranslations("debts.form.loan");
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [principal, setPrincipal] = useState("");
  const [annualRate, setAnnualRate] = useState("");
  const [tenureMonths, setTenureMonths] = useState("");
  const [startDate, setStartDate] = useState("");
  const [linkedAccountId, setLinkedAccountId] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useCreateDebt();
  const { data: accountsData } = useAccounts();
  const accounts = (accountsData?.data ?? []).filter(
    (a) => a.type === "savings" || a.type === "checking"
  );

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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(
      {
        type: "bank_loan" as const,
        name,
        institution: institution || null,
        principal_minor: toMinor(principal, currency),
        currency,
        annual_rate_percent: annualRate ? parseFloat(annualRate) : undefined,
        tenure_months: parseInt(tenureMonths),
        start_date: startDate,
        linked_account_id: linkedAccountId
          ? parseInt(linkedAccountId)
          : null,
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

        <div className="space-y-2">
          <Label htmlFor="loan-principal">{t("principal")}</Label>
          <Input
            id="loan-principal"
            type="number"
            step="0.01"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            required
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
          />
        </div>

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

        <div className="space-y-2">
          <Label>{t("linkedAccount")}</Label>
          <Select value={linkedAccountId} onValueChange={(v) => setLinkedAccountId(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="--" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">--</SelectItem>
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

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? t("saving") : t("submit")}
        </Button>
      </form>
    </FormSheet>
  );
}
