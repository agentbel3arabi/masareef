# Financial Institutions & Account Banking Relationship Model

**Date:** 2026-04-05
**Status:** Design approved, pending implementation plan
**Scope:** New `financial_institutions` table, account grouping by institution, transaction-based balances, system categories, updated account creation flow, bank detail page

## 1. Problem Statement

Accounts are currently flat — each bank account, credit card, and financing app is an independent entity with a free-text `institution` field. There is no formal financial institution entity. This limits the UX:

- Users cannot see all their accounts at one bank in a single view
- No bank logos, no standardized bank names (Arabic or English)
- No pre-populated directory of Egyptian banks or BNPL providers
- Credit cards and bank accounts at the same institution appear in separate type-based sections with no visual relationship
- The free-text institution field leads to inconsistent naming ("CIB" vs "Commercial International Bank" vs "البنك التجاري الدولي")

## 2. Design Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| Institution linking scope | Optional linking — only bank_account + credit_card visually grouped under institution | Clean UI; BNPL/wallets show logo on card but stay independent |
| Opening balance approach | Transaction-based (no seed `balance_minor`) | Fully self-documenting ledger; every balance change traceable to a transaction |
| Migration strategy | Clean slate — drop all existing data | No backward compat needed; ideal schema from day one |
| System categories | Non-reassignable; hidden from user category picker | Prevents user error; system transactions clearly distinguished |
| Bank detail page scope | Option A: summary + account list | Core value first; cross-account insights (B) and full dashboard (C) deferred |
| Bank selector UX | Searchable combobox with logos, bilingual search, popular pinning (banks only) | Space-efficient, mobile-friendly, handles Arabic/English naturally |
| Logo sourcing | Bundled static SVGs in `frontend/public/institutions/` | No external dependencies, instant loads, ~500KB total |
| Institution table scope | Single `financial_institutions` table covering banks, BNPL, and digital wallet providers | Type discriminator avoids duplicate columns and joins |
| IBAN validation | Full MOD97 check digit verification | Trivial to implement; catches transposition errors regex misses |
| Single-card section width | Half-width (2-column grid) | Less wasted space than 1/3; visually consistent; leaves room for second card |
| Section ordering | Bank groups → Financing Apps → Digital Wallets → Cash Wallets | Institutional + complex accounts first; simple accounts last |
| Reconciliation approach | Creates Reconciliation Adjustment transaction + reconciliation record | Dual-record: transaction for balance, record for audit trail |
| Slug immutability | Slugs never change after creation | Prevents breaking bookmarked URLs and references |
| Section reordering | Deferred — build with `sort_order` support, defer drag-and-drop UI | Data model ready for reordering; UI deferred to polish phase |

## 3. Data Model

### 3.1 New Table: `financial_institutions`

System-level institution directory. No `household_id` for predefined entries; optional `household_id` for custom "Other" entries scoped to a household.

```sql
CREATE TYPE institution_type AS ENUM ('bank', 'bnpl', 'digital_wallet_provider');

CREATE TABLE financial_institutions (
    id SERIAL PRIMARY KEY,
    slug TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    type institution_type NOT NULL,
    logo_url TEXT,                              -- '/institutions/cib.svg'
    bic_swift TEXT,                             -- banks only, nullable
    country TEXT NOT NULL DEFAULT 'EG',
    is_predefined BOOLEAN NOT NULL DEFAULT FALSE,
    is_popular BOOLEAN NOT NULL DEFAULT FALSE,  -- only meaningful for banks
    sort_order INT DEFAULT 0,                   -- ordering within popular section
    household_id UUID REFERENCES households(id), -- NULL = system-level, non-null = custom
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Global slug uniqueness for predefined institutions
CREATE UNIQUE INDEX uq_institution_slug
  ON financial_institutions (slug)
  WHERE household_id IS NULL AND is_active = true;

-- Household-scoped slug uniqueness for custom institutions
CREATE UNIQUE INDEX uq_custom_institution_slug
  ON financial_institutions (household_id, slug)
  WHERE household_id IS NOT NULL AND is_active = true;

-- Prevent duplicate custom names within a household (English)
CREATE UNIQUE INDEX uq_custom_institution_name_en
  ON financial_institutions (household_id, lower(name_en))
  WHERE household_id IS NOT NULL AND is_active = true;

-- Prevent duplicate custom names within a household (Arabic)
CREATE UNIQUE INDEX uq_custom_institution_name_ar
  ON financial_institutions (household_id, lower(name_ar))
  WHERE household_id IS NOT NULL AND is_active = true;
```

**Query pattern:** `WHERE is_active = true AND (household_id IS NULL OR household_id = :hid)` — mirrors predefined vs custom categories.

**RLS:** Predefined rows (household_id IS NULL) visible to all authenticated users. Custom rows scoped to their household.

### 3.2 Modified Table: `accounts`

