# Phase 1.75 — Wave 2a: Auth & Onboarding Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the visual layer of the Login, Signup, and Onboarding pages to match the approved Stitch screens, while preserving all authentication and onboarding business logic exactly.

**Architecture:** Three pages (auth layout + login, signup, onboarding) are updated in-place. One new shared component `StepIndicator` is extracted. All auth logic (Supabase signIn/signUp/resend, duplicate email detection, household creation, account creation) is untouched. The auth layout marketing panel switches from green gradient to dark navy `#0F172A` per the Stitch design spec. No new backend endpoints. No new routes.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind CSS v4, shadcn/ui base-nova, next-intl, Supabase auth client

---

## Scope Note

This plan covers **Wave 2a only**. Waves 2b (app pages) and 2c (landing) are sequential and require their own plans after this wave merges to main.

**Branch:** `feature/1.75-auth-redesign` — cut from main after Wave 1 PR #28 is confirmed merged.

**Stitch Reference Screens (corrected — stitch-project-reference.md has wrong IDs):**

| Screen label | Correct Screen ID | Stitch title |
|---|---|---|
| 02-login | `c2ea537171594ca39b08c4a077de79e3` | Masareef Login |
| 03-registration | `80b7dcaa5303411cb95e128248ccb005` | Masareef Registration |
| 04-onboarding | `30df2965eecd4ce9a37fa9297c3bdfb2` | Onboarding Wizard - Add First Account |

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `docs/superpowers/plans/phase-1.75/stitch-project-reference.md` | Modify | Fix incorrect screen ID ↔ label mappings |
| `frontend/messages/en.json` | Modify | Add: welcomeBack, signIn, orContinueWith, comingSoon, createAccount, startJourney, confirmPassword, passwordMismatch, passwordStrength.*, marketing.feature4; update marketingHeadline, loginSubtitle |
| `frontend/messages/ar.json` | Modify | Arabic translations for all new/changed keys |
| `frontend/src/app/(auth)/layout.tsx` | Modify | Dark navy `#0F172A` panel, 2×2 feature card grid |
| `frontend/src/app/(auth)/login/page.tsx` | Modify | "Welcome back" heading, icon inputs, password visibility toggle, forgot password (disabled), "Sign In" button, social buttons (disabled/coming soon) |
| `frontend/src/app/(auth)/signup/page.tsx` | Modify | "Create Account" heading, confirm password field, password strength bar, remove gender/age fields |
| `frontend/src/components/onboarding/step-indicator.tsx` | Create | Numbered step circles with labels + connecting lines |
| `frontend/src/app/(onboarding)/onboarding/page.tsx` | Modify | Replace dot progress with StepIndicator |

---

## ~~Task 1: Fix stitch-project-reference.md~~ — ALREADY DONE

> The reference file was moved to `docs/stitch-designs/stitch-project-reference.md` and corrected (screen IDs were cyclic-shifted in the original). CLAUDE.md updated. This task is complete before Wave 2a begins — skip it.

---

## Task 2: Add auth i18n keys

**Files:**
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

New keys required by the redesigned auth and signup pages. All existing keys are preserved; only additions and two value updates.

- [ ] **Step 1: Update English keys**

In `frontend/messages/en.json`, inside the `"auth"` object:

**Update two existing values:**
```json
"marketingHeadline": "Your entire financial life, finally making sense.",
"loginSubtitle": "Sign in to your account to continue",
```

**Add after `"alreadyRegistered"`:**
```json
"welcomeBack": "Welcome back",
"signIn": "Sign In",
"orContinueWith": "or continue with",
"comingSoon": "Coming soon",
"createAccount": "Create Account",
"startJourney": "Start your journey to financial precision today.",
"confirmPassword": "Confirm Password",
"passwordMismatch": "Passwords do not match",
"passwordStrength": {
  "label": "Password strength",
  "weak": "Weak",
  "medium": "Medium",
  "strong": "Strong"
},
```

**Add `feature4` inside the existing `"marketing"` object:**
```json
"feature4": "Shared wallets and budget goals for your whole household"
```

- [ ] **Step 2: Update Arabic keys**

In `frontend/messages/ar.json`, inside the `"auth"` object:

**Update two existing values:**
```json
"marketingHeadline": "حسبة بيتك، متظبطة بالملي.",
"loginSubtitle": "سجّل دخولك إلى حسابك للمتابعة",
```

