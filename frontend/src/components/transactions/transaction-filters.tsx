"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import type { TransactionFilters } from "@/hooks/use-transactions";

const DEFAULT_FILTERS: TransactionFilters = {
  page: 1,
  page_size: 50,
  sort: "-date",
};

interface TransactionFilterBarProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
}

export function TransactionFilterBar({ filters, onChange }: TransactionFilterBarProps) {
  const t = useTranslations();
  const { data: accountsData } = useAccounts();
  const { data: categoriesData } = useCategories();

  const reset = () => onChange(DEFAULT_FILTERS);

  const hasActiveFilters =
    filters.q ||
    filters.account_id ||
    filters.category_id ||
    filters.type ||
    filters.date_from ||
    filters.date_to ||
    filters.amount_min != null ||
    filters.amount_max != null;

  return (
    <div className="flex flex-wrap gap-2 mb-4 items-end">
      {/* Search */}
      <Input
        placeholder={t("transactions.search")}
        value={filters.q || ""}
        onChange={(e) =>
          onChange({ ...filters, q: e.target.value || undefined, page: 1 })
        }
        className="w-48"
      />

      {/* Account */}
      <select
        value={filters.account_id ?? ""}
        onChange={(e) =>
          onChange({
            ...filters,
            account_id: e.target.value ? Number(e.target.value) : undefined,
            page: 1,
          })
        }
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">{t("transactions.allAccounts")}</option>
        {(accountsData?.data || []).map((acc) => (
          <option key={acc.id} value={acc.id}>
            {acc.name}
          </option>
        ))}
      </select>

      {/* Category */}
      <select
        value={filters.category_id ?? ""}
        onChange={(e) =>
          onChange({
            ...filters,
            category_id: e.target.value ? Number(e.target.value) : undefined,
            page: 1,
          })
        }
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">{t("transactions.allCategories")}</option>
        {(categoriesData?.data || []).map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.icon ? `${cat.icon} ` : ""}
            {cat.name_en}
          </option>
        ))}
      </select>

      {/* Type */}
      <select
        value={filters.type || ""}
        onChange={(e) =>
          onChange({ ...filters, type: e.target.value || undefined, page: 1 })
        }
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">{t("transactions.allTypes")}</option>
        <option value="debit">{t("transactions.expenses")}</option>
        <option value="credit">{t("transactions.income")}</option>
      </select>

      {/* Date from */}
      <Input
        type="date"
        value={filters.date_from || ""}
        onChange={(e) =>
          onChange({ ...filters, date_from: e.target.value || undefined, page: 1 })
        }
        className="w-36"
      />

      {/* Date to */}
      <Input
        type="date"
        value={filters.date_to || ""}
        onChange={(e) =>
          onChange({ ...filters, date_to: e.target.value || undefined, page: 1 })
        }
        className="w-36"
      />

      {/* Amount min */}
      <Input
        type="number"
        placeholder={t("transactions.amountMin")}
        value={filters.amount_min != null ? String(filters.amount_min) : ""}
        onChange={(e) =>
          onChange({
            ...filters,
            amount_min: e.target.value ? Number(e.target.value) : undefined,
            page: 1,
          })
        }
        className="w-28"
        min="0"
      />

      {/* Amount max */}
      <Input
        type="number"
        placeholder={t("transactions.amountMax")}
        value={filters.amount_max != null ? String(filters.amount_max) : ""}
        onChange={(e) =>
          onChange({
            ...filters,
            amount_max: e.target.value ? Number(e.target.value) : undefined,
            page: 1,
          })
        }
        className="w-28"
        min="0"
      />

      {/* Reset */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={reset} className="gap-1">
          <X className="h-3.5 w-3.5" />
          {t("transactions.resetFilters")}
        </Button>
      )}
    </div>
  );
}
