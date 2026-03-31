"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TARGET_FIELDS = ["date", "description", "debit", "credit", "balance"] as const;
type FieldKey = (typeof TARGET_FIELDS)[number];

const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD-MM-YYYY", "Auto-detect"];

interface MappingStepProps {
  headers: string[];
  autoSuggest: Record<string, string>;
  sheetNames: string[];
  selectedSheet: string | null;
  onBack: () => void;
  onParse: (mapping: Record<string, string>, dateFormat: string, skipRows: number, sheetName?: string) => void;
  isLoading: boolean;
}

export function MappingStep({
  headers,
  autoSuggest,
  sheetNames,
  selectedSheet,
  onBack,
  onParse,
  isLoading,
}: MappingStepProps) {
  const t = useTranslations("import.mapping");
  const [mapping, setMapping] = useState<Record<string, string>>(autoSuggest);
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [skipRows, setSkipRows] = useState(0);
  const [sheet, setSheet] = useState(selectedSheet ?? "");
  const [singleAmount, setSingleAmount] = useState(false);

  const fieldLabels: Record<string, string> = {
    date: t("fieldDate"),
    description: t("fieldDescription"),
    debit: singleAmount ? "Amount" : t("fieldDebit"),
    credit: t("fieldCredit"),
    balance: t("fieldBalance"),
  };

  const visibleFields = singleAmount
    ? (["date", "description", "debit", "balance"] as FieldKey[])
    : TARGET_FIELDS;

  function handleSubmit() {
    onParse(mapping, dateFormat, skipRows, sheet || undefined);
  }

  const isSuggested = (field: string) => autoSuggest[field] === mapping[field] && !!mapping[field];

  return (
    <div className="space-y-6">
      {/* Sheet selector (Excel only) */}
      {sheetNames.length > 1 && (
        <div className="space-y-2">
          <Label>Sheet</Label>
          <Select value={sheet} onValueChange={(v) => setSheet(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sheetNames.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Single-amount column toggle */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="single-amount"
          checked={singleAmount}
          onCheckedChange={(v) => setSingleAmount(Boolean(v))}
        />
        <Label htmlFor="single-amount" className="cursor-pointer">{t("singleAmount")}</Label>
      </div>

      {/* Column dropdowns */}
      <div className="grid gap-4">
        {visibleFields.map((field) => (
          <div key={field} className="space-y-1.5">
            <Label className="flex items-center gap-2">
              {fieldLabels[field]}
              {field === "balance" && (
                <span className="text-xs text-muted-foreground">(optional)</span>
              )}
              {isSuggested(field) && (
                <span className="text-xs text-primary">({t("suggested")})</span>
              )}
            </Label>
            <Select
              value={mapping[field] ?? ""}
              onValueChange={(v) => setMapping((prev) => ({ ...prev, [field]: v ?? "" }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectColumn")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— {t("selectColumn")}</SelectItem>
                {headers.map((h) => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {/* Date format */}
      <div className="space-y-2">
        <Label>{t("dateFormat")}</Label>
        <Select value={dateFormat} onValueChange={(v) => setDateFormat(v ?? "DD/MM/YYYY")}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_FORMATS.map((fmt) => (
              <SelectItem key={fmt} value={fmt}>{fmt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Skip rows */}
      <div className="space-y-2">
        <Label htmlFor="skip-rows">{t("skipRows")}</Label>
        <Input
          id="skip-rows"
          type="number"
          min={0}
          value={skipRows}
          onChange={(e) => setSkipRows(Number(e.target.value))}
          className="w-24"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack}>{t("back")}</Button>
        <Button onClick={handleSubmit} disabled={isLoading || !mapping.date}>
          {isLoading ? "Parsing…" : t("parse")}
        </Button>
      </div>
    </div>
  );
}
