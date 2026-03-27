# 19b — Settings: Locale

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for selected/active. Font: Inter for English, Noto Sans Arabic for Arabic. Sidebar on left. Shadcn/ui style. The app is called "Masareef" (مصاريف).

Anatomy: Settings page layout (main sidebar + settings sidebar + content area). Content shows locale preferences as a clean form with grouped sections. Each setting has a label, description, and selector. A live preview card at the bottom shows how the selected settings affect display.

Vibe: Clean configuration on light background. Each setting clearly explained with a short description. Selectors feel easy — large toggle buttons for binary choices, dropdowns for multiple options. The live preview at the bottom builds confidence — "this is what your app will look like." Changes feel immediate (optimistic UI).

Content:
- Settings sidebar: Locale is active (green accent)
- Content area (white card):
  - Title: "Language & Locale" (heading) | "Customize how dates, numbers, and text appear across the app." (slate)

  - Section 1 — "Language":
    - Two large selectable tile buttons side by side (full width, equal):
      - "English" tile (Inter font sample, LTR arrow icon) — currently selected (green border, check icon)
      - "العربية" tile (Noto Sans Arabic sample, RTL arrow icon) — unselected (grey border)
    - Helper text: "Changes the entire interface language and text direction"

  - Section 2 — "Calendar System" (with divider above):
    - Two selectable tiles:
      - "Gregorian" (showing "March 23, 2026") — selected (green border)
      - "Hijri" (showing "٢٤ رمضان ١٤٤٧") — unselected
    - Helper: "Hijri dates shown alongside Gregorian when enabled"

  - Section 3 — "Number Format":
    - Two selectable tiles:
      - "Western" (showing "1,250,000.00") — selected
      - "Arabic-Indic" (showing "١٬٢٥٠٬٠٠٠٫٠٠") — unselected
    - Helper: "Affects all financial amounts and numeric displays"

  - Section 4 — "Date Format":
    - Dropdown select with options:
      - DD/MM/YYYY → "23/03/2026" (selected)
      - MM/DD/YYYY → "03/23/2026"
      - YYYY-MM-DD → "2026-03-23"
    - Helper: "Used in transaction dates, reports, and filters"

  - Section 5 — "First Day of Week":
    - Dropdown: Saturday (selected, common in Egypt), Sunday, Monday
    - Helper: "Affects weekly budgets and calendar views"

  - Section 6 — "Timezone":
    - Dropdown: "Africa/Cairo (UTC+2)" (auto-detected badge) with search
    - Helper: "Auto-detected from your browser. Change if needed."

  - Divider

  - Live Preview card (light grey #F8FAFC background):
    - Title: "Preview" (small heading)
    - Sample display: "Today: 23/03/2026 | Amount: 1,250,000.00 EGP | Language: English (LTR)"
    - Shows how the current selections render together

  - [Save Preferences] green button (right-aligned)
```
