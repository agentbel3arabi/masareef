# Phase 1.75 Wave 1: Design System Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a new Stitch project with correct branding, extract shared components, redesign the sidebar, establish a configurable brand system, and write a design playbook for future phases.

**Architecture:** Wave 1 is the foundation that all subsequent waves build on. It has two phases: (A) Stitch design generation + user review (MCP-driven, interactive), and (B) code implementation (brand config, shared components, sidebar, token audit, playbook). Phase A must complete before Phase B begins — shared components are extracted from the *approved* designs.

**Tech Stack:** Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui (base-nova), next-intl, Stitch MCP

**Design spec:** `docs/superpowers/specs/2026-03-30-phase-1.75-design-system-redesign.md`

---

## Required Reading

- `docs/superpowers/specs/2026-03-30-phase-1.75-design-system-redesign.md` (the design spec)
- `docs/guides/09-design-tokens.md` (canonical design tokens)
- `docs/stitch-screen-map.md` (screen → feature mapping)
- `docs/guides/10-brand-assets.md` (logo usage guide)

---

## File Map

### New Files

| File | Purpose |
|------|---------|
| `frontend/src/config/brand.ts` | Brand name, taglines (EN/AR), URL — single source of truth |
| `frontend/src/components/shared/page-header.tsx` | Reusable page header: title + subtitle + action buttons |
| `frontend/src/components/shared/stat-card.tsx` | Stat card: icon + label + value + optional trend |
| `frontend/src/components/shared/filter-bar.tsx` | Standardized filter bar layout wrapper |
| `frontend/src/components/shared/data-table.tsx` | Consistent table styling wrapper |
| `frontend/src/components/shared/form-sheet.tsx` | Side sheet wrapper for forms |
| `frontend/src/components/shared/summary-bar.tsx` | Totals bar (net worth, income/expense) |
| `docs/guides/13-frontend-design-playbook.md` | How to generate and implement Stitch designs for future phases |
| `docs/superpowers/plans/phase-1.75/backend-dependencies.md` | Tracker for backend work discovered during redesign |

### Modified Files

| File | Changes |
|------|---------|
| `frontend/src/components/shared/logo.tsx` | Add `"white"` variant prop for dark backgrounds |
| `frontend/src/components/layout/sidebar.tsx` | Full redesign to match approved Stitch 05-dashboard sidebar |
| `frontend/src/components/layout/navbar.tsx` | Token alignment (spacing, colors) |
| `frontend/src/app/globals.css` | Audit and fix any CSS variable drift from canonical tokens |
| `frontend/messages/en.json` | Add `brand.tagline`, `brand.taglineShort`, update any hardcoded brand strings |
| `frontend/messages/ar.json` | Add `brand.tagline`, `brand.taglineShort`, update any hardcoded brand strings |

---

## Phase A: Stitch Design Generation + User Review

> **This phase is interactive.** It requires Stitch MCP calls and user approval per screen. Cannot be fully automated.

---

### Task 1: Create branch

- [ ] **Step 1: Create branch from main**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef
git checkout main && git pull
git checkout -b chore/1.75-design-system
```

---

### Task 2: Create new Stitch project with correct design system

- [ ] **Step 1: Create the Stitch project**

Use Stitch MCP `create_project` with title "Masareef v2 — Design System".

- [ ] **Step 2: Create the design system**

Use Stitch MCP `create_design_system` with these exact settings:

| Setting | Value |
|---------|-------|
| `displayName` | "Masareef Financial Atelier v2" |
| `colorMode` | `LIGHT` |
| `headlineFont` | `INTER` |
| `bodyFont` | `INTER` |
| `labelFont` | `INTER` |
| `roundness` | `ROUND_EIGHT` |
| `customColor` | `#16A34A` |
| `colorVariant` | `FIDELITY` |
| `overridePrimaryColor` | `#16A34A` |
| `overrideNeutralColor` | `#0F172A` |
| `overrideSecondaryColor` | `#64748B` |
| `designMd` | See step 3 below |

- [ ] **Step 3: Design MD content**

