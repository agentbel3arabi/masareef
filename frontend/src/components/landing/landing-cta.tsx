"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function LandingCta() {
  const t = useTranslations("landing");
  const quoteTranslation = t("cta.quoteTranslation");

  return (
    <section id="about" className="px-6 py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
        {/* Left column: text + action */}
        <div className="space-y-6">
          <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
            {t("cta.title")}
          </h2>
          <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
            {t("cta.description")}
          </p>
          <div className="space-y-2">
            <Button
              size="lg"
              className="px-8 py-4 text-base font-semibold"
              nativeButton={false}
              render={<Link href="/signup" />}
            >
              {t("cta.button")}
            </Button>
            <p className="text-sm text-muted-foreground">{t("cta.subtext")}</p>
          </div>
        </div>

        {/* Right column: Arabic proverb */}
        <div className="rounded-2xl bg-primary/10 p-8 md:p-10">
          <blockquote
            className="text-xl font-semibold leading-relaxed text-primary md:text-2xl"
            dir="rtl"
          >
            &ldquo;{t("cta.quote")}&rdquo;
          </blockquote>
          {quoteTranslation && (
            <p className="mt-3 text-sm italic text-muted-foreground">
              — {quoteTranslation}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
