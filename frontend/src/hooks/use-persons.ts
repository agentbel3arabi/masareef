import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import type {
  PersonResponse,
  PersonCreateInput,
  PersonUpdateInput,
} from "@/lib/types/debts";

export function usePersons() {
  return useQuery({
    queryKey: ["persons"],
    queryFn: () => apiGet<PersonResponse[]>("/api/v1/persons"),
  });
}

export function usePerson(id: number) {
  return useQuery({
    queryKey: ["persons", id],
    queryFn: () => apiGet<PersonResponse>(`/api/v1/persons/${id}`),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (data: PersonCreateInput) =>
      apiPost<PersonResponse>("/api/v1/persons", data),
    successMessage: t("personCreated"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
    },
  });
}

export function useUpdatePerson() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: ({ id, ...body }: PersonUpdateInput & { id: number }) =>
      apiPut<PersonResponse>(`/api/v1/persons/${id}`, body),
    successMessage: t("personUpdated"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();
  const t = useTranslations("toast");
  return useApiMutation({
    mutationFn: (id: number) => apiDelete(`/api/v1/persons/${id}`),
    successMessage: t("personDeleted"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
    },
  });
}
