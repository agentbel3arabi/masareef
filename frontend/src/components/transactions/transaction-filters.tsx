"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import type { TransactionFilters } from "@/hooks/use-transactions";

interface TransactionFilterBarProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
}

export function TransactionFilterBar({ filters, onChange }: TransactionFilterBarProps) {
  const t = useTranslations();
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <Input
        placeholder={t("transactions.search")}
        value={filters.q || ""}
        onChange={(e) => onChange({ ...filters, q: e.target.value, page: 1 })}
        className="max-w-xs"
      />
      <select
        value={filters.type || ""}
        onChange={(e) => onChange({ ...filters, type: e.target.value || undefined, page: 1 })}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">{t("transactions.allTypes")}</option>
        <option value="debit">{t("transactions.expenses")}</option>
        <option value="credit">{t("transactions.income")}</option>
      </select>
      <Input
        type="date"
        value={filters.date_from || ""}
        onChange={(e) => onChange({ ...filters, date_from: e.target.value || undefined, page: 1 })}
        className="max-w-[160px]"
      />
      <Input
        type="date"
        value={filters.date_to || ""}
        onChange={(e) => onChange({ ...filters, date_to: e.target.value || undefined, page: 1 })}
        className="max-w-[160px]"
      />
    </div>
  );
}
