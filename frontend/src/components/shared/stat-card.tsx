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
  variant?: "default" | "accent" | "success" | "destructive";
  className?: string;
}

export function StatCard({ icon: Icon, label, value, trend, variant = "default", className }: StatCardProps) {
  return (
    <Card
      className={cn(
        "p-4",
        variant === "accent" && "bg-gradient-to-br from-primary to-primary/80 border-0 text-white",
        variant === "success" && "bg-gradient-to-br from-green-600 to-green-700 border-0 text-white",
        variant === "destructive" && "bg-gradient-to-br from-red-600 to-red-700 border-0 text-white",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            variant === "default" ? "bg-primary/10" : "bg-white/20"
          )}
        >
          <Icon
            className={cn("h-5 w-5", variant === "default" ? "text-primary" : "text-white")}
          />
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              "text-xs font-medium truncate",
              variant === "default" ? "text-muted-foreground" : "text-white/70"
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              "text-lg font-bold truncate",
              variant === "default" ? "text-foreground" : "text-white"
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
            variant !== "default"
              ? "text-white/70"
              : trend.direction === "up" && "text-primary",
            variant === "default" && trend.direction === "down" && "text-destructive",
            variant === "default" && trend.direction === "flat" && "text-muted-foreground"
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
