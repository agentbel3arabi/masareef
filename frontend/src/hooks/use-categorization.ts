import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";

interface CategorizationResult {
  transaction_id: number;
  category_id: number | null;
  confidence: number | null;
  source: string;
}

export interface CategorizeBatchInput {
  transaction_ids: number[];
}

export interface ApproveBatchInput {
  transaction_ids: number[];
}

export interface CorrectCategoryInput {
  transaction_id: number;
  category_id: number;
}

export function useCategorizeBatch() {
  const queryClient = useQueryClient();
  return useApiMutation({
    mutationFn: (data: CategorizeBatchInput) =>
      apiPost<{ results: CategorizationResult[] }>(
        "/api/v1/categorization-rules/categorize-batch",
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useApproveBatch() {
  const queryClient = useQueryClient();
  return useApiMutation({
    mutationFn: (data: ApproveBatchInput) =>
      apiPost<{ approved: number }>(
        "/api/v1/categorization-rules/approve-batch",
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useCorrectCategory() {
  const queryClient = useQueryClient();
  return useApiMutation({
    mutationFn: (data: CorrectCategoryInput) =>
      apiPost<{ ok: boolean }>(
        "/api/v1/categorization-rules/correct",
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Rule CRUD hooks (AICAT-04)
// ---------------------------------------------------------------------------

export interface CategorizationRule {
  id: number;
  household_id: string;
  pattern: string;
  match_type: string;
  category_id: number;
  confidence: number;
  hit_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RuleCreateInput {
  pattern: string;
  match_type?: string;
  category_id: number;
}

interface RuleUpdateInput {
  pattern?: string;
  category_id?: number;
}

export interface AIUsage {
  tokens_used: number;
  monthly_limit: number | null;
  year_month: string;
}

export function useRules(page: number = 1) {
  return useQuery({
    queryKey: ["categorization-rules", { page }],
    queryFn: () =>
      apiGet<CategorizationRule[]>(`/api/v1/categorization-rules?page=${page}`),
  });
}

export function useCreateRule() {
  const queryClient = useQueryClient();
  return useApiMutation<{ data: CategorizationRule }, RuleCreateInput>({
    mutationFn: (data) =>
      apiPost<CategorizationRule>("/api/v1/categorization-rules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorization-rules"] });
    },
  });
}

export function useUpdateRule(ruleId: number) {
  const queryClient = useQueryClient();
  return useApiMutation<{ data: CategorizationRule }, RuleUpdateInput>({
    mutationFn: (data) =>
      apiPut<CategorizationRule>(`/api/v1/categorization-rules/${ruleId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorization-rules"] });
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();
  return useApiMutation<void, number>({
    mutationFn: (ruleId) =>
      apiDelete(`/api/v1/categorization-rules/${ruleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorization-rules"] });
    },
  });
}

export function useAIUsage() {
  return useQuery({
    queryKey: ["ai-usage"],
    queryFn: () =>
      apiGet<AIUsage>("/api/v1/categorization-rules/usage"),
  });
}