**Add after `"alreadyRegistered"` equivalent:**
```json
"welcomeBack": "أهلاً بعودتك",
"signIn": "تسجيل الدخول",
"orContinueWith": "أو تابع عبر",
"comingSoon": "قريباً",
"createAccount": "إنشاء حساب",
"startJourney": "ابدأ رحلتك نحو الدقة المالية اليوم.",
"confirmPassword": "تأكيد كلمة المرور",
"passwordMismatch": "كلمتا المرور غير متطابقتين",
"passwordStrength": {
  "label": "قوة كلمة المرور",
  "weak": "ضعيفة",
  "medium": "متوسطة",
  "strong": "قوية"
},
```

**Add `feature4` inside the existing `"marketing"` object in AR:**
```json
"feature4": "محافظ مشتركة وأهداف ميزانية لأسرتك بالكامل"
```

- [ ] **Step 3: TypeScript check (next-intl validates keys at build)**

```bash
cd frontend && pnpm exec tsc --noEmit 2>&1 | grep -i error | head -20
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/messages/en.json frontend/messages/ar.json
git commit -m "feat(i18n): add auth redesign keys — social buttons, password strength, brand tagline in marketing panel"
```

---

## Task 3: Redesign auth layout (dark navy panel)

**Files:**
- Modify: `frontend/src/app/(auth)/layout.tsx`

**What changes:** The marketing panel background switches from green gradient to dark navy `#0F172A`. The 3-bullet feature list becomes a 2×2 card grid with icons. Logo and split layout are preserved. The Logo already uses `colorScheme="dark"` which renders the white variant — no change needed there.

- [ ] **Step 1: Replace auth layout**

Full file content for `frontend/src/app/(auth)/layout.tsx`:

```tsx
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
          <Logo variant="horizontal" width={240} height={96} colorScheme="dark" />
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
```

- [ ] **Step 2: Build check**

```bash
cd frontend && pnpm build 2>&1 | tail -20
```

Expected: exits 0, no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(auth\)/layout.tsx
git commit -m "feat(auth): redesign marketing panel — dark navy #0F172A, 2×2 feature card grid, brand tagline"
```

---

## Task 4: Redesign login page

**Files:**
- Modify: `frontend/src/app/(auth)/login/page.tsx`

**What changes from current:**
- Heading: `t("auth.welcomeBack")` → "Welcome back" (was "Log In")
- Subtitle: uses updated `loginSubtitle`
- Email field: wrapped in relative div with `Mail` icon prefix
- Password field: wrapped in relative div with eye/eye-off toggle button (RTL-safe: `end-3`)
- "Forgot password?" rendered as disabled span with `title` tooltip (no backend endpoint yet)
- Submit button: `t("auth.signIn")` (was `t("auth.login")`)
- "or continue with" divider added below button
- Google + Apple social buttons: disabled, `opacity-50`, `cursor-not-allowed`, `title={t("auth.comingSoon")}`

**What is preserved exactly:** `handleLogin`, `supabase.auth.signInWithPassword`, `window.location.href = "/dashboard"`, error state, loading state.

- [ ] **Step 1: Replace login page**

Full file content for `frontend/src/app/(auth)/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("auth.welcomeBack")}</h1>
        <p className="text-sm text-muted-foreground">{t("auth.loginSubtitle")}</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <div className="relative">
            <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ps-9"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <span
              className="text-xs text-muted-foreground cursor-not-allowed select-none"
              title={t("auth.comingSoon")}
              aria-label={t("auth.comingSoon")}
            >
              {t("auth.forgotPassword")}
            </span>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pe-9"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("common.loading") : t("auth.signIn")}
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
            {/* Google G logo */}
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
            {/* Apple logo */}
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" fill="currentColor" />
            </svg>
            Apple
          </Button>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          {t("auth.noAccount")}{" "}
          <Link href="/signup" className="text-primary hover:underline">
            {t("auth.signup")}
          </Link>
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd frontend && pnpm build 2>&1 | tail -20
```

Expected: exits 0, no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(auth\)/login/page.tsx
git commit -m "feat(auth): redesign login page — welcome back, icon inputs, password toggle, coming-soon social buttons"
```

---

## Task 5: Redesign signup page

