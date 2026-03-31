# Phase 2C: Import Wizard Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 3-step import wizard (upload → column mapping → preview/commit), sidebar nav entry, and Account Detail import shortcut button.

**Architecture:** Single-page wizard at `/import` with a TypeScript discriminated-union state machine. Five step components plus a shared hooks file. The parse endpoint receives `multipart/form-data` so `api-client.ts` needs a new `apiUploadForm()` function. Wizard reads `?accountId=N` from URL search params to pre-fill account on entry from Account Detail.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, TanStack Query, shadcn/ui (base-nova), Tailwind v4, next-intl, react-dropzone

**Stitch design references:**
- `docs/stitch-designs/html/08-import-upload.html`
- `docs/stitch-designs/html/08b-import-mapping.html`
- `docs/stitch-designs/html/09-import-preview.html`

---

## File Map

**New files:**
- `frontend/src/app/(app)/import/page.tsx` — wizard page + state machine
- `frontend/src/components/import/upload-step.tsx` — drag-drop zone, account selector, file type badge
- `frontend/src/components/import/mapping-step.tsx` — column mapper dropdowns + date format + skip rows
- `frontend/src/components/import/preview-step.tsx` — DataTable with per-row checkboxes + summary bar
- `frontend/src/components/import/scanned-prompt.tsx` — upgrade prompt when scanned PDF detected
- `frontend/src/components/import/import-summary-bar.tsx` — valid/duplicate/error counts
- `frontend/src/hooks/use-import.ts` — TanStack Query mutations for parse + commit

**Modified files:**
- `frontend/src/lib/api-client.ts` — add `apiUploadForm()` for multipart uploads
- `frontend/src/lib/nav-items.ts` — add Import nav entry
- `frontend/src/app/(app)/accounts/[id]/page.tsx` — add Import button to action row
- `frontend/src/messages/en.json` — add import translation keys
- `frontend/src/messages/ar.json` — add Arabic translation keys

---

## Task 1: Create branch + add react-dropzone

- [ ] **Create feature branch**

```bash
git checkout main && git pull
git checkout -b feature/2c-import-wizard
```

- [ ] **Add react-dropzone**

```bash
cd frontend && pnpm add react-dropzone
```

- [ ] **Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml
git commit -m "chore(import): add react-dropzone dependency"
```

---

## Task 2: Add multipart upload to api-client and add i18n keys

- [ ] **Update `frontend/src/lib/api-client.ts`** — add `apiUploadForm`:

```typescript
/**
 * Post multipart/form-data (for file uploads).
 * Does NOT set Content-Type — browser sets it automatically with boundary.
 */
