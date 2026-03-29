import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/shared/logo";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-screen">
      {/* Left marketing panel — hidden below md */}
      <div className="hidden md:flex md:w-3/5 flex-col justify-between bg-gradient-to-br from-primary/80 via-primary to-primary/60 p-12 text-white">
        <div>
          <Logo variant="horizontal" width={240} height={96} colorScheme="dark" />
        </div>
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold leading-tight">
              {t("marketingHeadline")}
            </h1>
            <p className="mt-3 text-lg text-white/80">{t("marketingSubheadline")}</p>
          </div>
          <ul className="space-y-4">
            {(["feature1", "feature2", "feature3"] as const).map((key) => (
              <li key={key} className="flex items-start gap-3">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs">
                  ✓
                </span>
                <span className="text-white/90 text-sm">{t(`marketing.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/60">© {new Date().getFullYear()} Masareef</p>
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
