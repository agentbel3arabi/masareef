# Feature: Exchange Rates & Multi-Currency

## Purpose
Masareef is multi-currency from day one. Egyptian users commonly hold EGP, USD, and SAR accounts simultaneously. EGP has experienced major devaluations (2022–2024), making accurate FX tracking critical for net worth visibility. Exchange rates are stored historically and never retroactively adjusted.

## Supported Currencies

| Code | Name | Minor Unit | Primary Use |
|------|------|-----------|-------------|
| EGP | Egyptian Pound | Piaster (1/100) | Default base currency |
| USD | US Dollar | Cent (1/100) | Savings, freelance income |
| SAR | Saudi Riyal | Halala (1/100) | Gulf remittances |
| AED | UAE Dirham | Fils (1/100) | Gulf remittances |
| EUR | Euro | Cent (1/100) | European transactions |
| GBP | British Pound | Penny (1/100) | European transactions |
| KWD | Kuwaiti Dinar | Fils (1/1000) | Gulf remittances |

> Currency list is extensible. Adding a new currency requires only a config entry (code, name, exponent). No schema changes.

## Rate Storage

### Format
Rates stored as integers scaled ×10,000 for precision without floats:
```
1 USD = 50.25 EGP → rate_scaled = 502500
1 USD = 3.75 SAR → rate_scaled = 37500
```

### Hub Currency
All rates stored as **USD → target** pairs (OpenExchangeRates convention):
- `from_currency = "USD"`, `to_currency = "EGP"`, `rate_scaled = 502500`
- `from_currency = "USD"`, `to_currency = "SAR"`, `rate_scaled = 37500`

Conversion between any two currencies routes through USD:
```
EGP → SAR:
  amount_sar = amount_egp × (USD→SAR rate) / (USD→EGP rate)
```

### Historical Rates
- One rate per (date, from, to) triple — unique constraint
- Never retroactively updated — the rate on the day a transaction happened is the truth
- Transactions store `exchange_rate_at_time` for audit trail
- Queries use the latest rate on or before the requested date

### Forecast Rates
- `is_forecast = true` for user-entered future rate assumptions
- Used in cash flow forecasting when projecting multi-currency months
- Clearly marked in UI as projections, not actuals

## Rate Sources

### OpenExchangeRates (Primary)
- **API:** `https://openexchangerates.org/api/latest.json`
- **Free tier:** 1,000 requests/month, hourly updates
- **Returns:** USD-based rates for 170+ currencies
- **Auth:** App ID stored in `app_settings.oxr_api_key`

### Manual Entry
- User can manually enter rates for specific dates
- Use case: parallel market rates (Egypt has had significant official vs. street rate divergence)
- Source tagged as `"manual"` in the database

### Gold/Silver Prices (for asset valuation)
- Commodity prices fetched alongside currency rates
- Stored in separate table or via asset valuation API
- See [assets.md](./assets.md) for details

## Rate Fetching

### Scheduled Fetch
Backend scheduled task (APScheduler) runs daily:
1. Check `app_settings.oxr_last_fetched` — skip if already fetched today
2. Call OXR API with app_id
3. Extract rates for supported currencies (EGP, SAR, AED, EUR, GBP, KWD)
4. Upsert into `exchange_rates` table (date + currency pair = unique)
5. Update `oxr_last_fetched` timestamp

### On-Demand Fetch
User can trigger manual fetch from Settings → Exchange Rates page.

### Rate Staleness
If latest rate is older than 24 hours:
- Dashboard shows subtle warning: "Exchange rates last updated {date}"
- Net worth calculations use stale rate but flag the staleness

## Conversion Logic

### Amount Conversion
```python
def convert_to_base(amount_minor: int, from_currency: str, base_currency: str, rates_map: dict) -> int | None:
    if from_currency == base_currency:
        return amount_minor

    from_rate = rates_map.get(f"USD->{from_currency}")
    base_rate = rates_map.get(f"USD->{base_currency}")

    if not from_rate or not base_rate:
        return None  # missing rate — caller handles gracefully

    return round(amount_minor * base_rate / from_rate)
```

