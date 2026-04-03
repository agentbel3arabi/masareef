import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type { AccountObligationsResponse } from "@/lib/types/obligations";

export function useAccountObligations(accountId: number) {
  return useQuery({
    queryKey: ["accounts", accountId, "obligations"],
    queryFn: () =>
      apiGet<AccountObligationsResponse>(
        `/api/v1/accounts/${accountId}/obligations`
      ),
    enabled: Number.isFinite(accountId) && accountId > 0,
  });
}
