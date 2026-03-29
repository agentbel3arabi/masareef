"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo, LOGO_SIZES } from "@/components/shared/logo";

const PRODUCT_LINKS = [
  { key: "features", href: "#features" },
  { key: "pricing", href: "#pricing" },
  { key: "gam3eyaTracker", href: "#" },
  { key: "debtCalculator", href: "#" },
] as const;

const COMPANY_LINKS = [
  { key: "about", href: "#about" },
  { key: "contact", href: "#" },
  { key: "privacy", href: "#" },
  { key: "terms", href: "#" },
] as const;

export function LandingFooter() {
  const t = useTranslations("landing");
  const [email, setEmail] = useState("");

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast(t("footer.newsletterToast"));
    setEmail("");
  };

  return (
    <footer className="bg-muted/80 px-6 pt-16 pb-8">
      <div className="mx-auto max-w-7xl">
        {/* Main grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Brand column */}
          <div className="space-y-4">
            <Logo
              variant="horizontal"
              {...LOGO_SIZES.landingFooter}
            />
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("footer.description")}
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider">
              {t("footer.product")}
            </h4>
            <ul className="space-y-2">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {t(`footer.${link.key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider">
              {t("footer.company")}
            </h4>
            <ul className="space-y-2">
              {COMPANY_LINKS.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {t(`footer.${link.key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider">
              {t("footer.newsletter")}
            </h4>
            <p className="mb-4 text-sm text-muted-foreground">
              {t("footer.newsletterDesc")}
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder={t("footer.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ps-9"
                  required
                />
              </div>
              <Button type="submit" size="default">
                {t("footer.join")}
              </Button>
            </form>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 border-t pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t("footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
