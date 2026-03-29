"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo, LOGO_SIZES } from "@/components/shared/logo";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { type Locale } from "@/i18n/config";
import { setLocaleCookie } from "@/lib/locale";

const NAV_LINKS = [
  { href: "#features", key: "features" },
  { href: "#pricing", key: "pricing" },
  { href: "#about", key: "about" },
] as const;

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("landing");
  const locale = useLocale();
  const router = useRouter();

  const toggleLocale = () => {
    const next: Locale = locale === "ar" ? "en" : "ar";
    setLocaleCookie(next);
    router.refresh();
  };

  return (
    <nav className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo + desktop nav links */}
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="Masareef">
            <Logo
              variant="horizontal"
              {...LOGO_SIZES.landing}
            />
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.key}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {t(`nav.${link.key}`)}
              </a>
            ))}
          </div>
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 sm:flex">
          <Button variant="ghost" size="icon" onClick={toggleLocale}>
            <span className="text-sm font-medium">
              {locale === "ar" ? "EN" : "\u0639"}
            </span>
            <span className="sr-only">
              {locale === "ar" ? "Switch to English" : "\u0627\u0644\u062a\u0628\u062f\u064a\u0644 \u0625\u0644\u0649 \u0627\u0644\u0639\u0631\u0628\u064a\u0629"}
            </span>
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>
            {t("nav.signIn")}
          </Button>
          <Button nativeButton={false} render={<Link href="/signup" />}>
            {t("nav.getStarted")}
          </Button>
        </div>

        {/* Mobile hamburger */}
        <div className="flex items-center gap-2 sm:hidden">
          <Button variant="ghost" size="icon" onClick={toggleLocale}>
            <span className="text-sm font-medium">
              {locale === "ar" ? "EN" : "\u0639"}
            </span>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon">
                  <Menu className="size-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              }
            />
            <SheetContent side="start" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-16 items-center border-b px-6">
                <Link href="/" onClick={() => setOpen(false)}>
                  <Logo variant="horizontal" width={120} height={48} />
                </Link>
              </div>
              <div className="flex flex-col gap-1 p-4">
                {NAV_LINKS.map((link) => (
                  <SheetClose
                    key={link.key}
                    render={
                      <a
                        href={link.href}
                        className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      />
                    }
                  >
                    {t(`nav.${link.key}`)}
                  </SheetClose>
                ))}
              </div>
              <div className="flex flex-col gap-2 border-t p-4">
                <Button
                  variant="outline"
                  className="w-full"
                  nativeButton={false}
                  render={<Link href="/login" onClick={() => setOpen(false)} />}
                >
                  {t("nav.signIn")}
                </Button>
                <Button
                  className="w-full"
                  nativeButton={false}
                  render={<Link href="/signup" onClick={() => setOpen(false)} />}
                >
                  {t("nav.getStarted")}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
