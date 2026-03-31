"use client";

import { useTranslations } from "next-intl";
import { CheckCircle, Copy, AlertCircle } from "lucide-react";

interface ImportSummaryBarProps {
  valid: number;
  duplicate: number;
  error: number;
}

export function ImportSummaryBar({ valid, duplicate, error }: ImportSummaryBarProps) {
  const t = useTranslations("import.preview");

  return (
    <div className="flex flex-wrap gap-4 py-3 px-4 rounded-lg bg-muted/50 text-sm">
      <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
        <CheckCircle className="size-4" />
        {t("valid", { count: valid })}
      </span>
      {duplicate > 0 && (
        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
          <Copy className="size-4" />
          {t("duplicate", { count: duplicate })}
        </span>
      )}
      {error > 0 && (
        <span className="flex items-center gap-1.5 text-destructive">
          <AlertCircle className="size-4" />
          {t("error", { count: error })}
        </span>
      )}
    </div>
  );
}
