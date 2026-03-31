"""Schemas for import template CRUD."""
import datetime

from pydantic import BaseModel


class ImportTemplateCreate(BaseModel):
    name: str
    name_ar: str | None = None
    format: str  # 'csv' | 'excel'
    columns: dict[str, str]
    date_format: str = "DD/MM/YYYY"
    encoding: str = "utf-8"
    skip_rows: int = 0
    sheet_name: str | None = None
    notes: str | None = None
    link_to_account_id: int | None = None  # optionally link on creation


class ImportTemplateUpdate(BaseModel):
    name: str | None = None
    name_ar: str | None = None
    columns: dict[str, str] | None = None
    date_format: str | None = None
    encoding: str | None = None
    skip_rows: int | None = None
    sheet_name: str | None = None
    notes: str | None = None


class ImportTemplateResponse(BaseModel):
    id: int
    household_id: str
    name: str
    name_ar: str | None
    format: str
    columns: dict[str, str]
    date_format: str
    encoding: str
    skip_rows: int
    sheet_name: str | None
    notes: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    linked_account_ids: list[int] = []
