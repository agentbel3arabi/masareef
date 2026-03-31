import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import TransactionType


class TransactionCreate(BaseModel):
    account_id: int
    date: datetime.date
    description: str
    amount_minor: int = Field(gt=0)  # Always positive — backend computes sign from type
    type: TransactionType
    category_id: int | None = None
    notes: str | None = None
    gam3eya_id: int | None = None
    asset_id: int | None = None


class TransactionUpdate(BaseModel):
    date: datetime.date | None = None
    description: str | None = None
    amount_minor: int | None = Field(default=None, gt=0)
    type: TransactionType | None = None
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
    icon: str | None = None

    model_config = {"from_attributes": True}


class TransactionResponse(BaseModel):
    id: int
    account_id: int
    date: datetime.date
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
