"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Landmark, Building2, CheckCircle2, ChevronDown, ChevronUp, Pencil, Trash2, ArrowRight, CreditCard, Sparkles } from "lucide-react";
import { BankLoanForm } from "@/components/debts/bank-loan-form";
import { RecordPaymentForm } from "@/components/debts/record-payment-form";
import { useDebts, useAmortizationSchedule, useMatchSuggestions, useDebtPayments, useDeleteDebt } from "@/hooks/use-debts";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatCard } from "@/components/shared/stat-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { ProgressBar } from "@/components/shared/progress-bar";
import { StatusBadge } from "@/components/debts/status-badge";
import { formatAmount, formatAmountAr, CURRENCIES } from "@/lib/money";
import type { DebtResponse, ScheduleRowStatus } from "@/lib/types/debts";

const SCHEDULE_STATUS_MAP: Record<
  ScheduleRowStatus,
  "completed" | "overdue" | "pending"
> = {
  paid: "completed",
  overdue: "overdue",
  upcoming: "pending",
};

interface LoansTabProps {
  onAddClick?: () => void;
}

export function LoansTab({ onAddClick }: LoansTabProps) {
  const t = useTranslations();
  const tLoan = useTranslations("debts.loan");
  const tInstallment = useTranslations("debts.installment");
  const locale = useLocale();
  const { data, isLoading, error } = useDebts({ type: "bank_loan" });
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState<DebtResponse | null>(null);
  const deleteMutation = useDeleteDebt();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">
        {t("error.title")}: {error.message}
      </p>
    );
  }

  const loans = data?.data ?? [];

  if (loans.length === 0) {
    return (
      <>
        <EmptyState
          icon={Landmark}
          title={t("emptyStates.debts.title")}
          description={t("emptyStates.debts.description")}
          action={{ label: t("debts.actions.addLoan"), onClick: () => setShowCreateForm(true) }}
        />
        <BankLoanForm open={showCreateForm} onOpenChange={setShowCreateForm} />
      </>
    );
  }

  const active = loans.filter((l) => l.status === "active");
  const completed = loans.filter((l) => l.status === "paid_off");
  const baseCurrency = loans[0]?.currency ?? "EGP";

  const totalMonthly = active.reduce(
    (s, l) => s + l.monthly_payment_minor,
    0,
  );
  const fmt = (minor: number) =>
    locale === "ar"
      ? `${formatAmountAr(minor, baseCurrency)} ${CURRENCIES[baseCurrency]?.symbol ?? baseCurrency}`
      : `${formatAmount(minor, baseCurrency)} ${CURRENCIES[baseCurrency]?.symbol ?? baseCurrency}`;

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          icon={Landmark}
          label={t("debts.summary.monthlyPayments")}
          value={fmt(totalMonthly)}
        />
        <StatCard
          icon={Building2}
          label={tLoan("activeLoans")}
          value={t("debts.summary.activeLoans", { count: active.length })}
          trend={{
            direction: "flat",
            text: `${t("debts.summary.totalRemaining")}: ${fmt(active.reduce((s, l) => s + l.remaining_minor, 0))}`,
          }}
        />
      </div>

      {/* Active Loans */}
      {active.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {t("debts.status.active")} {t("debts.tabs.loans")}
          </h3>
          <div className="space-y-4">
            {active.map((loan) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                expanded={expandedId === loan.id}
                onToggle={() =>
                  setExpandedId(expandedId === loan.id ? null : loan.id)
                }
                onEdit={() => setEditingLoan(loan)}
                onDelete={() => deleteMutation.mutate(loan.id)}
                isDeleting={deleteMutation.isPending}
                locale={locale}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed Section */}
      {completed.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full flex items-center justify-between p-4 bg-muted/50 rounded-xl text-foreground hover:bg-muted transition-colors"
          >
            <span className="font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              {tLoan("completedLoans")} ({completed.length})
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                showCompleted ? "rotate-180" : ""
              }`}
            />
          </button>
          {showCompleted && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {completed.map((loan) => (
                <div
                  key={loan.id}
                  className="p-4 bg-card/60 border border-border rounded-xl flex justify-between items-center opacity-70"
                >
                  <div>
                    <h5 className="text-sm font-bold text-muted-foreground">
                      {loan.name}
                    </h5>
                    <p className="text-xs text-muted-foreground/60">
                      {loan.institution && (
                        <span className="me-2">{loan.institution}</span>
                      )}
                      <MoneyDisplay
                        amount={loan.total_paid_minor}
                        currency={loan.currency}
                        size="sm"
                        showCurrency
                      />{" "}
                      {tInstallment("totalPaid")}
                    </p>
                  </div>
                  <StatusBadge status="completed" />
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      <BankLoanForm open={showCreateForm} onOpenChange={setShowCreateForm} />
      {editingLoan && (
        <BankLoanForm
          open={!!editingLoan}
          onOpenChange={(open) => { if (!open) setEditingLoan(null); }}
          initialData={editingLoan}
        />
      )}
    </div>
  );
}

/* ── Loan Card (inline sub-component) ── */
function LoanCard({
  loan,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  isDeleting,
  locale,
}: {
  loan: DebtResponse;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  locale: string;
}) {
  const tLoan = useTranslations("debts.loan");
  const tDetail = useTranslations("debts.detail");
  const tFreq = useTranslations("debts.frequency");
  const tDeleteDialog = useTranslations("debts.actions.deleteDialog");
  const router = useRouter();
  const totalWithInterest = loan.tenure_months * loan.monthly_payment_minor;
  const progressPct =
    totalWithInterest > 0
      ? Math.min(100, Math.round((loan.total_paid_minor / totalWithInterest) * 100))
      : 0;
  const remainingPayments = Math.max(0, totalWithInterest - loan.total_paid_minor);

  const aprFormatted = (loan.annual_rate_bps / 100).toFixed(2);

  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentPrefill, setPaymentPrefill] = useState<{
    amount: number;
    date: string;
    installmentNumber: number;
  } | null>(null);

  const { data: paymentsRes } = useDebtPayments(loan.id);
  const paymentCount = paymentsRes?.data?.length ?? 0;

  const paymentLabel = tFreq(`paymentLabel.${loan.payment_frequency || "monthly"}`);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(
      locale === "ar" ? "ar-EG" : "en-US",
      { year: "numeric", month: "short" },
    );

  const handleRecordPayment = (prefill: {
    amount: number;
    date: string;
    installmentNumber: number;
  }) => {
    setPaymentPrefill(prefill);
    setPaymentFormOpen(true);
  };

  const handleCardClick = () => {
    if (!expanded) {
      router.push(`/debts/loans/${loan.id}`);
    }
  };

  return (
    <>
      <div
        className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
      >
        <div className="p-6">
          {/* Top row: name + badges | payment amount + expand chevron */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-foreground">{loan.name}</h4>
                <StatusBadge status="active" />
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
                  {aprFormatted}% APR
                </span>
              </div>
              {loan.institution && (
                <p className="text-xs text-muted-foreground">
                  {loan.institution}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-end">
                <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">
                  {paymentLabel}
                </p>
                <MoneyDisplay
                  amount={loan.monthly_payment_minor}
                  currency={loan.currency}
                  size="md"
                  className="font-bold text-primary"
                />
              </div>
              <button
                type="button"
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                aria-label={expanded ? "Collapse" : "Expand"}
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          {/* Collapsed: remaining + progress */}
          {!expanded && (
            <>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-muted-foreground">
                  {tLoan("remaining")}
                </span>
                <MoneyDisplay
                  amount={remainingPayments}
                  currency={loan.currency}
                  size="sm"
                  className="font-semibold"
                  showCurrency
                />
              </div>
              <ProgressBar
                value={progressPct}
                showLabel
                colorClass="bg-primary"
              />
            </>
          )}

          {/* Expanded */}
          {expanded && (
            <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
              {/* Info grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">
                    {tLoan("principal")}
                  </p>
                  <MoneyDisplay
                    amount={loan.principal_minor}
                    currency={loan.currency}
                    size="sm"
                    className="font-semibold"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">
                    {paymentLabel}
                  </p>
                  <MoneyDisplay
                    amount={loan.monthly_payment_minor}
                    currency={loan.currency}
                    size="sm"
                    className="font-semibold"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">
                    {tLoan("startDate")}
                  </p>
                  <span className="text-sm font-semibold text-foreground">
                    {formatDate(loan.start_date)}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">
                    {tLoan("tenureLabel")}
                  </p>
                  <span className="text-sm font-semibold text-foreground">
                    {tLoan("tenure", { months: loan.tenure_months })}
                  </span>
                </div>
              </div>

              {/* Progress with label */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-muted-foreground">
                    {tDetail("paidPercent", { percent: progressPct })}
                  </span>
                  <MoneyDisplay
                    amount={remainingPayments}
                    currency={loan.currency}
                    size="sm"
                    className="text-xs text-muted-foreground"
                    showCurrency
                  />
                </div>
                <ProgressBar
                  value={progressPct}
                  showLabel={false}
                  colorClass="bg-primary"
                />
              </div>

              {/* Next payment preview */}
              <NextPaymentPreview
                loanId={loan.id}
                debtId={loan.id}
                locale={locale}
                currency={loan.currency}
                linkedAccountId={loan.linked_account_id}
                onRecordPayment={handleRecordPayment}
              />

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                >
                  <Pencil className="h-3.5 w-3.5 me-1.5" />
                  {tDetail("edit")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 me-1.5" />
                  {tDetail("delete")}
                </Button>
                <Link
                  href={`/debts/loans/${loan.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors ms-auto"
                >
                  {tLoan("viewFullDetails")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Dialog (Bug 4) */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tDeleteDialog("title", { name: loan.name })}</AlertDialogTitle>
            <AlertDialogDescription>
              {paymentCount > 0
                ? tDeleteDialog("hasPayments", { count: paymentCount })
                : tDeleteDialog("noPayments")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {paymentCount > 0 && (
            <p className="text-xs text-muted-foreground">{tDeleteDialog("deleteOnlyHint")}</p>
          )}
          <div className="flex flex-col gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                onDelete();
                setDeleteDialogOpen(false);
              }}
              disabled={isDeleting}
            >
              {tDeleteDialog("deleteOnly")}
            </Button>
            <Button
              variant="outline"
              disabled
              title={tDeleteDialog("comingSoon")}
              className="opacity-50"
            >
              {tDeleteDialog("deleteWithTransactions")} ({tDeleteDialog("comingSoon")})
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{tDeleteDialog("cancel")}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Record Payment Form */}
      <RecordPaymentForm
        open={paymentFormOpen}
        onOpenChange={setPaymentFormOpen}
        debtId={loan.id}
        currency={loan.currency}
        linkedAccountId={loan.linked_account_id}
        showMatchSuggestions={!!loan.linked_account_id}
      />
    </>
  );
}

