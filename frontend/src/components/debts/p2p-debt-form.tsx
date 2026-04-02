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
import { usePersons } from "@/hooks/use-persons";
import { CURRENCIES, parseMajorToMinor } from "@/lib/money";
import type { DebtResponse, DebtType, RepaymentMode } from "@/lib/types/debts";

interface P2PDebtFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: DebtResponse;
}

const CURRENCY_CODES = Object.keys(CURRENCIES);

export function P2PDebtForm({ open, onOpenChange, initialData }: P2PDebtFormProps) {
  const t = useTranslations("debts.form.p2p");
  const isEdit = !!initialData;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t("editTitle") : t("title")}
      description={t("description")}
    >
      <P2PDebtFormContent
        key={initialData?.id ?? "new"}
        initialData={initialData}
        onOpenChange={onOpenChange}
      />
    </FormSheet>
  );
}

function P2PDebtFormContent({
  initialData,
  onOpenChange,
}: Omit<P2PDebtFormProps, "open">) {
  const t = useTranslations("debts.form.p2p");
  const tRepayment = useTranslations("debts.p2p");
  const isEdit = !!initialData;

  const [personId, setPersonId] = useState(
    initialData?.person_id ? String(initialData.person_id) : ""
  );
  const [debtType, setDebtType] = useState<DebtType>(
    initialData?.type ?? "personal_lent"
  );
  const [currency, setCurrency] = useState("EGP");
  const [amount, setAmount] = useState("");
  const [repaymentMode, setRepaymentMode] =
    useState<RepaymentMode>("lump_sum");
  const [dueDate, setDueDate] = useState("");
  const [splitCount, setSplitCount] = useState("");
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const createMutation = useCreateDebt();
  const updateMutation = useUpdateDebt();
  const { data: personsData } = usePersons();
  const persons = personsData?.data ?? [];

  const selectedPerson = persons.find((p) => String(p.id) === personId);

  const resetFields = () => {
    setPersonId("");
    setDebtType("personal_lent");
    setCurrency("EGP");
    setAmount("");
    setRepaymentMode("lump_sum");
    setDueDate("");
    setSplitCount("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && initialData) {
      updateMutation.mutate(
        {
          id: initialData.id,
          name: initialData.name,
          notes: notes || null,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      if (!personId) return;
      if (repaymentMode === "equal_splits" && !splitCount) return;
      const selectedPersonName = selectedPerson?.name ?? "";
      createMutation.mutate(
        {
          type: debtType,
          name:
            debtType === "personal_lent"
              ? t("autoNameLent", { name: selectedPersonName })
              : t("autoNameBorrowed", { name: selectedPersonName }),
          principal_minor: parseMajorToMinor(amount, CURRENCIES[currency]?.exponent ?? 2),
          currency,
          tenure_months:
            repaymentMode === "equal_splits" && splitCount
              ? parseInt(splitCount, 10)
              : 1,
          start_date: new Date().toISOString().split("T")[0],
          person_id: parseInt(personId, 10),
          repayment_mode: repaymentMode,
          due_date: repaymentMode === "lump_sum" ? dueDate || null : null,
          split_count:
            repaymentMode === "equal_splits" ? parseInt(splitCount, 10) : null,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        {!isEdit && (
          <div className="space-y-2">
            <Label>{t("person")}</Label>
            <Select value={personId} onValueChange={(v) => setPersonId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectPerson")} />
              </SelectTrigger>
              <SelectContent>
                {persons.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!isEdit && (
          <div className="space-y-2">
            <Label>{t("type")}</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={debtType === "personal_lent" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setDebtType("personal_lent")}
              >
                {t("lent")}
              </Button>
              <Button
                type="button"
                variant={debtType === "personal_borrowed" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setDebtType("personal_borrowed")}
              >
                {t("borrowed")}
              </Button>
            </div>
          </div>
        )}

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
            <Label htmlFor="p2p-amount">{t("amount")}</Label>
            <Input
              id="p2p-amount"
              type="number"
              step={String(Math.pow(10, -(CURRENCIES[currency]?.exponent ?? 2)))}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        )}

        {!isEdit && (
          <div className="space-y-2">
            <Label>{t("repaymentMode")}</Label>
            <Select
              value={repaymentMode}
              onValueChange={(v) => setRepaymentMode((v ?? "lump_sum") as RepaymentMode)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lump_sum">{tRepayment("lumpSum")}</SelectItem>
                <SelectItem value="equal_splits">{tRepayment("equalSplits")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {!isEdit && repaymentMode === "lump_sum" && (
          <div className="space-y-2">
            <Label htmlFor="p2p-due">{t("dueDate")}</Label>
            <Input
              id="p2p-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        )}

        {!isEdit && repaymentMode === "equal_splits" && (
          <div className="space-y-2">
            <Label htmlFor="p2p-splits">{t("splitCount")}</Label>
            <Input
              id="p2p-splits"
              type="number"
              value={splitCount}
              onChange={(e) => setSplitCount(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="p2p-notes">{t("notes")}</Label>
          <textarea
            id="p2p-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
          {createMutation.isPending || updateMutation.isPending ? t("saving") : isEdit ? t("update") : t("submit")}
        </Button>
      </form>
  );
}
