"""AIUsageTracking ORM model — token budget tracking per household per month."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AIUsageTracking(Base):
    """Tracks AI token usage per household per calendar month."""

    __tablename__ = "ai_usage_tracking"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    household_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    year_month: Mapped[str] = mapped_column(Text, nullable=False)  # e.g. "2026-04"
    tokens_used: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    monthly_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)  # None = unlimited
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
