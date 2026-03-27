# 10d — Debts Page: Financing Apps Tab

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow (0 1px 3px rgba(0,0,0,0.08)), 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for healthy utilization, red (#EF4444) for high utilization/overdue, amber (#F59E0B) for moderate utilization. Font: Inter for English, Noto Sans Arabic for Arabic. Numbers large and bold. Sidebar navigation on the left. Shadcn/ui component style. The app is called "Masareef" (مصاريف).

Anatomy: Same debts page layout with sidebar (Debts active). 5 horizontal tab bar at top (Loans | Card Installments | Financing Apps | Store Installments | P2P). Financing Apps tab is selected. Below tabs, a horizontal scrolling row of per-app summary cards showing utilization gauges. Then installment plan cards grouped under each financing app.

Vibe: Modern fintech on light background. Each financing app feels like a branded mini-dashboard with its own utilization gauge — circular progress rings color-coded by health (green < 50%, amber 50-80%, red > 80%). Installment plans grouped under their parent app feel organized. The bottom total card gives a cross-app overview — "here's your total BNPL exposure." Egyptian BNPL apps are normalized, not hidden — this is how Egypt shops.

Content:
- Tabs: Loans, Card Installments, Financing Apps (active, green underline), Store Installments, P2P — "Add Plan" green button right-aligned
- Per-app utilization summary (horizontal scrolling cards, 3 visible):
  - Card 1: "ValU" ڤاليو | Credit limit: 50,000 EGP | Used: 35,000 EGP | Available: 15,000 EGP | Utilization: 70% (circular gauge, AMBER, 70% fill) | Active plans: 2 | Monthly: 2,500 EGP/month
  - Card 2: "Souhoola" سهولة | Limit: 30,000 EGP | Used: 15,000 EGP | Available: 15,000 EGP | Utilization: 50% (gauge, GREEN, 50% fill) | Plans: 1 | Monthly: 1,250 EGP/month
  - Card 3: "Sympl" سيمبل | Limit: 20,000 EGP | Used: 0 EGP | Available: 20,000 EGP | Utilization: 0% (gauge, GREY, empty) | Plans: 0 | Monthly: 0
- Group: "ValU — 2 active plans" (section header with app name and Arabic name ڤاليو):
  - Plan card 1:
    - "iPhone 16 Pro" (heading) | Merchant: B.TECH | Active (green badge) | 3-dot overflow menu
    - Total: 18,000 EGP | Monthly: 1,500 EGP | 12 months
    - Started: Dec 2025 | Ends: Nov 2026
    - Progress bar: 4/12 months (33% green fill) | "4 of 12 payments made"
    - Remaining: 12,000 EGP
  - Plan card 2:
    - "Washing Machine" | Merchant: B.TECH | Active
    - Total: 12,000 EGP | Monthly: 1,000 EGP | 12 months
    - Started: Oct 2025 | Ends: Sep 2026
    - Progress: 6/12 (50% green fill) | Remaining: 6,000 EGP
- Group: "Souhoola — 1 active plan" (سهولة):
  - Plan card:
    - "Air Conditioner" | Merchant: Samsung Store | Active
    - Total: 15,000 EGP | Monthly: 1,250 EGP | 12 months
    - Started: Feb 2026 | Ends: Jan 2027
    - Progress: 2/12 (17% green fill) | Remaining: 12,500 EGP
- Group: "Sympl — No active plans" (سيمبل):
  - Empty state: "No active installment plans on Sympl" (grey text, subtle)
- Total financing commitment (light grey summary card at bottom):
  - "Total BNPL Monthly Commitment: 3,750 EGP/month across 3 plans"
  - "Total Remaining: 30,500 EGP across all financing apps"
  - "Total Credit Used: 50,000 EGP of 100,000 EGP limit (50%)"
```
