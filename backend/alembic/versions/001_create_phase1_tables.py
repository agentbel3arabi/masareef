"""Create Phase 1 tables

Revision ID: a1b2c3d4e5f6
Revises: None
Create Date: 2026-03-27 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all Phase 1 tables."""

    # --- Create PostgreSQL enum types ---
    accounttype = sa.Enum(
        "bank_account",
        "credit_card",
        "cash_wallet",
        "digital_wallet",
        "financing_app",
        name="accounttype",
        create_type=False,
    )
    accounttype.create(op.get_bind(), checkfirst=True)

    transactiontype = sa.Enum(
        "debit",
        "credit",
        name="transactiontype",
        create_type=False,
    )
    transactiontype.create(op.get_bind(), checkfirst=True)

    categorytype = sa.Enum(
        "expense",
        "income",
        "special",
        name="categorytype",
        create_type=False,
    )
    categorytype.create(op.get_bind(), checkfirst=True)

    householdrole = sa.Enum(
        "admin",
        "member",
        "viewer",
        "child",
        name="householdrole",
        create_type=False,
    )
    householdrole.create(op.get_bind(), checkfirst=True)

    # --- 1. households ---
    op.create_table(
        "households",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column(
            "base_currency",
            sa.String(3),
            nullable=False,
            server_default="EGP",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # --- 2. household_members ---
    op.create_table(
        "household_members",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "household_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("households.id"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "role",
            sa.Enum(
                "admin",
                "member",
                "viewer",
                "child",
                name="householdrole",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("display_name", sa.Text, nullable=False),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("household_id", "user_id"),
    )

    # --- 3. accounts ---
    op.create_table(
        "accounts",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "household_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("households.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "bank_account",
                "credit_card",
                "cash_wallet",
                "digital_wallet",
                "financing_app",
                name="accounttype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column(
            "balance_minor",
            sa.BigInteger,
            nullable=False,
            server_default="0",
        ),
        sa.Column("institution", sa.Text, nullable=True),
        sa.Column("credit_limit", sa.BigInteger, nullable=True),
        sa.Column("billing_cycle_day", sa.Integer, nullable=True),
        sa.Column("payment_due_day", sa.Integer, nullable=True),
        sa.Column("opened_at", sa.Date, nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean,
            nullable=False,
            server_default="true",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # --- 4. categories ---
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "household_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("households.id"),
            nullable=True,
        ),
        sa.Column("name_en", sa.Text, nullable=False),
        sa.Column("name_ar", sa.Text, nullable=True),
        sa.Column(
            "type",
            sa.Enum(
                "expense",
                "income",
                "special",
                name="categorytype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("icon", sa.Text, nullable=True),
        sa.Column("color", sa.Text, nullable=True),
        sa.Column(
            "is_predefined",
            sa.Boolean,
            nullable=False,
            server_default="false",
        ),
        sa.Column(
            "sort_order",
            sa.Integer,
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "is_active",
            sa.Boolean,
            nullable=False,
            server_default="true",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # --- 5. transactions ---
    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "household_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("households.id"),
            nullable=False,
        ),
        sa.Column(
            "account_id",
            sa.Integer,
            sa.ForeignKey("accounts.id"),
            nullable=False,
        ),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("description", sa.Text, nullable=False, server_default=""),
        sa.Column("amount_minor", sa.BigInteger, nullable=False),
        sa.Column("currency", sa.Text, nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "debit",
                "credit",
                name="transactiontype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "category_id",
            sa.Integer,
            sa.ForeignKey("categories.id"),
            nullable=True,
        ),
        sa.Column(
            "import_batch_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("exchange_rate_at_time", sa.BigInteger, nullable=True),
        sa.Column("fx_rate_minor_units", sa.BigInteger, nullable=True),
        sa.Column(
            "applies_to_balance",
            sa.Boolean,
            nullable=False,
            server_default="true",
        ),
        sa.Column(
            "transfer_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("gam3eya_id", sa.Integer, nullable=True),
        sa.Column("asset_id", sa.Integer, nullable=True),
        sa.Column(
            "ai_categorized",
            sa.Boolean,
            nullable=True,
            server_default="false",
        ),
        sa.Column("ai_confidence", sa.Float, nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean,
            nullable=False,
            server_default="true",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # --- 6. transaction_splits ---
    op.create_table(
        "transaction_splits",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "transaction_id",
            sa.Integer,
            sa.ForeignKey("transactions.id"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "category_id",
            sa.Integer,
            sa.ForeignKey("categories.id"),
            nullable=True,
        ),
        sa.Column("amount_minor", sa.BigInteger, nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # --- 7. exchange_rates ---
    op.create_table(
        "exchange_rates",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("date", sa.Date, nullable=False, index=True),
        sa.Column("from_currency", sa.Text, nullable=False),
        sa.Column("to_currency", sa.Text, nullable=False),
        sa.Column("rate_scaled", sa.BigInteger, nullable=False),
        sa.Column(
            "is_forecast",
            sa.Boolean,
            nullable=False,
            server_default="false",
        ),
        sa.Column("source", sa.Text, nullable=False),
        sa.Column(
            "fetched_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("date", "from_currency", "to_currency"),
    )


def downgrade() -> None:
    """Drop all Phase 1 tables in reverse order, then drop enum types."""

    op.drop_table("exchange_rates")
    op.drop_table("transaction_splits")
    op.drop_table("transactions")
    op.drop_table("categories")
    op.drop_table("accounts")
    op.drop_table("household_members")
    op.drop_table("households")

    # Drop enum types
    sa.Enum(name="householdrole", create_type=False).drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="categorytype", create_type=False).drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="transactiontype", create_type=False).drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="accounttype", create_type=False).drop(op.get_bind(), checkfirst=True)
