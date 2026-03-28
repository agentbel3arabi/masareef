"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StepHouseholdProps {
  firstName: string;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}

export function StepHousehold({ firstName, value, onChange, onNext }: StepHouseholdProps) {
  const t = useTranslations("onboarding");
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">{t("step1.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("step1.description")}</p>
      </div>
      <div className="space-y-2">
        <Label>{t("step1.householdName")}</Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${firstName}'s Household`}
        />
      </div>
      <Button onClick={onNext} className="w-full" disabled={!value.trim()}>
        {t("common.next")}
      </Button>
    </div>
  );
}
