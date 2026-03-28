# Unit 1I: Design Polish, Logos & Locale Switching — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply Masareef design tokens, integrate brand logos, enable English/LTR via locale toggle, complete i18n sweep of all hardcoded strings, and polish existing pages to match Stitch design patterns.

**Architecture:** Foundation-first approach — update CSS variables and fonts first (all components inherit automatically), then layer on logos, locale infrastructure, i18n keys, and finally page-level visual polish. No new backend work.

**Tech Stack:** Next.js 14.2, next-intl, next-themes, next/font/google, Tailwind CSS, shadcn/ui

**Required reading:** `CLAUDE.md` (RTL rules, coding conventions), `guides/09-design-tokens.md`, `guides/10-brand-assets.md`, `docs/superpowers/specs/2026-03-28-unit-1I-design-polish-design.md`

**Roadmap note:** Locale is stored client-side (cookie + localStorage) in this unit. Phase 17 (Settings) should migrate to a backend `user_preferences.locale` column and sync on login.

---

## File Structure

```
frontend/src/
├── app/
│   ├── globals.css                     # MODIFY: replace all CSS variables with Masareef tokens
│   ├── layout.tsx                      # MODIFY: add Inter + Noto Sans Arabic fonts
│   ├── favicon.ico                     # CREATE: from transparent favicon SVG
│   ├── (auth)/
│   │   ├── layout.tsx                  # MODIFY: add stacked logo above auth card
│   │   ├── login/page.tsx              # no changes (i18n already done)
│   │   └── signup/page.tsx             # no changes (i18n already done)
│   └── (app)/
│       ├── accounts/page.tsx           # MODIFY: add quick transfer button
│       ├── accounts/[id]/page.tsx      # MODIFY: i18n hardcoded strings (after 1H merges)
│       ├── transactions/page.tsx       # MODIFY: i18n hardcoded strings (after 1H merges)
│       └── transfers/page.tsx          # MODIFY: i18n hardcoded strings (after 1H merges)
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx                 # MODIFY: replace text with Logo component
│   │   ├── navbar.tsx                  # MODIFY: add LocaleToggle, replace mobile text with logo icon
│   │   └── locale-toggle.tsx           # CREATE: language switcher button
│   ├── shared/
│   │   └── logo.tsx                    # CREATE: theme-aware logo component
│   ├── accounts/
│   │   ├── account-card.tsx            # MODIFY: add hover lift, polish styling
│   │   └── account-grid.tsx            # MODIFY: add quick transfer button
│   └── transactions/
│       ├── transaction-row.tsx         # MODIFY: i18n, category badge styling (after 1H)
│       ├── transaction-table.tsx       # MODIFY: i18n headers, pagination text (after 1H)
│       ├── transaction-form.tsx        # MODIFY: i18n all labels (after 1H)
│       └── transaction-filters.tsx     # MODIFY: i18n placeholders (after 1H)
├── i18n/
│   └── request.ts                      # MODIFY: read NEXT_LOCALE cookie instead of hardcoded "ar"
├── messages/
│   ├── ar.json                         # MODIFY: add transactions, transfers namespaces
│   └── en.json                         # MODIFY: add transactions, transfers namespaces
└── tailwind.config.ts                  # MODIFY: add font-family, update border-radius tiers
```

---

### Task 1: Design Tokens — CSS Variables & Fonts

