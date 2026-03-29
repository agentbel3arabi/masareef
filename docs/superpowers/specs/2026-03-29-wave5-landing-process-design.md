# Wave 5: Landing & Process — Design Spec

**Date:** 2026-03-29
**Status:** Approved
**Scope:** Landing page, audit polish fixes, workflow documentation, roadmap updates
**Prerequisite:** Waves 1–4 complete on main (commit `b92d3e8`). Pre-Wave 5 audit complete.

---

## 1. Context & Motivation

Phase 1.5 has four completed waves: infrastructure upgrades (Wave 1), backend completeness (Wave 2), UI foundation (Wave 3), and page fidelity (Wave 4). Wave 5 closes Phase 1.5 with the landing page, audit-surfaced polish fixes, and workflow documentation.

A full codebase audit (28 findings: 3 CRITICAL, 12 MAJOR, 13 MINOR) was completed on 2026-03-29. All findings that should be fixed before Phase 2 are assigned to Wave 5. Deferred items are tracked in the roadmap.

## 2. Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Execution order | 1.5L first, then 1.5M — sequential | User preference: one unit at a time, no parallel execution |
| Workspace | Same workspace, regular git branches | User preference: no git worktrees |
| Landing sections | 7 sections (testimonials removed, How It Works added) | No fake testimonials for a pre-launch product; How It Works adds marketing value |
| Hero visual | Styled static glass-card mockup | Polished look without needing real data; matches Stitch design |
| "See Demo" CTA | Renamed "Learn More" / "اعرف أكثر", scrolls to Features | No demo exists; honest labeling |
| Settings 404 | Placeholder page with "coming soon" empty state | Route exists, no 404, clear intent |
| Newsletter | UI only — toast "coming soon" on submit | Avoids GDPR/compliance concerns pre-launch |
| Marketing claims | Softened — "Join the Waitlist" instead of "50,000+ users" | Honest for pre-launch product |
| User avatar | Initials + minimal dropdown | Covers basics without adding unimplemented features |
| Default language | Detect browser locale, manual toggle | Arabic browsers get Arabic RTL, others get English LTR |

---

## 3. Execution Structure

**Two sequential units.** Each follows the standard workflow: Execute → Push PR → Copilot Review → Fix → UAT → Merge.

```
Unit 1.5L: Landing Page + Audit Polish
  Branch: feature/1.5L-landing-page
  ↓ (merge to main)
Unit 1.5M: Workflow & Documentation
  Branch: chore/1.5M-workflow-roadmap-updates
  ↓ (merge to main)
Phase 1.5 Complete ✅
```

---

## 4. Unit 1.5L: Landing Page + Audit Polish

### 4.1 Landing Page

**Reference:** Stitch screen 01 (`docs/stitch-designs/html/01-landing-page.html`)
**Design tokens:** `docs/guides/09-design-tokens.md` (always wins over Stitch colors)

#### Routing

| Path | User State | Behavior |
|------|-----------|----------|
| `/` | Unauthenticated | Render landing page |
| `/` | Authenticated | Redirect to `/dashboard` |

The landing page is a **public route** — it lives at `app/page.tsx` (replacing the current redirect). It is outside the `(app)` and `(auth)` route groups. It does not use the sidebar/navbar layout.

#### Language Detection

- On first visit, detect browser locale via `Accept-Language` header or `navigator.language`
- Arabic locales (`ar`, `ar-EG`, `ar-SA`, etc.) → render in Arabic with `dir="rtl"`
- All other locales → render in English with `dir="ltr"`
- Language toggle in navigation bar switches between Arabic and English
- Persist language choice in `localStorage` for return visits
- Use existing `next-intl` infrastructure — landing page messages added to `messages/ar.json` and `messages/en.json`

#### Section 1: Navigation Bar

```
┌──────────────────────────────────────────────────────────────┐
│  [Logo] Masareef   Features | Pricing | About     🌐  Sign In  [Get Started Free] │
└──────────────────────────────────────────────────────────────┘
```

