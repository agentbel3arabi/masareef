"use client";

import { useState, useMemo } from "react";
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
  const [monthlyAmount, setMonthlyAmount] = useState(
    initialData
      ? formatAmount(initialData.monthly_amount_minor, initialData.currency)
      : ""
  );
  const [totalMonths, setTotalMonths] = useState(
    initialData ? String(initialData.total_months) : ""
  );
  const [startMonth, setStartMonth] = useState(initialData?.start_month ?? "");
  const [sourceAccountId, setSourceAccountId] = useState(
    initialData?.source_account_id ? String(initialData.source_account_id) : ""
  );

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

  const resetFields = () => {
    setType(defaultType ?? "credit_card");
    setName("");
    setMerchantName("");
    setCurrency("EGP");
    setTotalAmount("");
    setMonthlyAmount("");
    setTotalMonths("");
    setStartMonth("");
    setSourceAccountId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const exponent = CURRENCIES[currency]?.exponent ?? 2;

    if (isEdit && initialData) {
      updateMutation.mutate(
        {
          id: initialData.id,
          name,
          merchant_name: merchantName || null,
          linked_account_id: null,
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
          monthly_amount_minor: parseMajorToMinor(monthlyAmount, exponent),
          total_months: parseInt(totalMonths, 10),
          start_month: `${startMonth}-01`,
          currency,
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
                <SelectValue />
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

        <div className="space-y-2">
          <Label htmlFor="inst-name">{t("name")}</Label>
          <Input
            id="inst-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

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

            <div className="space-y-2">
              <Label htmlFor="inst-total">{t("totalAmount")}</Label>
              <Input
                id="inst-total"
                type="number"
                step={String(
                  Math.pow(10, -(CURRENCIES[currency]?.exponent ?? 2))
                )}
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inst-monthly">{t("monthlyAmount")}</Label>
              <Input
                id="inst-monthly"
                type="number"
                step={String(
                  Math.pow(10, -(CURRENCIES[currency]?.exponent ?? 2))
                )}
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inst-months">{t("totalMonths")}</Label>
              <Input
                id="inst-months"
                type="number"
                min="1"
                value={totalMonths}
                onChange={(e) => setTotalMonths(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inst-start">{t("startMonth")}</Label>
              <Input
                id="inst-start"
                type="month"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>
                {t("sourceAccount")}
                {sourceRequired && " *"}
              </Label>
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
            </div>
          </>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? t("saving") : isEdit ? t("update") : t("submit")}
        </Button>
      </form>
  );
}
