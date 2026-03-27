# Unit 1F: Frontend Shell — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Next.js 14 frontend with App Router, shadcn/ui, Tailwind CSS, Supabase Auth integration, TanStack Query, next-intl i18n (Arabic + English), and money formatting utilities. This creates the app shell that all subsequent frontend units build on.

**Architecture:** Next.js 14.2.x App Router with `src/app/` directory. All API calls go through TanStack Query to FastAPI backend (never direct Supabase PostgREST). Auth state managed via Supabase client SDK. RTL support via `dir` attribute and CSS logical properties only — physical directional classes (`pl-`, `pr-`, `ml-`, `mr-`, `left-`, `right-`, `text-left`, `text-right`) are **strictly forbidden**.

**Tech Stack:** Next.js 14.2.x, TypeScript, shadcn/ui, Tailwind CSS, TanStack Query, next-intl, Supabase JS client

**Required reading:** `CLAUDE.md` (frontend stack, RTL rules, naming), `01-architecture.md` (project structure), `guides/09-design-tokens.md`

---

## File Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout: providers, RTL, fonts
│   │   ├── page.tsx             # Redirect to /dashboard
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   └── (app)/
│   │       ├── layout.tsx       # App layout: sidebar + navbar
│   │       └── dashboard/
│   │           └── page.tsx     # Placeholder dashboard
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives (auto-generated)
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── navbar.tsx
│   │   │   └── theme-toggle.tsx
│   │   └── shared/
│   │       └── money-display.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts        # Browser Supabase client
│   │   │   └── server.ts        # Server-side Supabase client
│   │   ├── api-client.ts        # Typed fetch wrapper for FastAPI
│   │   ├── money.ts             # Minor units formatting
│   │   └── query-client.ts      # TanStack Query config
│   ├── hooks/
│   │   └── use-auth.ts
│   └── i18n/
│       ├── config.ts
│       └── request.ts
├── messages/
│   ├── ar.json
│   └── en.json
├── middleware.ts                 # Auth redirect + locale detection
├── tailwind.config.ts
├── next.config.mjs
├── package.json
└── tsconfig.json
```

---

### Task 1: Initialize Next.js Project

**Files:**
- Create: `frontend/` directory with Next.js scaffold

- [ ] **Step 1: Create Next.js project**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef
npx create-next-app@14.2 frontend --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

When prompted:
- Would you like to use Tailwind CSS? **Yes**
- Would you like to use `src/` directory? **Yes**
- Would you like to use App Router? **Yes**
- Would you like to customize the default import alias? **No**

- [ ] **Step 2: Switch to pnpm**

```bash
cd frontend
rm -f package-lock.json
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
```

Add to `frontend/package.json`:
```json
"packageManager": "pnpm@10.32.1"
```

- [ ] **Step 3: Commit**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef
git add frontend/
git commit -m "chore(frontend): initialize Next.js 14.2 with TypeScript, Tailwind, App Router"
```

---

### Task 2: Install Core Dependencies

- [ ] **Step 1: Install production dependencies**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend
pnpm add @supabase/supabase-js @supabase/ssr @tanstack/react-query next-intl next-themes
```

- [ ] **Step 2: Install shadcn/ui**

```bash
pnpm dlx shadcn@latest init
```

When prompted, choose:
- Style: New York
- Base color: Neutral
- CSS variables: Yes

- [ ] **Step 3: Install initial shadcn components**

```bash
pnpm dlx shadcn@latest add button card input label separator sheet dialog dropdown-menu avatar badge scroll-area toast
```

- [ ] **Step 4: Commit**

```bash
git add frontend/
git commit -m "chore(frontend): add Supabase, TanStack Query, next-intl, shadcn/ui dependencies"
```

---

### Task 3: Supabase Auth Client

**Files:**
- Create: `frontend/src/lib/supabase/client.ts`
- Create: `frontend/src/lib/supabase/server.ts`
- Create: `frontend/src/hooks/use-auth.ts`

- [ ] **Step 1: Create browser client**

Create `frontend/src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Create server client**

Create `frontend/src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
```

- [ ] **Step 3: Create auth hook**

Create `frontend/src/hooks/use-auth.ts`:
```typescript
"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, signOut };
}
```

- [ ] **Step 4: Create .env.local template**

