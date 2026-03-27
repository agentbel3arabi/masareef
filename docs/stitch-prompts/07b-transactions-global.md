# 07b — Transactions Page (Global)

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for income/positive, red (#EF4444) for expense/negative, amber (#F59E0B) for warnings. Font: Inter for English, Noto Sans Arabic for Arabic. Numbers large and bold. Sidebar on left. Shadcn/ui style. The app is called "Masareef" (مصاريف).

Anatomy: Page with sidebar (Transactions active). Page header with title "Transactions" and action buttons. Below header, a collapsible filter bar with all filter dimensions. Main content is a full-width transaction table showing transactions from ALL accounts. Each row includes the account name as an extra column. Pagination at bottom. Floating add button. "Manage" mode toggle for bulk operations.

Vibe: Data-table power tool on light background. This is the most data-dense page — designed for power users who want to search, filter, and manage across all accounts at once. Dense but readable. Amounts right-aligned and bold. Account column distinguishes which account each transaction belongs to. Filter bar feels powerful when expanded — many dimensions available. Manage mode feels safe but capable.

Content:
- Sidebar: Transactions active (green accent)
- Header row: "Transactions" (heading) | "347 total" (slate count badge) | [+ Add Transaction] green button | [Manage] outline toggle button
- Filter bar (collapsible, expanded state shown):
  - Row 1: Search text input (wide, placeholder "Search descriptions and notes...") | Account dropdown (All Accounts / CIB Savings / HSBC Current / ...) | Type dropdown (All / Debit / Credit)
  - Row 2: Category dropdown (multi-select, "All Categories") | Date from picker | Date to picker | Amount min input | Amount max input | [Clear Filters] ghost link
  - Active filter count badge: "3 filters active" when filters applied
- Transaction table:
  - Header row: ☐ (checkbox, only visible in manage mode) | Date | Account | Description | Category | Amount
  - Row 1: Mar 20 | CIB Savings (blue pill) | CARREFOUR CITY STARS | Groceries (orange pill) | -1,250.00 EGP (red)
  - Row 2: Mar 19 | CIB Savings (blue pill) | SALARY MARCH | Salary (green pill) | +35,000.00 EGP (green)
  - Row 3: Mar 18 | HSBC Current (teal pill) | UBER TRIP | Transportation (yellow pill) | -85.00 EGP (red)
  - Row 4: Mar 17 | CIB Savings (blue pill) | VODAFONE BILL | Telecommunications (purple pill) | -350.00 EGP (red)
  - Row 5: Mar 16 | HSBC Visa (red pill) | AMAZON.EG | Shopping (blue pill) + "AI" mini badge | -2,400.00 EGP (red)
  - Row 6: Mar 15 | CIB Savings → Cash (grey pill, italic) | ATM WITHDRAWAL | Transfer (grey pill) | -5,000.00 EGP (grey)
  - Row 7: Mar 14 | HSBC Current (teal pill) | FREELANCE PAYMENT | Freelance Income (green pill) | +8,500.00 USD (green) + "≈ 427,000 EGP" (tiny slate text)
  - Row 8: Mar 12 | CIB Savings (blue pill) | ELECTRICITY BILL | Utilities (lime pill) | -450.00 EGP (red)
  - Alternating row backgrounds (white / light grey #F8FAFC)
  - Each row clickable → opens transaction detail/edit sheet
- Manage mode (when toggled ON):
  - Checkboxes appear on each row
  - Bulk action bar appears above table: "3 selected" | [Delete] red outline | [Re-categorize] outline | [Cancel] ghost
- Pagination: "Showing 1-50 of 347 transactions" | « 1 2 3 ... 7 » page buttons
- Floating green "+" circle button (bottom-right)
```
