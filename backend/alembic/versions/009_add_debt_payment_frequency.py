"""Add payment_frequency and payment_day_of_month to debts

Revision ID: phase3_005
Revises: phase3_004
Create Date: 2026-04-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "phase3_005"
down_revision: str | Sequence[str] | None = "phase3_004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Create the enum type first
    paymentfrequency_enum = sa.Enum(
        "monthly", "quarterly", "semi_annual", "annual",
        name="paymentfrequency",
    )
    paymentfrequency_enum.create(op.get_bind(), checkfirst=True)

    # Add payment_day_of_month column
    op.add_column(
        "debts",
        sa.Column("payment_day_of_month", sa.Integer(), nullable=True),
    )

    # Add payment_frequency column
    op.add_column(
        "debts",
        sa.Column(
            "payment_frequency",
            paymentfrequency_enum,
            nullable=False,
            server_default="monthly",
        ),
    )

    # Add CHECK constraint for payment_day_of_month
    op.create_check_constraint(
        "ck_debts_payment_day_of_month_range",
        "debts",
        "payment_day_of_month >= 1 AND payment_day_of_month <= 28",
    )


def downgrade() -> None:
    op.drop_constraint("ck_debts_payment_day_of_month_range", "debts", type_="check")
    op.drop_column("debts", "payment_frequency")
    op.drop_column("debts", "payment_day_of_month")

    sa.Enum(name="paymentfrequency").drop(op.get_bind(), checkfirst=True)
