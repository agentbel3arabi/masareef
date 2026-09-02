import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class RuleCreate(BaseModel):
    pattern: str = Field(max_length=200)
    match_type: str = "contains"
    category_id: int


class RuleUpdate(BaseModel):
    pattern: str | None = Field(default=None, max_length=200)
    category_id: int | None = None


class RuleResponse(BaseModel):
    id: int
    household_id: uuid.UUID
    pattern: str
    match_type: str
    category_id: int
    confidence: float
    hit_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CategorySuggestion(BaseModel):
    """Structured output from LLM via instructor."""

    category_id: int = Field(description="ID of the matched category")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score")
    reasoning: str = Field(description="Why this category was chosen")


class BatchCategorizationRequest(BaseModel):
    transaction_ids: list[int]


class CategorizationResult(BaseModel):
    transaction_id: int
    category_id: int | None
    confidence: float | None
    source: str  # "rule", "ai", "uncategorized"


class BatchCategorizationResponse(BaseModel):
    results: list[CategorizationResult]


class ApproveAllRequest(BaseModel):
    transaction_ids: list[int]


class AIUsageResponse(BaseModel):
    tokens_used: int
    monthly_limit: int | None
    year_month: str

    model_config = {"from_attributes": True}


class CorrectionRequest(BaseModel):
    transaction_id: int
    category_id: int
