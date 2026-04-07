"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronsLeft, ChevronsRight, CircleHelp, Clock, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo, LOGO_SIZES } from "@/components/shared/logo";
import { navItems } from "@/lib/nav-items";
import { useSidebar } from "@/contexts/sidebar-context";
import { useAuth } from "@/hooks/use-auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const NAV_SECTIONS: { label: string; items: typeof navItems }[] = [
  {
    label: "nav.sectionOverview",
    items: navItems.filter((i) => i.href === "/dashboard"),
  },
  {
    label: "nav.sectionFinance",
    items: navItems.filter((i) =>
      ["/accounts", "/transactions", "/transfers", "/import"].includes(i.href)
    ),
  },
  {
    label: "nav.sectionPlanning",
    items: navItems.filter((i) =>
      ["/budgets", "/debts", "/people", "/gam3eya"].includes(i.href)
    ),
  },
  {
    label: "nav.sectionSettings",
    items: navItems.filter((i) => i.href === "/settings"),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useLocale();
  const { collapsed, toggle } = useSidebar();
  const { signOut } = useAuth();
  const isRtl = locale === "ar";
  const CollapseIcon = isRtl ? ChevronsRight : ChevronsLeft;
  const ExpandIcon = isRtl ? ChevronsLeft : ChevronsRight;

  return (
    <aside
      className={cn(
        "hidden md:flex md:flex-col bg-card transition-all duration-200",
        collapsed ? "md:w-16" : "md:w-64"
      )}
    >
      {/* Logo row — same h-16 as navbar */}
      <div
        className={cn(
          "flex h-16 items-center",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        <Link href="/dashboard">
          {collapsed ? (
            <Logo variant="icon" width={28} height={28} />
          ) : (
            <Logo variant="horizontal" {...LOGO_SIZES.sidebar} />
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={toggle}
            aria-label={t("nav.collapseSidebar")}
            title={t("nav.collapseSidebar")}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <CollapseIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Brand tagline — below logo */}
      {!collapsed && (
        <div className="px-4 pb-3">
          <p className="text-[10px] text-muted-foreground/80 font-normal uppercase tracking-wider">
            {t("brand.tagline")}
          </p>
        </div>
      )}

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="flex justify-center py-2">
          <button
            onClick={toggle}
            aria-label={t("nav.expandSidebar")}
            title={t("nav.expandSidebar")}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ExpandIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            {!collapsed && (
              <p className="px-4 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {t(section.label)}
              </p>
            )}
            <div
              className={cn(
                "space-y-0.5",
                collapsed ? "px-1" : "px-2"
              )}
            >
              {section.items.map((item) => {
                const isActive =
                  !item.disabled && pathname.startsWith(item.href);

                if (item.disabled) {
                  return (
                    <TooltipProvider key={item.href}>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <span
                              className={cn(
                                "flex items-center rounded-lg text-sm text-muted-foreground/40 cursor-not-allowed",
                                collapsed
                                  ? "justify-center px-2 py-2"
                                  : "gap-3 px-3 py-2"
                              )}
                            />
                          }
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && (
                            <>
                              <span className="flex-1 truncate">{t(item.label)}</span>
                              <Clock className="h-3.5 w-3.5" />
                            </>
                          )}
                        </TooltipTrigger>
                        <TooltipContent side="inline-end">
                          <p>{t(item.disabledTooltip ?? "nav.comingSoon")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-label={collapsed ? t(item.label) : undefined}
                    title={collapsed ? t(item.label) : undefined}
                    className={cn(
                      "flex items-center rounded-lg text-sm transition-colors",
                      collapsed
                        ? "justify-center px-2 py-2"
                        : "gap-3 px-3 py-2 border-s-2",
                      isActive
                        ? collapsed
                          ? "bg-primary/10 text-primary font-normal"
                          : "border-primary bg-primary/10 text-primary font-normal"
                        : collapsed
                          ? "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          : "border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && t(item.label)}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section: Help + Logout */}
      <div
        className={cn(
          "mt-auto py-2",
          collapsed ? "px-1" : "px-2"
        )}
      >
        {/* TODO: Replace with real help page route when available */}
        <Link
          href="/settings"
          aria-label={collapsed ? t("sidebar.help") : undefined}
          title={collapsed ? t("sidebar.help") : undefined}
          className={cn(
            "flex items-center rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
            collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2"
          )}
        >
          <CircleHelp className="h-4 w-4 shrink-0" />
          {!collapsed && t("sidebar.help")}
        </Link>
        <button
          onClick={() => void signOut()}
          aria-label={collapsed ? t("nav.signOut") : undefined}
          title={collapsed ? t("nav.signOut") : undefined}
          className={cn(
            "flex w-full items-center rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors",
            collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && t("nav.signOut")}
        </button>
      </div>
    </aside>
  );
}
