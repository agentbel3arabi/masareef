from pydantic import BaseModel, Field

from app.models.enums import PersonRelationship


class PersonCreate(BaseModel):
    name: str = Field(min_length=1)
    name_ar: str | None = None
    phone: str | None = None
    email: str | None = None
    relationship: PersonRelationship | None = None
    notes: str | None = None


class PersonUpdate(BaseModel):
    name: str | None = None
    name_ar: str | None = None
    phone: str | None = None
    email: str | None = None
    relationship: PersonRelationship | None = None
    notes: str | None = None


class CurrencyBalance(BaseModel):
    currency: str
    net_minor: int  # positive = they owe you, negative = you owe them


class PersonBalances(BaseModel):
    by_currency: dict[str, int] = {}  # currency → net_minor
    total_base_minor: int = 0  # converted to household base currency
    base_currency: str = "EGP"
    fx_warnings: list[str] = []  # currencies with no available rate


class PersonResponse(BaseModel):
    id: int
    name: str
    name_ar: str | None = None
    phone: str | None = None
    email: str | None = None
    relationship: PersonRelationship | None = None
    notes: str | None = None
    is_active: bool
    balances: PersonBalances | None = None

    model_config = {"from_attributes": True}
