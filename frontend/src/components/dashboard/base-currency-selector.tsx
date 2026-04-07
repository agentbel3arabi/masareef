"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CURRENCIES = [
  { code: "EGP", label: "EGP" },
  { code: "USD", label: "USD" },
  { code: "EUR", label: "EUR" },
  { code: "GBP", label: "GBP" },
  { code: "SAR", label: "SAR" },
  { code: "AED", label: "AED" },
  { code: "KWD", label: "KWD" },
];

interface BaseCurrencySelectorProps {
  value: string;
  onChange: (currency: string) => void;
}

export function BaseCurrencySelector({ value, onChange }: BaseCurrencySelectorProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{t("baseCurrency")}</span>
      <Select value={value} onValueChange={(v) => { if (v) onChange(v); }}>
        <SelectTrigger className="w-24 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
