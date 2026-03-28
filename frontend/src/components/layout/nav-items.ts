import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Receipt,
  HandCoins,
  PiggyBank,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "nav.dashboard" },
  { href: "/accounts", icon: Wallet, label: "nav.accounts" },
  { href: "/transactions", icon: Receipt, label: "nav.transactions" },
  { href: "/transfers", icon: ArrowLeftRight, label: "nav.transfers" },
  { href: "/debts", icon: HandCoins, label: "nav.debts" },
  { href: "/budgets", icon: PiggyBank, label: "nav.budgets" },
  { href: "/settings", icon: Settings, label: "nav.settings" },
];
