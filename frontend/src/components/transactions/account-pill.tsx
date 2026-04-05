import Link from "next/link";
import { useLocale } from "next-intl";
import type { AccountInstitution } from "@/hooks/use-accounts";

const PILL_COLORS: Record<string, string> = {
  bank_account:   "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  credit_card:    "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  cash_wallet:    "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  digital_wallet: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  financing_app:  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

interface AccountPillProps {
  accountId: number;
  accountName: string;
  accountType: string;
  institution?: AccountInstitution | null;
}

export function AccountPill({ accountId, accountName, accountType, institution }: AccountPillProps) {
  const locale = useLocale();
  const colorClass = PILL_COLORS[accountType] || "bg-muted text-muted-foreground";
  const instName = institution
    ? (locale === "ar" ? institution.name_ar : institution.name_en)
    : null;
  return (
    <Link href={`/accounts/${accountId}`}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${colorClass}`}
      >
        {accountName}
        {instName && (
          <span className="opacity-60">· {instName}</span>
        )}
      </span>
    </Link>
  );
}