- **Position:** Fixed top, full width, `z-50`
- **Background:** Semi-transparent white with backdrop blur (`bg-white/60 backdrop-blur-md`) — dark mode: `bg-slate-900/60`
- **Logo:** Masareef logo from `logos/` directory, SVG preferred, `h-10`
- **Nav links:** "Features" (→ `#features`), "Pricing" (→ `#pricing`), "About" (→ `#about`) — hidden below `md` breakpoint
- **Language toggle:** Globe icon button — toggles between Arabic/English, updates `dir` attribute on `<html>`
- **Sign In:** Outline/ghost button → navigates to `/login`
- **Get Started Free:** Primary green gradient button → navigates to `/signup`
- **Mobile:** Hamburger menu icon below `md` breakpoint → opens Sheet with nav links, sign in, get started
- **Height:** `h-16` (64px)

#### Section 2: Hero

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ● FINTECH FOR MENA              ┌─────────────────────┐    │
│                                   │  Total Balance       │    │
│  Your money,                      │  EGP 142,500.00      │    │
│  your language,                   │  ▓▓▓▓▓▓▓▓▓░░  75%   │    │
│  your rules.                      │  Monthly Savings Goal │    │
│                                   └─────────────────────┘    │
│  فلوسك، بلغتك، بقواعدك                                      │
│                                   ┌──────────────┐          │
│  The first personal finance app   │ 👥 Gam3eya    │          │
│  built for Egyptian and MENA      │ Payout: Jul 1 │          │
│  families...                      └──────────────┘          │
│                                                              │
│  [Get Started Free]  [Learn More ↓]                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- **Layout:** 2-column grid on `lg+` (text left 50%, mockup right 50%). Single column on mobile (text then mockup).
- **Badge:** Pill badge "Fintech for the MENA region" with animated green dot — `bg-emerald-50 text-emerald-700`
- **Headline:** `text-5xl lg:text-7xl font-extrabold` — "Your money, your language, your rules." with "your rules." in primary green
- **Arabic subtitle:** `text-2xl font-bold text-primary` — "فلوسك، بلغتك، بقواعدك" with `dir="rtl"`
- **Description:** `text-lg text-secondary max-w-lg` — "The first personal finance app built for Egyptian and MENA families. Track spending, manage debts, monitor your Gam3eya, and forecast your cash flow — all in Arabic."
- **CTAs:**
  - "Get Started Free" → primary green gradient, `px-8 py-4 rounded-xl`, navigates to `/signup`
  - "Learn More" → secondary surface color, `px-8 py-4 rounded-xl`, smooth-scrolls to `#features`
- **Dashboard mockup (right side):**
  - Static decorative component — NOT live data
  - Glass-card (`bg-white/70 backdrop-blur`) with rounded corners and shadow
  - Content: "Total Balance" label, "EGP 142,500.00" large text, progress bar (75% filled green), "Monthly Savings Goal" / "75% Achieved" labels
  - Container: Tilted frame (`rotate-2` on lg), rounded-3xl, surface-low background
  - Floating Gam3eya card: Glass-card at bottom-left (hidden on mobile), shows group icon + "Payout: July 1st"
- **Padding:** `pt-32 pb-20 px-6` (accounts for fixed nav)

#### Section 3: Feature Grid

```
┌──────────────────────────────────────────────────────────────┐
│          Built for the way you handle money                  │
│   No more forcing your local financial habits into western   │
│   apps. Masareef is designed for MENA market needs.          │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ 📤 Smart  │  │ 🧠 AI     │  │ 💳 Debts  │                   │
│  │ Bank      │  │ Categori-│  │ & Install-│                   │
│  │ Import    │  │ zation   │  │ ments     │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ 👥 Gam3eya│  │ 🏠 Asset │  │ 👨‍👩‍👧 Family│                   │
│  │ Tracking  │  │ Manage-  │  │ Finance   │                   │
│  │           │  │ ment     │  │           │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
└──────────────────────────────────────────────────────────────┘
```

