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
  };
  variant?: "default" | "accent";
  className?: string;
}

export function StatCard({ icon: Icon, label, value, trend, variant = "default", className }: StatCardProps) {
  const isAccent = variant === "accent";

  return (
    <Card
      className={cn(
        "p-4",
        isAccent && "bg-gradient-to-br from-primary to-primary/80 border-0 text-white",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            isAccent ? "bg-white/20" : "bg-primary/10"
          )}
        >
          <Icon
            className={cn("h-5 w-5", isAccent ? "text-white" : "text-primary")}
          />
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              "text-xs font-medium truncate",
              isAccent ? "text-white/70" : "text-muted-foreground"
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              "text-lg font-bold truncate",
              isAccent ? "text-white" : "text-foreground"
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
            isAccent
              ? "text-white/70"
              : trend.direction === "up" && "text-primary",
            !isAccent && trend.direction === "down" && "text-destructive",
            !isAccent && trend.direction === "flat" && "text-muted-foreground"
          )}
        >
          {trend.direction === "up" && "↑ "}
          {trend.direction === "down" && "↓ "}
          {trend.text}
        </p>
      )}
    </Card>
  );
}