### Historical Conversion
For reports and past transactions:
```python
def convert_at_date(amount_minor: int, from_currency: str, to_currency: str, date: str) -> int | None:
    # Find the latest rate on or before the given date
    rate = query("SELECT rate_scaled FROM exchange_rates WHERE date <= :date AND from_currency = 'USD' AND to_currency = :currency ORDER BY date DESC LIMIT 1")
    ...
```

### Rates Map
Built from the latest rates per currency pair:
```python
rates_map = {
    "USD->EGP": 502500,
    "USD->SAR": 37500,
    "USD->AED": 36727,
    ...
}
```

## API Endpoints

### `GET /api/v1/exchange-rates`
Latest rates for all supported currencies.

**Response:**
```json
{
  "data": {
    "base": "USD",
    "date": "2026-03-23",
    "rates": [
      { "from": "USD", "to": "EGP", "rate_scaled": 502500, "rate_display": 50.25 },
      { "from": "USD", "to": "SAR", "rate_scaled": 37500, "rate_display": 3.75 }
    ],
    "last_fetched": "2026-03-23T08:30:00Z",
    "is_stale": false
  }
}
```

### `GET /api/v1/exchange-rates/history`
Historical rates for a currency pair.

**Query params:** `from` (default USD), `to` (required), `date_from`, `date_to`

**Response:**
```json
{
  "data": {
    "from": "USD",
    "to": "EGP",
    "rates": [
      { "date": "2026-03-20", "rate_scaled": 501800, "source": "openexchangerates" },
      { "date": "2026-03-21", "rate_scaled": 502100, "source": "openexchangerates" },
      { "date": "2026-03-22", "rate_scaled": 502500, "source": "openexchangerates" }
    ]
  }
}
```

### `POST /api/v1/exchange-rates/fetch`
Trigger manual rate fetch.

**Response:**
```json
{ "data": { "ok": true, "date": "2026-03-23", "rates_updated": 6 } }
```

### `POST /api/v1/exchange-rates/manual`
Enter a manual rate for a specific date.

**Request:**
```json
{
  "date": "2026-03-23",
  "from_currency": "USD",
  "to_currency": "EGP",
  "rate": 51.50
}
```
Backend converts `51.50` → `rate_scaled = 515000`, stores with `source = "manual"`.

### `GET /api/v1/exchange-rates/convert`
Utility: convert an amount between currencies.

**Query params:** `amount_minor`, `from`, `to`, `date` (optional, defaults to latest)

**Response:**
```json
{
  "data": {
    "from_amount_minor": 1000000,
    "from_currency": "EGP",
    "to_amount_minor": 19900,
    "to_currency": "USD",
    "rate_used": 502500,
    "rate_date": "2026-03-23"
  }
}
```

### Settings Endpoints

#### `GET /api/v1/settings/exchange-rates`
Current configuration: API key (masked), last fetched, base currency.

#### `PUT /api/v1/settings/exchange-rates`
Update OXR API key or base currency.

**Request:**
```json
{
  "oxr_api_key": "abc123...",
  "base_currency": "EGP"
}
```

## Acceptance Criteria
- [ ] Rates stored as integer ×10,000 — no floating point in DB
- [ ] All conversions route through USD hub — no direct cross-pair storage
- [ ] Historical rates: one entry per (date, from, to), never overwritten retroactively
- [ ] Transaction records `exchange_rate_at_time` at creation — immutable after
- [ ] OXR scheduled fetch runs daily, skips if already fetched today
- [ ] Manual rate entry works for any supported currency pair and date
- [ ] Manual rates tagged with source="manual", distinguishable from API rates
- [ ] Staleness warning shown when latest rate older than 24 hours
- [ ] Missing rate for a currency pair returns null — callers handle gracefully (warning icon, excluded from totals)
- [ ] Forecast rates (`is_forecast = true`) used in cash flow projection, visually distinct
- [ ] Base currency selector persists to household settings
- [ ] Currency list extensible via config — no schema changes for new currencies
- [ ] Rate history viewable per currency pair with date range filter
- [ ] Conversion utility endpoint handles arbitrary pairs via USD routing
