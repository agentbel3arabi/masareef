"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { navItems } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function MobileNavDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const t = useTranslations();

  // Close drawer on navigation by tracking which pathname the sheet was opened on.
  // If pathname has changed since the sheet was opened, treat it as closed.
  const [openedAtPath, setOpenedAtPath] = useState<string | null>(null);
  const isOpen = open && openedAtPath === pathname;

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setOpenedAtPath(pathname);
    } else {
      setOpenedAtPath(null);
    }
    setOpen(next);
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open navigation</span>
          </Button>
        }
      />
      <SheetContent side="start" className="w-64 p-0">
        <div className="flex h-16 items-center px-6 border-b">
          <Link href="/dashboard" onClick={() => handleOpenChange(false)}>
            <Logo variant="horizontal" width={120} height={28} />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleOpenChange(false)}
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
      </SheetContent>
    </Sheet>
  );
}
