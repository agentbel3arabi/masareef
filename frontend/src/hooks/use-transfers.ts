import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api-client";

export interface Transfer {
  transfer_id: string;
  date: string;
  description: string;
  from_account: { id: number; name: string; currency: string };
  to_account: { id: number; name: string; currency: string };
  source_amount: number;
  target_amount: number;
  fx_rate_minor_units: number | null;
}

export interface CreateTransferInput {
  from_account_id: number;
  to_account_id: number;
  amount_minor: number;
  date: string;
  description?: string;
  fx_rate_minor_units?: number;
}

export function useTransfers(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ["transfers", page, pageSize],
    queryFn: () => apiGet<Transfer[]>(`/api/v1/transfers?page=${page}&page_size=${pageSize}`),
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTransferInput) => apiPost("/api/v1/transfers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
