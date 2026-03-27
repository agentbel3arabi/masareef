# 10 — Debts Page: Loans Tab

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for positive/paid, red (#EF4444) for overdue/negative, amber (#F59E0B) for warnings. Font: Inter for English, Noto Sans Arabic for Arabic. Numbers large and bold. Sidebar on left. Shadcn/ui style. The app is called "Masareef" (مصاريف).

Anatomy: Page with sidebar (Debts active). 4 horizontal tab bar at top (Loans | Card Installments | Store Installments | P2P). Below tabs, 2 summary cards in a row. Then a vertical list of expandable loan cards, each showing loan details and collapsible amortization table.

Vibe: Structured and clear on light background. White cards with soft shadows. Debt data presented with progress indicators. Paid installments feel accomplished (green check). Overdue feels urgent (red highlight on white card). Upcoming feels neutral (grey). The amortization table feels like a professional financial document.

Content:
- Sidebar: Debts active
- Tabs: Loans (active, green underline), Card Installments, Store Installments, P2P — "Add Loan" button aligned right of tabs
- Summary cards row:
  - "Monthly Debt Payments" — 15,250 EGP/month (large bold number)
  - "Total Active Loans" — 3 loans — 850,000 EGP remaining
- Loan card 1 (expanded):
  - Header row: "Car Loan — CIB" (heading) | Active (green badge) | 14.5% APR (slate badge) | 3-dot overflow menu
  - Stats row: Principal: 500,000 EGP | Monthly: 11,750 EGP | Remaining: 359,000 EGP | Start: Jan 2025 | Payoff: Jan 2030
  - Progress bar: 28% paid — green fill on grey track, "28% paid" label
  - Collapsible section "Amortization Schedule" (expanded, chevron icon):
    - Mini table — 3 visible rows:
      - #12 | Feb 2026 | 11,750 EGP | Principal: 5,712 | Interest: 6,038 | Remaining: 349,288 | Paid ✓ (green)
      - #13 | Mar 2026 | 11,750 EGP | Principal: 5,781 | Interest: 5,969 | Remaining: 343,507 | Paid ✓ (green)
      - #14 | Apr 2026 | 11,750 EGP | Principal: 5,850 | Interest: 5,900 | Remaining: 337,657 | Upcoming (grey pill)
    - "Show all 60 payments" link
  - Yellow suggestion card: "🔗 Match found: transaction -11,750 EGP on Mar 16 from CIB Savings" — [Link Payment] green button | [Dismiss] ghost button
- Loan card 2 (collapsed):
  - "Personal Loan — HSBC" | Active | 16% APR | 180,000 EGP remaining | 15% paid — collapsed, chevron to expand
```