**Files:**
- Modify: `frontend/src/app/(auth)/signup/page.tsx`

**What changes from current:**
- Heading: `t("auth.createAccount")` (was `t("auth.signup")` = "Sign Up")
- Subtitle: `t("auth.startJourney")`
- Added `confirmPassword` field and client-side match validation
- Added password strength bar (Weak < 8 chars, Medium 8–11, Strong 12+)
- Removed `gender` and `age` state + fields (not in Stitch design; both were optional metadata)
- Submit button: `t("auth.createAccount")` with `<ArrowRight />` icon

**What is preserved exactly:** `handleSignup`, `handleResend`, `supabase.auth.signUp`, `supabase.auth.resend`, duplicate email detection logic (`identities?.length === 0`), `showConfirmation` state, `resendSuccess/resendLoading` state, all existing i18n keys, `firstName/lastName/email/password/lang/country` fields.

- [ ] **Step 1: Replace signup page**

Full file content for `frontend/src/app/(auth)/signup/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Build check**

```bash
cd frontend && pnpm build 2>&1 | tail -20
```

Expected: exits 0, no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(auth\)/signup/page.tsx
git commit -m "feat(auth): redesign signup — Create Account heading, confirm password, strength bar, remove gender/age"
```

---

## Task 6: Create StepIndicator component

**Files:**
- Create: `frontend/src/components/onboarding/step-indicator.tsx`

The current onboarding page uses simple CSS dot indicators. The Stitch 04-onboarding design shows numbered step circles with text labels and horizontal connecting lines between steps.

- [ ] **Step 1: Create component**

New file `frontend/src/components/onboarding/step-indicator.tsx`:

```tsx
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  /** Step label strings, one per step. Array index + 1 = step number. */
  steps: string[];
  /** Current active step, 1-indexed. */
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex w-full items-start">
      {steps.map((label, i) => {
        const stepNumber = i + 1;
        const isDone = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <div key={stepNumber} className="flex flex-1 flex-col items-center relative">
            {/* Connecting line before this step (not before first) */}
            {i > 0 && (
              <div
                className={cn(
                  "absolute top-4 end-1/2 w-full h-0.5",
                  isDone ? "bg-primary" : "bg-muted"
                )}
              />
            )}

            {/* Step circle */}
            <div
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                isDone && "bg-primary text-primary-foreground",
                isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                !isDone && !isCurrent && "bg-muted text-muted-foreground"
              )}
            >
              {isDone ? <Check className="h-4 w-4" /> : stepNumber}
            </div>

            {/* Step label */}
            <span
              className={cn(
                "mt-2 text-center text-xs font-medium leading-tight max-w-[80px]",
                isCurrent ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && pnpm exec tsc --noEmit 2>&1 | grep -i error | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/onboarding/step-indicator.tsx
git commit -m "feat(onboarding): add StepIndicator — numbered circles with labels and connecting lines"
```

---

## Task 7: Update onboarding page to use StepIndicator

**Files:**
- Modify: `frontend/src/app/(onboarding)/onboarding/page.tsx`

Replace the three lines of dot-progress markup with `<StepIndicator>`. All step state, mutation logic, error handling, and child components are unchanged.

- [ ] **Step 1: Add import to onboarding page**

In `frontend/src/app/(onboarding)/onboarding/page.tsx`, add after the existing Button import:

```tsx
import { StepIndicator } from "@/components/onboarding/step-indicator";
```

- [ ] **Step 2: Replace dot progress with StepIndicator**

Replace the entire `{/* Progress dots */}` block:

```tsx
      {/* Progress dots */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all ${
              s === step ? "w-8 bg-primary" : s < step ? "w-2 bg-primary/50" : "w-2 bg-muted"
            }`}
          />
        ))}
      </div>
```

With:

```tsx
      <StepIndicator
        steps={[
          t("step1.title"),
          t("step2.title"),
          t("step3.title"),
          t("step4.title"),
        ]}
        currentStep={step}
      />
```

Note: The onboarding page already calls `useTranslations("onboarding")` as `t`, so `t("step1.title")` resolves to `onboarding.step1.title`. This is already defined in both `en.json` and `ar.json`.

- [ ] **Step 3: Build check**

```bash
cd frontend && pnpm build 2>&1 | tail -20
```

Expected: exits 0, no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/\(onboarding\)/onboarding/page.tsx
git commit -m "feat(onboarding): replace dot progress with StepIndicator — numbered steps with labels"
```

