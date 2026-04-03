"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Wallet, Pencil, Trash2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/shared/money-display";
import { typeIcons, typeColors } from "./account-card.constants";
import { cn } from "@/lib/utils";
import type { Account } from "@/hooks/use-accounts";

interface OtherAccountCardProps {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
  manageMode?: boolean;
  selected?: boolean;
  onSelect?: (id: number) => void;
}

export function OtherAccountCard({
  account,
  onEdit,
  onDelete,
  manageMode,
  selected,
  onSelect,
}: OtherAccountCardProps) {
  const t = useTranslations("accounts");
  const isBnpl = account.type === "financing_app";
  const Icon = isBnpl ? Smartphone : (typeIcons[account.type] ?? Wallet);
  const iconColor = isBnpl
    ? "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400"
    : (typeColors[account.type] ?? "bg-primary/10 text-primary");

  // Extract just the background color class for the accent stripe
  const accentBg = isBnpl
    ? "bg-violet-500"
    : iconColor.split(" ").filter((c) => c.startsWith("bg-") || c.startsWith("dark:bg-")).join(" ");

  const cardContent = (
    <div className="bg-card rounded-lg overflow-hidden shadow-sm hover:-translate-y-1 transition-all duration-200 cursor-pointer flex">
      {/* Start accent stripe */}
      <div className={cn("w-1.5 shrink-0", accentBg)} />
      {/* Card content */}
      <div className="flex-1 p-5">
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
        <div className="flex items-center gap-2 mb-3">
          <div className={cn("inline-flex rounded-lg p-2", iconColor)}>
            <Icon className="h-4 w-4" />
          </div>
          {isBnpl && (
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">
              {t("bnplBadge")}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-foreground mb-0.5">{account.name}</p>
        {account.institution && (
          <p className="text-xs text-muted-foreground mb-3">{account.institution}</p>
        )}
        <MoneyDisplay
          amount={account.displayed_balance_minor}
          currency={account.currency}
          size="lg"
          colorize
        />
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
          <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/90 shadow-sm hover:bg-background"
            onClick={(e) => { e.preventDefault(); onEdit(); }} aria-label={t("editAccount")}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/90 shadow-sm hover:bg-destructive hover:text-destructive-foreground"
            onClick={(e) => { e.preventDefault(); onDelete(); }} aria-label={t("deleteAccount")}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