export async function apiUploadForm<T>(path: string, formData: FormData): Promise<ApiResponse<T>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) await handleError(res);
  return res.json();
}
```

- [ ] **Add import translation keys to `frontend/src/messages/en.json`**

Add the following block (merge into existing top-level object):

```json
"import": {
  "title": "Import",
  "subtitle": "Import bank statement",
  "step": {
    "upload": "Upload",
    "mapping": "Map Columns",
    "preview": "Preview & Confirm"
  },
  "upload": {
    "dragDrop": "Drag & drop your bank statement here",
    "or": "or",
    "browse": "Browse file",
    "supported": "Supported: CSV, Excel (.xlsx), PDF",
    "account": "Import into account",
    "selectAccount": "Select account"
  },
  "mapping": {
    "title": "Map columns",
    "subtitle": "Match your file's columns to the fields below",
    "fieldDate": "Date",
    "fieldDescription": "Description",
    "fieldDebit": "Debit (money out)",
    "fieldCredit": "Credit (money in)",
    "fieldBalance": "Balance (optional)",
    "selectColumn": "Select column",
    "suggested": "suggested",
    "dateFormat": "Date format",
    "skipRows": "Skip header rows",
    "singleAmount": "Single amount column",
    "back": "Back",
    "parse": "Parse"
  },
  "preview": {
    "title": "Review transactions",
    "commit": "Import {count} transactions",
    "back": "Back",
    "valid": "{count} valid",
    "duplicate": "{count} duplicate",
    "error": "{count} error"
  },
  "scanned": {
    "title": "Scanned PDF detected",
    "description": "This looks like a scanned document. Upgrade to Premium to import scanned bank statements.",
    "upgrade": "Upgrade to Premium",
    "back": "Try another file"
  },
  "done": {
    "success": "Successfully imported {count} transactions"
  },
  "errors": {
    "noFile": "Please select a file",
    "noAccount": "Please select an account",
    "parseFailed": "Failed to parse file",
    "commitFailed": "Failed to import transactions"
  }
}
```

- [ ] **Add Arabic keys to `frontend/src/messages/ar.json`**

```json
"import": {
  "title": "استيراد",
  "subtitle": "استيراد كشف حساب",
  "step": {
    "upload": "رفع الملف",
    "mapping": "تعيين الأعمدة",
    "preview": "مراجعة وتأكيد"
  },
  "upload": {
    "dragDrop": "اسحب وأفلت كشف حسابك هنا",
    "or": "أو",
    "browse": "تصفح الملفات",
    "supported": "الصيغ المدعومة: CSV، Excel، PDF",
    "account": "الاستيراد إلى الحساب",
    "selectAccount": "اختر حساباً"
  },
  "mapping": {
    "title": "تعيين الأعمدة",
    "subtitle": "طابق أعمدة ملفك مع الحقول أدناه",
    "fieldDate": "التاريخ",
    "fieldDescription": "الوصف",
    "fieldDebit": "سحب (خروج)",
    "fieldCredit": "إيداع (دخول)",
    "fieldBalance": "الرصيد (اختياري)",
    "selectColumn": "اختر عموداً",
    "suggested": "مقترح",
    "dateFormat": "صيغة التاريخ",
    "skipRows": "تخطي صفوف الرأس",
    "singleAmount": "عمود مبلغ واحد",
    "back": "رجوع",
    "parse": "تحليل"
  },
  "preview": {
    "title": "مراجعة المعاملات",
    "commit": "استيراد {count} معاملات",
    "back": "رجوع",
    "valid": "{count} صالح",
    "duplicate": "{count} مكرر",
    "error": "{count} خطأ"
  },
  "scanned": {
    "title": "تم اكتشاف ملف ممسوح ضوئياً",
    "description": "يبدو أن هذا المستند ممسوح ضوئياً. قم بالترقية إلى Premium لاستيراد كشوف الحسابات الممسوحة.",
    "upgrade": "الترقية إلى Premium",
    "back": "جرب ملفاً آخر"
  },
  "done": {
    "success": "تم استيراد {count} معاملات بنجاح"
  },
  "errors": {
    "noFile": "يرجى اختيار ملف",
    "noAccount": "يرجى اختيار حساب",
    "parseFailed": "فشل تحليل الملف",
    "commitFailed": "فشل استيراد المعاملات"
  }
}
```

- [ ] **Commit**

```bash
git add frontend/src/lib/api-client.ts \
        frontend/src/messages/en.json frontend/src/messages/ar.json
git commit -m "feat(import): apiUploadForm + import i18n keys (EN + AR)"
```

---

## Task 3: TanStack Query hooks

- [ ] **Create `frontend/src/hooks/use-import.ts`**

```typescript
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { apiUploadForm, apiPost } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ParsedRow {
  row_index: number;
  date: string | null;
  description: string;
  debit_raw: string;
  credit_raw: string;
  amount_minor: number | null;
  currency: string;
  type: "debit" | "credit";
  status: "valid" | "duplicate" | "error";
  error_message: string | null;
  selected: boolean;
  apply_to_balance: boolean;
}

export interface NeedsMappingResponse {
  result_type: "needs_mapping";
  headers: string[];
  sheet_names: string[];
  selected_sheet: string | null;
  auto_suggest: Record<string, string>;
}

export interface ScannedResponse {
  result_type: "scanned";
  scanned: true;
}

export interface ParseCompleteResponse {
  result_type: "complete";
  rows: ParsedRow[];
  detected_preset: string | null;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  duplicate_rows: number;
}

export type ParseResponse = NeedsMappingResponse | ScannedResponse | ParseCompleteResponse;

export interface CommitRow {
  date: string;
  description: string;
  amount_minor: number;
  currency: string;
  type: string;
  apply_to_balance: boolean;
}

export interface CommitRequest {
  account_id: number;
  rows: CommitRow[];
}

export interface CommitResponse {
  batch_id: string;
  count: number;
  first_transaction_id: number;
  balance_delta: number;
}

// ── Parse mutation ────────────────────────────────────────────────────────────

export interface ParseParams {
  file: File;
  accountId: number;
  currency: string;
  columnMapping?: Record<string, string>;
  dateFormat?: string;
  sheetName?: string;
}

