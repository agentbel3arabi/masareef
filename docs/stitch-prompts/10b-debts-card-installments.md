# 10b — Debts Page: Card Installments Tab

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow (0 1px 3px rgba(0,0,0,0.08)), 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for positive/active, red (#EF4444) for high utilization/overdue, amber (#F59E0B) for warnings. Font: Inter for English, Noto Sans Arabic for Arabic. Numbers large and bold. Sidebar navigation on the left. Shadcn/ui component style. The app is called "Masareef" (مصاريف).

Anatomy: Same debts page layout with sidebar (Debts active). 4 horizontal tab bar at top (Loans | Card Installments | Store Installments | P2P). Card Installments tab is selected. Below tabs, a per-credit-card summary section showing utilization gauges. Then installment plan cards grouped under each credit card.

Vibe: Structured and clear on light background. White cards with soft shadows. Credit card utilization feels like a health meter — green when low, amber when moderate, red when high. Each installment plan card shows a clear progress bar of months elapsed. The grouping by credit card makes it easy to see total commitment per card. Feels organized and in-control.

Content:
- Tabs: Loans, Card Installments (active, green underline), Store Installments, P2P — "Add Plan" green button right-aligned
- Per-card utilization summary (horizontal scrolling cards row):
  - Card 1: "HSBC Visa" | Monthly commitment: 4,500 EGP | Total committed: 85,000 EGP | Limit: 100,000 EGP | Utilization: 85% (red circular gauge, nearly full) | "High" red badge
  - Card 2: "CIB Mastercard" | Monthly: 1,200 EGP | Committed: 14,400 EGP | Limit: 100,000 EGP | Utilization: 14.4% (green circular gauge, low fill) | "Healthy" green badge
- Group: "HSBC Visa — 3 active plans" (section header with card name):
  - Plan card 1:
    - "iPhone 16 Pro" (heading) | Active (green badge) | 3-dot overflow menu
    - Total: 54,000 EGP | Monthly: 4,500 EGP | 12 months
    - Started: Jan 2026 | Ends: Dec 2026
    - Progress bar: 3/12 months (25% green fill) | "3 of 12 payments made"
    - Remaining: 40,500 EGP (slate text)
  - Plan card 2:
    - "Samsung TV" | Active | Total: 18,000 EGP | Monthly: 1,500 EGP | 12 months
    - Started: Nov 2025 | Ends: Oct 2026
    - Progress: 5/12 (42% green fill) | Remaining: 10,500 EGP
  - Plan card 3:
    - "Laptop HP" | Active | Total: 13,000 EGP | Monthly: 1,083 EGP | 12 months
    - Started: Feb 2026 | Ends: Jan 2027
    - Progress: 2/12 (17% green fill) | Remaining: 10,834 EGP
- Group: "CIB Mastercard — 1 active plan":
  - Plan card:
    - "Air Conditioner" | Active | Total: 14,400 EGP | Monthly: 1,200 EGP | 12 months
    - Started: Mar 2026 | Ends: Feb 2027
    - Progress: 1/12 (8% green fill) | Remaining: 13,200 EGP
- Total section at bottom (light grey card): "Total Monthly Installment Commitment: 8,283 EGP/month across 4 plans"
```
