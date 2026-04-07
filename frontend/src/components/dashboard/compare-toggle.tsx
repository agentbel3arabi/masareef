"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface CompareToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function CompareToggle({ enabled, onChange }: CompareToggleProps) {
  const t = useTranslations("dashboard");

  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        "flex items-center gap-2 text-xs rounded-md px-3 py-1.5 transition-colors border",
        enabled
          ? "bg-primary/10 border-primary/20 text-primary font-bold"
          : "bg-transparent border-border text-muted-foreground font-normal hover:text-foreground"
      )}
      aria-pressed={enabled}
    >
      {t("compare")}
    </button>
  );
}
