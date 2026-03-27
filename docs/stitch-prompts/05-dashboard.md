# 05 — Dashboard

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow (0 1px 3px rgba(0,0,0,0.08)), 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for income/positive, red (#EF4444) for expense/negative, amber (#F59E0B) for warnings. Sidebar: white background with light grey active state. Font: Inter for English, Noto Sans Arabic for Arabic. Numbers are large and prominent — financial amounts in 20-24px bold, dark text on light surface. Sidebar navigation on the left. All spacing generous (16-24px gaps). Shadcn/ui component style. The app is called "Masareef" (مصاريف) — an Arabic personal finance tracker. Include a sun/moon theme toggle button in the top navbar.

Anatomy: Full-width dashboard with collapsible left sidebar navigation. Top section has 4 horizontal stat cards in a row. Below that, a 2-column grid: left column has a large area chart (net worth over time), right column has a grouped bar chart (income vs expenses by month). Third row: left is a donut chart (spending by category), right is a list of upcoming payments. Bottom row: horizontal scrolling cards showing asset summaries by type.

Vibe: Premium clean fintech on a light background. Trustworthy, data-dense but not cluttered. Numbers are the hero — large, bold, dark text, scannable in 2 seconds. Cards are white with subtle shadows. Green for positive numbers, red for negative. Professional but warm. Airy and spacious — not cramped.

Content:
- Sidebar items: Dashboard (active, green accent), Accounts, Transactions, Forecasting, Debts, Gam3eya, Assets, Import. Settings group below with divider: Categories, People, Locale, Exchange Rates. App logo "مصاريف" at top of sidebar with green accent.
- Top navbar: sidebar toggle hamburger, breadcrumb "Dashboard", spacer, sun/moon theme toggle, language toggle (EN/AR), notification bell with red badge "3", user avatar
- Stat card 1: "Net Worth" — 1,250,000 EGP — ▲ 45,000 (+3.7%) — green arrow and green delta text
- Stat card 2: "This Month Spent" — 28,500 EGP — ▼ 3,200 (-10.1%) — green arrow (spending less is good)
- Stat card 3: "Active Debts" — 4 debts — 850,000 EGP remaining
- Stat card 4: "Due in 30 Days" — 32,250 EGP — 5 payments
- A small currency selector dropdown (EGP/USD/SAR) next to the stat cards
- Net worth area chart: 6 months of data, stacked areas for accounts (blue), assets (teal), debts (red, below zero line). Time range toggle pills: 1M 3M 6M 1Y All
- Income vs expense bar chart: 6 months, green bars (income) and red bars (expenses) side by side per month
- Category donut: Groceries 16.8%, Food & Dining 14.2%, Transportation 12.5%, Utilities 10.1%, Shopping 9.8%, Housing 8.5%, Other 28.1%. Colors from a warm palette. Legend on the right side of the donut.
- Upcoming payments list: 5 rows with date, description, amount, type badge (Loan/Installment/Gam3eya). One row highlighted red as "Overdue". Each row has a subtle right-arrow icon.
- Asset summary: 3 horizontal cards — Real Estate (350M EGP, +40% green), Gold (125K EGP, +50% green), Vehicles (900K EGP, -25% red)
```
