"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type {
  IncomeVsExpensesMonth,
  SpendingByCategory,
  NetWorthTrendPoint,
  StatCardsData,
} from "@/lib/types/dashboard";

export function useIncomeVsExpenses(params: { months?: number; base_currency?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.months) searchParams.set("months", String(params.months));
  if (params.base_currency) searchParams.set("base_currency", params.base_currency);
  const qs = searchParams.toString();

  return useQuery({
    queryKey: ["dashboard", "income-vs-expenses", params],
    queryFn: () =>
      apiGet<IncomeVsExpensesMonth[]>(
        `/api/v1/dashboard/income-vs-expenses${qs ? `?${qs}` : ""}`
      ),
    staleTime: 60_000,
  });
}

export function useSpendingByCategory(params: { base_currency?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.base_currency) searchParams.set("base_currency", params.base_currency);
  const qs = searchParams.toString();

  return useQuery({
    queryKey: ["dashboard", "spending-by-category", params],
    queryFn: () =>
      apiGet<SpendingByCategory[]>(
        `/api/v1/dashboard/spending-by-category${qs ? `?${qs}` : ""}`
      ),
    staleTime: 60_000,
  });
}

export function useNetWorthTrend(params: { months?: number; base_currency?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.months) searchParams.set("months", String(params.months));
  if (params.base_currency) searchParams.set("base_currency", params.base_currency);
  const qs = searchParams.toString();

  return useQuery({
    queryKey: ["dashboard", "net-worth-trend", params],
    queryFn: () =>
      apiGet<NetWorthTrendPoint[]>(
        `/api/v1/dashboard/net-worth-trend${qs ? `?${qs}` : ""}`
      ),
    staleTime: 60_000,
  });
}

export function useStatCards(params: { base_currency?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.base_currency) searchParams.set("base_currency", params.base_currency);
  const qs = searchParams.toString();

  return useQuery({
    queryKey: ["dashboard", "stat-cards", params],
    queryFn: () =>
      apiGet<StatCardsData>(
        `/api/v1/dashboard/stat-cards${qs ? `?${qs}` : ""}`
      ),
    staleTime: 60_000,
  });
}
