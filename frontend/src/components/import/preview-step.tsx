"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { ImportSummaryBar } from "@/components/import/import-summary-bar";
import type { ParsedRow } from "@/hooks/use-import";

interface PreviewStepProps {
  rows: ParsedRow[];
  stats: { valid: number; duplicate: number; error: number };
  currency: string;
  onBack: () => void;
  onCommit: (selectedRows: ParsedRow[]) => void;
  isLoading: boolean;
}

function StatusBadge({ status }: { status: ParsedRow["status"] }) {
  const t = useTranslations("import.preview");
  if (status === "duplicate") return <Badge variant="secondary">{t("statusDuplicate")}</Badge>;
  if (status === "error") return <Badge variant="destructive">{t("statusError")}</Badge>;
  return null;
}

export function PreviewStep({
  rows,
  stats,
  currency,
  onBack,
  onCommit,
  isLoading,
}: PreviewStepProps) {
  const t = useTranslations("import.preview");
  const [selected, setSelected] = useState<Set<number>>(
    () =>
      new Set(
        rows
          .filter((r) => r.status !== "error" && (r.selected ?? true))
          .map((r) => r.row_index)
      )
  );

  function toggleRow(rowIndex: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  }

  const selectedRows = rows.filter((r) => selected.has(r.row_index));
  const selectedCount = selectedRows.length;

  return (
    <div className="space-y-4">
      <ImportSummaryBar
        valid={stats.valid}
        duplicate={stats.duplicate}
        error={stats.error}
      />

      {/* Transaction table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-10 px-3 py-2 text-start" />
              <th className="px-3 py-2 text-start font-medium">
                {t("date")}
              </th>
              <th className="px-3 py-2 text-start font-medium">
                {t("description")}
              </th>
              <th className="px-3 py-2 text-end font-medium">
                {t("amount")}
              </th>
              <th className="px-3 py-2 text-start font-medium">
                {t("status")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr
                key={row.row_index}
                className={
                  row.status === "error"
                    ? "opacity-50"
                    : row.status === "duplicate"
                      ? "bg-muted/30"
                      : ""
                }
              >
                <td className="px-3 py-2">
                  <Checkbox
                    checked={selected.has(row.row_index)}
                    onCheckedChange={() => toggleRow(row.row_index)}
                    disabled={row.status === "error"}
                  />
                </td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                  {row.date ?? "—"}
                </td>
                <td className="px-3 py-2 max-w-48 truncate">
                  {row.description}
                </td>
                <td className="px-3 py-2 text-end">
                  {row.amount_minor != null ? (
                    <MoneyDisplay amount={row.amount_minor} currency={currency} />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2">
                  {row.status !== "valid" && (
                    <div className="space-y-1">
                      <StatusBadge status={row.status} />
                      {row.error_message && (
                        <p className="text-xs text-muted-foreground">
                          {row.error_message}
                        </p>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack}>
          {t("back")}
        </Button>
        <Button
          onClick={() => onCommit(selectedRows)}
          disabled={isLoading || selectedCount === 0}
        >
          {isLoading ? t("importing") : t("commit", { count: selectedCount })}
        </Button>
      </div>
    </div>
  );
}