- **Anchor:** `id="features"`
- **Background:** Surface-low (`bg-surface-container-low` → light grey in light mode)
- **Heading:** `text-3xl lg:text-5xl font-extrabold` centered, max-w-3xl
- **Subheading:** `text-secondary text-lg` centered
- **Grid:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8`
- **Cards:** 6 feature cards, each:
  - White background, `p-8 rounded-3xl`, subtle shadow, hover shadow transition
  - Icon container: `w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700`, hover → `bg-emerald-600 text-white`
  - Title: `text-xl font-bold`
  - Description: `text-secondary leading-relaxed`

| Card | Lucide Icon | Title | Description |
|------|-------------|-------|-------------|
| 1 | `upload` | Smart Bank Import | Upload bank PDF or CSV. Parses Egyptian bank statements — no manual entry. |
| 2 | `brain` | AI Categorization | LLM-powered categorization for Arabic and English merchant names. |
| 3 | `credit-card` | Debts & Installments | Manage ValU, Sympl, and bank loans with amortization schedules. |
| 4 | `users` | Gam3eya Tracking | Rotating savings clubs with payment scheduling and accountability. |
| 5 | `building` | Asset Management | Track real estate, gold, certificates (شهادات) in real-time. |
| 6 | `home` | Family Finance | Shared household budgets for collaborative financial planning. |

#### Section 4: How It Works

```
┌──────────────────────────────────────────────────────────────┐
│                  Three steps to clarity                       │
│                                                              │
│         ①──────────②──────────③                              │
│      Import      AI         See Full                         │
│      Data     Categorize    Picture                          │
│                                                              │
│    Upload      Our AI       Comprehensive                    │
│  statements   identifies    dashboard with                   │
│  or connect   spending      net worth, debts,                │
│  securely     habits        and forecasts                    │
└──────────────────────────────────────────────────────────────┘
```

- **Background:** White (default surface)
- **Heading:** `text-3xl lg:text-5xl font-extrabold` centered
- **Layout:** `grid-cols-1 md:grid-cols-3 gap-12` with relative connector line
- **Connector:** Hidden on mobile, `md:block absolute top-12` horizontal line in `bg-emerald-100`
- **Each step:**
  - Numbered circle: `w-24 h-24 rounded-full bg-emerald-600 text-white text-3xl font-bold` centered, white border ring, shadow
  - Title: `text-2xl font-bold` centered
  - Description: `text-secondary leading-relaxed` centered

| Step | Title | Description |
|------|-------|-------------|
| 1 | Import Data | Upload statements or connect securely. We support all major regional institutions. |
| 2 | AI Categorize | Our AI identifies your spending habits across local grocers, bills, and lifestyle. |
| 3 | See Full Picture | Get a comprehensive dashboard showing your net worth, debts, and future forecasts. |

#### Section 5: Pricing

```
┌──────────────────────────────────────────────────────────────┐
│             Pricing that fits your life                       │
│      Start for free, upgrade when you're ready.              │
│                                                              │
│  ┌──────────┐  ┌════════════════┐  ┌──────────┐             │
│  │ Free     │  ║   MOST POPULAR ║  │ Business │             │
│  │          │  ║   Premium      ║  │          │             │
│  │ EGP 0   │  ║   EGP 99/mo   ║  │ EGP 249  │             │
│  │ /forever │  ║               ║  │ /mo      │             │
│  │          │  ║ ✓ 5 members   ║  │          │             │
│  │ ✓ 1 user│  ║ ✓ AI categor. ║  │ ✓ Unlim. │             │
│  │ ✓ CSV   │  ║ ✓ Gam3eya     ║  │ ✓ 25 mem │             │
│  │ ✓ Basic │  ║ ✓ Telegram    ║  │ ✓ API    │             │
│  │          │  ║ ✓ Debt mgmt  ║  │ ✓ Reports│             │
│  │[Start]   │  ║ [Go Premium] ║  │[Contact] │             │
│  └──────────┘  ╚════════════════╝  └──────────┘             │
└──────────────────────────────────────────────────────────────┘
```

- **Anchor:** `id="pricing"`
- **Background:** Surface-low
- **Heading:** `text-3xl lg:text-5xl font-extrabold` centered
- **Grid:** `grid-cols-1 md:grid-cols-3 gap-8`
- **Cards:** Each is a flex column card, `p-10 rounded-3xl`

| Tier | Price | Features | Button | Style |
|------|-------|----------|--------|-------|
| Free | EGP 0 /forever | 1 member access, Manual CSV import, Basic spending charts, 7 currencies | "Start for Free" (surface) | Default border |
| Premium | EGP 99 /mo | Up to 5 household members, Smart AI categorization, Gam3eya tracker, Telegram notifications, Debt management tools, PDF import, Advanced forecasting, Priority support | "Go Premium" (primary gradient) | `border-2 border-emerald-500`, `lg:scale-105`, shadow-2xl, "Most Popular" pill badge at top |
| Business | EGP 249 /mo | Unlimited households, Up to 25 members, API access & Exports, Dedicated accountant view, Custom reports, Dedicated support | "Contact Sales" (surface) | Default border |

- Feature list items: Checkmark icon (`check-circle` in emerald-600) + text
- Premium card: Elevated with green border + "Most Popular" absolute-positioned pill badge

#### Section 6: CTA

```
┌──────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │  Financial literacy in your pocket.        ┌──────┐  │    │
│  │                                            │ 🪙    │  │    │
│  │  Start tracking your finances today —      │ Image │  │    │
│  │  in your language, on your terms.          │      │  │    │
│  │                                            └──────┘  │    │
│  │  [Join the Waitlist]                                 │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

