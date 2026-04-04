"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Settings, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoansTab } from "@/components/debts/loans-tab";
import { InstallmentsTab } from "@/components/debts/installments-tab";
import { P2PTab } from "@/components/debts/p2p-tab";
import { BankLoanForm } from "@/components/debts/bank-loan-form";
import { InstallmentForm } from "@/components/debts/installment-form";
import { P2PDebtForm } from "@/components/debts/p2p-debt-form";
import { NavbarActions } from "@/components/layout/navbar-actions-portal";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { useDeleteDebt } from "@/hooks/use-debts";
import { FAB } from "@/components/shared/fab";
import { Button } from "@/components/ui/button";

const TAB_KEYS = ["loans", "installments", "p2p"] as const;

type TabKey = (typeof TAB_KEYS)[number];

const TAB_COMPONENTS: Record<
  TabKey,
  React.ComponentType<{
    onAddClick?: () => void;
    manageMode?: boolean;
    selectedIds?: Set<number>;
    onSelect?: (id: number) => void;
  }>
> = {
  loans: LoansTab,
  installments: InstallmentsTab,
  p2p: P2PTab,
};

const FAB_LABEL_KEYS: Record<TabKey, string> = {
  loans: "debts.actions.addLoan",
  installments: "debts.actions.addInstallment",
  p2p: "debts.actions.addDebt",
};

const FAB_TOOLTIP_KEYS: Record<TabKey, string> = {
  loans: "debts.actions.addLoan",
  installments: "debts.actions.addInstallment",
  p2p: "debts.actions.addDebt",
};

export default function DebtsPage() {
  const t = useTranslations();
  const tDebts = useTranslations("debts");
  const [activeTab, setActiveTab] = useState<TabKey>("loans");
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showInstallmentForm, setShowInstallmentForm] = useState(false);
  const [showP2PForm, setShowP2PForm] = useState(false);
  const {
    bulkMode: manageMode,
    selectedIds,
    enterBulkMode: enterManageMode,
    exitBulkMode: exitManageMode,
    toggleSelect,
    selectAll,
  } = useBulkSelection();

  const deleteMutation = useDeleteDebt();

  // Exit manage mode when switching away from loans tab
  useEffect(() => {
    if (activeTab !== "loans" && manageMode) {
      exitManageMode();
    }
  }, [activeTab, manageMode, exitManageMode]);

  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {tDebts("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tDebts("subtitle")}
          </p>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex border-b border-border overflow-x-auto">
        {TAB_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              "shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tDebts(`tabs.${key}`)}
          </button>
        ))}
      </nav>

      {/* Active tab content */}
      <div>
        {activeTab === "loans" ? (
          <LoansTab
            manageMode={manageMode}
            selectedIds={selectedIds}
            onSelect={toggleSelect}
          />
        ) : (
          <ActiveComponent />
        )}
      </div>

      {/* FAB — hidden in manage mode */}
      {!manageMode && (
        <FAB
          onClick={() => {
            switch (activeTab) {
              case "loans":
                setShowLoanForm(true);
                break;
              case "installments":
                setShowInstallmentForm(true);
                break;
              case "p2p":
                setShowP2PForm(true);
                break;
            }
          }}
          ariaLabel={t(FAB_LABEL_KEYS[activeTab])}
          tooltip={t(FAB_TOOLTIP_KEYS[activeTab])}
        />
      )}

      {/* Create form sheets */}
      <BankLoanForm open={showLoanForm} onOpenChange={setShowLoanForm} />
      <InstallmentForm
        open={showInstallmentForm}
        onOpenChange={setShowInstallmentForm}
      />
      <P2PDebtForm open={showP2PForm} onOpenChange={setShowP2PForm} />

      {activeTab === "loans" && !manageMode ? (
        <NavbarActions>
          <Button variant="outline" size="sm" onClick={enterManageMode}>
            <Settings className="h-4 w-4 me-1" />
            {tDebts("manage")}
          </Button>
        </NavbarActions>
      ) : activeTab === "loans" && manageMode && selectedIds.size === 0 ? (
        <NavbarActions>
          <Button variant="secondary" size="sm" onClick={exitManageMode}>
            {tDebts("cancel")}
          </Button>
        </NavbarActions>
      ) : activeTab === "loans" && manageMode && selectedIds.size > 0 ? (
        <NavbarActions>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {tDebts("selected", { count: selectedIds.size })}
            </span>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={async () => {
                const idsArray = [...selectedIds];
                const results = await Promise.allSettled(
                  idsArray.map((id) =>
                    deleteMutation.mutateAsync({ id }),
                  ),
                );
                const failedIds = new Set(
                  idsArray.filter(
                    (_, i) => results[i].status === "rejected",
                  ),
                );
                if (failedIds.size === 0) {
                  exitManageMode();
                } else {
                  selectAll([...failedIds]);
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5 me-1" />
              {tDebts("deleteSelected")}
            </Button>
            <Button variant="ghost" size="sm" onClick={exitManageMode}>
              {tDebts("cancel")}
            </Button>
          </div>
        </NavbarActions>
      ) : null}
    </div>
  );
}
