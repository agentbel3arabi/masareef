# 14 — Asset Detail Page

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for gains, red (#EF4444) for losses. Font: Inter for English, Noto Sans Arabic for Arabic. Numbers large and bold. Sidebar on left. Shadcn/ui style. The app is called "Masareef" (مصاريف).

Anatomy: Page with sidebar (Assets active). Top section: asset header card with name, type, value, purchase price, ROI. Below, a value timeline line chart (showing value over time with purchase price reference line). Two-column section: left is "Ownership Cost" breakdown card, right is "Operating Cost" breakdown card. Bottom: linked transactions table with category, amount, date, and "Link Transaction" button.

Vibe: Analytical and informative on light background. Chart on white card shows gain zone (light green shading above purchase line) and loss zone (light red shading below). Cost breakdown cards are white with clean internal dividers. Clear visual separation between ownership and operating. Feels like a personal asset audit report.

Content:
- Header card (white, full width):
  - 🚗 icon | "Hyundai Tucson 2024" (large heading) | Vehicle (type badge) | 3-dot menu
  - Value row: Current Value: 900,000 EGP (very large, dark) | Purchased: 1,200,000 EGP (slate) | ROI: -25.5% (large red badge)
  - Action buttons: [Update Value] green outline | [Link Transaction] outline | [Edit] outline
- Value timeline chart (white card):
  - Title: "Value History"
  - Line chart: X axis = time (Jan 2024 to Mar 2026). Y axis = EGP value.
  - Solid line declining from 1,200,000 to 900,000
  - Horizontal dashed reference line at 1,200,000 labeled "Purchase Price"
  - Light red shading between the declining line and the purchase price line (loss zone)
  - Data points as small dots on the line
- Two-column cost breakdown:
  - Left card — "Ownership Cost":
    - Purchase: 1,200,000 EGP
    - Registration: 8,000 EGP
    - Divider
    - Total Ownership: 1,208,000 EGP (bold)
    - Current Value: 900,000 EGP
    - Net Position: -308,000 EGP (red, bold)
  - Right card — "Operating Cost":
    - Fuel: 180,000 EGP
    - Insurance: 24,000 EGP
    - Maintenance: 35,000 EGP
    - Divider
    - Total Operating: 239,000 EGP (bold)
    - Monthly Average: 9,958 EGP/month
    - Tracked: 24 months
- Linked transactions table:
  - Header: "Linked Transactions (18)" | [Link Existing Transaction] button
  - Columns: Date | Description | Category | Amount
  - Sample rows:
    - Mar 15 | Shell Gas Station | Fuel | -350 EGP
    - Mar 01 | Car Insurance Q1 | Insurance | -6,000 EGP
    - Feb 20 | Oil Change | Maintenance | -800 EGP
    - Feb 05 | Shell Gas Station | Fuel | -380 EGP
  - Pagination: "Showing 1-10 of 18"
```
