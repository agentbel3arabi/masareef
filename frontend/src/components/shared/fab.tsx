"use client";

import { Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FABProps {
  onClick: () => void;
  ariaLabel: string;
  tooltip?: string;
}

export function FAB({ onClick, ariaLabel, tooltip }: FABProps) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="fixed bottom-6 end-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg hover:shadow-xl active:scale-95 transition-all"
    >
      <Plus className="h-6 w-6" />
    </button>
  );

  if (!tooltip) return button;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>{button}</TooltipTrigger>
        <TooltipContent side="inline-start">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
