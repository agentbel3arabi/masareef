"use client";

import { type ReactNode } from "react";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { NavbarActionsProvider } from "@/contexts/navbar-actions-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { CommandPalette } from "@/components/shared/command-palette";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <NavbarActionsProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-background focus:text-foreground focus:border focus:rounded-md focus:m-2"
      >
        Skip to content
      </a>
      <CommandPalette />
      <SidebarProvider>
        <div className="flex h-screen bg-surface dark:bg-background">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Navbar />
            <main id="main" className="flex-1 overflow-auto p-6">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </NavbarActionsProvider>
  );
}
