"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Landmark, Building2, CheckCircle2, ChevronDown, Plus } from "lucide-react";
import { BankLoanForm } from "@/components/debts/bank-loan-form";
import { useDebts, useAmortizationSchedule } from "@/hooks/use-debts";
import { EmptyState } from "@/components/shared/empty-state";
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

export function LoansTab() {
  const t = useTranslations();
  const tLoan = useTranslations("debts.loan");
  const tDetail = useTranslations("debts.detail");
  const tInstallment = useTranslations("debts.installment");
  const locale = useLocale();
  const { data, isLoading, error } = useDebts({ type: "bank_loan" });
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

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
      <EmptyState
        icon={Landmark}
        title={t("emptyStates.debts.title")}
        description={t("emptyStates.debts.description")}
        action={{ label: t("debts.actions.addLoan"), onClick: () => setShowCreateForm(true) }}
      />
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
          value={t("debts.summary.activeLoans", { count: active.length })}          trend={{
            direction: "flat",
            text: `${t("debts.summary.totalRemaining")}: ${fmt(active.reduce((s, l) => s + l.remaining_minor, 0))}`,
          }}
        />
      </div>

      {/* Add Loan Button */}
      <button
        type="button"
        onClick={() => setShowCreateForm(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        {t("debts.actions.addLoan")}
      </button>

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
    </div>
  );
}

/* ── Loan Card (inline sub-component) ── */
function LoanCard({
  loan,
  expanded,
  onToggle,
  locale,
}: {
  loan: DebtResponse;
  expanded: boolean;
  onToggle: () => void;
  locale: string;
}) {
  const tLoan = useTranslations("debts.loan");
  const tDetail = useTranslations("debts.detail");
  const progressPct =
    loan.principal_minor > 0
      ? Math.round(
          ((loan.principal_minor - loan.remaining_minor) /
            loan.principal_minor) *
            100,
        )
      : 0;

  const aprFormatted = (loan.annual_rate_bps / 100).toFixed(2);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(
      locale === "ar" ? "ar-EG" : "en-US",
      { year: "numeric", month: "short" },
    );

  return (
    <div
      className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <div className="p-6">
        {/* Top row: name + badges | monthly payment */}
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
          <div className="text-end">
            <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">
              {tLoan("monthlyPayment")}
            </p>
            <MoneyDisplay
              amount={loan.monthly_payment_minor}
              currency={loan.currency}
              size="md"
              className="font-bold text-primary"
            />
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
                amount={loan.remaining_minor}
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
          <div className="space-y-4">
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
                  {tLoan("monthlyPayment")}
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
                  amount={loan.remaining_minor}
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

            {/* Amortization preview */}
            <AmortizationPreview
              loanId={loan.id}
              locale={locale}
              currency={loan.currency}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Amortization Preview (inline sub-component) ── */
function AmortizationPreview({
  loanId,
  locale,
  currency,
}: {
  loanId: number;
  locale: string;
  currency: string;
}) {
  const tLoan = useTranslations("debts.loan");
  const tDetail = useTranslations("debts.detail");
  const { data, isLoading } = useAmortizationSchedule(loanId);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(
      locale === "ar" ? "ar-EG" : "en-US",
      { year: "numeric", month: "short" },
    );

  return (
    <div className="border-t border-border pt-4">
      <h5 className="text-xs font-bold text-muted-foreground uppercase mb-3">
        {tLoan("amortization")}
      </h5>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-8 rounded bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-start pb-2 font-bold">#</th>
                  <th className="text-start pb-2 font-bold">{tDetail("date")}</th>
                  <th className="text-end pb-2 font-bold">{tDetail("amount")}</th>
                  <th className="text-end pb-2 font-bold">{tDetail("status")}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.data?.schedule ?? []).slice(0, 3).map((row) => (
                  <tr
                    key={row.payment_number}
                    className="border-b border-border/50"
                  >
                    <td className="py-2 text-foreground">
                      {row.payment_number}
                    </td>
                    <td className="py-2 text-foreground">
                      {formatDate(row.date)}
                    </td>
                    <td className="py-2 text-end">
                      <MoneyDisplay
                        amount={row.payment_minor}
                        currency={currency}
                        size="sm"
                      />
                    </td>
                    <td className="py-2 text-end">
                      <StatusBadge
                        status={SCHEDULE_STATUS_MAP[row.status]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(data?.data?.schedule?.length ?? 0) > 3 && (
            <p className="text-xs text-primary font-semibold mt-3 cursor-pointer hover:underline">
              {tDetail("viewFullSchedule")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
