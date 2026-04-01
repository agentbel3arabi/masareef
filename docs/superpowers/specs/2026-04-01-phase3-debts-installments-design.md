# Phase 3: Debts & Installments — Design Spec

**Date:** 2026-04-01
**Author:** Copilot (brainstorming session)
**Status:** Draft — awaiting user review

---

## 1. Problem Statement

Debt tracking is a primary use case for Egyptian/MENA users. Installments (bank, credit card, store, BNPL) are deeply cultural — a single user may juggle a car loan, 5 credit card installment plans, 2 financing app accounts, and several P2P debts with family. No existing product combines all of these in one place with Arabic-first support.

Phase 3 delivers the complete debt management system: bank loans with amortization, P2P debts with flexible repayment, installment plans across credit cards / stores / financing apps, and a unified 5-tab frontend page.

---

## 2. Decomposition

Phase 3 is decomposed into 5 sub-phases, executed sequentially:

| Sub-Phase | Scope | Depends On |
|-----------|-------|------------|
| **3A** | Foundation — enums, migrations, persons CRUD, bank loan CRUD, amortization engine, debt payments, auto-match | — |
| **3B** | P2P debts — 3 repayment modes, splits, person card balance computation (per-currency + FX conversion) | 3A |
| **3C** | Installment plans — CC installments, store installments, financing app installments, financing apps summary endpoint | 3A |
| **3D** | Frontend — 5-tab debts page, loan detail, P2P person card, installment forms, person management, dashboard stat cards | 3A + 3B + 3C |
| **3E** | CC statement cycle — statement generation date, current vs statement balance, minimum payment + transaction pending/posted state | 3A + 3D |

**Rationale:** Backend-first (3A→3B→3C), then frontend (3D), then CC-specific enhancements (3E). The statement cycle touches both the account and transaction models and benefits from having the full debt system in place first.

---

## 3. Sub-Phase 3A: Foundation + Bank Loans

### 3A.1 New Enums

Add to `backend/app/models/enums.py`:

```python
class DebtType(enum.StrEnum):
    BANK_LOAN = "bank_loan"
    PERSONAL_LENT = "personal_lent"
    PERSONAL_BORROWED = "personal_borrowed"

class DebtStatus(enum.StrEnum):
    ACTIVE = "active"
    PAID_OFF = "paid_off"

class InstallmentType(enum.StrEnum):
    CREDIT_CARD = "credit_card"
    STORE = "store"
    FINANCING_APP = "financing_app"

class LifecycleStatus(enum.StrEnum):
    ACTIVE = "active"
    COMPLETED = "completed"

class PersonRelationship(enum.StrEnum):
    FAMILY = "family"
    FRIEND = "friend"
    COLLEAGUE = "colleague"
    BUSINESS = "business"
    OTHER = "other"

class RepaymentMode(enum.StrEnum):
    LUMP_SUM = "lump_sum"
    EQUAL_SPLITS = "equal_splits"
    CUSTOM_SPLITS = "custom_splits"
```

### 3A.2 Alembic Migration

One migration creates all Phase 3 tables and enums:

**Tables created:**
- `persons` — contact records for P2P debts
- `debts` — bank loans and P2P debts
- `debt_payments` — payment records linked to debts
- `p2p_debt_splits` — split schedules for P2P debts
- `installment_plans` — CC / store / financing app installment plans

**DB enums created:** `debt_type`, `debt_status`, `installment_type`, `lifecycle_status`, `person_relationship`, `repayment_mode`

Schema follows `docs/02-data-models.md` exactly. All tables include `household_id` (except `debt_payments` and `p2p_debt_splits` which inherit scope through their parent debt).

### 3A.3 SQLAlchemy Models

