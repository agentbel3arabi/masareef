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
  className?: string;
}

export function StatCard({ icon: Icon, label, value, trend, className }: StatCardProps) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">
            {label}
          </p>
          <p className="text-lg font-bold text-foreground truncate">{value}</p>
        </div>
      </div>
      {trend && (
        <p
          className={cn(
            "mt-2 text-xs font-medium",
            trend.direction === "up" && "text-primary",
            trend.direction === "down" && "text-destructive",
            trend.direction === "flat" && "text-muted-foreground"
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