- **Anchor:** `id="about"` (for nav link)
- **Layout:** Outer container with emerald gradient border/padding → inner white card → 2-column flex (`md:flex-row`)
- **Left side (60%):** `p-12`
  - Headline: `text-3xl font-extrabold` — "Financial literacy in your pocket."
  - Description: `text-secondary leading-relaxed` — "Start tracking your finances today — in your language, on your terms."
  - CTA button: "Join the Waitlist" — primary green gradient, `px-8 py-4 rounded-xl`
  - Subtext: "No credit card required" — small muted text
- **Right side (40%):** Accent color background with decorative image (Egyptian pounds/coins aesthetic) and centered glass-card quote: "Wealth is not about how much you make, but how much you keep."
- **Responsive:** Below `md`, right side stacks below left

#### Section 7: Footer

```
┌──────────────────────────────────────────────────────────────┐
│  Masareef        Product        Company        Newsletter    │
│  Financial OS    Features       About          [email] [Join]│
│  for MENA.       Pricing        Contact                      │
│                  Gam3eya        Privacy                      │
│  [🌐] [📤]      Debt Calc      Terms                        │
│                                                              │
│  ─────────────────────────────────────────────────────────── │
│           © 2026 Masareef. Made with ❤️ in Egypt              │
└──────────────────────────────────────────────────────────────┘
```

- **Background:** `bg-slate-50` (light) / `bg-slate-950` (dark)
- **Grid:** `grid-cols-1 md:grid-cols-4 gap-12` inside `max-w-7xl`
- **Column 1 — Brand:**
  - Masareef logo (140px wide)
  - Description text: "The premier financial operating system for the MENA household. Built with care in Egypt for the modern Arab world."
  - Social icons: 2 round icon buttons (website, share) with hover green transition
- **Column 2 — Product:**
  - Links: Features, Pricing, Gam3eya Tracker, Debt Calculator
  - All links are `#` anchors (no target pages yet) — styled as hover-to-dark text
- **Column 3 — Company:**
  - Links: About, Contact, Privacy Policy, Terms of Service
  - All links are `#` anchors
- **Column 4 — Newsletter:**
  - Label: "Get local financial tips directly in your inbox."
  - Email input + "Join" button (inline flex)
  - On submit: show toast "Newsletter coming soon!" — no backend