| Model File | Table | Key Relationships |
|------------|-------|-------------------|
| `models/person.py` | `persons` | Has many `debts` (P2P type) |
| `models/debt.py` | `debts` | Belongs to household, optional person, optional linked_account. Has many payments and splits. |
| `models/debt_payment.py` | `debt_payments` | Belongs to debt, optional transaction link |
| `models/p2p_debt_split.py` | `p2p_debt_splits` | Belongs to debt, optional payment link |
| `models/installment_plan.py` | `installment_plans` | Belongs to household, optional source_account, optional linked_account |

All models extend `TimestampMixin, SoftDeleteMixin, Base` (following existing pattern).

### 3A.4 Persons Router + Service

**Router:** `routers/persons.py`
**Service:** `services/person.py`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/persons` | GET | List persons with per-currency net balances |
| `/api/v1/persons` | POST | Create person |
| `/api/v1/persons/{id}` | GET | Get person detail |
| `/api/v1/persons/{id}` | PUT | Update person |
| `/api/v1/persons/{id}` | DELETE | Soft delete (fails if active debts exist) |

**Schemas:** `PersonCreate`, `PersonUpdate`, `PersonResponse`, `PersonListResponse`

Person response includes `balances_by_currency` and `total_net_in_base` — but the actual balance computation logic is deferred to 3B (P2P sub-phase). In 3A, persons are created as standalone contacts; the balance fields return empty/zero.

### 3A.5 Debts Router + Service (Bank Loans Only in 3A)

**Router:** `routers/debts.py`
**Service:** `services/debt.py`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/debts` | GET | List debts (filter by type, status) |
| `/api/v1/debts` | POST | Create debt (bank_loan in 3A; P2P in 3B) |
| `/api/v1/debts/{id}` | GET | Get debt detail |
| `/api/v1/debts/{id}` | PUT | Update debt (restricted after payments exist) |
| `/api/v1/debts/{id}` | DELETE | Soft delete |
| `/api/v1/debts/{id}/amortization` | GET | Full amortization schedule |
| `/api/v1/debts/{id}/payments` | GET | List payments for a debt |
| `/api/v1/debts/{id}/payments` | POST | Record a payment |
| `/api/v1/debts/{id}/match-suggestions` | GET | Auto-match transaction suggestions |
| `/api/v1/debts/{id}/mark-paid` | POST | Mark debt as fully paid off |

**Create request (bank loan):**
- Accepts `annual_rate_percent` (e.g., 14.5) — backend converts to `annual_rate_bps` (1450)
- Backend computes `monthly_payment_minor` via PMT formula and stores it
- Validates: principal > 0, tenure_months > 0, rate ≥ 0

**Update restrictions:**
- Cannot change `principal_minor`, `annual_rate_bps`, or `tenure_months` after any `debt_payments` exist
- Can always update `name`, `institution`, `linked_account_id`, `notes`

### 3A.6 Amortization Engine

**Service:** `services/amortization.py`

Pure computation — no DB access, no HTTP awareness.

```python
def compute_monthly_payment(principal_minor: int, annual_rate_bps: int, tenure_months: int) -> int:
    """PMT formula. Returns monthly payment in minor units, rounded up."""

def generate_schedule(
    principal_minor: int,
    annual_rate_bps: int,
    tenure_months: int,
    start_date: date,
    payments: list[DebtPayment],
) -> list[ScheduleRow]:
    """Full amortization schedule with paid/overdue/upcoming status."""
```

**PMT formula:**
```
monthly_rate = annual_rate_bps / (10_000 × 12)
if rate > 0:
    payment = principal × (rate × (1 + rate)^months) / ((1 + rate)^months - 1)
if rate == 0:
    payment = principal / months
Result rounded UP to nearest minor unit (math.ceil).
```

**Schedule row:** `payment_number, date, payment_minor, principal_minor, interest_minor, remaining_minor, status`

**Status derivation:**
- `paid` — a `debt_payment` exists covering this period
- `overdue` — date is past today and no payment recorded
- `upcoming` — date is in the future

**Edge cases:**
- Final payment absorbs rounding error (may differ from other payments by 1-2 minor units)
- 0% interest loans: equal division, no interest portion
- Early payoff: remaining schedule marked as N/A

