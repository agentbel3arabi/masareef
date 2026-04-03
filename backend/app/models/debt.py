import uuid
from datetime import date

from sqlalchemy import BigInteger, Date, ForeignKey, Index, Integer, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import DebtStatus, DebtType, PaymentFrequency, RepaymentMode

_enum_values = lambda e: [x.value for x in e]  # noqa: E731


class Debt(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "debts"
    __table_args__ = (
        Index("ix_debts_household_type", "household_id", "type"),
        Index("ix_debts_household_linked_account", "household_id", "linked_account_id"),
        Index("ix_debts_household_person", "household_id", "person_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    household_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    type: Mapped[str] = mapped_column(
        SAEnum(DebtType, values_callable=_enum_values, create_type=False), nullable=False
    )
    person_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("persons.id"), nullable=True)
    linked_account_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("accounts.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    institution: Mapped[str | None] = mapped_column(Text, nullable=True)
    principal_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(Text, nullable=False)
    annual_rate_bps: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tenure_months: Mapped[int] = mapped_column(Integer, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_day_of_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payment_frequency: Mapped[str] = mapped_column(
        SAEnum(PaymentFrequency, values_callable=_enum_values, create_type=False),
        nullable=False,
        default="monthly",
        server_default="monthly",
    )
    monthly_payment_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    repayment_mode: Mapped[str | None] = mapped_column(
        SAEnum(RepaymentMode, values_callable=_enum_values, create_type=False),
        nullable=True,
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        SAEnum(DebtStatus, values_callable=_enum_values, create_type=False),
        nullable=False,
        default="active",
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
