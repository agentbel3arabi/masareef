# 08 — Import Wizard: Upload Step

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for CTA. Font: Inter for English, Noto Sans Arabic for Arabic. Sidebar navigation on the left. Shadcn/ui component style. The app is called "Masareef" (مصاريف).

Anatomy: Page with same sidebar (Import active). Centered card layout with step indicator at top (4 steps: Upload → Map → Preview → Done). Current step highlighted. Main area is a large drag-and-drop zone inside a white card. Below it, account selector dropdown and a "Saved Templates" section with small template cards.

Vibe: Friendly, encouraging onboarding on a light surface. The drag zone feels inviting — dashed grey border on white, cloud upload icon, subtle hover highlight. Steps feel progressive and achievable. The template section feels like a shortcut — "we remember your setup."

Content:
- Sidebar: same as dashboard but "Import" is active
- Step indicator: 4 steps in a horizontal row, circles connected by lines. 1. Upload (active, green filled circle with white check area) → 2. Map Columns (grey circle) → 3. Preview (grey) → 4. Import (grey). Labels below each.
- Main card (white, large, centered):
  - Drag zone: Large rectangular area (at least 300px tall) with dashed grey border (#E2E8F0). Centered content: cloud-upload icon (large, slate grey), text below: "Drag your bank statement here" (heading), "or click to browse" (green link text). Supported formats note: "CSV, Excel (.xlsx), PDF — Max 10MB" in small slate text.
  - Below drag zone inside same card: "Target Account" label + dropdown select showing accounts list (CIB Savings, HSBC Current, HSBC Visa, etc.)
- "Your Templates" section below main card:
  - Section heading: "Saved Templates" with count "(2)"
  - Two small horizontal template cards side by side:
    - "CIB Savings CSV" — green "Auto-applied" badge (linked to account) — edit pencil icon
    - "HSBC Egypt Excel" — no badge — edit pencil icon
  - "+ Create Template" subtle link
- Footer note (small, slate): "Scanned PDFs require Premium plan. Upgrade →"
```