### 3A.7 Auto-Match Suggestions

For debts with `linked_account_id`, suggest matching transactions:
- Query transactions on the linked account within ±5 days of due date
- Amount within 5% of expected payment
- Debit transactions only (negative amount_minor)
- Return as suggestions — user confirms to create debt_payment linked to that transaction
- Simple match score: exact amount = 1.0, within 5% = 0.8 + proportional

### 3A.8 Payment Recording

When recording a payment for a bank loan:
1. Backend auto-computes principal/interest split from amortization schedule
2. Uses the payment number corresponding to the date to determine the split
3. If payment amount differs from scheduled amount: use the same interest/principal ratio from the scheduled row (e.g., if schedule says 51.4% interest / 48.6% principal, apply that ratio to the actual amount)
4. Creates `debt_payment` record
5. If total payments >= principal, auto-mark debt as `paid_off`
6. Optional: link to existing transaction via `transaction_id`

### 3A.9 Tests

- **Amortization engine:** Unit tests for PMT formula (0%, 14.5%, edge cases), schedule generation, rounding
- **Debt CRUD:** Create, read, update, delete (soft), restriction after payments
- **Payment recording:** Auto-split, paid-off detection, transaction linking
- **Auto-match:** ±5 day window, 5% tolerance, score computation
- **Person CRUD:** Create, update, soft-delete, block-delete-with-active-debts

---

## 4. Sub-Phase 3B: P2P Debts

### 4.1 P2P Debt Creation

Extends the existing `POST /api/v1/debts` endpoint with `type = personal_lent | personal_borrowed`:

**Lump sum mode:**
- `repayment_mode = "lump_sum"`, `due_date` required
- No splits generated — single due date for full amount

**Equal splits mode:**
- `repayment_mode = "equal_splits"`, `split_count` required
- Backend auto-generates N monthly splits: amount = principal / split_count, dates = monthly from start_date + 1 month
- Rounding: last split absorbs remainder

**Custom splits mode:**
- `repayment_mode = "custom_splits"`, `splits[]` required
- User provides amount_minor + due_date per split
- Validation: SUM(split amounts) must equal principal_minor exactly

### 4.2 P2P Debt Splits Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/debts/{id}/splits` | GET | Get split schedule for a P2P debt |

Split status derived from `debt_payments` linkage:
- `paid` — `payment_id` is not null
- `overdue` — `due_date` is past today and `paid = false`
- `upcoming` — `due_date` is in the future and `paid = false`

### 4.3 Person Card Balance Computation

**Service:** `services/person.py` (extended from 3A)

```python
async def compute_person_balances(
    session: AsyncSession, household_id: UUID, person_id: int
) -> PersonBalances:
    """Per-currency net balances + base currency total."""
```

**Algorithm per currency:**
```
lent_total = SUM(principal_minor) WHERE type=personal_lent AND currency=X AND is_active=TRUE
borrowed_total = SUM(principal_minor) WHERE type=personal_borrowed AND currency=X AND is_active=TRUE
lent_paid = SUM(debt_payments.amount_minor) for lent debts in currency X
borrowed_paid = SUM(debt_payments.amount_minor) for borrowed debts in currency X

net = (lent_total - lent_paid) - (borrowed_total - borrowed_paid)
Positive net = they owe you. Negative net = you owe them.
```

**Base currency conversion:**
- Uses `exchange_rates` table (already exists)
- Hub currency = USD: convert each currency net to USD, then USD to base currency
- Falls back to 0 if no rate available (with warning flag in response)

### 4.4 Privacy Controls

- `child` role: cannot see any P2P debts (filter at service layer)
- `viewer` role: can see P2P debts, cannot create/edit/delete
- `admin` + `member`: full access

Implementation: role check in the debt service for P2P-type operations.

### 4.5 Settlement

