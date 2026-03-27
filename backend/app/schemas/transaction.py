from __future__ import annotations

from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class TransactionCreate(BaseModel):
    account_id: int
    date: date
    description: str = ""
    amount_minor: int  # Always positive — backend computes sign from type
    type: str  # "debit" or "credit"
    currency: str
    category_id: int | None = None
    notes: str | None = None
    gam3eya_id: int | None = None
    asset_id: int | None = None


class TransactionUpdate(BaseModel):
    date: Optional[date] = None  # noqa: UP045 Field shadowing requires Optional instead of |
    description: str | None = None
    amount_minor: int | None = None
    type: str | None = None
    category_id: int | None = None
    notes: str | None = None


class SplitItem(BaseModel):
    category_id: int
    amount_minor: int = Field(gt=0)
    notes: str | None = None


class SplitRequest(BaseModel):
    splits: list[SplitItem]


class CategorizeRequest(BaseModel):
    category_id: int


class BulkDeleteRequest(BaseModel):
    ids: list[int]


class BulkCategorizeRequest(BaseModel):
    ids: list[int]
    category_id: int


class CategoryEmbedded(BaseModel):
    id: int
    name_en: str
    name_ar: str | None = None
    color: str | None = None

    model_config = {"from_attributes": True}


class TransactionResponse(BaseModel):
    id: int
    account_id: int
    date: date
    description: str
    amount_minor: int
    currency: str
    type: str
    category: CategoryEmbedded | None = None
    is_split: bool = False
    transfer_id: UUID | None = None
    asset_id: int | None = None
    ai_categorized: bool | None = False
    ai_confidence: float | None = None
    notes: str | None = None

    model_config = {"from_attributes": True}
