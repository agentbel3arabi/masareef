import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), prefetch: vi.fn() }),
}));

// Create a controllable auth state change mock
let authCallback: ((event: string, session: { user: unknown } | null) => void) | null = null;
const mockSignOut = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: vi.fn((cb: (event: string, session: { user: unknown } | null) => void) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }),
      signOut: mockSignOut,
    },
  }),
}));

import { useAuth } from "@/hooks/use-auth";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authCallback = null;
  });

  it("starts with loading=true and user=null", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it("sets user when auth state changes with session", async () => {
    const { result } = renderHook(() => useAuth());

    const mockUser = { id: "user-123", email: "test@example.com" };

    act(() => {
      authCallback?.("SIGNED_IN", { user: mockUser });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toEqual(mockUser);
    });
  });

  it("sets user to null when session is null", async () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      authCallback?.("INITIAL_SESSION", null);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  it("redirects to /login on SIGNED_OUT", async () => {
    renderHook(() => useAuth());

    act(() => {
      authCallback?.("SIGNED_OUT", null);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("signOut calls supabase signOut", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useAuth());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
