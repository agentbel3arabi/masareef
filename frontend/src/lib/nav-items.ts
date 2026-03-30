import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Receipt,
  HandCoins,
  PiggyBank,
  Settings,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "nav.dashboard" },
  { href: "/accounts", icon: Wallet, label: "nav.accounts" },
  { href: "/transactions", icon: Receipt, label: "nav.transactions" },
  { href: "/transfers", icon: ArrowLeftRight, label: "nav.transfers" },
  { href: "/budgets", icon: PiggyBank, label: "nav.budgets", disabled: true },
  { href: "/debts", icon: HandCoins, label: "nav.debts", disabled: true },
  { href: "/gam3eya", icon: Users, label: "nav.gam3eya", disabled: true },
  { href: "/settings", icon: Settings, label: "nav.settings" },
];