Create `frontend/.env.local.example`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/supabase/ frontend/src/hooks/ frontend/.env.local.example
git commit -m "feat(frontend): add Supabase auth client, server client, and useAuth hook"
```

---

### Task 4: TanStack Query + API Client

**Files:**
- Create: `frontend/src/lib/query-client.ts`
- Create: `frontend/src/lib/api-client.ts`

- [ ] **Step 1: Create query client config**

Create `frontend/src/lib/query-client.ts`:
```typescript
import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,      // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  });
}
```

- [ ] **Step 2: Create typed API client**

Create `frontend/src/lib/api-client.ts`:
```typescript
import { createClient } from "@/lib/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    page_size: number;
  };
}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return {};
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

export async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers });

  if (!res.ok) {
    const error: ApiError = await res.json();
    throw new Error(error.error?.message || `API error: ${res.status}`);
  }

  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error: ApiError = await res.json();
    throw new Error(error.error?.message || `API error: ${res.status}`);
  }

  return res.json();
}

export async function apiPut<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error: ApiError = await res.json();
    throw new Error(error.error?.message || `API error: ${res.status}`);
  }

  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok && res.status !== 204) {
    const error: ApiError = await res.json();
    throw new Error(error.error?.message || `API error: ${res.status}`);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/query-client.ts frontend/src/lib/api-client.ts
git commit -m "feat(frontend): add TanStack Query config and typed API client"
```

---

### Task 5: i18n Setup (next-intl, Arabic + English)

**Files:**
- Create: `frontend/messages/ar.json`
- Create: `frontend/messages/en.json`
- Create: `frontend/src/i18n/config.ts`
- Create: `frontend/src/i18n/request.ts`

- [ ] **Step 1: Create translation files**

Create `frontend/messages/en.json`:
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
    "confirm": "Confirm"
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
    "available": "Available"
  }
}
```

Create `frontend/messages/ar.json`:
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
    "confirm": "تأكيد"
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
    "available": "المتاح"
  }
}
```

- [ ] **Step 2: Create i18n config**

Create `frontend/src/i18n/config.ts`:
```typescript
export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";
```

Create `frontend/src/i18n/request.ts`:
```typescript
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  // For now, default to Arabic. Locale switching will be added later.
  const locale = "ar";
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 3: Update next.config.mjs**

Add next-intl plugin to `frontend/next.config.mjs`:
```javascript
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withNextIntl(nextConfig);
```

- [ ] **Step 4: Commit**

```bash
git add frontend/messages/ frontend/src/i18n/ frontend/next.config.mjs
git commit -m "feat(frontend): add next-intl i18n with Arabic and English translations"
```

---

### Task 6: Money Formatting Utility

**Files:**
- Create: `frontend/src/lib/money.ts`

- [ ] **Step 1: Write money.ts**

Create `frontend/src/lib/money.ts`:
```typescript
/**
 * Money formatting utilities. All amounts are integer minor units.
 * Never use floating point for money calculations.
 */

export const CURRENCIES: Record<string, { name: string; nameAr: string; exponent: number; symbol: string }> = {
  EGP: { name: "Egyptian Pound", nameAr: "جنيه مصري", exponent: 2, symbol: "EGP" },
  USD: { name: "US Dollar", nameAr: "دولار أمريكي", exponent: 2, symbol: "$" },
  EUR: { name: "Euro", nameAr: "يورو", exponent: 2, symbol: "€" },
  GBP: { name: "British Pound", nameAr: "جنيه إسترليني", exponent: 2, symbol: "£" },
  SAR: { name: "Saudi Riyal", nameAr: "ريال سعودي", exponent: 2, symbol: "SAR" },
  AED: { name: "UAE Dirham", nameAr: "درهم إماراتي", exponent: 2, symbol: "AED" },
  KWD: { name: "Kuwaiti Dinar", nameAr: "دينار كويتي", exponent: 3, symbol: "KWD" },
};

/**
 * Format minor units to display string.
 * formatAmount(125000, "EGP") → "1,250.00"
 * formatAmount(125000, "KWD") → "125.000"
 */
export function formatAmount(amountMinor: number, currency: string): string {
  const exponent = CURRENCIES[currency]?.exponent ?? 2;
  const major = amountMinor / Math.pow(10, exponent);
  return major.toLocaleString("en-US", {
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  });
}

/**
 * Format with Arabic-Indic numerals for Arabic locale.
 */
export function formatAmountAr(amountMinor: number, currency: string): string {
  const exponent = CURRENCIES[currency]?.exponent ?? 2;
  const major = amountMinor / Math.pow(10, exponent);
  return major.toLocaleString("ar-EG", {
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  });
}

/**
 * Format with currency symbol.
 * formatWithCurrency(125000, "EGP") → "1,250.00 EGP"
 */
export function formatWithCurrency(amountMinor: number, currency: string): string {
  return `${formatAmount(amountMinor, currency)} ${CURRENCIES[currency]?.symbol ?? currency}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/money.ts
