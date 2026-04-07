"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, Eye, EyeOff } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsDuplicateEmail(false);
    setResendSuccess(false);

    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setLoading(true);

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
          <h1 className="text-2xl font-semibold">{t("auth.confirmTitle")}</h1>
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
        <h1 className="text-2xl font-semibold">{t("auth.createAccount")}</h1>
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
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pe-9"
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
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
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pe-9"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
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
              className={`flex-1 py-2 text-sm font-normal transition-colors ${
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
              className={`flex-1 py-2 text-sm font-normal transition-colors ${
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

        {/* "or continue with" divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {t("auth.orContinueWith")}
            </span>
          </div>
        </div>

        {/* Social buttons — disabled, coming soon */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            disabled
            className="w-full gap-2 opacity-50 cursor-not-allowed"
            title={t("auth.comingSoon")}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled
            className="w-full gap-2 opacity-50 cursor-not-allowed"
            title={t("auth.comingSoon")}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" fill="currentColor" />
            </svg>
            Apple
          </Button>
        </div>

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
