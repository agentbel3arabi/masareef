# 20 — Settings: Household & Members

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for admin/CTA, blue (#3B82F6) for member, purple (#8B5CF6) for child, slate (#64748B) for viewer. Font: Inter for English, Noto Sans Arabic for Arabic. Sidebar on left. Shadcn/ui style. The app is called "Masareef" (مصاريف).

Anatomy: Same settings layout (main sidebar + settings sidebar + content). Content area shows: household info section at top, members table in the middle, invite section below, and collapsible activity log at the bottom.

Vibe: Administrative but friendly on light background. White content card. Member rows feel like team profiles with avatar initials and colored role badges. Invite section feels welcoming with a prominent green CTA. The invite code area feels shareable. Activity log feels audit-like but not intimidating — light grey background, monospace timestamps.

Content:
- Settings sidebar: Household & Members is active (green accent)
- Content area:
  - Section 1 — "Household":
    - "Household Name" — editable text input: "Al-Masri Family"
    - "Base Currency" — dropdown: EGP (selected)
    - [Save] green button (inline, small)
  - Section 2 — "Members" (with divider):
    - Table with columns: Member | Role | Email | Joined | Actions
    - Row 1: Avatar "MO" (green bg) | "Mohamed" | admin (green pill badge) | mohamed@email.com | Jan 15, 2026 | [Role ▼] dropdown
    - Row 2: Avatar "SA" (blue bg) | "Sara" | member (blue pill) | sara@email.com | Jan 16, 2026 | [Role ▼] [Remove] red ghost button
    - Row 3: Avatar "AJ" (purple bg) | "Ahmed Jr" | child (purple pill) | ahmed@email.com | Feb 1, 2026 | "Linked: Allowance Account" tag | [Role ▼] [Remove]
    - Row 4: Avatar "UK" (grey bg) | "Uncle Khaled" | viewer (grey pill) | khaled@email.com | Mar 1, 2026 | [Role ▼] [Remove]
  - Section 3 — "Invite New Member" (with divider):
    - Three inputs in a row: Email input (wide) | Display Name input (medium) | Role dropdown "member" (narrow) | [Send Invite] green button
    - Below: "Or share invite code:" | "ABC123" in a monospace code box with copy icon button | "Expires in 7 days" (slate text)
  - Section 4 — "Recent Activity" (collapsible, light grey bg card):
    - Toggle: "Recent Activity" heading with chevron (collapsed by default)
    - When expanded, list of recent actions:
      - Sara created transaction: -1,250 EGP "Carrefour" — 2h ago
      - Mohamed updated budget: Groceries → 6,000 EGP — 5h ago
      - Ahmed Jr created transaction: -50 EGP "School cafeteria" — Yesterday
      - Sara imported 47 transactions to CIB Savings — 2 days ago
    - Each row: user avatar (small) | action description | relative timestamp (right-aligned)
```
