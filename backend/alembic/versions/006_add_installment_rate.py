"""Add annual_rate_bps to installment_plans

Revision ID: phase3_002
Revises: phase3_001
Create Date: 2026-04-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "phase3_002"
down_revision: str | Sequence[str] | None = "phase3_001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "installment_plans",
        sa.Column("annual_rate_bps", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("installment_plans", "annual_rate_bps")
