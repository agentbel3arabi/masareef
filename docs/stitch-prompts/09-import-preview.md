# 09 — Import Wizard: Preview Step

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for positive/valid, red (#EF4444) for errors, amber (#F59E0B) for duplicates. Font: Inter for English, Noto Sans Arabic for Arabic. Sidebar on left. Shadcn/ui style. The app is called "Masareef" (مصاريف).

Anatomy: Page with sidebar (Import active). Step indicator at top (step 3 active). Summary stats bar below with badge counts. Then a data table showing parsed transactions with per-row checkbox and status. Sticky bottom bar with Back and Import buttons.

Vibe: Data review mode on a clean light background. Clear status indicators. Valid rows feel ready to go (white background, green check). Duplicates visually muted (light grey row, amber badge). Error rows feel flagged but not alarming (faint red tint). The summary bar gives confidence at a glance. The import button feels like a satisfying final action.

Content:
- Step indicator: Upload ✓ (green check) → Map ✓ (green check) → 3. Preview (active, green filled) → 4. Import (grey)
- Summary bar (white card): "47 valid" (green badge) | "3 duplicates" (amber badge) | "0 errors" (grey badge) | "Total: 50 rows parsed"
- "Save this mapping as template?" toggle with name input field — appears if no template was used
- Data table:
  - Header row: ☐ (select all checkbox) | # | Date | Description | Debit | Credit | Status | Balance ✓
  - Row 1: ☑ | 1 | 15/03/2026 | CARREFOUR CITY STARS | 1,250.00 | — | Valid ✓ (green pill) | ☑ toggle
  - Row 2: ☑ | 2 | 14/03/2026 | UBER TRIP | 85.00 | — | Valid ✓ | ☑
  - Row 3 (muted, light grey bg): ☐ | 3 | 13/03/2026 | SALARY MARCH | — | 35,000.00 | Duplicate (amber pill, italic) | ☐
  - Row 4: ☑ | 4 | 12/03/2026 | NETFLIX | 250.00 | — | Valid ✓ | ☑
  - Row 5: ☑ | 5 | 11/03/2026 | PHARMACY | 180.00 | — | Valid ✓ | ☑
  - Row 6 (muted): ☐ | 6 | 10/03/2026 | RENT PAYMENT | 15,000.00 | — | Duplicate (amber) | ☐
  - Row 7: ☑ | 7 | 09/03/2026 | FREELANCE | — | 8,500.00 | Valid ✓ | ☑
  - "Balance ✓" column has per-row toggle switches for "Applies to balance"
- Sticky bottom bar: [← Back] ghost/outline button (left) | [Import 47 Transactions] green filled button (right, prominent)
```
