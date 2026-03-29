"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PricingPlan {
  nameKey: string;
  priceKey: string;
  periodKey: string;
  featureKeys: string[];
  ctaKey: string;
  highlighted?: boolean;
}

const plans: PricingPlan[] = [
  {
    nameKey: "pricing.free",
    priceKey: "pricing.freePrice",
    periodKey: "pricing.freePeriod",
    featureKeys: [
      "pricing.freeFeature1",
      "pricing.freeFeature2",
      "pricing.freeFeature3",
    ],
    ctaKey: "pricing.freeCta",
  },
  {
    nameKey: "pricing.premium",
    priceKey: "pricing.premiumPrice",
    periodKey: "pricing.premiumPeriod",
    featureKeys: [
      "pricing.premiumFeature1",
      "pricing.premiumFeature2",
      "pricing.premiumFeature3",
      "pricing.premiumFeature4",
      "pricing.premiumFeature5",
    ],
    ctaKey: "pricing.premiumCta",
    highlighted: true,
  },
  {
    nameKey: "pricing.business",
    priceKey: "pricing.businessPrice",
    periodKey: "pricing.businessPeriod",
    featureKeys: [
      "pricing.businessFeature1",
      "pricing.businessFeature2",
      "pricing.businessFeature3",
      "pricing.businessFeature4",
    ],
    ctaKey: "pricing.businessCta",
  },
];

export function LandingPricing() {
  const t = useTranslations("landing");

  return (
    <section id="pricing" className="bg-muted/50 px-6 py-20">
      <div className="mx-auto max-w-7xl">
        {/* Heading */}
        <div className="mb-14 space-y-4 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
            {t("pricing.title")}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {t("pricing.subtitle")}
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.nameKey}
              className={`relative flex flex-col rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md ${
                plan.highlighted
                  ? "scale-105 border-primary shadow-lg"
                  : "border-border"
              }`}
            >
              {/* Most Popular badge */}
              {plan.highlighted && (
                <div className="absolute inset-inline-0 -top-3 mx-auto w-fit rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">
                  {t("pricing.mostPopular")}
                </div>
              )}

              {/* Plan name */}
              <h3 className="mb-4 text-xl font-bold">{t(plan.nameKey as Parameters<typeof t>[0])}</h3>

              {/* Price */}
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight">
                  {t(plan.priceKey as Parameters<typeof t>[0])}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t(plan.periodKey as Parameters<typeof t>[0])}
                </span>
              </div>

              {/* Divider */}
              <div className="mb-6 border-t" />

              {/* Features */}
              <ul className="mb-8 flex-1 space-y-3">
                {plan.featureKeys.map((featureKey) => (
                  <li key={featureKey} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {t(featureKey as Parameters<typeof t>[0])}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                className="w-full"
                variant={plan.highlighted ? "default" : "outline"}
                render={<Link href="/signup" />}
              >
                {t(plan.ctaKey as Parameters<typeof t>[0])}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
