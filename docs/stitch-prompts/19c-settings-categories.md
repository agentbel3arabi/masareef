# 19c — Settings: Categories

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for income categories, red (#EF4444) for expense categories, slate (#94A3B8) for special categories. Font: Inter for English, Noto Sans Arabic for Arabic. Sidebar on left. Shadcn/ui style. The app is called "Masareef" (مصاريف).

Anatomy: Settings page layout (main sidebar + settings sidebar + content area). Content shows categories grouped by type (Expenses, Income, Special) in collapsible sections. Each category is a row with icon, color dot, English name, Arabic name, and action buttons. A "Create Category" section at the bottom with inline form. Drag handles on custom categories for reordering.

Vibe: Organized and colorful on light background. Each category row has its color dot as a visual anchor — the page looks like a curated palette. Predefined categories feel stable (lock icon, limited editing). Custom categories feel editable and movable (drag handle, full edit). The create form feels quick and inviting. Icons add personality.

Content:
- Settings sidebar: Categories is active (green accent)
- Content area:
  - Title: "Categories" (heading) | "Manage how transactions are organized." (slate) | [+ Create Category] green button

  - Section "Expenses" (collapsible, expanded, red section accent, "12 categories" count):
    - Row: 🍽 | red dot (#EF4444) | Food & Dining | طعام ومطاعم | 🔒 Predefined | [Edit icon/color] pencil icon
    - Row: 🛒 | orange dot (#F97316) | Groceries | بقالة | 🔒 | [Edit]
    - Row: 🚗 | yellow dot (#EAB308) | Transportation | مواصلات | 🔒 | [Edit]
    - Row: ⚡ | lime dot (#84CC16) | Utilities | مرافق | 🔒 | [Edit]
    - Row: 🏠 | green dot (#22C55E) | Housing/Rent | سكن/إيجار | 🔒 | [Edit]
    - Row: ❤️ | teal dot (#14B8A6) | Healthcare | رعاية صحية | 🔒 | [Edit]
    - Row: 🛍 | cyan dot (#06B6D4) | Shopping | تسوق | 🔒 | [Edit]
    - Row: 🎓 | blue dot (#3B82F6) | Education | تعليم | 🔒 | [Edit]
    - Row: 🎬 | violet dot (#8B5CF6) | Entertainment | ترفيه | 🔒 | [Edit]
    - Row: 📱 | purple dot (#A855F7) | Telecommunications | اتصالات | 🔒 | [Edit]
    - Row: ⛽ | pink dot (#EC4899) | Fuel | وقود | 🔒 | [Edit]
    - Row: 🏛 | rose dot (#F43F5E) | Government/Fees | حكومة/رسوم | 🔒 | [Edit]
    - Custom category row with drag handle: ☰ | 🏠 | custom dot (#8B4513) | Maid Service | خدمة المنزل | Custom | [Edit] [Delete trash icon]

  - Section "Income" (collapsible, expanded, green section accent, "3 categories"):
    - Row: 💵 | green dot (#22C55E) | Salary | راتب | 🔒 | [Edit]
    - Row: 💻 | emerald dot (#10B981) | Freelance Income | دخل حر | 🔒 | [Edit]
    - Row: ➕ | mint dot (#34D399) | Other Income | دخل آخر | 🔒 | [Edit]

  - Section "Special" (collapsible, expanded, grey section accent, "3 categories"):
    - Row: ↔️ | grey dot (#94A3B8) | Transfer | تحويل | 🔒 | [Edit]
    - Row: ❓ | grey dot (#94A3B8) | Uncategorized | غير مصنف | 🔒 | [Edit]
    - Row: 🐷 | green dot (#22C55E) | Savings | ادخار | 🔒 | [Edit]

  - Hint text: "Predefined categories can only have their icon and color changed. Custom categories can be fully edited, reordered, or deleted."
```
