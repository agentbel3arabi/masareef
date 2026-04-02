"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { LoansTab } from "@/components/debts/loans-tab";
import { CardInstallmentsTab } from "@/components/debts/card-installments-tab";
import { FinancingAppsTab } from "@/components/debts/financing-apps-tab";
import { StoreInstallmentsTab } from "@/components/debts/store-installments-tab";
import { P2PTab } from "@/components/debts/p2p-tab";

const TAB_KEYS = [
  "loans",
  "cardInstallments",
  "financingApps",
  "storeInstallments",
  "p2p",
] as const;

type TabKey = (typeof TAB_KEYS)[number];

const TAB_COMPONENTS: Record<TabKey, React.ComponentType> = {
  loans: LoansTab,
  cardInstallments: CardInstallmentsTab,
  financingApps: FinancingAppsTab,
  storeInstallments: StoreInstallmentsTab,
  p2p: P2PTab,
};

export default function DebtsPage() {
  const t = useTranslations("debts");
  const [activeTab, setActiveTab] = useState<TabKey>("loans");

  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("subtitle")}
          </p>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex border-b border-border overflow-x-auto" role="tablist">
        {TAB_KEYS.map((key) => {
          const tabId = `debts-tab-${key}`;
          const panelId = `debts-tabpanel-${key}`;

          return (
            <button
              key={key}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              aria-controls={panelId}
              onClick={() => setActiveTab(key)}
              className={cn(
                "shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t(`tabs.${key}`)}
            </button>
          );
        })}
      </nav>

      {/* Active tab content */}
      <div
        role="tabpanel"
        id={`debts-tabpanel-${activeTab}`}
        aria-labelledby={`debts-tab-${activeTab}`}
      >
        <ActiveComponent />
      </div>
    </div>
  );
}
