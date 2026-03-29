import { type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StatCardPlaceholderProps {
  label: string;
  icon: LucideIcon;
  comingSoon: string;
}

export function StatCardPlaceholder({ label, icon: Icon, comingSoon }: StatCardPlaceholderProps) {
  return (
    <Card className="opacity-75">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground/50" />
      </CardHeader>
      <CardContent>
        <div className="h-7 w-24 rounded bg-muted" />
        <Badge variant="outline" className="mt-2 text-xs">{comingSoon}</Badge>
      </CardContent>
    </Card>
  );
}
