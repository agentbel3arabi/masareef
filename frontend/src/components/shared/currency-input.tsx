"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  currency: string;
}

export function CurrencyInput({ currency, className, ...props }: CurrencyInputProps) {
  return (
    <div className="relative">
      <Input type="number" className={cn("pe-16", className)} {...props} />
      <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded pointer-events-none">
        {currency}
      </span>
    </div>
  );
}
