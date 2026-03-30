# Feature: Landing Page

## Purpose

Public marketing landing page for unauthenticated users. Serves at `/` and showcases Masareef's value proposition, key features, pricing tiers, and onboarding flow. Authenticated users are automatically redirected to `/dashboard`.

## Routing & Auth

- **Route:** `app/page.tsx`
- **Auth Check:** Server-side authentication check:
  - Authenticated user → `redirect('/dashboard')`
  - Unauthenticated user → renders landing page
- **Supabase Auth:** Uses server-side `createServerSupabaseClient()` to check session

## Language & Localization

- **Browser Detection:** Locale detected via `next-intl` middleware
- **Manual Toggle:** Language toggle button in navigation (English ↔ Arabic)
- **RTL Support:** Arabic (ar) renders as right-to-left; English (en) renders as left-to-right
- **Persistence:** Language choice stored in locale cookie, persists across sessions
- **Copy Source:** All copy sourced from `next-intl` translations in `landing` namespace

## Layout Structure

7 full-screen sections rendered in order within a `min-h-screen` container:

```
┌──────────────────────────────────┐
│ 1. Navigation Bar (fixed)        │
├──────────────────────────────────┤
│ 2. Hero Section                  │
│    • Headline + CTA buttons      │
│    • Dashboard mockup            │
├──────────────────────────────────┤
│ 3. Features Grid                 │
│    • 6 feature cards             │
├──────────────────────────────────┤
│ 4. How It Works                  │
│    • 3-step flow                 │
├──────────────────────────────────┤
│ 5. Dashboard Mockup              │
│    • Stats cards + charts        │
├──────────────────────────────────┤
│ 6. Pricing Cards                 │
│    • 3-tier comparison           │
├──────────────────────────────────┤
│ 7. CTA / About Section           │
│    • Signup CTA + quote          │
├──────────────────────────────────┤
│ 8. Footer (4-column)             │
│    • Links + newsletter signup   │
└──────────────────────────────────┘
```

## Section Details

### 1. Navigation (LandingNav)

**Component:** `landing-nav.tsx`

**Desktop (md+ breakpoint):**
- Fixed position top-0, z-50
- Horizontal layout: [Logo] [Nav Links] [Actions]
- Nav links: Features, Pricing, About (anchor links)
- Actions: Language toggle, theme toggle, Sign In button, Get Started (CTA)
- Backdrop blur, semi-transparent background

**Mobile (< md):**
- Fixed position, horizontal layout maintained
- Logo on left, hamburger menu on right
- Language + theme toggles still visible
- Hamburger menu (Sheet component):
  - Slides from start (left in LTR, right in RTL)
  - Full nav links
  - Sign In + Get Started buttons (full width)

**Features:**
- Logo links to `/`
- Language toggle: "EN" or "ع" (Arabic for English/Arabic indicator), calls `setLocaleCookie()` and `router.refresh()`
- Theme toggle: sun/moon icons for light/dark mode
- Smooth transitions on hover

### 2. Hero Section (LandingHero)

**Component:** `landing-hero.tsx`

**Layout:**
- Desktop (md+): 2-column grid (text on left, mockup on right)
- Mobile: single column, stacked
- Max width container, centered

**Left Column (Text):**
1. Badge: animated pulsing dot + "Coming Soon" text, primary background
2. Headline: large 3-line split text (each line is a separate `<br />`, last line in primary color)
3. Arabic tagline: `hero.arabicTagline` translation, primary color, bold
4. Description: medium-length paragraph explaining value prop
5. CTAs: two buttons
   - Primary: "Get Started" → `/signup`
   - Secondary: "View Demo" or "Learn More" → anchor to `#features`

**Right Column (Mockup):**
- Glass card with rounded border, semi-transparent background, backdrop blur
- Balance display mockup:
  - Label: "Total Balance"
  - Amount: formatted currency (e.g., "1,250,000 EGP")
  - Trending indicator: green up arrow + "12%"
