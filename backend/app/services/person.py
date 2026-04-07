"""Person business logic. No HTTP awareness."""

import uuid

from sqlalchemy import and_, case, func, literal_column, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.debt import Debt
from app.models.debt_payment import DebtPayment
from app.models.enums import DebtStatus, DebtType
from app.models.household import Household
from app.models.person import Person
from app.schemas.person import PersonBalances, PersonCreate, PersonUpdate
from app.services.fx import convert_to_base, get_latest_rates


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


async def compute_person_balances(
    session: AsyncSession,
    household_id: uuid.UUID,
    person_id: int,
) -> PersonBalances:
    """Compute per-currency net balances for a person across all their P2P debts.

    Algorithm per currency:
        lent_total = SUM(principal_minor) WHERE type=personal_lent
        borrowed_total = SUM(principal_minor) WHERE type=personal_borrowed
        lent_paid = SUM(debt_payments.amount_minor) for lent debts
        borrowed_paid = SUM(debt_payments.amount_minor) for borrowed debts
        net = (lent_total - lent_paid) - (borrowed_total - borrowed_paid)
        Positive = they owe you, Negative = you owe them.
    """
    debt_q = (
        select(
            Debt.currency,
            func.coalesce(
                func.sum(
                    case(
                        (Debt.type == DebtType.PERSONAL_LENT, Debt.principal_minor),
                        else_=literal_column("0"),
                    )
                ),
                0,
            ).label("lent_total"),
            func.coalesce(
                func.sum(
                    case(
                        (Debt.type == DebtType.PERSONAL_BORROWED, Debt.principal_minor),
                        else_=literal_column("0"),
                    )
                ),
                0,
            ).label("borrowed_total"),
        )
        .where(
            Debt.household_id == household_id,
            Debt.person_id == person_id,
            Debt.is_active.is_(True),
            Debt.type.in_([DebtType.PERSONAL_LENT, DebtType.PERSONAL_BORROWED]),
        )
        .group_by(Debt.currency)
    )
    debt_rows = (await session.execute(debt_q)).all()

    if not debt_rows:
        return PersonBalances()

    payment_q = (
        select(
            Debt.currency,
            func.coalesce(
                func.sum(
                    case(
                        (Debt.type == DebtType.PERSONAL_LENT, DebtPayment.amount_minor),
                        else_=literal_column("0"),
                    )
                ),
                0,
            ).label("lent_paid"),
            func.coalesce(
                func.sum(
                    case(
                        (Debt.type == DebtType.PERSONAL_BORROWED, DebtPayment.amount_minor),
                        else_=literal_column("0"),
                    )
                ),
                0,
            ).label("borrowed_paid"),
        )
        .join(Debt, and_(DebtPayment.debt_id == Debt.id))
        .where(
            Debt.household_id == household_id,
            Debt.person_id == person_id,
            Debt.is_active.is_(True),
            Debt.type.in_([DebtType.PERSONAL_LENT, DebtType.PERSONAL_BORROWED]),
        )
        .group_by(Debt.currency)
    )
    payment_rows = (await session.execute(payment_q)).all()
    payment_map = {row.currency: (row.lent_paid, row.borrowed_paid) for row in payment_rows}

    by_currency: dict[str, int] = {}
    for row in debt_rows:
        lent_paid, borrowed_paid = payment_map.get(row.currency, (0, 0))
        net = (row.lent_total - lent_paid) - (row.borrowed_total - borrowed_paid)
        if net != 0:
            by_currency[row.currency] = net

    # Look up household base currency
    hh_row = await session.execute(
        select(Household.base_currency).where(Household.id == household_id)
    )
    base_currency = hh_row.scalar_one_or_none() or "EGP"

    # Convert per-currency balances to base currency
    fx_result = await convert_to_base(
        session=session,
        balances=by_currency,
        base_currency=base_currency,
    )

    return PersonBalances(
        by_currency=by_currency,
        total_base_minor=fx_result.total_base_minor,
        base_currency=fx_result.base_currency,
        fx_warnings=fx_result.fx_warnings,
    )


