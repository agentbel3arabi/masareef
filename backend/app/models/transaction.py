import uuid
from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Text,
    func,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import TransactionType

_enum_values = lambda e: [x.value for x in e]  # noqa: E731


class Transaction(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transactions_household_account", "household_id", "account_id"),
        Index("ix_transactions_household_date", "household_id", "date"),
        Index("ix_transactions_household_category", "household_id", "category_id"),
        Index("ix_transactions_dedup", "account_id", "date", "amount_minor", "description"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id"), nullable=False
    )
    account_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounts.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(Text, server_default="")
    amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[TransactionType] = mapped_column(
        SAEnum(TransactionType, values_callable=_enum_values, create_type=False), nullable=False
    )
    category_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("categories.id"), nullable=True
    )
    import_batch_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    exchange_rate_at_time: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    fx_rate_minor_units: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    applies_to_balance: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    transfer_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    gam3eya_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    asset_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_categorized: Mapped[bool | None] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    ai_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    splits: Mapped[list["TransactionSplit"]] = relationship(back_populates="transaction")


class TransactionSplit(Base):
    __tablename__ = "transaction_splits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    transaction_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("transactions.id"), nullable=False, index=True
    )
    category_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("categories.id"), nullable=True
    )
    amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    transaction: Mapped["Transaction"] = relationship(back_populates="splits")