- Progress bar: visual indicator of savings progress
- Goal label: localized "Savings Goal" text
- Floating Gam3eya card (bottom-left, hidden on mobile):
  - Icon: Users
  - Label: "Office Gam3eya"
  - Amount: formatted payout

**Responsive Breakpoints:**
- Mobile (< md): single column, no floating card
- Desktop (md+): 2-column, floating card visible

### 3. Features Grid (LandingFeatures)

**Component:** `landing-features.tsx`

**Section ID:** `features` (anchor target for nav links)

**Layout:**
- Heading + subtitle (centered)
- Grid of 6 feature cards:
  - Mobile: 1 column
  - Tablet (md): 2 columns
  - Desktop (lg): 3 columns
- Gap: 1.5rem

**Feature Cards (6 total):**
1. Bank Import (Upload icon)
2. AI Categorize (Brain icon)
3. Debts & Installments (CreditCard icon)
4. Gam3eya (Users icon)
5. Assets (Building icon)
6. Family Multi-User (Home icon)

**Card Structure:**
- Icon badge: 12x12 size, primary background, primary text
- Title: localized key
- Description: localized key
- Hover state: shadow deepens
- Rounded border, card background, subtle shadow

### 4. How It Works (LandingHowItWorks)

**Component:** `landing-how-it-works.tsx`

**Layout:**
- Heading (centered)
- 3-step flow:
  - Mobile: stacked vertically (1 column)
  - Desktop (md+): 3 columns with horizontal connector line (hidden on mobile)

**Step Card Structure:**
- Numbered circle (primary background, white text, 12x12 size)
- Title (localized)
- Description (localized)
- Center-aligned text

**Connector Line:**
- Horizontal line connecting the 3 circles
- Desktop only (hidden on mobile)
- `start-0 end-0 top-6` positioning

### 5. Dashboard Mockup (LandingDashboard)

**Component:** `landing-dashboard.tsx`

**Layout:**
- Centered heading + subtitle
- Large card containing dashboard preview

**Card Contents:**
1. **Stats Row (4 cards):**
   - Total Balance: Wallet icon
   - Income (this month): TrendingUp icon, green text
   - Expenses (this month): TrendingDown icon, red text
   - Savings: PiggyBank icon, primary text
   - Responsive: 2 columns on mobile, 4 columns on desktop/tablet

2. **Content Row (2-column on lg):**
   - **Recent Transactions (lg: col-span-3):**
     - 4 transaction items
     - Each: icon, label, amount (green for income, red for expenses)
     - Icons: ShoppingCart, Briefcase, Phone, Users
   - **Savings Goal (lg: col-span-2):**
     - Circular progress visualization (SVG, 75% filled)
     - Center text: "75%"
     - Label below

**Responsive:**
- Mobile: single column
- Tablet+: grid layout with proper column spans

### 6. Pricing Cards (LandingPricing)

**Component:** `landing-pricing.tsx`

**Section ID:** `pricing` (anchor target for nav links)

**Layout:**
- Heading + subtitle (centered)
- 3-card grid:
  - Mobile: 1 column
  - Desktop (lg): 3 columns

**Plan Structure:**
1. **Free Tier**
   - "Free" name
   - Price display
   - Period ("per month" or "forever")
   - 3 features (with Check icons)
   - CTA button (outline variant)

2. **Premium Tier (Highlighted)**
   - "Most Popular" badge (absolute positioned at -top-3)
   - Scaled up slightly (`scale-105`)
   - Primary border color
   - Larger shadow
   - 5 features with Check icons
   - CTA button (default variant, more prominent)

3. **Business Tier**
   - Enterprise/Business name
   - Price display
   - Period
   - 4 features with Check icons
   - CTA button (outline variant)

**All CTAs link to `/signup`**

**Features:**
- All prices/features are localized translation keys
- Feature list: bulleted with Check icon