**Files:**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/tailwind.config.ts`

- [ ] **Step 1: Replace globals.css with Masareef design tokens**

Replace `frontend/src/app/globals.css` entirely:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 47.4% 11.2%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 47.4% 11.2%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 47.4% 11.2%;
    --primary: 142.1 76.2% 36.3%;
    --primary-foreground: 0 0% 100%;
    --secondary: 210 40% 98%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 98%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 98%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 100%;
    --warning: 37.7 92.1% 50.2%;
    --warning-foreground: 0 0% 100%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 142.1 76.2% 36.3%;
    --radius: 0.625rem;
    --chart-1: 142.1 76.2% 36.3%;
    --chart-2: 215.4 16.3% 46.9%;
    --chart-3: 37.7 92.1% 50.2%;
    --chart-4: 0 84.2% 60.2%;
    --chart-5: 199.4 95.5% 73.9%;
  }

  .dark {
    --background: 222.2 47.4% 11.2%;
    --foreground: 210 40% 98%;
    --card: 217.2 32.6% 17.5%;
    --card-foreground: 210 40% 98%;
    --popover: 217.2 32.6% 17.5%;
    --popover-foreground: 210 40% 98%;
    --primary: 142.1 76.2% 36.3%;
    --primary-foreground: 0 0% 100%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 100%;
    --warning: 37.7 92.1% 50.2%;
    --warning-foreground: 0 0% 100%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 142.1 76.2% 36.3%;
    --chart-1: 142.1 76.2% 36.3%;
    --chart-2: 215 20.2% 65.1%;
    --chart-3: 37.7 92.1% 50.2%;
    --chart-4: 0 84.2% 60.2%;
    --chart-5: 199.4 95.5% 73.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

Color mapping reference (hex → HSL):
- `#16A34A` → `142.1 76.2% 36.3%` (primary emerald)
- `#0F172A` → `222.2 47.4% 11.2%` (slate-900, foreground/dark bg)
- `#F8FAFC` → `210 40% 98%` (slate-50, secondary/muted)
- `#64748B` → `215.4 16.3% 46.9%` (slate-500, muted foreground)
- `#E2E8F0` → `214.3 31.8% 91.4%` (slate-200, border)
- `#1E293B` → `217.2 32.6% 17.5%` (slate-800, dark card)
- `#94A3B8` → `215 20.2% 65.1%` (slate-400, dark muted fg)
- `#EF4444` → `0 84.2% 60.2%` (destructive)
- `#F59E0B` → `37.7 92.1% 50.2%` (warning amber)

Note: `--radius: 0.625rem` = 10px (card-level default). `--border` in dark mode uses alpha notation `0 0% 100% / 0.08` for `rgba(255,255,255,0.08)`.

- [ ] **Step 2: Add Inter + Noto Sans Arabic fonts to layout.tsx**

Replace `frontend/src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter, Noto_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Masareef - مصاريف",
  description: "AI-powered personal finance for MENA",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${notoSansArabic.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Update tailwind.config.ts with font family and border-radius tiers**

Replace `frontend/tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-noto-arabic)", "system-ui", "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 6px)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
```

Key changes from previous config:
- `fontFamily.sans` references the CSS variables from `next/font`
- `borderRadius` tiers adjusted: `lg` = 10px, `md` = 6px (inputs/buttons), `sm` = 4px (badges)
- Added `warning` color token
- All existing color mappings preserved but now resolve to Masareef values via `globals.css`

- [ ] **Step 4: Verify the build compiles**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend && pnpm build
```

Expected: Build succeeds. All pages render with new emerald primary, slate surfaces, Inter + Noto Sans Arabic fonts.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/globals.css frontend/src/app/layout.tsx frontend/tailwind.config.ts
git commit -m "feat(frontend): apply Masareef design tokens — emerald primary, slate surfaces, Inter + Noto Sans Arabic fonts"
```

---

### Task 2: Logo Component & Placement

**Files:**
- Create: `frontend/src/components/shared/logo.tsx`
- Modify: `frontend/src/components/layout/sidebar.tsx`
- Modify: `frontend/src/components/layout/navbar.tsx`
- Modify: `frontend/src/app/(auth)/layout.tsx`

- [ ] **Step 1: Copy logo SVGs to public directory**

```bash
mkdir -p /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend/public/logos
cp /mnt/d/1-Study/In-progress/saas_ideas/masareef/logos/svg/transparent/horizontal-transparent.svg /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend/public/logos/horizontal.svg
cp /mnt/d/1-Study/In-progress/saas_ideas/masareef/logos/svg/transparent/horizontal-transparent-white.svg /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend/public/logos/horizontal-white.svg
cp /mnt/d/1-Study/In-progress/saas_ideas/masareef/logos/svg/transparent/icon-transparent.svg /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend/public/logos/icon.svg
cp /mnt/d/1-Study/In-progress/saas_ideas/masareef/logos/svg/transparent/stacked-transparent.svg /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend/public/logos/stacked.svg
cp /mnt/d/1-Study/In-progress/saas_ideas/masareef/logos/svg/transparent/stacked-transparent-white.svg /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend/public/logos/stacked-white.svg
cp /mnt/d/1-Study/In-progress/saas_ideas/masareef/logos/svg/transparent/favicon-transparent.svg /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend/public/logos/favicon.svg
```

- [ ] **Step 2: Generate favicon.ico from SVG**

```bash
# If ImageMagick is available:
convert /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend/public/logos/favicon.svg -resize 32x32 /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend/src/app/favicon.ico
```

If ImageMagick is not available, copy the SVG as `favicon.svg` into `frontend/src/app/` and add a metadata export in layout.tsx:
```tsx
export const metadata: Metadata = {
  title: "Masareef - مصاريف",
  description: "AI-powered personal finance for MENA",
  icons: { icon: "/logos/favicon.svg" },
};
```

- [ ] **Step 3: Create Logo component**

Create `frontend/src/components/shared/logo.tsx`:
```tsx
"use client";