When a P2P debt is fully repaid:
- All splits marked as paid (or single lump_sum payment covers principal)
- System marks debt as `paid_off`
- Person card balances recalculate automatically (query-time)

### 4.6 Tests

- **P2P creation:** All 3 repayment modes, validation rules
- **Split generation:** Equal split rounding, custom split sum validation
- **Balance computation:** Multi-currency, mixed lent/borrowed, partial payments
- **FX conversion:** Base currency total with mock exchange rates
- **Privacy:** Role-based access for child, viewer, member, admin
- **Settlement:** Paid-off detection, balance recalculation

---

## 5. Sub-Phase 3C: Installment Plans

### 5.1 Installment Plans Router + Service

**Router:** `routers/installments.py`
**Service:** `services/installment.py`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/installments` | GET | List all plans (filter by type, status) |
| `/api/v1/installments` | POST | Create installment plan |
| `/api/v1/installments/{id}` | GET | Get plan detail |
| `/api/v1/installments/{id}` | PUT | Update plan |
| `/api/v1/installments/{id}` | DELETE | Soft delete |
| `/api/v1/installments/{id}/complete` | POST | Mark as completed |

### 5.2 Credit Card Installments

- `type = "credit_card"`
- `source_account_id` → credit card account (required)
- Multiple concurrent plans per card
- **Per-card aggregation:**
  - Monthly commitment = SUM(monthly_amount_minor) for active plans on this card
  - Total committed = SUM(total_amount_minor) for active plans
  - Utilization = total_committed / credit_limit × 100

### 5.3 Store Installments

- `type = "store"`
- `merchant_name` required (e.g., "B.TECH", "IKEA")
- `source_account_id` optional (account charged monthly)
- No credit card association required
- Common in Egypt: 0% interest, 6-36 months

### 5.4 Financing App Installments

- `type = "financing_app"`
- `source_account_id` → financing app account (required)
- Same structure as CC installments but linked to financing_app accounts

### 5.5 Financing Apps Summary Endpoint

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/financing-apps/summary` | GET | Per-app utilization + cross-app totals |

Response follows the spec in `docs/03-features/financing-apps.md`:
- Per app: account_id, name, credit_limit, balance, available, utilization%, active_plans_count, monthly_commitment
- Totals: total_limit, total_used, total_available, total_monthly, total_remaining

### 5.6 Installment Status Computation

Status for each installment plan is computed at query time (not stored):
- Months elapsed = difference between start_month and current month
- If months_elapsed >= total_months → `completed` (auto-complete)
- Otherwise → `active`
- Months paid = months_elapsed (assumes monthly deduction)
- Remaining months = total_months - months_paid

Note: Installment plans don't have individual payment records like debts — they represent a commitment that's deducted monthly. The `status` field (`lifecycle_status`) is stored and set to `completed` either manually via `POST /complete` or automatically at query time when `months_elapsed >= total_months`. The account balance reflects actual payments. Future enhancement could add payment tracking per installment.

### 5.7 Tests

- **CRUD:** Create, read, update, delete for all 3 types
- **CC utilization:** Multiple concurrent plans, correct aggregation
- **Financing apps summary:** Per-app and cross-app totals
- **Completion:** Auto-complete after total_months, manual early payoff
- **Validation:** source_account_id type must match installment type

---

## 6. Sub-Phase 3D: Frontend

### 6.1 New Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/debts` | `DebtsPage` | 5-tab layout: Loans, Card Installments, Financing Apps, Store Installments, P2P |
| `/debts/loans/[id]` | `LoanDetailPage` | Amortization table, payment form, progress bar |
| `/debts/p2p/[id]` | `P2PDebtDetailPage` | Split schedule, payment recording |

### 6.2 Five-Tab Debts Page

Tabs correspond to the 5 stitch designs:
1. **Loans** → `10-debts-loans.html`
2. **Card Installments** → `10b-card-installments.html`
3. **Financing Apps** → `10d-financing-apps.html`
4. **Store Installments** → `10c-store-installments.html`
5. **P2P** → `11-p2p-debts.html`

