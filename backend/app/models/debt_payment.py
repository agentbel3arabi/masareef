from datetime import date

from sqlalchemy import BigInteger, Date, ForeignKey, Index, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class DebtPayment(TimestampMixin, Base):
    __tablename__ = "debt_payments"
    __table_args__ = (
        Index("ix_debt_payments_debt_id", "debt_id"),
        Index("ix_debt_payments_transaction_id", "transaction_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    debt_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("debts.id"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    principal_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    interest_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    transaction_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("transactions.id"), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
