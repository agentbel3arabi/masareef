import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

interface BillingBadgeProps {
  paymentDueDay: number; // 1-31: day of month payment is due
}

function daysUntilNextOccurrence(dayOfMonth: number): number {
  const today = new Date();
  const todayDay = today.getDate();

  if (dayOfMonth === todayDay) return 0;

  if (dayOfMonth > todayDay) {
    // Due day is still coming this month
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
    return Math.ceil((thisMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Due day already passed this month — overdue
  return dayOfMonth - todayDay; // negative number
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
