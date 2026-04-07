"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type TimeRange = "1M" | "3M" | "6M" | "1Y" | "All";

interface TimeRangeToggleProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

const RANGES: TimeRange[] = ["1M", "3M", "6M", "1Y", "All"];
const MONTHS_MAP: Record<TimeRange, number | undefined> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "1Y": 12,
  "All": undefined,
};

export function timeRangeToMonths(range: TimeRange): number | undefined {
  return MONTHS_MAP[range];
}

const I18N_KEYS: Record<TimeRange, string> = {
  "1M": "1M",
  "3M": "3M",
  "6M": "6M",
  "1Y": "1Y",
  "All": "All",
};

export function TimeRangeToggle({ value, onChange }: TimeRangeToggleProps) {
  const t = useTranslations("dashboard.timeRange");

  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg bg-muted p-1"
      role="radiogroup"
      aria-label="Time range"
    >
      {RANGES.map((range) => (
        <button
          key={range}
          role="radio"
          aria-checked={value === range}
          onClick={() => onChange(range)}
          className={cn(
            "py-2 px-4 text-xs rounded-md transition-colors",
            value === range
              ? "bg-card shadow-sm text-primary font-bold"
              : "text-muted-foreground font-normal hover:text-foreground"
          )}
        >
          {t(I18N_KEYS[range])}
        </button>
      ))}
    </div>
  );
}
