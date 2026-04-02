"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  ChevronDown,
  Calendar,
  CreditCard,
} from "lucide-react";
import { useDebts } from "@/hooks/use-debts";
import { usePersons } from "@/hooks/use-persons";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { StatusBadge } from "@/components/debts/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatAmount, formatAmountAr, CURRENCIES } from "@/lib/money";

interface DebtResponse {
  id: number;
  type: "bank_loan" | "personal_lent" | "personal_borrowed";
  person_id: number | null;
  name: string;
  institution: string | null;
  principal_minor: number;
  currency: string;
  annual_rate_bps: number;
  tenure_months: number;
  start_date: string;
  monthly_payment_minor: number;
  repayment_mode: "lump_sum" | "equal_splits" | "custom_splits" | null;
  due_date: string | null;
  status: "active" | "paid_off";
  notes: string | null;
  is_active: boolean;
  total_paid_minor: number;
  remaining_minor: number;
}

interface PersonResponse {
  id: number;
  name: string;
  name_ar: string | null;
  phone: string | null;
  email: string | null;
  relationship:
    | "family"
    | "friend"
    | "colleague"
    | "business"
    | "other"
    | null;
  notes: string | null;
  is_active: boolean;
  balances: {
    by_currency: Record<string, number>;
    total_base_minor: number;
    base_currency: string;
    fx_warnings: string[];
  } | null;
}

