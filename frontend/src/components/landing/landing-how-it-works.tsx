"use client";

import { useTranslations } from "next-intl";

const steps: { num: string; titleKey: string; descKey: string }[] = [
  { num: "1", titleKey: "howItWorks.step1Title", descKey: "howItWorks.step1Desc" },
  { num: "2", titleKey: "howItWorks.step2Title", descKey: "howItWorks.step2Desc" },
  { num: "3", titleKey: "howItWorks.step3Title", descKey: "howItWorks.step3Desc" },
];

export function LandingHowItWorks() {
  const t = useTranslations("landing");

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        {/* Heading */}
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
            {t("howItWorks.title")}
          </h2>
        </div>

        {/* Steps grid */}
        <div className="relative grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {/* Connector line (desktop only) */}
          <div
            aria-hidden="true"
            className="absolute start-0 end-0 top-6 hidden h-px bg-border md:block"
          />

          {steps.map(({ num, titleKey, descKey }) => (
            <div key={num} className="relative flex flex-col items-center text-center">
              {/* Numbered circle */}
              <div className="relative z-10 mb-5 flex size-12 items-center justify-center rounded-full bg-green-500 text-lg font-extrabold text-white shadow-md">
                {num}
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
