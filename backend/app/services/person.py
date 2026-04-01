"""Person business logic. No HTTP awareness."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.debt import Debt
from app.models.enums import DebtStatus
from app.models.person import Person
from app.schemas.person import PersonCreate, PersonUpdate


async def list_persons(
    session: AsyncSession,
    household_id: uuid.UUID,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Person], int]:
    count_q = select(func.count(Person.id)).where(
        Person.household_id == household_id,
        Person.is_active.is_(True),
    )
    total = (await session.execute(count_q)).scalar_one()

    q = (
        select(Person)
        .where(Person.household_id == household_id, Person.is_active.is_(True))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .order_by(Person.id)
    )
    result = await session.execute(q)
    return list(result.scalars().all()), total


async def get_person(
    session: AsyncSession,
    household_id: uuid.UUID,
    person_id: int,
) -> Person | None:
    q = select(Person).where(
        Person.id == person_id,
        Person.household_id == household_id,
        Person.is_active.is_(True),
    )
    result = await session.execute(q)
    return result.scalar_one_or_none()


async def create_person(
    session: AsyncSession,
    household_id: uuid.UUID,
    data: PersonCreate,
) -> Person:
    person = Person(
        household_id=household_id,
        name=data.name,
        name_ar=data.name_ar,
        phone=data.phone,
        email=data.email,
        relationship=data.relationship,
        notes=data.notes,
    )
    session.add(person)
    await session.flush()
    return person


async def update_person(
    session: AsyncSession,
    person: Person,
    data: PersonUpdate,
) -> Person:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(person, field, value)
    await session.flush()
    return person


async def has_active_debts(
    session: AsyncSession,
    person_id: int,
) -> bool:
    """Check if a person has any active debts."""
    q = select(func.count(Debt.id)).where(
        Debt.person_id == person_id,
        Debt.is_active.is_(True),
        Debt.status == DebtStatus.ACTIVE,
    )
    count = (await session.execute(q)).scalar_one()
    return count > 0


async def soft_delete_person(
    session: AsyncSession,
    person: Person,
) -> None:
    person.is_active = False
    await session.flush()
