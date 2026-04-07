import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock all dependencies that AppShell uses
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
  useParams: () => ({}),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
    },
  }),
}));

vi.mock("@/contexts/sidebar-context", () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-provider">{children}</div>,
  useSidebar: () => ({ collapsed: false, toggle: vi.fn() }),
}));

vi.mock("@/contexts/navbar-actions-context", () => ({
  NavbarActionsProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/layout/sidebar", () => ({
  Sidebar: () => <nav data-testid="sidebar">Sidebar</nav>,
}));

vi.mock("@/components/layout/navbar", () => ({
  Navbar: () => <header data-testid="navbar">Navbar</header>,
}));

vi.mock("@/components/shared/error-boundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/shared/command-palette", () => ({
  CommandPalette: () => null,
}));

import { AppShell } from "@/components/layout/app-shell";

describe("AppShell", () => {
  it("renders sidebar", () => {
    render(<AppShell><p>Page content</p></AppShell>);
    const sidebars = screen.getAllByTestId("sidebar");
    expect(sidebars.length).toBeGreaterThanOrEqual(1);
  });

  it("renders navbar", () => {
    render(<AppShell><p>Page content</p></AppShell>);
    const navbars = screen.getAllByTestId("navbar");
    expect(navbars.length).toBeGreaterThanOrEqual(1);
  });

  it("renders children in main content area", () => {
    render(<AppShell><p>Page content</p></AppShell>);
    const contents = screen.getAllByText("Page content");
    expect(contents.length).toBeGreaterThanOrEqual(1);
  });

  it("renders skip-to-content link", () => {
    render(<AppShell><p>Content</p></AppShell>);
    const skipLinks = screen.getAllByText("skipToContent");
    expect(skipLinks.length).toBeGreaterThanOrEqual(1);
    const skipLink = skipLinks[0];
    expect(skipLink.tagName).toBe("A");
    expect(skipLink).toHaveAttribute("href", "#main");
  });
});
