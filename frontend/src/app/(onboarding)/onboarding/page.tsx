"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateHousehold } from "@/hooks/use-households";
import { useCreateAccount } from "@/hooks/use-accounts";
import { useAuth } from "@/hooks/use-auth";
import { StepHousehold } from "@/components/onboarding/step-household";
import { StepCurrency } from "@/components/onboarding/step-currency";
import { StepFirstAccount } from "@/components/onboarding/step-first-account";
import { StepDone } from "@/components/onboarding/step-done";

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [householdName, setHouseholdName] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const createHousehold = useCreateHousehold();
  const createAccount = useCreateAccount();

  const firstName = (user?.user_metadata?.first_name as string) ?? "You";
  const defaultHouseholdName = householdName || `${firstName}'s Household`;

  const handleStep3Next = async (
    accountData: { name: string; type: string; initial_balance: number } | null
  ) => {
    await createHousehold.mutateAsync({
      name: defaultHouseholdName,
      base_currency: currency,
    });
    if (accountData) {
      await createAccount.mutateAsync({
        name: accountData.name,
        type: accountData.type,
        currency,
        initial_balance: accountData.initial_balance,
      });
    }
    setStep(4);
  };

  const handleStep3Skip = async () => {
    await createHousehold.mutateAsync({
      name: defaultHouseholdName,
      base_currency: currency,
    });
    setStep(4);
  };

  return (
    <div className="space-y-8">
      {/* Progress dots */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all ${
              s === step ? "w-8 bg-primary" : s < step ? "w-2 bg-primary/50" : "w-2 bg-muted"
            }`}
          />
        ))}
      </div>

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
        <StepFirstAccount
          defaultCurrency={currency}
          onNext={handleStep3Next}
          onSkip={handleStep3Skip}
          onBack={() => setStep(2)}
          isLoading={createHousehold.isPending || createAccount.isPending}
        />
      )}
      {step === 4 && <StepDone onGoToDashboard={() => router.push("/dashboard")} />}
    </div>
  );
}
