# 07 — Account Detail Page

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for income/positive, red (#EF4444) for expense/negative, amber (#F59E0B) for warnings. Sidebar: white background with light grey active state. Font: Inter for English, Noto Sans Arabic for Arabic. Numbers are large and prominent — financial amounts in 20-24px bold. Sidebar navigation on the left. All spacing generous (16-24px gaps). Shadcn/ui component style. The app is called "Masareef" (مصاريف).

Anatomy: Page with same sidebar (Accounts active). Page header with account name, institution badge, balance prominently displayed, and action buttons (Edit, Transfer, Reconcile). Below, a collapsible filter bar with search, type filter, category filter, date range, amount range. Main content is a transaction data table with columns: Date, Description, Category, Amount. Pagination at bottom. Floating action button bottom-right.

Vibe: Data-table focused on light background. Dense but readable. Amounts are right-aligned and bold in dark text. Debit rows have red amounts, credit rows have green. Alternating row backgrounds (white/light grey) for scanability. Category shown as a colored pill/badge next to each transaction. The filter bar feels like a powerful tool when expanded.

Content:
- Header: "CIB Savings" (large heading) — "CIB" institution badge (subtle pill) — Balance: 235,000.00 EGP (very large, green, bold) — Action buttons: [Edit] outline, [Transfer] outline, [Reconcile] outline
- Filter bar (collapsed by default, "Filters" toggle with chevron to expand): Search text field, Type dropdown (All/Debit/Credit), Category dropdown (multi-select), Date from/to date pickers, Amount min/max number inputs. "Clear filters" link when any filter is active.
- Transaction table with header row — 8 sample data rows:
  - Mar 20 | CARREFOUR CITY STARS | Groceries (orange pill) | -1,250.00 EGP (red)
  - Mar 19 | SALARY MARCH | Salary (green pill) | +35,000.00 EGP (green)
  - Mar 18 | UBER TRIP | Transportation (yellow pill) | -85.00 EGP (red)
  - Mar 17 | VODAFONE BILL | Telecommunications (purple pill) | -350.00 EGP (red)
  - Mar 15 | ATM WITHDRAWAL | Transfer (grey pill, italic text) | -5,000.00 EGP (grey)
  - Mar 14 | AMAZON.EG | Shopping (blue pill) + tiny "AI" badge | -2,400.00 EGP (red)
  - Mar 12 | FREELANCE PAYMENT | Freelance Income (green pill) | +8,500.00 EGP (green)
  - Mar 10 | ELECTRICITY BILL | Utilities (lime pill) | -450.00 EGP (red)
- Pagination bar: "Showing 1-50 of 347 transactions" — page buttons: « 1 2 3 ... 7 »
- Floating green "+" circle button (bottom-right corner) for quick add transaction
```
