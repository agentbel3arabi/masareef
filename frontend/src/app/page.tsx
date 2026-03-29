import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingCta } from "@/components/landing/landing-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
  title: "Masareef — Personal Finance for Egypt & MENA",
  description:
    "Track spending, manage debts, import bank statements, and plan your finances — in Arabic and English.",
  openGraph: {
    title: "Masareef — Your Money, Your Language, Your Rules",
    description:
      "The first personal finance app built for Egyptian and MENA families.",
    type: "website",
    url: "https://masareef.app",
  },
};

export default async function LandingPage() {
  // Redirect authenticated users to dashboard
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingPricing />
      <LandingCta />
      <LandingFooter />
    </div>
  );
}
