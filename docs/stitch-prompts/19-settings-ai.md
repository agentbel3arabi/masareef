# 19 — Settings: AI Provider

Copy everything inside the code block and paste into Stitch.

```
Design system: Light mode finance app. Background: white (#FFFFFF) with light grey (#F8FAFC) secondary surfaces. Cards: white with subtle grey border (1px #E2E8F0) and soft shadow, 10px border-radius. Text: dark charcoal (#0F172A) primary, slate (#64748B) secondary. Emerald green (#16a34a) for success/CTA. Font: Inter for English, Noto Sans Arabic for Arabic. Sidebar on left. Shadcn/ui style. The app is called "Masareef" (مصاريف).

Anatomy: Page with main app sidebar on the left. Content area has a secondary settings sidebar (narrower, light grey background) listing settings categories. Main content area to the right shows the AI provider configuration form on a white card.

Vibe: Clean settings form on light background. White content area with the settings sidebar in light grey (#F8FAFC). Technical but approachable. Form inputs have light grey borders, clear labels above each field. Provider selection feels like choosing a tool. Test connection button feels actionable with clear success/error feedback. Toggles feel satisfying.

Content:
- Main sidebar: same as dashboard, Settings area expanded
- Settings sidebar (secondary, left of content, ~200px wide, light grey bg):
  - General
  - Locale
  - Categories
  - AI Provider (active, green accent bar on left, white bg)
  - Import Templates
  - Notifications
  - Household & Members
  - People
  - Data Management
  - Billing
- Content area (white card):
  - Title: "AI Categorization" (heading) | "Configure the AI provider for automatic transaction categorization." (slate subtitle)
  - Section 1 — "Primary Provider":
    - "Provider" — dropdown select: Claude (selected), OpenAI, Azure OpenAI, Ollama, Disabled
    - "API Key" — password input field with masked dots showing "sk-ant-•••••••" and eye toggle icon
    - "Model" — text input: "claude-sonnet-4-5-20241022" with helper text "Model ID from your provider"
  - Section 2 — "Fallback Provider" (with divider above):
    - "Fallback" — dropdown: Ollama (selected), None
    - "Ollama Endpoint" — URL input: "http://localhost:11434"
    - "Ollama Model" — text input: "llama3.1"
  - Section 3 — "Azure OpenAI" (collapsed by default, expand when Azure selected):
    - "Azure Endpoint" — URL input placeholder
    - "Azure Deployment" — text input placeholder
    - "Azure API Key" — password input placeholder
  - Divider
  - Section 4 — "Behavior":
    - "Auto-categorize on import" — toggle switch ON (green track)
    - "Auto-categorize manual transactions" — toggle switch OFF (grey track)
  - Divider
  - Button row: [Test Connection] outline button | status text next to it: "✓ Connected — 850ms latency" (green text with green check icon)
  - [Save Changes] green filled button (right-aligned)
```
