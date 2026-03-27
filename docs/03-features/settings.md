# Feature: Settings

## Purpose
Centralized configuration for household preferences, user preferences, AI providers, integrations, and data management. Settings are split between household-level (shared by all members) and user-level (personal to each user).

## Settings Hierarchy

| Scope | Who Can Edit | Stored In | Example |
|-------|-------------|-----------|---------|
| Household | Admin only | `app_settings` (household_id scoped) | Base currency, AI provider, OXR API key |
| User | Each user | `app_settings` (user-specific keys) | Locale, theme, notification prefs, Telegram |

## Settings Pages

### General Settings
**Route:** `/settings`

**Household settings (admin only):**
- Household name
- Base currency (dropdown: EGP, USD, SAR, AED, EUR, GBP, KWD)
- Default account for new transactions (optional)

**User settings:**
- Display name within household
- Theme: light (default), dark, system
- Numbers display: standard or Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩)

### Locale Settings
**Route:** `/settings/locale`

| Setting | Options | Default | Scope |
|---------|---------|---------|-------|
| Language | Arabic (ar), English (en) | en | User |
| Calendar | Gregorian, Hijri | Gregorian | User |
| Number format | Western (1,234.56), Arabic-Indic (١٬٢٣٤٫٥٦) | Western | User |
| Date format | DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD | DD/MM/YYYY | User |
| First day of week | Saturday, Sunday, Monday | Saturday | User |
| Timezone | Auto-detect or manual | Auto | User |

### Categories Settings
**Route:** `/settings/categories`

- List all categories (predefined + custom) grouped by type
- Create, edit, delete custom categories
- Edit icon and color of predefined categories
- Reorder categories via drag-and-drop (updates `sort_order`)
- See [categories.md](./categories.md) for full spec

### Exchange Rates Settings
**Route:** `/settings/exchange-rates`

- OXR API key (input, masked after save)
- Last fetched timestamp + manual fetch button
- Base currency selector
- Manual rate entry form (date, from, to, rate)
- Rate history table with source tags (API vs manual)
- See [exchange-rates.md](./exchange-rates.md) for full spec

### AI Provider Settings
**Route:** `/settings/ai`

**Household-level (admin only):**

| Setting | Type | Notes |
|---------|------|-------|
| AI provider | Select: Claude, OpenAI, Azure OpenAI, Ollama, Disabled | |
| API key | Password input (masked) | Not needed for Ollama |
| Model | Text input or select | e.g., "claude-sonnet-4-5-20241022", "gpt-4o" |
| Fallback provider | Select: same options + "None" | Used when primary fails |
| Ollama endpoint | URL input | Default: http://localhost:11434 |
| Ollama model | Text input | e.g., "llama3.1", "mistral" |
| Azure endpoint | URL input | e.g., https://myorg.openai.azure.com/ |
| Azure deployment | Text input | Deployment name |
| Azure API key | Password input | |
| Auto-categorize on import | Toggle | Default: on |
| Auto-categorize manual transactions | Toggle | Default: off |

**Test connection button:** sends a test categorization request to validate credentials.

**Categorization rules (sub-page):**
- List all rules with pattern, match type, category, hit count
- Create, edit, delete rules
- See [categories.md](./categories.md) for rule engine spec

### Import Templates Settings
**Route:** `/settings/import-templates`

- List all saved import templates
- Edit template (name, column mapping, date format, encoding)
- Delete template
- Link/unlink template to accounts
- See [import.md](./import.md) for template spec

### Notification Settings
**Route:** `/settings/notifications`

- Per-channel toggles (in-app, email, Telegram, WhatsApp)
- Per-trigger type toggles and timing (days_before)
- Large transaction threshold
- Budget warning threshold
- Quiet hours configuration
- Telegram connect/disconnect
- Test notification button
- See [notifications.md](./notifications.md) for full spec

### Household & Members Settings
**Route:** `/settings/household`

- Household name and base currency (admin)
- Member list with roles
- Invite new member (admin)
- Change member role (admin)
- Remove member (admin)
- Leave household
- Child account linking
- Activity log (admin)
- See [multi-user.md](./multi-user.md) for full spec

### People Settings
**Route:** `/settings/people`

- List all persons (P2P debt contacts)
- Create person with full details (name, name_ar, phone, email, relationship)
- Edit person details
- Delete person (blocked if active debts exist)
- See [debts.md](./debts.md) for person spec

### Data Management
**Route:** `/settings/data`

**Export:**
- Export all data as JSON (full backup)
- Export all data as CSV (one file per entity type)
- Export runs async for large datasets → download link when ready

**Import from other apps (future):**
- Import from Firefly III JSON export
- Import from YNAB export
- Import from generic CSV (map columns)

