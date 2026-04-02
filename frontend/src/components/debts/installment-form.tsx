"use client";

import { useTranslations } from "next-intl";
import { FormSheet } from "@/components/shared/form-sheet";

interface InstallmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: "credit_card" | "store" | "financing_app";
}

export function InstallmentForm({
  open,
  onOpenChange,
}: InstallmentFormProps) {
  const t = useTranslations("debts");

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("actions.addInstallment")}
      description="Add a new installment plan"
    >
      <div className="py-12 text-center text-muted-foreground">
        <p className="text-sm">Coming soon</p>
      </div>
    </FormSheet>
  );
}
