"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CategorizationRulesTable } from "@/components/settings/categorization-rules";
import { useCategorizeBatch } from "@/hooks/use-categorization";
import { useTransactions } from "@/hooks/use-transactions";

export default function CategorizationSettingsPage() {
  const t = useTranslations("categorization");

  // D-11: backfill button — categorize all uncategorized past transactions
  const { data: txData } = useTransactions({ has_category: false, page_size: 100 });
  const categorizeBatch = useCategorizeBatch();

  const uncategorizedIds = txData?.data?.map((tx) => tx.id) ?? [];

  const handleBackfill = () => {
    if (uncategorizedIds.length === 0) return;
    categorizeBatch.mutate(
      { transaction_ids: uncategorizedIds },
      {
        onSuccess: () => toast.success(t("categorizeStarted")),
        onError: () => toast.error(t("categorizeFailed")),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("rulesPageTitle")}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleBackfill}
          disabled={categorizeBatch.isPending || uncategorizedIds.length === 0}
        >
          {categorizeBatch.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin me-2" />
              {t("categorizing")}
            </>
          ) : (
            t("backfillButton")
          )}
        </Button>
      </div>
      <CategorizationRulesTable />
    </div>
  );
}
