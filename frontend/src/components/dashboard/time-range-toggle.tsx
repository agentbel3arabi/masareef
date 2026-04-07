"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type TimeRange = "1M" | "3M" | "6M" | "1Y" | "All";

interface TimeRangeToggleProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

const RANGES: TimeRange[] = ["1M", "3M", "6M", "1Y", "All"];

/** "All" maps to 60 (backend max) — not unbounded. */
const MONTHS_MAP: Record<TimeRange, number> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "1Y": 12,
  "All": 60,
};

export function timeRangeToMonths(range: TimeRange): number {
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
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg bg-muted p-1"
      role="radiogroup"
      aria-label={t("label")}
    >
      {RANGES.map((range, idx) => (
        <button
          key={range}
          ref={(el) => { buttonRefs.current[idx] = el; }}
          role="radio"
          aria-checked={value === range}
          tabIndex={value === range ? 0 : -1}
          onClick={() => onChange(range)}
          onKeyDown={(e) => {
            let nextIdx = idx;
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
              e.preventDefault();
              nextIdx = (idx + 1) % RANGES.length;
            } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
              e.preventDefault();
              nextIdx = (idx - 1 + RANGES.length) % RANGES.length;
            } else {
              return;
            }
            onChange(RANGES[nextIdx]);
            buttonRefs.current[nextIdx]?.focus();
          }}
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
