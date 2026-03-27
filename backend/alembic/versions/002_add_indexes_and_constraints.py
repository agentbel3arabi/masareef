"""Add composite indexes and CHECK constraints

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-03-27 00:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a1"
down_revision: str | Sequence[str] | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Composite indexes on transactions
    op.create_index(
        "ix_transactions_household_account",
        "transactions",
        ["household_id", "account_id"],
    )
    op.create_index(
        "ix_transactions_household_date",
        "transactions",
        ["household_id", "date"],
    )
    op.create_index(
        "ix_transactions_household_category",
        "transactions",
        ["household_id", "category_id"],
    )
    op.create_index(
        "ix_transactions_dedup",
        "transactions",
        ["account_id", "date", "amount_minor", "description"],
    )

    # Currency index on exchange_rates
    op.create_index(
        "ix_exchange_rates_currencies",
        "exchange_rates",
        ["from_currency", "to_currency"],
    )

    # CHECK constraints on accounts
    op.create_check_constraint(
        "ck_accounts_billing_cycle_day",
        "accounts",
        "billing_cycle_day >= 1 AND billing_cycle_day <= 31",
    )
    op.create_check_constraint(
        "ck_accounts_payment_due_day",
        "accounts",
        "payment_due_day >= 1 AND payment_due_day <= 31",
    )


def downgrade() -> None:
    # Drop CHECK constraints
    op.drop_constraint("ck_accounts_billing_cycle_day", "accounts", type_="check")
    op.drop_constraint("ck_accounts_payment_due_day", "accounts", type_="check")

    # Drop indexes
    op.drop_index("ix_exchange_rates_currencies", table_name="exchange_rates")
    op.drop_index("ix_transactions_dedup", table_name="transactions")
    op.drop_index("ix_transactions_household_category", table_name="transactions")
    op.drop_index("ix_transactions_household_date", table_name="transactions")
    op.drop_index("ix_transactions_household_account", table_name="transactions")
