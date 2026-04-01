"""ensure_transfer_and_uncategorized_categories

Revision ID: c1b77ba111ff
Revises: af900445891f
Create Date: 2026-04-01 07:47:45.444958

Ensures that the predefined "Transfer" and "Uncategorized" special categories
exist. The initial seed only ran once; later additions to PREDEFINED_CATEGORIES
are not automatically applied to existing databases.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c1b77ba111ff"
down_revision: Union[str, Sequence[str], None] = "af900445891f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_SPECIAL_CATEGORIES = [
    {
        "name_en": "Transfer",
        "name_ar": "تحويل",
        "type": "special",
        "icon": "arrow-left-right",
        "color": "#94A3B8",
        "sort_order": 16,
    },
    {
        "name_en": "Uncategorized",
        "name_ar": "غير مصنف",
        "type": "special",
        "icon": "help-circle",
        "color": "#94A3B8",
        "sort_order": 17,
    },
]


def upgrade() -> None:
    conn = op.get_bind()
    for cat in _SPECIAL_CATEGORIES:
        exists = conn.execute(
            sa.text(
                "SELECT 1 FROM categories WHERE name_en = :name AND is_predefined = TRUE LIMIT 1"
            ),
            {"name": cat["name_en"]},
        ).fetchone()
        if not exists:
            conn.execute(
                sa.text(
                    """
                    INSERT INTO categories
                        (household_id, name_en, name_ar, type, icon, color,
                         is_predefined, sort_order, is_active)
                    VALUES
                        (NULL, :name_en, :name_ar, :type, :icon, :color,
                         TRUE, :sort_order, TRUE)
                    """
                ),
                cat,
            )


def downgrade() -> None:
    # These are predefined system categories — do not delete on downgrade
    pass
