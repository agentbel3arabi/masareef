"use client";

import {
  useMutation,
  UseMutationOptions,
  UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api-client";

interface UseApiMutationOptions<TData, TVariables, TOnMutateResult = unknown>
  extends Omit<
    UseMutationOptions<TData, Error, TVariables, TOnMutateResult>,
    "mutationFn"
  > {
  mutationFn: (variables: TVariables) => Promise<TData>;
  successMessage?: string;
  errorMessage?: string;
}

export function useApiMutation<TData, TVariables = void, TOnMutateResult = unknown>(
  options: UseApiMutationOptions<TData, TVariables, TOnMutateResult>
): UseMutationResult<TData, Error, TVariables, TOnMutateResult> {
  const t = useTranslations("toast");
  const { successMessage, errorMessage, onSuccess, onError, ...rest } = options;

  return useMutation<TData, Error, TVariables, TOnMutateResult>({
    ...rest,
    onSuccess: (data, variables, onMutateResult, context) => {
      if (successMessage) toast.success(successMessage);
      onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      const message =
        error instanceof ApiError ? error.message : (errorMessage ?? t("error"));
      toast.error(message);
      onError?.(error, variables, onMutateResult, context);
    },
  });
}