- **Copyright:** Centered below divider — "© 2026 Masareef. Made with ❤️ in Egypt"
- **Language toggle:** Omitted from footer (available in nav bar)

#### SEO & Meta

```html
<title>Masareef — Personal Finance for Egypt & MENA</title>
<meta name="description" content="Track spending, manage debts, import bank statements, and plan your finances — in Arabic and English." />
<meta property="og:title" content="Masareef — Your Money, Your Language, Your Rules" />
<meta property="og:description" content="The first personal finance app built for Egyptian and MENA families." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://masareef.app" />
<meta property="og:image" content="/og-image.png" />
<link rel="canonical" href="https://masareef.app" />
```

- All meta tags are bilingual — Arabic version uses Arabic strings when locale is `ar`
- Open Graph image: Generate a simple OG image (1200x630) with Masareef logo + tagline — or use a placeholder

#### Responsive Behavior

| Breakpoint | Nav | Hero | Features | How It Works | Pricing | CTA | Footer |
|-----------|-----|------|----------|-------------|---------|-----|--------|
| `<md` (375px) | Hamburger menu | Single column, mockup below text | 1 column | Vertical steps, no connector | 1 column stacked | Single column | 1 column stacked |
| `md` (768px) | Full nav visible | Still single column | 2 columns | 3 columns with connector | 3 columns | 2 columns | 4 columns |
| `lg+` (1280px) | Full nav | 2 columns (text + mockup) | 3 columns | 3 columns with connector | 3 columns, Premium scaled up | 2 columns | 4 columns |

#### Component Architecture

The landing page should be built as a single page component with extracted section sub-components:

```
app/page.tsx                    — Landing page (public route)
components/landing/
  ├── landing-nav.tsx           — Fixed navigation bar + mobile menu
  ├── landing-hero.tsx          — Hero section with mockup
  ├── landing-features.tsx      — 6 feature cards grid
  ├── landing-how-it-works.tsx  — 3-step flow
  ├── landing-pricing.tsx       — 3-tier pricing cards
  ├── landing-cta.tsx           — CTA section with waitlist
  └── landing-footer.tsx        — Footer with columns + newsletter
```

Each component is a server component by default (static content). The language toggle and mobile menu require client-side interactivity — extract those into small client components.

---

### 4.2 Audit Polish Fixes

These fixes are bundled into the same PR as the landing page. Each is a targeted change in an existing file.

#### F1: Transaction Form RTL Violation (CRITICAL)

**File:** `components/transactions/transaction-form.tsx:79`
**Current:** `side="right"` on `SheetContent`
**Fix:** Change to `side="end"`
**Why:** Physical direction violates CLAUDE.md Rule 4. `side="end"` resolves to right in LTR and left in RTL automatically.

#### F2: Auth Layout Hardcoded Colors (MAJOR)

**File:** `app/(auth)/layout.tsx:10`
**Current:** Hardcoded hex `#004D20` and `#1DB954` in gradient
**Fix:** Replace with design token gradient classes: `from-primary/80 via-primary to-primary/60` or define `--color-auth-gradient-start` / `--color-auth-gradient-end` tokens in `globals.css`
**Why:** Hardcoded hex values bypass the design token system and won't respond to theme changes.

#### F3/F18: Sidebar Tagline i18n (MAJOR)

**File:** `components/layout/sidebar.tsx:41-43`
**Current:** Hardcoded Arabic "فلوسك متظبطة بالقرش", `text-[11px]` (wrong text, wrong size, no i18n)
**Fix:**
1. Change text to "مصاريف منظمة بذكاء" (correct tagline)
2. Add i18n keys: `sidebar.tagline` → `"مصاريف منظمة بذكاء"` (ar) / `"Smart finance management"` (en)
3. Replace `text-[11px]` with `text-xs` (token-aligned)
**Why:** Brand text must be correct and translatable.

#### F4: User Avatar in Navbar (MAJOR)

