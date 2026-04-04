"""Add payment_day_of_month and notes to installment_plans

Revision ID: phase3_006
Revises: phase3_005
Create Date: 2026-04-04
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "phase3_006"
down_revision: str | Sequence[str] | None = "phase3_005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "installment_plans",
        sa.Column("payment_day_of_month", sa.Integer(), nullable=True),
    )
    op.add_column(
        "installment_plans",
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_check_constraint(
        "ck_installment_plans_payment_day_range",
        "installment_plans",
        "payment_day_of_month >= 1 AND payment_day_of_month <= 28",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_installment_plans_payment_day_range",
        "installment_plans",
        type_="check",
    )
    op.drop_column("installment_plans", "notes")
    op.drop_column("installment_plans", "payment_day_of_month")
