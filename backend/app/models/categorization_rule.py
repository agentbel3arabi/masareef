import uuid

from sqlalchemy import Float, ForeignKey, Index, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class CategorizationRule(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "categorization_rules"
    __table_args__ = (
        Index("ix_categorization_rules_household", "household_id"),
        Index("ix_categorization_rules_household_active", "household_id", "is_active"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("households.id"),
        nullable=False,
    )
    pattern: Mapped[str] = mapped_column(Text, nullable=False)
    match_type: Mapped[str] = mapped_column(Text, nullable=False, server_default="contains")
    category_id: Mapped[int] = mapped_column(Integer, ForeignKey("categories.id"), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, server_default="1.0")
    hit_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
