import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createWrapper } from "@/test/test-utils";

// Mock the API client
vi.mock("@/lib/api-client", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock Supabase client (needed by api-client indirectly)
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  }),
}));

import { apiGet } from "@/lib/api-client";
import { useAccounts } from "@/hooks/use-accounts";

const mockApiGet = vi.mocked(apiGet);

describe("useAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns loading state initially", () => {
    mockApiGet.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useAccounts(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("returns data after successful fetch", async () => {
    const mockAccounts = [
      {
        id: 1,
        name: "Test Account",
        type: "bank_account",
        currency: "EGP",
        displayed_balance_minor: 100000,
        is_active: true,
      },
    ];
    mockApiGet.mockResolvedValue({ data: mockAccounts });

    const { result } = renderHook(() => useAccounts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toEqual(mockAccounts);
  });

  it("returns error state on failed fetch", async () => {
    mockApiGet.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAccounts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it("calls apiGet with correct path", async () => {
    mockApiGet.mockResolvedValue({ data: [] });

    renderHook(() => useAccounts(), { wrapper: createWrapper() });

    await waitFor(() => expect(mockApiGet).toHaveBeenCalledWith("/api/v1/accounts"));
  });
});
