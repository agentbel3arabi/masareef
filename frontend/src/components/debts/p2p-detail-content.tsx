"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Check, AlertCircle, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MoneyDisplay } from "@/components/shared/money-display";
import { ProgressBar } from "@/components/shared/progress-bar";
import { StatusBadge } from "@/components/debts/status-badge";
import { RecordPaymentForm } from "@/components/debts/record-payment-form";
import {
  useDebt,
  useDebtSplits,
  useDebtPayments,
  useMarkDebtPaid,
} from "@/hooks/use-debts";
import { usePerson } from "@/hooks/use-persons";
import type { ScheduleRowStatus } from "@/lib/types/debts";

// ── Status mapping ─────────────────────────────────────────
const splitStatusMap: Record<
  ScheduleRowStatus,
  "completed" | "overdue" | "pending"
> = {
  paid: "completed",
  overdue: "overdue",
  upcoming: "pending",
};

// ── Skeleton ───────────────────────────────────────────────
function P2PDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="space-y-2">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="h-4 w-40 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-64 rounded-lg bg-muted" />
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function personInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Component ──────────────────────────────────────────────
interface P2PDetailContentProps {
  debtId: number;
}

export function P2PDetailContent({ debtId }: P2PDetailContentProps) {
  const t = useTranslations("debts.detail");
  const tActions = useTranslations("debts.actions");
  const tPersons = useTranslations("persons");
  const [paymentOpen, setPaymentOpen] = useState(false);

  const {
    data: debtRes,
    isLoading: debtLoading,
    error: debtError,
  } = useDebt(debtId);
  const { data: splitsRes, isLoading: splitsLoading } = useDebtSplits(debtId);
  const { data: paymentsRes, isLoading: paymentsLoading } =
    useDebtPayments(debtId);
  const markPaid = useMarkDebtPaid();

  const debt = debtRes?.data;
  const personId = debt?.person_id ?? 0;
  const { data: personRes } = usePerson(personId);
  const person = personRes?.data ?? null;

  // Loading
  if (debtLoading) return <P2PDetailSkeleton />;

  // Error
  if (debtError) {
    return (
      <div className="py-12 text-center text-destructive">
        {t("debtLoadError")}
      </div>
    );
  }

  // Not found
  if (!debt) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {t("debtNotFound")}
      </div>
    );
  }

  const splits = splitsRes?.data ?? [];
  const payments = paymentsRes?.data ?? [];

  const progressPercent =
    debt.principal_minor > 0
      ? Math.round((debt.total_paid_minor / debt.principal_minor) * 100)
      : 0;

  const isLent = debt.type === "personal_lent";
  const typeLabel = isLent ? t("lent") : t("borrowed");

  const hasSplits =
    debt.repayment_mode === "equal_splits" ||
    debt.repayment_mode === "custom_splits";

  return (
    <div className="space-y-6">
      {/* ── Back link ─────────────────────────────────── */}
      <Link
        href="/debts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <span>←</span> {t("backToDebts")}
      </Link>

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {person && (
            <Avatar className="h-10 w-10">
              <AvatarFallback>{personInitials(person.name)}</AvatarFallback>
            </Avatar>
          )}
          <div>
            <h1 className="text-2xl font-bold">{debt.name}</h1>
            {person && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{person.name}</span>
                {person.relationship && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {tPersons(`relationships.${person.relationship}`)}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge
            status={debt.status === "active" ? "active" : "completed"}
          />
          <Badge
            className={
              isLent
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
            }
          >
            {typeLabel}
          </Badge>
        </div>
      </div>

      {/* ── Summary cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <span className="text-xs text-muted-foreground">{t("totalAmount")}</span>
          </CardHeader>
          <CardContent>
            <MoneyDisplay
              amount={debt.principal_minor}
              currency={debt.currency}
              size="lg"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <span className="text-xs text-muted-foreground">{t("paidAmount")}</span>
          </CardHeader>
          <CardContent>
            <MoneyDisplay
              amount={debt.total_paid_minor}
              currency={debt.currency}
              size="lg"
              colorize
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <span className="text-xs text-muted-foreground">{t("remainingAmount")}</span>
          </CardHeader>
          <CardContent>
            <MoneyDisplay
              amount={debt.remaining_minor}
              currency={debt.currency}
              size="lg"
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Progress ──────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("repaymentProgress")}</span>
          <span className="font-medium">{progressPercent}%</span>
        </div>
        <ProgressBar value={progressPercent} size="md" showLabel={false} />
      </div>

      {/* ── Actions ───────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setPaymentOpen(true)}>{tActions("recordPayment")}</Button>
        {debt.status === "active" && (
          <Button
            variant="outline"
            onClick={() => markPaid.mutate(debtId)}
            disabled={markPaid.isPending}
          >
            {markPaid.isPending ? t("marking") : tActions("markPaid")}
          </Button>
        )}
      </div>

      <RecordPaymentForm
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        debtId={debtId}
        currency={debt.currency}
      />

      {/* ── Split Schedule (timeline) ─────────────────── */}
      {hasSplits && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t("splitSchedule")}</h2>

          {splitsLoading ? (
            <div className="animate-pulse space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted" />
              ))}
            </div>
          ) : splits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("noSplits")}
            </p>
          ) : (
            <div className="relative">
              {splits.map((split, i) => (
                <div key={split.id} className="relative flex gap-4 pb-6">
                  {/* Vertical line */}
                  {i < splits.length - 1 && (
                    <div className="absolute start-[11px] top-6 bottom-0 w-0.5 bg-border" />
                  )}
                  {/* Dot */}
                  <div
                    className={`relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      split.status === "paid"
                        ? "bg-green-100 dark:bg-green-900/30"
                        : split.status === "overdue"
                          ? "bg-red-100 dark:bg-red-900/30"
                          : "bg-muted"
                    }`}
                  >
                    {split.status === "paid" ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : split.status === "overdue" ? (
                      <AlertCircle className="h-3 w-3 text-red-600" />
                    ) : (
                      <Circle className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <MoneyDisplay
                          amount={split.amount_minor}
                          currency={debt.currency}
                          size="sm"
                          className="font-semibold"
                        />
                        <p className="text-xs text-muted-foreground">
                          {formatDate(split.due_date)}
                        </p>
                      </div>
                      <StatusBadge status={splitStatusMap[split.status]} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Lump Sum info ─────────────────────────────── */}
      {debt.repayment_mode === "lump_sum" && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t("lumpSumPayment")}</h2>
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium">{t("dueDate")}</p>
                <p className="text-sm text-muted-foreground">
                  {debt.due_date ? formatDate(debt.due_date) : "—"}
                </p>
              </div>
              <MoneyDisplay
                amount={debt.principal_minor}
                currency={debt.currency}
                size="sm"
              />
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Payment History ───────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("paymentHistory")}</h2>

        {paymentsLoading ? (
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded bg-muted" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("noPayments")}
          </p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{formatDate(p.date)}</p>
                    {p.notes && (
                      <p className="text-xs text-muted-foreground">
                        {p.notes}
                      </p>
                    )}
                  </div>
                  <MoneyDisplay
                    amount={p.amount_minor}
                    currency={debt.currency}
                    size="sm"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