async def compute_persons_balances_bulk(
    session: AsyncSession,
    household_id: uuid.UUID,
    person_ids: list[int],
) -> dict[int, PersonBalances]:
    """Batch-compute balances for multiple persons in 2 queries instead of 2*N."""
    if not person_ids:
        return {}

    debt_q = (
        select(
            Debt.person_id,
            Debt.currency,
            func.coalesce(
                func.sum(
                    case(
                        (Debt.type == DebtType.PERSONAL_LENT, Debt.principal_minor),
                        else_=literal_column("0"),
                    )
                ),
                0,
            ).label("lent_total"),
            func.coalesce(
                func.sum(
                    case(
                        (Debt.type == DebtType.PERSONAL_BORROWED, Debt.principal_minor),
                        else_=literal_column("0"),
                    )
                ),
                0,
            ).label("borrowed_total"),
        )
        .where(
            Debt.household_id == household_id,
            Debt.person_id.in_(person_ids),
            Debt.is_active.is_(True),
            Debt.type.in_([DebtType.PERSONAL_LENT, DebtType.PERSONAL_BORROWED]),
        )
        .group_by(Debt.person_id, Debt.currency)
    )
    debt_rows = (await session.execute(debt_q)).all()

    payment_q = (
        select(
            Debt.person_id,
            Debt.currency,
            func.coalesce(
                func.sum(
                    case(
                        (Debt.type == DebtType.PERSONAL_LENT, DebtPayment.amount_minor),
                        else_=literal_column("0"),
                    )
                ),
                0,
            ).label("lent_paid"),
            func.coalesce(
                func.sum(
                    case(
                        (Debt.type == DebtType.PERSONAL_BORROWED, DebtPayment.amount_minor),
                        else_=literal_column("0"),
                    )
                ),
                0,
            ).label("borrowed_paid"),
        )
        .join(Debt, and_(DebtPayment.debt_id == Debt.id))
        .where(
            Debt.household_id == household_id,
            Debt.person_id.in_(person_ids),
            Debt.is_active.is_(True),
            Debt.type.in_([DebtType.PERSONAL_LENT, DebtType.PERSONAL_BORROWED]),
        )
        .group_by(Debt.person_id, Debt.currency)
    )
    payment_rows = (await session.execute(payment_q)).all()

    # Build payment lookup: (person_id, currency) -> (lent_paid, borrowed_paid)
    payment_map: dict[tuple[int, str], tuple[int, int]] = {}
    for row in payment_rows:
        payment_map[(row.person_id, row.currency)] = (row.lent_paid, row.borrowed_paid)

    # Build result: person_id -> PersonBalances
    result: dict[int, dict[str, int]] = {}
    for row in debt_rows:
        lent_paid, borrowed_paid = payment_map.get((row.person_id, row.currency), (0, 0))
        net = (row.lent_total - lent_paid) - (row.borrowed_total - borrowed_paid)
        if net != 0:
            result.setdefault(row.person_id, {})[row.currency] = net

    # Look up household base currency
    hh_row = await session.execute(
        select(Household.base_currency).where(Household.id == household_id)
    )
    base_currency = hh_row.scalar_one_or_none() or "EGP"

    # Pre-fetch FX rates once for all currencies across all persons
    all_currencies: set[str] = set()
    for by_currency in result.values():
        all_currencies.update(by_currency.keys())
    rates = await get_latest_rates(session, all_currencies) if len(all_currencies) > 1 or (
        len(all_currencies) == 1 and next(iter(all_currencies)) != base_currency
    ) else None

    # Convert each person's balances to base currency
    final: dict[int, PersonBalances] = {}
    for pid, by_currency in result.items():
        fx_result = await convert_to_base(
            session=session,
            balances=by_currency,
            base_currency=base_currency,
            rates=rates,
        )
        final[pid] = PersonBalances(
            by_currency=by_currency,
            total_base_minor=fx_result.total_base_minor,
            base_currency=fx_result.base_currency,
            fx_warnings=fx_result.fx_warnings,
        )

    # Fill missing person_ids with empty balances
    for pid in person_ids:
        if pid not in final:
            final[pid] = PersonBalances(base_currency=base_currency)

    return final
