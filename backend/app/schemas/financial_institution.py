from __future__ import annotations

from pydantic import BaseModel, Field


class InstitutionResponse(BaseModel):
    id: int
    slug: str
    name_en: str
    name_ar: str
    type: str
    logo_url: str | None = None
    bic_swift: str | None = None
    country: str = "EG"
    is_predefined: bool
    is_popular: bool = False

    model_config = {"from_attributes": True}


class InstitutionListResponse(BaseModel):
    popular: list[InstitutionResponse] = []
    all: list[InstitutionResponse] = []


class InstitutionCreate(BaseModel):
    name_en: str = Field(..., min_length=1, max_length=200)
    name_ar: str = Field(..., min_length=1, max_length=200)
    type: str = Field(..., pattern="^(bank|bnpl|digital_wallet_provider)$")


class InstitutionUpdate(BaseModel):
    name_en: str | None = Field(None, min_length=1, max_length=200)
    name_ar: str | None = Field(None, min_length=1, max_length=200)


class InstitutionSummary(BaseModel):
    institution: InstitutionResponse
    accounts: list  # Will use AccountResponse from account schemas
    summary: InstitutionSummaryStats


class InstitutionSummaryStats(BaseModel):
    total_assets_minor: int = 0
    total_liabilities_minor: int = 0
    total_base_minor: int = 0
    base_currency: str = "EGP"
    is_approximate: bool = False
    account_count: int = 0
