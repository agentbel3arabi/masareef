# 11 — Debts Page: P2P Tab

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for "owes you"/positive, red (#EF4444) for "you owe"/negative. Font: Inter for English, Noto Sans Arabic for Arabic. Numbers large and bold. Sidebar on left. Shadcn/ui style. The app is called "Masareef" (مصاريف).

Anatomy: Same debts page with P2P tab selected. "Add Person" button top-right. Below tabs, person cards stacked vertically. Each person card is collapsible — header shows person avatar/initials, name, relationship badge, and per-currency net balance summary. Expanded view shows individual debts with repayment split schedules.

Vibe: Personal and relational on light background. White person cards with soft shadows feel like contact cards. Relationship badges add warmth (colored pills). Balance shown clearly — "Owes you" in green, "You owe" in red. Currency breakdowns feel organized in a clean layout. Split schedules feel like a payment timeline.

Content:
- Tabs: Loans, Card Installments, Store Installments, P2P (active, green underline) — "Add Person" button right-aligned
- Person card 1 (expanded):
  - Header: Avatar circle with "AH" initials | "Ahmed Hassan" (heading) | "Family" badge (blue pill) | phone icon "0123-456-7890" | 3-dot menu
  - Balance summary (inside a light grey (#F8FAFC) sub-card):
    - EGP: You lent 10,000 | Ahmed paid 5,000 | Net: Ahmed owes you 5,000 (green bold)
    - USD: You borrowed $200 | You paid $0 | Net: You owe $200 (red bold)
    - Divider line
    - Total in EGP: Ahmed owes you 3,000 EGP (green, larger text, converted via FX)
  - Debt 1 card (white, nested):
    - "Loan to Ahmed" | Lent (green outline badge) | 10,000 EGP | Custom splits
    - Split timeline (vertical line with dots):
      - ● 5,000 EGP — Jan 1, 2026 — Paid ✓ (green text, green dot)
      - ● 3,000 EGP — Mar 1, 2026 — Overdue 5 days (red text, red dot, red bg tint)
      - ○ 2,000 EGP — May 1, 2026 — Upcoming (grey text, empty dot)
    - [Record Payment] green outline button
  - Debt 2 card (white, nested):
    - "Borrowed from Ahmed" | Borrowed (red outline badge) | $200 USD | Lump sum
    - Due: Jun 1, 2026 — Upcoming
  - "+ Add Debt" text button (green, inside the person card)
- Person card 2 (collapsed):
  - Avatar "SM" | "Sara Mohamed" | "Friend" badge (purple pill) | Net: You owe 1,500 EGP (red) | chevron to expand
```
