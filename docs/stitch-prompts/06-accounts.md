# 06 — Accounts Page

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow (0 1px 3px rgba(0,0,0,0.08)), 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for income/positive, red (#EF4444) for expense/negative, amber (#F59E0B) for warnings. Sidebar: white background with light grey active state. Font: Inter for English, Noto Sans Arabic for Arabic. Numbers are large and prominent — financial amounts in 20-24px bold. Sidebar navigation on the left. All spacing generous (16-24px gaps). Shadcn/ui component style. The app is called "Masareef" (مصاريف).

Anatomy: Page with same sidebar as dashboard. Top header bar with page title "Accounts", "Add Account" button (green), and "Manage" toggle button (outline). Below header, a summary bar showing total net worth broken down by currency. Then accounts grouped by type in a grid — each group has a section label with separator, and account cards in a 3-column grid below it.

Vibe: Clean light fintech. White cards with soft shadows, interactive (hover lift effect). Credit cards have a distinct visual treatment — negative balance shown in red with "Available: X" in green below. Cash wallets feel lighter/simpler than bank accounts. Each card feels like a mini financial summary.

Content:
- Sidebar: same as dashboard but "Accounts" is active (green accent)
- Net worth summary bar: white card spanning full width — "Net Worth: EGP 1,250,000" (large, bold) | Breakdown: Assets: 2,100,000 | Liabilities: 850,000 | 3 currency pill badges (EGP, USD, SAR) showing per-currency totals
- Bank Accounts group (section label "Bank Accounts" with count badge "2"):
  - Card: "CIB Savings" — CIB logo area — 235,000.00 EGP (large green text) — 3-dot overflow menu icon top-right
  - Card: "HSBC Current" — HSBC — 89,500.00 EGP (green)
- Credit Cards group (section label "Credit Cards" with count badge "2"):
  - Card: "HSBC Visa" — HSBC — -45,000.00 EGP (large red text, "owed" label) — Below: "Available: 55,000 EGP" (green, smaller) — Progress bar showing 45% utilization (red fill on grey track) — 3-dot menu
  - Card: "CIB Mastercard" — CIB — -12,300.00 EGP (red) — "Available: 87,700 EGP" (green) — 12.3% utilization bar
- Cash Wallets group (section label "Cash Wallets" badge "1"):
  - Card: "Cash" — wallet icon — 8,500.00 EGP (green)
- Digital Wallets group (section label "Digital Wallets" badge "1"):
  - Card: "Vodafone Cash" — phone icon — 3,200.00 EGP (green)
```
