import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";

interface HouseholdStatus {
  has_household: boolean;
}

interface HouseholdCreate {
  name: string;
  base_currency: string;
}

interface Household {
  id: string;
  name: string;
  base_currency: string;
}

export function useHouseholdStatus() {
  return useQuery({
    queryKey: ["household-status"],
    queryFn: () => apiGet<HouseholdStatus>("/api/v1/auth/household-status"),
    retry: false,
  });
}

export function useCreateHousehold() {
  const queryClient = useQueryClient();
  return useApiMutation({
    mutationFn: (data: HouseholdCreate) =>
      apiPost<Household>("/api/v1/households", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household-status"] });
    },
  });
}

export function useUpdateHouseholdSettings() {
  const queryClient = useQueryClient();
  return useApiMutation({
    mutationFn: (data: { base_currency?: string }) =>
      apiPatch<Household>("/api/v1/households", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["net-worth"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
