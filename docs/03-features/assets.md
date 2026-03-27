# Feature: Asset Management

## Purpose
Tracks physical and financial assets that make up a user's wealth beyond bank account balances: real estate, gold, silver, vehicles, savings certificates (شهادات), and other valuables. Any transaction can be linked to an asset, enabling true cost of ownership tracking. Assets are included in net worth calculations alongside accounts and debts.

## Why This Matters for MENA Users

Egyptian and MENA users store significant wealth outside the banking system:
- **Gold** — culturally the primary inflation hedge. 21K gold is the standard in Egypt. Tracked by gram.
- **Real estate** — apartments, land, commercial property. Often the largest single asset.
- **Savings certificates** — Egyptian bank CDs offering 25%+ interest during high-inflation periods. Fixed term, guaranteed return.
- **Vehicles** — depreciating asset but high purchase cost with ongoing maintenance, insurance, fuel.

Without asset tracking, net worth calculations are incomplete and misleading.

## Asset Types

| Type | Value Trend | Auto-Price | Quantity Unit | Typical Linked Transactions |
|------|-------------|-----------|---------------|---------------------------|
| `real_estate` | Appreciates | No (manual) | sqm or unit | Purchase, maintenance, property tax, insurance, rental income |
| `gold` | Fluctuates | Yes (API) | gram or ounce | Purchase, sale |
| `silver` | Fluctuates | Yes (API) | gram or ounce | Purchase, sale |
| `vehicle` | Depreciates | No (manual) | unit | Purchase, fuel, insurance, maintenance, repair, registration |
| `savings_certificate` | Fixed return | No (calculated) | unit | Purchase (principal), interest income |
| `other` | Varies | No (manual) | unit | Any |

## Behavior

### Asset Creation
User provides:
- Name (e.g., "Apartment in Maadi", "21K Gold Chain", "Hyundai Tucson 2024")
- Type, currency, purchase price, purchase date
- Quantity + unit (e.g., 15 grams of gold, 120 sqm apartment)
- Current value (manual entry or auto-fetched for gold/silver)
- Optional: linked account (purchased from), location (real estate), notes

### Transaction Linking
Any transaction can be linked to an asset via `transactions.asset_id`:
- **At creation:** user selects an asset when creating a transaction
- **Retroactively:** user links an existing transaction to an asset
- **Category hint:** linked transactions are implicitly categorized (fuel → vehicle, maintenance → real estate) but category remains editable

Transaction types commonly linked:

| Transaction | Asset Type | Direction |
|-------------|-----------|-----------|
| Purchase payment | Any | Debit (money out) |
| Down payment | Real estate, vehicle | Debit |
| Maintenance / repair | Real estate, vehicle | Debit |
| Insurance premium | Real estate, vehicle | Debit |
| Property tax | Real estate | Debit |
| Fuel | Vehicle | Debit |
| Registration / fees | Vehicle | Debit |
| Rental income | Real estate | Credit (money in) |
| Sale proceeds | Any | Credit |
| Interest payment | Savings certificate | Credit |

### Cost of Ownership vs. Operating Cost
Linked transactions are classified into two buckets:

**Ownership cost** — capital expenditure that affects the asset's total investment:
- Purchase, down payment, sale (negative ownership cost)
- Insurance, registration/fees, property tax
- Major repairs (e.g., engine replacement, roof repair)

**Operating cost** — recurring running expenses excluded from ROI:
- Fuel, regular maintenance, tolls, parking
- Routine upkeep (cleaning, gardening for real estate)

Classification is based on the transaction's category. The system maps categories to cost type:

| Category | Cost Type | Rationale |
|----------|-----------|-----------|
| Purchase / down payment | Ownership | Capital invested |
| Insurance | Operating | Recurring running cost |
| Property tax / registration | Ownership | Mandatory cost of holding the asset |
| Major repair | Ownership | Restores or preserves asset value |
| Sale proceeds | Ownership (credit) | Capital returned |
| Rental income | Ownership (credit) | Return on asset |
| Fuel | Operating | Recurring running cost |
| Regular maintenance | Operating | Recurring running cost |
| Interest income (certificates) | Ownership (credit) | Return on asset |

> Users can override the classification per transaction if the default mapping is wrong.

**Formulas:**
```
Ownership cost = purchase_price + SUM(ownership debits)
Ownership income = SUM(ownership credits)  — rental, sale, interest
Net ownership = ownership_cost - ownership_income
ROI = (current_value - net_ownership) / net_ownership × 100

Operating cost = SUM(operating debits)  — fuel, maintenance, etc.
Operating cost/month = operating_cost / months_since_purchase
```

