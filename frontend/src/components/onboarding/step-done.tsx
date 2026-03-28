"use client";

import { CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function StepDone({ onGoToDashboard }: { onGoToDashboard: () => void }) {
  const t = useTranslations("onboarding");
  return (
    <div className="flex flex-col items-center gap-6 text-center py-8">
      <CheckCircle className="h-16 w-16 text-green-500" />
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{t("step4.title")}</h2>
        <p className="text-muted-foreground">{t("step4.description")}</p>
      </div>
      <Button onClick={onGoToDashboard} size="lg">
        {t("step4.goToDashboard")}
      </Button>
    </div>
  );
}
