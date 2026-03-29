"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users } from "lucide-react";

export function LandingHero() {
  const t = useTranslations("landing");

  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 md:grid-cols-2 md:gap-16">
        {/* Text column */}
        <div className="space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <span className="size-2 animate-pulse rounded-full bg-primary" />
            {t("hero.badge")}
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight lg:text-6xl">
            {t("hero.headline1")}
            <br />
            {t("hero.headline2")}
            <br />
            <span className="text-primary">{t("hero.headline3")}</span>
          </h1>

          {/* Arabic tagline */}
          <p className="text-2xl font-bold text-primary">
            {t("hero.arabicTagline")}
          </p>

          {/* Description */}
          <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
            {t("hero.description")}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 pt-2">
            <Button
              size="lg"
              className="px-8 py-4 text-base font-semibold"
              render={<Link href="/signup" />}
            >
              {t("hero.ctaPrimary")}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-4 text-base font-semibold"
              render={<a href="#features" />}
            >
              {t("hero.ctaSecondary")}
            </Button>
          </div>
        </div>

        {/* Mockup column */}
        <div className="relative flex items-center justify-center md:min-h-[480px]">
          {/* Main glass card */}
          <div className="relative w-full overflow-hidden rounded-3xl border border-border/50 bg-card/80 p-6 shadow-2xl backdrop-blur-sm">
            {/* Gradient overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />

            {/* Balance header */}
            <div className="relative mb-6 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {t("hero.mockupBalance")}
                </p>
                <h3 className="text-3xl font-extrabold tracking-tight">
                  {t("hero.mockupAmount")}
                </h3>
              </div>
              <div className="flex items-center gap-1 font-bold text-primary">
                <TrendingUp className="size-4" />
                +12%
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-primary/10">
                <div className="h-full w-3/4 rounded-full bg-primary" />
              </div>
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>{t("hero.mockupGoal")}</span>
                <span>{t("hero.mockupProgress")}</span>
              </div>
            </div>
          </div>

          {/* Floating Gam3eya card */}
          <div className="absolute -bottom-4 -start-4 hidden rounded-xl border border-border/50 bg-card/90 p-4 shadow-xl backdrop-blur-sm md:block">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  {t("hero.mockupGam3eya")}
                </p>
                <p className="text-sm font-bold">
                  {t("hero.mockupPayout")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
