# backend/app/schemas/household.py
import uuid
from typing import Literal

from pydantic import BaseModel, Field


class HouseholdCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    base_currency: Literal["EGP", "USD", "EUR", "GBP", "SAR", "AED", "KWD"] = "EGP"


class HouseholdUpdate(BaseModel):
    base_currency: Literal["EGP", "USD", "EUR", "GBP", "SAR", "AED", "KWD"] | None = None


class HouseholdResponse(BaseModel):
    id: uuid.UUID
    name: str
    base_currency: str

    model_config = {"from_attributes": True}
