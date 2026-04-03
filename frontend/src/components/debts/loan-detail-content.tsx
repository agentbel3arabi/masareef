"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { ProgressBar } from "@/components/shared/progress-bar";
import { StatusBadge } from "@/components/debts/status-badge";
import { RecordPaymentForm } from "@/components/debts/record-payment-form";
import { BankLoanForm } from "@/components/debts/bank-loan-form";
import { DeleteConfirmation } from "@/components/shared/delete-confirmation";
import { SetupPastPayments } from "@/components/debts/setup-past-payments";
import {
  useDebt,
  useAmortizationSchedule,
  useDebtPayments,
  useMarkDebtPaid,
  useDeleteDebt,
} from "@/hooks/use-debts";
import { useAccounts } from "@/hooks/use-accounts";
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
  const t = useTranslations("debts.detail");
  const tActions = useTranslations("debts.actions");
  const tLoan = useTranslations("debts.loan");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSetupMode = searchParams.get("setup") === "true";

  const { data: debtRes, isLoading: debtLoading, error: debtError } = useDebt(debtId);
  const { data: scheduleRes, isLoading: scheduleLoading } = useAmortizationSchedule(debtId);
  const { data: paymentsRes, isLoading: paymentsLoading } = useDebtPayments(debtId);
  const { data: accountsRes } = useAccounts();
  const markPaid = useMarkDebtPaid();
  const deleteMutation = useDeleteDebt();

  // Loading
  if (debtLoading) return <LoanDetailSkeleton />;

  // Error
  if (debtError) {
    return (
      <div className="py-12 text-center text-destructive">
        {t("loadError")}
      </div>
    );
  }

  const debt = debtRes?.data;

  // Not found
  if (!debt) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {t("notFound")}
      </div>
    );
  }

  const schedule = scheduleRes?.data ?? [];
  const payments = paymentsRes?.data ?? [];
  const accounts = accountsRes?.data ?? [];

  // Setup banner: show when ?setup=true, schedule has overdue rows, and nothing paid yet
  const hasOverdueRows = schedule.some((r) => r.status === "overdue");
  const showSetupBanner = isSetupMode && hasOverdueRows && debt.total_paid_minor === 0;

  const linkedAccount = useMemo(
    () => (debt.linked_account_id ? accounts.find((a) => a.id === debt.linked_account_id) : undefined),
    [accounts, debt.linked_account_id],
  );

  function dismissSetup() {
    router.replace(pathname);
  }

  const totalWithInterest = debt.tenure_months * debt.monthly_payment_minor;
  const remainingPayments = Math.max(0, totalWithInterest - debt.total_paid_minor);
  const progressPercent =
    totalWithInterest > 0
      ? Math.min(100, Math.round((debt.total_paid_minor / totalWithInterest) * 100))
      : 0;

  const aprPercent = (debt.annual_rate_bps / 100).toFixed(2);

  return (
    <div className="space-y-6">
      {/* ── Back link ─────────────────────────────────── */}
      <Link
        href="/debts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <span>←</span> {t("backToDebts")}
      </Link>

      {/* ── Setup Past Payments Banner ────────────────── */}
      {showSetupBanner && (
        <SetupPastPayments
          debtId={debtId}
          currency={debt.currency}
          schedule={schedule}
          linkedAccountId={debt.linked_account_id}
          accountOpenedAt={linkedAccount?.opened_at ?? null}
          accountName={linkedAccount?.name}
          onComplete={dismissSetup}
          onSkip={dismissSetup}
        />
      )}

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
          <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <DeleteConfirmation
            itemName={debt.name}
            onConfirm={() => {
              deleteMutation.mutate(debtId, {
                onSuccess: () => router.push("/debts"),
              });
            }}
            isPending={deleteMutation.isPending}
            trigger={
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            }
          />
        </div>
      </div>

      {/* ── Summary cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <span className="text-xs text-muted-foreground">{tLoan("totalCost")}</span>
          </CardHeader>
          <CardContent>
            <MoneyDisplay
              amount={totalWithInterest}
              currency={debt.currency}
              size="lg"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <span className="text-xs text-muted-foreground">
              {tLoan("monthlyPayment")}
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
            <span className="text-xs text-muted-foreground">{t("totalPaid")}</span>
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
              amount={remainingPayments}
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
        debtType={debt.type}
        linkedAccountId={debt.linked_account_id}
        showMatchSuggestions={!!debt.linked_account_id}
      />

      <BankLoanForm open={editOpen} onOpenChange={setEditOpen} initialData={debt} />

      {/* ── Amortization schedule ─────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("amortizationSchedule")}</h2>

        {scheduleLoading ? (
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-muted" />
            ))}
          </div>
        ) : schedule.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("noSchedule")}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-start font-medium">#</th>
                  <th className="px-3 py-2 text-start font-medium">{t("date")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("payment")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("principal")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("interest")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("remainingAmount")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("status")}</th>
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