**File:** `components/layout/navbar.tsx`
**Current:** Only a logout button, no avatar
**Fix:** Add user avatar with dropdown menu:
- **Avatar:** User initials in a circle (`w-8 h-8 rounded-full bg-primary text-white`), using `Avatar` component from `ui/avatar.tsx`
- **Dropdown:** shadcn `DropdownMenu` triggered by avatar click:
  - Display name (non-clickable label, `text-sm font-medium`)
  - Separator
  - "Settings" → navigates to `/settings`
  - "Language" → toggle Arabic/English (same as sidebar locale switcher)
  - "Theme" → toggle Light/Dark mode
  - Separator
  - "Sign Out" → triggers sign-out flow
- **Data source:** User display name from auth session (`currentUser.first_name`)
- **Initials:** First letter of first name + first letter of last name (fallback: first 2 letters of email)

#### F6/F7: Error & Loading Boundaries (MINOR)

**Files:** New files in `app/(app)/`
**Fix:**
1. Create `app/(app)/error.tsx`:
   - Client component (`"use client"`)
   - Friendly bilingual error message: "Something went wrong" / "حدث خطأ ما"
   - "Try Again" button (calls `reset()`)
   - "Go Home" link (→ `/dashboard`)
   - Error icon from Lucide (`AlertTriangle`)
2. Create `app/(app)/loading.tsx`:
   - Page-level skeleton with `PageHeaderSkeleton` + content area pulse
   - Reuses existing skeleton components where available

#### F12: Category Selector Upgrade (MAJOR)

**File:** `components/transactions/transaction-form.tsx:120-131`
**Current:** Bare `<select>` element (native browser dropdown)
**Fix:** Replace with shadcn `Select` component:
- Category options show icon (Lucide) + name
- Grouped by parent category if hierarchy exists
- Searchable/filterable for long category lists
- Follows base-nova `render` prop pattern

#### F16: Button Border Radius (MINOR)

**File:** `globals.css`
**Current:** `--radius: 0.625rem` (10px) applied to buttons
**Fix:** Define `--radius-button: 0.375rem` (6px) per design token spec. Apply to button component's base styles.
**Why:** Design tokens doc specifies buttons at 6px, cards/modals at 10px.

#### F17: Surface CSS Variable (CRITICAL)

**File:** `globals.css`
**Current:** No `--surface` variable defined
**Fix:** Add to light mode: `--surface: 248 250 252;` (HSL components of `#F8FAFC`). Add to dark mode: `--surface: 30 41 59;` (HSL components of `#1E293B`). Wire into Tailwind via `@theme inline` block as `--color-surface: hsl(var(--surface))`.
**Why:** Design tokens explicitly specify Surface as distinct from Background. Cards, sidebars, and elevated panels should use `bg-surface`.

#### F19/E1: Settings Placeholder Page (MAJOR)

**File:** New `app/(app)/settings/page.tsx`
**Fix:** Create a placeholder settings page:
- Page header: "Settings" / "الإعدادات"
- EmptyState component: Settings icon (Lucide `settings`), "Settings coming soon" / "الإعدادات قريبًا", description: "Account preferences, data management, and more will be available here." / "تفضيلات الحساب وإدارة البيانات والمزيد ستكون متاحة هنا."
- No form fields or interactive elements
**Why:** Sidebar links to `/settings` — a 404 is a broken user experience.

#### E2: Logo Aspect Ratio Warning (MINOR)

**File:** `components/layout/sidebar.tsx` (and any other logo usage)
**Current:** `LOGO_SIZES` constants don't match actual SVG aspect ratio → console warning on every page
**Fix:** Measure actual SVG dimensions. Update `LOGO_SIZES` width/height values to match the SVG's intrinsic aspect ratio. Consider using `width: auto` with only `height` constrained if aspect ratio varies between logo variants.

---

### 4.3 Unit 1.5L Acceptance Criteria

