"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Wallet } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAccounts } from "@/hooks/use-accounts";
import { formatAmount, formatAmountAr } from "@/lib/money";
import { navItems } from "@/lib/nav-items";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("commandPalette");
  const tNav = useTranslations();
  const locale = useLocale();

  const { data: accountsData } = useAccounts();
  const accounts = accountsData?.data ?? [];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const navigate = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  const fmt = (amount: number, currency: string) =>
    locale === "ar"
      ? formatAmountAr(amount, currency)
      : formatAmount(amount, currency);

  const activeNavItems = navItems.filter((i) => !i.disabled);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t("placeholder")} />
      <CommandList>
        <CommandEmpty>{t("noResults")}</CommandEmpty>
        <CommandGroup heading={t("pages")}>
          {activeNavItems.map((item) => (
            <CommandItem key={item.href} onSelect={() => navigate(item.href)}>
              <item.icon className="me-2 h-4 w-4" />
              {tNav(item.label)}
            </CommandItem>
          ))}
        </CommandGroup>
        {accounts.length > 0 && (
          <CommandGroup heading={t("accounts")}>
            {accounts.slice(0, 5).map((acct) => (
              <CommandItem
                key={acct.id}
                onSelect={() => navigate(`/accounts/${acct.id}`)}
              >
                <Wallet className="me-2 h-4 w-4" />
                <span className="flex-1">{acct.name}</span>
                <span className="text-xs text-muted-foreground">
                  {fmt(acct.displayed_balance_minor, acct.currency)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