Each tab uses TanStack Query for data fetching with appropriate query keys for cache invalidation.

### 6.3 Person Management

- Person CRUD integrated into Settings page or a dedicated People sub-page
- Person selector (dropdown/combobox) in P2P debt creation form
- Person card component showing per-currency balances and base currency total

### 6.4 Forms

| Form | Fields | Notes |
|------|--------|-------|
| Bank Loan | name, institution, principal, rate%, tenure, start date, linked account | Rate entered as percent, converted to bps |
| P2P Debt | person (select), type (lent/borrowed), amount, currency, mode, due date/splits | Mode selection shows/hides split config |
| CC Installment | name, source card (select), total, monthly, months, start month | Card selector filtered to credit_card accounts |
| Store Installment | name, merchant, total, monthly, months, start month, linked account | Linked account optional |
| Financing App Installment | name, merchant, source app (select), total, monthly, months, start month | App selector filtered to financing_app accounts |
| Record Payment | date, amount, transaction (optional select), notes | For loans: auto-shows principal/interest split |

### 6.5 Dashboard Integration

Resolves backend-dependencies.md items #2 and #3:
- **Active Debts stat card** → `GET /api/v1/debts` count where status=active
- **Upcoming Payments stat card** → computed from amortization schedules + installment due dates within next 30 days

### 6.6 Navigation

Add "Debts" (ديون) to the app sidebar navigation, after Transactions and before Settings.

### 6.7 Stitch Design Reference

All 5 tab screens have stitch HTML designs. Frontend implementation follows design tokens (`guides/09-design-tokens.md`) and uses shadcn/ui components. Physical CSS classes converted to logical equivalents.

### 6.8 i18n

All labels need Arabic + English translations in `messages/ar.json` and `messages/en.json`. Key namespace: `debts.*`, `persons.*`, `installments.*`.

---

## 7. Data Flow

```
User creates debt
  → POST /api/v1/debts
  → Backend validates, computes monthly_payment via PMT (bank loans)
  → Backend auto-generates P2P splits (equal_splits mode)
  → Stores in DB with household_id scoping

User views amortization
  → GET /api/v1/debts/{id}/amortization
  → Backend generates schedule on-demand from stored params + payments
  → Returns schedule with paid/overdue/upcoming status per row

User records payment
  → POST /api/v1/debts/{id}/payments
  → Backend auto-computes principal/interest split (bank loans)
  → Checks if debt is fully paid → auto-mark paid_off
  → Optional: links to existing transaction

Person card
  → GET /api/v1/persons (or /persons/{id})
  → Backend aggregates per-currency balances across all P2P debts
  → Converts to base currency via exchange_rates table
  → Returns structured balance breakdown

Financing apps summary
  → GET /api/v1/financing-apps/summary
  → Backend queries financing_app accounts + their active installment plans
  → Computes per-app utilization and cross-app totals
```

---

## 8. Error Handling

| Scenario | HTTP Status | Error Code |
|----------|------------|------------|
| Create debt with invalid person_id | 404 | `PERSON_NOT_FOUND` |
| Custom splits don't sum to principal | 422 | `SPLITS_SUM_MISMATCH` |
| Update principal after payments exist | 409 | `IMMUTABLE_AFTER_PAYMENTS` |
| Delete person with active debts | 409 | `PERSON_HAS_ACTIVE_DEBTS` |
| CC installment with non-credit-card account | 422 | `INVALID_ACCOUNT_TYPE` |
| Financing app installment with non-financing-app account | 422 | `INVALID_ACCOUNT_TYPE` |
| Record payment exceeding remaining balance | 422 | `PAYMENT_EXCEEDS_REMAINING` |

---

## 9. Testing Strategy

Each sub-phase includes its own tests:

