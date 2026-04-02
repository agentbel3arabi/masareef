
## Wave 3: Installments Tabs

### Task 7: InstallmentPlanRow Shared Component

**Files:**
- Create: `frontend/src/components/debts/installment-plan-row.tsx`

- [ ] **Step 1: Create InstallmentPlanRow component**

```typescript
// frontend/src/components/debts/installment-plan-row.tsx
"use client";

import { useTranslations } from "next-intl";
import { MoneyDisplay } from "@/components/shared/money-display";
import { ProgressBar } from "@/components/shared/progress-bar";
import { StatusBadge } from "@/components/debts/status-badge";
import type { InstallmentResponse } from "@/lib/types/debts";

interface InstallmentPlanRowProps {
  plan: InstallmentResponse;
  showAccentBorder?: boolean;
  onClick?: () => void;
}

export function InstallmentPlanRow({
  plan,
  showAccentBorder = true,
  onClick,
}: InstallmentPlanRowProps) {
  const t = useTranslations("debts.installment");

  const progressPct =
    plan.total_months > 0
      ? Math.round((plan.months_paid / plan.total_months) * 100)
      : 0;

  return (
    <div
      className={`bg-muted/30 p-5 rounded-lg grid grid-cols-1 md:grid-cols-5 gap-4 items-center ${
        showAccentBorder ? "border-s-4 border-s-primary" : ""
      } ${onClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      {/* Product / Name */}
      <div className="md:col-span-1">
        <p className="font-bold text-foreground">{plan.name}</p>
        {plan.merchant_name && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {plan.merchant_name}
          </p>
        )}
        <StatusBadge
          status={plan.status === "active" ? "active" : "completed"}
          className="mt-1"
        />
      </div>

      {/* Monthly + Total */}
      <div>
        <p className="text-[10px] text-muted-foreground font-medium uppercase mb-0.5">
          {t("monthlyAmount")}
        </p>
        <MoneyDisplay
          amount={plan.monthly_amount_minor}
          currency={plan.currency}
          size="sm"
          className="font-bold"
        />
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {t("totalAmount")}:{" "}
          <MoneyDisplay
            amount={plan.total_amount_minor}
            currency={plan.currency}
            size="sm"
            showCurrency={false}
          />
        </p>
      </div>

      {/* Progress */}
      <div className="md:col-span-2">
        <div className="flex justify-between items-end mb-1">
          <p className="text-[10px] text-muted-foreground font-medium uppercase">
            Progress
          </p>
          <p className="text-[10px] font-bold text-primary">
            {t("months", { paid: plan.months_paid, total: plan.total_months })}
          </p>
        </div>
        <ProgressBar value={progressPct} colorClass="bg-primary" size="sm" />
      </div>

      {/* Remaining */}
      <div className="text-end">
        <p className="text-[10px] text-muted-foreground font-medium uppercase mb-0.5">
          Remaining
        </p>
        <MoneyDisplay
          amount={plan.remaining_minor}
          currency={plan.currency}
          size="sm"
          className="font-bold"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/debts/installment-plan-row.tsx
git commit -m "feat(debts): add InstallmentPlanRow shared component"
```

---

### Task 8: CardUtilizationSummary + Rewrite CardInstallmentsTab

**Files:**
- Create: `frontend/src/components/debts/card-utilization-summary.tsx`
- Rewrite: `frontend/src/components/debts/card-installments-tab.tsx`

- [ ] **Step 1: Create CardUtilizationSummary component**

```typescript
// frontend/src/components/debts/card-utilization-summary.tsx
"use client";

import { useTranslations } from "next-intl";
import { CreditCard } from "lucide-react";
import { MoneyDisplay } from "@/components/shared/money-display";
import { cn } from "@/lib/utils";
import type { Account } from "@/hooks/use-accounts";
import type { InstallmentResponse } from "@/lib/types/debts";

interface CardUtilizationSummaryProps {
  account: Account;
  plans: InstallmentResponse[];
}

