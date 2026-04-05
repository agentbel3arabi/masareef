import re
import unicodedata
import uuid

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.financial_institution import FinancialInstitution


def slugify(text: str) -> str:
    """Generate URL-safe slug from text."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[-\s]+", "-", text).strip("-")


async def list_institutions(
    session: AsyncSession,
    household_id: uuid.UUID,
    *,
    inst_type: str,
    search: str | None = None,
) -> dict:
    """List institutions filtered by type with popular/all grouping."""
    base_filter = and_(
        FinancialInstitution.is_active.is_(True),
        FinancialInstitution.type == inst_type,
        or_(
            FinancialInstitution.household_id.is_(None),
            FinancialInstitution.household_id == household_id,
        ),
    )

    if search:
        search_filter = or_(
            func.lower(FinancialInstitution.name_en).contains(search.lower()),
            FinancialInstitution.name_ar.contains(search),
        )
        stmt = (
            select(FinancialInstitution)
            .where(and_(base_filter, search_filter))
            .order_by(FinancialInstitution.name_en)
        )
        results = (await session.execute(stmt)).scalars().all()
        return {"popular": [], "all": list(results)}

    # No search — split into popular and all
    stmt = select(FinancialInstitution).where(base_filter)
    results = (await session.execute(stmt)).scalars().all()

    popular = sorted(
        [r for r in results if r.is_popular],
        key=lambda r: r.sort_order,
    )
    all_sorted = sorted(results, key=lambda r: r.name_en.lower())

    return {"popular": popular, "all": all_sorted}


async def get_institution_by_slug(
    session: AsyncSession,
    household_id: uuid.UUID,
    slug: str,
) -> FinancialInstitution | None:
    stmt = select(FinancialInstitution).where(
        and_(
            FinancialInstitution.slug == slug,
            FinancialInstitution.is_active.is_(True),
            or_(
                FinancialInstitution.household_id.is_(None),
                FinancialInstitution.household_id == household_id,
            ),
        )
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def get_institution_by_id(
    session: AsyncSession,
    household_id: uuid.UUID,
    institution_id: int,
) -> FinancialInstitution | None:
    stmt = select(FinancialInstitution).where(
        and_(
            FinancialInstitution.id == institution_id,
            FinancialInstitution.is_active.is_(True),
            or_(
                FinancialInstitution.household_id.is_(None),
                FinancialInstitution.household_id == household_id,
            ),
        )
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def create_custom_institution(
    session: AsyncSession,
    household_id: uuid.UUID,
    name_en: str,
    name_ar: str,
    inst_type: str,
) -> FinancialInstitution:
    institution = FinancialInstitution(
        slug=slugify(name_en),
        name_en=name_en,
        name_ar=name_ar,
        type=inst_type,
        household_id=household_id,
        is_predefined=False,
        country="EG",
    )
    session.add(institution)
    await session.flush()
    return institution


async def update_custom_institution(
    session: AsyncSession,
    institution: FinancialInstitution,
    name_en: str | None = None,
    name_ar: str | None = None,
) -> FinancialInstitution:
    if name_en is not None:
        institution.name_en = name_en
    if name_ar is not None:
        institution.name_ar = name_ar
    await session.flush()
    return institution


async def soft_delete_institution(
    session: AsyncSession,
    institution: FinancialInstitution,
) -> None:
    institution.is_active = False
    await session.flush()


async def count_active_accounts(
    session: AsyncSession,
    institution_id: int,
) -> int:
    from app.models.account import Account

    stmt = select(func.count()).where(
        and_(
            Account.institution_id == institution_id,
            Account.is_active.is_(True),
        )
    )
    result = await session.execute(stmt)
    return result.scalar_one()