```sql
-- Remove columns
ALTER TABLE accounts DROP COLUMN balance_minor;
ALTER TABLE accounts DROP COLUMN institution;

-- Add columns
ALTER TABLE accounts ADD COLUMN institution_id INT REFERENCES financial_institutions(id);
ALTER TABLE accounts ADD COLUMN name_ar TEXT;        -- Arabic account name (Arabic-first design)
ALTER TABLE accounts ADD COLUMN iban TEXT;           -- validated at app layer (MOD97)
ALTER TABLE accounts ADD COLUMN account_number TEXT;
ALTER TABLE accounts ADD COLUMN account_tier TEXT;
ALTER TABLE accounts ADD COLUMN branch TEXT;
```

**Institution FK constraints (enforced at application layer):**

| Account Type | institution_id | Must Reference Type |
|---|---|---|
| `bank_account` | Required | `bank` |
| `credit_card` | Required | `bank` |
| `financing_app` | Required | `bnpl` |
| `digital_wallet` | Optional | `digital_wallet_provider` |
| `cash_wallet` | Must be NULL | N/A |

Mismatch → 422 `INSTITUTION_TYPE_MISMATCH`.

**IBAN validation:**
- Full MOD97 check digit verification at application layer
- No DB-level length constraint (supports non-Egyptian IBANs in future)
- Egyptian format: `EG` + 2 check digits + 4 bank code + 4 branch code + 17 account number = 29 chars
- Only applicable to `bank_account` type
- Duplicate IBAN: soft warning (not blocking) — response includes `warnings` array

**`name_ar`:** Optional Arabic account name. Displayed when locale is Arabic; falls back to `name` (English) if not set. Consistent with Arabic-first design principle.

**All four metadata fields** (iban, account_number, account_tier, branch) are purely informational. None drive balance, transaction, or reporting logic. All are editable after creation.

### 3.3 Modified Table: `categories`

```sql
ALTER TABLE categories ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT FALSE;
```

**New system categories (seeded):**

| Name (EN) | Name (AR) | Icon | is_system | is_predefined |
|---|---|---|---|---|
| Opening Balance | رصيد افتتاحي | landmark | true | true |
| Reconciliation Adjustment | تسوية رصيد | scale | true | true |

**Existing categories updated to `is_system = true`:**

| Name | Change |
|---|---|
| Transfer | Set `is_system = true` |
| Uncategorized | Set `is_system = true` |

**Three-tier category model:**
1. **Predefined user categories** (Food, Groceries, etc.) — `is_predefined = true`, `is_system = false` — visible in picker, assignable
2. **User custom categories** — `is_predefined = false`, `is_system = false` — visible in picker, assignable
3. **System categories** (Opening Balance, Transfer, Uncategorized, Reconciliation Adjustment) — `is_system = true` — hidden from picker, system-assigned only

### 3.4 Balance Calculation

**Old formula:** `displayed_balance = balance_minor + SUM(transactions WHERE applies_to_balance = true AND date >= opened_at)`

**New formula:** `displayed_balance = SUM(transactions WHERE applies_to_balance = true AND account_id = :id AND is_active = true)`

