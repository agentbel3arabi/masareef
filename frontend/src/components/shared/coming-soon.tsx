"use client";

import { type ReactNode } from "react";
import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ComingSoonProps {
  children: ReactNode;
  tooltip?: string;
}

export function ComingSoon({ children, tooltip }: ComingSoonProps) {
  const t = useTranslations("nav");
  const tooltipText = tooltip ?? t("comingSoon");

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="inline-flex items-center gap-1 opacity-40 cursor-not-allowed" />
          }
        >
          {children}
          <Clock className="h-3.5 w-3.5 shrink-0" />
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
