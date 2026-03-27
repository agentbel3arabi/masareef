# 10c — Debts Page: Store Installments Tab

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow (0 1px 3px rgba(0,0,0,0.08)), 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for active/on-track, red (#EF4444) for overdue, amber (#F59E0B) for ending soon. Font: Inter for English, Noto Sans Arabic for Arabic. Numbers large and bold. Sidebar navigation on the left. Shadcn/ui component style. The app is called "Masareef" (مصاريف).

Anatomy: Same debts page layout with sidebar (Debts active). 4 horizontal tab bar at top. Store Installments tab is selected. Below tabs, summary cards row (2 cards). Then a list of store installment plan cards. Each card shows merchant name, plan details, progress bar, and payment info. No credit card grouping — store plans are independent.

Vibe: Clean and organized on light background. White plan cards with soft shadows. Each card prominently features the merchant/store name — feels like a receipt or purchase tracker. Progress bars show how far through the plan you are. Completed plans have a satisfying "done" state. The "0% interest" badge is a cultural callout — Egyptian users expect this and it builds trust. Feels like a personal installment dashboard.

Content:
- Tabs: Loans, Card Installments, Store Installments (active, green underline), P2P — "Add Plan" green button right-aligned
- Summary cards row:
  - "Monthly Store Payments" — 5,833 EGP/month (large bold)
  - "Active Store Plans" — 3 plans | Total remaining: 115,000 EGP
- Plan card 1:
  - 🏪 store icon | "B.TECH — Washing Machine" (heading) | Merchant: B.TECH (slate badge) | Active (green badge) | 0% Interest (emerald outline badge) | 3-dot menu
  - Total: 18,000 EGP | Monthly: 1,500 EGP | 12 months
  - Started: Oct 2025 | Ends: Sep 2026
  - Deducted from: CIB Savings (linked account badge with link icon)
  - Progress bar: 6/12 months (50% green fill) | "6 of 12 payments — halfway there!"
  - Remaining: 9,000 EGP
- Plan card 2:
  - 🏪 | "IKEA — Bedroom Set" | Merchant: IKEA | Active | 0% Interest | 3-dot menu
  - Total: 45,000 EGP | Monthly: 2,500 EGP | 18 months
  - Started: Jan 2026 | Ends: Jun 2027
  - Deducted from: HSBC Current
  - Progress: 3/18 (17% green fill) | "3 of 18 payments"
  - Remaining: 37,500 EGP
- Plan card 3:
  - 🏪 | "Jumia — Refrigerator" | Merchant: Jumia | Active | 0% Interest | 3-dot menu
  - Total: 22,000 EGP | Monthly: 1,833 EGP | 12 months
  - Started: Dec 2025 | Ends: Nov 2026
  - Deducted from: CIB Savings
  - Progress: 4/12 (33% green fill)
  - Remaining: 14,668 EGP
- Completed section (collapsed by default, "Completed Plans (2)" heading with chevron):
  - When expanded, 2 muted cards with "Completed ✓" green badge:
    - "B.TECH — Microwave" | 6,000 EGP | 6 months | Completed Oct 2025
    - "Samsung Store — Phone Case" | 1,800 EGP | 3 months | Completed Jan 2026
- Bottom summary (light grey card): "Total remaining across all active store plans: 61,168 EGP | Paid off: 2 plans worth 7,800 EGP"
```