interface PersonGroup {
  person: PersonResponse | undefined;
  personId: number;
  lent: DebtResponse[];
  borrowed: DebtResponse[];
  netRemaining: number;
  defaultCurrency: string;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const STATUS_MAP: Record<string, "active" | "completed"> = {
  active: "active",
  paid_off: "completed",
};

export function P2PTab() {
  const t = useTranslations();
  const locale = useLocale();
  const [expandedPersonId, setExpandedPersonId] = useState<number | null>(null);

  const {
    data: lentData,
    isLoading: lentLoading,
    error: lentError,
  } = useDebts({ type: "personal_lent" });
  const {
    data: borrowedData,
    isLoading: borrowedLoading,
    error: borrowedError,
  } = useDebts({ type: "personal_borrowed" });
  const {
    data: personsData,
    isLoading: personsLoading,
    error: personsError,
  } = usePersons();

  const isLoading = lentLoading || borrowedLoading || personsLoading;
  const error = lentError || borrowedError || personsError;

  const fmt = (minor: number, currency: string) =>
    locale === "ar"
      ? `${formatAmountAr(minor, currency)} ${CURRENCIES[currency]?.symbol ?? currency}`
      : `${formatAmount(minor, currency)} ${CURRENCIES[currency]?.symbol ?? currency}`;

  const { personGroups, totalLent, totalBorrowed, summaryCurrency } =
    useMemo(() => {
      const lent = (lentData?.data ?? []) as DebtResponse[];
      const borrowed = (borrowedData?.data ?? []) as DebtResponse[];
      const persons = (personsData?.data ?? []) as PersonResponse[];
      const personLookup = new Map(persons.map((p) => [p.id, p]));

      const personMap = new Map<
        number,
        { lent: DebtResponse[]; borrowed: DebtResponse[] }
      >();
      for (const debt of lent) {
        if (debt.person_id == null) continue;
        if (!personMap.has(debt.person_id))
          personMap.set(debt.person_id, { lent: [], borrowed: [] });
        personMap.get(debt.person_id)!.lent.push(debt);
      }
      for (const debt of borrowed) {
        if (debt.person_id == null) continue;
        if (!personMap.has(debt.person_id))
          personMap.set(debt.person_id, { lent: [], borrowed: [] });
        personMap.get(debt.person_id)!.borrowed.push(debt);
      }

      const groups: PersonGroup[] = [];
      for (const [personId, debts] of personMap) {
        const person = personLookup.get(personId);
        const lentSum = debts.lent.reduce((s, d) => s + d.remaining_minor, 0);
        const borrowedSum = debts.borrowed.reduce(
          (s, d) => s + d.remaining_minor,
          0,
        );
        const firstDebt = debts.lent[0] ?? debts.borrowed[0];
        groups.push({
          person,
          personId,
          lent: debts.lent,
          borrowed: debts.borrowed,
          netRemaining: lentSum - borrowedSum,
          defaultCurrency: firstDebt?.currency ?? "EGP",
        });
      }

      groups.sort((a, b) => Math.abs(b.netRemaining) - Math.abs(a.netRemaining));

      const tLent = lent.reduce((s, d) => s + d.remaining_minor, 0);
      const tBorrowed = borrowed.reduce((s, d) => s + d.remaining_minor, 0);
      const allDebts = [...lent, ...borrowed];
      const sCurrency = allDebts[0]?.currency ?? "EGP";

      return {
        personGroups: groups,
        totalLent: tLent,
        totalBorrowed: tBorrowed,
        summaryCurrency: sCurrency,
      };
    }, [lentData, borrowedData, personsData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
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

  if (personGroups.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("emptyStates.p2p.title")}
        description={t("emptyStates.p2p.description")}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          icon={ArrowUpRight}
          label={t("debts.p2p.lent")}
          value={fmt(totalLent, summaryCurrency)}
        />
        <StatCard
          icon={ArrowDownLeft}
          label={t("debts.p2p.borrowed")}
          value={fmt(totalBorrowed, summaryCurrency)}
        />
      </div>

      {/* Person Cards */}
      <div className="space-y-3">
        {personGroups.map((group) => (
          <PersonDebtCard
            key={group.personId}
            group={group}
            expanded={expandedPersonId === group.personId}
            onToggle={() =>
              setExpandedPersonId(
                expandedPersonId === group.personId ? null : group.personId,
              )
            }
            t={t}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PersonDebtCard                                                     */
/* ------------------------------------------------------------------ */

interface PersonDebtCardProps {
  group: PersonGroup;
  expanded: boolean;
  onToggle: () => void;
  t: ReturnType<typeof useTranslations>;
  locale: string;
}

function PersonDebtCard({
  group,
  expanded,
  onToggle,
  t,
  locale,
}: PersonDebtCardProps) {
  const { person, lent, borrowed, netRemaining, defaultCurrency } = group;
  const displayName =
    locale === "ar" && person?.name_ar ? person.name_ar : (person?.name ?? `Person #${group.personId}`);

  const balances = person?.balances;
  const netCurrency = balances?.base_currency ?? defaultCurrency;

  return (
    <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-4 text-start transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Avatar size="default">
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">
              {displayName}
            </p>
            {person?.relationship && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-muted text-muted-foreground">
                {t(`persons.relationships.${person.relationship}`)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <MoneyDisplay
            amount={netRemaining}
            currency={netCurrency}
            colorize
            size="sm"
            showCurrency
          />
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
          {/* Per-currency balance breakdown */}
          {balances && Object.keys(balances.by_currency).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("debts.p2p.netOwed")}
              </p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(balances.by_currency).map(
                  ([currency, amount]) => (
                    <div
                      key={currency}
                      className="flex items-center gap-1.5 rounded-lg bg-muted/60 px-3 py-1.5"
                    >
                      <span className="text-xs text-muted-foreground">
                        {currency}:
                      </span>
                      <MoneyDisplay
                        amount={amount}
                        currency={currency}
                        colorize
                        size="sm"
                        showCurrency={false}
                      />
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Lent debts */}
          {lent.length > 0 && (
            <DebtSection
              title={t("debts.p2p.lent")}
              debts={lent}
              icon={ArrowUpRight}
              iconClass="text-emerald-500"
              locale={locale}
            />
          )}

          {/* Borrowed debts */}
          {borrowed.length > 0 && (
            <DebtSection
              title={t("debts.p2p.borrowed")}
              debts={borrowed}
              icon={ArrowDownLeft}
              iconClass="text-rose-500"
              locale={locale}
            />
          )}

          {/* Record Payment button */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <CreditCard className="h-4 w-4" />
            {t("debts.actions.recordPayment")}
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DebtSection                                                        */
/* ------------------------------------------------------------------ */

interface DebtSectionProps {
  title: string;
  debts: DebtResponse[];
  icon: typeof ArrowUpRight;
  iconClass: string;
  locale: string;
}

function DebtSection({
  title,
  debts,
  icon: Icon,
  iconClass,
  locale,
}: DebtSectionProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      <div className="space-y-1.5">
        {debts.map((debt) => (
          <div
            key={debt.id}
            className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2"
          >
            <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {debt.name}
            </span>
            <MoneyDisplay
              amount={debt.remaining_minor}
              currency={debt.currency}
              size="sm"
              showCurrency
            />
            <StatusBadge status={STATUS_MAP[debt.status] ?? "active"} />
            {debt.due_date && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(debt.due_date).toLocaleDateString(
                  locale === "ar" ? "ar-EG" : "en-US",
                  { month: "short", day: "numeric" },
                )}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
