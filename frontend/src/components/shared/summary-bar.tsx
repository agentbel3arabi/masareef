import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SummaryItem {
  label: string;
  value: string;
  colorClass?: string;
}

interface SummaryBarProps {
  items: SummaryItem[];
  className?: string;
}

export function SummaryBar({ items, className }: SummaryBarProps) {
  return (
    <Card className={cn("flex flex-wrap items-center gap-6 p-4", className)}>
      {items.map((item, index) => (
        <div key={item.label ?? index} className="flex flex-col">
          <span className="text-xs font-medium text-muted-foreground">
            {item.label}
          </span>
          <span
            className={cn("text-lg font-bold", item.colorClass ?? "text-foreground")}
          >
            {item.value}
          </span>
        </div>
      ))}
    </Card>
  );
}
