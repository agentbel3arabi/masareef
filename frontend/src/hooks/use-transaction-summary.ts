"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";

interface TransactionSummary {
  total_income: number;
  total_expenses: number;
  net_flow: number;
  transaction_count: number;
  currency: string;
  period: { start: string; end: string };
}

interface SummaryParams {
  period?: string;
  start_date?: string;
  end_date?: string;
  account_id?: number;
  currency?: string;
}

export function useTransactionSummary(params: SummaryParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.period) searchParams.set("period", params.period);
  if (params.start_date) searchParams.set("start_date", params.start_date);
  if (params.end_date) searchParams.set("end_date", params.end_date);
  if (params.account_id)
    searchParams.set("account_id", String(params.account_id));
  if (params.currency) searchParams.set("currency", params.currency);
  const qs = searchParams.toString();

  return useQuery({
    queryKey: ["transaction-summary", params],
    queryFn: () =>
      apiGet<TransactionSummary>(
        `/api/v1/transactions/summary${qs ? `?${qs}` : ""}`
      ),
  });
}