The `designMd` field should contain a condensed version of the design system guidance:

```
# Masareef Design System

## Brand
- Name: Masareef (مصاريف)
- Tagline EN: "Your entire financial life, finally making sense."
- Logo: Green gradient icon (teal #0D9488 → emerald #16A34A) showing stylized chart with circular node. DO NOT generate a logo — use placeholder text "Masareef" where logo would appear.

## Colors
- Primary: #16A34A (emerald green) — income, CTA, positive
- Error: #EF4444 — expense, negative, destructive
- Warning: #F59E0B — warnings, budget alerts
- Surface: #F8FAFC (light), #1E293B (dark)
- Text primary: #0F172A (light), #F8FAFC (dark)
- Text secondary: #64748B (light), #94A3B8 (dark)

## Typography
- Font: Inter (Latin), Noto Sans Arabic (Arabic)
- Border radius: 10px cards, 6px inputs, 4px badges

## Layout Rules
- Sidebar: left side (flips to right in RTL), collapsible
- Cards: surface bg, subtle border, 10px radius
- No heavy borders — use tonal shifts for separation
- Content areas: generous padding (24px)

## Financial App Conventions
- Money displayed in minor units formatted with locale
- Green = income/positive, Red = expense/negative
- Account types: Bank Account, Credit Card, Cash Wallet, Digital Wallet, Financing App
```

- [ ] **Step 4: Record the new project ID**

Save the project ID from `create_project` response. This ID will be used in all subsequent screen generation and in the design playbook.

---

### Task 3: Generate 8 screens (Stitch MCP)

Generate each screen one at a time using `generate_screen_from_text`. After each screen, present it to the user for review. **Do not proceed to the next screen until the current one is approved.**

- [ ] **Step 1: Generate 05-dashboard screen**

Prompt: "Dashboard page for a personal finance app called Masareef. Left sidebar with navigation (Overview, Finance, Planning, Settings sections). Main content: row of 4 stat cards (Net Worth, Monthly Income, Monthly Expenses, Active Debts), followed by a recent transactions list showing last 5 transactions with date/description/amount/category, and placeholder areas for charts labeled 'Spending by Category' and 'Income vs Expenses'. Top-right: user avatar dropdown. Use the brand name 'Masareef' as text where a logo would go."

**USER REVIEW GATE:** Present screen to user. Wait for approval or revision request.

- [ ] **Step 2: Generate 06-accounts screen**

Prompt: "Accounts page for Masareef finance app. Same sidebar as dashboard. Header: 'Accounts' with 'Add Account' button. Summary bar showing total net worth (assets minus liabilities). Account cards grouped by type sections: 'Bank Accounts' (2-3 cards), 'Credit Cards' (1-2 cards with utilization bar), 'Cash Wallets' (1 card), 'Digital Wallets' (1 card). Each card shows: account name, institution, balance (green for positive, red for negative), last transaction date. Type section headers have count badges."

**USER REVIEW GATE:** Present screen to user. Wait for approval or revision request.

- [ ] **Step 3: Generate 07-account-detail screen**

Prompt: "Account detail page for Masareef finance app. Same sidebar. Header: account name with balance, account type badge, and institution name. Stats row: 3 cards showing 'Income This Month', 'Expenses This Month', 'Average Transaction'. Below: filter bar (search, date range, type dropdown, category dropdown) and transaction table with columns: Date, Description, Category (with icon), Amount (colored). Pagination at bottom."

**USER REVIEW GATE:** Present screen to user. Wait for approval or revision request.

- [ ] **Step 4: Generate 07b-transactions-global screen**

Prompt: "All transactions page for Masareef finance app. Same sidebar. Header: 'Transactions' with summary stats row (Total Income, Total Expenses, Net this period). Filter bar: search input, date range picker, account dropdown, category dropdown, type dropdown, amount range. Transaction table: Date, Account (pill badge), Description, Category (icon + name), Amount (green/red). Bulk selection checkboxes. Floating action button (green circle with + icon) in bottom-right corner. Pagination."

