import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";

// Mock api-client before importing hooks
vi.mock("@/lib/api-client", () => ({
  apiGet: vi.fn().mockResolvedValue({ data: null }),
}));

import { apiGet } from "@/lib/api-client";
import {
  useIncomeVsExpenses,
  useSpendingByCategory,
  useNetWorthTrend,
  useStatCards,
} from "../use-dashboard";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useIncomeVsExpenses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls apiGet with correct endpoint and default params", async () => {
    renderHook(() => useIncomeVsExpenses(), { wrapper: createWrapper() });
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    expect(apiGet).toHaveBeenCalledWith(
      "/api/v1/dashboard/income-vs-expenses"
    );
  });

  it("passes months and base_currency as query params", async () => {
    renderHook(
      () => useIncomeVsExpenses({ months: 6, base_currency: "EGP" }),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    const calledPath = (apiGet as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledPath).toContain("months=6");
    expect(calledPath).toContain("base_currency=EGP");
  });
});

describe("useSpendingByCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls apiGet with correct endpoint", async () => {
    renderHook(() => useSpendingByCategory(), { wrapper: createWrapper() });
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    expect(apiGet).toHaveBeenCalledWith(
      "/api/v1/dashboard/spending-by-category"
    );
  });

  it("passes base_currency as query param", async () => {
    renderHook(() => useSpendingByCategory({ base_currency: "USD" }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    const calledPath = (apiGet as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledPath).toContain("base_currency=USD");
  });
});

describe("useNetWorthTrend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls apiGet with correct endpoint", async () => {
    renderHook(() => useNetWorthTrend(), { wrapper: createWrapper() });
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    expect(apiGet).toHaveBeenCalledWith("/api/v1/dashboard/net-worth-trend");
  });

  it("passes months param", async () => {
    renderHook(() => useNetWorthTrend({ months: 12 }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    const calledPath = (apiGet as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledPath).toContain("months=12");
  });
});

describe("useStatCards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls apiGet with correct endpoint", async () => {
    renderHook(() => useStatCards(), { wrapper: createWrapper() });
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    expect(apiGet).toHaveBeenCalledWith("/api/v1/dashboard/stat-cards");
  });

  it("passes base_currency as query param", async () => {
    renderHook(() => useStatCards({ base_currency: "EUR" }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    const calledPath = (apiGet as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledPath).toContain("base_currency=EUR");
  });
});