| Layer | Framework | Coverage Target |
|-------|-----------|-----------------|
| Amortization engine | pytest (unit) | PMT formula, schedule generation, edge cases |
| Services | pytest + AsyncSession | CRUD, validation, balance computation |
| Routers | pytest + httpx (integration) | Full request/response cycle, error codes |
| Frontend | Playwright E2E (Phase 3D) | Tab navigation, form submission, balance display |

---

## 10. Files Created/Modified Per Sub-Phase

### 3A (Foundation + Bank Loans)
**New files:**
- `backend/app/models/person.py`
- `backend/app/models/debt.py`
- `backend/app/models/debt_payment.py`
- `backend/app/models/p2p_debt_split.py`
- `backend/app/models/installment_plan.py`
- `backend/app/schemas/person.py`
- `backend/app/schemas/debt.py`
- `backend/app/schemas/debt_payment.py`
- `backend/app/services/person.py`
- `backend/app/services/debt.py`
- `backend/app/services/amortization.py`
- `backend/app/routers/debts.py`
- `backend/app/routers/persons.py`
- `backend/alembic/versions/xxx_create_phase3_tables.py`
- `backend/tests/unit/test_amortization.py`
- `backend/tests/unit/test_debt_service.py`
- `backend/tests/unit/test_person_service.py`

**Modified files:**
- `backend/app/models/enums.py` — add 6 new enums
- `backend/app/models/__init__.py` — export new models
- `backend/app/main.py` — register new routers

### 3B (P2P Debts)
**New files:**
- `backend/app/schemas/p2p_debt_split.py`
- `backend/tests/unit/test_p2p_debt.py`
- `backend/tests/unit/test_person_balance.py`

**Modified files:**
- `backend/app/services/debt.py` — add P2P creation logic, split generation
- `backend/app/services/person.py` — add balance computation + FX conversion
- `backend/app/routers/debts.py` — add splits endpoint
- `backend/app/schemas/debt.py` — add P2P-specific request/response shapes

### 3C (Installment Plans)
**New files:**
- `backend/app/schemas/installment.py`
- `backend/app/services/installment.py`
- `backend/app/routers/installments.py`
- `backend/app/routers/financing_apps.py`
- `backend/tests/unit/test_installment_service.py`

**Modified files:**
- `backend/app/main.py` — register installment + financing_apps routers

### 3D (Frontend)
**New files:**
- `frontend/src/app/(app)/debts/page.tsx`
- `frontend/src/app/(app)/debts/loans/[id]/page.tsx`
- `frontend/src/app/(app)/debts/p2p/[id]/page.tsx`
- `frontend/src/components/debts/` — tab components, forms, cards
- `frontend/src/hooks/use-debts.ts`
- `frontend/src/hooks/use-persons.ts`
- `frontend/src/hooks/use-installments.ts`

**Modified files:**
- `frontend/src/components/layout/sidebar.tsx` — add Debts nav item
- `frontend/src/app/(app)/dashboard/page.tsx` — wire stat cards
- `frontend/messages/en.json` — add debts/persons/installments translations
- `frontend/messages/ar.json` — same

---

## 11. Sub-Phase 3E: CC Statement Cycle & Pending/Posted Transactions

These two deferred Phase 1.5 items are now included in Phase 3.

### 11.1 Credit Card Statement Cycle

**Purpose:** Credit cards in Egypt have a billing cycle. The `statement_balance` is locked on `billing_cycle_day`; the `current_balance` continues to accumulate. Minimum payment is computed from the statement balance.

**Backend changes:**

Add to `accounts` table (new migration):
- `statement_balance_minor BIGINT NULL` — balance locked on last billing cycle date
- `last_statement_date DATE NULL` — when the last statement was generated
- `minimum_payment_minor BIGINT NULL` — computed minimum payment for current cycle

**Service: `services/statement_cycle.py`**
- `compute_statement_balance(session, account) -> int` — sum of transactions up to `billing_cycle_day` of current month
- `compute_minimum_payment(statement_balance_minor, rate_bps) -> int` — typically max(fixed_minimum, percentage × statement_balance)
- Egyptian CC minimum payment: typically 5% of statement balance or 100 EGP, whichever is higher (configurable per account)