---

## Task 8: Final checks + PR

- [ ] **Step 1: Full lint, type check, build**

```bash
cd frontend && pnpm lint && pnpm exec tsc --noEmit && pnpm build
```

Expected: all three pass, no errors, no warnings that block CI

- [ ] **Step 2: Manual RTL check (dev server)**

```bash
cd frontend && pnpm dev
```

Open `http://localhost:3000/ar/login`, `http://localhost:3000/ar/signup`, `http://localhost:3000/ar/onboarding` and verify:

- Login: Arabic text renders, email icon on start side, password toggle on end side
- Signup: All fields render in RTL, confirm password works, strength bar fills from start
- Onboarding: Step indicator labels in Arabic, connecting lines between steps

- [ ] **Step 3: Manual responsive check (375px)**

At 375px:
- Login/Signup: shows form only (marketing panel hidden, stacked logo shows at top of form)
- Onboarding: StepIndicator fits on narrow screen (4 steps may be tight — labels should wrap, not overflow)

If onboarding steps overflow at 375px, add `text-[10px]` to the label span's className:

```tsx
"mt-2 text-center text-[10px] font-medium leading-tight max-w-[70px]"
```

- [ ] **Step 4: Push and open PR**

```bash
git push -u origin feature/1.75-auth-redesign
```

PR title: `feat(1.75): Wave 2a — Auth & Onboarding Redesign`
Base: `main`

PR body checklist:
- [ ] Login page matches Stitch 02-login (dark navy panel, "Welcome back", icon inputs, social buttons coming-soon)
- [ ] Signup page matches Stitch 03-registration (Create Account, confirm password, password strength bar)
- [ ] Onboarding wizard matches Stitch 04-onboarding (StepIndicator with numbered circles + labels)
- [ ] All auth flows tested: login → dashboard, signup → confirm email → login → onboarding → dashboard
- [ ] Marketing panel uses brand tagline from i18n (brand.ts-aligned)
- [ ] Logo uses white variant on dark navy panel (existing colorScheme="dark" preserved)
- [ ] `pnpm lint` passes
- [ ] `pnpm exec tsc --noEmit` passes
- [ ] `pnpm build` passes
- [ ] RTL Arabic renders correctly on all 3 pages
- [ ] Responsive at 375px (form-only view)

---

## Self-Review Against Spec

**Spec section 3 (Branding):**
- `brand.ts` already created in Wave 1 ✓
- `auth.marketingHeadline` updated to match brand tagline — Task 2 ✓
- Logo white variant on dark navy — auth layout already uses `colorScheme="dark"` ✓

**Spec section 5 Wave 2a (Auth Marketing Panel):**
- Left panel dark navy `#0F172A` — Task 3 ✓
- Logo: white variant — existing colorScheme="dark" ✓
- Feature bullet points with icons — 2×2 grid with Lucide icons — Task 3 ✓
- Tagline from brand config / i18n — Task 2 + Task 3 ✓
- Right panel: form on white/surface background — unchanged ✓

**Spec acceptance criteria Wave 2a:**
- Login matches 02-login — Tasks 3+4 ✓
- Signup matches 03-registration — Task 5 ✓
- Onboarding wizard matches 04-onboarding — Tasks 6+7 ✓
- Auth flows preserved — logic untouched ✓
- Taglines from brand config — Task 2 ✓
- RTL Arabic — logical CSS properties throughout, manual check in Task 8 ✓
- Dark mode — no static colors added except `#0F172A` panel (intentional) ✓
- Responsive 375/768/1280 — marketing panel hidden at <md, check in Task 8 ✓
- `pnpm build` + `pnpm lint` + `tsc --noEmit` — verified per-task and in Task 8 ✓

**Stitch reference fix:** Task 1 ✓ (ID mismatch discovered during plan prep, fixed before implementation)

**Coming soon policy (spec section 9):**
- Forgot password: disabled span with tooltip — Task 4 ✓
- Google/Apple social login: disabled buttons with title tooltip — Task 4 ✓
- No backend-dependencies.md entries needed for Wave 2a (auth social login is a known Phase 5+ feature)
