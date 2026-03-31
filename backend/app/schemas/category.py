from __future__ import annotations

from pydantic import BaseModel

from app.models.enums import CategoryType


class CategoryCreate(BaseModel):
    name_en: str
    name_ar: str | None = None
    type: CategoryType
    icon: str | None = None
    color: str | None = None


class CategoryUpdate(BaseModel):
    name_en: str | None = None
    name_ar: str | None = None
    icon: str | None = None
    color: str | None = None


class CategoryResponse(BaseModel):
    id: int
    name_en: str
    name_ar: str | None = None
    type: str
    icon: str | None = None
    color: str | None = None
    is_predefined: bool
    sort_order: int

    model_config = {"from_attributes": True}
