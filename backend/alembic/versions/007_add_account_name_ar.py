"""Add name_ar to accounts

Revision ID: phase3_003
Revises: phase3_001
Create Date: 2026-04-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "phase3_003"
down_revision: str | Sequence[str] | None = "phase3_002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("accounts", sa.Column("name_ar", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("accounts", "name_ar")