export function CardUtilizationSummary({
  account,
  plans,
}: CardUtilizationSummaryProps) {
  const t = useTranslations("debts.financingApps");

  const totalCommitted = plans.reduce(
    (sum, p) => sum + p.remaining_minor,
    0
  );
  const monthlyCommitment = plans.reduce(
    (sum, p) => (p.status === "active" ? sum + p.monthly_amount_minor : sum),
    0
  );
  const creditLimit = account.credit_limit ?? 0;
  const utilPct =
    creditLimit > 0
      ? Math.min(100, Math.round((totalCommitted / creditLimit) * 100))
      : 0;

  const ringColor =
    utilPct < 50
      ? "text-green-500"
      : utilPct < 80
        ? "text-amber-500"
        : "text-red-500";

  const utilLabel =
    utilPct < 50
      ? "Healthy"
      : utilPct < 80
        ? "Moderate"
        : "High";

  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (utilPct / 100) * circumference;

  return (
    <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{account.name}</h3>
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                utilPct >= 80
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : utilPct >= 50
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              )}
            >
              {utilLabel}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">
              {t("monthlyCommitment")}
            </p>
            <MoneyDisplay
              amount={monthlyCommitment}
              currency={account.currency}
              size="md"
              className="font-bold"
            />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">
              Committed
            </p>
            <MoneyDisplay
              amount={totalCommitted}
              currency={account.currency}
              size="md"
              className="font-bold"
            />
          </div>
        </div>
        <div className="pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground">
            {t("creditLimit")}:{" "}
            <MoneyDisplay
              amount={creditLimit}
              currency={account.currency}
              size="sm"
              showCurrency
            />
          </p>
        </div>
      </div>

      {/* Circular Progress */}
      <div className="relative flex flex-col items-center">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle
            className="text-muted"
            cx="48"
            cy="48"
            r="40"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="8"
          />
          <circle
            className={ringColor}
            cx="48"
            cy="48"
            r="40"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{utilPct}%</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite CardInstallmentsTab**

```typescript
// frontend/src/components/debts/card-installments-tab.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CreditCard } from "lucide-react";
import { useInstallments } from "@/hooks/use-installments";
import { useAccounts } from "@/hooks/use-accounts";
import { EmptyState } from "@/components/shared/empty-state";
import { CardUtilizationSummary } from "@/components/debts/card-utilization-summary";
import { InstallmentPlanRow } from "@/components/debts/installment-plan-row";
import { InstallmentForm } from "@/components/debts/installment-form";
import type { InstallmentResponse } from "@/lib/types/debts";

export function CardInstallmentsTab() {
  const t = useTranslations();
  const { data, isLoading, error } = useInstallments({ type: "credit_card" });
  const { data: accountsResponse } = useAccounts();
  const accounts = accountsResponse?.data ?? [];
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
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

  const plans = data?.data ?? [];

  if (plans.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title={t("emptyStates.installments.title")}
        description={t("emptyStates.installments.description")}
        action={{
          label: t("debts.actions.addInstallment"),
          onClick: () => setShowCreateForm(true),
        }}
      />
    );
  }

  // Group plans by source_account_id
  const creditCards = accounts.filter((a) => a.type === "credit_card");
  const grouped = new Map<number, InstallmentResponse[]>();
  for (const plan of plans) {
    const key = plan.source_account_id ?? 0;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(plan);
  }

  return (
    <div className="space-y-8">
      {/* Utilization Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {creditCards
          .filter((card) => grouped.has(card.id))
          .map((card) => (
            <CardUtilizationSummary
              key={card.id}
              account={card}
              plans={grouped.get(card.id) ?? []}
            />
          ))}
      </div>

      {/* Plans Grouped by Card */}
      <div className="space-y-8">
        {creditCards
          .filter((card) => grouped.has(card.id))
          .map((card) => {
            const cardPlans = grouped.get(card.id) ?? [];
            return (
              <section key={card.id}>
                <div className="flex items-center gap-2 mb-4">
                  <h4 className="text-base font-bold text-foreground">
                    {card.name}
                  </h4>
                  <span className="text-sm text-muted-foreground">
                    — {cardPlans.filter((p) => p.status === "active").length}{" "}
                    active plans
                  </span>
                </div>
                <div className="space-y-3">
                  {cardPlans.map((plan) => (
                    <InstallmentPlanRow key={plan.id} plan={plan} />
                  ))}
                </div>
              </section>
            );
          })}

        {/* Plans without a source account */}
        {grouped.has(0) && (
          <section>
            <h4 className="text-base font-bold text-foreground mb-4">
              Unlinked Plans
            </h4>
            <div className="space-y-3">
              {grouped.get(0)!.map((plan) => (
                <InstallmentPlanRow key={plan.id} plan={plan} />
              ))}
            </div>
          </section>
        )}
      </div>

      <InstallmentForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        defaultType="credit_card"
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && pnpm exec tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/debts/card-utilization-summary.tsx frontend/src/components/debts/card-installments-tab.tsx
git commit -m "feat(debts): rewrite CardInstallmentsTab with utilization summaries and grouped plans"
```

