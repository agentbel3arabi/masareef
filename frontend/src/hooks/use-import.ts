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
