"use client";

import { useTranslations, useLocale } from "next-intl";
import { Pencil, Trash2, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/shared/money-display";
import { cn } from "@/lib/utils";
import type { PersonResponse } from "@/lib/types/debts";

interface PersonCardProps {
  person: PersonResponse;
  onEdit: (person: PersonResponse) => void;
  onDelete: (person: PersonResponse) => void;
}

export function PersonCard({ person, onEdit, onDelete }: PersonCardProps) {
  const t = useTranslations("people");
  const tPersons = useTranslations("persons");
  const locale = useLocale();

  const displayName = locale === "ar" && person.name_ar ? person.name_ar : person.name;
  const balances = person.balances;
  const byCurrency = balances?.by_currency ?? {};
  const hasCurrencyBalances = Object.keys(byCurrency).length > 0;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        {/* Left: avatar + info */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            {person.relationship && (
              <p className="text-xs text-muted-foreground">
                {tPersons(`relationships.${person.relationship}`)}
              </p>
            )}
            {person.phone && (
              <p className="text-xs text-muted-foreground mt-0.5">{person.phone}</p>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(person)}
            aria-label={t("editPerson")}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(person)}
            aria-label={t("deletePerson")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Balances */}
      {hasCurrencyBalances && (
        <div className="mt-3 pt-3 border-t border-border space-y-1">
          {Object.entries(byCurrency).map(([currency, amount]) => {
            const isPositive = amount > 0;
            const isNegative = amount < 0;
            return (
              <div key={currency} className="flex items-center justify-between text-xs">
                <span
                  className={cn(
                    "font-medium",
                    isPositive && "text-emerald-600",
                    isNegative && "text-destructive",
                    !isPositive && !isNegative && "text-muted-foreground"
                  )}
                >
                  {isPositive
                    ? t("theyOweYou")
                    : isNegative
                      ? t("youOweThem")
                      : t("settled")}
                </span>
                <MoneyDisplay
                  amount={Math.abs(amount)}
                  currency={currency}
                  className={cn(
                    "inline text-xs font-semibold",
                    isPositive && "text-emerald-600",
                    isNegative && "text-destructive"
                  )}
                />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
