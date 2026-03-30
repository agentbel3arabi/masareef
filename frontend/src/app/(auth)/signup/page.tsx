"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function getPasswordStrength(password: string): "weak" | "medium" | "strong" | null {
  if (!password) return null;
  if (password.length < 8) return "weak";
  if (password.length < 12) return "medium";
  return "strong";
}

export default function SignupPage() {
  const t = useTranslations();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [country, setCountry] = useState("EG");
  const [error, setError] = useState("");
  const [isDuplicateEmail, setIsDuplicateEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    setLoading(true);
    setError("");
    setIsDuplicateEmail(false);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          preferred_language: lang,
          country: country,
        },
      },
    });

    if (error) {
      const isDuplicate = error.message.toLowerCase().includes("already registered");
      setIsDuplicateEmail(isDuplicate);
      setError(isDuplicate ? "" : error.message);
      setLoading(false);
    } else if (data?.user?.identities?.length === 0) {
      setIsDuplicateEmail(true);
      setLoading(false);
    } else {
      setShowConfirmation(true);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    setError("");
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
    setResendLoading(false);
    if (resendError) {
      setError(resendError.message);
      return;
    }
    setResendSuccess(true);
  };

  if (showConfirmation) {
    return (
      <div className="flex flex-col items-center text-center space-y-6 py-4">
        <CheckCircle className="w-16 h-16 text-primary" aria-hidden="true" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{t("auth.confirmTitle")}</h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            {t("auth.confirmDescription", { email })}
          </p>
        </div>
        <Button render={<Link href="/login" />} nativeButton={false} className="w-full">
          {t("auth.goToLogin")}
        </Button>
        <div className="text-sm text-muted-foreground">
          {error && <p className="text-destructive mb-2">{error}</p>}
          {resendSuccess ? (
            <span className="text-primary">{t("auth.resendSuccess")}</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="text-primary hover:underline disabled:opacity-50"
            >
              {resendLoading ? t("common.loading") : t("auth.resendEmail")}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("auth.createAccount")}</h1>
        <p className="text-sm text-muted-foreground">{t("auth.startJourney")}</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        {isDuplicateEmail && (
          <div className="text-sm text-center space-y-1">
            <p className="text-destructive">{t("auth.alreadyRegistered")}</p>
            <Link href="/login" className="text-primary hover:underline">
              {t("auth.loginInstead")}
            </Link>
          </div>
        )}
        {error && !isDuplicateEmail && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName">{t("auth.firstName")}</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">{t("auth.lastName")}</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          {passwordStrength && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {(["weak", "medium", "strong"] as const).map((level, i) => (
                  <div
                    key={level}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      passwordStrength === "weak" && i === 0
                        ? "bg-destructive"
                        : passwordStrength === "medium" && i <= 1
                          ? "bg-yellow-500"
                          : passwordStrength === "strong"
                            ? "bg-primary"
                            : "bg-muted"
                    )}
                  />
                ))}
              </div>
              <p
                className={cn(
                  "text-xs",
                  passwordStrength === "weak" && "text-destructive",
                  passwordStrength === "medium" && "text-yellow-600",
                  passwordStrength === "strong" && "text-primary"
                )}
              >
                {t(`auth.passwordStrength.${passwordStrength}`)}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="country">{t("auth.country")}</Label>
          <select
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm"
          >
            <option value="EG">🇪🇬 Egypt</option>
            <option value="SA">🇸🇦 Saudi Arabia</option>
            <option value="AE">🇦🇪 UAE</option>
            <option value="KW">🇰🇼 Kuwait</option>
            <option value="BH">🇧🇭 Bahrain</option>
            <option value="QA">🇶🇦 Qatar</option>
            <option value="OTHER">🌍 Other</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label>{t("auth.preferredLanguage")}</Label>
          <div className="flex rounded-lg border overflow-hidden">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                lang === "en"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              🇺🇸 English
            </button>
            <button
              type="button"
              onClick={() => setLang("ar")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                lang === "ar"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              🇪🇬 العربية
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full gap-2" disabled={loading}>
          {loading ? (
            t("common.loading")
          ) : (
            <>
              {t("auth.createAccount")}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          {t("auth.hasAccount")}{" "}
          <Link href="/login" className="text-primary hover:underline">
            {t("auth.login")}
          </Link>
        </p>
      </form>
    </div>
  );
}