### 7. CTA / About Section (LandingCta)

**Component:** `landing-cta.tsx`

**Section ID:** `about` (anchor target for nav links)

**Layout:**
- 2-column grid (text on left, quote on right)
- Mobile: single column (stacked)
- Max width container

**Left Column:**
- Heading: "Why Masareef?"
- Description paragraph
- Primary CTA button → `/signup`
- Subtext below button: "No credit card required"

**Right Column:**
- Quote block with primary background
- Italic, large text
- Quote marks included in copy

### 8. Footer (LandingFooter)

**Component:** `landing-footer.tsx`

**Layout:**
- 4-column grid on desktop (lg)
- 2 columns on tablet (sm)
- 1 column on mobile
- Muted background

**Column 1: Brand**
- Masareef logo (horizontal, smaller than nav logo)
- Description paragraph

**Column 2: Product Links**
- Heading: "Product"
- Links: Features, Pricing, Gam3eya Tracker, Debt Calculator

**Column 3: Company Links**
- Heading: "Company"
- Links: About, Contact, Privacy Policy, Terms of Service

**Column 4: Newsletter**
- Heading: "Newsletter"
- Description text
- Email input with Mail icon
- Submit button
- On submit: show toast notification, clear input

**Footer Bottom:**
- Copyright text
- Top border

**Features:**
- All links are anchor links or external URLs (TBD)
- Email input has leading Mail icon, right-padded
- Newsletter submission prevents default, shows toast

## UI Reference Designs

| Screen | Component | Responsive |
|--------|-----------|-----------|
| Landing Nav | landing-nav.tsx | Desktop nav bar, mobile hamburger menu |
| Landing Hero | landing-hero.tsx | 2-col desktop, 1-col mobile, floating card on desktop |
| Landing Features | landing-features.tsx | 3-col desktop, 2-col tablet, 1-col mobile |
| Landing How It Works | landing-how-it-works.tsx | 3-col desktop with connector, 1-col mobile |
| Landing Dashboard | landing-dashboard.tsx | 4 stats on lg, 2 stats on mobile; grid layout for charts |
| Landing Pricing | landing-pricing.tsx | 3-col desktop, 1-col mobile; middle card highlighted |
| Landing CTA | landing-cta.tsx | 2-col desktop, 1-col mobile |
| Landing Footer | landing-footer.tsx | 4-col lg, 2-col sm, 1-col mobile |

## Component File List

All components located at `frontend/src/components/landing/`:

| File | Export | Purpose |
|------|--------|---------|
| `landing-nav.tsx` | `LandingNav` | Fixed navigation bar with logo, links, language/theme toggles |
| `landing-hero.tsx` | `LandingHero` | Hero section with headline, CTA, mockup |
| `landing-features.tsx` | `LandingFeatures` | 6-feature card grid |
| `landing-how-it-works.tsx` | `LandingHowItWorks` | 3-step flow with connector line |
| `landing-dashboard.tsx` | `LandingDashboard` | Dashboard mockup with stats and charts |
| `landing-pricing.tsx` | `LandingPricing` | 3-tier pricing comparison |
| `landing-cta.tsx` | `LandingCta` | About section with CTA and quote |
| `landing-footer.tsx` | `LandingFooter` | 4-column footer with links and newsletter signup |

## Design Tokens & Styling

- **Colors:** All colors from design token system (primary, secondary, muted, background, card, border)
- **Spacing:** Tailwind v4 spacing scale (px-6, py-20, gap-6, etc.)
- **Rounded corners:** Tailwind v4 rounded utilities (rounded-lg, rounded-xl, rounded-2xl, rounded-3xl, rounded-full)
- **Shadows:** Tailwind v4 shadow scale (shadow-sm, shadow-md, shadow-lg, shadow-xl, shadow-2xl)
- **Fonts:** Headline font (h1-h3), body font (p, span), interactive font (button, link)
- **Typography:** Font sizes from design tokens, bold/semibold weights for hierarchy

