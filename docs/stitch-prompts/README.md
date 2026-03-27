# Stitch UI Design Prompts

31 self-contained prompts for [Google Stitch](https://stitch.withgoogle.com). Each file contains a complete, ready-to-paste prompt — no assembly required.

## Files

| # | Page | Description |
|---|------|-------------|
| **Public Pages** | | |
| 01 | Landing Page | Marketing page with pricing tiers (Free/Premium/Business) |
| 02 | Login | Split-screen sign-in with branded left panel |
| 03 | Registration | Sign-up with password strength, language selector |
| 04 | Onboarding | 4-step setup wizard (household, account, import, preferences) |
| **Core App** | | |
| 05 | Dashboard | Stat cards, net worth chart, income/expense, category donut, upcoming payments |
| 06 | Accounts | Account grid grouped by type, net worth summary, utilization bars |
| 07 | Account Detail | Single account transaction table with filters, pagination, category pills |
| 07b | Transactions (Global) | All-account transaction table, account column, manage mode, bulk ops |
| **Import** | | |
| 08 | Import — Upload | Drag-drop zone, account selector, saved templates |
| 08b | Import — Column Mapping | Map CSV headers to fields, date format, encoding, save as template |
| 09 | Import — Preview | Parsed rows table, duplicate detection, per-row toggles |
| **Debts** | | |
| 10 | Debts — Loans | Amortization table, payment matching, progress bars |
| 10b | Debts — Card Installments | Per-card utilization gauges, grouped installment plans |
| 10c | Debts — Store Installments | Merchant plans, 0% interest badges, completed section |
| 10d | Debts — Financing Apps | Egyptian BNPL (ValU, Souhoola, Sympl), per-app utilization gauges, grouped plans |
| 11 | Debts — P2P | Person cards, per-currency balances, split timelines |
| **Features** | | |
| 12 | Gam3eya | Payment schedule timeline, progress rings, payout highlight |
| 13 | Assets | Portfolio grid, ROI badges, ownership vs operating cost |
| 14 | Asset Detail | Value chart, cost breakdowns, linked transactions |
| 15 | Budgets | Category progress bars, warning/over states, unallocated spending |
| 15b | Savings Goals | Goal cards with progress rings, projected completion, behind/on-track |
| 16 | Forecasting | Cash flow bars, debt payoff lines, recurring rules list |
| 17 | Reports | Report type tiles with export format icons |
| **Overlays & Forms** | | |
| 18 | Notifications | Slide-out panel with urgency levels and action links |
| 21 | Transaction Form | Right-side sheet drawer, type toggle, amount hero, category grid |
| 22 | Transfer Form | Right-side sheet, two-account flow, FX rate for cross-currency |
| 23 | Empty States | 4 empty state screens (dashboard, accounts, transactions, debts) + 6 described |
| **Settings** | | |
| 19 | Settings — AI | Provider config, API keys, test connection, behavior toggles |
| 19b | Settings — Locale | Language, calendar, number format, date format, live preview |
| 19c | Settings — Categories | Grouped category list, icon/color editing, drag reorder |
| 19d | Settings — Notifications | Channel toggles, reminder timing, thresholds, Telegram connect |
| 19e | Settings — People | Person contact cards, relationship badges, debt summaries |
| 19f | Settings — Data & Billing | Export/import, danger zone, subscription plan, usage stats |
| 20 | Settings — Household | Members table, role badges, invite codes, activity log |

## How to Use

1. Open [stitch.withgoogle.com](https://stitch.withgoogle.com)
2. Open a prompt file, copy everything inside the code block
3. Paste into Stitch and generate
4. Iterate with follow-up prompts (see below)

## Recommended Order

Generate in this order — each page builds visual consistency from the previous:

```
Public:     01 → 02 → 03 → 04
Core:       05 → 06 → 07 → 07b
Import:     08 → 08b → 09
Debts:      10 → 10b → 10c → 11
Features:   12 → 13 → 14 → 15 → 15b → 16 → 17
Forms:      21 → 22
Overlays:   18 → 23
Settings:   19 → 19b → 19c → 19d → 19e → 19f → 20
```

## Generating Variants

After generating each light mode page, create variants with these follow-up prompts:

**Dark mode:**
> Now show me the dark mode version of this same page. Background: deep navy (#0F172A). Card surfaces: (#1E293B) with subtle white border (1px rgba 255,255,255, 0.08). Text: white (#F8FAFC) primary, muted slate (#94A3B8) secondary. Same semantic colors (green/red/amber). Same layout, same content. Charts use lighter grid lines.

**Arabic RTL:**
> Flip this layout to RTL. Sidebar on the right. Text right-aligned. Arabic labels: مصاريف for logo, حسابات for Accounts, معاملات for Transactions, ديون for Debts, جمعية for Gam3eya, أصول for Assets, ميزانية for Budgets, أهداف الادخار for Savings Goals, توقعات for Forecasting, تقارير for Reports, إعدادات for Settings, استيراد for Import, أشخاص for People, الفواتير for Billing.

**Mobile:**
> Show the mobile responsive version of this page. Single column layout. Bottom tab navigation instead of sidebar (5 tabs: Dashboard, Accounts, Transactions, Debts, More). Cards stack vertically. Stat cards scroll horizontally. Tables become card lists. Floating action button bottom-right. Sheets become full-screen on mobile.
