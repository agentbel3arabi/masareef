import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface RequiredLabelProps {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
}

export function RequiredLabel({
  children,
  required = false,
  htmlFor,
  className,
}: RequiredLabelProps) {
  return (
    <Label htmlFor={htmlFor} className={cn(className)}>
      {children}
      {required && <span className="text-destructive ms-0.5">*</span>}
    </Label>
  );
}
