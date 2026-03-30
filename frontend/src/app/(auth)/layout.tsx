import { getTranslations } from "next-intl/server";
import { Building2, Brain, DollarSign, Users } from "lucide-react";
import { Logo } from "@/components/shared/logo";

const FEATURE_ICONS = [Building2, Brain, DollarSign, Users] as const;

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("auth");

  const features = [
    { icon: FEATURE_ICONS[0], key: "feature1" },
    { icon: FEATURE_ICONS[1], key: "feature2" },
    { icon: FEATURE_ICONS[2], key: "feature3" },
    { icon: FEATURE_ICONS[3], key: "feature4" },
  ] as const;

  return (
    <div className="flex min-h-screen">
      {/* Left marketing panel — hidden below md */}
      <div className="hidden md:flex md:w-3/5 flex-col justify-between bg-[#0F172A] p-12 text-white">
        <div>
          <Logo variant="horizontal" width={320} height={128} colorScheme="dark" />
        </div>
        <div className="space-y-10">
          <div>
            <h1 className="text-4xl font-bold leading-tight">
              {t("marketingHeadline")}
            </h1>
            <p className="mt-3 text-lg text-white/70">{t("marketingSubheadline")}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {features.map(({ icon: Icon, key }) => (
              <div key={key} className="flex items-start gap-3 rounded-xl bg-white/5 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-white/80 leading-snug">
                  {t(`marketing.${key}`)}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-white/40">© {new Date().getFullYear()} Masareef</p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex justify-center md:hidden">
            <Logo variant="stacked" width={160} height={106} />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
