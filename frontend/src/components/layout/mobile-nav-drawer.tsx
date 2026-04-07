"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, Clock } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { navItems } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

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

export function MobileNavDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations();

  // Use pathname as dependency for the controlled component key to force remount on route change
  const key = `drawer-${pathname}`;

  return (
    <Sheet key={key} open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">{t("nav.openNavigation")}</span>
          </Button>
        }
      />
      <SheetContent side="start" className="w-64 p-0">
        <SheetTitle className="sr-only">{t("nav.navigation")}</SheetTitle>
        <div className="flex h-16 items-center px-6 border-b">
          <Link href="/dashboard" onClick={() => setOpen(false)}>
            <Logo variant="horizontal" width={120} height={28} />
          </Link>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-4">
              <p className="px-4 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {t(section.label)}
              </p>
              <div className="space-y-0.5 px-2">
                {section.items.map((item) => {
                  if (item.disabled) {
                    return (
                      <span
                        key={item.href}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/40 cursor-not-allowed"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{t(item.label)}</span>
                        <Clock className="h-3.5 w-3.5" />
                      </span>
                    );
                  }
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-normal"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {t(item.label)}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
