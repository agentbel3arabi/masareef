"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StepFirstAccountProps {
  defaultCurrency: string;
  onNext: (data: { name: string; type: string; initial_balance: number } | null) => Promise<void>;
  onSkip: () => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
}

export function StepFirstAccount({
  defaultCurrency: _defaultCurrency,
  onNext,
  onSkip,
  onBack,
  isLoading,
}: StepFirstAccountProps) {
  const t = useTranslations("onboarding");
  const [name, setName] = useState("");
  const [type, setType] = useState("bank_account");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">{t("step3.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("step3.description")}</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="account-name">{t("step3.accountName")}</Label>
          <Input
            id="account-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("step3.accountNamePlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="account-type">{t("step3.accountType")}</Label>
          <select
            id="account-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="bank_account">{t("step3.accountTypes.bankAccount")}</option>
            <option value="cash_wallet">{t("step3.accountTypes.cash")}</option>
            <option value="credit_card">{t("step3.accountTypes.creditCard")}</option>
            <option value="digital_wallet">{t("step3.accountTypes.digitalWallet")}</option>
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Button
          onClick={() => onNext({ name, type, initial_balance: 0 })}
          disabled={!name.trim() || isLoading}
          className="w-full"
        >
          {isLoading ? t("step3.creating") : t("common.next")}
        </Button>
        <Button variant="ghost" onClick={onSkip} disabled={isLoading} className="w-full">
          {t("step3.skip")}
        </Button>
        <Button variant="outline" onClick={onBack} disabled={isLoading} className="w-full">
          {t("common.back")}
        </Button>
      </div>
    </div>
  );
}
