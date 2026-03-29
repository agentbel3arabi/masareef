"use client";

import { ThemeToggle } from "./theme-toggle";
import { LocaleToggle } from "./locale-toggle";
import { MobileNavDrawer } from "./mobile-nav-drawer";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Logo, LOGO_SIZES } from "@/components/shared/logo";

export function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-2 md:hidden">
        <MobileNavDrawer />
        <Logo variant="icon" {...LOGO_SIZES.mobileNav} />
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <LocaleToggle />
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
