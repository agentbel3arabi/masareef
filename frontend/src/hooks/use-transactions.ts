import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api-client";

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
  } | null;
  is_split: boolean;
  transfer_id: string | null;
  asset_id: number | null;
  ai_categorized: boolean;
  ai_confidence: number | null;
  notes: string | null;
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
  return useMutation({
    mutationFn: (data: CreateTransactionInput) =>
      apiPost<Transaction>("/api/v1/transactions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/api/v1/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
