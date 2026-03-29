"use client";

import { useTranslations } from "next-intl";
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  ShoppingCart,
  Briefcase,
  Phone,
  Users,
} from "lucide-react";

export function LandingDashboard() {
  const t = useTranslations("landing");

  return (
    <section className="py-20 px-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
            {t("dashboard.title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("dashboard.subtitle")}
          </p>
        </div>

        {/* Dashboard Mockup */}
        <div className="mx-auto max-w-5xl rounded-2xl border bg-card p-4 shadow-2xl sm:p-8">
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="rounded-xl border bg-background p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="size-4" />
                {t("dashboard.totalBalance")}
              </div>
              <p className="mt-1 text-xl font-bold sm:text-2xl">
                {t("dashboard.balanceAmount")}
              </p>
            </div>
            <div className="rounded-xl border bg-background p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="size-4 text-green-500" />
                {t("dashboard.income")}
              </div>
              <p className="mt-1 text-xl font-bold text-green-600 sm:text-2xl">
                {t("dashboard.incomeAmount")}
              </p>
            </div>
            <div className="rounded-xl border bg-background p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingDown className="size-4 text-red-500" />
                {t("dashboard.expenses")}
              </div>
              <p className="mt-1 text-xl font-bold text-red-600 sm:text-2xl">
                {t("dashboard.expensesAmount")}
              </p>
            </div>
            <div className="rounded-xl border bg-background p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <PiggyBank className="size-4 text-primary" />
                {t("dashboard.savings")}
              </div>
              <p className="mt-1 text-xl font-bold text-primary sm:text-2xl">
                {t("dashboard.savingsAmount")}
              </p>
            </div>
          </div>

          {/* Content Row */}
          <div className="mt-4 grid gap-4 lg:grid-cols-5">
            {/* Recent Transactions */}
            <div className="rounded-xl border bg-background p-4 lg:col-span-3">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                {t("dashboard.recentTransactions")}
              </h3>
              <div className="space-y-3">
                {[
                  { icon: ShoppingCart, label: "t1", amount: "t1Amount", color: "text-red-500" },
                  { icon: Briefcase, label: "t2", amount: "t2Amount", color: "text-green-500" },
                  { icon: Phone, label: "t3", amount: "t3Amount", color: "text-red-500" },
                  { icon: Users, label: "t4", amount: "t4Amount", color: "text-red-500" },
                ].map((tx) => (
                  <div
                    key={tx.label}
                    className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                        <tx.icon className="size-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium">
                        {t(`dashboard.${tx.label}` as Parameters<typeof t>[0])}
                      </span>
                    </div>
                    <span className={`text-sm font-semibold ${tx.color}`}>
                      {t(`dashboard.${tx.amount}` as Parameters<typeof t>[0])}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Savings Goal */}
            <div className="rounded-xl border bg-background p-4 lg:col-span-2">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                {t("dashboard.savingsGoal")}
              </h3>
              <div className="flex flex-col items-center justify-center gap-4 py-4">
                {/* Circular progress */}
                <div className="relative size-32">
                  <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-muted"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="text-primary"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray="75, 100"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">75%</span>
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.savingsProgress")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
