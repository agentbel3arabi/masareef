"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CURRENCIES = [
  { code: "EGP", name: "Egyptian Pound", nameAr: "جنيه مصري", symbol: "EGP" },
  { code: "USD", name: "US Dollar", nameAr: "دولار أمريكي", symbol: "$" },
  { code: "EUR", name: "Euro", nameAr: "يورو", symbol: "€" },
  { code: "GBP", name: "British Pound", nameAr: "جنيه إسترليني", symbol: "£" },
  { code: "SAR", name: "Saudi Riyal", nameAr: "ريال سعودي", symbol: "SAR" },
  { code: "AED", name: "UAE Dirham", nameAr: "درهم إماراتي", symbol: "AED" },
  { code: "KWD", name: "Kuwaiti Dinar", nameAr: "دينار كويتي", symbol: "KWD" },
];

interface StepCurrencyProps {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepCurrency({ value, onChange, onNext, onBack }: StepCurrencyProps) {
  const t = useTranslations("onboarding");
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">{t("step2.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("step2.description")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {CURRENCIES.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => onChange(c.code)}
            className={cn(
              "rounded-lg border p-3 text-start text-sm transition-colors",
              value === c.code
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border hover:bg-accent"
            )}
          >
            <div className="font-semibold">
              {c.symbol} {c.code}
            </div>
            <div className="text-xs text-muted-foreground">{c.nameAr}</div>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          {t("common.back")}
        </Button>
        <Button onClick={onNext} className="flex-1">
          {t("common.next")}
        </Button>
      </div>
    </div>
  );
}
