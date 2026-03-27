"use client";

import { useTranslations } from "next-intl";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function Navbar() {
  const t = useTranslations();
  const { user, signOut } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="md:hidden">
        <h1 className="text-lg font-bold">{t("common.appName")}</h1>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {user && (
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