export function useParseImport() {
  return useMutation({
    mutationFn: async (params: ParseParams): Promise<ParseResponse> => {
      const formData = new FormData();
      formData.append("file", params.file);
      formData.append("account_id", String(params.accountId));
      formData.append("currency", params.currency);
      if (params.columnMapping) {
        formData.append("column_mapping", JSON.stringify(params.columnMapping));
      }
      if (params.dateFormat) {
        formData.append("date_format", params.dateFormat);
      }
      if (params.sheetName) {
        formData.append("sheet_name", params.sheetName);
      }
      const resp = await apiUploadForm<ParseResponse>("/api/v1/import/parse", formData);
      return resp.data;
    },
  });
}

// ── Commit mutation ───────────────────────────────────────────────────────────

export function useCommitImport() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (data: CommitRequest) =>
      apiPost<CommitResponse>("/api/v1/import/commit", data),
    successMessage: t("importComplete"),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
```

> Note: Add `"importComplete": "Import complete"` to `en.json` toast section and `ar.json`.

- [ ] **Add toast key to messages**

In `en.json` → `toast` section, add: `"importComplete": "Import complete"`
In `ar.json` → `toast` section, add: `"importComplete": "اكتمل الاستيراد"`

- [ ] **Commit**

```bash
git add frontend/src/hooks/use-import.ts \
        frontend/src/messages/en.json frontend/src/messages/ar.json
