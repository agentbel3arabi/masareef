'use client';

interface ProgressBarProps {
  value: number;           // 0-100 percentage
  colorClass?: string;     // Tailwind bg class, default "bg-primary"
  size?: "sm" | "md";      // Height: sm=6px, md=8px. Default "md"
  showLabel?: boolean;     // Show percentage text. Default false
  className?: string;      // Additional classes for wrapper
}

export function ProgressBar({
  value,
  colorClass = "bg-primary",
  size = "md",
  showLabel = false,
  className = "",
}: ProgressBarProps) {
  // Clamp value to 0-100
  const clampedValue = Math.max(0, Math.min(100, value));

  // Determine height based on size: sm=h-1.5 (6px), md=h-2 (8px)
  const heightClass = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex-1 rounded-full bg-muted overflow-hidden ${heightClass}`}
      >
        <div
          className={`h-full rounded-full ${colorClass} transition-all duration-300`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium whitespace-nowrap">
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
}
