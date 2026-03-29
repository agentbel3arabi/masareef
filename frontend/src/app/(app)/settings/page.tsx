"use client";

import { useTranslations } from "next-intl";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  const t = useTranslations("settings");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Settings className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground max-w-sm">{t("comingSoon")}</p>
      </div>
    </div>
  );
}
