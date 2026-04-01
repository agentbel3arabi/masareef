"""Create Phase 3 tables (debts, persons, installments)

Revision ID: phase3_001
Revises: c1b77ba111ff
Create Date: 2026-04-02 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "phase3_001"
down_revision: str | Sequence[str] | None = "c1b77ba111ff"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create Phase 3 enum types and tables."""

    # --- Create PostgreSQL enum types ---
    op.execute(
        sa.text(
            "DO $$ BEGIN"
            " CREATE TYPE debttype AS ENUM ('bank_loan','personal_lent','personal_borrowed');"
            " EXCEPTION WHEN duplicate_object THEN NULL;"
            " END $$"
        )
    )
    op.execute(
        sa.text(
            "DO $$ BEGIN"
            " CREATE TYPE debtstatus AS ENUM ('active','paid_off');"
            " EXCEPTION WHEN duplicate_object THEN NULL;"
            " END $$"
        )
    )
    op.execute(
        sa.text(
            "DO $$ BEGIN"
            " CREATE TYPE installmenttype AS ENUM ('credit_card','store','financing_app');"
            " EXCEPTION WHEN duplicate_object THEN NULL;"
            " END $$"
        )
    )
    op.execute(
        sa.text(
            "DO $$ BEGIN"
            " CREATE TYPE lifecyclestatus AS ENUM ('active','completed');"
            " EXCEPTION WHEN duplicate_object THEN NULL;"
            " END $$"
        )
    )
    op.execute(
        sa.text(
            "DO $$ BEGIN"
            " CREATE TYPE personrelationship AS ENUM ('family','friend','colleague','business','other');"
            " EXCEPTION WHEN duplicate_object THEN NULL;"
            " END $$"
        )
    )
    op.execute(
        sa.text(
            "DO $$ BEGIN"
            " CREATE TYPE repaymentmode AS ENUM ('lump_sum','equal_splits','custom_splits');"
            " EXCEPTION WHEN duplicate_object THEN NULL;"
            " END $$"
        )
    )

    # --- persons ---
    op.create_table(
        "persons",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("name_ar", sa.Text, nullable=True),
        sa.Column("phone", sa.Text, nullable=True),
        sa.Column("email", sa.Text, nullable=True),
        sa.Column(
            "relationship",
            sa.Enum("family", "friend", "colleague", "business", "other", name="personrelationship", create_type=False),
            nullable=True,
        ),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_persons_household_id", "persons", ["household_id"])

    # --- debts ---
    op.create_table(
        "debts",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "type",
            sa.Enum("bank_loan", "personal_lent", "personal_borrowed", name="debttype", create_type=False),
            nullable=False,
        ),
        sa.Column("person_id", sa.Integer, sa.ForeignKey("persons.id"), nullable=True),
        sa.Column("linked_account_id", sa.Integer, sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("institution", sa.Text, nullable=True),
        sa.Column("principal_minor", sa.BigInteger, nullable=False),
        sa.Column("currency", sa.Text, nullable=False),
        sa.Column("annual_rate_bps", sa.Integer, nullable=False, server_default="0"),
        sa.Column("tenure_months", sa.Integer, nullable=False),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("monthly_payment_minor", sa.BigInteger, nullable=False),
        sa.Column(
            "repayment_mode",
            sa.Enum("lump_sum", "equal_splits", "custom_splits", name="repaymentmode", create_type=False),
            nullable=True,
        ),
        sa.Column("due_date", sa.Date, nullable=True),
        sa.Column(
            "status",
            sa.Enum("active", "paid_off", name="debtstatus", create_type=False),
            nullable=False,
            server_default="active",
        ),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_debts_household_type", "debts", ["household_id", "type"])
    op.create_index("ix_debts_household_linked_account", "debts", ["household_id", "linked_account_id"])
    op.create_index("ix_debts_household_person", "debts", ["household_id", "person_id"])

    # --- debt_payments ---
    op.create_table(
        "debt_payments",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("debt_id", sa.Integer, sa.ForeignKey("debts.id"), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("amount_minor", sa.BigInteger, nullable=False),
        sa.Column("principal_minor", sa.BigInteger, nullable=True),
        sa.Column("interest_minor", sa.BigInteger, nullable=True),
        sa.Column("transaction_id", sa.Integer, sa.ForeignKey("transactions.id"), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_debt_payments_debt_id", "debt_payments", ["debt_id"])
    op.create_index("ix_debt_payments_transaction_id", "debt_payments", ["transaction_id"])

    # --- p2p_debt_splits ---
    op.create_table(
        "p2p_debt_splits",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("debt_id", sa.Integer, sa.ForeignKey("debts.id"), nullable=False),
        sa.Column("amount_minor", sa.BigInteger, nullable=False),
        sa.Column("due_date", sa.Date, nullable=False),
        sa.Column("paid", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("payment_id", sa.Integer, sa.ForeignKey("debt_payments.id"), nullable=True),
    )
    op.create_index("ix_p2p_debt_splits_debt_id", "p2p_debt_splits", ["debt_id"])

    # --- installment_plans ---
    op.create_table(
        "installment_plans",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "type",
            sa.Enum("credit_card", "store", "financing_app", name="installmenttype", create_type=False),
            nullable=False,
        ),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("merchant_name", sa.Text, nullable=True),
        sa.Column("source_account_id", sa.Integer, sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column("linked_account_id", sa.Integer, sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column("total_amount_minor", sa.BigInteger, nullable=False),
        sa.Column("monthly_amount_minor", sa.BigInteger, nullable=False),
        sa.Column("total_months", sa.Integer, nullable=False),
        sa.Column("start_month", sa.Date, nullable=False),
        sa.Column("currency", sa.Text, nullable=False),
        sa.Column(
            "status",
            sa.Enum("active", "completed", name="lifecyclestatus", create_type=False),
            nullable=False,
            server_default="active",
        ),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_installment_plans_household_type", "installment_plans", ["household_id", "type"])
    op.create_index("ix_installment_plans_household_source", "installment_plans", ["household_id", "source_account_id"])


def downgrade() -> None:
    """Drop Phase 3 tables and enum types."""
    op.drop_table("p2p_debt_splits")
    op.drop_table("debt_payments")
    op.drop_table("installment_plans")
    op.drop_table("debts")
    op.drop_table("persons")

    op.execute(sa.text("DROP TYPE IF EXISTS repaymentmode"))
    op.execute(sa.text("DROP TYPE IF EXISTS personrelationship"))
    op.execute(sa.text("DROP TYPE IF EXISTS lifecyclestatus"))
    op.execute(sa.text("DROP TYPE IF EXISTS installmenttype"))
    op.execute(sa.text("DROP TYPE IF EXISTS debtstatus"))
    op.execute(sa.text("DROP TYPE IF EXISTS debttype"))
