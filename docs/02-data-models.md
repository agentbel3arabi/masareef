# Data Models

All tables use PostgreSQL via Supabase. Every user-facing table includes `household_id` for multi-tenant isolation. Money is always `BIGINT` in minor units. Soft deletes via `is_active`.

## Enum Types

```sql
CREATE TYPE account_type AS ENUM ('bank_account', 'credit_card', 'cash_wallet', 'digital_wallet', 'financing_app');
CREATE TYPE transaction_type AS ENUM ('debit', 'credit');
CREATE TYPE category_type AS ENUM ('expense', 'income', 'special');
CREATE TYPE debt_type AS ENUM ('bank_loan', 'personal_lent', 'personal_borrowed');
CREATE TYPE installment_type AS ENUM ('credit_card', 'store', 'financing_app');
CREATE TYPE lifecycle_status AS ENUM ('active', 'completed');
-- Used by: gam3eyas.status, installment_plans.status
CREATE TYPE debt_status AS ENUM ('active', 'paid_off');
CREATE TYPE asset_type AS ENUM ('real_estate', 'gold', 'silver', 'vehicle', 'savings_certificate', 'other');
CREATE TYPE asset_tx_type AS ENUM ('purchase', 'sale', 'maintenance', 'insurance', 'tax', 'rental_income', 'fuel', 'repair', 'other');
CREATE TYPE budget_period AS ENUM ('monthly', 'weekly', 'yearly');
CREATE TYPE rule_frequency AS ENUM ('monthly', 'weekly');
CREATE TYPE ai_provider AS ENUM ('claude', 'openai', 'azure_openai', 'ollama');
CREATE TYPE household_role AS ENUM ('admin', 'member', 'viewer', 'child');
CREATE TYPE person_relationship AS ENUM ('family', 'friend', 'colleague', 'business', 'other');
CREATE TYPE repayment_mode AS ENUM ('lump_sum', 'equal_splits', 'custom_splits');
CREATE TYPE payment_frequency AS ENUM ('monthly', 'quarterly', 'semi_annual', 'annual');
CREATE TYPE institution_type AS ENUM ('bank', 'bnpl', 'digital_wallet_provider');
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'telegram', 'whatsapp');
```

---

## Multi-Tenancy

### households
The root entity for multi-tenant data isolation.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| name | TEXT | NOT NULL | e.g., "Al-Masri Family" |
| base_currency | TEXT | NOT NULL, default 'EGP' | |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |

### household_members
Join table: users ↔ households with role.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| household_id | UUID | FK → households, NOT NULL | |
| user_id | UUID | FK → auth.users, NOT NULL | Supabase Auth user |
| role | household_role | NOT NULL, default 'member' | |
| display_name | TEXT | NOT NULL | Name shown in household |
| joined_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Unique:** (household_id, user_id)

### household_invitations
Pending invitations to join a household.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| household_id | UUID | FK → households, NOT NULL | |
| email | TEXT | NOT NULL | Invitee email |
| role | household_role | NOT NULL | Assigned role on acceptance |
| display_name | TEXT | NOT NULL | |
| invite_code | TEXT | NOT NULL, UNIQUE | 6-char alphanumeric code |
| invited_by | UUID | FK → auth.users, NOT NULL | |
| accepted_at | TIMESTAMPTZ | | Null until accepted |
| expires_at | TIMESTAMPTZ | NOT NULL | 7 days from creation |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Index:** (invite_code), (household_id)

### child_linked_accounts
Scopes which accounts a child member can see.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| member_id | UUID | FK → household_members, NOT NULL | |
| account_id | INT | FK → accounts, NOT NULL | |

**PK:** (member_id, account_id)

### household_activity_log
Audit trail of mutations within a household. Visible to admin only.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| household_id | UUID | FK → households, NOT NULL | |
| user_id | UUID | FK → auth.users, NOT NULL | |
| action | TEXT | NOT NULL | e.g., "created_transaction", "deleted_debt" |
| entity_type | TEXT | | "transaction", "debt", "account", etc. |
| entity_id | INT | | |
| details | JSONB | | Action-specific metadata |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Index:** (household_id, created_at DESC)

