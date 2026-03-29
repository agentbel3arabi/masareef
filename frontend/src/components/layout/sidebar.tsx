"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Logo, LOGO_SIZES } from "@/components/shared/logo";
import { navItems } from "@/lib/nav-items";

const NAV_SECTIONS: { label: string; items: typeof navItems }[] = [
  {
    label: "nav.sectionOverview",
    items: navItems.filter((i) => i.href === "/dashboard"),
  },
  {
    label: "nav.sectionFinance",
    items: navItems.filter((i) =>
      ["/accounts", "/transactions", "/transfers"].includes(i.href)
    ),
  },
  {
    label: "nav.sectionPlanning",
    items: navItems.filter((i) => ["/debts", "/budgets"].includes(i.href)),
  },
  {
    label: "nav.sectionSettings",
    items: navItems.filter((i) => i.href === "/settings"),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-e bg-card">
      <div className="flex flex-col h-16 justify-center px-6 border-b">
        <Link href="/dashboard">
          <Logo variant="horizontal" {...LOGO_SIZES.sidebar} />
        </Link>
        <p className="text-[11px] text-muted-foreground mt-0.5 font-medium" dir="rtl">
          فلوسك متظبطة بالقرش
        </p>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {t(section.label)}
            </p>
            <div className="space-y-0.5 px-2">
              {section.items.map((item) => {
                const isActive = !item.disabled && pathname.startsWith(item.href);
                if (item.disabled) {
                  return (
                    <span
                      key={item.href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/40 cursor-not-allowed"
                    >
                      <item.icon className="h-4 w-4" />
                      {t(item.label)}
                    </span>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors border-s-2",
                      isActive
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
    </aside>
  );
}