**Landing page:**
- [ ] Landing page renders all 7 sections at `/` for unauthenticated users
- [ ] Authenticated users at `/` redirect to `/dashboard`
- [ ] Language detection: Arabic browsers get Arabic RTL, others get English LTR
- [ ] Language toggle switches between Arabic and English correctly
- [ ] Responsive: renders correctly at 375px (mobile), 768px (tablet), 1280px (desktop)
- [ ] "Get Started Free" → `/signup`, "Sign In" → `/login`
- [ ] "Learn More" smooth-scrolls to Features section
- [ ] Mobile hamburger menu opens Sheet with all nav links
- [ ] SEO meta tags present (title, description, OG tags)
- [ ] Page visually matches Stitch screen 01 at functional fidelity level (with design token colors, not Stitch hex values)
- [ ] All i18n strings in `messages/ar.json` and `messages/en.json`
- [ ] Dark mode renders correctly (if theme toggle used on landing page)

**Audit fixes:**
- [ ] F1: `side="end"` in transaction form
- [ ] F2: Auth layout uses design tokens, no hardcoded hex
- [ ] F3/F18: Sidebar tagline is i18n'd, shows correct text
- [ ] F4: User avatar with dropdown menu in navbar
- [ ] F6/F7: Error boundary catches render errors, loading skeleton shows during page load
- [ ] F12: Category selector is shadcn Select with icons
- [ ] F16: Buttons use 6px border radius
- [ ] F17: `--color-surface` CSS variable works in light and dark modes
- [ ] F19/E1: `/settings` shows placeholder page, not 404
- [ ] E2: No logo aspect ratio console warnings

**Standard checks:**
- [ ] CI pipeline green (lint + type check + build)
- [ ] No new console errors or warnings
- [ ] RTL spot-check: switch to Arabic, verify layout doesn't break
- [ ] Dark mode spot-check: toggle theme, verify colors are readable
- [ ] Mobile spot-check: resize to 375px, verify no horizontal scroll

---

## 5. Unit 1.5M: Workflow & Documentation

### 5.1 Documentation Tasks

#### Create `docs/guides/11-workflow.md`

Document the unit execution workflow that has been followed since Wave 1:

```
Unit Execution Workflow
=======================

1. Plan     — brainstorm → design spec → implementation plan
2. Execute  — code in feature branch (feature/1.5X-short-slug)
3. PR       — push branch, open PR to main
4. Review   — request GitHub Copilot code review (mandatory)
5. Fix      — address Copilot review findings
6. UAT      — user tests against phase-specific checklist
7. Fix      — address UAT findings (if any)
8. Merge    — squash merge to main after UAT sign-off
```

Include: branch naming conventions, commit style, Copilot review requirement, UAT process overview.

#### Create `docs/guides/12-uat-template.md`

UAT checklist template with:
- 5 standard checks (CI, console errors, RTL, dark mode, mobile)
- Phase-specific checks section (derived from acceptance criteria)
- Sign-off block (tested by, date, result)

#### Create `docs/03-features/landing-page.md`

Full landing page feature spec documenting:
- All 7 sections with content and behavior
- Routing rules (auth vs unauth)
- Language detection logic
- SEO requirements
- Responsive breakpoints
- Based on what was actually built in Unit 1.5L (not speculative)

#### Update `docs/05-roadmap.md`

- Insert Phase 1.5 entry between Phase 1 and Phase 2 with full deliverable list
- Add deferred items to target phases:
  - Phase 2 (Import): Rate limiting and file size limits
  - Phase 3 (Debts): Credit card statement cycle, transaction pending/posted state
  - Phase 7 (Budgets): Category hierarchy reporting aggregation
  - Phase 11 (Notifications): APScheduler job persistence strategy

#### Update `docs/03-features/accounts.md`

- Document credit card utilization calculation formula
- Note deferred statement cycle features (statement date, min payment, statement vs current balance)
- Reference Phase 3 for full billing cycle implementation

#### Update `CLAUDE.md`

- Add reference to `docs/guides/11-workflow.md` in a new section or under existing Section H
- Add reference to `docs/guides/12-uat-template.md`
- Verify all version references are current (Next.js 16, Tailwind v4, shadcn base-nova)

### 5.2 Backend Fixes

