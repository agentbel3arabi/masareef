import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

interface BillingBadgeProps {
  paymentDueDay: number; // 1-31: day of month payment is due
}

function daysUntilNextOccurrence(dayOfMonth: number): number {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const thisMonth = new Date(year, month, dayOfMonth);
  if (thisMonth <= today) {
    const nextMonth = new Date(year, month + 1, dayOfMonth);
    return Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
  return Math.ceil((thisMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function BillingBadge({ paymentDueDay }: BillingBadgeProps) {
  const t = useTranslations("accounts");
  const days = daysUntilNextOccurrence(paymentDueDay);

  const variant: "destructive" | "secondary" | "outline" =
    days <= 3 ? "destructive" :
    days <= 7 ? "secondary" :
    "outline";

  const label =
    days === 0 ? t("dueToday") :
    days < 0 ? t("overdue") :
    t("dueInDays", { days });

  return <Badge variant={variant} className="text-xs mt-1">{label}</Badge>;
}
