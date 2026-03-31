"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/shared/money-display";
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

  const cardContent = (
    <div className="bg-card rounded-lg p-5 shadow-sm hover:-translate-y-1 transition-all duration-200 cursor-pointer">
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
      <p className="text-sm font-medium text-foreground mb-3">{account.name}</p>
      <MoneyDisplay
        amount={account.displayed_balance_minor}
        currency={account.currency}
        size="lg"
        colorize
      />
      <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full", account.is_active !== false ? "bg-primary" : "bg-muted-foreground")} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {account.is_active !== false ? t("accountStatusActive") : t("accountStatusInactive")}
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
        <div className="absolute top-3 end-3 hidden group-hover:flex group-focus-within:flex gap-1 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-background/90 shadow-sm hover:bg-background"
            onClick={(e) => {
              e.preventDefault();
              onEdit();
            }}
            aria-label={t("editAccount")}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-background/90 shadow-sm hover:bg-destructive hover:text-destructive-foreground"
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
            aria-label={t("deleteAccount")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