**Example — Vehicle:**
```
OWNERSHIP:
  Purchase:         1,200,000 EGP
  Registration:         8,000 EGP
  ────────────────────────────
  Total ownership:  1,208,000 EGP
  Current value:      900,000 EGP
  Net position:      -308,000 EGP (depreciation)

OPERATING:
  Fuel (2yr):         180,000 EGP
  Insurance (2yr):     24,000 EGP
  Maintenance (2yr):   35,000 EGP
  ────────────────────────────
  Total operating:    239,000 EGP
  Operating/month:      9,958 EGP
```

**Example — Gold:**
```
OWNERSHIP:
  Purchase: 50,000 EGP (15g at 3,333 EGP/g in 2024)
  Current value: 75,000 EGP (15g at 5,000 EGP/g in 2026)
  Net position: +25,000 EGP (+50% gain)

OPERATING: 0 EGP (no running costs)
```

### Value Tracking

**Manual valuation:** User updates `current_value_minor` at any time. Each update is logged in `asset_value_history` for charting.

**Auto-fetch (gold/silver):** System fetches commodity prices from API and updates value based on quantity.
- Gold price API: OpenExchangeRates metals endpoint (included with OXR subscription, returns XAU/XAG rates in the same `latest.json` response). If household has no OXR API key or OXR plan doesn't include metals, fall back to manual valuation only. A dedicated metals API (e.g., metals.dev, goldapi.io) can be added as a future alternative if OXR coverage proves insufficient.
- Stores price per gram/ounce → multiplies by asset quantity
- Updates `current_value_minor` and logs to `asset_value_history`
- User can override auto-fetched value

**Savings certificates:** Value = principal × (1 + annual_rate × elapsed_months / 12). Or user enters maturity value manually.

### Net Worth Integration
Assets are included in the net worth calculation:
```
Net Worth = Account Balances + Asset Values - Debt Remaining
```

Dashboard shows assets as a separate segment in the net worth breakdown.

## UI Reference Designs

| Screen | HTML Reference | Stitch Prompt |
|--------|---------------|---------------|
| Assets | [13-assets.html](../stitch-designs/html/13-assets.html) | [13-assets.md](../stitch-prompts/13-assets.md) |
| Asset Detail | [14-asset-detail.html](../stitch-designs/html/14-asset-detail.html) | [14-asset-detail.md](../stitch-prompts/14-asset-detail.md) |

> These are layout references, not pixel-perfect specs. See [design-tokens.md](../guides/09-design-tokens.md) for canonical colors, fonts, and spacing.

## API Endpoints

### `GET /api/v1/assets`
List all assets for the household with current values and cost summaries.

**Query params:** `type` (filter by asset_type), `active_only` (default true)

**Response:**
```json
{
  "data": {
    "assets": [
      {
        "id": 1,
        "name": "Apartment Maadi",
        "type": "real_estate",
        "currency": "EGP",
        "purchase_price_minor": 250000000,
        "current_value_minor": 350000000,
        "purchase_date": "2022-06-15",
        "quantity": 120,
        "unit": "sqm",
        "location": "Maadi, Cairo",
        "ownership_cost_minor": 258000000,
        "ownership_income_minor": 72000000,
        "net_ownership_minor": 186000000,
        "operating_cost_minor": 10000000,
        "operating_cost_per_month": 277000,
        "roi_percent": 88.2,
        "value_change_percent": 40.0,
        "linked_transactions_count": 24
      },
      {
        "id": 2,
        "name": "21K Gold",
        "type": "gold",
        "currency": "EGP",
        "purchase_price_minor": 5000000,
        "current_value_minor": 7500000,
        "quantity": 15.0,
        "unit": "gram",
        "ownership_cost_minor": 5000000,
        "ownership_income_minor": 0,
        "net_ownership_minor": 5000000,
        "operating_cost_minor": 0,
        "operating_cost_per_month": 0,
        "roi_percent": 50.0,
        "value_change_percent": 50.0,
        "linked_transactions_count": 1
      }
    ],
    "totals": {
      "total_value_in_base": 425000000,
      "total_cost_in_base": 273000000,
      "base_currency": "EGP"
    }
  },
  "meta": {
    "total": 3,
    "page": 1,
    "page_size": 50
  }
}
```

