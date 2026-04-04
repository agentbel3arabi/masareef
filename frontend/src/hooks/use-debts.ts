import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import type {
  DebtResponse,
  DebtCreateInput,
  DebtUpdateInput,
  DebtType,
  DebtStatus,
  PaymentCreate,
  PaymentResponse,
  ScheduleRow,
  MatchSuggestion,
  P2PDebtSplitResponse,
  BulkPastPaymentRequest,
  BulkPastPaymentResponse,
  BulkPaymentRequest,
  BulkPaymentResponse,
} from "@/lib/types/debts";

export function useDebts(params?: { type?: DebtType; status?: DebtStatus }) {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set("type", params.type);
  if (params?.status) searchParams.set("status", params.status);
  const qs = searchParams.toString();
  const path = `/api/v1/debts${qs ? `?${qs}` : ""}`;

  return useQuery({
    queryKey: ["debts", params?.type ?? "all", params?.status ?? "all"],
    queryFn: () => apiGet<DebtResponse[]>(path),
  });
}

export function useDebt(id: number) {
  return useQuery({
    queryKey: ["debts", id],
    queryFn: () => apiGet<DebtResponse>(`/api/v1/debts/${id}`),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreateDebt() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (data: DebtCreateInput) =>
      apiPost<DebtResponse>("/api/v1/debts", data),
    successMessage: t("debtCreated"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useUpdateDebt() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: ({ id, ...body }: DebtUpdateInput & { id: number }) =>
      apiPut<DebtResponse>(`/api/v1/debts/${id}`, body),
    successMessage: t("debtUpdated"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
    },
  });
}

export function useDeleteDebt() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: ({
      id,
      deleteTransactions,
    }: {
      id: number;
      deleteTransactions?: boolean;
    }) => {
      const params = deleteTransactions ? "?delete_transactions=true" : "";
      return apiDelete(`/api/v1/debts/${id}${params}`);
    },
    successMessage: t("debtDeleted"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useAmortizationSchedule(debtId: number) {
  return useQuery({
    queryKey: ["debts", debtId, "amortization"],
    queryFn: () =>
      apiGet<ScheduleRow[]>(
        `/api/v1/debts/${debtId}/amortization`
      ),
    enabled: Number.isFinite(debtId) && debtId > 0,
  });
}

export function useDebtPayments(debtId: number) {
  return useQuery({
    queryKey: ["debts", debtId, "payments"],
    queryFn: () =>
      apiGet<PaymentResponse[]>(`/api/v1/debts/${debtId}/payments`),
    enabled: Number.isFinite(debtId) && debtId > 0,
  });
}

export function useRecordPayment(debtId: number) {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (data: PaymentCreate) =>
      apiPost<PaymentResponse>(`/api/v1/debts/${debtId}/payments`, data),
    successMessage: t("paymentRecorded"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useMatchSuggestions(debtId: number) {
  return useQuery({
    queryKey: ["debts", debtId, "match-suggestions"],
    queryFn: () =>
      apiGet<MatchSuggestion[]>(
        `/api/v1/debts/${debtId}/match-suggestions`
      ),
    enabled: Number.isFinite(debtId) && debtId > 0,
  });
}

export function useMarkDebtPaid() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (id: number) =>
      apiPost<DebtResponse>(`/api/v1/debts/${id}/mark-paid`, {}),
    successMessage: t("debtMarkedPaid"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useReactivateDebt() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (id: number) =>
      apiPost<DebtResponse>(`/api/v1/debts/${id}/reactivate`, {}),
    successMessage: t("debtReactivated"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useDebtSplits(debtId: number) {
  return useQuery({
    queryKey: ["debts", debtId, "splits"],
    queryFn: () =>
      apiGet<P2PDebtSplitResponse[]>(`/api/v1/debts/${debtId}/splits`),
    enabled: Number.isFinite(debtId) && debtId > 0,
  });
}

export function useBulkPastPayments(debtId: number) {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (data: BulkPastPaymentRequest) =>
      apiPost<BulkPastPaymentResponse>(
        `/api/v1/debts/${debtId}/bulk-past-payments`,
        data
      ),
    successMessage: t("bulkPastPaymentsRecorded"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useBulkPayment() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (data: BulkPaymentRequest) =>
      apiPost<BulkPaymentResponse>("/api/v1/debts/bulk-payment", data),
    successMessage: t("bulkPaymentRecorded"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
