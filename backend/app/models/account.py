import uuid
from datetime import date

from sqlalchemy import BigInteger, CheckConstraint, Date, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import AccountType

_enum_values = lambda e: [x.value for x in e]  # noqa: E731


class Account(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "accounts"
    __table_args__ = (
        CheckConstraint(
            "billing_cycle_day >= 1 AND billing_cycle_day <= 31",
            name="ck_accounts_billing_cycle_day",
        ),
        CheckConstraint(
            "payment_due_day >= 1 AND payment_due_day <= 31",
            name="ck_accounts_payment_due_day",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    name_ar: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[AccountType] = mapped_column(
        SAEnum(AccountType, values_callable=_enum_values, create_type=False), nullable=False
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    balance_minor: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")
    institution: Mapped[str | None] = mapped_column(Text, nullable=True)
    credit_limit: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    billing_cycle_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payment_due_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    opened_at: Mapped[date | None] = mapped_column(Date, nullable=True)
