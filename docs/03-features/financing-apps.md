# Feature: Egyptian Financing Apps (BNPL)

## Purpose
Egypt has a booming Buy Now Pay Later (BNPL) and consumer financing ecosystem. Apps like ValU, Souhoola, Sympl, Forsa, Tru, Shahry, and Fawry provide installment financing for purchases — often without needing a bank account or credit card. Many Egyptians juggle 2-3 financing apps simultaneously. Masareef tracks these as a first-class account type with dedicated installment management.

## Egyptian BNPL Landscape

### Major Apps

| App | Arabic | Focus | Typical Terms | Notes |
|-----|--------|-------|---------------|-------|
| **ValU** (ڤاليو) | ڤاليو | Largest BNPL — 6,000+ stores, 1,500+ online merchants | Up to 60 months, credit limits vary | By EFG Hermes. Also has Sha2labaz (invoice financing), Flip (transfers), Akeed (savings) |
| **Souhoola** (سهولة) | سهولة | BNPL for electronics, furniture, education | 6-36 months | Leading BNPL platform |
| **Sympl** (سيمبل) | سيمبل | BNPL "Save Now, Pay Sympl" | 3-12 months | Online and retail |
| **Forsa** (فرصة) | فرصة | Consumer financing | 6-24 months | Credit limit based |
| **Tru** (تروو) | تروو | Digital financing | 3-18 months | Newer entrant |
| **Shahry** (شهري) | شهري | BNPL for online and offline | 3-12 months | Monthly payment focus |
| **Fawry** (فوري) | فوري | Payments platform + financing | Varies | Primarily bill payments, expanded into BNPL |
| **Halan / MNT-Halan** | هالان | Super-app with lending + BNPL | Varies | Ride-hailing + payments + lending |
| **Contact Financial** (كونتكت) | كونتكت | Traditional consumer finance | Up to 60 months | One of the oldest — auto, consumer, mortgage |
| **Kliver** | كليڤر | Consumer financing | Varies | Installment financing |

### How They Work
1. User downloads app, registers with national ID
2. Gets approved for a **credit limit** (varies: 5K–500K+ EGP depending on app and profile)
3. Shops at partner merchant (physical store via QR code or online checkout)
4. Selects installment plan at checkout (3, 6, 12, 18, 24, up to 60 months)
5. Some plans are 0% interest (merchant subsidized), others carry fees/interest
6. Monthly installments paid via app, bank transfer, or Fawry kiosk
7. Regulated by Egypt's Financial Regulatory Authority (FRA), not Central Bank

### Key Differences from Credit Card Installments
| Aspect | CC Installments | Financing App |
|--------|----------------|---------------|
| Requires bank account | Yes | No |
| Requires credit card | Yes | No |
| Target users | Banked population | Everyone including underbanked |
| Approval | Bank credit check | App-based, lighter requirements |
| Interest model | Usually 0% (bank subsidized) | Mixed — 0% on promos, fees on others |
| Statement access | Bank PDF/CSV | In-app only, no export |
| Credit limit source | Bank credit limit | Per-app credit limit |
| Regulation | Central Bank of Egypt | Financial Regulatory Authority |

### Why This Matters for Masareef
- Many users have **2-3 financing apps active simultaneously**
- Combined monthly obligations across apps can be significant
- No way to see **total financing exposure** in one place
- These apps provide no export — users must track manually
- Installments from financing apps **don't appear in bank statements** (only the repayment deductions might)

## Account Type: `financing_app`

A new account type alongside `bank_account`, `credit_card`, `cash_wallet`, `digital_wallet`.

### Account Fields
| Field | Type | Notes |
|-------|------|-------|
| name | TEXT | e.g., "ValU", "Souhoola Personal" |
| type | `financing_app` | New enum value |
| currency | TEXT | Usually EGP |
| institution | TEXT | App name: "ValU", "Souhoola", "Sympl", etc. |
| credit_limit | BIGINT | Approved credit limit in minor units |
| balance | BIGINT | Negative = amount currently owed (same as credit cards) |
| billing_cycle_day | INT | Optional — day of month statement/billing cycle closes |
| payment_due_day | INT | Optional — day of month payment is due (often same as billing_cycle_day for BNPL apps) |

### Display Logic
Same as credit cards:
- Balance stored as **negative integer** (owed amount)
- Available limit = `credit_limit + balance`
- Utilization = `abs(balance) / credit_limit × 100`

### Installment Plans
Purchases through financing apps create installment plans — reusing the existing `installment_plans` table with a new type:

```
installment_type ENUM: 'credit_card', 'store', 'financing_app'
```

Each purchase = one installment plan linked to the financing app account:
- `type = "financing_app"`
- `source_account_id` → the financing app account this plan is charged to (FK to accounts)
- `merchant_name` — where the purchase was made
- `total_amount_minor`, `monthly_amount_minor`, `total_months`, `start_month`

### Aggregate View
Dashboard and debts page show:
- **Per-app summary:** credit limit, used, available, utilization %, active plan count
- **Cross-app total:** total monthly commitment across ALL financing apps
- **Upcoming payments:** next payment date and amount per app

## Predefined Financing App List

