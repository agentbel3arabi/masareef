# 19e — Settings: People

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for positive. Blue (#3B82F6) for family, purple (#8B5CF6) for friend, amber (#F59E0B) for colleague, slate (#64748B) for business/other. Font: Inter for English, Noto Sans Arabic for Arabic. Sidebar on left. Shadcn/ui style. The app is called "Masareef" (مصاريف).

Anatomy: Settings page layout (main sidebar + settings sidebar + content). Content shows a list of person contact cards in a single column. Each card shows avatar, name (EN + AR), relationship badge, phone, email, and active debt count. "Add Person" button at top. Clicking a person opens an edit form inline or in a sheet.

Vibe: Contact-list style on light background. Person cards feel personal and warm — like a phone contacts list. Relationship badges add color and context. Each card clearly shows whether this person has active debts (linking back to the P2P debts page). The add form is quick — not too many fields. Feels like managing a small address book for financial relationships.

Content:
- Settings sidebar: People is active (green accent)
- Content area:
  - Title: "People" (heading) | "Manage contacts for P2P debts. Create a person before adding debts." (slate) | [+ Add Person] green button

  - Person card 1:
    - Avatar circle "AH" (blue bg) | "Ahmed Hassan" (heading) | "أحمد حسن" (Arabic name, slate) | Family (blue pill badge)
    - Contact row: 📱 +20 123 456 7890 | ✉️ ahmed@email.com
    - Debt summary: "3 active debts" (green link → navigates to P2P tab) | Net: Ahmed owes you 3,000 EGP (green)
    - Notes: "Brother-in-law" (italic, slate)
    - Actions: [Edit] pencil icon | [Delete] trash icon (greyed out — "Has active debts" tooltip)

  - Person card 2:
    - Avatar "SM" (purple bg) | "Sara Mohamed" | "سارة محمد" | Friend (purple pill)
    - 📱 +20 100 987 6543
    - "1 active debt" | Net: You owe 1,500 EGP (red)
    - Actions: [Edit] | [Delete] (greyed out)

  - Person card 3:
    - Avatar "KI" (amber bg) | "Khaled Ibrahim" | "خالد إبراهيم" | Colleague (amber pill)
    - 📱 +20 111 222 3333 | ✉️ khaled@work.com
    - "0 active debts" (slate) | No outstanding balance
    - Actions: [Edit] | [Delete] trash icon (enabled, no active debts)

  - Person card 4:
    - Avatar "FH" (slate bg) | "Fatma Hassan" | "فاطمة حسن" | Other (grey pill)
    - No phone, no email
    - "1 active debt" | Net: Fatma owes you 5,000 EGP (green)
    - Notes: "Neighbor" (italic)
    - Actions: [Edit] | [Delete] (greyed out)

  - Add person form (shown when "Add Person" clicked — could be inline card or sheet):
    - Fields: Full name (required) | Arabic name (optional) | Phone (optional) | Email (optional) | Relationship dropdown (Family / Friend / Colleague / Business / Other) | Notes textarea (optional)
    - [Save Person] green button | [Cancel] ghost button
```
