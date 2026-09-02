import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";

export interface Transaction {
  id: number;
  account_id: number;
  date: string;
  description: string;
  amount_minor: number;
  currency: string;
  type: string;
  category?: {
    id: number;
    name_en: string;
    name_ar: string | null;
    color: string | null;
    icon: string | null;
    is_system?: boolean;
  } | null;
  is_split: boolean;
  transfer_id: string | null;
  asset_id: number | null;
  ai_categorized: boolean;
  ai_confidence: number | null;
  notes: string | null;
  applies_to_balance: boolean;
}

export interface TransactionFilters {
  account_id?: number;
  q?: string;
  type?: string;
  category_id?: number;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  has_category?: boolean;
  needs_review?: boolean;
  sort?: string;
  page?: number;
  page_size?: number;
}

export interface CreateTransactionInput {
  account_id: number;
  date: string;
  description?: string;
  amount_minor: number;
  type: string;
  currency: string;
  category_id?: number;
  notes?: string;
}

export function useTransactions(filters: TransactionFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const queryString = params.toString();
  const path = `/api/v1/transactions${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: () => apiGet<Transaction[]>(path),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (data: CreateTransactionInput) =>
      apiPost<Transaction>("/api/v1/transactions", data),
    successMessage: t("transactionCreated"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (id: number) => apiDelete(`/api/v1/transactions/${id}`),
    successMessage: t("transactionDeleted"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export interface UpdateTransactionInput {
  id: number;
  date?: string;
  description?: string;
  amount_minor?: number;
  type?: string;
  category_id?: number | null;
  notes?: string;
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: ({ id, ...body }: UpdateTransactionInput) =>
      apiPut<Transaction>(`/api/v1/transactions/${id}`, body),
    successMessage: t("transactionUpdated"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export interface BulkDeleteInput {
  ids: number[];
}

export interface BulkCategorizeInput {
  ids: number[];
  category_id: number;
}

export function useBulkDeleteTransactions() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (data: BulkDeleteInput) =>
      apiPost<{ deleted: number }>("/api/v1/transactions/bulk/delete", data),
    successMessage: t("bulkDeleted"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useBulkCategorizeTransactions() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (data: BulkCategorizeInput) =>
      apiPost<{ updated: number }>("/api/v1/transactions/bulk/categorize", data),
    successMessage: t("bulkCategorized"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
