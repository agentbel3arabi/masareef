# 21 — Transaction Form (Sheet Drawer)

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for credit/income, red (#EF4444) for debit/expense. Font: Inter for English, Noto Sans Arabic for Arabic. Shadcn/ui style. The app is called "Masareef" (مصاريف).

Anatomy: The main app page is visible underneath, slightly dimmed with a dark overlay. A right-side slide-out sheet/drawer (white, ~420px wide on desktop, full-width on mobile) contains the transaction form. Sheet has a header with title and close X button, scrollable form body, and sticky footer with action buttons.

Vibe: Quick and focused on a white drawer over dimmed background. The form should feel fast — designed for "I just bought something, let me log it in 10 seconds." Amount input is the hero — large and prominent. Type toggle (debit/credit) is visually obvious with color coding. Category selector feels like a quick-pick grid. Optional fields don't clutter — they're in a collapsible "More" section.

Content:
- Sheet header: "Add Transaction" (heading, or "Edit Transaction" in edit mode) | X close button (right)
- Form body (scrollable):

  - Type toggle (full width, two segments):
    - [Expense] red background when selected, white text | [Income] green background when selected, white text
    - Expense is selected by default

  - Amount input (hero field):
    - Very large number input (32px font), centered
    - Currency badge to the right: "EGP" (dropdown to change: EGP/USD/SAR)
    - Placeholder: "0.00"
    - Numeric keypad feel on mobile

  - Account selector:
    - Dropdown: "CIB Savings" (selected) | showing all accounts with balance previews
    - Small balance indicator: "Balance: 235,000 EGP" below dropdown

  - Date picker:
    - Input with calendar icon: "23/03/2026" (today pre-filled)
    - Calendar popup on click

  - Description input:
    - Text input, placeholder: "What was this for?"
    - As user types, AI suggestion appears below: "💡 Suggested category: Groceries (based on similar transactions)" — clickable to auto-fill category

  - Category selector:
    - Grid of category pills (3 per row), scrollable:
      - 🍽 Food & Dining | 🛒 Groceries | 🚗 Transportation | ⚡ Utilities | 🛍 Shopping | 🎓 Education | ... (show 9, "+ More" to expand full list)
    - Selected category has green border and check icon
    - "Uncategorized" option at end (grey)

  - Collapsible "More Options" section (chevron toggle):
    - Notes textarea: placeholder "Add notes..." (3 lines)
    - Link to Asset: dropdown "None" | list of assets (Apartment, Car, Gold...)
    - Link to Gam3eya: dropdown "None" | list of active Gam3eyas
    - "Applies to balance" toggle: ON by default, with helper text "Include this transaction in the account balance calculation"

- Sticky footer:
  - [Cancel] ghost button (left) | [Save Transaction] green filled button (right)
  - In edit mode: [Cancel] ghost | [Delete] red outline (left-center) | [Save Changes] green (right)
```