#### B3: Route Order in Accounts Router (MAJOR)

**File:** `backend/app/routers/accounts.py`
**Current:** `/api/v1/accounts/net-worth` is declared AFTER `/{account_id}` — FastAPI path matching means `net-worth` could match as an account_id parameter
**Fix:** Move the `@router.get("/net-worth")` route declaration ABOVE `@router.get("/{account_id}")` so it matches first.

#### B4: Health Endpoint Return Type (MINOR)

**File:** `backend/app/main.py:49`
**Current:** Health endpoint has no return type annotation
**Fix:** Add `-> dict[str, str]` return type annotation.

### 5.3 Orchestration Updates

- Update `docs/superpowers/plans/phase-1.5/00-master-orchestration.md`:
  - Mark Wave 5 as ✅ Complete
  - Add Wave 5 plan file reference
  - Update "Next Step" to indicate Phase 1.5 is complete → Phase 2 starts

### 5.4 Unit 1.5M Acceptance Criteria

- [ ] `docs/guides/11-workflow.md` exists, is complete, and accurately documents the workflow
- [ ] `docs/guides/12-uat-template.md` exists with standard checks + phase-specific template
- [ ] `docs/03-features/landing-page.md` exists and matches the implemented landing page
- [ ] `docs/05-roadmap.md` includes Phase 1.5 entry and all deferred items
- [ ] `docs/03-features/accounts.md` updated with utilization and deferred features
- [ ] `CLAUDE.md` references new guides and has correct version numbers
- [ ] B3: `net-worth` route matches before `{account_id}` — verified by running tests
- [ ] B4: Health endpoint has return type annotation
- [ ] `00-master-orchestration.md` marks Wave 5 and Phase 1.5 complete
- [ ] All changes committed with appropriate conventional commit messages
- [ ] CI green

---

## 6. Phase 1.5 Completion Checklist

After both units are merged, verify the 10 success criteria from the original Phase 1.5 design spec (Section 11):

| # | Criterion | Verified By |
|---|-----------|-------------|
| 1 | Infrastructure on Next.js 16 + Tailwind v4 + shadcn base-nova | Waves 1–2 (complete) |
| 2 | All Phase 1 backend gaps closed | Wave 2 (complete) |
| 3 | All Phase 1 frontend pages match Stitch at functional fidelity | Waves 3–4 (complete) |
| 4 | Landing page live for unauthenticated users | Unit 1.5L |
| 5 | Auth pages redesigned to Stitch split-layout | Wave 3 Unit 1.5H (complete) |
| 6 | Onboarding wizard guides new users | Wave 3 Unit 1.5H (complete) |
| 7 | Error boundaries, toasts, skeletons, empty states | Wave 3 Units 1.5F+1.5G (complete) |
| 8 | Mobile navigation drawer works | Wave 3 Unit 1.5G (complete) |
| 9 | Workflow documented and followed | Unit 1.5M |
| 10 | Roadmap updated with deferred items | Unit 1.5M |

---

## 7. Deferred to Phase 2+

Items explicitly NOT in Wave 5 scope (from audit Section 4):

| # | Finding | Rationale | Target |
|---|---------|-----------|--------|
| F5 | Dashboard charts | Phase 4 scope | Phase 4 |
| F8 | AvatarGroup physical spacing | Not used yet | When needed |
| F10 | Account grouping count badges | Works; badges are polish | Phase 2+ |
| F11 | Credit card utilization bar on card | Nice-to-have visual | Phase 2+ |
| F13 | Amount input currency badge styling | Functional without it | Phase 2+ |
| F14 | Transfer FX preview | Phase 2 multi-currency | Phase 2 |
| E3 | Tablet sidebar tightness | Functional; optimize later | Phase 2+ |
| B5 | Generic[T] response typing | Works with `Any` | Phase 2+ |
| B6 | Enum validation in schemas | Runtime catches bad values | Phase 2+ |
| B7 | Test coverage gaps | Fill as endpoints are touched | Ongoing |
