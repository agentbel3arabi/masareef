"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Wallet, Receipt, HandCoins, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GettingStartedCardProps {
  hasAccounts: boolean;
  hasTransactions: boolean;
  hasDebts: boolean;
  onDismiss: () => void;
}

export function GettingStartedCard({
  hasAccounts,
  hasTransactions,
  hasDebts,
  onDismiss,
}: GettingStartedCardProps) {
  const t = useTranslations("dashboard");

  const steps = [
    {
      done: hasAccounts,
      icon: Wallet,
      label: t("getStarted.addAccount"),
      href: "/accounts",
    },
    {
      done: hasTransactions,
      icon: Receipt,
      label: t("getStarted.recordTransaction"),
      href: "/transactions",
    },
    {
      done: hasDebts,
      icon: HandCoins,
      label: t("getStarted.setupDebts"),
      href: "/debts",
    },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">{t("getStarted.title")}</h2>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          {t("getStarted.dismiss")}
        </Button>
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <Link
            key={i}
            href={step.href}
            className={cn(
              "flex items-center gap-3 rounded-lg p-3 transition-colors",
              step.done
                ? "bg-green-50 dark:bg-green-950/20"
                : "bg-muted/50 hover:bg-muted"
            )}
          >
            {step.done ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            ) : (
              <step.icon className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                step.done && "line-through text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
