import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: {
    direction: "up" | "down" | "flat";
    text: string;
    percentChange?: number | null;
  };
  variant?: "default" | "accent" | "success" | "destructive";
  className?: string;
}

export function StatCard({ icon: Icon, label, value, trend, variant = "default", className }: StatCardProps) {
  return (
    <Card
      className={cn(
        "p-4",
        variant === "accent" && "bg-primary/5 dark:bg-primary/10 border-s-4 border-s-primary",
        variant === "success" && "bg-green-50 dark:bg-green-950/20 border-s-4 border-s-green-600",
        variant === "destructive" && "bg-red-50 dark:bg-red-950/20 border-s-4 border-s-red-600",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            variant === "default" && "bg-primary/10",
            variant === "accent" && "bg-primary/10",
            variant === "success" && "bg-green-100 dark:bg-green-900/30",
            variant === "destructive" && "bg-red-100 dark:bg-red-900/30"
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              variant === "default" && "text-primary",
              variant === "accent" && "text-primary",
              variant === "success" && "text-green-600 dark:text-green-400",
              variant === "destructive" && "text-red-600 dark:text-red-400"
            )}
          />
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              "text-xs font-medium truncate",
              variant === "default" && "text-muted-foreground",
              variant === "accent" && "text-primary/70 dark:text-primary/70",
              variant === "success" && "text-green-700/70 dark:text-green-400/70",
              variant === "destructive" && "text-red-700/70 dark:text-red-400/70"
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              "text-lg font-bold truncate",
              variant === "default" && "text-foreground",
              variant === "accent" && "text-primary dark:text-primary",
              variant === "success" && "text-green-700 dark:text-green-400",
              variant === "destructive" && "text-red-700 dark:text-red-400"
            )}
          >
            {value}
          </p>
        </div>
      </div>
      {trend && (
        <p
          className={cn(
            "mt-2 text-xs font-medium",
            variant === "default" && trend.direction === "up" && "text-primary",
            variant === "default" && trend.direction === "down" && "text-destructive",
            variant === "default" && trend.direction === "flat" && "text-muted-foreground",
            variant === "accent" && "text-primary/70 dark:text-primary/70",
            variant === "success" && "text-green-700/70 dark:text-green-400/70",
            variant === "destructive" && "text-red-700/70 dark:text-red-400/70"
          )}
        >
          {trend.direction === "up" && "↑ "}
          {trend.direction === "down" && "↓ "}
          {trend.text}
          {trend.percentChange != null && (
            <span className="ms-1">({trend.percentChange > 0 ? "+" : ""}{Math.round(trend.percentChange)}%)</span>
          )}
        </p>
      )}
    </Card>
  );
}
