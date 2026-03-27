# 19f — Settings: Data Management & Billing

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for CTA/active, red (#EF4444) for danger zone. Font: Inter for English, Noto Sans Arabic for Arabic. Sidebar on left. Shadcn/ui style. The app is called "Masareef" (مصاريف).

Anatomy: Settings page layout (main sidebar + settings sidebar + content). Content split into two major sections: Data Management (top half) and Billing (bottom half), separated by a thick divider. Data section has export options and danger zone. Billing section has current plan, usage, and upgrade options.

Vibe: The data section feels utilitarian and safe — export buttons are calm, but the danger zone is visually alarming (red border, red text, red buttons). Clear warnings before destructive actions. The billing section feels like a clean SaaS dashboard — current plan highlighted, upgrade path clear, usage stats give transparency. No hidden costs feel.

Content:
- Settings sidebar: Data Management is active (or combined "Data & Billing")
- Content area:

  - Section 1 — "Export Your Data" (heading):
    - Description: "Download a complete backup of all your financial data." (slate)
    - Three export option cards in a row:
      - Card: 📄 "JSON" | "Full backup with relationships" | [Export JSON] outline button
      - Card: 📊 "Excel" | "One sheet per entity type" | [Export Excel] outline button
      - Card: 📋 "CSV" | "Individual CSV files in a ZIP" | [Export CSV] outline button
    - Status line: "Last export: March 20, 2026" (slate) | or "No exports yet"

  - Section 2 — "Import from Other Apps" (divider above):
    - Description: "Migrate your data from other finance apps." (slate)
    - Row: "Firefly III" | "Import from Firefly III JSON export" | [Import] outline button | "Coming soon" badge
    - Row: "YNAB" | "Import from YNAB export" | [Import] outline button | "Coming soon" badge

  - Section 3 — "Danger Zone" (red dashed border card, red tint background):
    - ⚠️ Warning icon | "Danger Zone" (heading, red text) | "These actions are irreversible."
    - Row: "Delete all transactions" | "Removes all transactions but keeps accounts, debts, and settings." | [Delete All Transactions] red outline button
    - Row: "Reset household data" | "Deletes everything — accounts, transactions, debts, assets, budgets. Keeps your account login and household." | [Reset All Data] red filled button
    - Row: "Delete household" | "Permanently deletes this household and all its data. Requires removing all non-admin members first." | [Delete Household] red filled button (disabled if members > 1, tooltip: "Remove all other members first")
    - Each destructive button triggers a confirmation dialog (not shown but noted)

  - Thick divider (extra spacing)

  - Section 4 — "Current Plan" (heading):
    - Plan card (green border, highlighted):
      - "Premium" (large heading) | "EGP 99/month" | Active since: Feb 2026
      - Features list (2 columns):
        - ✓ Up to 5 household members
        - ✓ AI categorization
        - ✓ Scanned PDF import (100 pages/month)
        - ✓ Advanced forecasting
        - ✓ Budget & savings goals
        - ✓ Reports & PDF export
        - ✓ Telegram notifications
      - [Manage Subscription] outline button | [Cancel Plan] red ghost text link

  - Section 5 — "Usage This Month" (divider above):
    - Stats row (3 mini stat cards):
      - "Household Members" — 3 of 5 used (green progress bar 60%)
      - "Scanned Pages" — 12 of 100 used (green bar 12%)
      - "Storage" — 45 MB of 1 GB used (green bar 4.5%)
    - Billing cycle: "Renews April 15, 2026" | "Next charge: EGP 99"

  - Section 6 — "Upgrade" (only shown for Free tier users, divider above):
    - Comparison table: Free vs Premium vs Business
    - [Upgrade to Premium] green filled button
```
