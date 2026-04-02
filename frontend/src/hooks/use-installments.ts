import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import type {
  InstallmentResponse,
  InstallmentCreateInput,
  InstallmentUpdateInput,
  InstallmentType,
  LifecycleStatus,
  FinancingAppsSummary,
} from "@/lib/types/debts";

export function useInstallments(params?: {
  type?: InstallmentType;
  status?: LifecycleStatus;
}) {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set("type", params.type);
  if (params?.status) searchParams.set("status", params.status);
  const qs = searchParams.toString();
  const path = `/api/v1/installments${qs ? `?${qs}` : ""}`;

  return useQuery({
    queryKey: ["installments", params?.type ?? "all", params?.status ?? "all"],
    queryFn: () => apiGet<InstallmentResponse[]>(path),
  });
}

export function useInstallment(id: number) {
  return useQuery({
    queryKey: ["installments", id],
    queryFn: () => apiGet<InstallmentResponse>(`/api/v1/installments/${id}`),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreateInstallment() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (data: InstallmentCreateInput) =>
      apiPost<InstallmentResponse>("/api/v1/installments", data),
    successMessage: t("installmentCreated"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installments"] });
      queryClient.invalidateQueries({ queryKey: ["financing-apps-summary"] });
    },
  });
}

export function useUpdateInstallment() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: ({ id, ...body }: InstallmentUpdateInput & { id: number }) =>
      apiPut<InstallmentResponse>(`/api/v1/installments/${id}`, body),
    successMessage: t("installmentUpdated"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installments"] });
    },
  });
}

export function useDeleteInstallment() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (id: number) => apiDelete(`/api/v1/installments/${id}`),
    successMessage: t("installmentDeleted"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installments"] });
      queryClient.invalidateQueries({ queryKey: ["financing-apps-summary"] });
    },
  });
}

export function useCompleteInstallment() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (id: number) =>
      apiPost<InstallmentResponse>(
        `/api/v1/installments/${id}/complete`,
        {}
      ),
    successMessage: t("installmentCompleted"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installments"] });
      queryClient.invalidateQueries({ queryKey: ["financing-apps-summary"] });
    },
  });
}

export function useFinancingAppsSummary() {
  return useQuery({
    queryKey: ["financing-apps-summary"],
    queryFn: () =>
      apiGet<FinancingAppsSummary>("/api/v1/financing-apps/summary"),
  });
}