git commit -m "feat(import): useParseImport + useCommitImport TanStack Query hooks"
```

---

## Task 4: Import summary bar component

- [ ] **Create `frontend/src/components/import/import-summary-bar.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { CheckCircle, Copy, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportSummaryBarProps {
  valid: number;
  duplicate: number;
  error: number;
}

export function ImportSummaryBar({ valid, duplicate, error }: ImportSummaryBarProps) {
  const t = useTranslations("import.preview");

  return (
    <div className="flex flex-wrap gap-4 py-3 px-4 rounded-lg bg-muted/50 text-sm">
      <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
        <CheckCircle className="size-4" />
        {t("valid", { count: valid })}
      </span>
      {duplicate > 0 && (
        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
          <Copy className="size-4" />
          {t("duplicate", { count: duplicate })}
        </span>
      )}
      {error > 0 && (
        <span className="flex items-center gap-1.5 text-destructive">
          <AlertCircle className="size-4" />
          {t("error", { count: error })}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add frontend/src/components/import/import-summary-bar.tsx
git commit -m "feat(import): ImportSummaryBar component"
```

---

## Task 5: Upload step component

- [ ] **Create `frontend/src/components/import/upload-step.tsx`**

```tsx
"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslations } from "next-intl";
import { Upload, FileText, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/hooks/use-accounts";
import { cn } from "@/lib/utils";

interface UploadStepProps {
  selectedAccountId: number | null;
  onAccountChange: (id: number) => void;
  onFileSelected: (file: File) => void;
}

function FileTypeBadge({ filename }: { filename: string }) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">PDF</span>;
  if (ext === "csv") return <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">CSV</span>;
  return <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">XLSX</span>;
}

export function UploadStep({ selectedAccountId, onAccountChange, onFileSelected }: UploadStepProps) {
  const t = useTranslations("import.upload");
  const { data: accountsResp } = useAccounts();
  const accounts = accountsResp?.data ?? [];

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles[0]) onFileSelected(acceptedFiles[0]);
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const selectedFile = acceptedFiles[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Account selector */}
      <div className="space-y-2">
        <Label htmlFor="account-select">{t("account")}</Label>
        <Select
          value={selectedAccountId ? String(selectedAccountId) : ""}
          onValueChange={(v) => onAccountChange(Number(v))}
        >
          <SelectTrigger id="account-select" className="w-full">
            <SelectValue placeholder={t("selectAccount")} />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((acct) => (
              <SelectItem key={acct.id} value={String(acct.id)}>
                {acct.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="size-10 text-muted-foreground" />
        <div className="text-center space-y-1">
          <p className="font-medium">{t("dragDrop")}</p>
          <p className="text-sm text-muted-foreground">{t("or")}</p>
          <Button type="button" variant="outline" size="sm">
            {t("browse")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("supported")}</p>
      </div>

      {/* Selected file badge */}
      {selectedFile && (
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <FileText className="size-4 text-muted-foreground shrink-0" />
          <span className="flex-1 truncate">{selectedFile.name}</span>
          <FileTypeBadge filename={selectedFile.name} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add frontend/src/components/import/upload-step.tsx
git commit -m "feat(import): UploadStep component with react-dropzone"
```

---

## Task 6: Column mapping step component

- [ ] **Create `frontend/src/components/import/mapping-step.tsx`**

```tsx
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
          <Select value={sheet} onValueChange={setSheet}>
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
              onValueChange={(v) => setMapping((prev) => ({ ...prev, [field]: v }))}
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
        <Select value={dateFormat} onValueChange={setDateFormat}>
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
```

- [ ] **Commit**

```bash
git add frontend/src/components/import/mapping-step.tsx
git commit -m "feat(import): MappingStep — column mapper dropdowns with auto-suggest"
```

---

## Task 7: Preview step and scanned prompt components

- [ ] **Create `frontend/src/components/import/preview-step.tsx`**

```tsx
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
  if (status === "duplicate") return <Badge variant="secondary">Duplicate</Badge>;
  if (status === "error") return <Badge variant="destructive">Error</Badge>;
  return null;
}

export function PreviewStep({ rows, stats, currency, onBack, onCommit, isLoading }: PreviewStepProps) {
  const t = useTranslations("import.preview");
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(rows.filter((r) => r.selected).map((r) => r.row_index))
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
      <ImportSummaryBar valid={stats.valid} duplicate={stats.duplicate} error={stats.error} />

      {/* Transaction table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-10 px-3 py-2 text-start" />
              <th className="px-3 py-2 text-start font-medium">Date</th>
              <th className="px-3 py-2 text-start font-medium">Description</th>
              <th className="px-3 py-2 text-end font-medium">Amount</th>
              <th className="px-3 py-2 text-start font-medium">Status</th>
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
                <td className="px-3 py-2 max-w-48 truncate">{row.description}</td>
                <td className="px-3 py-2 text-end">
                  {row.amount_minor != null ? (
                    <MoneyDisplay amount={row.amount_minor} currency={currency} />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={row.status} />
                  {row.error_message && (
                    <span className="text-xs text-muted-foreground">{row.error_message}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack}>{t("back")}</Button>
        <Button
          onClick={() => onCommit(selectedRows)}
          disabled={isLoading || selectedCount === 0}
        >
          {isLoading ? "Importing…" : t("commit", { count: selectedCount })}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Create `frontend/src/components/import/scanned-prompt.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScannedPromptProps {
  onBack: () => void;
}

export function ScannedPrompt({ onBack }: ScannedPromptProps) {
  const t = useTranslations("import.scanned");

  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
        <ScanLine className="size-8 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{t("title")}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{t("description")}</p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>{t("back")}</Button>
        <Button disabled>{t("upgrade")}</Button>
      </div>
      <p className="text-xs text-muted-foreground">Coming in a future update</p>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add frontend/src/components/import/preview-step.tsx \
        frontend/src/components/import/scanned-prompt.tsx
git commit -m "feat(import): PreviewStep + ScannedPrompt components"
```

---

## Task 8: Wizard page (state machine)

- [ ] **Create `frontend/src/app/(app)/import/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { UploadStep } from "@/components/import/upload-step";
import { MappingStep } from "@/components/import/mapping-step";
import { PreviewStep } from "@/components/import/preview-step";
import { ScannedPrompt } from "@/components/import/scanned-prompt";
import { useParseImport, useCommitImport } from "@/hooks/use-import";
import type { ParsedRow } from "@/hooks/use-import";
import { useAccounts } from "@/hooks/use-accounts";
import { Button } from "@/components/ui/button";

// ── State machine types ──────────────────────────────────────────────────────

type WizardState =
  | { step: "upload" }
  | {
      step: "mapping";
      headers: string[];
      sheetNames: string[];
      selectedSheet: string | null;
      autoSuggest: Record<string, string>;
      file: File;
      accountId: number;
      currency: string;
    }
  | {
      step: "preview";
      rows: ParsedRow[];
      stats: { valid: number; duplicate: number; error: number };
      accountId: number;
      currency: string;
      file: File;
    }
  | { step: "scanned" }
  | { step: "done"; count: number; firstTransactionId: number; accountId: number };

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: "upload" | "mapping" | "preview" }) {
  const t = useTranslations("import.step");
  const steps = [
    { key: "upload", label: t("upload") },
    { key: "mapping", label: t("mapping") },
    { key: "preview", label: t("preview") },
  ] as const;
  const currentIdx = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-2 text-sm">
      {steps.map((step, idx) => (
        <div key={step.key} className="flex items-center gap-2">
          <div
            className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
              idx <= currentIdx
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {idx + 1}
          </div>
          <span className={idx <= currentIdx ? "font-medium" : "text-muted-foreground"}>
            {step.label}
          </span>
          {idx < steps.length - 1 && <span className="text-muted-foreground">›</span>}
        </div>
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const t = useTranslations("import");
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledAccountId = searchParams.get("accountId")
    ? Number(searchParams.get("accountId"))
    : null;

  const { data: accountsResp } = useAccounts();
  const accounts = accountsResp?.data ?? [];

  const [state, setState] = useState<WizardState>({ step: "upload" });
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(prefilledAccountId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const parseMutation = useParseImport();
  const commitMutation = useCommitImport();

  // ── Upload step: user selects file and account, clicks Next ─────────────
  async function handleUploadNext() {
    if (!selectedFile) {
      toast.error(t("errors.noFile"));
      return;
    }
    if (!selectedAccountId) {
      toast.error(t("errors.noAccount"));
      return;
    }
    const account = accounts.find((a) => a.id === selectedAccountId);
    const currency = account?.currency ?? "EGP";

    try {
      const result = await parseMutation.mutateAsync({
        file: selectedFile,
        accountId: selectedAccountId,
        currency,
      });

      if (result.result_type === "scanned") {
        setState({ step: "scanned" });
      } else if (result.result_type === "needs_mapping") {
        setState({
          step: "mapping",
          headers: result.headers,
          sheetNames: result.sheet_names,
          selectedSheet: result.selected_sheet,
          autoSuggest: result.auto_suggest,
          file: selectedFile,
          accountId: selectedAccountId,
          currency,
        });
      } else {
        setState({
          step: "preview",
          rows: result.rows,
          stats: { valid: result.valid_rows, duplicate: result.duplicate_rows, error: result.error_rows },
          accountId: selectedAccountId,
          currency,
          file: selectedFile,
        });
      }
    } catch {
      toast.error(t("errors.parseFailed"));
    }
  }

  // ── Mapping step: user confirms mapping, second parse call ───────────────
  async function handleMappingParse(
    mapping: Record<string, string>,
    dateFormat: string,
    skipRows: number,
    sheetName?: string,
  ) {
    if (state.step !== "mapping") return;
    const { file, accountId, currency } = state;

    try {
      const result = await parseMutation.mutateAsync({
        file,
        accountId,
        currency,
        columnMapping: mapping,
        dateFormat,
        sheetName,
      });

      if (result.result_type !== "complete") {
        toast.error(t("errors.parseFailed"));
        return;
      }
      setState({
        step: "preview",
        rows: result.rows,
        stats: { valid: result.valid_rows, duplicate: result.duplicate_rows, error: result.error_rows },
        accountId,
        currency,
        file,
      });
    } catch {
      toast.error(t("errors.parseFailed"));
    }
  }

  // ── Preview step: user commits selected rows ─────────────────────────────
  async function handleCommit(selectedRows: ParsedRow[]) {
    if (state.step !== "preview") return;
    const { accountId, currency } = state;

    try {
      const result = await commitMutation.mutateAsync({
        account_id: accountId,
        rows: selectedRows.map((r) => ({
          date: r.date!,
          description: r.description,
          amount_minor: r.amount_minor!,
          currency,
          type: r.type,
          apply_to_balance: r.apply_to_balance,
        })),
      });

      const data = result.data;
      setState({ step: "done", count: data.count, firstTransactionId: data.first_transaction_id, accountId });
      router.push(`/accounts/${accountId}`);
    } catch {
      toast.error(t("errors.commitFailed"));
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const showStepIndicator = state.step === "upload" || state.step === "mapping" || state.step === "preview";

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {showStepIndicator && (
        <StepIndicator
          current={state.step === "preview" ? "preview" : state.step === "mapping" ? "mapping" : "upload"}
        />
      )}

      {state.step === "upload" && (
        <div className="space-y-6">
          <UploadStep
            selectedAccountId={selectedAccountId}
            onAccountChange={setSelectedAccountId}
            onFileSelected={setSelectedFile}
          />
          <Button
            onClick={handleUploadNext}
            disabled={!selectedFile || !selectedAccountId || parseMutation.isPending}
            className="w-full"
          >
            {parseMutation.isPending ? "Analysing…" : "Next"}
          </Button>
        </div>
      )}

      {state.step === "mapping" && (
        <MappingStep
          headers={state.headers}
          autoSuggest={state.autoSuggest}
          sheetNames={state.sheetNames}
          selectedSheet={state.selectedSheet}
          onBack={() => setState({ step: "upload" })}
          onParse={handleMappingParse}
          isLoading={parseMutation.isPending}
        />
      )}

      {state.step === "preview" && (
        <PreviewStep
          rows={state.rows}
          stats={state.stats}
          currency={state.currency}
          onBack={() => {
            // Reset to upload — mapping state is not preserved on back navigation.
            // User re-selects file and re-maps. Simpler than storing full mapping state.
            setSelectedFile(null);
            setState({ step: "upload" });
          }}
          onCommit={handleCommit}
          isLoading={commitMutation.isPending}
        />
      )}

      {state.step === "scanned" && (
        <ScannedPrompt onBack={() => setState({ step: "upload" })} />
      )}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add frontend/src/app/(app)/import/page.tsx
git commit -m "feat(import): import wizard page with 5-state machine"
```

---

## Task 9: Sidebar nav entry and account detail button

- [ ] **Update `frontend/src/lib/nav-items.ts`** — add Import between Transfers and budgets:

```typescript
import {
  ArrowLeftRight,
  HandCoins,
  LayoutDashboard,
  PiggyBank,
  Receipt,
  Settings,
  Upload,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "nav.dashboard" },
  { href: "/accounts", icon: Wallet, label: "nav.accounts" },
  { href: "/transactions", icon: Receipt, label: "nav.transactions" },
  { href: "/transfers", icon: ArrowLeftRight, label: "nav.transfers" },
  { href: "/import", icon: Upload, label: "nav.import" },
  { href: "/budgets", icon: PiggyBank, label: "nav.budgets", disabled: true },
  { href: "/debts", icon: HandCoins, label: "nav.debts", disabled: true },
  { href: "/gam3eya", icon: Users, label: "nav.gam3eya", disabled: true },
  { href: "/settings", icon: Settings, label: "nav.settings" },
];
```

- [ ] **Add nav.import translation keys**

In `en.json` → `nav` section: `"import": "Import"`
In `ar.json` → `nav` section: `"import": "استيراد"`

- [ ] **Add Import button to Account Detail page**

In `frontend/src/app/(app)/accounts/[id]/page.tsx`, find the action buttons section (where "Add Transaction" or similar buttons live) and add an Import button:

```tsx
// Add import to imports at top of file:
import { useRouter } from "next/navigation";

// Inside the component, add:
const router = useRouter();

// In the action buttons area, add alongside the existing button(s):
<Button
  variant="outline"
  size="sm"
  onClick={() => router.push(`/import?accountId=${accountId}`)}
>
  <Upload className="size-4 me-2" />
  Import
</Button>
```

> Read the current account detail page first to find the exact insertion point.
> Do NOT add Upload import if it's already there.

- [ ] **Commit**

```bash
git add frontend/src/lib/nav-items.ts \
        frontend/src/app/(app)/accounts/[id]/page.tsx \
        frontend/src/messages/en.json frontend/src/messages/ar.json
git commit -m "feat(import): sidebar nav entry + account detail import button"
```

---

## Task 10: Build check and final verification

- [ ] **Run TypeScript type check**

```bash
cd frontend && pnpm exec tsc --noEmit
```

Expected: 0 errors (fix any that appear)

- [ ] **Run linter**

```bash
cd frontend && pnpm lint
```

Expected: 0 errors (fix any that appear)

- [ ] **Run production build**

```bash
cd frontend && pnpm build
```

Expected: build succeeds with no errors

- [ ] **Run backend tests (no regressions)**

```bash
cd backend && uv run pytest -v --tb=short
```

Expected: all PASSED

- [ ] **Audit for physical directional CSS** (CLAUDE.md rule — must have zero)

```bash
cd frontend && grep -rn "pl-\|pr-\|ml-\|mr-\|left-\|right-\|text-left\|text-right" src/components/import/ src/app/\(app\)/import/
```

Expected: no matches. If any found, replace with logical equivalents:
- `pl-` → `ps-`, `pr-` → `pe-`
- `ml-` → `ms-`, `mr-` → `me-`
- `left-` → `start-`, `right-` → `end-`

- [ ] **Final commit**

```bash
git add -A
git commit -m "chore(import): build clean, zero physical CSS, all checks pass"
```

---

## Done

Unit 2C is complete. The import wizard is fully built and integrated.

**Phase 2 is now complete across all three units.**

PR sequence:
1. Open PR for `feature/2a-import-backend` → merge to main
2. Open PR for `feature/2b-import-templates` (rebased on main after 2A merges)
3. Open PR for `feature/2c-import-wizard` (rebased on main after 2B merges)
