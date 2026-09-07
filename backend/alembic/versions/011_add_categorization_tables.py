"""Add categorization_rules and ai_usage_tracking tables

Revision ID: a3f8c29d4e71
Revises: 1b243df27c85
Create Date: 2026-04-08 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a3f8c29d4e71"
down_revision: str | Sequence[str] | None = "1b243df27c85"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create categorization_rules and ai_usage_tracking tables."""
    op.create_table(
        "categorization_rules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "household_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("households.id"),
            nullable=False,
        ),
        sa.Column("pattern", sa.Text(), nullable=False),
        sa.Column("match_type", sa.Text(), nullable=False, server_default="contains"),
        sa.Column(
            "category_id",
            sa.Integer(),
            sa.ForeignKey("categories.id"),
            nullable=False,
        ),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("hit_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_categorization_rules_household",
        "categorization_rules",
        ["household_id"],
    )
    op.create_index(
        "ix_categorization_rules_household_active",
        "categorization_rules",
        ["household_id", "is_active"],
    )

    op.create_table(
        "ai_usage_tracking",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "household_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("year_month", sa.Text(), nullable=False),
        sa.Column("tokens_used", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("monthly_limit", sa.Integer(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_ai_usage_household_month",
        "ai_usage_tracking",
        ["household_id", "year_month"],
        unique=True,
    )


def downgrade() -> None:
    """Drop categorization tables."""
    op.drop_index("ix_ai_usage_household_month", table_name="ai_usage_tracking")
    op.drop_table("ai_usage_tracking")

    op.drop_index(
        "ix_categorization_rules_household_active",
        table_name="categorization_rules",
    )
    op.drop_index(
        "ix_categorization_rules_household",
        table_name="categorization_rules",
    )
    op.drop_table("categorization_rules")
