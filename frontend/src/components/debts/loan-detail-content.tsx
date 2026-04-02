"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { ProgressBar } from "@/components/shared/progress-bar";
import { StatusBadge } from "@/components/debts/status-badge";
import { RecordPaymentForm } from "@/components/debts/record-payment-form";
import {
  useDebt,
  useAmortizationSchedule,
  useDebtPayments,
  useMarkDebtPaid,
} from "@/hooks/use-debts";
import type { ScheduleRowStatus } from "@/lib/types/debts";

// ── Status mapping ─────────────────────────────────────────
const scheduleStatusMap: Record<
  ScheduleRowStatus,
  "completed" | "overdue" | "pending"
> = {
  paid: "completed",
  overdue: "overdue",
  upcoming: "pending",
};

// ── Skeleton ───────────────────────────────────────────────
function LoanDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="space-y-2">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="h-4 w-40 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-64 rounded-lg bg-muted" />
    </div>
  );
}

// ── Component ──────────────────────────────────────────────
interface LoanDetailContentProps {
  debtId: number;
}

export function LoanDetailContent({ debtId }: LoanDetailContentProps) {
  const [paymentOpen, setPaymentOpen] = useState(false);

  const { data: debtRes, isLoading: debtLoading, error: debtError } = useDebt(debtId);
  const { data: scheduleRes, isLoading: scheduleLoading } = useAmortizationSchedule(debtId);
  const { data: paymentsRes, isLoading: paymentsLoading } = useDebtPayments(debtId);
  const markPaid = useMarkDebtPaid();

  // Loading
  if (debtLoading) return <LoanDetailSkeleton />;

  // Error
  if (debtError) {
    return (
      <div className="py-12 text-center text-destructive">
        Failed to load loan details. Please try again.
      </div>
    );
  }

  const debt = debtRes?.data;

  // Not found
  if (!debt) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loan not found.
      </div>
    );
  }

  const schedule = scheduleRes?.data?.schedule ?? [];
  const payments = paymentsRes?.data ?? [];

  const progressPercent =
    debt.principal_minor > 0
      ? Math.round((debt.total_paid_minor / debt.principal_minor) * 100)
      : 0;

  const aprPercent = (debt.annual_rate_bps / 100).toFixed(2);

  return (
    <div className="space-y-6">
      {/* ── Back link ─────────────────────────────────── */}
      <Link
        href="/debts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <span>←</span> Back to Debts
      </Link>

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{debt.name}</h1>
          {debt.institution && (
            <p className="text-sm text-muted-foreground">{debt.institution}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge
            status={debt.status === "active" ? "active" : "completed"}
          />
          <Badge variant="outline">{aprPercent}% APR</Badge>
        </div>
      </div>

      {/* ── Summary cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <span className="text-xs text-muted-foreground">Principal</span>
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
            <span className="text-xs text-muted-foreground">
              Monthly Payment
            </span>
          </CardHeader>
          <CardContent>
            <MoneyDisplay
              amount={debt.monthly_payment_minor}
              currency={debt.currency}
              size="lg"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <span className="text-xs text-muted-foreground">Total Paid</span>
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
            <span className="text-xs text-muted-foreground">Remaining</span>
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
          <span className="text-muted-foreground">Repayment Progress</span>
          <span className="font-medium">{progressPercent}%</span>
        </div>
        <ProgressBar value={progressPercent} size="md" showLabel={false} />
      </div>

      {/* ── Actions ───────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setPaymentOpen(true)}>Record Payment</Button>
        {debt.status === "active" && (
          <Button
            variant="outline"
            onClick={() => markPaid.mutate(debtId)}
            disabled={markPaid.isPending}
          >
            {markPaid.isPending ? "Marking…" : "Mark as Paid"}
          </Button>
        )}
      </div>

      <RecordPaymentForm
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        debtId={debtId}
        currency={debt.currency}
      />

      {/* ── Amortization schedule ─────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Amortization Schedule</h2>

        {scheduleLoading ? (
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-muted" />
            ))}
          </div>
        ) : schedule.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No amortization schedule available.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-start font-medium">#</th>
                  <th className="px-3 py-2 text-start font-medium">Date</th>
                  <th className="px-3 py-2 text-end font-medium">Payment</th>
                  <th className="px-3 py-2 text-end font-medium">Principal</th>
                  <th className="px-3 py-2 text-end font-medium">Interest</th>
                  <th className="px-3 py-2 text-end font-medium">Remaining</th>
                  <th className="px-3 py-2 text-start font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row, idx) => (
                  <tr
                    key={row.payment_number}
                    className={idx % 2 === 1 ? "bg-muted/25" : ""}
                  >
                    <td className="px-3 py-2 text-start">
                      {row.payment_number}
                    </td>
                    <td className="px-3 py-2 text-start">{row.date}</td>
                    <td className="px-3 py-2 text-end">
                      <MoneyDisplay
                        amount={row.payment_minor}
                        currency={debt.currency}
                        size="sm"
                        showCurrency={false}
                      />
                    </td>
                    <td className="px-3 py-2 text-end">
                      <MoneyDisplay
                        amount={row.principal_minor}
                        currency={debt.currency}
                        size="sm"
                        showCurrency={false}
                      />
                    </td>
                    <td className="px-3 py-2 text-end">
                      <MoneyDisplay
                        amount={row.interest_minor}
                        currency={debt.currency}
                        size="sm"
                        showCurrency={false}
                      />
                    </td>
                    <td className="px-3 py-2 text-end">
                      <MoneyDisplay
                        amount={row.remaining_minor}
                        currency={debt.currency}
                        size="sm"
                        showCurrency={false}
                      />
                    </td>
                    <td className="px-3 py-2 text-start">
                      <StatusBadge status={scheduleStatusMap[row.status]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Payment history ───────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Payment History</h2>

        {paymentsLoading ? (
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded bg-muted" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No payments recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{p.date}</p>
                    {p.notes && (
                      <p className="text-xs text-muted-foreground">{p.notes}</p>
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