---

### Task 9: Rewrite StoreInstallmentsTab

**Files:**
- Rewrite: `frontend/src/components/debts/store-installments-tab.tsx`

- [ ] **Step 1: Rewrite StoreInstallmentsTab**

```typescript
// frontend/src/components/debts/store-installments-tab.tsx
"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Store, ShoppingBag, CheckCircle2, ChevronDown } from "lucide-react";
import { useInstallments } from "@/hooks/use-installments";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { ProgressBar } from "@/components/shared/progress-bar";
import { StatusBadge } from "@/components/debts/status-badge";
import { InstallmentForm } from "@/components/debts/installment-form";
import { formatAmount, formatAmountAr, CURRENCIES } from "@/lib/money";
import type { InstallmentResponse } from "@/lib/types/debts";

export function StoreInstallmentsTab() {
  const t = useTranslations();
  const locale = useLocale();
  const { data, isLoading, error } = useInstallments({ type: "store" });
  const [showCompleted, setShowCompleted] = useState(false);
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

  const plans = data?.data ?? [];

  if (plans.length === 0) {
    return (
      <EmptyState
        icon={Store}
        title={t("emptyStates.installments.title")}
        description={t("emptyStates.installments.description")}
        action={{
          label: t("debts.actions.addInstallment"),
          onClick: () => setShowCreateForm(true),
        }}
      />
    );
  }

  const active = plans.filter((p) => p.status === "active");
  const completed = plans.filter((p) => p.status === "completed");
  const baseCurrency = plans[0]?.currency ?? "EGP";

  const totalMonthly = active.reduce((s, p) => s + p.monthly_amount_minor, 0);
  const fmt = (minor: number) =>
    locale === "ar"
      ? `${formatAmountAr(minor, baseCurrency)} ${CURRENCIES[baseCurrency]?.symbol ?? baseCurrency}`
      : `${formatAmount(minor, baseCurrency)} ${CURRENCIES[baseCurrency]?.symbol ?? baseCurrency}`;

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          icon={ShoppingBag}
          label="Monthly Store Payments"
          value={fmt(totalMonthly)}
        />
        <StatCard
          icon={Store}
          label="Active Plans"
          value={`${active.length} Plans`}
          trend={{
            direction: "flat",
            text: `Remaining: ${fmt(active.reduce((s, p) => s + p.remaining_minor, 0))}`,
          }}
        />
      </div>

      {/* Active Plans */}
      {active.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Active Installment Plans
          </h3>
          <div className="space-y-4">
            {active.map((plan) => (
              <StorePlanCard key={plan.id} plan={plan} />
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
              Completed Plans ({completed.length})
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                showCompleted ? "rotate-180" : ""
              }`}
            />
          </button>
          {showCompleted && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {completed.map((plan) => (
                <div
                  key={plan.id}
                  className="p-4 bg-card/60 border border-border rounded-xl flex justify-between items-center opacity-70"
                >
                  <div>
                    <h5 className="text-sm font-bold text-muted-foreground">
                      {plan.merchant_name
                        ? `${plan.merchant_name} — ${plan.name}`
                        : plan.name}
                    </h5>
                    <p className="text-xs text-muted-foreground/60">
                      <MoneyDisplay
                        amount={plan.total_amount_minor}
                        currency={plan.currency}
                        size="sm"
                        showCurrency
                      />{" "}
                      total paid
                    </p>
                  </div>
                  <StatusBadge status="completed" />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <InstallmentForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        defaultType="store"
      />
    </div>
  );
}

/* ── Store Plan Card (inline sub-component) ── */
function StorePlanCard({ plan }: { plan: InstallmentResponse }) {
  const progressPct =
    plan.total_months > 0
      ? Math.round((plan.months_paid / plan.total_months) * 100)
      : 0;

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-foreground">
              {plan.merchant_name
                ? `${plan.merchant_name} — ${plan.name}`
                : plan.name}
            </h4>
            <StatusBadge status="active" />
          </div>
        </div>
        <div className="text-end">
          <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">
            Monthly Payment
          </p>
          <MoneyDisplay
            amount={plan.monthly_amount_minor}
            currency={plan.currency}
            size="md"
            className="font-bold text-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-4">
        <div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">
            Total Amount
          </p>
          <MoneyDisplay
            amount={plan.total_amount_minor}
            currency={plan.currency}
            size="sm"
            className="font-semibold"
          />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">
            Duration
          </p>
          <span className="text-sm font-semibold text-foreground">
            {plan.total_months} Months
          </span>
        </div>
        <div className="text-end">
          <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">
            Remaining
          </p>
          <MoneyDisplay
            amount={plan.remaining_minor}
            currency={plan.currency}
            size="sm"
            className="font-semibold"
          />
        </div>
      </div>

      <ProgressBar value={progressPct} showLabel colorClass="bg-primary" />
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

```bash
cd frontend && pnpm exec tsc --noEmit
git add frontend/src/components/debts/store-installments-tab.tsx
git commit -m "feat(debts): rewrite StoreInstallmentsTab with merchant cards and completed section"
```

---

### Task 10: FinancingAppProviderCard + Rewrite FinancingAppsTab

**Files:**
- Create: `frontend/src/components/debts/financing-app-provider-card.tsx`
- Rewrite: `frontend/src/components/debts/financing-apps-tab.tsx`

- [ ] **Step 1: Create FinancingAppProviderCard**

```typescript
// frontend/src/components/debts/financing-app-provider-card.tsx
"use client";

import { useTranslations } from "next-intl";
import { MoneyDisplay } from "@/components/shared/money-display";
import type { FinancingAppDetail } from "@/lib/types/debts";

interface FinancingAppProviderCardProps {
  app: FinancingAppDetail;
  currency?: string;
}

export function FinancingAppProviderCard({
  app,
  currency = "EGP",
}: FinancingAppProviderCardProps) {
  const t = useTranslations("debts.financingApps");

  const utilPct = Math.round(app.utilization_percent);
  const ringColor =
    utilPct < 50
      ? "text-green-500"
      : utilPct < 80
        ? "text-amber-500"
        : "text-red-500";

  const circumference = 2 * Math.PI * 34;
  const offset = circumference - (utilPct / 100) * circumference;

  const isInactive = app.active_plans_count === 0;

  return (
    <div
      className={`min-w-[300px] bg-card rounded-xl p-6 flex items-start justify-between shadow-sm border ${
        isInactive
          ? "border-dashed border-border opacity-60"
          : "border-border"
      }`}
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">
            {app.name}
            {app.name_ar ? ` (${app.name_ar})` : ""}
          </h3>
          <p className="text-xs text-muted-foreground">
            {app.active_plans_count} {t("activePlans")}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
            {t("monthlyCommitment")}
          </p>
          <MoneyDisplay
            amount={app.monthly_commitment_minor}
            currency={currency}
            size="lg"
          />
        </div>
        <div className="flex gap-4 pt-2">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold">
              {t("used")}
            </p>
            <MoneyDisplay
              amount={app.balance_minor}
              currency={currency}
              size="sm"
              className="font-semibold"
            />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-bold">
              {t("available")}
            </p>
            <MoneyDisplay
              amount={app.available_minor}
              currency={currency}
              size="sm"
              className="font-semibold text-primary"
            />
          </div>
        </div>
      </div>

      {/* Circular utilization ring */}
      <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle
            className="text-muted"
            cx="40"
            cy="40"
            r="34"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="6"
          />
          {utilPct > 0 && (
            <circle
              className={ringColor}
              cx="40"
              cy="40"
              r="34"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          )}
        </svg>
        <span className="absolute text-sm font-bold">{utilPct}%</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite FinancingAppsTab**

```typescript
// frontend/src/components/debts/financing-apps-tab.tsx
"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Smartphone, Receipt } from "lucide-react";
import { useInstallments, useFinancingAppsSummary } from "@/hooks/use-installments";
import { EmptyState } from "@/components/shared/empty-state";
import { MoneyDisplay } from "@/components/shared/money-display";
import { FinancingAppProviderCard } from "@/components/debts/financing-app-provider-card";
import { InstallmentPlanRow } from "@/components/debts/installment-plan-row";
import { InstallmentForm } from "@/components/debts/installment-form";
import { formatAmount, formatAmountAr, CURRENCIES } from "@/lib/money";
import type { InstallmentResponse } from "@/lib/types/debts";

export function FinancingAppsTab() {
  const t = useTranslations();
  const locale = useLocale();
  const { data: plansData, isLoading: plansLoading, error: plansError } =
    useInstallments({ type: "financing_app" });
  const { data: summaryData, isLoading: summaryLoading } =
    useFinancingAppsSummary();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const isLoading = plansLoading || summaryLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (plansError) {
    return (
      <p className="text-destructive text-sm">
        {t("error.title")}: {plansError.message}
      </p>
    );
  }

  const plans = plansData?.data ?? [];
  const summary = summaryData?.data;

  if (plans.length === 0 && (!summary || summary.apps.length === 0)) {
    return (
      <EmptyState
        icon={Smartphone}
        title={t("emptyStates.installments.title")}
        description={t("emptyStates.installments.description")}
        action={{
          label: t("debts.actions.addInstallment"),
          onClick: () => setShowCreateForm(true),
        }}
      />
    );
  }

  // Group plans by source_account_id (which is the financing app account)
  const grouped = new Map<number, InstallmentResponse[]>();
  for (const plan of plans) {
    const key = plan.source_account_id ?? 0;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(plan);
  }

  const baseCurrency = summary?.totals
    ? "EGP"
    : plans[0]?.currency ?? "EGP";

  return (
    <div className="space-y-8">
      {/* Provider Overview Cards */}
      {summary && summary.apps.length > 0 && (
        <section>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Providers Overview
          </h2>
          <div className="flex gap-6 overflow-x-auto pb-4 -mx-2 px-2">
            {summary.apps.map((app) => (
              <FinancingAppProviderCard
                key={app.account_id}
                app={app}
                currency={baseCurrency}
              />
            ))}
          </div>
        </section>
      )}

      {/* Plans Grouped by Provider */}
      {summary && summary.apps.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            Installment Breakdown
          </h2>
          {summary.apps.map((app) => {
            const appPlans = grouped.get(app.account_id) ?? [];
            if (appPlans.length === 0 && app.active_plans_count === 0) {
              return (
                <div key={app.account_id} className="space-y-3">
                  <h3 className="text-sm font-bold text-muted-foreground">
                    {app.name} — No active plans
                  </h3>
                  <div className="py-8 text-center border-2 border-dashed border-border rounded-xl bg-muted/20">
                    <Receipt className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No active installment plans with {app.name} yet.
                    </p>
                  </div>
                </div>
              );
            }
            return (
              <div key={app.account_id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    {app.name}
                    {app.name_ar ? ` (${app.name_ar})` : ""} —{" "}
                    {app.active_plans_count} active plans
                  </h3>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {appPlans.map((plan) => (
                    <InstallmentPlanRow
                      key={plan.id}
                      plan={plan}
                      showAccentBorder={false}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* BNPL Summary Footer */}
      {summary && (
        <section className="bg-muted/50 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 border border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              BNPL Summary Commitment
            </h2>
            <p className="text-sm text-muted-foreground">
              Consolidated view of your current monthly financing obligations.
            </p>
          </div>
          <div className="flex gap-8 text-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                {t("debts.financingApps.totalMonthly")}
              </p>
              <MoneyDisplay
                amount={summary.totals.total_monthly_minor}
                currency={baseCurrency}
                size="lg"
                className="text-primary"
              />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                {t("debts.financingApps.totalRemaining")}
              </p>
              <MoneyDisplay
                amount={summary.totals.total_remaining_minor}
                currency={baseCurrency}
                size="lg"
              />
            </div>
          </div>
        </section>
      )}

      <InstallmentForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        defaultType="financing_app"
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify and commit**

```bash
cd frontend && pnpm exec tsc --noEmit
git add frontend/src/components/debts/financing-app-provider-card.tsx frontend/src/components/debts/financing-apps-tab.tsx
git commit -m "feat(debts): rewrite FinancingAppsTab with provider cards and grouped plans"
```

---

