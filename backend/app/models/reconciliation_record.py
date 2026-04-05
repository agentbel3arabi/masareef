import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin


class ReconciliationRecord(SoftDeleteMixin, Base):
    __tablename__ = "reconciliation_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id"), nullable=False
    )
    account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("accounts.id"), nullable=False, index=True
    )
    transaction_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("transactions.id"), nullable=True
    )
    expected_balance_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    actual_balance_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    adjustment_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reconciliation_date: Mapped[date] = mapped_column(Date, nullable=False)
    reconciled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
