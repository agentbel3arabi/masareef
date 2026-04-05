import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";

export interface Institution {
  id: number;
  slug: string;
  name_en: string;
  name_ar: string;
  type: "bank" | "bnpl" | "digital_wallet_provider";
  logo_url: string | null;
  bic_swift: string | null;
  country: string;
  is_predefined: boolean;
  is_popular: boolean;
}

interface InstitutionListData {
  popular: Institution[];
  all: Institution[];
}

export function useInstitutions(type: string, search?: string) {
  const params = new URLSearchParams({ type });
  if (search) params.set("search", search);
  return useQuery({
    queryKey: ["institutions", type, search],
    queryFn: () =>
      apiGet<InstitutionListData>(
        `/api/v1/financial-institutions?${params.toString()}`
      ),
  });
}

export function useInstitutionSummary(slug: string) {
  return useQuery({
    queryKey: ["institution-summary", slug],
    queryFn: () =>
      apiGet<{
        institution: Institution;
        accounts: unknown[];
        summary: {
          total_assets_minor: number;
          total_liabilities_minor: number;
          total_base_minor: number;
          base_currency: string;
          is_approximate: boolean;
          account_count: number;
        };
      }>(`/api/v1/financial-institutions/${slug}/summary`),
    enabled: !!slug,
  });
}

export function useCreateInstitution() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (data: { name_en: string; name_ar: string; type: string }) =>
      apiPost<Institution>("/api/v1/financial-institutions", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["institutions"] }),
  });
}
