# 19d — Settings: Notifications

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for enabled/connected, red (#EF4444) for disconnected. Font: Inter for English, Noto Sans Arabic for Arabic. Sidebar on left. Shadcn/ui style. The app is called "Masareef" (مصاريف).

Anatomy: Settings page layout (main sidebar + settings sidebar + content). Content organized in sections: delivery channels at top, then reminder settings, then alert thresholds, then quiet hours. Each section uses toggle switches and number inputs. Telegram connection has its own card with connection status.

Vibe: Control panel on light background. Toggle switches feel satisfying and immediate. Connected channels show green status dots. Disconnected ones show clear "Connect" CTAs. The page gives users granular control without being overwhelming — sensible defaults with the option to customize everything. Telegram section feels like a mini-integration setup.

Content:
- Settings sidebar: Notifications is active (green accent)
- Content area:
  - Title: "Notifications" (heading) | "Control how and when you receive alerts." (slate) | [Send Test] outline button (right)

  - Section 1 — "Delivery Channels":
    - Row: 🔔 "In-App" | toggle ON (green) | "Notifications appear in the bell menu" | ● Connected (green dot)
    - Row: 📧 "Email" | toggle ON (green) | "Sent to mohamed@email.com" | ● Connected (green dot) | "Change email" link
    - Row: Telegram icon "Telegram" | toggle OFF (grey) | "Connect your Telegram account" | ○ Not connected (grey dot)
      - Expandable: [Connect Telegram] green outline button → when clicked shows: QR code placeholder + link "t.me/MasareefBot?start=abc123" + "Open this link in Telegram to connect" instruction text
    - Row: WhatsApp icon "WhatsApp" | toggle OFF (grey, disabled) | "Coming soon" badge | "WhatsApp Business integration planned for a future release"

  - Section 2 — "Payment Reminders" (divider above):
    - Master toggle: "Enable payment reminders" — ON (green)
    - Sub-rows (indented, each with its own toggle):
      - "Debt payments" — ON | "Remind me ___ days before" — number input: 3
      - "Installments" — ON | days before: 3
      - "Gam3eya contributions" — ON | days before: 3
      - "P2P debt splits" — ON | days before: 3
      - "Credit card payments" — ON | days before: 3
    - "Also notify on the due date" — checkbox ON
    - "Notify when overdue" — checkbox ON

  - Section 3 — "Spending Alerts" (divider above):
    - "Budget warning threshold" — slider or number input: 80% | "Alert when a category reaches this % of its budget"
    - "Alert when over budget" — toggle ON
    - "Large transaction alert" — toggle ON | "Threshold:" number input: 10,000 EGP | "Alert for any single transaction above this amount"
    - "Negative balance forecast" — toggle ON | "Alert when cash flow projection shows a negative month"

  - Section 4 — "Quiet Hours" (divider above):
    - "Enable quiet hours" — toggle OFF (grey)
    - When toggled ON (show fields):
      - "From:" time picker 22:00 | "To:" time picker 08:00
      - "Non-critical notifications will be held until quiet hours end"

  - [Save Preferences] green button (right-aligned)
```
