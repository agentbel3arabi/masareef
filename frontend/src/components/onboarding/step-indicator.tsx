import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  /** Step label strings, one per step. Array index + 1 = step number. */
  steps: string[];
  /** Current active step, 1-indexed. */
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex w-full items-start">
      {steps.map((label, i) => {
        const stepNumber = i + 1;
        const isDone = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <div key={stepNumber} className="flex flex-1 flex-col items-center relative">
            {/* Connecting line before this step (not before first) */}
            {i > 0 && (
              <div
                className={cn(
                  "absolute top-4 end-1/2 w-full h-0.5",
                  isDone ? "bg-primary" : "bg-muted"
                )}
              />
            )}

            {/* Step circle */}
            <div
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                isDone && "bg-primary text-primary-foreground",
                isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                !isDone && !isCurrent && "bg-muted text-muted-foreground"
              )}
            >
              {isDone ? <Check className="h-4 w-4" /> : stepNumber}
            </div>

            {/* Step label */}
            <span
              className={cn(
                "mt-2 text-center text-xs font-medium leading-tight max-w-[80px]",
                isCurrent ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