**USER REVIEW GATE:** Present screen to user. Wait for approval or revision request.

- [ ] **Step 5: Generate 02-login screen**

Prompt: "Login page for Masareef finance app. Split-screen layout. Left panel (50%): dark navy background (#0F172A). White text: brand name 'Masareef' large at top, tagline 'Your entire financial life, finally making sense.' below. 3-4 feature bullet points with icons (Bank Import, Smart Categories, Multi-Currency, Household Sharing). Right panel (50%): white/light background. 'Sign In' heading. Email and password fields. 'Sign In' green primary button. 'Forgot password?' link. Divider 'or'. Google and Apple social login buttons. Bottom: 'Don't have an account? Sign up' link."

**USER REVIEW GATE:** Present screen to user. Wait for approval or revision request.

- [ ] **Step 6: Generate 03-registration screen**

Prompt: "Registration page for Masareef finance app. Same split-screen as login. Left panel: dark navy (#0F172A), brand name, tagline, feature bullets. Right panel: 'Create Account' heading. Form fields: First Name, Last Name, Email, Password, Confirm Password, Country dropdown (Egypt, Saudi Arabia, UAE, Kuwait, Bahrain, Qatar, Other), Language toggle (English/العربية), Gender radio, Age input. 'Create Account' green button. Bottom: 'Already have an account? Sign in' link."

**USER REVIEW GATE:** Present screen to user. Wait for approval or revision request.

- [ ] **Step 7: Generate 04-onboarding screen**

Prompt: "Onboarding wizard for Masareef finance app. Clean centered layout with brand name at top. Progress indicator showing 4 steps (dots or numbered). Current step 3 of 4: 'Add Your First Account'. Card with form: Account Name input, Account Type selector (Bank Account, Credit Card, Cash Wallet, Digital Wallet, Financing App) shown as selectable cards with icons, Initial Balance input with currency indicator, Institution name input. 'Skip' and 'Next' buttons at bottom. Previous steps were: 1. Name your household, 2. Choose base currency."

**USER REVIEW GATE:** Present screen to user. Wait for approval or revision request.

- [ ] **Step 8: Generate 01-landing-page screen**

Prompt: "Landing page for Masareef finance app. Navigation bar: brand name 'Masareef' on left, nav links (Features, How It Works, Pricing) center, 'Login' and 'Get Started' buttons right. Hero section: large heading 'Your entire financial life, finally making sense.', subtitle about AI-powered personal finance for MENA region, 'Get Started Free' CTA button, dashboard preview mockup image. Features grid: 6 cards with icons (Bank Import, Smart Categories, Debt Tracking, Gam3eya, Multi-Currency, Household). How It Works: 3 steps (Import, Categorize, Insight). Pricing: 3 tiers (Free, Pro, Family). Final CTA banner. Footer with links."

**USER REVIEW GATE:** Present screen to user. Wait for approval or revision request.

- [ ] **Step 9: Commit Stitch project reference**

After all 8 screens are approved, record the project ID and screen IDs in a reference file:

Create `docs/superpowers/plans/phase-1.75/stitch-project-reference.md`:

```markdown
# Phase 1.75 Stitch Project Reference

**Project ID:** [ID from Task 2]
**Project Title:** Masareef v2 — Design System

## Approved Screens

| Screen | Screen ID | Approved Date |
|--------|-----------|--------------|
| 01-landing-page | [ID] | [date] |
| 02-login | [ID] | [date] |
| 03-registration | [ID] | [date] |
| 04-onboarding | [ID] | [date] |
| 05-dashboard | [ID] | [date] |
| 06-accounts | [ID] | [date] |
| 07-account-detail | [ID] | [date] |
| 07b-transactions-global | [ID] | [date] |
```

```bash
git add docs/superpowers/plans/phase-1.75/stitch-project-reference.md
git commit -m "docs: record approved Stitch project and screen IDs"
```

---

## Phase B: Code Implementation

> **Prerequisite:** All 8 Stitch screens approved by user (Phase A complete).

---

### Task 4: Create brand config

