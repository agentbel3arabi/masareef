"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Info, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/shared/money-display";
import { useBulkPastPayments } from "@/hooks/use-debts";
import type { ScheduleRow } from "@/lib/types/debts";

// ── Types ──────────────────────────────────────────────────
interface SetupPastPaymentsProps {
  debtId: number;
  currency: string;
  schedule: ScheduleRow[];
  linkedAccountId: number | null;
  accountOpenedAt: string | null;
  accountName?: string;
  onComplete: () => void;
  onSkip: () => void;
}

// ── Component ──────────────────────────────────────────────
export function SetupPastPayments({
  debtId,
  currency,
  schedule,
  linkedAccountId,
  accountOpenedAt,
  accountName,
  onComplete,
  onSkip,
}: SetupPastPaymentsProps) {
  const t = useTranslations("debts.setupPastPayments");
  const bulkMutation = useBulkPastPayments(debtId);

  // Only overdue (past unpaid) rows
  const overdueRows = useMemo(
    () => schedule.filter((r) => r.status === "overdue"),
    [schedule],
  );

  // Split into before/after cutoff groups
  const { beforeCutoff, afterCutoff, hasCutoff } = useMemo(() => {
    if (!linkedAccountId || !accountOpenedAt) {
      return { beforeCutoff: [] as ScheduleRow[], afterCutoff: overdueRows, hasCutoff: false };
    }
    const before: ScheduleRow[] = [];
    const after: ScheduleRow[] = [];
    for (const row of overdueRows) {
      if (row.date < accountOpenedAt) {
        before.push(row);
      } else {
        after.push(row);
      }
    }
    return { beforeCutoff: before, afterCutoff: after, hasCutoff: true };
  }, [overdueRows, linkedAccountId, accountOpenedAt]);

  // All overdue installments pre-checked
  const [checkedRows, setCheckedRows] = useState<Set<number>>(
    () => new Set(overdueRows.map((r) => r.payment_number)),
  );

  // Compute months ago from first overdue row
  const monthsAgo = useMemo(() => {
    if (overdueRows.length === 0) return 0;
    const firstDate = new Date(overdueRows[0].date);
    const now = new Date();
    return Math.max(
      1,
      (now.getFullYear() - firstDate.getFullYear()) * 12 +
        (now.getMonth() - firstDate.getMonth()),
    );
  }, [overdueRows]);

  // Balance impact = sum of afterCutoff checked rows
  const totalBalanceImpact = useMemo(() => {
    let sum = 0;
    for (const row of afterCutoff) {
      if (checkedRows.has(row.payment_number)) {
        sum += row.payment_minor;
      }
    }
    return sum;
  }, [afterCutoff, checkedRows]);

  const checkedCount = checkedRows.size;

  function toggleRow(paymentNumber: number) {
    setCheckedRows((prev) => {
      const next = new Set(prev);
      if (next.has(paymentNumber)) {
        next.delete(paymentNumber);
      } else {
        next.add(paymentNumber);
      }
      return next;
    });
  }

  async function handleConfirm() {
    if (checkedCount === 0) return;
    bulkMutation.mutate(
      {
        installment_numbers: [...checkedRows],
        account_id: linkedAccountId ?? 0,
      },
      { onSuccess: () => onComplete() },
    );
  }

  if (overdueRows.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <h3 className="text-lg font-semibold">{t("title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("description", { months: monthsAgo })}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* No linked account notice */}
        {!linkedAccountId && (
          <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("noLinkedAccount")}</span>
          </div>
        )}

        {/* Before cutoff group */}
        {hasCutoff && beforeCutoff.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span>{t("beforeCutoff", { date: accountOpenedAt ?? "" })}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="flex items-start gap-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{t("beforeCutoffHint")}</span>
            </div>
            {beforeCutoff.map((row) => (
              <InstallmentCheckRow
                key={row.payment_number}
                row={row}
                currency={currency}
                checked={checkedRows.has(row.payment_number)}
                onToggle={() => toggleRow(row.payment_number)}
                disabled={bulkMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* After cutoff group (or single group when no cutoff) */}
        {afterCutoff.length > 0 && (
          <div className="space-y-2">
            {hasCutoff && (
              <>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  <span>{t("afterCutoff")}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                {totalBalanceImpact > 0 && (
                  <div className="flex items-start gap-2 rounded-md bg-warning/10 p-2 text-xs text-warning-foreground">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                    <span>
                      {t.rich("afterCutoffWarning", {
                        account: accountName ?? "",
                        amount: () => (
                          <MoneyDisplay
                            amount={totalBalanceImpact}
                            currency={currency}
                            size="sm"
                            className="inline font-semibold"
                          />
                        ),
                      })}
                    </span>
                  </div>
                )}
              </>
            )}
            {afterCutoff.map((row) => (
              <InstallmentCheckRow
                key={row.payment_number}
                row={row}
                currency={currency}
                checked={checkedRows.has(row.payment_number)}
                onToggle={() => toggleRow(row.payment_number)}
                disabled={bulkMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Hint */}
        <p className="text-xs text-muted-foreground">{t("uncheckHint")}</p>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={bulkMutation.isPending}
          >
            {t("skip")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={checkedCount === 0 || bulkMutation.isPending}
          >
            {bulkMutation.isPending ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t("recording")}
              </>
            ) : (
              t("confirm", { count: checkedCount })
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Row sub-component ──────────────────────────────────────
function InstallmentCheckRow({
  row,
  currency,
  checked,
  onToggle,
  disabled,
}: {
  row: ScheduleRow;
  currency: string;
  checked: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md border bg-background px-3 py-2 transition-colors hover:bg-accent/50">
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        disabled={disabled}
      />
      <span className="text-sm font-medium">#{row.payment_number}</span>
      <span className="text-sm text-muted-foreground">{row.date}</span>
      <span className="ms-auto text-sm font-medium">
        <MoneyDisplay amount={row.payment_minor} currency={currency} size="sm" />
      </span>
    </label>
  );
}
