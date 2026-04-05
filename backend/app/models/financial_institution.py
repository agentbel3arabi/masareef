import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import InstitutionType

_enum_values = lambda e: [x.value for x in e]  # noqa: E731


class FinancialInstitution(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "financial_institutions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    name_en: Mapped[str] = mapped_column(Text, nullable=False)
    name_ar: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[InstitutionType] = mapped_column(
        SAEnum(InstitutionType, values_callable=_enum_values, create_type=False),
        nullable=False,
    )
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    bic_swift: Mapped[str | None] = mapped_column(Text, nullable=True)
    country: Mapped[str] = mapped_column(String(3), nullable=False, server_default="EG")
    is_predefined: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    is_popular: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    household_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id"), nullable=True
    )
