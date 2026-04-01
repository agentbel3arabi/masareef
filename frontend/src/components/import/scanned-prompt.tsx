"use client";

import { useTranslations } from "next-intl";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScannedPromptProps {
  onBack: () => void;
}

export function ScannedPrompt({ onBack }: ScannedPromptProps) {
  const t = useTranslations("import.scanned");

  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
        <ScanLine className="size-8 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{t("title")}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{t("description")}</p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          {t("back")}
        </Button>
        <Button disabled>{t("upgrade")}</Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("comingSoon")}</p>
    </div>
  );
}
