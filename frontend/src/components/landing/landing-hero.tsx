"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Check, ShoppingCart, Briefcase, Phone, Users } from "lucide-react";

const TX_ROWS = [
  { icon: ShoppingCart, label: "mockupTx1", amount: "mockupTx1Amount", color: "text-destructive" },
  { icon: Briefcase, label: "mockupTx2", amount: "mockupTx2Amount", color: "text-emerald-600 dark:text-emerald-400" },
  { icon: Phone, label: "mockupTx3", amount: "mockupTx3Amount", color: "text-destructive" },
] as const;

export function LandingHero() {
  const t = useTranslations("landing");

  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-32">
      {/* Subtle background decoration */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -end-64 -top-32 size-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

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
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                className="px-8 py-4 text-base font-semibold"
                nativeButton={false}
                render={<Link href="/signup" />}
              >
                {t("hero.ctaPrimary")}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="px-8 py-4 text-base font-semibold"
                nativeButton={false}
                render={<a href="#features" />}
              >
                {t("hero.ctaSecondary")}
              </Button>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {([t("hero.trustFree"), t("hero.trustLang"), t("hero.trustNoCard")] as string[]).map(
                (item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <Check className="size-3.5 shrink-0 text-primary" />
                    {item}
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* Mockup column */}
        <div className="relative flex items-center justify-center md:min-h-[480px]">
          {/* Main glass card — mini transaction list */}
          <div className="relative w-full overflow-hidden rounded-3xl border border-border/50 bg-card/80 p-6 shadow-2xl backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />

            <div className="relative">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {t("hero.mockupTxTitle")}
              </p>

              <div className="space-y-3">
                {TX_ROWS.map((tx) => (
                  <div
                    key={tx.label}
                    className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                        <tx.icon className="size-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium">
                        {t(`hero.${tx.label}` as Parameters<typeof t>[0])}
                      </span>
                    </div>
                    <span className={`text-sm font-semibold ${tx.color}`}>
                      {t(`hero.${tx.amount}` as Parameters<typeof t>[0])}
                    </span>
                  </div>
                ))}
              </div>

              {/* Balance summary */}
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {t("hero.mockupBalance")}
                </p>
                <p className="text-lg font-extrabold">{t("hero.mockupAmount")}</p>
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
