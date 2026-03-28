"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { navItems } from "@/components/layout/nav-items";

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  };

  return (
    <aside
      className={cn(
        "hidden md:flex md:flex-col border-e bg-card transition-all duration-200",
        collapsed ? "md:w-16" : "md:w-64"
      )}
    >
      {/* Header with logo + toggle */}
      <div className="flex h-16 items-center border-b px-3">
        {!collapsed && (
          <Link href="/dashboard" className="flex-1">
            <Logo variant="horizontal" width={140} height={32} />
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="flex flex-1 justify-center">
            <Logo variant="icon" width={28} height={28} />
          </Link>
        )}
        <button
          onClick={toggleCollapsed}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground ms-auto"
          aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? t(item.label) : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                collapsed && "justify-center",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{t(item.label)}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
