import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";

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
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (data: CreateAccountInput) => apiPost<Account>("/api/v1/accounts", data),
    successMessage: t("accountCreated"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (id: number) => apiDelete(`/api/v1/accounts/${id}`),
    successMessage: t("accountDeleted"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export interface NetWorthData {
  by_currency: Record<string, number>;
  total_base_minor: number;
  base_currency: string;
  account_count: number;
}

export function useNetWorth() {
  return useQuery({
    queryKey: ["net-worth"],
    queryFn: () => apiGet<NetWorthData>("/api/v1/accounts/net-worth"),
  });
}

export interface UpdateAccountInput {
  id: number;
  name?: string;
  institution?: string;
  credit_limit?: number;
  billing_cycle_day?: number;
  payment_due_day?: number;
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: ({ id, ...body }: UpdateAccountInput) =>
      apiPut<Account>(`/api/v1/accounts/${id}`, body),
    successMessage: t("accountUpdated"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["net-worth"] });
    },
  });
}
