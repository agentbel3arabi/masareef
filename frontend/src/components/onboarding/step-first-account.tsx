"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENCIES, parseMajorToMinor } from "@/lib/money";

const CREDIT_TYPES = new Set(["credit_card", "financing_app"]);

interface AccountData {
  name: string;
  type: string;
  initial_balance: number;
  institution?: string;
  opened_at?: string;
  credit_limit?: number;
  billing_cycle_day?: number;
  payment_due_day?: number;
}

interface StepFirstAccountProps {
  defaultCurrency: string;
  onNext: (data: AccountData | null) => Promise<void>;
  onSkip: () => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
}

export function StepFirstAccount({
  defaultCurrency,
  onNext,
  onSkip,
  onBack,
  isLoading,
}: StepFirstAccountProps) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [type, setType] = useState("bank_account");
  const [institution, setInstitution] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [openedAt, setOpenedAt] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [billingDay, setBillingDay] = useState("");
  const [paymentDueDay, setPaymentDueDay] = useState("");

  const exponent = CURRENCIES[defaultCurrency]?.exponent ?? 2;
  const balanceStep = (1 / Math.pow(10, exponent)).toFixed(exponent);
  const balancePlaceholder = (0).toFixed(exponent);
  const isCreditType = CREDIT_TYPES.has(type);

  const handleNext = () => {
    onNext({
      name,
      type,
      initial_balance: initialBalance ? parseMajorToMinor(initialBalance, exponent) : 0,
      institution: institution || undefined,
      opened_at: openedAt || undefined,
      credit_limit: isCreditType && creditLimit ? parseMajorToMinor(creditLimit, exponent) : undefined,
      billing_cycle_day: isCreditType && billingDay ? parseInt(billingDay, 10) : undefined,
      payment_due_day: isCreditType && paymentDueDay ? parseInt(paymentDueDay, 10) : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">{t("onboarding.step3.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("onboarding.step3.description")}</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="account-name">{t("onboarding.step3.accountName")}</Label>
          <Input
            id="account-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("onboarding.step3.accountNamePlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="account-type">{t("onboarding.step3.accountType")}</Label>
          <select
            id="account-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="bank_account">{t("onboarding.step3.accountTypes.bankAccount")}</option>
            <option value="cash_wallet">{t("onboarding.step3.accountTypes.cash")}</option>
            <option value="credit_card">{t("onboarding.step3.accountTypes.creditCard")}</option>
            <option value="digital_wallet">{t("onboarding.step3.accountTypes.digitalWallet")}</option>
            <option value="financing_app">{t("accounts.financingApp")}</option>
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
          <Label htmlFor="account-balance">{t("accounts.openingBalance")}</Label>
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
      </div>

      <div className="flex flex-col gap-2">
        <Button
          onClick={handleNext}
          disabled={!name.trim() || isLoading}
          className="w-full"
        >
          {isLoading ? t("onboarding.step3.creating") : t("onboarding.common.next")}
        </Button>
        <Button variant="ghost" onClick={onSkip} disabled={isLoading} className="w-full">
          {t("onboarding.step3.skip")}
        </Button>
        <Button variant="outline" onClick={onBack} disabled={isLoading} className="w-full">
          {t("onboarding.common.back")}
        </Button>
      </div>
    </div>
  );
}