import Image from "next/image";
import { useTheme } from "next-themes";

interface LogoProps {
  variant: "horizontal" | "stacked" | "icon";
  width: number;
  height: number;
  className?: string;
}

const logoFiles: Record<string, { light: string; dark: string }> = {
  horizontal: {
    light: "/logos/horizontal.svg",
    dark: "/logos/horizontal-white.svg",
  },
  stacked: {
    light: "/logos/stacked.svg",
    dark: "/logos/stacked-white.svg",
  },
  icon: {
    light: "/logos/icon.svg",
    dark: "/logos/icon.svg",
  },
};

export function Logo({ variant, width, height, className }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";
  const src = logoFiles[variant][theme];

  return (
    <Image
      src={src}
      alt="Masareef"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
```

- [ ] **Step 4: Update sidebar with horizontal logo**

Replace the logo section in `frontend/src/components/layout/sidebar.tsx`. Change the `<h1>` tag in the header:

Replace:
```tsx
<h1 className="text-xl font-bold">{t("common.appName")}</h1>
```

With:
```tsx
<Logo variant="horizontal" width={140} height={32} />
```

Add import at top:
```tsx
import { Logo } from "@/components/shared/logo";
```

Remove `useTranslations` import and `const t = useTranslations();` since `t()` is still used in nav items. Actually, `t` is still needed for nav labels — keep it.

Full updated `frontend/src/components/layout/sidebar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Receipt,
  HandCoins,
  PiggyBank,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "nav.dashboard" },
  { href: "/accounts", icon: Wallet, label: "nav.accounts" },
  { href: "/transactions", icon: Receipt, label: "nav.transactions" },
  { href: "/transfers", icon: ArrowLeftRight, label: "nav.transfers" },
  { href: "/debts", icon: HandCoins, label: "nav.debts" },
  { href: "/budgets", icon: PiggyBank, label: "nav.budgets" },
  { href: "/settings", icon: Settings, label: "nav.settings" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-e bg-card">
      <div className="flex h-16 items-center px-6 border-b">
        <Link href="/dashboard">
          <Logo variant="horizontal" width={140} height={32} />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {t(item.label)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 5: Update navbar with icon logo (mobile) and placeholder for locale toggle**

Replace `frontend/src/components/layout/navbar.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/shared/logo";

export function Navbar() {
  const t = useTranslations();
  const { user, signOut } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="md:hidden">
        <Logo variant="icon" width={28} height={28} />
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        {/* LocaleToggle will be added in Task 3 */}
        <ThemeToggle />
        {user && (
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 6: Add stacked logo to auth layout**

Replace `frontend/src/app/(auth)/layout.tsx`:
```tsx
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Logo variant="stacked" width={120} height={80} />
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify the build compiles**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend && pnpm build
```

Expected: Build succeeds. Logos appear in sidebar, navbar mobile view, and auth pages.

- [ ] **Step 8: Commit**

```bash
git add frontend/public/logos/ frontend/src/app/favicon.ico frontend/src/components/shared/logo.tsx frontend/src/components/layout/sidebar.tsx frontend/src/components/layout/navbar.tsx frontend/src/app/\(auth\)/layout.tsx
git commit -m "feat(frontend): add Logo component and place brand logos in sidebar, navbar, auth pages, and favicon"
```

---

### Task 3: Locale Toggle & i18n Infrastructure

**Files:**
- Create: `frontend/src/components/layout/locale-toggle.tsx`
- Modify: `frontend/src/i18n/request.ts`
- Modify: `frontend/src/components/layout/navbar.tsx`

- [ ] **Step 1: Update i18n/request.ts to read cookie**

Replace `frontend/src/i18n/request.ts`:
```ts
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, locales, type Locale } from "./config";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale: Locale =
    cookieLocale && locales.includes(cookieLocale as Locale)
      ? (cookieLocale as Locale)
      : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 2: Create LocaleToggle component**

Create `frontend/src/components/layout/locale-toggle.tsx`:
```tsx
"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { type Locale } from "@/i18n/config";

export function LocaleToggle() {
  const locale = useLocale();
  const router = useRouter();

  const toggleLocale = () => {
    const next: Locale = locale === "ar" ? "en" : "ar";
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000`;
    localStorage.setItem("NEXT_LOCALE", next);
    router.refresh();
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleLocale}>
      <span className="text-sm font-medium">
        {locale === "ar" ? "EN" : "ع"}
      </span>
      <span className="sr-only">
        {locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      </span>
    </Button>
  );
}
```

- [ ] **Step 3: Add LocaleToggle to navbar**

Update `frontend/src/components/layout/navbar.tsx` — replace the comment placeholder with the actual toggle:

Replace:
```tsx
        {/* LocaleToggle will be added in Task 3 */}
        <ThemeToggle />
