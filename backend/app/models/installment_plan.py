import uuid
from datetime import date

from sqlalchemy import BigInteger, Date, ForeignKey, Index, Integer, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import InstallmentType, LifecycleStatus

_enum_values = lambda e: [x.value for x in e]  # noqa: E731


class InstallmentPlan(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "installment_plans"
    __table_args__ = (
        Index("ix_installment_plans_household_type", "household_id", "type"),
        Index("ix_installment_plans_household_source", "household_id", "source_account_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    household_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    type: Mapped[str] = mapped_column(
        SAEnum(InstallmentType, values_callable=_enum_values, create_type=False),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    merchant_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_account_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("accounts.id"), nullable=True
    )
    linked_account_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("accounts.id"), nullable=True
    )
    total_amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    monthly_amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    total_months: Mapped[int] = mapped_column(Integer, nullable=False)
    start_month: Mapped[date] = mapped_column(Date, nullable=False)
    currency: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        SAEnum(LifecycleStatus, values_callable=_enum_values, create_type=False),
        nullable=False,
        default="active",
    )
