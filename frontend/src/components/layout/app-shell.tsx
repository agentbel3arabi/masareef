"use client";

import { type ReactNode } from "react";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { NavbarActionsProvider } from "@/contexts/navbar-actions-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { ErrorBoundary } from "@/components/shared/error-boundary";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <NavbarActionsProvider>
      <SidebarProvider>
        <div className="flex h-screen bg-[#f7f9fb] dark:bg-background">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Navbar />
            <main className="flex-1 overflow-auto p-6">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </NavbarActionsProvider>
  );
}