**New endpoint:**
- `POST /api/v1/accounts/{id}/close-statement` — manually trigger statement close (lock balance, compute minimum payment)
- `GET /api/v1/accounts/{id}/statement` — current vs statement balance, minimum payment, due date

**Display fields in AccountResponse:**
- `statement_balance_minor` — balance as of last statement date
- `current_balance_minor` — live balance (same as displayed_balance)
- `minimum_payment_minor` — minimum due this cycle
- `payment_due_date` — derived from `payment_due_day`

### 11.2 Transaction Pending vs Posted State

**Purpose:** CC transactions have a lifecycle: `pending` (authorization hold) → `posted` (settled). Pending transactions affect available credit but not the statement balance.

**Backend changes:**

Add to `transactions` table (new migration):
- `posting_status TEXT NOT NULL DEFAULT 'posted'` — enum: `pending`, `posted`
- Only applicable for credit card and financing app accounts; bank_account/cash/digital always `posted`

**Business logic:**
- Pending transactions DO count toward `displayed_balance` and `available_credit`
- Pending transactions DO NOT count toward `statement_balance`
- When a pending transaction transitions to `posted`, no balance change (already counted)
- Pending transactions older than 7 days auto-flag for review (background task)

**New endpoints:**
- `POST /api/v1/transactions/{id}/post` — transition pending → posted
- `GET /api/v1/transactions?posting_status=pending` — filter by posting status

### 11.3 Frontend Changes (3E)

- Account detail: show statement balance vs current balance (CC/financing_app only)
- Account detail: show minimum payment amount and due date
- Transaction list: visual indicator for pending transactions (e.g., dotted border, "Pending" badge)
- Transaction list: filter by posting status
- Account card: distinguish current vs statement balance

### 11.4 Tests (3E)

- Statement balance computation with billing cycle boundary
- Minimum payment computation
- Pending → posted transition
- Statement close flow
- Pending transactions excluded from statement balance but included in displayed balance

### 11.5 Files Created/Modified (3E)

**New files:**
- `backend/app/services/statement_cycle.py`
- `backend/alembic/versions/xxx_add_statement_cycle_columns.py`
- `backend/tests/unit/test_statement_cycle.py`

**Modified files:**
- `backend/app/models/account.py` — add statement columns
- `backend/app/models/transaction.py` — add posting_status column
- `backend/app/schemas/account.py` — add statement fields to response
- `backend/app/schemas/transaction.py` — add posting_status
- `backend/app/routers/accounts.py` — add statement endpoints
- `backend/app/routers/transactions.py` — add post endpoint, posting_status filter
- `backend/app/services/account.py` — statement balance computation
- Frontend account detail + transaction list components

---

## 12. Open Questions

1. **Exchange rates endpoint:** The `exchange_rates` model exists but there's no router. Phase 3B needs FX conversion for person card. Should we add a minimal `GET /api/v1/exchange-rates/latest` endpoint in 3B, or seed rates manually for now?
   - **Decision:** Add minimal endpoint in 3B — it's needed for person card and will be reused by dashboard net worth (backend-dependencies #11, #12).

2. **Installment payment tracking:** The spec says installment plans don't track individual payments (monthly deduction assumed). Should we add payment tracking per installment in the future?
   - **Decision:** Defer. The account balance reflects actual payments. A future enhancement could add installment payment records.

3. **Sidebar navigation position:** Debts tab should go where in the sidebar?
   - **Decision:** After Transactions, before Settings. Matches the natural user flow: accounts → transactions → debts → settings.

4. **Minimum payment formula:** Egyptian banks vary. Should we make it configurable per account or use a standard default?
   - **Decision:** Configurable — add `minimum_payment_percent` (default 5%) and `minimum_payment_floor_minor` (default 10000 = 100 EGP) to accounts table. User can override per CC.