When creating a `financing_app` account, the user selects from a predefined list (or enters custom):

```json
{
  "financing_apps": [
    { "id": "valu", "name": "ValU", "name_ar": "ڤاليو", "icon": "valu" },
    { "id": "souhoola", "name": "Souhoola", "name_ar": "سهولة", "icon": "souhoola" },
    { "id": "sympl", "name": "Sympl", "name_ar": "سيمبل", "icon": "sympl" },
    { "id": "forsa", "name": "Forsa", "name_ar": "فرصة", "icon": "forsa" },
    { "id": "tru", "name": "Tru", "name_ar": "تروو", "icon": "tru" },
    { "id": "shahry", "name": "Shahry", "name_ar": "شهري", "icon": "shahry" },
    { "id": "fawry", "name": "Fawry Finance", "name_ar": "فوري", "icon": "fawry" },
    { "id": "halan", "name": "Halan", "name_ar": "هالان", "icon": "halan" },
    { "id": "contact", "name": "Contact Financial", "name_ar": "كونتكت", "icon": "contact" },
    { "id": "kliver", "name": "Kliver", "name_ar": "كليڤر", "icon": "kliver" },
    { "id": "other", "name": "Other", "name_ar": "أخرى", "icon": "wallet" }
  ]
}
```

This list is config-driven — new apps added without code changes.

## UI: Financing Apps Tab on Debts Page

The debts page gains a **5th tab**: Loans | Card Installments | **Financing Apps** | Store Installments | P2P

### Tab Content
- **Per-app summary cards** (horizontal row, similar to CC installments utilization gauges):
  - App name + logo/icon
  - Credit limit: 50,000 EGP
  - Used: 35,000 EGP
  - Available: 15,000 EGP
  - Utilization: 70% (circular gauge, amber)
  - Active plans: 3
  - Monthly commitment: 2,917 EGP

- **Installment plans grouped by app** (same pattern as CC installments):
  - Under "ValU — 2 active plans":
    - "iPhone 16 Pro" | B.TECH | 18,000 EGP | 1,500/month | 12 months | 4/12 paid
    - "Washing Machine" | B.TECH | 12,000 EGP | 1,000/month | 12 months | 6/12 paid
  - Under "Souhoola — 1 active plan":
    - "Air Conditioner" | Samsung Store | 15,000 EGP | 1,250/month | 12 months | 2/12 paid

- **Total financing commitment** (bottom summary card):
  - Total monthly across all financing apps: 3,750 EGP/month
  - Total remaining across all apps: 29,000 EGP

## UI Reference Designs

| Screen | HTML Reference | Stitch Prompt |
|--------|---------------|---------------|
| Financing Apps | [10d-financing-apps.html](../stitch-designs/html/10d-financing-apps.html) | [10d-debts-financing-apps.md](../stitch-prompts/10d-debts-financing-apps.md) |

> These are layout references, not pixel-perfect specs. See [design-tokens.md](../guides/09-design-tokens.md) for canonical colors, fonts, and spacing.

## API Endpoints

### `GET /api/v1/financing-apps/summary`
Summary of all financing app accounts with utilization.

**Response:**
```json
{
  "data": {
    "apps": [
      {
        "account_id": 8,
        "name": "ValU",
        "name_ar": "ڤاليو",
        "credit_limit_minor": 5000000,
        "balance_minor": -3500000,
        "available_minor": 1500000,
        "utilization_percent": 70,
        "active_plans_count": 2,
        "monthly_commitment_minor": 250000
      }
    ],
    "totals": {
      "total_limit_minor": 12000000,
      "total_used_minor": 5000000,
      "total_available_minor": 7000000,
      "total_monthly_minor": 375000,
      "total_remaining_minor": 2900000
    }
  }
}
```

### Other endpoints
Financing app installments use the existing installment plan endpoints (`/api/v1/installments`) with `type = "financing_app"`. No separate CRUD needed — the installment system is reused.

## Integration Points

| System | How Financing Apps Integrate |
|--------|----------------------------|
| **Dashboard** | Financing app balances included in liabilities and net worth |
| **Forecasting** | Monthly installment payments appear in cash flow projection |
| **Debts page** | 5th tab with per-app utilization and grouped plans |
| **Notifications** | Payment reminders for financing app installments |
| **Reports** | Debt summary includes financing app section |

## Acceptance Criteria
- [ ] `financing_app` account type works with create/edit/delete
- [ ] Predefined app list shown as selector when creating financing_app account
- [ ] Custom "Other" option allows manual entry
- [ ] Balance displayed as negative (owed), available = limit + balance
- [ ] Utilization gauge per app (green < 50%, amber 50-80%, red > 80%)
- [ ] Installment plans linkable to financing_app accounts via `type = "financing_app"`
- [ ] Per-app grouping on debts page (same pattern as CC installments)
- [ ] Cross-app total monthly commitment calculated correctly
- [ ] Financing app balances included in net worth as liabilities
- [ ] Financing app installments appear in 12-month cash flow forecast
- [ ] Payment reminders work for financing app installments
- [ ] Arabic app names display correctly in RTL
- [ ] Predefined app list is config-driven — new apps added without code changes