**Danger zone (admin only):**
- Delete all transactions (confirmation dialog with household name input)
- Delete all data and reset household (double confirmation)
- Delete household entirely (requires all non-admin members removed first)

### Subscription & Billing
**Route:** `/settings/billing`

- Current plan (Free / Premium / Business)
- Usage stats: members, households, OCR pages used this month
- Upgrade/downgrade plan
- Payment method management
- Billing history
- Feature comparison table

## UI Reference Designs

| Screen | HTML Reference | Stitch Prompt |
|--------|---------------|---------------|
| AI Settings | [19-settings-ai.html](../stitch-designs/html/19-settings-ai.html) | [19-settings-ai.md](../stitch-prompts/19-settings-ai.md) |
| Locale Settings | [19b-settings-locale.html](../stitch-designs/html/19b-settings-locale.html) | [19b-settings-locale.md](../stitch-prompts/19b-settings-locale.md) |
| Notification Prefs | [19d-settings-notifications.html](../stitch-designs/html/19d-settings-notifications.html) | [19d-settings-notifications.md](../stitch-prompts/19d-settings-notifications.md) |
| People / Contacts | [19e-settings-people.html](../stitch-designs/html/19e-settings-people.html) | [19e-settings-people.md](../stitch-prompts/19e-settings-people.md) |
| Data & Billing | [19f-settings-data-billing.html](../stitch-designs/html/19f-settings-data-billing.html) | [19f-settings-data-billing.md](../stitch-prompts/19f-settings-data-billing.md) |

> These are layout references, not pixel-perfect specs. See [design-tokens.md](../guides/09-design-tokens.md) for canonical colors, fonts, and spacing.

## API Endpoints

### `GET /api/v1/settings`
All settings for the current household + user.

**Response:**
```json
{
  "data": {
    "household": {
      "name": "Al-Masri Family",
      "base_currency": "EGP",
      "default_account_id": null,
      "ai_provider": "claude",
      "ai_model": "claude-sonnet-4-5-20241022",
      "ai_fallback_provider": "ollama",
      "auto_categorize_import": true,
      "auto_categorize_manual": false,
      "forecast_include_estimates": true,
      "forecast_lookback_months": 3
    },
    "user": {
      "locale": "ar",
      "theme": "light",
      "calendar": "gregorian",
      "number_format": "western",
      "date_format": "DD/MM/YYYY",
      "first_day_of_week": "saturday",
      "arabic_indic_numerals": false
    }
  }
}
```

### `PUT /api/v1/settings/household`
Update household settings. Admin only.

### `PUT /api/v1/settings/user`
Update user-level settings.

### `POST /api/v1/settings/ai/test`
Test AI provider connection.

**Response:**
```json
{ "data": { "provider": "claude", "status": "connected", "model": "claude-sonnet-4-5-20241022", "latency_ms": 850 } }
```
Or:
```json
{ "data": { "provider": "claude", "status": "error", "error": "Invalid API key" } }
```

### `POST /api/v1/settings/data/export`
Trigger full data export.

**Request:**
```json
{ "format": "json" }
```

**Response:**
```json
{ "data": { "job_id": "uuid-...", "status": "processing" } }
```

### `GET /api/v1/settings/data/export/{job_id}`
Check export status and download.

### `DELETE /api/v1/settings/data/transactions`
Delete all transactions. Admin only. Requires confirmation header.

### `DELETE /api/v1/settings/data/all`
Reset all household data. Admin only. Requires double confirmation.

## Acceptance Criteria

### General
- [ ] Household settings editable by admin only
- [ ] User settings editable by each user independently
- [ ] Theme toggle works (dark/light/system) with instant preview
- [ ] Base currency change recalculates all converted amounts

### Locale
- [ ] Language switch toggles entire UI between Arabic RTL and English LTR
- [ ] Hijri calendar displays dates in Islamic calendar format
- [ ] Arabic-Indic numerals render correctly across all number displays
- [ ] Date format preference applied consistently across all pages
- [ ] First day of week affects calendar pickers and weekly budget periods

### AI Provider
- [ ] All 4 providers configurable (Claude, OpenAI, Azure OpenAI, Ollama)
- [ ] API key stored securely (encrypted at rest in Supabase)
- [ ] Test connection validates credentials and returns latency
- [ ] Fallback provider activates when primary fails
- [ ] Auto-categorize toggles control when AI runs

### Data Management
- [ ] Full JSON export includes all entities with relationships intact
- [ ] CSV export produces one file per entity type with headers
- [ ] Large exports run async with download link
- [ ] Danger zone operations require explicit confirmation
- [ ] Cannot delete household while non-admin members exist
- [ ] Data deletion is irreversible — no soft delete, actual DROP

### Settings Persistence
- [ ] All settings persisted to `app_settings` table
- [ ] Settings survive session expiry and re-login
- [ ] Settings sync across devices via database (not localStorage)