---

## Core Financial

### accounts

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| household_id | UUID | FK → households, NOT NULL | RLS scope |
| name | TEXT | NOT NULL | |
| name_ar | TEXT | | Optional Arabic name |
| type | account_type | NOT NULL | |
| currency | VARCHAR(3) | NOT NULL | 'EGP', 'USD', 'SAR' |
| institution_id | INT | FK → financial_institutions | Links to institution directory |
| iban | TEXT | | IBAN (validated with MOD97) |
| account_number | TEXT | | Bank account number |
| account_tier | TEXT | | e.g., "Gold", "Platinum" |
| branch | TEXT | | Branch name |
| balance_minor | BIGINT | NOT NULL, default 0 | Seed balance in minor units |
| credit_limit | BIGINT | | Credit card only, minor units |
| billing_cycle_day | INT | CHECK (1-31) | Credit card only |
| payment_due_day | INT | CHECK (1-31) | Credit card only |
| opened_at | DATE | | Balance history anchor |
| is_active | BOOLEAN | NOT NULL, default true | |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Indexes:** (household_id)

### transactions

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| household_id | UUID | FK → households, NOT NULL | RLS scope |
| account_id | INT | FK → accounts, NOT NULL | |
| date | DATE | NOT NULL | |
| description | TEXT | default '' | |
| amount_minor | BIGINT | NOT NULL | Signed: negative=debit, positive=credit |
| currency | TEXT | NOT NULL | |
| type | transaction_type | NOT NULL | |
| category_id | INT | FK → categories | |
| import_batch_id | UUID | | Groups rows from one import session |
| notes | TEXT | | |
| exchange_rate_at_time | BIGINT | | Rate ×10000 at recording time |
| fx_rate_minor_units | BIGINT | | For cross-currency transfers |
| is_active | BOOLEAN | NOT NULL, default true | |
| applies_to_balance | BOOLEAN | NOT NULL, default true | |
| transfer_id | UUID | | Links two legs of a transfer |
| gam3eya_id | INT | FK → gam3eyas | |
| asset_id | INT | FK → assets | Links tx to an asset |
| ai_categorized | BOOLEAN | default false | True if AI assigned the category |
| ai_confidence | REAL | | 0.0–1.0, null if manual |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Indexes:** (household_id, account_id), (household_id, date), (household_id, category_id), (account_id, date, amount_minor, description) for duplicate detection

### transaction_splits
For splitting a single transaction across multiple categories.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| transaction_id | INT | FK → transactions, NOT NULL | |
| category_id | INT | FK → categories | |
| amount_minor | BIGINT | NOT NULL | Always positive; portion allocated |
| notes | TEXT | | |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Constraint:** Sum of splits must equal parent transaction's abs(amount_minor).
**Index:** (transaction_id)

