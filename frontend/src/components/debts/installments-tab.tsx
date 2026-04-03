"use client";

import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";
import { Package } from "lucide-react";

interface InstallmentsTabProps {
  onAddClick?: () => void;
}

export function InstallmentsTab({ onAddClick }: InstallmentsTabProps) {
  const t = useTranslations();
  return (
    <EmptyState
      icon={Package}
      title={t("emptyStates.installments.title")}
      description={t("emptyStates.installments.description")}
      action={
        onAddClick
          ? { label: t("debts.actions.addInstallment"), onClick: onAddClick }
          : undefined
      }
    />
  );
}
