# 15b — Savings Goals Page

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for on-track/completed, red (#EF4444) for behind schedule, amber (#F59E0B) for close to deadline. Font: Inter for English, Noto Sans Arabic for Arabic. Numbers large and bold. Sidebar on left. Shadcn/ui style. The app is called "Masareef" (مصاريف).

Anatomy: Page with sidebar (Savings Goals as a sub-item under Budgets, or separate sidebar item). Page header with title and "New Goal" button. Grid of goal cards (2 columns). Each card shows goal name, icon, progress ring, current vs target amount, projected completion date, and status. One completed goal card shown with celebration styling.

Vibe: Motivational and aspirational on light background. White goal cards feel like personal milestones. Circular progress rings are the visual anchor — large and colorful. "On track" feels confident (green). "Behind" feels urgent but actionable (red with suggestion text). Completed goals feel celebratory (confetti icon, green border glow). Monthly savings rate gives users a sense of momentum.

Content:
- Sidebar: Savings Goals active (or Budgets with sub-nav)
- Header: "Savings Goals" (heading) | "Track progress toward your financial targets" (slate) | [+ New Goal] green button
- Goal card 1 — On Track:
  - 🛡️ Shield icon (emerald bg circle) | "Emergency Fund" (heading) | "On Track" green badge
  - Large circular progress ring: 35% filled (green arc), "35%" large text centered
  - Current: 35,000 EGP | Target: 100,000 EGP
  - Progress bar below ring: thin green bar at 35%
  - Linked to: CIB Savings (account badge with link icon)
  - Monthly savings rate: +4,500 EGP/month (green text with up arrow)
  - Projected completion: Nov 2026 (before deadline ✓ green check)
  - Target date: Dec 31, 2026
  - [Update Progress] outline button | 3-dot menu
- Goal card 2 — Behind:
  - ✈️ Plane icon (blue bg circle) | "Vacation Fund" (heading) | "Behind" red badge
  - Circular progress ring: 18% filled (red arc), "18%" centered
  - Current: 9,000 EGP | Target: 50,000 EGP
  - Linked to: HSBC Current
  - Monthly rate: +2,000 EGP/month
  - Projected completion: Feb 2027 (after deadline ✗ red X)
  - Target date: Aug 1, 2026
  - Suggestion text (amber bg card): "Increase monthly savings to 6,800 EGP to hit your deadline"
  - [Update Progress] outline | 3-dot menu
- Goal card 3 — No Deadline:
  - 🚗 Car icon (amber bg circle) | "New Car Down Payment" (heading) | "No Deadline" grey badge
  - Circular progress ring: 52% filled (green arc), "52%"
  - Current: 260,000 EGP | Target: 500,000 EGP
  - Not linked to an account (manual tracking)
  - Monthly rate: +12,000 EGP/month
  - Projected: ~20 more months at current rate
  - [Update Progress] outline | 3-dot menu
- Goal card 4 — Completed:
  - 🎓 Graduation icon (green bg circle) | "Kids School Fees" (heading) | "Completed 🎉" green badge with confetti
  - Green border glow on the card
  - Circular progress ring: 100% filled (solid green), "100%" with check mark
  - Saved: 30,000 EGP | Target: 30,000 EGP
  - Completed on: Feb 15, 2026
  - "Goal reached in 5 months — 2 months early!" (green text)
  - Muted styling — slightly less prominent than active goals
```
