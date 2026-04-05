"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { MoreVertical, Eye, Pencil, Trash2, TrendingUp, TrendingDown, Hash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoneyDisplay } from "@/components/shared/money-display";
import { formatEnumLabel } from "@/lib/enum-labels";
import { formatAmount, formatAmountAr } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Account } from "@/hooks/use-accounts";

interface BankAccountCardProps {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
  manageMode?: boolean;
  selected?: boolean;
  onSelect?: (id: number) => void;
  hideInstitution?: boolean;
}

export function BankAccountCard({
  account,
  onEdit,
  onDelete,
  manageMode,
  selected,
  onSelect,
  hideInstitution,
}: BankAccountCardProps) {
  const t = useTranslations("accounts");
  const locale = useLocale();
  const router = useRouter();
  const institutionName = account.institution
    ? (locale === "ar" ? account.institution.name_ar : account.institution.name_en)
    : null;

  const cardContent = (
    <div
      className={cn(
        "bg-card rounded-lg p-5 shadow-sm hover:-translate-y-1 hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer border border-transparent",
        account.displayed_balance_minor < 0 &&
          "border-s-4 border-s-destructive/60 bg-destructive/5"
      )}
    >
      {manageMode && (
        <div
          className={cn(
            "absolute top-2 end-2 z-20 h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all pointer-events-none",
            selected
              ? "bg-primary border-primary text-white"
              : "bg-background/90 border-border"
          )}
          aria-hidden="true"
        >
          {selected && <span className="text-xs font-bold">✓</span>}
        </div>
      )}
      {!hideInstitution && institutionName && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          {institutionName}
        </p>
      )}
      <p className="text-sm font-medium text-foreground mb-1">{account.name}</p>
      <div className="flex items-center gap-2 mb-3">
        <p className="text-[10px] font-medium text-muted-foreground">
          {formatEnumLabel(account.type)}
        </p>
        {account.account_tier && (
          <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium bg-muted text-muted-foreground">
            {account.account_tier}
          </span>
        )}
        {account.iban_last4 && (
          <span className="text-[10px] text-muted-foreground/60">
            ****{account.iban_last4}
          </span>
        )}
      </div>
      <MoneyDisplay
        amount={account.displayed_balance_minor}
        currency={account.currency}
        size="lg"
        colorize
      />
      {/* Monthly transaction summary */}
      {account.monthly_stats && account.monthly_stats.month_transaction_count > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-border/40">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-green-500 shrink-0" />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{t("monthIn")}</p>
              <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                {locale === "ar"
                  ? formatAmountAr(account.monthly_stats.month_income_minor, account.currency)
                  : formatAmount(account.monthly_stats.month_income_minor, account.currency)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-3 w-3 text-red-500 shrink-0" />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{t("monthOut")}</p>
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                {locale === "ar"
                  ? formatAmountAr(account.monthly_stats.month_expense_minor, account.currency)
                  : formatAmount(account.monthly_stats.month_expense_minor, account.currency)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{t("monthTxns")}</p>
              <p className="text-xs font-semibold">{account.monthly_stats.month_transaction_count}</p>
            </div>
          </div>
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2">
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            account.is_active !== false ? "bg-primary" : "bg-muted-foreground"
          )}
        />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {account.is_active !== false
            ? t("accountStatusActive")
            : t("accountStatusInactive")}
        </span>
      </div>
    </div>
  );

  return (
    <div className={cn("relative group", selected && "ring-2 ring-primary rounded-lg")}>
      {manageMode ? (
        <button
          type="button"
          className="w-full text-start block"
          onClick={() => onSelect?.(account.id)}
          aria-label={selected ? t("deselectAccount") : t("selectAccount")}
        >
          {cardContent}
        </button>
      ) : (
        <Link href={`/accounts/${account.id}`}>{cardContent}</Link>
      )}
      {!manageMode && (
        <div
          className="absolute top-3 end-3 z-10"
          onClick={(e) => e.preventDefault()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-background/90 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
                  aria-label={t("accountActions")}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/accounts/${account.id}`)}>
                <Eye className="h-4 w-4 me-2" />
                {t("viewTransactions")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 me-2" />
                {t("editAccount")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 me-2" />
                {t("deleteAccount")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