### categories

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| household_id | UUID | FK → households | NULL for system predefined |
| name_en | TEXT | NOT NULL | |
| name_ar | TEXT | | |
| type | category_type | NOT NULL | |
| icon | TEXT | | Lucide icon name |
| color | TEXT | | Hex color (#RRGGBB) |
| is_predefined | BOOLEAN | NOT NULL, default false | System defaults, immutable |
| is_system | BOOLEAN | NOT NULL, default false | System categories (Opening Balance, Reconciliation) — hidden from user picker |
| is_active | BOOLEAN | NOT NULL, default true | |
| sort_order | INT | NOT NULL, default 0 | |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Predefined categories (seeded):**
- Expense (12): Food & Dining, Groceries, Transportation, Utilities, Housing/Rent, Healthcare, Shopping, Education, Entertainment, Telecommunications, Fuel, Government/Fees
- Income (3): Salary, Freelance Income, Other Income
- Special (3): Transfer, Uncategorized, Savings
- System (2): Opening Balance, Reconciliation Adjustment — `is_system=true`, hidden from user category picker

---

## Debt Management

### debts

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| household_id | UUID | FK → households, NOT NULL | |
| type | debt_type | NOT NULL | |
| person_id | INT | FK → persons | P2P debts only |
| linked_account_id | INT | FK → accounts | For auto-matching |
| name | TEXT | NOT NULL | |
| institution | TEXT | | Bank name for bank_loan |
| principal_minor | BIGINT | NOT NULL | Original amount |
| currency | TEXT | NOT NULL | |
| annual_rate_bps | INT | NOT NULL, default 0 | Basis points: 1450 = 14.5% |
| tenure_months | INT | NOT NULL | |
| start_date | DATE | NOT NULL | |
| payment_day_of_month | INT | | Day of month payment is due |
| payment_frequency | payment_frequency | NOT NULL, default 'monthly' | monthly, quarterly, semi_annual, annual |
| monthly_payment_minor | BIGINT | NOT NULL | Pre-calculated via PMT |
| repayment_mode | repayment_mode | | P2P only: lump_sum, equal_splits, custom_splits |
| due_date | DATE | | P2P lump_sum: single payout date |
| status | debt_status | NOT NULL, default 'active' | |
| notes | TEXT | | |
| is_active | BOOLEAN | NOT NULL, default true | |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Indexes:** (household_id, type), (household_id, linked_account_id), (household_id, person_id)

### debt_payments

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| debt_id | INT | FK → debts, NOT NULL | |
| date | DATE | NOT NULL | |
| amount_minor | BIGINT | NOT NULL | Always positive |
| principal_minor | BIGINT | | Amortized loans only |
| interest_minor | BIGINT | | Amortized loans only |
| transaction_id | INT | FK → transactions | Optional link to main tx |
| notes | TEXT | | |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Indexes:** (debt_id), (transaction_id)

### installment_plans

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| household_id | UUID | FK → households, NOT NULL | |
| type | installment_type | NOT NULL | |
| name | TEXT | NOT NULL | |
| merchant_name | TEXT | | Store plans |
| source_account_id | INT | FK → accounts | Credit card or financing app account this plan is charged to |
| linked_account_id | INT | FK → accounts | Deduction source |
| total_amount_minor | BIGINT | NOT NULL | |
| monthly_amount_minor | BIGINT | NOT NULL | |
| total_months | INT | NOT NULL | |
| start_month | DATE | NOT NULL | Always day 1 |
| currency | TEXT | NOT NULL | |
| annual_rate_bps | INT | NOT NULL, default 0 | Basis points: 1450 = 14.5% |
| payment_day_of_month | INT | CHECK (1-28) | Day of month payment is due |
| notes | TEXT | | |
| status | lifecycle_status | NOT NULL, default 'active' | |
| is_active | BOOLEAN | NOT NULL, default true | |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Indexes:** (household_id, type), (household_id, source_account_id)
**Constraint:** payment_day_of_month between 1 and 28

### persons
Counterparties for P2P debts.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| household_id | UUID | FK → households, NOT NULL | |
| name | TEXT | NOT NULL | Full name |
| name_ar | TEXT | | Arabic name |
| phone | TEXT | | |
| email | TEXT | | |
| relationship | person_relationship | | family, friend, colleague, business, other |
| notes | TEXT | | |
| is_active | BOOLEAN | NOT NULL, default true | |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() | |

> Debts table gains additional P2P fields: `repayment_mode` (repayment_mode enum), `due_date` (DATE, for lump_sum mode).

### p2p_debt_splits
Scheduled payment splits for P2P debts (equal or custom splits).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| debt_id | INT | FK → debts, NOT NULL | |
| amount_minor | BIGINT | NOT NULL | Expected payment for this split |
| due_date | DATE | NOT NULL | When this split is due |
| paid | BOOLEAN | NOT NULL, default false | Marked when payment recorded |
| payment_id | INT | FK → debt_payments | Link to actual payment |

**Index:** (debt_id)
**Constraint:** Sum of splits must equal debt's `principal_minor`

---

## Asset Management

### assets

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| household_id | UUID | FK → households, NOT NULL | |
| name | TEXT | NOT NULL | e.g., "Apartment Maadi", "21K Gold Ring" |
| type | asset_type | NOT NULL | |
| currency | TEXT | NOT NULL | |
| purchase_price_minor | BIGINT | NOT NULL | Original cost |
| current_value_minor | BIGINT | NOT NULL | Latest valuation |
| purchase_date | DATE | | |
| linked_account_id | INT | FK → accounts | Purchased from this account |
| quantity | DECIMAL(12,4) | default 1 | Grams for gold/silver, units for others |
| unit | TEXT | | 'gram', 'ounce', 'sqm', 'unit' |
| location | TEXT | | Address for real estate |
| notes | TEXT | | |
| is_active | BOOLEAN | NOT NULL, default true | |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Indexes:** (household_id, type), (household_id, is_active)

### asset_value_history
Tracks asset value changes over time.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| asset_id | INT | FK → assets, NOT NULL | |
| date | DATE | NOT NULL | |
| value_minor | BIGINT | NOT NULL | Valuation at this date |
| source | TEXT | default 'manual' | 'manual', 'api' (gold/silver prices) |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Unique:** (asset_id, date)
**Index:** (asset_id, date DESC)

> Transactions are linked to assets via `transactions.asset_id`. The `asset_tx_type` is inferred from the transaction's category or can be explicitly tagged. Total cost of ownership = purchase_price + SUM(linked debit transactions).

---

## Gam3eya (Rotating Savings)

### gam3eyas

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| household_id | UUID | FK → households, NOT NULL | |
| name | TEXT | NOT NULL | |
| monthly_contribution_minor | BIGINT | NOT NULL | |
| currency | TEXT | NOT NULL | |
| total_months | INT | NOT NULL | |
| payout_month | INT | | 1-based offset; null if split |
| start_month | DATE | NOT NULL | Always day 1 |
| linked_account_id | INT | FK → accounts | |
| status | lifecycle_status | NOT NULL, default 'active' | |
| notes | TEXT | | |
| is_active | BOOLEAN | NOT NULL, default true | |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Indexes:** (household_id, status)

### gam3eya_payout_splits
For split payouts across multiple months.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| gam3eya_id | INT | FK → gam3eyas, NOT NULL | |
| month_offset | INT | NOT NULL | 1-based offset from start |
| amount_minor | BIGINT | NOT NULL | |
| notes | TEXT | | |

**Index:** (gam3eya_id)
**Constraint:** Sum of splits = total_months × monthly_contribution_minor

---

## Budgets & Savings

### budgets

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| household_id | UUID | FK → households, NOT NULL | |
| name | TEXT | NOT NULL | e.g., "March 2026 Budget" |
| period | budget_period | NOT NULL | |
| start_date | DATE | NOT NULL | |
| end_date | DATE | NOT NULL | |
| total_amount_minor | BIGINT | | Optional overall cap |
| currency | TEXT | NOT NULL | |
| is_recurring | BOOLEAN | NOT NULL, default false | Auto-create next period on expiry |
| rollover_enabled | BOOLEAN | NOT NULL, default false | Carry under/over to next period |
| created_by | UUID | FK → auth.users | Owner for per-member budgets |
| is_active | BOOLEAN | NOT NULL, default true | |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Index:** (household_id, start_date)

### budget_categories
Per-category allocation within a budget (envelope model).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| budget_id | INT | FK → budgets, NOT NULL | |
| category_id | INT | FK → categories, NOT NULL | |
| allocated_minor | BIGINT | NOT NULL | Budgeted amount |
| notes | TEXT | | |

**Unique:** (budget_id, category_id)

> Spent amount is computed at query time: SUM(transactions.amount_minor) WHERE category_id AND date BETWEEN budget start/end. No denormalization.

### savings_goals

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| household_id | UUID | FK → households, NOT NULL | |
| name | TEXT | NOT NULL | e.g., "Emergency Fund", "Vacation" |
| target_minor | BIGINT | NOT NULL | Goal amount |
| current_minor | BIGINT | NOT NULL, default 0 | Progress |
| currency | TEXT | NOT NULL | |
| target_date | DATE | | Optional deadline |
| linked_account_id | INT | FK → accounts | Savings account tracking this goal |
| icon | TEXT | | |
| color | TEXT | | |
| is_completed | BOOLEAN | NOT NULL, default false | |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() | |

---

## Forecasting & Recurring

### recurring_rules

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| household_id | UUID | FK → households, NOT NULL | |
| name | TEXT | NOT NULL | |
| type | transaction_type | NOT NULL | income or expense |
| amount_minor | BIGINT | NOT NULL | Always positive |
| currency | TEXT | NOT NULL | |
| frequency | rule_frequency | NOT NULL | |
| day_of_month | INT | CHECK (1-28) | For monthly |
| day_of_week | INT | CHECK (0-6) | For weekly |
| linked_account_id | INT | FK → accounts | |
| category_id | INT | FK → categories | |
| is_active | BOOLEAN | NOT NULL, default true | |
| start_date | DATE | NOT NULL | |
| end_date | DATE | | Null = no end |
| notes | TEXT | | |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Indexes:** (household_id, is_active), (household_id, type)

---

## Exchange Rates

### exchange_rates

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| date | DATE | NOT NULL | |
| from_currency | TEXT | NOT NULL | |
| to_currency | TEXT | NOT NULL | |
| rate_scaled | BIGINT | NOT NULL | Rate × 10,000 |
| is_forecast | BOOLEAN | NOT NULL, default false | |
| source | TEXT | NOT NULL | 'openexchangerates', 'manual' |
| fetched_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Unique:** (date, from_currency, to_currency)
**Index:** (date), (from_currency, to_currency)

---

## Import Templates

### import_templates
User-created column mappings for reusable import configurations.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| household_id | UUID | FK → households, NOT NULL | |
| name | TEXT | NOT NULL | e.g., "CIB Savings CSV" |
| name_ar | TEXT | | Optional Arabic name |
| format | TEXT | NOT NULL | 'csv', 'excel' |
| columns | JSONB | NOT NULL | `{"date": "Transaction Date", "debit": "Debit", ...}` |
| date_format | TEXT | NOT NULL | 'DD/MM/YYYY', 'YYYY-MM-DD', etc. |
| encoding | TEXT | default 'utf-8' | 'utf-8', 'windows-1256' |
| skip_rows | INT | default 0 | Header rows to skip |
| sheet_name | TEXT | | For Excel: which sheet |
| notes | TEXT | | |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Index:** (household_id)

### account_import_templates
Links accounts to their default import template.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| account_id | INT | FK → accounts, PK | One template per account |
| template_id | INT | FK → import_templates, NOT NULL | |

---

## AI & Categorization Learning

### categorization_rules
User-confirmed rules that override AI. Built from corrections.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| household_id | UUID | FK → households, NOT NULL | |
| pattern | TEXT | NOT NULL | Merchant name or description pattern |
| match_type | TEXT | NOT NULL, default 'contains' | 'exact', 'contains', 'regex' |
| category_id | INT | FK → categories, NOT NULL | |
| confidence | REAL | default 1.0 | Rules from user = 1.0, from AI = lower |
| hit_count | INT | default 0 | Times this rule matched |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Index:** (household_id, pattern)

> Rule engine runs BEFORE AI provider. If a rule matches with confidence ≥ 0.95, AI call is skipped. This reduces API costs and improves speed over time.

---

## Notifications & Reminders

### notifications
The logical notification — one per event per user. In-app display uses this table directly.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| household_id | UUID | FK → households, NOT NULL | |
| user_id | UUID | FK → auth.users | Null = all household members |
| title | TEXT | NOT NULL | |
| body | TEXT | | |
| is_read | BOOLEAN | NOT NULL, default false | For in-app display |
| link | TEXT | | Deep link to relevant page |
| dedup_key | TEXT | | Unique key to prevent duplicates (see notifications.md) |
| scheduled_for | TIMESTAMPTZ | | Future notifications |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Index:** (household_id, user_id, is_read), (dedup_key) UNIQUE WHERE dedup_key IS NOT NULL

### notification_deliveries
Per-channel delivery tracking. One notification may produce multiple deliveries (in_app, email, telegram).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| notification_id | INT | FK → notifications, NOT NULL | |
| channel | notification_channel | NOT NULL | |
| status | TEXT | NOT NULL, default 'pending' | 'pending', 'sent', 'failed' |
| retry_count | INT | NOT NULL, default 0 | Max 3 retries |
| sent_at | TIMESTAMPTZ | | |
| error_message | TEXT | | Last failure reason |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Index:** (notification_id), (status) WHERE status = 'pending'

---

## Settings

### app_settings
Per-household key-value configuration.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| household_id | UUID | FK → households, NOT NULL | |
| key | TEXT | NOT NULL | |
| value | TEXT | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() | |

**PK:** (household_id, key)

**Known keys:**
- `oxr_api_key` — OpenExchangeRates API key
- `oxr_last_fetched` — last rate fetch timestamp
- `base_currency` — user's preferred base currency
- `ai_provider` — selected AI provider
- `ai_api_key` — provider API key
- `ai_model` — model identifier
- `ai_fallback_provider` — fallback provider
- `ollama_endpoint` — Ollama server URL
- `azure_endpoint` — Azure OpenAI endpoint
- `telegram_bot_token` — for Telegram notifications
- `use_arabic_numerals` — Arabic-Indic numeral preference
- `use_hijri_dates` — Hijri calendar preference
- `forecast_include_estimates` — toggle non-recurring estimation in forecasting (boolean, default true)
- `forecast_lookback_months` — months to average for non-recurring estimation (int, default 3)
- `forecast_min_threshold_percent` — minimum % of total to include in estimation (int, default 5)
- `ocr_credits_used_YYYY_MM` — cumulative OCR pages used this billing period
- `ocr_credit_limit` — max OCR pages per billing period (set by subscription tier)

---

## Subscription & Billing

> **Note:** Billing will likely be handled by a third-party payment provider (e.g., Stripe, Lemon Squeezy, Paddle). The tables below track plan assignment and usage internally. Payment method storage, invoicing, and payment processing are delegated to the provider and not stored in our database.

### household_subscriptions
Tracks which plan a household is on.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| household_id | UUID | FK → households, NOT NULL, UNIQUE | One active sub per household |
| plan | TEXT | NOT NULL, default 'free' | 'free', 'premium', 'business' |
| status | TEXT | NOT NULL, default 'active' | 'active', 'cancelled', 'past_due' |
| provider_subscription_id | TEXT | | External provider's subscription ID |
| current_period_start | DATE | | |
| current_period_end | DATE | | |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Index:** (household_id)

> Plan limits (members, households, OCR pages, etc.) are enforced in application code based on `plan` value. A `plan_limits` config (not a table) maps plan → feature limits. This avoids schema changes when adjusting pricing tiers.

---

---

## Async Jobs

### report_jobs
Tracks async report generation requests. Replaces the in-memory `dict[UUID, JobStatus]` approach for horizontal scalability.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | Job ID returned to client |
| household_id | UUID | FK → households, NOT NULL | Scoping |
| report_type | TEXT | NOT NULL | e.g., `"income_expense"`, `"net_worth"`, `"tax_summary"` |
| status | TEXT | NOT NULL, default 'pending' | `'pending'`, `'processing'`, `'completed'`, `'failed'` |
| config | JSONB | NOT NULL | Report parameters: date range, filters, output format |
| download_url | TEXT | | Supabase Storage URL; populated when status = completed |
| error_message | TEXT | | Failure reason; populated when status = failed |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |
| completed_at | TIMESTAMPTZ | | Populated when status = completed or failed |
| expires_at | TIMESTAMPTZ | | Download link expiry (default: created_at + 1 hour) |

**Index:** (household_id, created_at DESC), (status) WHERE status IN ('pending', 'processing')

---

## Financial Institutions

### financial_institutions
Directory of banks, BNPL providers, and digital wallet providers.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| slug | TEXT | NOT NULL | URL-safe identifier |
| name_en | TEXT | NOT NULL | English name |
| name_ar | TEXT | NOT NULL | Arabic name |
| type | institution_type | NOT NULL | bank, bnpl, digital_wallet_provider |
| logo_url | TEXT | | SVG logo path |
| bic_swift | TEXT | | BIC/SWIFT code (banks only) |
| country | VARCHAR(3) | NOT NULL, default 'EG' | ISO country code |
| is_predefined | BOOLEAN | NOT NULL, default false | Seeded institutions |
| is_popular | BOOLEAN | NOT NULL, default false | Pinned to top of selector |
| sort_order | INT | NOT NULL, default 0 | Display ordering |
| household_id | UUID | FK → households | NULL for predefined institutions |
| is_active | BOOLEAN | NOT NULL, default true | |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() | |

### reconciliation_records
Audit trail for balance reconciliation events.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | |
| household_id | UUID | FK → households, NOT NULL | |
| account_id | INT | FK → accounts, NOT NULL | |
| transaction_id | INT | FK → transactions | Adjustment transaction created |
| expected_balance_minor | BIGINT | NOT NULL | Computed from transactions |
| actual_balance_minor | BIGINT | NOT NULL | User-entered actual balance |
| adjustment_minor | BIGINT | NOT NULL | actual - expected |
| reconciliation_date | DATE | NOT NULL | |
| reconciled_at | TIMESTAMPTZ | NOT NULL, default now() | |
| notes | TEXT | | |
| is_active | BOOLEAN | NOT NULL, default true | |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Index:** (account_id)

---

## Entity Relationship Summary

```
Household ─┬── Accounts ──── Transactions ──┬── Transaction Splits
           │                  │              └── (linked to Categories)
           │                  ├── transfer_id links two tx legs
           │                  ├── gam3eya_id → Gam3eyas
           │                  └── asset_id → Assets
           │
           ├── Debts ──────── Debt Payments ── (linked to Transactions)
           ├── Installment Plans
           ├── Persons (P2P debt contacts)
           │
           ├── Assets ─────── Asset Value History
           │                  (Transactions linked via asset_id)
           │
           ├── Gam3eyas ───── Gam3eya Payout Splits
           │
           ├── Budgets ────── Budget Categories
           ├── Savings Goals
           ├── Recurring Rules
           ├── Categorization Rules
           ├── Notifications
           ├── App Settings
           │
           ├── Household Invitations (pending joins)
           ├── Child Linked Accounts (account scoping for child role)
           └── Activity Log (audit trail, admin-visible)

Financial Institutions ── shared predefined + per-household custom
                         (Accounts linked via institution_id FK)
Reconciliation Records ── per-account audit trail
Exchange Rates ── global (no household scope)
Categories ────── shared predefined + per-household custom + system categories
```

## RLS Policy Pattern

Every table with `household_id` gets this policy:

```sql
CREATE POLICY "Users see own household data"
  ON {table} FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );
```

Additional policies for role-based restrictions (e.g., `child` role cannot see P2P debts, `viewer` cannot insert/update).
