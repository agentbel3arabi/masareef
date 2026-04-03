"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MoreVertical, Eye, Pencil, FileText, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UtilizationBar } from "./utilization-bar";
import { formatAmount } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Account } from "@/hooks/use-accounts";

// Credit card physical face gradient — alternates by account id
function creditCardGradient(id: number): string {
  return id % 2 === 1
    ? "from-slate-800 to-slate-900"    // dark navy
    : "from-emerald-800 to-emerald-900"; // dark green
}

// Last 4 digits placeholder based on account id
function maskedLast4(id: number): string {
  return String(id).padStart(4, "0").slice(-4);
}

interface CreditAccountCardProps {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
  manageMode?: boolean;
  selected?: boolean;
  onSelect?: (id: number) => void;
}

export function CreditAccountCard({
  account,
  onEdit,
  onDelete,
  manageMode,
  selected,
  onSelect,
}: CreditAccountCardProps) {
  const t = useTranslations("accounts");
  const router = useRouter();
  const gradient = creditCardGradient(account.id);
  const last4 = maskedLast4(account.id);
  const available =
    account.credit_limit != null
      ? account.credit_limit + account.displayed_balance_minor
      : null;

  const cardContent = (
    <div className="bg-card rounded-lg overflow-hidden shadow-sm hover:-translate-y-1 transition-all duration-200 cursor-pointer">
      {/* Physical card face */}
      <div className={cn("bg-gradient-to-br p-5 relative h-40", gradient)}>
        {manageMode && (
          <div
            className={cn(
              "absolute top-2 end-2 z-20 h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all pointer-events-none",
              selected
                ? "bg-primary border-primary text-white"
                : "bg-white/20 border-white/60"
            )}
            aria-hidden="true"
          >
            {selected && <span className="text-xs font-bold">✓</span>}
          </div>
        )}
        <div className="flex items-start justify-between mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">
            {account.institution || account.name}
          </p>
          <div className="flex gap-1">
            <div className="w-7 h-5 rounded bg-white/20" />
            <div className="w-7 h-5 rounded bg-white/10 -ms-3" />
          </div>
        </div>
        <p className="text-sm font-mono tracking-[0.2em] text-white/90 mb-4">
          •••• •••• •••• {last4}
        </p>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-white/50 mb-0.5">
            {t("cardholder")}
          </p>
          <p className="text-xs font-bold uppercase tracking-wider text-white">
            {account.name}
          </p>
        </div>
      </div>

      {/* Stats below the card face */}
      <div className="p-4 space-y-3">
        {account.credit_limit != null && (
          <UtilizationBar
            balanceMinor={account.displayed_balance_minor}
            creditLimitMinor={account.credit_limit}
            currency={account.currency}
          />
        )}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              {t("creditLimit")}
            </p>
            <p className="text-xs font-semibold">
              {account.credit_limit != null
                ? formatAmount(account.credit_limit, account.currency)
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              {t("amountDue")}
            </p>
            <p className="text-xs font-semibold text-destructive">
              {formatAmount(
                Math.abs(account.displayed_balance_minor),
                account.currency
              )}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              {t("available")}
            </p>
            <p className={cn("text-xs font-semibold", available != null && available < 0 ? "text-destructive" : "text-primary")}>
              {available != null
                ? formatAmount(available, account.currency)
                : "—"}
            </p>
          </div>
        </div>
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
                  className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-white/20 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/30"
                  aria-label={t("editAccount")}
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
              <DropdownMenuItem disabled>
                <FileText className="h-4 w-4 me-2" />
                {t("viewStatement")}
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