git commit -m "feat(frontend): add money formatting utilities with Arabic-Indic numeral support"
```

---

### Task 7: Root Layout with Providers

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/providers.tsx`

- [ ] **Step 1: Create providers wrapper**

Create `frontend/src/app/providers.tsx`:
```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Update root layout**

Replace `frontend/src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "./providers";
import "./globals.css";

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
      <body className="min-h-screen bg-background font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/layout.tsx frontend/src/app/providers.tsx
git commit -m "feat(frontend): add root layout with TanStack Query, next-intl, dark mode providers"
```

---

### Task 8: App Shell (Sidebar + Navbar)

**Files:**
- Create: `frontend/src/components/layout/sidebar.tsx`
- Create: `frontend/src/components/layout/navbar.tsx`
- Create: `frontend/src/components/layout/theme-toggle.tsx`
- Create: `frontend/src/app/(app)/layout.tsx`
- Create: `frontend/src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Create sidebar**

Create `frontend/src/components/layout/sidebar.tsx`:
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
        <h1 className="text-xl font-bold">{t("common.appName")}</h1>
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

- [ ] **Step 2: Create navbar**

Create `frontend/src/components/layout/navbar.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function Navbar() {
  const t = useTranslations();
  const { user, signOut } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="md:hidden">
        <h1 className="text-lg font-bold">{t("common.appName")}</h1>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
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

- [ ] **Step 3: Create theme toggle**

Create `frontend/src/components/layout/theme-toggle.tsx`:
```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

- [ ] **Step 4: Create app layout (sidebar + navbar wrapper)**

Create `frontend/src/app/(app)/layout.tsx`:
```tsx
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create placeholder dashboard**

Create `frontend/src/app/(app)/dashboard/page.tsx`:
```tsx
import { useTranslations } from "next-intl";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground mt-2">
        Phase 1 placeholder — charts and widgets come in Phase 4.
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Update root page to redirect**

Replace `frontend/src/app/page.tsx`:
```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/layout/ frontend/src/app/
git commit -m "feat(frontend): add app shell with sidebar, navbar, dark mode, RTL support"
```

---

### Task 9: Auth Pages (Login + Signup)

**Files:**
- Create: `frontend/src/app/(auth)/login/page.tsx`
- Create: `frontend/src/app/(auth)/signup/page.tsx`
- Create: `frontend/src/app/(auth)/layout.tsx`

- [ ] **Step 1: Create auth layout**

Create `frontend/src/app/(auth)/layout.tsx`:
```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create login page**

Create `frontend/src/app/(auth)/login/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      router.push("/dashboard");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-2xl">{t("auth.login")}</CardTitle>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
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
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("common.loading") : t("auth.login")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t("auth.noAccount")}{" "}
            <Link href="/signup" className="text-primary hover:underline">
              {t("auth.signup")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
```

- [ ] **Step 3: Create signup page**

Create `frontend/src/app/(auth)/signup/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const t = useTranslations();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-2xl">{t("auth.signup")}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSignup}>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
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
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("common.loading") : t("auth.signup")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t("auth.hasAccount")}{" "}
            <Link href="/login" className="text-primary hover:underline">
              {t("auth.login")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/\(auth\)/
git commit -m "feat(frontend): add login and signup pages with Supabase Auth"
```

---

### Task 10: Verify Build

- [ ] **Step 1: Run build**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: No errors.

- [ ] **Step 3: Run dev server and verify**

```bash
pnpm dev
```

Open `http://localhost:3000`. Verify:
- Page redirects to /dashboard
- Sidebar renders with Arabic text (مصاريف)
- Dark mode toggle works
- RTL layout is correct

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "fix(frontend): resolve build issues"
```
