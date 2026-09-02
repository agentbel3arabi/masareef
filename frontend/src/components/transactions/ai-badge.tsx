"use client";

import { useTranslations } from "next-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AiBadgeProps {
  confidence: number;
}

export function AiBadge({ confidence }: AiBadgeProps) {
  const t = useTranslations("categorization");
  const percent = Math.round(confidence * 100);

  // D-08: green >95%, yellow 75-95%, red <75%
  const color =
    confidence > 0.95
      ? "bg-green-100 text-green-700"
      : confidence >= 0.75
        ? "bg-yellow-100 text-yellow-700"
        : "bg-red-100 text-red-700";

  const badge = (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${color}`}
    >
      {t("aiBadgeLabel", { percent })}
    </span>
  );

  // Green tier: display-only. Yellow/red: show tooltip (per UI-SPEC)
  if (confidence > 0.95) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span />}>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{t("aiBadgeTooltip")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
