"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MoreVertical, Eye, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoneyDisplay } from "@/components/shared/money-display";
import { formatEnumLabel } from "@/lib/enum-labels";
import { cn } from "@/lib/utils";
import type { Account } from "@/hooks/use-accounts";

interface BankAccountCardProps {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
  manageMode?: boolean;
  selected?: boolean;
  onSelect?: (id: number) => void;
}

export function BankAccountCard({
  account,
  onEdit,
  onDelete,
  manageMode,
  selected,
  onSelect,
}: BankAccountCardProps) {
  const t = useTranslations("accounts");
  const router = useRouter();

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
      {account.institution && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          {account.institution}
        </p>
      )}
      <p className="text-sm font-medium text-foreground mb-1">{account.name}</p>
      <p className="text-[10px] font-medium text-muted-foreground mb-3">
        {formatEnumLabel(account.type)}
      </p>
      <MoneyDisplay
        amount={account.displayed_balance_minor}
        currency={account.currency}
        size="lg"
        colorize
      />
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
