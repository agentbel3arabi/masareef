from datetime import date

from sqlalchemy import BigInteger, Boolean, Date, ForeignKey, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class P2PDebtSplit(Base):
    __tablename__ = "p2p_debt_splits"
    __table_args__ = (Index("ix_p2p_debt_splits_debt_id", "debt_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    debt_id: Mapped[int] = mapped_column(Integer, ForeignKey("debts.id"), nullable=False)
    amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    paid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    payment_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("debt_payments.id"), nullable=True
    )
