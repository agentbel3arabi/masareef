# Stitch Screen Map

Quick lookup: which Stitch design screens apply to each feature/phase. Use this when planning frontend work to ensure every page references its matching Stitch HTML.

All files live in `docs/stitch-designs/html/`. Matching screenshots in `docs/stitch-designs/screenshots/`.

## By Feature

| Feature | Stitch Screens | Feature Spec |
|---|---|---|
| Landing / Marketing | `01-landing-page.html` | — |
| Auth (Login) | `02-login.html` | — |
| Auth (Registration) | `03-registration.html` | — |
| Onboarding | `04-onboarding.html` | `04-user-flows.md` |
| Dashboard | `05-dashboard.html` | `03-features/dashboard.md` |
| Accounts (grid) | `06-accounts.html` | `03-features/accounts.md` |
| Account Detail | `07-account-detail.html` | `03-features/accounts.md` |
| Transactions (global) | `07b-transactions-global.html` | `03-features/transactions.md` |
| Import: Upload | `08-import-upload.html` | `03-features/import.md` |
| Import: Column Mapping | `08b-import-mapping.html` | `03-features/import.md` |
| Import: Preview | `09-import-preview.html` | `03-features/import.md` |
| Debts & Loans | `10-debts-loans.html` | `03-features/debts.md` |
| Card Installments | `10b-card-installments.html` | `03-features/debts.md` |
| Store Installments | `10c-store-installments.html` | `03-features/debts.md` |
| Financing Apps | `10d-financing-apps.html` | `03-features/financing-apps.md` |
| P2P Debts | `11-p2p-debts.html` | `03-features/debts.md` |
| Gam3eya | `12-gam3eya.html` | `03-features/gam3eya.md` |
| Assets (portfolio) | `13-assets.html` | `03-features/assets.md` |
| Asset Detail | `14-asset-detail.html` | `03-features/assets.md` |
| Budgets | `15-budgets.html` | `03-features/budgets.md` |
| Forecasting | `16-forecasting.html` | `03-features/forecasting.md` |
| Reports | `17-reports.html` | `03-features/reports.md` |
| Notifications | `18-notifications.html` | `03-features/notifications.md` |
| Settings: AI | `19-settings-ai.html` | `03-features/settings.md` |
| Settings: Locale | `19b-settings-locale.html` | `03-features/settings.md` |
| Settings: Categories | `19c-settings-categories.html` | `03-features/settings.md` |
| Settings: Notifications | `19d-settings-notifications.html` | `03-features/settings.md` |
| Settings: People | `19e-settings-people.html` | `03-features/settings.md` |
| Settings: Data & Billing | `19f-settings-data-billing.html` | `03-features/settings.md` |
| Settings: Household | `20-settings-household.html` | `03-features/multi-user.md` |
| Transaction Form | `21-transaction-form.html` | `03-features/transactions.md` |
| Transfer Form | `22-transfer-form.html` | `03-features/transfers.md` |
| Empty States | `23-empty-states.html` | — (cross-cutting) |

## By Phase

| Phase | Screens to Reference |
|---|---|
| **1 — Foundation** | `02-login.html`, `03-registration.html`, `06-accounts.html`, `07-account-detail.html`, `07b-transactions-global.html`, `21-transaction-form.html`, `22-transfer-form.html`, `23-empty-states.html` |
| **2 — Import** | `08-import-upload.html`, `08b-import-mapping.html`, `09-import-preview.html` |
| **3 — Debts** | `10-debts-loans.html`, `10b-card-installments.html`, `10c-store-installments.html`, `10d-financing-apps.html`, `11-p2p-debts.html` |
| **4 — Dashboard** | `05-dashboard.html` |
| **5 — Gam3eya** | `12-gam3eya.html` |
| **6 — Assets** | `13-assets.html`, `14-asset-detail.html` |
| **7 — Budgets** | `15-budgets.html` |
| **8 — Forecasting** | `16-forecasting.html` |
| **9 — AI Categorization** | `19-settings-ai.html`, `19c-settings-categories.html` |
| **10 — Multi-User** | `20-settings-household.html`, `19e-settings-people.html` |
| **11 — Notifications** | `18-notifications.html`, `19d-settings-notifications.html` |
| **12 — Reports** | `17-reports.html` |
| **13 — Settings** | `04-onboarding.html`, `19-settings-ai.html`, `19b-settings-locale.html`, `19c-settings-categories.html`, `19d-settings-notifications.html`, `19e-settings-people.html`, `19f-settings-data-billing.html`, `20-settings-household.html` |
| **14–20** | No dedicated Stitch screens (PWA, bots, Islamic finance use existing layouts) |

## Usage

When planning a phase with frontend work:

1. Look up the phase in the "By Phase" table above
2. Add every listed screen to the plan's "Required reading" header
3. Reference specific layout patterns from those screens in your component code
4. Use Stitch MCP tools when available for more accurate extraction
5. When Stitch HTML conflicts with `guides/09-design-tokens.md`, design tokens win