```

With:
```tsx
        <LocaleToggle />
        <ThemeToggle />
```

Add import at top:
```tsx
import { LocaleToggle } from "./locale-toggle";
```

Full updated `frontend/src/components/layout/navbar.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import { ThemeToggle } from "./theme-toggle";
import { LocaleToggle } from "./locale-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/shared/logo";

export function Navbar() {
  const t = useTranslations();
  const { user, signOut } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="md:hidden">
        <Logo variant="icon" width={28} height={28} />
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <LocaleToggle />
        <ThemeToggle />
        {user && (
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Verify the build compiles**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend && pnpm build
```

Expected: Build succeeds. Locale toggle appears in navbar. Clicking it switches between Arabic RTL and English LTR.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/i18n/request.ts frontend/src/components/layout/locale-toggle.tsx frontend/src/components/layout/navbar.tsx
git commit -m "feat(frontend): add locale toggle with cookie persistence — switches between Arabic RTL and English LTR"
```

---

### Task 4: i18n Sweep — Add Translation Keys

**Files:**
- Modify: `frontend/messages/ar.json`
- Modify: `frontend/messages/en.json`

- [ ] **Step 1: Update ar.json with all new namespaces**

Replace `frontend/messages/ar.json`:
```json
{
  "common": {
    "appName": "مصاريف",
    "loading": "جاري التحميل...",
    "save": "حفظ",
    "cancel": "إلغاء",
    "delete": "حذف",
    "edit": "تعديل",
    "create": "إنشاء",
    "search": "بحث...",
    "noResults": "لا توجد نتائج",
    "confirm": "تأكيد",
    "name": "الاسم",
    "unexpectedError": "حدث خطأ غير متوقع",
    "notFound": "غير موجود",
    "date": "التاريخ",
    "description": "الوصف",
    "amount": "المبلغ",
    "previous": "السابق",
    "next": "التالي",
    "total": "{count} إجمالي",
    "select": "اختر..."
  },
  "nav": {
    "dashboard": "لوحة التحكم",
    "accounts": "الحسابات",
    "transactions": "المعاملات",
    "transfers": "التحويلات",
    "debts": "الديون",
    "budgets": "الميزانيات",
    "settings": "الإعدادات"
  },
  "auth": {
    "login": "تسجيل الدخول",
    "signup": "إنشاء حساب",
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "forgotPassword": "نسيت كلمة المرور؟",
    "noAccount": "ليس لديك حساب؟",
    "hasAccount": "لديك حساب بالفعل؟"
  },
  "accounts": {
    "title": "الحسابات",
    "addAccount": "إضافة حساب",
    "bankAccount": "حساب بنكي",
    "creditCard": "بطاقة ائتمان",
    "cashWallet": "محفظة نقدية",
    "digitalWallet": "محفظة إلكترونية",
    "financingApp": "تطبيق تمويل",
    "balance": "الرصيد",
    "available": "المتاح",
    "loading": "جاري التحميل...",
    "error": "خطأ",
    "notFound": "الحساب غير موجود",
    "emptyState": "لا توجد حسابات بعد. اضغط \"إضافة حساب\" للبدء.",
    "type": "النوع",
    "currency": "العملة",
    "institution": "المؤسسة",
    "institutionPlaceholder": "مثال: CIB، HSBC",
    "quickTransfer": "تحويل سريع"
  },
  "transactions": {
    "title": "المعاملات",
    "date": "التاريخ",
    "description": "الوصف",
    "category": "التصنيف",
    "amount": "المبلغ",
    "uncategorized": "بدون تصنيف",
    "search": "بحث في المعاملات...",
    "allTypes": "جميع الأنواع",
    "expenses": "المصروفات",
    "income": "الدخل",
    "noResults": "لا توجد معاملات",
    "previous": "السابق",
    "next": "التالي",
    "newTransaction": "معاملة جديدة",
    "addTransaction": "إضافة معاملة",
    "expense": "مصروف",
    "incomeType": "دخل",
    "notes": "ملاحظات",
    "notesPlaceholder": "ملاحظات إضافية...",
    "descriptionPlaceholder": "مثال: كارفور سيتي ستارز",
    "heading": "المعاملات"
  },
  "transfers": {
    "title": "التحويلات",
    "newTransfer": "تحويل جديد",
    "fromAccount": "من حساب",
    "toAccount": "إلى حساب",
    "exchangeRate": "سعر الصرف ({from} إلى {to})",
    "transferBetween": "تحويل بين الحسابات",
    "transfer": "تحويل",
    "noTransfers": "لا توجد تحويلات بعد",
    "date": "التاريخ",
    "from": "من",
    "to": "إلى",
    "amount": "المبلغ",
    "selectAccount": "اختر حساب...",
    "description": "الوصف",
    "descriptionPlaceholder": "مثال: سحب من الصراف"
  }
}
```

- [ ] **Step 2: Update en.json with all new namespaces**

Replace `frontend/messages/en.json`:
```json
{
  "common": {
    "appName": "Masareef",
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "search": "Search...",
    "noResults": "No results found",
    "confirm": "Confirm",
    "name": "Name",
    "unexpectedError": "An unexpected error occurred",
    "notFound": "Not found",
    "date": "Date",
    "description": "Description",
    "amount": "Amount",
    "previous": "Previous",
    "next": "Next",
    "total": "{count} total",
    "select": "Select..."
  },
  "nav": {
    "dashboard": "Dashboard",
    "accounts": "Accounts",
    "transactions": "Transactions",
    "transfers": "Transfers",
    "debts": "Debts",
    "budgets": "Budgets",
    "settings": "Settings"
  },
  "auth": {
    "login": "Log In",
    "signup": "Sign Up",
    "email": "Email",
    "password": "Password",
    "forgotPassword": "Forgot password?",
    "noAccount": "Don't have an account?",
    "hasAccount": "Already have an account?"
  },
  "accounts": {
    "title": "Accounts",
    "addAccount": "Add Account",
    "bankAccount": "Bank Account",
    "creditCard": "Credit Card",
    "cashWallet": "Cash Wallet",
    "digitalWallet": "Digital Wallet",
    "financingApp": "Financing App",
    "balance": "Balance",
    "available": "Available",
    "loading": "Loading...",
    "error": "Error",
    "notFound": "Account not found",
    "emptyState": "No accounts yet. Click \"Add Account\" to get started.",
    "type": "Type",
    "currency": "Currency",
    "institution": "Institution",
    "institutionPlaceholder": "e.g., CIB, HSBC",
    "quickTransfer": "Quick Transfer"
  },
  "transactions": {
    "title": "Transactions",
    "date": "Date",
    "description": "Description",
    "category": "Category",
    "amount": "Amount",
    "uncategorized": "Uncategorized",
    "search": "Search transactions...",
    "allTypes": "All types",
    "expenses": "Expenses",
    "income": "Income",
    "noResults": "No transactions",
    "previous": "Previous",
    "next": "Next",
    "newTransaction": "New Transaction",
    "addTransaction": "Add Transaction",
    "expense": "Expense",
    "incomeType": "Income",
    "notes": "Notes",
    "notesPlaceholder": "Additional notes...",
    "descriptionPlaceholder": "e.g., Carrefour City Stars",
    "heading": "Transactions"
  },
  "transfers": {
    "title": "Transfers",
    "newTransfer": "New Transfer",
    "fromAccount": "From Account",
    "toAccount": "To Account",
    "exchangeRate": "Exchange Rate ({from} to {to})",
    "transferBetween": "Transfer Between Accounts",
    "transfer": "Transfer",
    "noTransfers": "No transfers yet",
    "date": "Date",
    "from": "From",
    "to": "To",
    "amount": "Amount",
    "selectAccount": "Select account...",
    "description": "Description",
    "descriptionPlaceholder": "e.g., ATM withdrawal"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/messages/ar.json frontend/messages/en.json
git commit -m "feat(frontend): add transactions and transfers i18n keys to ar.json and en.json"
```

---

### Task 5: i18n Sweep — Update Components to Use Translation Keys

**Files:**
- Modify: `frontend/src/components/transactions/transaction-row.tsx` (created in 1H)
- Modify: `frontend/src/components/transactions/transaction-table.tsx` (created in 1H)
- Modify: `frontend/src/components/transactions/transaction-form.tsx` (created in 1H)
- Modify: `frontend/src/components/transactions/transaction-filters.tsx` (created in 1H)
- Modify: `frontend/src/app/(app)/accounts/[id]/page.tsx` (modified in 1H)
- Modify: `frontend/src/app/(app)/transactions/page.tsx` (created in 1H)
- Modify: `frontend/src/components/transfers/transfer-form.tsx` (created in 1H)
- Modify: `frontend/src/app/(app)/transfers/page.tsx` (created in 1H)

**Important:** This task depends on Unit 1H being merged. The files below reflect the Unit 1H plan's code. If 1H's final code differs, adjust accordingly — the pattern is the same: replace every hardcoded string with `t("namespace.key")`.

- [ ] **Step 1: Update transaction-row.tsx**

In `frontend/src/components/transactions/transaction-row.tsx`, add `useTranslations` and replace hardcoded strings:

Replace:
```tsx
          <span className="text-xs text-muted-foreground">Uncategorized</span>
```
With:
```tsx
          <span className="text-xs text-muted-foreground">{t("transactions.uncategorized")}</span>
```

Add at top of component:
```tsx
const t = useTranslations();
```

Add import:
```tsx
import { useTranslations } from "next-intl";
```

- [ ] **Step 2: Update transaction-table.tsx**

In `frontend/src/components/transactions/transaction-table.tsx`, replace all hardcoded header text and pagination:

Replace headers:
- `Date` → `{t("transactions.date")}`
- `Description` → `{t("transactions.description")}`
- `Category` → `{t("transactions.category")}`
- `Amount` → `{t("transactions.amount")}`

Replace pagination:
- `{total} total` → `{t("common.total", { count: total })}`
- `Previous` → `{t("common.previous")}`
- `Next` → `{t("common.next")}`

The `t("common.noResults")` call is already correct.

- [ ] **Step 3: Update transaction-form.tsx**

In `frontend/src/components/transactions/transaction-form.tsx`, replace all hardcoded labels:

- `Add Transaction` button → `{t("transactions.addTransaction")}`
- `New Transaction` sheet title → `{t("transactions.newTransaction")}`
- `Expense` button → `{t("transactions.expense")}`
- `Income` button → `{t("transactions.incomeType")}`
- `Date` label → `{t("common.date")}`
- `Description` label → `{t("common.description")}`
- `Amount ({accountCurrency})` → `{t("common.amount")} ({accountCurrency})`
- `Notes` label → `{t("transactions.notes")}`
- `e.g., Carrefour City Stars` placeholder → `{t("transactions.descriptionPlaceholder")}`

Add `const t = useTranslations();` (already has `useTranslations` import from `next-intl`).

- [ ] **Step 4: Update transaction-filters.tsx**

In `frontend/src/components/transactions/transaction-filters.tsx`, replace hardcoded filter text:

- `Search...` placeholder → `{t("transactions.search")}`
- `All types` option → `{t("transactions.allTypes")}`
- `Expenses` option → `{t("transactions.expenses")}`
- `Income` option → `{t("transactions.income")}`

Add `useTranslations` import and `const t = useTranslations();`.

- [ ] **Step 5: Update account detail page**

In `frontend/src/app/(app)/accounts/[id]/page.tsx` (after 1H modifies it), replace:

- `Transactions` heading → `{t("transactions.heading")}`
- `Loading transactions...` → `{t("common.loading")}`

The account loading/error/not-found states already use `t("accounts.loading")`, `t("accounts.error")`, `t("accounts.notFound")`.

- [ ] **Step 6: Update global transactions page**

In `frontend/src/app/(app)/transactions/page.tsx`, replace:

- `Loading...` → `{t("common.loading")}`

The `{t("nav.transactions")}` heading is already translated.

- [ ] **Step 7: Update transfer-form.tsx**

In `frontend/src/components/transfers/transfer-form.tsx`, replace all hardcoded labels:

- `New Transfer` button text → `{t("transfers.newTransfer")}`
- `Transfer Between Accounts` dialog title → `{t("transfers.transferBetween")}`
- `From Account` label → `{t("transfers.fromAccount")}`
- `To Account` label → `{t("transfers.toAccount")}`
- `Select...` option → `{t("transfers.selectAccount")}`
- `Amount ({fromAccount?.currency || ""})` → `{t("common.amount")} ({fromAccount?.currency || ""})`
- `Exchange Rate (...)` label → `{t("transfers.exchangeRate", { from: fromAccount?.currency, to: toAccount?.currency })}`
- `e.g., 0.0199` placeholder → keep as-is (numeric format, not translatable)
- `Date` label → `{t("common.date")}`
- `Description` label → `{t("common.description")}`
- `e.g., ATM withdrawal` placeholder → `{t("transfers.descriptionPlaceholder")}`
- `Transfer` submit button → `{t("transfers.transfer")}`

Add `const t = useTranslations();` and `useTranslations` import.

- [ ] **Step 8: Update transfers page**

In `frontend/src/app/(app)/transfers/page.tsx`, replace:

- `Loading...` → `{t("common.loading")}`
- `No transfers yet` → `{t("transfers.noTransfers")}`
- `Date` header → `{t("transfers.date")}`
- `From` header → `{t("transfers.from")}`
- `To` header → `{t("transfers.to")}`
- `Amount` header → `{t("transfers.amount")}`

Add `const t = useTranslations();`.

- [ ] **Step 9: Verify the build compiles**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend && pnpm build
```

Expected: Build succeeds. All strings display correctly in both Arabic and English when toggling locale.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/transactions/ frontend/src/components/transfers/ frontend/src/app/\(app\)/accounts/\[id\]/page.tsx frontend/src/app/\(app\)/transactions/ frontend/src/app/\(app\)/transfers/
git commit -m "feat(frontend): complete i18n sweep — all hardcoded strings replaced with translation keys"
```

---

### Task 6: Page Polish — Accounts & Cards

**Files:**
- Modify: `frontend/src/components/accounts/account-card.tsx`
- Modify: `frontend/src/app/(app)/accounts/page.tsx`

- [ ] **Step 1: Add hover lift effect and polish to account-card.tsx**

Replace `frontend/src/components/accounts/account-card.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Wallet, CreditCard, Banknote, Smartphone, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import type { Account } from "@/hooks/use-accounts";

const typeIcons: Record<string, typeof Wallet> = {
  bank_account: Wallet,
  credit_card: CreditCard,
  cash_wallet: Banknote,
  digital_wallet: Smartphone,
  financing_app: ShoppingBag,
};

const typeColors: Record<string, string> = {
  bank_account: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  credit_card: "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  cash_wallet: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
  digital_wallet: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  financing_app: "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
};

interface AccountCardProps {
  account: Account;
}

export function AccountCard({ account }: AccountCardProps) {
  const t = useTranslations("accounts");
  const Icon = typeIcons[account.type] || Wallet;
  const iconColor = typeColors[account.type] || "bg-primary/10 text-primary";

  return (
    <Link href={`/accounts/${account.id}`}>
      <Card className="hover:bg-accent/50 hover:-translate-y-1 transition-all duration-200 cursor-pointer">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <div className={`rounded-lg p-2 ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate">
              {account.name}
            </CardTitle>
            {account.institution && (
              <p className="text-xs text-muted-foreground">{account.institution}</p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <MoneyDisplay
            amount={account.displayed_balance_minor}
            currency={account.currency}
            size="lg"
            colorize
          />
          {account.type === "credit_card" && account.credit_limit != null && (
            <p className="text-xs text-muted-foreground mt-1">
              {t("available")}:{" "}
              <MoneyDisplay
                amount={account.credit_limit + account.displayed_balance_minor}
                currency={account.currency}
                size="sm"
                showCurrency={false}
              />
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
```

Changes from previous:
- Added `typeColors` map for per-type icon background colors
- Added `hover:-translate-y-1 transition-all duration-200` for lift effect

- [ ] **Step 2: Add quick transfer button to accounts page**

Replace `frontend/src/app/(app)/accounts/page.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import { useAccounts } from "@/hooks/use-accounts";
import { AccountGrid } from "@/components/accounts/account-grid";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";
import { TransferForm } from "@/components/transfers/transfer-form";

export default function AccountsPage() {
  const t = useTranslations("accounts");
  const { data, isLoading, error } = useAccounts();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <TransferForm />
          <CreateAccountDialog />
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">{t("loading")}</p>}
      {error && <p className="text-destructive">{t("error")}: {error.message}</p>}
      {data?.data && data.data.length > 0 && <AccountGrid accounts={data.data} />}
      {data?.data?.length === 0 && !isLoading && (
        <p className="text-muted-foreground text-center py-12">
          {t("emptyState")}
        </p>
      )}
    </div>
  );
}
```

Changes: Added `TransferForm` import and placed it next to `CreateAccountDialog` in the header actions.

Note: `TransferForm` is created in Unit 1H. If the import path or component API differs, adjust accordingly.

- [ ] **Step 3: Verify the build compiles**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend && pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/accounts/account-card.tsx frontend/src/app/\(app\)/accounts/page.tsx
git commit -m "feat(frontend): polish account cards with type colors and hover lift, add quick transfer button to accounts page"
```

---

### Task 7: Page Polish — Transaction Table & Category Badges

**Files:**
- Modify: `frontend/src/components/transactions/transaction-row.tsx` (created in 1H)
- Modify: `frontend/src/components/transactions/transaction-table.tsx` (created in 1H)

- [ ] **Step 1: Add category badge dot styling to transaction-row.tsx**

In `frontend/src/components/transactions/transaction-row.tsx`, update the category badge rendering.

Replace the category cell content:
```tsx
      <td className="px-4 py-3">
        {transaction.category ? (
          <Badge
            variant="secondary"
            style={{ borderColor: transaction.category.color || undefined }}
          >
            {transaction.category.name_en}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">{t("transactions.uncategorized")}</span>
        )}
      </td>
```

With:
```tsx
      <td className="px-4 py-3">
        {transaction.category ? (
          <Badge variant="secondary" className="gap-1.5">
            {transaction.category.color && (
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: transaction.category.color }}
              />
            )}
            {transaction.category.name_en}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">{t("transactions.uncategorized")}</span>
        )}
      </td>
```

- [ ] **Step 2: Add row striping to transaction-table.tsx**

In `frontend/src/components/transactions/transaction-table.tsx`, update the table body rows to use alternating background.

In the `<tbody>` section, the `TransactionRow` component renders `<tr>` elements. Add a className prop or wrap — the simplest approach is to add CSS to the table:

After the `<table className="w-full">` opening tag, add a class to `<tbody>`:
```tsx
<tbody className="[&>tr:nth-child(even)]:bg-muted/30">
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/transactions/transaction-row.tsx frontend/src/components/transactions/transaction-table.tsx
git commit -m "feat(frontend): polish transaction table with category badge dots and row striping"
```

---

### Task 8: Final Build Verification

- [ ] **Step 1: Full build and lint**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend && pnpm build && pnpm lint
```

Expected: Both pass with zero errors.

- [ ] **Step 2: Visual verification checklist**

Run `pnpm dev` and verify:
- [ ] **Design tokens:** Emerald primary color on buttons, active nav items, and ring focus
- [ ] **Fonts:** Inter for Latin text, Noto Sans Arabic for Arabic text
- [ ] **Dark mode:** Slate-900 background, slate-800 cards, emerald primary preserved
- [ ] **Sidebar:** Horizontal logo (switches dark/light variant with theme)
- [ ] **Navbar:** Icon logo on mobile, locale toggle + theme toggle
- [ ] **Locale toggle:** Click "EN" → English LTR, click "ع" → Arabic RTL, page flips correctly
- [ ] **Auth pages:** Stacked logo centered above login/signup card
- [ ] **Favicon:** Browser tab shows Masareef icon
- [ ] **Account cards:** Per-type icon colors, hover lift animation
- [ ] **Accounts page:** Quick transfer button next to "Add Account"
- [ ] **Transactions page:** All headers/labels translated in both locales
- [ ] **Transfers page:** All headers/labels translated in both locales
- [ ] **Category badges:** Colored dot + text label pattern
- [ ] **Table striping:** Alternating row backgrounds on transaction table

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix(frontend): resolve Unit 1I visual polish issues"
```

Only create this commit if there are actual fixes. Skip if everything passes cleanly.
