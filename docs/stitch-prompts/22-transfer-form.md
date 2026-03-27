# 22 — Transfer Form (Sheet Drawer)

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for CTA. Blue (#3B82F6) for transfer accent. Font: Inter for English, Noto Sans Arabic for Arabic. Shadcn/ui style. The app is called "Masareef" (مصاريف).

Anatomy: The main app page is visible underneath, dimmed. A right-side slide-out sheet/drawer (white, ~420px wide) contains the transfer form. Two account selectors stacked with a directional arrow between them. Amount input. Optional FX rate field that appears only for cross-currency transfers. Sticky footer with action buttons.

Vibe: Clean and purposeful on a white drawer. The two-account layout with a downward arrow between them makes the flow direction obvious — money goes FROM top TO bottom. Cross-currency transfers feel handled — the FX field appears smoothly with a calculated target amount preview. The form feels safe — you can see both account balances to confirm you're not overdrawing.

Content:
- Sheet header: "Transfer Between Accounts" (heading) | X close button

- From Account section:
  - Label: "From" (slate)
  - Dropdown: "CIB Savings" (selected)
  - Balance shown below: "Balance: 235,000.00 EGP" (slate text)
  - Currency badge: "EGP"

- Directional arrow (centered between the two account selectors):
  - Large ↓ arrow icon in a blue circle (#3B82F6)
  - Feels like "money flows down"

- To Account section:
  - Label: "To" (slate)
  - Dropdown: "Cash Wallet" (selected)
  - Balance shown below: "Balance: 8,500.00 EGP" (slate)
  - Currency badge: "EGP"

- Amount input:
  - Label: "Amount"
  - Large number input: "5,000.00" | currency: "EGP" badge
  - After-balance preview: "CIB Savings after: 230,000 EGP | Cash after: 13,500 EGP" (green text, both positive = safe)

- Date picker:
  - Input: "23/03/2026" (today default)

- Description input (optional):
  - Text input, placeholder: "e.g., ATM withdrawal, salary split..."

- Cross-currency section (ONLY visible when From and To currencies differ):
  - Alert banner (blue tint): "Cross-currency transfer: EGP → USD"
  - FX Rate input:
    - Label: "Exchange Rate (EGP per 1 USD)"
    - Number input: "50.25" | "Latest rate: 50.25" hint text with green badge
    - [Use Latest Rate] text button to auto-fill
  - Calculated preview card (light blue bg):
    - "Sending: 10,000.00 EGP"
    - "Receiving: 199.00 USD" (auto-calculated, large bold)
    - "Rate: 1 USD = 50.25 EGP"

- Notes textarea (collapsible "Add notes" link):
  - placeholder: "Optional notes..."

- Sticky footer:
  - [Cancel] ghost button | [Transfer] green filled button
  - Disabled state if: same account selected for both, or cross-currency without FX rate
```
