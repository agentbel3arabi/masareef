# Unit 1B: Core Models — Session Handoff

## What Was Done

Unit 1B implemented all Phase 1 SQLAlchemy models with TDD, Alembic migrations, and seed data.

### Deliverables
- **6 model files**: enums.py, household.py, account.py, category.py, transaction.py, exchange_rate.py
- **Models __init__.py**: re-exports all models and enums
- **Alembic env.py**: imports `app.models` for table detection
- **2 migrations**: 001 (create all tables + enum types), 002 (add composite indexes + CHECK constraints)
- **Seed data**: 18 predefined categories (Arabic+English), 7 currencies, 6 sample FX rates
- **Tests**: 52 total (41 new for Unit 1B + 11 from Unit 1A)
- **PR**: #4 on GitHub

### Key Decisions
- Used `enum.StrEnum` instead of `(str, enum.Enum)` — ruff UP042 recommended it, Python 3.12 native
- Household does NOT use TimestampMixin or SoftDeleteMixin (only has created_at)
- Category uses SoftDeleteMixin but NOT TimestampMixin (has own created_at, no updated_at)
- Transaction.gam3eya_id and asset_id are plain Integers with no FKs — those tables come in later phases
- ExchangeRate is global (no household_id, no mixins)
- Migration was hand-written (no running DB for autogenerate)

### Review Issues Fixed
- Added 4 composite indexes on transactions table (household_account, household_date, household_category, dedup)
- Added currency pair index on exchange_rates
- Added CHECK constraints on account billing_cycle_day and payment_due_day (1-31)

## Next Steps
- Merge PR #4 after CI passes
- Unit 1C or next phase work can begin after merge
- The Alembic migration has not been run against a live database yet — will need `alembic upgrade head` when Supabase is connected
