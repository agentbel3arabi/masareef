"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Receipt,
  HandCoins,
  PiggyBank,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "nav.dashboard" },
  { href: "/accounts", icon: Wallet, label: "nav.accounts" },
  { href: "/transactions", icon: Receipt, label: "nav.transactions" },
  { href: "/transfers", icon: ArrowLeftRight, label: "nav.transfers" },
  { href: "/debts", icon: HandCoins, label: "nav.debts" },
  { href: "/budgets", icon: PiggyBank, label: "nav.budgets" },
  { href: "/settings", icon: Settings, label: "nav.settings" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-e bg-card">
      <div className="flex h-16 items-center px-6 border-b">
        <h1 className="text-xl font-bold">{t("common.appName")}</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {t(item.label)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
