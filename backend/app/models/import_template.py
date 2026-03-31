"""Import template models — user-saved column mappings for reuse."""
import uuid
from typing import Any

from sqlalchemy import JSON, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class ImportTemplate(SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "import_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    name_ar: Mapped[str | None] = mapped_column(Text, nullable=True)
    format: Mapped[str] = mapped_column(Text, nullable=False)  # 'csv' | 'excel'
    columns: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    date_format: Mapped[str] = mapped_column(Text, nullable=False, server_default="DD/MM/YYYY")
    encoding: Mapped[str] = mapped_column(Text, nullable=False, server_default="utf-8")
    skip_rows: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    sheet_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class AccountImportTemplate(Base):
    """Links an account to its default import template (one per account)."""

    __tablename__ = "account_import_templates"

    account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("accounts.id"), primary_key=True
    )
    template_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("import_templates.id"), nullable=False
    )
