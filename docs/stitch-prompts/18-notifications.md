# 18 — Notifications Panel

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for success, red (#EF4444) for urgent/overdue, amber (#F59E0B) for warnings, blue (#3B82F6) for informational. Font: Inter for English, Noto Sans Arabic for Arabic. Shadcn/ui style. The app is called "Masareef" (مصاريف).

Anatomy: The dashboard page is visible underneath (slightly dimmed). A right-side slide-out panel (sheet/drawer, ~400px wide) overlays the page with a subtle shadow. Panel has a header with title, unread count, and "Mark all read" link. Below, a scrollable list of notification cards stacked vertically. Each notification has a colored left border, icon, title, body text, timestamp, and unread dot indicator.

Vibe: Informational and actionable on a white slide-out panel over a dimmed background. Unread items feel distinct (colored left border 3px, faint tinted background). Read items feel settled (plain white, no left border). Overdue items feel urgent (red left border). Warnings feel cautionary (amber). Success feels celebratory (green). Each notification feels tappable — cursor pointer, subtle hover highlight.

Content:
- Panel header: "Notifications" (heading) | "(3 unread)" badge | "Mark all as read" text link (right-aligned)
- Notification 1 (UNREAD — red left border, faint red bg tint):
  - 🔴 red dot | "P2P payment overdue" (bold title)
  - "Payment of 3,000 EGP to Ahmed was due 5 days ago" (body text)
  - "2 hours ago" (slate timestamp, bottom-right)
- Notification 2 (UNREAD — amber left border, faint amber bg tint):
  - 🟡 amber dot | "Budget warning" (bold)
  - "Groceries budget 96% used — 200 EGP remaining"
  - "5 hours ago"
- Notification 3 (UNREAD — blue left border, faint blue bg tint):
  - 🔵 blue dot | "Car Loan payment due" (bold)
  - "Payment of 11,750 EGP due in 3 days (Apr 15)"
  - "Today, 8:00 AM"
- Notification 4 (READ — no left border, plain white):
  - ✅ green icon | "Import completed"
  - "47 transactions imported to CIB Savings"
  - "Yesterday"
- Notification 5 (READ — green left border, plain white):
  - 🎉 party icon | "Savings goal reached!"
  - "Emergency Fund goal reached — 100,000 EGP saved!"
  - "2 days ago"
- Notification 6 (READ — plain white):
  - 🤖 robot icon | "AI categorization done"
  - "32 transactions auto-categorized, 5 need review"
  - "3 days ago"
- Bottom of panel: "View all notifications →" link
```
