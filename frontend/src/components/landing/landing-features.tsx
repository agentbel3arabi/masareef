"use client";

import { useTranslations } from "next-intl";
import { Upload, Brain, CreditCard, Users, Building, Home, type LucideIcon } from "lucide-react";

const features: { icon: LucideIcon; titleKey: string; descKey: string }[] = [
  { icon: Upload, titleKey: "features.bankImport", descKey: "features.bankImportDesc" },
  { icon: Brain, titleKey: "features.aiCategorize", descKey: "features.aiCategorizeDesc" },
  { icon: CreditCard, titleKey: "features.debts", descKey: "features.debtsDesc" },
  { icon: Users, titleKey: "features.gam3eya", descKey: "features.gam3eyaDesc" },
  { icon: Building, titleKey: "features.assets", descKey: "features.assetsDesc" },
  { icon: Home, titleKey: "features.family", descKey: "features.familyDesc" },
];

export function LandingFeatures() {
  const t = useTranslations("landing");

  return (
    <section id="features" className="bg-muted/50 px-6 py-20">
      <div className="mx-auto max-w-7xl">
        {/* Heading */}
        <div className="mb-14 space-y-4 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
            {t("features.title")}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {t("features.subtitle")}
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, titleKey, descKey }) => (
            <div
              key={titleKey}
              className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-6" />
              </div>
              <h3 className="mb-2 font-semibold">{t(titleKey as Parameters<typeof t>[0])}</h3>
              <p className="text-sm text-muted-foreground">
                {t(descKey as Parameters<typeof t>[0])}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
