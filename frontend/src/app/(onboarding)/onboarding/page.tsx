"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCreateHousehold } from "@/hooks/use-households";
import { useCreateAccount } from "@/hooks/use-accounts";
import { useAuth } from "@/hooks/use-auth";
import { StepHousehold } from "@/components/onboarding/step-household";
import { StepCurrency } from "@/components/onboarding/step-currency";
import { StepFirstAccount } from "@/components/onboarding/step-first-account";
import { StepDone } from "@/components/onboarding/step-done";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function OnboardingPage() {
  const { user } = useAuth();
  const t = useTranslations("onboarding");
  const [step, setStep] = useState(1);
  const [householdName, setHouseholdName] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [stepError, setStepError] = useState("");
  const createHousehold = useCreateHousehold();
  const createAccount = useCreateAccount();

  const firstName = (user?.user_metadata?.first_name as string) ?? "";
  const defaultHouseholdName =
    householdName || (firstName ? `${firstName}'s Household` : t("defaultHouseholdName"));

  const handleStep3Next = async (
    accountData: {
      name: string;
      type: string;
      initial_balance: number;
      institution?: string;
      opened_at?: string;
      credit_limit?: number;
      billing_cycle_day?: number;
      payment_due_day?: number;
    } | null
  ) => {
    setStepError("");
    try {
      await createHousehold.mutateAsync({
        name: defaultHouseholdName,
        base_currency: currency,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("retryError");
      setStepError(message);
      return;
    }
    if (accountData) {
      try {
        await createAccount.mutateAsync({
          name: accountData.name,
          type: accountData.type,
          currency,
          initial_balance: accountData.initial_balance,
          institution: accountData.institution,
          opened_at: accountData.opened_at,
          credit_limit: accountData.credit_limit,
          billing_cycle_day: accountData.billing_cycle_day,
          payment_due_day: accountData.payment_due_day,
        });
      } catch {
        // Account creation failed — continue to step 4 anyway (account can be added later)
      }
    }
    setStep(4);
  };

  const handleStep3Skip = async () => {
    setStepError("");
    try {
      await createHousehold.mutateAsync({
        name: defaultHouseholdName,
        base_currency: currency,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("retryError");
      setStepError(message);
      return;
    }
    setStep(4);
  };

  const isStep3Loading = createHousehold.isPending || createAccount.isPending;

  return (
    <div className="space-y-8">
      <StepIndicator
        steps={[
          t("step1.title"),
          t("step2.title"),
          t("step3.title"),
          t("step4.title"),
        ]}
        currentStep={step}
      />

      {step === 1 && (
        <StepHousehold
          firstName={firstName}
          value={defaultHouseholdName}
          onChange={setHouseholdName}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <StepCurrency
          value={currency}
          onChange={setCurrency}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <>
          {stepError && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div className="flex-1 space-y-2">
                <p>{stepError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setStepError("")}
                  disabled={isStep3Loading}
                >
                  {t("retry")}
                </Button>
              </div>
            </div>
          )}
          <StepFirstAccount
            defaultCurrency={currency}
            onNext={handleStep3Next}
            onSkip={handleStep3Skip}
            onBack={() => setStep(2)}
            isLoading={isStep3Loading}
          />
        </>
      )}
      {step === 4 && (
        <StepDone onGoToDashboard={() => (window.location.href = "/dashboard")} />
      )}
    </div>
  );
}
