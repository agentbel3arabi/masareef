# 08b — Import Wizard: Column Mapping Step

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for matched/CTA, red (#EF4444) for required/missing, amber (#F59E0B) for optional. Font: Inter for English, Noto Sans Arabic for Arabic. Sidebar on left. Shadcn/ui style. The app is called "Masareef" (مصاريف).

Anatomy: Same import page with sidebar (Import active). Step indicator at top (step 2 active). Main content: left side shows the required fields to map (Date, Description, Debit, Credit, Balance), right side shows a preview of the first 3 rows from the uploaded file. Each required field has a dropdown to select which CSV/Excel column maps to it. Below the mapping area, date format selector and encoding selector. Bottom bar with Back and Continue buttons.

Vibe: Interactive configuration on a clean light background. The mapping feels intuitive — clear visual connection between "what we need" (left) and "what your file has" (right). Mapped fields feel confirmed (green check). Unmapped required fields feel incomplete (red outline). The preview table builds confidence — "this is what we found in your file." Date format selector prevents silent parsing errors.

Content:
- Step indicator: Upload ✓ (green) → 2. Map Columns (active, green filled) → 3. Preview (grey) → 4. Import (grey)
- File info bar (light grey card): "📄 cib_march_2026.csv" | "50 rows detected" | "Encoding: Windows-1256 (Arabic)" | Account: CIB Savings
- Two-column layout:
  - Left column — "Map Your Columns" (heading):
    - Field 1: "Date" (required, red asterisk) → Dropdown: "Transaction Date" (selected, green check ✓)
    - Field 2: "Description" (required) → Dropdown: "Narration" (selected, green check ✓)
    - Field 3: "Debit" (required) → Dropdown: "Debit" (selected, green check ✓)
    - Field 4: "Credit" (required) → Dropdown: "Credit" (selected, green check ✓)
    - Field 5: "Balance" (optional, amber badge) → Dropdown: "Running Balance" (selected, green check)
    - Each dropdown shows all available CSV headers as options
    - Small "swap" icon between Debit and Credit fields
  - Right column — "File Preview" (heading):
    - Mini table showing first 3 rows from the CSV with actual data:
      - Headers: Transaction Date | Narration | Debit | Credit | Running Balance
      - Row 1: 15/03/2026 | CARREFOUR CITY STARS | 1,250.00 | | 45,230.50
      - Row 2: 14/03/2026 | UBER TRIP | 85.00 | | 45,145.50
      - Row 3: 13/03/2026 | SALARY MARCH | | 35,000.00 | 80,145.50
    - "Showing first 3 of 50 rows" (slate text)
- Configuration row below mapping:
  - "Date Format" — dropdown: DD/MM/YYYY (selected), MM/DD/YYYY, YYYY-MM-DD, DDMmmYYYY
  - "Skip Header Rows" — number input: 0 (default)
  - "Encoding" — dropdown: Windows-1256 (auto-detected, green badge), UTF-8
- Save template prompt (light green tinted card): "💾 Save this mapping as a template for future CIB Savings imports?" — [Yes, Save as Template] green outline button — template name input: "CIB Savings CSV" — toggle: "Auto-apply for this account"
- Bottom bar: [← Back] ghost button | [Continue to Preview →] green filled button (disabled until all required fields mapped)
```
