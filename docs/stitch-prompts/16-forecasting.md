# 16 — Forecasting Page

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for income/positive, red (#EF4444) for expense/negative, amber (#F59E0B) for warnings. Font: Inter for English, Noto Sans Arabic for Arabic. Numbers large and bold. Sidebar on left. Shadcn/ui style. The app is called "Masareef" (مصاريف).

Anatomy: Page with sidebar (Forecasting active). Alert banner at very top (red, if negative month detected). Summary stat cards row (3 cards). Large bar chart card (cash flow 12 months). Below, debt payoff line chart card. Bottom section: recurring rules list with add/edit controls.

Vibe: Forward-looking and analytical on light background. White chart cards with soft shadows. The cash flow chart is the centerpiece — takes up most vertical space. Negative months feel alarming (red bars, faint red column background). Debt payoff lines feel like progress toward freedom. Estimated items distinguished with dashed style. Recurring rules feel manageable in a clean list.

Content:
- Alert banner (full width, red background with white text, dismissible X): "⚠ Your balance may go negative in August 2026. Review your upcoming expenses."
- Stat cards row (3 cards):
  - "Monthly Net" — +2,500 EGP avg (green text, large)
  - "Debt-Free Date" — Jan 2030 (dark text, large)
  - "Negative Months" — 1 (August) (red text, large, red badge)
- Cash flow bar chart (white card, large):
  - Title: "12-Month Cash Flow Projection" | time range: "Apr 2026 — Mar 2027"
  - X axis: 12 month labels (Apr, May, Jun, ...)
  - Y axis: EGP amounts
  - Each month: green bar (income) + red bar (expenses) side by side
  - Solid line overlay: closing balance trajectory
  - August: expenses taller than income, balance line dips below zero axis, faint red column background
  - Dashed segments on some expense bars labeled with "~" for estimated non-recurring (e.g., ~Groceries, ~Fuel)
  - Legend: Income (green) | Fixed Expenses (red solid) | Estimated Expenses (red dashed) | Balance (line)
- Debt payoff chart (white card):
  - Title: "Debt Payoff Timelines"
  - X axis: months extending to 2030
  - Y axis: remaining balance
  - 3 colored lines: "Car Loan" (blue, long decline to 2030), "iPhone Installment" (orange, ending Sep 2026 with marker), "Store Plan" (purple, ending Dec 2026 with marker)
  - Payoff markers: dot + label "Paid off" at each line's end
  - Legend below chart
- Recurring rules section (white card):
  - Title: "Recurring Rules" | [Add Rule] green button
  - Table: Name | Type | Amount | Frequency | Account
  - Rows:
    - Salary | Income (green pill) | 35,000 EGP | Monthly (25th) | CIB Savings
    - Rent | Expense (red pill) | 15,000 EGP | Monthly (1st) | —
    - Freelance | Income (green pill) | 8,500 EGP | Monthly (15th) | HSBC Current
    - Netflix | Expense (red pill) | 250 EGP | Monthly (10th) | —
    - Gym | Expense (red pill) | 800 EGP | Monthly (5th) | —
  - Each row has edit pencil icon and delete trash icon
```
