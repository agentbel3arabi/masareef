# 15 — Budgets Page

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for under-budget, red (#EF4444) for over-budget, amber (#F59E0B) for warning (80-100%). Font: Inter for English, Noto Sans Arabic for Arabic. Numbers large and bold. Sidebar on left. Shadcn/ui style. The app is called "Masareef" (مصاريف).

Anatomy: Page with sidebar (Budgets active — add this to sidebar between Assets and Import). Page header with current budget name ("March 2026") and period navigation arrows (← prev / next →). Summary bar card showing total allocated, total spent, remaining, and percent used. Below, a grid of category budget cards (3 columns). Each card has category icon, name, progress bar, allocated vs spent numbers, and remaining.

Vibe: Goal-tracking and motivational on light background. White category cards with soft shadows. Under-budget feels accomplished (green progress bar). Warning at 80%+ feels cautionary (amber bar). Over-budget feels urgent but not punishing (red bar with clear overage amount). Progress bars are the visual anchor — thick (8px height), rounded corners. The page feels like a fitness tracker for your money.

Content:
- Sidebar: same as dashboard but add "Budgets" between Assets and Import, Budgets is active
- Header row: ← (left arrow) | "March 2026 Budget" (heading) | Monthly (slate badge) | → (right arrow) | [Edit Allocations] outline button | [Suggest from History] subtle outline button
- Summary bar (white card, full width): Allocated: 25,000 EGP | Spent: 18,300 EGP | Remaining: 6,700 EGP | Overall progress bar (73.2% filled, green) | "73.2% used"
- Category budget cards (3x3 grid, 8 cards + 1 unallocated):
  - Card 1: 🛒 Groceries | Budget: 5,000 | Spent: 4,800 | Left: 200 | 96% progress bar (AMBER, almost full) | "Warning" amber badge
  - Card 2: 🍽 Food & Dining | 3,000 | 2,100 | 900 | 70% bar (GREEN)
  - Card 3: 🚗 Transportation | 2,000 | 1,500 | 500 | 75% bar (GREEN)
  - Card 4: ⚡ Utilities | 2,500 | 2,500 | 0 | 100% bar (AMBER) | "At limit" badge
  - Card 5: 🛍 Shopping | 2,000 | 2,400 | -400 over | 120% bar (RED, overflows past track) | "Over budget" red badge | "-400 EGP" red text
  - Card 6: 🎓 Education | 3,000 | 1,800 | 1,200 | 60% bar (GREEN)
  - Card 7: 🎬 Entertainment | 1,500 | 900 | 600 | 60% bar (GREEN)
  - Card 8: ❤️ Healthcare | 1,000 | 0 | 1,000 | 0% bar (GREY, empty track)
- Unallocated section (light grey background card below grid): "Unallocated Spending" heading | "Telecom: 250 EGP spent" | "Fuel: 180 EGP spent" | hint text: "Create allocations for these categories to track them"
```