**Files:**
- Create: `frontend/src/config/brand.ts`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ar.json`

- [ ] **Step 1: Create brand.ts**

```typescript
// frontend/src/config/brand.ts

/**
 * Single source of truth for brand strings.
 * Change here → takes effect across entire site via i18n.
 *
 * These values are also mirrored in messages/en.json and messages/ar.json
 * under the "brand" key. Components should use t('brand.tagline') for
 * locale-aware rendering. This file is for non-i18n contexts (metadata, OG tags).
 */
export const BRAND = {
  name: "Masareef",
  nameAr: "مصاريف",
  tagline: "Your entire financial life, finally making sense.",
  taglineAr: "حسبة بيتك، متظبطة بالملي.",
  url: "https://masareef.app",
} as const;
```

- [ ] **Step 2: Add brand keys to en.json**

Add a `"brand"` section to `frontend/messages/en.json`:

```json
"brand": {
  "name": "Masareef",
  "tagline": "Your entire financial life, finally making sense.",
  "taglineShort": "AI-Powered Personal Finance"
}
```

Also update any existing hardcoded brand references. Replace `"sidebar.tagline"` value with reference to the correct tagline text:

In `en.json`, update `sidebar.tagline` to: `"Your entire financial life, finally making sense."`

- [ ] **Step 3: Add brand keys to ar.json**

Add matching `"brand"` section to `frontend/messages/ar.json`:

```json
"brand": {
  "name": "مصاريف",
  "tagline": "حسبة بيتك، متظبطة بالملي.",
  "taglineShort": "إدارة مالية ذكية"
}
```

Update `sidebar.tagline` in `ar.json` to: `"حسبة بيتك، متظبطة بالملي."`

- [ ] **Step 4: Verify build**

```bash
cd frontend && pnpm build
```

Expected: Build passes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/config/brand.ts frontend/messages/en.json frontend/messages/ar.json
git commit -m "feat: add brand config with configurable taglines"
```

---

### Task 5: Update Logo component with variant support

**Files:**
- Modify: `frontend/src/components/shared/logo.tsx`

- [ ] **Step 1: Update Logo component**

The current Logo component uses `colorScheme` prop (`"auto" | "light" | "dark"`). This already handles light/dark theme switching. We need to make sure the `colorScheme="dark"` path correctly maps to the white logo variant for use on dark backgrounds like the auth marketing panel.

Read the current `logo.tsx` implementation. The current `logoFiles` mapping is:
- `horizontal.light` → `/logos/horizontal.svg` (green icon + black text)
- `horizontal.dark` → `/logos/horizontal-white.svg` (green icon + white text)

This already works correctly — `colorScheme="dark"` will use the white variant. Verify the logo files are correctly symlinked/copied in `frontend/public/logos/`:

```bash
ls -la frontend/public/logos/
```

If the logo files don't exist in `public/logos/`, they need to be copied from `logos/svg/transparent/`:

```bash
# Only if files are missing:
mkdir -p frontend/public/logos
cp logos/svg/transparent/horizontal-transparent.svg frontend/public/logos/horizontal.svg
cp logos/svg/transparent/horizontal-transparent-white.svg frontend/public/logos/horizontal-white.svg
cp logos/svg/transparent/stacked-transparent.svg frontend/public/logos/stacked.svg
cp logos/svg/transparent/stacked-transparent-white.svg frontend/public/logos/stacked-white.svg
cp logos/svg/transparent/icon-transparent.svg frontend/public/logos/icon.svg
```

- [ ] **Step 2: Add authPanelWhite size constant**

In `logo.tsx`, update `LOGO_SIZES` to add a dedicated auth panel size for the dark navy panel:

```typescript
export const LOGO_SIZES = {
  sidebar: { width: 150, height: 60 },
  mobileNav: { width: 36, height: 36 },
  authPanel: { width: 240, height: 96 },
  authPanelWhite: { width: 200, height: 80 },  // white variant on dark panel
  onboarding: { width: 150, height: 60 },
  landing: { width: 140, height: 56 },
  landingFooter: { width: 140, height: 56 },
} as const;
```