### `GET /api/v1/assets/{id}`
Single asset with full details, value history, and linked transactions.

**Response:**
```json
{
  "data": {
    "asset": { "..." : "..." },
    "value_history": [
      { "date": "2022-06-15", "value_minor": 250000000, "source": "manual" },
      { "date": "2023-06-01", "value_minor": 300000000, "source": "manual" },
      { "date": "2026-03-20", "value_minor": 350000000, "source": "manual" }
    ],
    "linked_transactions": {
      "data": [ "..." ],
      "meta": {
        "total": 24,
        "page": 1,
        "page_size": 50
      }
    },
    "ownership_breakdown": {
      "purchase": 250000000,
      "insurance": 5000000,
      "tax": 3000000,
      "total_ownership": 258000000,
      "rental_income": 72000000,
      "net_ownership": 186000000,
      "roi_percent": 88.2
    },
    "operating_breakdown": {
      "maintenance": 6000000,
      "regular_upkeep": 4000000,
      "total_operating": 10000000,
      "operating_per_month": 277000,
      "months_tracked": 36
    }
  }
}
```

### `POST /api/v1/assets`
Create a new asset.

**Request:**
```json
{
  "name": "21K Gold Chain",
  "type": "gold",
  "currency": "EGP",
  "purchase_price_minor": 5000000,
  "current_value_minor": 5000000,
  "purchase_date": "2024-11-10",
  "quantity": 15.0,
  "unit": "gram",
  "linked_account_id": 1,
  "notes": "Purchased from Shubra Gold Market"
}
```

### `PUT /api/v1/assets/{id}`
Update asset details (name, notes, location, quantity).

### `DELETE /api/v1/assets/{id}`
Soft delete. Linked transactions retain their `asset_id` for historical reference but asset no longer appears in net worth.

### `POST /api/v1/assets/{id}/valuations`
Record a new valuation (manual or API-sourced).

**Request:**
```json
{
  "value_minor": 7500000,
  "source": "manual"
}
```

Updates `current_value_minor` on the asset and inserts into `asset_value_history`.

### `POST /api/v1/assets/fetch-prices`
Fetch latest gold/silver prices and update all commodity assets.

**Response:**
```json
{
  "data": {
    "updated": [
      { "asset_id": 2, "name": "21K Gold", "old_value": 7200000, "new_value": 7500000 },
      { "asset_id": 5, "name": "Silver Bars", "old_value": 300000, "new_value": 310000 }
    ],
    "price_date": "2026-03-23",
    "source": "metals_api"
  }
}
```

### `POST /api/v1/transactions/{id}/link-asset`
Link an existing transaction to an asset.

**Request:**
```json
{ "asset_id": 1 }
```

### `DELETE /api/v1/transactions/{id}/link-asset`
Unlink a transaction from an asset.

## Asset Value Chart
Each asset detail page shows a value timeline chart (Plotly line chart):
- X axis: time (from purchase date to today)
- Y axis: value in asset's currency
- Data points from `asset_value_history`
- Overlay: purchase price as horizontal reference line
- Green zone above purchase price (gain), red zone below (loss)

## Acceptance Criteria
- [ ] All 6 asset types creatable with correct validation per type
- [ ] Quantity + unit tracked (grams for gold/silver, sqm for real estate, unit for others)
- [ ] Any transaction can be linked to an asset (at creation or retroactively)
- [ ] Unlinking a transaction removes asset_id without deleting the transaction
- [ ] Ownership cost computed separately from operating cost
- [ ] ROI based on ownership cost only (excludes fuel, regular maintenance)
- [ ] Operating cost tracked with per-month average
- [ ] Ownership breakdown (purchase, insurance, tax, income) on asset detail page
- [ ] Operating breakdown (fuel, maintenance, upkeep) on asset detail page
- [ ] Category-to-cost-type mapping applied automatically (overridable per transaction)
- [ ] Value history tracked — each manual update or API fetch logged
- [ ] Gold/silver auto-price fetch updates all commodity assets and logs history
- [ ] User can override auto-fetched value
- [ ] Savings certificate value calculable from principal + rate + elapsed time
- [ ] Assets included in net worth calculation on dashboard
- [ ] Asset value chart renders correctly with gain/loss zones
- [ ] Soft delete removes from net worth but preserves linked transaction history
- [ ] Multi-currency assets: values converted to base currency for aggregate totals
- [ ] Arabic asset names and location text display correctly in RTL
