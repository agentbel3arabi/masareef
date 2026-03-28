"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { type Locale } from "@/i18n/config";

export function LocaleToggle() {
  const locale = useLocale();
  const router = useRouter();

  const toggleLocale = () => {
    const next: Locale = locale === "ar" ? "en" : "ar";
    let cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;SameSite=Lax`;
    if (typeof window !== "undefined" && window.location.protocol === "https:") {
      cookie += ";Secure";
    }
    document.cookie = cookie;
    router.refresh();
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleLocale}>
      <span className="text-sm font-medium">
        {locale === "ar" ? "EN" : "ع"}
      </span>
      <span className="sr-only">
        {locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      </span>
    </Button>
  );
}