- [ ] **Step 3: Verify build**

```bash
cd frontend && pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/shared/logo.tsx frontend/public/logos/
git commit -m "feat: ensure logo variants available for dark backgrounds"
```

---

### Task 6: Create shared PageHeader component

**Files:**
- Create: `frontend/src/components/shared/page-header.tsx`

- [ ] **Step 1: Create PageHeader**

```typescript
// frontend/src/components/shared/page-header.tsx

import { type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shared/page-header.tsx
git commit -m "feat: add shared PageHeader component"
```

---

### Task 7: Create shared StatCard component

**Files:**
- Create: `frontend/src/components/shared/stat-card.tsx`

- [ ] **Step 1: Create StatCard**

```typescript
// frontend/src/components/shared/stat-card.tsx

import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: {
    direction: "up" | "down" | "flat";
    text: string;
  };
  className?: string;
}

export function StatCard({ icon: Icon, label, value, trend, className }: StatCardProps) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">
            {label}
          </p>
          <p className="text-lg font-bold text-foreground truncate">{value}</p>
        </div>
      </div>
      {trend && (
        <p
          className={cn(
            "mt-2 text-xs font-medium",
            trend.direction === "up" && "text-primary",
            trend.direction === "down" && "text-destructive",
            trend.direction === "flat" && "text-muted-foreground"
          )}
        >
          {trend.direction === "up" && "↑ "}
          {trend.direction === "down" && "↓ "}
          {trend.text}
        </p>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/shared/stat-card.tsx
git commit -m "feat: add shared StatCard component"
```

---

### Task 8: Create shared SummaryBar component

**Files:**
- Create: `frontend/src/components/shared/summary-bar.tsx`

- [ ] **Step 1: Create SummaryBar**

```typescript
// frontend/src/components/shared/summary-bar.tsx

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SummaryItem {
  label: string;
  value: string;
  colorClass?: string; // e.g. "text-primary" or "text-destructive"
}

interface SummaryBarProps {
  items: SummaryItem[];
  className?: string;
}

export function SummaryBar({ items, className }: SummaryBarProps) {
  return (
    <Card className={cn("flex flex-wrap items-center gap-6 p-4", className)}>
      {items.map((item) => (
        <div key={item.label} className="flex flex-col">
          <span className="text-xs font-medium text-muted-foreground">
            {item.label}
          </span>
          <span
            className={cn("text-lg font-bold", item.colorClass ?? "text-foreground")}
          >
            {item.value}
          </span>
        </div>
      ))}
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/shared/summary-bar.tsx
git commit -m "feat: add shared SummaryBar component"
```

---

### Task 9: Create shared FilterBar component

**Files:**
- Create: `frontend/src/components/shared/filter-bar.tsx`

- [ ] **Step 1: Create FilterBar**

```typescript
// frontend/src/components/shared/filter-bar.tsx

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * Standardized wrapper for filter controls. Provides consistent
 * spacing and responsive layout for filter inputs.
 *
 * Usage:
 *   <FilterBar>
 *     <Input placeholder="Search..." />
 *     <Select>...</Select>
 *     <DatePicker />
 *   </FilterBar>
 */
export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4",
        className
      )}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/shared/filter-bar.tsx
git commit -m "feat: add shared FilterBar component"
```

---

### Task 10: Create shared DataTable component

**Files:**
- Create: `frontend/src/components/shared/data-table.tsx`

- [ ] **Step 1: Create DataTable**

```typescript
// frontend/src/components/shared/data-table.tsx

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyState,
  className,
}: DataTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={cn("overflow-x-auto rounded-lg border bg-card", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-start text-xs font-medium uppercase tracking-wider text-muted-foreground",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "transition-colors hover:bg-muted/30",
                onRowClick && "cursor-pointer"
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn("px-4 py-3", col.className)}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/shared/data-table.tsx
git commit -m "feat: add shared DataTable component"
```

---

### Task 11: Create shared FormSheet component

**Files:**
- Create: `frontend/src/components/shared/form-sheet.tsx`

