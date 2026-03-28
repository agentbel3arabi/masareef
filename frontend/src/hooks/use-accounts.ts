import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api-client";

export interface Account {
  id: number;
  name: string;
  type: string;
  currency: string;
  balance_minor: number;
  displayed_balance_minor: number;
  institution: string | null;
  credit_limit: number | null;
  billing_cycle_day: number | null;
  payment_due_day: number | null;
  opened_at: string | null;
  is_active: boolean;
}

export interface CreateAccountInput {
  name: string;
  type: string;
  currency: string;
  initial_balance?: number;
  institution?: string;
  credit_limit?: number;
  billing_cycle_day?: number;
  payment_due_day?: number;
  opened_at?: string;
}

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: () => apiGet<Account[]>("/api/v1/accounts"),
  });
}

export function useAccount(id: number) {
  return useQuery({
    queryKey: ["accounts", id],
    queryFn: () => apiGet<Account>(`/api/v1/accounts/${id}`),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAccountInput) => apiPost<Account>("/api/v1/accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/api/v1/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