/* ── Next Payment Preview (inline sub-component) ── */
function NextPaymentPreview({
  loanId,
  debtId,
  locale,
  currency,
  linkedAccountId,
  onRecordPayment,
}: {
  loanId: number;
  debtId: number;
  locale: string;
  currency: string;
  linkedAccountId: number | null;
  onRecordPayment: (prefill: {
    amount: number;
    date: string;
    installmentNumber: number;
  }) => void;
}) {
  const tLoan = useTranslations("debts.loan");
  const tActions = useTranslations("debts.actions");
  const { data: scheduleData, isLoading } = useAmortizationSchedule(loanId);
  const schedule = scheduleData?.data ?? [];
  const nextPayment = schedule.find((row) => row.status !== "paid");

  const { data: matchData } = useMatchSuggestions(
    linkedAccountId ? loanId : 0
  );
  const suggestions = matchData?.data ?? [];
  const hasMatch = suggestions.length > 0;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(
      locale === "ar" ? "ar-EG" : "en-US",
      { year: "numeric", month: "short", day: "numeric" },
    );

  if (isLoading) {
    return (
      <div className="border-t border-border pt-4">
        <div className="h-20 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  if (!nextPayment) {
    return (
      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-semibold text-muted-foreground">
            {tLoan("noUpcoming")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-4" onClick={(e) => e.stopPropagation()}>
      <h5 className="text-xs font-bold text-muted-foreground uppercase mb-3">
        {tLoan("nextPayment")}
      </h5>

      <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
        {/* Payment number + date + status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">
            #{nextPayment.payment_number} — {formatDate(nextPayment.date)}
          </span>
          <StatusBadge
            status={SCHEDULE_STATUS_MAP[nextPayment.status]}
          />
        </div>

        {/* Amount + breakdown */}
        <div>
          <MoneyDisplay
            amount={nextPayment.payment_minor}
            currency={currency}
            size="lg"
            className="font-bold text-foreground"
            showCurrency
          />
          <p className="text-xs text-muted-foreground mt-0.5">
            {tLoan("principalBreakdown", {
              principal: (locale === "ar"
                ? formatAmountAr(nextPayment.principal_minor, currency)
                : formatAmount(nextPayment.principal_minor, currency)) +
                " " +
                (CURRENCIES[currency]?.symbol ?? currency),
              interest: (locale === "ar"
                ? formatAmountAr(nextPayment.interest_minor, currency)
                : formatAmount(nextPayment.interest_minor, currency)) +
                " " +
                (CURRENCIES[currency]?.symbol ?? currency),
            })}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={() =>
              onRecordPayment({
                amount: nextPayment.payment_minor,
                date: nextPayment.date,
                installmentNumber: nextPayment.payment_number,
              })
            }
          >
            <CreditCard className="h-3.5 w-3.5 me-1.5" />
            {tActions("recordPayment")}
          </Button>
          {hasMatch && (
            <Button
              variant="outline"
              size="sm"
              className="text-emerald-600 dark:text-emerald-400 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
              onClick={() =>
                onRecordPayment({
                  amount: nextPayment.payment_minor,
                  date: nextPayment.date,
                  installmentNumber: nextPayment.payment_number,
                })
              }
            >
              <Sparkles className="h-3.5 w-3.5 me-1.5" />
              {tLoan("matchFound")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