- [ ] **Step 1: Create FormSheet**

```typescript
// frontend/src/components/shared/form-sheet.tsx

import { type ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface FormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Standardized side-sheet wrapper for forms (transaction form, transfer form, etc.).
 * Opens from the end side (right in LTR, left in RTL).
 */
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: FormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="end" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="mt-6 space-y-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shared/form-sheet.tsx
git commit -m "feat: add shared FormSheet component"
```

---

### Task 12: Design token audit

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Read current globals.css and compare with canonical tokens**

Read `frontend/src/app/globals.css` and compare CSS variable values against `docs/guides/09-design-tokens.md`:

| Token | Canonical (09-design-tokens.md) | CSS Variable |
|-------|-------------------------------|-------------|
| Primary green | `#16A34A` | `--primary: 142.1 76.2% 36.3%` |
| Error red | `#EF4444` | `--destructive: 0 84.2% 60.2%` |
| Warning amber | `#F59E0B` | `--warning: 37.7 92.1% 50.2%` |
| Light bg | `#FFFFFF` | `--background: 0 0% 100%` |
| Light surface | `#F8FAFC` | `--surface: 210 40% 98%` |
| Light card border | `#E2E8F0` | `--border: 214.3 31.8% 91.4%` |
| Light text primary | `#0F172A` | `--foreground: 222.2 47.4% 11.2%` |
| Light text secondary | `#64748B` | `--muted-foreground: 215.4 16.3% 46.9%` |
| Border radius | 10px (cards) | `--radius: 0.625rem` |

Verify each value. Convert hex to HSL if needed to check. Fix any drift.

- [ ] **Step 2: Verify the dark mode tokens**

Check the `.dark` section in globals.css against canonical dark mode tokens:

| Token | Canonical | Expected HSL |
|-------|-----------|-------------|
| Dark bg | `#0F172A` | `222.2 47.4% 11.2%` |
| Dark surface | `#1E293B` | `217.2 32.6% 17.5%` |
| Dark text primary | `#F8FAFC` | `210 40% 98%` |
| Dark text secondary | `#94A3B8` | `215 20.2% 65.1%` |

Fix any mismatches.

- [ ] **Step 3: Verify build**

```bash
cd frontend && pnpm build
```

- [ ] **Step 4: Commit (only if changes were made)**

```bash
git add frontend/src/app/globals.css
git commit -m "fix: align CSS design tokens with canonical spec"
```

---

### Task 13: Redesign sidebar to match approved Stitch design

**Files:**
- Modify: `frontend/src/components/layout/sidebar.tsx`
- Possibly modify: `frontend/src/components/layout/app-shell.tsx`
- Possibly modify: `frontend/src/lib/nav-items.ts`

- [ ] **Step 1: Analyze approved Stitch 05-dashboard sidebar**

Use Stitch MCP `get_screen` on the approved dashboard screen to extract the sidebar structure: navigation groups, icon choices, spacing, active state styling, collapse behavior, bottom section layout.

- [ ] **Step 2: Rebuild sidebar.tsx**

Rebuild the sidebar component to match the approved Stitch design. Preserve:
- `useSidebar()` context for collapse state (localStorage persistence)
- RTL support via `isRtl` locale detection
- `navItems` configuration from `lib/nav-items.ts`
- Disabled items with `cursor-not-allowed` styling
- Bottom section with Help + Logout

Change (based on approved design):
- Section grouping and visual hierarchy
- Active state indicator styling
- Logo placement and tagline (use `t('brand.tagline')`)
- Collapse/expand toggle positioning and icon
- Overall spacing, padding, typography
- Color tokens to match canonical spec

The exact code depends on the approved Stitch design output. The implementing agent should read the Stitch screen, extract the layout structure, and rebuild the component accordingly.

- [ ] **Step 3: Verify sidebar works**

```bash
cd frontend && pnpm build && pnpm lint
```

