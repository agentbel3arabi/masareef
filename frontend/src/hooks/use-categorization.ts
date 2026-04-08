import { useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/api-client";
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
