"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Settings, Moon, Sun, Globe, LogOut } from "lucide-react";
import { MobileNavDrawer } from "./mobile-nav-drawer";
import { LocaleToggle } from "./locale-toggle";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo, LOGO_SIZES } from "@/components/shared/logo";
import { type Locale } from "@/i18n/config";

export function Navbar() {
  const { user, signOut } = useAuth();
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const initials = (() => {
    const meta = user?.user_metadata;
    if (meta?.first_name && meta?.last_name) {
      return `${meta.first_name[0]}${meta.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  })();

  const displayName = (() => {
    const meta = user?.user_metadata;
    if (meta?.first_name && meta?.last_name) {
      return `${meta.first_name} ${meta.last_name}`;
    }
    return user?.email ?? "";
  })();

  const toggleLocale = () => {
    const next: Locale = locale === "ar" ? "en" : "ar";
    let cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;SameSite=Lax`;
    if (typeof window !== "undefined" && window.location.protocol === "https:") {
      cookie += ";Secure";
    }
    document.cookie = cookie;
    router.refresh();
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-2 md:hidden">
        <MobileNavDrawer />
        <Logo variant="icon" {...LOGO_SIZES.mobileNav} />
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar size="default">
                <AvatarFallback className="text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-56">
              <DropdownMenuLabel className="truncate font-normal">
                {displayName}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  render={<Link href="/settings" />}
                >
                  <Settings className="size-4" />
                  {t("settings")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={toggleLocale}>
                  <Globe className="size-4" />
                  {locale === "ar" ? "English" : "العربية"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={toggleTheme}>
                  <Sun className="hidden size-4 dark:inline" />
                  <Moon className="inline size-4 dark:hidden" />
                  {t("toggleTheme")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => void signOut()}
              >
                <LogOut className="size-4" />
                {t("signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <LocaleToggle />
            <ThemeToggle />
          </>
        )}
      </div>
    </header>
  );
}