Test manually:
- Sidebar renders correctly expanded
- Collapse toggle works, state persists in localStorage
- Navigation links work, active state shows correctly
- Help and Logout at bottom work
- Collapsed state shows icons only
- RTL: switch to Arabic, verify sidebar flips to right side

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/sidebar.tsx frontend/src/components/layout/app-shell.tsx frontend/src/lib/nav-items.ts
git commit -m "feat: redesign sidebar to match Stitch design"
```

---

### Task 14: Navbar token alignment

**Files:**
- Modify: `frontend/src/components/layout/navbar.tsx`

- [ ] **Step 1: Read current navbar and check tokens**

Read `frontend/src/components/layout/navbar.tsx`. Verify all colors, spacing, and typography use design token CSS variables (not hardcoded values). Fix any direct hex values or non-standard spacing.

- [ ] **Step 2: Apply fixes**

Ensure:
- Height matches Stitch design (typically `h-16`)
- Background uses `bg-card` or `bg-background` (not hardcoded)
- Border uses `border-b` with `border-border` (not hardcoded)
- User avatar dropdown uses proper token colors
- Mobile nav trigger uses consistent icon sizing

- [ ] **Step 3: Commit (only if changes were made)**

```bash
git add frontend/src/components/layout/navbar.tsx
git commit -m "fix: align navbar with design tokens"
```

---

### Task 15: Initialize backend dependencies tracker

**Files:**
- Create: `docs/superpowers/plans/phase-1.75/backend-dependencies.md`

- [ ] **Step 1: Create the tracker file**

```markdown
# Phase 1.75: Backend Dependencies

Discovered during page redesign. Each item maps to a future phase.

| # | UI Element | Page | Backend Needed | Target Phase | Status |
|---|-----------|------|---------------|-------------|--------|
| | | | | | |

_Updated as items are discovered during Waves 2a, 2b, 2c._
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/phase-1.75/backend-dependencies.md
git commit -m "docs: initialize backend dependencies tracker"
```

---

### Task 16: Write frontend design playbook

**Files:**
- Create: `docs/guides/13-frontend-design-playbook.md`

- [ ] **Step 1: Write the playbook**

```markdown
# Frontend Design Playbook

How to generate and implement Stitch-designed pages for Masareef. Follow this for every phase that includes frontend work.

## Stitch Project

**Project ID:** [insert from Task 2]
**Project Title:** Masareef v2 — Design System

All new screens are generated in this single project to maintain design consistency.

## Workflow: Generate → Review → Implement

### Step 1: Generate Screen

Use Stitch MCP `generate_screen_from_text` with the project ID above. Every prompt must include:

- Brand name: "Masareef" (use as text, do not generate a logo)
- Tagline: "Your entire financial life, finally making sense."
- Reference to the feature spec for data/behavior accuracy
- Specific page content and layout requirements
- The sidebar navigation (consistent across all app pages)

### Step 2: User Reviews Design

Present the generated screen to the user. Do not proceed until they approve.

If changes are needed, use `edit_screens` to revise and present again.

### Step 3: Implement Using Shared Components

Build the page using these shared components (all in `components/shared/`):

| Component | Import | Use For |
|-----------|--------|---------|
| `PageHeader` | `@/components/shared/page-header` | Every page's title + subtitle + action buttons |
| `StatCard` | `@/components/shared/stat-card` | Dashboard, detail pages |
| `FilterBar` | `@/components/shared/filter-bar` | Any page with filters |
| `DataTable` | `@/components/shared/data-table` | Transaction lists, transfer lists |
| `FormSheet` | `@/components/shared/form-sheet` | Create/edit forms |
| `SummaryBar` | `@/components/shared/summary-bar` | Net worth, period totals |
| `EmptyState` | `@/components/shared/empty-state` | When data is empty |
| `MoneyDisplay` | `@/components/shared/money-display` | All monetary values |

### Step 4: Verify

Before creating PR, check:

