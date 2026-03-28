"use client";

import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/shared/logo";

export function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="md:hidden">
        <Logo variant="icon" width={28} height={28} />
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        {/* LocaleToggle will be added in Task 3 */}
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
