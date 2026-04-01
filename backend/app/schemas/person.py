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


class PersonResponse(BaseModel):
    id: int
    name: str
    name_ar: str | None = None
    phone: str | None = None
    email: str | None = None
    relationship: PersonRelationship | None = None
    notes: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}