- The `opened_at` filter is removed — the Opening Balance transaction is dated at `opened_at`, and all subsequent transactions have later dates
- `opened_at` remains on the account as informational metadata
- If a user backdates a transaction before `opened_at`, the balance reflects it (user's choice)

### 3.5 New/Updated Table: `reconciliation_records`

```sql
CREATE TABLE reconciliation_records (
    id SERIAL PRIMARY KEY,
    household_id UUID REFERENCES households(id) NOT NULL,
    account_id INT REFERENCES accounts(id) NOT NULL,
    transaction_id INT REFERENCES transactions(id),  -- nullable (delta=0 case)
    expected_balance_minor BIGINT NOT NULL,
    actual_balance_minor BIGINT NOT NULL,
    adjustment_minor BIGINT NOT NULL,                 -- redundant but useful for queries
    reconciliation_date DATE NOT NULL,                -- user-selected date
    reconciled_at TIMESTAMPTZ NOT NULL DEFAULT now(),  -- when performed
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reconciliation_account
  ON reconciliation_records (account_id, reconciled_at DESC);
```

### 3.6 Opening Balance Transaction Behavior

- Created automatically when account has a non-zero opening balance
- Category: "Opening Balance" (system category)
- Date: `opened_at` value (or today if `opened_at` not provided)
- Amount: signed (positive for bank accounts, negative for credit cards/BNPL with balance due)
- `applies_to_balance = true`
- **Editable:** amount, date, notes can be changed directly
- **Non-deletable:** while the account is active — prevents accidentally zeroing the account
- **Category non-reassignable:** changing `category_id` on an Opening Balance transaction is rejected with 422 `SYSTEM_CATEGORY_NOT_REASSIGNABLE`

### 3.7 Reconciliation Adjustment Transaction Behavior

- Created automatically when reconciliation finds a non-zero delta
- Category: "Reconciliation Adjustment" (system category)
- Amount: signed delta (positive = bank has more, negative = bank has less)
- Date: user-selected reconciliation date
- Description: auto-generated bilingual — "Reconciliation adjustment" / "تسوية رصيد"
- `applies_to_balance = true`
- **Editable:** amount, date, notes — with warning: "This transaction was created by a reconciliation. Editing it may cause a mismatch with the reconciliation record."
- **Non-deletable:** while the reconciliation record exists
- **Category non-reassignable:** same as Opening Balance

## 4. Seeded Institution Directory

### 4.1 Egyptian Banks (~25 entries, `type = 'bank'`)

| Slug | Name (EN) | Name (AR) | is_popular |
|---|---|---|---|
| nbe | National Bank of Egypt | البنك الأهلي المصري | true |
| banque-misr | Banque Misr | بنك مصر | true |
| cib | Commercial International Bank | البنك التجاري الدولي | true |
| qnb-alahli | QNB Alahli | بنك QNB الأهلي | true |
| hsbc | HSBC Egypt | إتش إس بي سي مصر | true |
| bank-of-alexandria | Bank of Alexandria | بنك الإسكندرية | true |
| aaib | Arab African International Bank | البنك العربي الأفريقي الدولي | false |
| credit-agricole | Crédit Agricole Egypt | كريدي أجريكول مصر | false |
| adib | Abu Dhabi Islamic Bank Egypt | مصرف أبوظبي الإسلامي مصر | false |
| banque-du-caire | Banque du Caire | بنك القاهرة | false |
| faisal-islamic | Faisal Islamic Bank | بنك فيصل الإسلامي | false |
| al-baraka | Al Baraka Bank Egypt | بنك البركة مصر | false |
| export-development | Export Development Bank | البنك المصري لتنمية الصادرات | false |
| egyptian-arab-land | Egyptian Arab Land Bank | البنك العقاري المصري العربي | false |
| suez-canal | Suez Canal Bank | بنك قناة السويس | false |
| housing-development | Housing and Development Bank | بنك الإسكان والتعمير | false |
| saib | Saib Bank | بنك saib | false |
| kfh-egypt | Kuwait Finance House Egypt | بيت التمويل الكويتي مصر | false |
| mashreq | Mashreq Bank Egypt | بنك المشرق مصر | false |
| emirates-nbd | Emirates NBD Egypt | بنك الإمارات دبي الوطني مصر | false |
| attijariwafa | Attijariwafa Bank Egypt | التجاري وفا بنك مصر | false |
| arab-bank | Arab Bank | البنك العربي | false |
| audi-bank | Bank Audi | بنك عودة | false |
| midb | MIDB – Misr Iran Development Bank | بنك مصر إيران للتنمية | false |
| abu-dhabi-commercial | Abu Dhabi Commercial Bank | بنك أبوظبي التجاري | false |

All predefined banks: `is_predefined = true`, `country = 'EG'`, `logo_url = '/institutions/{slug}.svg'`.

### 4.2 BNPL Providers (~11 entries, `type = 'bnpl'`)

| Slug | Name (EN) | Name (AR) |
|---|---|---|
| valu | ValU | ﭬاليو |
| souhoola | Souhoola | سهولة |
| sympl | Sympl | سيمبل |
| forsa | Forsa | فرصة |
| tru | Tru | ترو |
| khazna | Khazna | خزنة |
| mnt-halan | MNT-Halan | هالان |
| shahry | Shahry | شهري |
| contact | Contact | كونتكت |
| premium-card | Premium Card | بريميوم كارد |
| aman | Aman | أمان |

All: `is_predefined = true`, `is_popular = false`, `country = 'EG'`.

### 4.3 Digital Wallet Providers (~9 entries, `type = 'digital_wallet_provider'`)

| Slug | Name (EN) | Name (AR) |
|---|---|---|
| vodafone-cash | Vodafone Cash | فودافون كاش |
| orange-cash | Orange Cash | اورنج كاش |
| etisalat-cash | Etisalat Cash | اتصالات كاش |
| we-pay | WE Pay | وي باي |
| fawry | Fawry | فوري |
| instapay | InstaPay | انستاباي |
| bm-wallet | BM Wallet | محفظة بنك مصر |
| nbe-phone-cash | NBE Phone Cash | فون كاش الأهلي |
| cib-smart-wallet | CIB Smart Wallet | المحفظة الذكية CIB |

All: `is_predefined = true`, `is_popular = false`, `country = 'EG'`.

### 4.4 Logo Storage

- Path: `frontend/public/institutions/{slug}.svg`
- Default placeholder: `frontend/public/institutions/default.svg` (generic bank/building icon)
- All logos normalized: consistent viewBox, square aspect ratio, transparent background, optimized with SVGO
- Sourcing strategy: official bank websites → Wikipedia Commons → manual trace from high-res PNG (deferred to implementation)

## 5. API Design

### 5.1 Financial Institutions

#### `GET /api/v1/financial-institutions`

List institutions filtered by type, with optional bilingual search.

**Query params:**
- `type` (required) — `bank`, `bnpl`, `digital_wallet_provider`
- `search` (optional) — queries both `name_en` and `name_ar`, case-insensitive, diacritics-insensitive

**Response (no search):**
```json
{
  "data": {
    "popular": [
      {
        "id": 1, "slug": "nbe", "name_en": "National Bank of Egypt",
        "name_ar": "البنك الأهلي المصري", "type": "bank",
        "logo_url": "/institutions/nbe.svg", "is_predefined": true
      }
    ],
    "all": [
      { "id": 5, "slug": "aaib", "name_en": "Arab African International Bank", "..." : "..." }
    ]
  }
}
```

**Response (with search):** `popular` is empty array; `all` contains flat ranked results. The popular/all split is a browsing UX — once the user is actively searching, just show ranked results.

For `bnpl` and `digital_wallet_provider` types, `popular` is always an empty array.

#### `POST /api/v1/financial-institutions`

Create custom institution ("Other").

```json
{
  "name_en": "My Private Bank",
  "name_ar": "بنكي الخاص",
  "type": "bank"
}
```

- `slug` auto-generated from `name_en` (slugified)
- `household_id` set from auth context
- `is_predefined = false`
- `logo_url` set to `null` (frontend uses `/institutions/default.svg`)
- Returns 409 if duplicate name within household

#### `PUT /api/v1/financial-institutions/{slug}`

Edit custom institution only. Can update `name_en` and `name_ar`.

- Returns 403 if `is_predefined = true`
- **Slug is immutable** — never changes even if names change. Prevents breaking bookmarked URLs.

#### `DELETE /api/v1/financial-institutions/{slug}`

Soft delete custom institution.

- Returns 403 if `is_predefined = true`
- Returns 409 if institution has active accounts linked to it — "This institution has N active accounts. Remove or reassign them first."

### 5.2 Accounts (Modified)

#### `POST /api/v1/accounts`

```json
{
  "name": "EGP Current Account",
  "type": "bank_account",
  "currency": "EGP",
  "institution_id": 1,
  "opening_balance": 1500000,
  "opened_at": "2024-01-15",
  "iban": "EG800002000156789012345678901",
  "account_number": null,
  "account_tier": "Premier",
  "branch": "Maadi Branch",
  "credit_limit": null,
  "billing_cycle_day": null,
  "payment_due_day": null
}
```

**Validation:**
- `institution_id` required for `bank_account`, `credit_card`, `financing_app`; optional for `digital_wallet`; rejected for `cash_wallet`
- Institution type must match account type. Mismatch → 422 `INSTITUTION_TYPE_MISMATCH`
- `iban` validated with full MOD97 when provided. Invalid → 422 `INVALID_IBAN`
- `opening_balance` optional (defaults to 0). When non-zero, creates an "Opening Balance" transaction dated at `opened_at` (or today if not provided)
- For credit cards/BNPL: `opening_balance` entered as positive "amount owed", stored as negative Opening Balance transaction (form handles sign flip)
- `credit_limit`, `billing_cycle_day`, `payment_due_day` only accepted for `credit_card` and `financing_app`

**IBAN duplicate warning:** If another active account in the household has the same IBAN, response includes `warnings`:

```json
{
  "data": { "id": 1, "name": "..." },
  "warnings": [{ "code": "DUPLICATE_IBAN", "message": "Another account in this household already uses IBAN ···8901" }],
  "meta": {}
}
```

The `warnings` array pattern is reusable for other soft validations in future.

#### `PUT /api/v1/accounts/{id}`

- Can update: `name`, `name_ar`, `institution_id`, `iban`, `account_number`, `account_tier`, `branch`, `credit_limit`, `billing_cycle_day`, `payment_due_day`, `opened_at`
- Cannot change: `type`, `currency`
- `institution_id` change validated same as creation
- `iban` re-validated on change
- `opening_balance` NOT editable here — user edits the Opening Balance transaction directly

#### `GET /api/v1/accounts`

```json
{
  "data": [
    {
      "id": 1,
      "name": "EGP Current Account",
      "type": "bank_account",
      "currency": "EGP",
      "displayed_balance_minor": 2350000,
      "institution": {
        "id": 1,
        "slug": "cib",
        "name_en": "Commercial International Bank",
        "name_ar": "البنك التجاري الدولي",
        "type": "bank",
        "logo_url": "/institutions/cib.svg"
      },
      "iban_last4": "8901",
      "account_tier": "Premier",
      "credit_limit": null,
      "is_active": true,
      "opened_at": "2024-01-15"
    }
  ],
  "meta": { "total": 5, "page": 1, "page_size": 50 }
}
```

- `institution` embedded as object (avoids N+1 fetches)
- `iban_last4` returned for list views (privacy); full IBAN in `GET /api/v1/accounts/{id}`
- No `balance_minor` — only `displayed_balance_minor` (computed from transactions)

#### `GET /api/v1/accounts/{id}`

Same shape as list response but with additional fields:
- `iban` — full IBAN (not just last 4)
- `account_number`, `branch` — full values
- `opened_at`, `credit_limit`, `billing_cycle_day`, `payment_due_day` — all included
- `institution` — same embedded object as list view

### 5.3 Categories (Modified)

#### `GET /api/v1/categories`

New query param: `?assignable=true` — excludes categories where `is_system = true`. Used by frontend category picker.

Default (no param) returns all categories including system ones.

### 5.4 Transactions (Modified Guards)

#### `POST /api/v1/transactions` and `PUT /api/v1/transactions/{id}`

If `category_id` references a system category (`is_system = true`):
- 422 `SYSTEM_CATEGORY_NOT_ASSIGNABLE`: "System categories cannot be manually assigned to transactions"

#### `PUT /api/v1/transactions/{id}` on system transactions

- Opening Balance / Reconciliation Adjustment transactions: amount, date, notes editable
- `category_id` change rejected: 422 `SYSTEM_CATEGORY_NOT_REASSIGNABLE`
- Reconciliation Adjustment shows warning: "This transaction was created by a reconciliation. Editing it may cause a mismatch with the reconciliation record."

#### `DELETE /api/v1/transactions/{id}` on system transactions

- Opening Balance: 403 "Opening Balance transactions cannot be deleted while the account is active"
- Reconciliation Adjustment: 403 "Reconciliation transactions cannot be deleted while the reconciliation record exists"

### 5.5 Reconciliation (Modified)

#### `POST /api/v1/accounts/{id}/reconcile`

```json
{
  "actual_balance": 2400000,
  "reconciliation_date": "2026-03-31",
  "notes": "Matched against March 2026 statement"
}
```

- `reconciliation_date` defaults to today if omitted
- Computes `adjustment = actual_balance - displayed_balance`
- If adjustment = 0: returns 200 `{ "data": { "status": "balanced", "adjustment": 0 } }`
- If adjustment ≠ 0: creates Reconciliation Adjustment transaction + reconciliation record, returns 201 with both objects

### 5.6 Institution Detail

#### `GET /api/v1/financial-institutions/{slug}/summary`

```json
{
  "data": {
    "institution": {
      "id": 1, "slug": "cib", "name_en": "...", "name_ar": "...",
      "type": "bank", "logo_url": "/institutions/cib.svg"
    },
    "accounts": [
      { "id": 1, "name": "EGP Current", "type": "bank_account", "currency": "EGP", "displayed_balance_minor": 2350000 }
    ],
    "summary": {
      "total_assets_minor": 2350000,
      "total_liabilities_minor": 450000,
      "total_base_minor": 1900000,
      "base_currency": "EGP",
      "is_approximate": false,
      "account_count": 2
    }
  }
}
```

- `is_approximate = true` when accounts span multiple currencies (triggers `≈` prefix on frontend)

## 6. Frontend Design

### 6.1 Accounts Page Layout

**Section ordering (default):**
1. Net worth hero card (pinned at top, not reorderable)
2. Per-bank grouped sections (bank_account + credit_card grouped under institution)
3. Financing Apps section (BNPL accounts with provider logos on each card)
4. Digital Wallets section (with provider logos if linked)
5. Cash Wallets section (simple cards, no institution branding)

**Bank group section:**
- **Header:** Bank logo (32-40px) + bank name (locale-aware) + account count + total balance
  - Single-currency bank: exact total, green/red based on net
  - Multi-currency bank: `≈` prefix + converted total in household base currency + "multi-currency" label in amber
- **Collapsible:** default expanded, user preference remembered
- **Cards within group:** account name, balance + currency, account tier badge (if set), IBAN last 4 (if set), utilization bar (credit cards only). No bank logo — header provides context.
- **Clickable header:** navigates to bank detail page (`/accounts/bank/[slug]`)

**Credit card and BNPL cards show:**
- Balance owed (primary, red)
- Limit + Available (secondary text, muted)
- Available amount color-coded: green <50% utilization, amber 50-80%, red >80%
- Utilization bar + percentage

**Independent section headers** (Financing Apps, Digital Wallets, Cash Wallets):
- Section name + total balance aligned right
- Total uses same ≈ logic for multi-currency (unlikely but consistent)

**Card widths:**
- Bank-grouped cards: 3-column grid
- Independent sections with ≥3 cards: 3-column grid
- Independent sections with 1-2 cards: 2-column grid (half-width)
- Mobile: all full-width

**FAB:** present on accounts page — opens account creation dialog. See §6.5 for FAB as a project-wide pattern.

### 6.2 Bank Detail Page

**Route:** `/accounts/bank/[slug]`

**Layout:**
- Back navigation link to accounts page
- Bank header: larger logo (56px), bank name (both English + Arabic), account count
- Summary stats: 4 cards — Total Deposits, Total Credit Used, Available Credit, Net Position
  - Multi-currency banks show `≈` + "multi-currency" on Total Deposits and Net Position
- Account list: 3-column grid of clickable account cards
  - Each card shows: account type label (uppercase subtle, e.g., "CURRENT ACCOUNT"), account name, balance, IBAN last 4, opened date
  - Credit cards show limit + available + utilization bar
- FAB: opens account creation dialog with institution pre-selected to current bank

### 6.3 Institution Selector Component

Reusable combobox component filtered by institution type. Used in account creation and edit forms.

**Behavior by account type:**
- `bank_account` / `credit_card` → filter `type=bank`, label "BANK", Popular section (6 pinned) + All Banks + "Other"
- `financing_app` → filter `type=bnpl`, label "PROVIDER", no Popular section, flat alphabetical + "Other"
- `digital_wallet` → filter `type=digital_wallet_provider`, label "WALLET PROVIDER", no Popular section, flat alphabetical + "Other"
- `cash_wallet` → institution selector hidden

**Display:** follows active locale (name_ar for Arabic, name_en for English).

**Search:** always queries both `name_ar` and `name_en` regardless of locale. Case-insensitive, diacritics-insensitive. When search is active, popular/all split disappears — flat ranked results shown.

**"Other" selected:** reveals inline required fields for English name and Arabic name. Creates custom institution via `POST /api/v1/financial-institutions`.

**Pre-selected state:** when opened from bank detail page FAB, institution is pre-filled with logo + name and "Change" link.

### 6.4 Account Creation Flow

**Form fields by account type:**

| Field | bank_account | credit_card | financing_app | digital_wallet | cash_wallet |
|---|---|---|---|---|---|
| Account Type | Required | Required | Required | Required | Required |
| Institution | Required (bank) | Required (bank) | Required (bnpl) | Optional (dwp) | Hidden |
| Account Name | Required | Required | Required | Required | Required |
| Currency | Required | Required | Required | Required | Required |
| Opening Balance | Optional | Optional ("Balance Due") | Optional ("Balance Due") | Optional | Optional |
| Opened At | Optional | Optional | Optional | Optional | Optional |
| Credit Limit | Hidden | Shown | Shown | Hidden | Hidden |
| Billing Cycle Day | Hidden | Shown | Shown | Hidden | Hidden |
| Payment Due Day | Hidden | Shown | Shown | Hidden | Hidden |
| IBAN | Optional (in Additional Details) | Hidden | Hidden | Hidden | Hidden |
| Account Number | Optional (in Additional Details) | Optional | Hidden | Hidden | Hidden |
| Account Tier | Optional (in Additional Details) | Optional | Hidden | Hidden | Hidden |
| Branch | Optional (in Additional Details) | Optional | Hidden | Hidden | Hidden |

**Label:** "ACCOUNT NAME" consistently across all types.

**Additional Details:** collapsible section, collapsed by default. Contains IBAN, account number, tier, branch (visibility per the matrix above).

**Credit card/BNPL:** credit-specific fields grouped in a visually distinct container with colored header.

**Type change behavior:** changing Account Type resets type-specific fields (credit limit, billing/due days) and resets `institution_id` if the institution type changes (bank → bnpl).

**Opening balance for credit cards/BNPL:** entered as positive "amount owed", stored as negative Opening Balance transaction. Form handles the sign flip. Hint text: "Amount you currently owe. Creates a negative Opening Balance transaction."

### 6.5 FAB (Floating Action Button) — Project-Wide Pattern

The FAB is a cross-cutting reusable component used on every list/grid page in Masareef:

- **Pages:** Accounts → add account, Account Detail → add transaction, Debts → add loan, Transfers → add transfer, Gam3eya → add gam3eya, Bank Detail → add account (pre-selected institution)
- **Position:** fixed bottom-right using `inset-inline-end` for RTL support, above bottom navigation bar on mobile
- **Behavior:** hides on scroll-down, reappears on scroll-up (standard Material-style)
- **One reusable component** — shared across all pages, not implemented per-page with different styles
- **Should be documented** in design tokens or UI patterns guide as a project-wide convention

### 6.6 System Transaction Visual Styling

Opening Balance and Reconciliation Adjustment transactions need visual distinction from regular transactions in the transaction list:

- **Muted background:** subtle background tint or left-border accent to distinguish from user-created transactions
- **System icon badge:** small system/gear icon overlay or inline badge next to the description
- **Category chip:** "Opening Balance" / "Reconciliation Adjustment" rendered in a distinct color (e.g., slate/neutral palette) separate from the user category color palette
- **Description styling:** auto-generated descriptions ("Opening balance" / "Reconciliation adjustment") shown in a slightly different style (e.g., italic or muted weight)
- **Action buttons:** edit shows the appropriate warning for reconciliation transactions; delete is disabled with tooltip explaining why (per §5.4 guards)
- **Non-reassignable indicator:** category chip is not clickable/editable on system transactions (no category picker on hover/click)

### 6.7 IBAN Structure Reference

Egyptian IBAN format (29 characters total):

| Position | Length | Content |
|---|---|---|
| 1-2 | 2 | Country code: `EG` |
| 3-4 | 2 | Check digits (MOD97 — ISO 7064) |
| 5-8 | 4 | Bank code |
| 9-12 | 4 | Branch code |
| 13-29 | 17 | Account number |

Validation at application layer using `python-stdnum` (backend) and a lightweight JS validator (frontend). No DB-level length constraint — supports non-Egyptian IBANs if MENA expansion happens.

## 7. Reconciliation Flow

1. User clicks "Reconcile" on an account
2. System shows current displayed balance (read-only) and input for "Actual bank balance"
3. Date field defaults to today, user can change (e.g., reconciling against last month's statement)
4. System computes: `adjustment = actual_balance - current_displayed_balance`
5. If delta = 0: success message "Balance matches!" — no transaction, no record
6. If delta ≠ 0: creates both:
   - **Adjustment transaction:** Reconciliation Adjustment category, signed delta, user-selected date, auto-generated description
   - **Reconciliation record:** expected_balance, actual_balance, adjustment, reconciliation_date, reconciled_at, notes, links to transaction

**Edit/delete guards on reconciliation transactions:** editable (with warning), non-deletable while record exists, category non-reassignable.

## 8. Deferred Items (→ BACKLOG.md)

| ID | Item | Category | Target Phase |
|---|---|---|---|
| TBD | Bank detail page: cross-account insights (option B) | feature | Phase 12 |
| TBD | Bank detail page: full relationship dashboard (option C) | feature | Phase 12 |
| TBD | Drag-and-drop section reordering on accounts page | feature | Polish phase |
| TBD | >80% utilization red example in design reference | docs | Next implementation |
| TBD | Digital wallet optional institution linking UI | feature | Future |
| TBD | Branch field as dropdown from bank's branch list | feature | Future |

## 9. Competitor Research Findings

Research completed independently. Key findings that informed the design:

### Account Grouping & Bank Logos

- **YNAB:** Flat list, no bank grouping. Category-centric model. Accounts are just containers — no institutional relationship.
- **Wallet by BudgetBakers:** 15,000+ bank logos via third-party API. Prominent logo display on account cards. Supports group sharing. Closest to our visual direction for logos on cards.
- **Bluecoins:** Hierarchical Assets/Liabilities model with account groups as an organizational layer. Users manually create groups — no auto-grouping by bank.
- **Firefly III:** Separate `institutions` table with FK from accounts. Closest data model to our design. Open-source, well-documented schema.
- **Money Lover:** Flat wallet list. No institutional grouping. Minimal metadata per account.

### Opening Balance as Transaction

Industry consensus: **opening balance as a special transaction** is the standard approach.
- YNAB, Firefly III, GnuCash, hledger all use this pattern
- Creates a self-documenting ledger where every balance change is traceable
- Our design aligns with established best practice

### Logo Sourcing Alternatives

- **Bundled SVGs** (our choice): best for offline, performance, and quality control
- **Brandfetch API:** 500K free requests/month. Extensive logo database. Viable fallback if manual sourcing is insufficient.
- **Logo.dev** (Clearbit successor): similar API-based approach. Good quality but external dependency.
- Decision: bundle SVGs for the ~45 seeded institutions. Consider API-based sourcing only for a future "auto-detect bank from IBAN bank code" feature.

### Egyptian Banking Market

- **36 CBE-licensed banks** operating in Egypt (Central Bank of Egypt registry)
- Our seed list covers ~25 of the most commonly used — sufficient for launch
- IBAN is 29 chars: EG + 2 check digits + 4 bank code + 4 branch code + 17 account number
- **Ahli United Bank rebranded to KFH (Kuwait Finance House) Egypt in 2025** — seed data updated to reflect this

### Design Patterns Adopted

| Pattern | Source | How We Applied It |
|---|---|---|
| Institution FK from accounts | Firefly III | `financial_institutions` table with type discriminator |
| Opening balance as transaction | YNAB, GnuCash, hledger | System "Opening Balance" category, auto-created on account creation |
| Bank logos on cards | Wallet by BudgetBakers | Logos on bank group headers + independent cards (BNPL/wallet) |
| Searchable bank selector | Banking apps generally | Combobox with bilingual search, popular pinning, "Other" escape hatch |
| Hierarchical grouping | Bluecoins (manual) | Automatic grouping by institution FK (not manual) |

## 10. Implementation Plan

Eight units following the Plan → Execute → Review → UAT → Merge workflow. Dependencies flow top-down.

### Unit 1: Data Model + Migrations + Seed Data

**Scope:**
- Create `financial_institutions` table with all indexes and constraints
- Add `is_system` column to `categories` table
- Modify `accounts` table: drop `balance_minor` and `institution`, add `institution_id`, `name_ar`, `iban`, `account_number`, `account_tier`, `branch`
- Create/update `reconciliation_records` table
- Seed ~25 Egyptian banks, ~11 BNPL providers, ~9 digital wallet providers
- Seed system categories: Opening Balance, Reconciliation Adjustment
- Update existing Transfer and Uncategorized categories to `is_system = true`

**Dependencies:** None — foundational unit.

### Unit 2: Backend API — Financial Institutions Endpoints

**Scope:**
- `GET /api/v1/financial-institutions` with type filtering, bilingual search, popular/all response structure
- `POST /api/v1/financial-institutions` for custom institution creation with household scoping
- `PUT /api/v1/financial-institutions/{slug}` for custom institution editing (slug immutable)
- `DELETE /api/v1/financial-institutions/{slug}` with active-account guard
- SQLAlchemy model, Pydantic schemas, service layer, router

**Dependencies:** Unit 1 (tables must exist).

### Unit 3: Backend API — Accounts + Reconciliation Changes

**Scope:**
- Modified account CRUD with `institution_id` FK validation (type matching)
- IBAN validation with MOD97 (python-stdnum)
- `warnings` array in success response envelope for IBAN duplicate detection
- Opening Balance transaction auto-creation on account create
- Balance calculation updated: `SUM(transactions)` only, no `balance_minor`
- Reconciliation flow creating Reconciliation Adjustment transaction + record
- System transaction guards: delete protection, edit with warning, category non-reassignable
- `GET /api/v1/categories?assignable=true` filtering
- `POST/PUT /api/v1/transactions` rejecting system category assignment

**Dependencies:** Unit 1 (schema), Unit 2 (institution endpoints for FK validation).

### Unit 4: Frontend — Institution Selector Component

**Scope:**
- Reusable `InstitutionSelector` combobox component
- Logo display, bilingual search (queries both `name_en` and `name_ar`)
- Popular section pinning for banks, flat list for BNPL/digital wallet providers
- "Other" inline form flow (English + Arabic name fields)
- Type-filtered behavior driven by account type
- Label changes: "BANK" / "PROVIDER" / "WALLET PROVIDER"
- Pre-selected state with "Change" link

**Dependencies:** Unit 2 (institution API endpoints).

### Unit 5: Frontend — Account Creation Flow

**Scope:**
- Updated `CreateAccountDialog` with institution selector integration
- New metadata fields: IBAN (with three validation states), account number, tier, branch
- Progressive disclosure: "Additional Details" collapsible section
- Credit card/BNPL sign-flip handling for opening balance
- Field visibility matrix by account type (show/hide based on type selection)
- Type-change reset behavior (clear type-specific fields, reset institution_id)
- IBAN validation UI: neutral, invalid (red), duplicate warning (amber)

**Dependencies:** Unit 3 (account API changes), Unit 4 (institution selector component).

### Unit 6: Frontend — Accounts Page Redesign

**Scope:**
- Replace type-based `AccountGrid` with institution-grouped layout
- Bank group sections: collapsible headers with logo, name, total, account count
- Multi-currency `≈` logic on group totals
- Credit card/BNPL cards: limit + available amount + color-coded utilization
- Independent sections (Financing Apps, Digital Wallets, Cash Wallets) with totals
- Section ordering: bank groups → BNPL → digital wallets → cash wallets
- Half-width (2-column grid) for sections with 1-2 cards
- System transaction visual styling in transaction lists
- FAB integration

**Dependencies:** Unit 3 (updated account API response with embedded institution), Unit 4 (institution selector for any inline creation).

### Unit 7: Frontend — Bank Detail Page

**Scope:**
- New route: `/accounts/bank/[slug]`
- Bank header with larger logo (56px), both English + Arabic names
- Summary stat cards: Total Deposits, Total Credit Used, Available Credit, Net Position
- Account list with type labels, IBAN last 4, opened date
- FAB with pre-selected institution
- Back navigation to accounts page

**Dependencies:** Unit 3 (institution summary API endpoint), Unit 6 (shared card components).

### Unit 8: Logo Collection + SVG Optimization

**Scope:**
- Source SVG logos for all ~45 seeded institutions (banks + BNPL + digital wallets)
- Normalize: consistent viewBox, square aspect ratio, transparent background
- Optimize with SVGO
- Create default placeholder SVG (`/institutions/default.svg`)
- Store in `frontend/public/institutions/`

**Dependencies:** None — can run in parallel with any unit. Should complete before Unit 6/7 for visual testing.

### Unit Dependency Graph

```
Unit 1 (Data Model)
  ├── Unit 2 (Institution API)
  │     ├── Unit 4 (Institution Selector)
  │     │     └── Unit 5 (Account Creation)
  │     └── Unit 3 (Account API)
  │           ├── Unit 5 (Account Creation)
  │           ├── Unit 6 (Accounts Page)
  │           │     └── Unit 7 (Bank Detail)
  │           └── Unit 7 (Bank Detail)
  └── Unit 3 (Account API)

Unit 8 (Logos) — parallel, no dependencies
```
