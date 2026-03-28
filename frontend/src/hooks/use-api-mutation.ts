"use client";

import { useMutation, UseMutationOptions, UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api-client";

interface UseApiMutationOptions<TData, TVariables>
  extends Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn"> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  successMessage?: string;
  errorMessage?: string;
}

export function useApiMutation<TData, TVariables = void>(
  options: UseApiMutationOptions<TData, TVariables>
): UseMutationResult<TData, Error, TVariables> {
  const t = useTranslations("toast");
  const { successMessage, errorMessage, onSuccess, onError, ...rest } = options;

  return useMutation<TData, Error, TVariables>({
    ...rest,
    onSuccess: (data, variables, context) => {
      if (successMessage) toast.success(successMessage);
      if (onSuccess) {
        // @ts-expect-error TanStack Query v5 onSuccess has 4 params; our simplified 3-param signature needs suppression
        onSuccess(data, variables, undefined, context);
      }
    },
    onError: (error, variables, context) => {
      const message =
        error instanceof ApiError ? error.message : (errorMessage ?? t("error"));
      toast.error(message);
      if (onError) {
        // @ts-expect-error TanStack Query v5 onError has 4 params; our simplified 3-param signature needs suppression
        onError(error, variables, undefined, context);
      }
    },
  });
}