## CSS Directional Properties

**Critical:** All directional CSS properties use logical equivalents for RTL support:
- ✅ Use: `start`, `end`, `ps-` (padding-inline-start), `pe-` (padding-inline-end), `ms-` (margin-inline-start), `me-` (margin-inline-end), `inset-inline-` (inline direction insets), `text-start`, `text-end`
- ❌ Avoid: `left`, `right`, `pl-`, `pr-`, `ml-`, `mr-`, `text-left`, `text-right`

## SEO & Metadata

**Page Title:** "Masareef — Personal Finance for Egypt & MENA"

**Meta Description:** "Track spending, manage debts, import bank statements, and plan your finances — in Arabic and English."

**OpenGraph Tags:**
- `og:title` = "Masareef — Your Money, Your Language, Your Rules"
- `og:description` = "The first personal finance app built for Egyptian and MENA families."
- `og:type` = "website"
- `og:url` = "https://masareef.app"

**Twitter Card Tags:** (configured via framework defaults)

## Responsive Breakpoints

| Breakpoint | Width | Behavior |
|-----------|-------|----------|
| Mobile | 375px–767px | Single column, hamburger nav, hero stacked, 1-col features, stacked pricing, no floating elements |
| Tablet | 768px–1279px | 2-column features, nav visible, hero 2-col, pricing single-col centered |
| Desktop | 1280px+ | Full 3-column layouts, all elements visible, floating dashboard card, hero 2-col, pricing 3-col centered |

## API Endpoints

**None.** Landing page is entirely static markup with client-side interactivity (language toggle, theme toggle, mobile menu). No backend API calls.

## Client-Side Interactivity

| Feature | Handler | Action |
|---------|---------|--------|
| Language Toggle | `toggleLocale()` | Switches locale cookie, calls `router.refresh()` to re-render in new locale |
| Theme Toggle | `toggleTheme()` | Toggles theme via `useTheme()` hook (next-themes) |
| Mobile Menu | `Sheet` component state | Opens/closes hamburger menu |
| Newsletter Submit | `handleNewsletterSubmit()` | Prevents default, shows toast, clears email input |
| Navigation Links | Anchor hrefs | Scroll to section ID (e.g., `#features`, `#pricing`, `#about`) |
| CTA Buttons | Next.js Link components | Navigate to `/signup` or `/login` |

## Acceptance Criteria

- [ ] Unauthenticated users see landing page at `/`
- [ ] Authenticated users redirected to `/dashboard`
- [ ] All 8 sections render in correct order
- [ ] All section IDs properly set for anchor navigation (`#features`, `#pricing`, `#about`)
- [ ] Language toggle switches between Arabic and English
- [ ] Language choice persists across page refreshes (cookie)
- [ ] RTL/LTR layout flips correctly when locale changes
- [ ] Mobile (375px): single column layout, hamburger menu visible, no horizontal scroll
- [ ] Tablet (768px): 2-column features, nav visible
- [ ] Desktop (1280px+): hero 2-col, features 3-col, pricing 3-col, floating dashboard card visible
- [ ] All text uses `next-intl` translations from `landing` namespace
- [ ] All links (CTA buttons, nav links, footer links) navigate correctly
- [ ] Newsletter email input accepts valid emails
- [ ] Newsletter submit shows toast notification
- [ ] No physical directional CSS classes present (all use logical equivalents: start/end, ps/pe, ms/me, etc.)
- [ ] Dark mode toggle works correctly
- [ ] Production build succeeds with no errors or warnings
- [ ] Page loads within 2 seconds on 4G connection
- [ ] All images and icons render correctly
- [ ] Accessibility: all interactive elements keyboard accessible, semantic HTML used
- [ ] SEO metadata rendered in page head (title, meta description, og tags)