- [ ] Page matches approved Stitch design
- [ ] All colors use CSS variables (no hardcoded hex)
- [ ] All spacing uses Tailwind tokens (no arbitrary values where avoidable)
- [ ] RTL: switch to Arabic, verify layout flips correctly
- [ ] Dark mode: toggle theme, verify all elements readable
- [ ] Responsive: check 375px (mobile), 768px (tablet), 1280px (desktop)
- [ ] All text uses i18n `t()` calls (no hardcoded English/Arabic)
- [ ] CSS logical properties only (`ps-`, `pe-`, `start-`, `end-` — never `pl-`, `pr-`, `left-`, `right-`)
- [ ] `pnpm build` + `pnpm lint` + `tsc --noEmit` pass

## "Coming Soon" Elements

If the Stitch design includes UI elements that need backend work not yet built:

- **Buttons:** Render disabled with tooltip "Coming soon"
- **Tabs/sections:** Show content area with empty state "Coming in Phase N"
- **Charts:** Placeholder card with title + "Coming in Phase 4"
- **Forms with missing API:** Build form UI, disable submit, add note

Log every such element in `docs/superpowers/plans/phase-1.75/backend-dependencies.md`.

## Design Token Authority

When Stitch design conflicts with `docs/guides/09-design-tokens.md`, **design tokens always win**:

- Colors: Use canonical values from `globals.css` CSS variables
- Fonts: Always Inter + Noto Sans Arabic (never Stitch-generated fonts)
- Border radius: 10px cards, 6px inputs, 4px badges
- Spacing: Follow Tailwind scale, not Stitch pixel values
```

- [ ] **Step 2: Commit**

```bash
git add docs/guides/13-frontend-design-playbook.md
git commit -m "docs: add frontend design playbook for future phases"
```

---

### Task 17: Final verification

- [ ] **Step 1: Full build check**

```bash
cd frontend && pnpm build && pnpm lint && pnpm exec tsc --noEmit
```

All three must pass.

- [ ] **Step 2: Verify shared components are importable**

Quick check that all new components can be imported without circular dependencies:

```bash
cd frontend && pnpm exec tsc --noEmit
```

- [ ] **Step 3: Visual check**

Start dev server and verify:
- Sidebar renders with new design
- Logo shows correctly in sidebar (expanded + collapsed)
- Tagline shows from i18n (both English and Arabic)
- All existing pages still render (no regressions)

```bash
cd frontend && pnpm dev
```

Check at: http://localhost:3000

- [ ] **Step 4: Push and create PR**

```bash
git push -u origin chore/1.75-design-system
```

Create PR to main with title: "chore: Phase 1.75 Wave 1 — design system foundation"

Body should include:
- New Stitch project created with correct branding
- 8 screens generated and approved
- Brand config (configurable taglines)
- 6 shared components: PageHeader, StatCard, FilterBar, DataTable, FormSheet, SummaryBar
- Sidebar redesign matching Stitch design
- Design token audit
- Frontend design playbook

- [ ] **Step 5: Request Copilot code review**

Use GitHub MCP to request Copilot review on the PR.

- [ ] **Step 6: Address review findings**

Fix any issues found by Copilot review.

---

## Execution Order Summary

```
Phase A (Interactive — requires user):
  Task 1: Create branch
  Task 2: Create Stitch project + design system
  Task 3: Generate 8 screens (one-by-one, user approves each)  ← GATE

Phase B (Code — can be automated):
  Task 4: Brand config (brand.ts + i18n)
  Task 5: Logo variant support
  Task 6: PageHeader component
  Task 7: StatCard component
  Task 8: SummaryBar component
  Task 9: FilterBar component
  Task 10: DataTable component
  Task 11: FormSheet component
  Task 12: Design token audit
  Task 13: Sidebar redesign (from approved Stitch design)
  Task 14: Navbar token alignment
  Task 15: Backend dependencies tracker
  Task 16: Design playbook
  Task 17: Final verification + PR
```

---

## Post-Wave 1

After Wave 1 merges:
1. Write Wave 2a implementation plan (auth + onboarding redesign)
2. Execute Wave 2a
3. Write Wave 2b plan (core app pages)
4. Execute Wave 2b
5. Write Wave 2c plan (landing refresh)
6. Execute Wave 2c
7. Phase 1.75 complete → Phase 2 begins
