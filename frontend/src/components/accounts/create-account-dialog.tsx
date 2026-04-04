"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSheet } from "@/components/shared/form-sheet";
import { RequiredLabel } from "@/components/shared/required-label";
import { Label } from "@/components/ui/label";
import { useCreateAccount } from "@/hooks/use-accounts";
import { CURRENCIES, parseMajorToMinor } from "@/lib/money";

const CREDIT_TYPES = new Set(["credit_card", "financing_app"]);

const ACCOUNT_TYPES = [
  { value: "bank_account", label: "accounts.bankAccount" },
  { value: "credit_card", label: "accounts.creditCard" },
  { value: "cash_wallet", label: "accounts.cashWallet" },
  { value: "digital_wallet", label: "accounts.digitalWallet" },
  { value: "financing_app", label: "accounts.financingApp" },
];

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAccountDialog({
  open,
  onOpenChange,
}: CreateAccountDialogProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [name, setName] = useState("");
  const [type, setType] = useState("bank_account");
  const [currency, setCurrency] = useState("EGP");
  const [institution, setInstitution] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [openedAt, setOpenedAt] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [billingDay, setBillingDay] = useState("");
  const [paymentDueDay, setPaymentDueDay] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createAccount = useCreateAccount();

  const exponent = CURRENCIES[currency]?.exponent ?? 2;
  const balanceStep = (1 / Math.pow(10, exponent)).toFixed(exponent);
  const balancePlaceholder = (0).toFixed(exponent);
  const isCreditType = CREDIT_TYPES.has(type);

  const reset = () => {
    setName(""); setType("bank_account"); setCurrency("EGP");
    setInstitution(""); setInitialBalance(""); setOpenedAt("");
    setCreditLimit(""); setBillingDay(""); setPaymentDueDay("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createAccount.mutateAsync({
        name,
        type,
        currency,
        initial_balance: initialBalance ? parseMajorToMinor(initialBalance, exponent) : 0,
        institution: institution || undefined,
        opened_at: openedAt || undefined,
        credit_limit: isCreditType && creditLimit
          ? parseMajorToMinor(creditLimit, exponent) : undefined,
        billing_cycle_day: isCreditType && billingDay ? parseInt(billingDay, 10) : undefined,
        payment_due_day: isCreditType && paymentDueDay ? parseInt(paymentDueDay, 10) : undefined,
      });
      onOpenChange(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.unexpectedError"));
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("accounts.addAccount")}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="space-y-2">
          <RequiredLabel required htmlFor="account-name">{t("accounts.name")}</RequiredLabel>
          <Input id="account-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <RequiredLabel required htmlFor="account-type">{t("accounts.type")}</RequiredLabel>
          <select
            id="account-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {ACCOUNT_TYPES.map((t_item) => (
              <option key={t_item.value} value={t_item.value}>
                {t(t_item.label)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <RequiredLabel required htmlFor="account-currency">{t("accounts.currency")}</RequiredLabel>
          <select
            id="account-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {Object.entries(CURRENCIES).map(([code, info]) => (
              <option key={code} value={code}>
                {code} — {locale === "ar" ? info.nameAr : info.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="account-institution">{t("accounts.institution")}</Label>
          <Input
            id="account-institution"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder={t("accounts.institutionPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="account-balance">
            {type === "credit_card" ? t("accounts.currentBalanceDue") : t("accounts.openingBalance")}
          </Label>
          <Input
            id="account-balance"
            type="number"
            step={balanceStep}
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            placeholder={balancePlaceholder}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="account-opened-at">{t("accounts.openedAt")}</Label>
          <Input
            id="account-opened-at"
            type="date"
            value={openedAt}
            onChange={(e) => setOpenedAt(e.target.value)}
          />
        </div>

        {isCreditType && (
          <>
            <div className="space-y-2">
              <Label htmlFor="account-credit-limit">{t("accounts.creditLimit")}</Label>
              <Input
                id="account-credit-limit"
                type="number"
                step={balanceStep}
                min="0"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder={balancePlaceholder}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="account-billing-day">{t("accounts.billingCycleDay")}</Label>
                <Input
                  id="account-billing-day"
                  type="number"
                  min="1"
                  max="31"
                  value={billingDay}
                  onChange={(e) => setBillingDay(e.target.value)}
                  placeholder="1–31"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-payment-due-day">{t("accounts.paymentDueDay")}</Label>
                <Input
                  id="account-payment-due-day"
                  type="number"
                  min="1"
                  max="31"
                  value={paymentDueDay}
                  onChange={(e) => setPaymentDueDay(e.target.value)}
                  placeholder="1–31"
                />
              </div>
            </div>
          </>
        )}

        <Button type="submit" className="w-full" disabled={createAccount.isPending}>
          {createAccount.isPending ? t("common.loading") : t("common.create")}
        </Button>
      </form>
    </FormSheet>
  );
}
