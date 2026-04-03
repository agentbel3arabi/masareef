import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComingSoonValueProps {
  value?: string;
  className?: string;
}

/** Displays "—" with a subtle clock icon to indicate a "coming soon" placeholder */
export function ComingSoonValue({ value = "—", className }: ComingSoonValueProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {value}
      <Clock className="h-3 w-3 text-muted-foreground/50" />
    </span>
  );
}
