"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FormSheet } from "@/components/shared/form-sheet";
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
import { usePersons, useCreatePerson } from "@/hooks/use-persons";
import { useAccounts } from "@/hooks/use-accounts";
import { CURRENCIES, parseMajorToMinor } from "@/lib/money";
import { UserPlus, ChevronUp } from "lucide-react";
import type { DebtResponse, DebtType, RepaymentMode, PersonRelationship } from "@/lib/types/debts";

interface P2PDebtFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: DebtResponse;
  /** Pre-select a person when adding a debt for a specific person */
  preSelectedPersonId?: number;
}

const CURRENCY_CODES = Object.keys(CURRENCIES);
const RELATIONSHIPS: PersonRelationship[] = [
  "family",
  "friend",
  "colleague",
  "business",
  "other",
];

export function P2PDebtForm({ open, onOpenChange, initialData, preSelectedPersonId }: P2PDebtFormProps) {
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
        key={initialData?.id ?? `new-${preSelectedPersonId ?? ""}`}
        initialData={initialData}
        onOpenChange={onOpenChange}
        preSelectedPersonId={preSelectedPersonId}
      />
    </FormSheet>
  );
}

function P2PDebtFormContent({
  initialData,
  onOpenChange,
  preSelectedPersonId,
}: Omit<P2PDebtFormProps, "open">) {
  const t = useTranslations("debts.form.p2p");
  const tRepayment = useTranslations("debts.p2p");
  const tPersons = useTranslations("persons");
  const isEdit = !!initialData;

  const [personId, setPersonId] = useState(
    initialData?.person_id
      ? String(initialData.person_id)
      : preSelectedPersonId
        ? String(preSelectedPersonId)
        : ""
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
  const [customSplits, setCustomSplits] = useState<{ amount: string; due_date: string }[]>([{ amount: "", due_date: "" }]);

  const [accountId, setAccountId] = useState("");
  const [splitsSumError, setSplitsSumError] = useState(false);

  // Inline person creation state
  const [showInlinePersonForm, setShowInlinePersonForm] = useState(false);
  const [inlineName, setInlineName] = useState("");
  const [inlineNameAr, setInlineNameAr] = useState("");
  const [inlinePhone, setInlinePhone] = useState("");
  const [inlineRelationship, setInlineRelationship] = useState("");

  const createMutation = useCreateDebt();
  const updateMutation = useUpdateDebt();
  const createPersonMutation = useCreatePerson();
  const { data: personsData } = usePersons();
  const persons = personsData?.data ?? [];
  const { data: accountsData } = useAccounts();
  const accounts = (accountsData?.data ?? []).filter(
    (a) => a.currency === currency && a.is_active
  );

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
    setCustomSplits([{ amount: "", due_date: "" }]);
    setAccountId("");
  };

  const resetInlinePersonFields = () => {
    setInlineName("");
    setInlineNameAr("");
    setInlinePhone("");
    setInlineRelationship("");
  };

  const handleInlinePersonSave = () => {
    if (!inlineName.trim()) return;
    createPersonMutation.mutate(
      {
        name: inlineName.trim(),
        name_ar: inlineNameAr.trim() || null,
        phone: inlinePhone.trim() || null,
        relationship: (inlineRelationship as PersonRelationship) || null,
      },
      {
        onSuccess: (response) => {
          const newPerson = response.data;
          setPersonId(String(newPerson.id));
          setShowInlinePersonForm(false);
          resetInlinePersonFields();
        },
      }
    );
  };

  const handlePersonSelectChange = (value: string | null) => {
    if (value === "__add_new__") {
      setShowInlinePersonForm(true);
      // Don't change personId - keep the old selection or empty
    } else {
      setPersonId(value ?? "");
      setShowInlinePersonForm(false);
    }
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
      const exponent = CURRENCIES[currency]?.exponent ?? 2;
      const totalMinor = parseMajorToMinor(amount, exponent);
      const splitsPayload = repaymentMode === "custom_splits"
        ? customSplits.map((s) => ({ amount_minor: parseMajorToMinor(s.amount, exponent), due_date: s.due_date }))
        : null;

      // Validate custom splits sum to total
      if (repaymentMode === "custom_splits" && splitsPayload) {
        const splitsSum = splitsPayload.reduce((sum, s) => sum + s.amount_minor, 0);
        if (splitsSum !== totalMinor) {
          setSplitsSumError(true);
          return;
        }
        setSplitsSumError(false);
      }
      createMutation.mutate(
        {
          type: debtType,
          name:
            debtType === "personal_lent"
              ? t("autoNameLent", { name: selectedPersonName })
              : t("autoNameBorrowed", { name: selectedPersonName }),
          principal_minor: totalMinor,
          currency,
          tenure_months:
            repaymentMode === "equal_splits" && splitCount
              ? parseInt(splitCount, 10)
              : repaymentMode === "custom_splits"
                ? customSplits.length
                : 1,
          start_date: new Date().toISOString().split("T")[0],
          person_id: parseInt(personId, 10),
          repayment_mode: repaymentMode,
          due_date: repaymentMode === "lump_sum" ? dueDate || null : null,
          split_count:
            repaymentMode === "equal_splits" ? parseInt(splitCount, 10) : null,
          splits: splitsPayload,
          notes: notes || null,
          account_id: accountId ? parseInt(accountId, 10) : null,
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
            <RequiredLabel required>{t("person")}</RequiredLabel>
            <Select value={personId} onValueChange={handlePersonSelectChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectPerson")}>
                  {selectedPerson?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {persons.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
                <SelectItem value="__add_new__" className="text-primary font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <UserPlus className="h-3.5 w-3.5" />
                    {t("addNewPerson")}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Inline person creation form */}
            {showInlinePersonForm && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    {t("inlinePersonTitle")}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInlinePersonForm(false);
                      resetInlinePersonFields();
                    }}
                    className="inline-flex items-center p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <RequiredLabel required htmlFor="inline-person-name">{tPersons("name")}</RequiredLabel>
                  <Input
                    id="inline-person-name"
                    value={inlineName}
                    onChange={(e) => setInlineName(e.target.value)}
                    required={showInlinePersonForm}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inline-person-name-ar">{tPersons("nameAr")}</Label>
                  <Input
                    id="inline-person-name-ar"
                    dir="rtl"
                    value={inlineNameAr}
                    onChange={(e) => setInlineNameAr(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inline-person-phone">{tPersons("phone")}</Label>
                  <Input
                    id="inline-person-phone"
                    type="tel"
                    value={inlinePhone}
                    onChange={(e) => setInlinePhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{tPersons("relationship")}</Label>
                  <Select value={inlineRelationship} onValueChange={(v) => setInlineRelationship(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={tPersons("relationship")} />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIPS.map((rel) => (
                        <SelectItem key={rel} value={rel}>
                          {tPersons(`relationships.${rel}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  disabled={!inlineName.trim() || createPersonMutation.isPending}
                  onClick={handleInlinePersonSave}
                >
                  {createPersonMutation.isPending ? tPersons("form.saving") : t("savePerson")}
                </Button>
              </div>
            )}
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
            <RequiredLabel required>
              {debtType === "personal_lent" ? t("sourceAccount") : t("destinationAccount")}
            </RequiredLabel>
            <Select value={accountId} onValueChange={(v) => setAccountId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectAccount")} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={String(acc.id)}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!isEdit && (
          <div className="space-y-2">
            <RequiredLabel required htmlFor="p2p-amount">{t("amount")}</RequiredLabel>
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
                <SelectItem value="custom_splits">{tRepayment("customSplits")}</SelectItem>
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

        {!isEdit && repaymentMode === "custom_splits" && (
          <div className="space-y-3">
            {customSplits.map((split, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label>{t("splitAmount")}</Label>
                  <Input
                    type="number"
                    step={String(Math.pow(10, -(CURRENCIES[currency]?.exponent ?? 2)))}
                    value={split.amount}
                    onChange={(e) => {
                      const next = [...customSplits];
                      next[idx] = { ...next[idx], amount: e.target.value };
                      setCustomSplits(next);
                    }}
                    required
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label>{t("splitDate")}</Label>
                  <Input
                    type="date"
                    value={split.due_date}
                    onChange={(e) => {
                      const next = [...customSplits];
                      next[idx] = { ...next[idx], due_date: e.target.value };
                      setCustomSplits(next);
                    }}
                    required
                  />
                </div>
                {customSplits.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCustomSplits(customSplits.filter((_, i) => i !== idx))}
                  >
                    {t("removeSplit")}
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCustomSplits([...customSplits, { amount: "", due_date: "" }])}
            >
              {t("addSplit")}
            </Button>
            {splitsSumError && (
              <p className="text-sm text-destructive">{t("splitsSumError")}</p>
            )}
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

        <Button
          type="submit"
          className="w-full"
          disabled={
            createMutation.isPending ||
            updateMutation.isPending ||
            (!isEdit && !accountId)
          }
        >
          {createMutation.isPending || updateMutation.isPending ? t("saving") : isEdit ? t("update") : t("submit")}
        </Button>
      </form>
  );
}
