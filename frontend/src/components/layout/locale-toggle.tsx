"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { type Locale } from "@/i18n/config";
import { setLocaleCookie } from "@/lib/locale";

export function LocaleToggle() {
  const locale = useLocale();
  const router = useRouter();

  const toggleLocale = () => {
    const next: Locale = locale === "ar" ? "en" : "ar";
    setLocaleCookie(next);
    router.refresh();
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleLocale}>
      <span className="text-sm font-normal">
        {locale === "ar" ? "EN" : "ع"}
      </span>
      <span className="sr-only">
        {locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      </span>
    </Button>
  );
}
