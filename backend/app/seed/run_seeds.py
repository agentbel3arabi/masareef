"""Run seed data insertion for financial institutions and system categories."""

import asyncio

from sqlalchemy import select, update

from app.database import async_session_factory, engine
from app.models.category import Category
from app.models.financial_institution import FinancialInstitution
from app.seed.institutions import BANKS, BNPL_PROVIDERS, DIGITAL_WALLET_PROVIDERS
from app.seed.system_categories import EXISTING_SYSTEM_CATEGORY_NAMES, SYSTEM_CATEGORIES


async def _upsert_institution(session, institution_data: dict, institution_type: str) -> None:
    """Insert a single institution if it doesn't already exist (by slug + type)."""
    existing = await session.execute(
        select(FinancialInstitution).where(
            FinancialInstitution.slug == institution_data["slug"],
            FinancialInstitution.type == institution_type,
        )
    )
    if existing.scalar_one_or_none() is None:
        inst = FinancialInstitution(
            type=institution_type,
            is_predefined=True,
            country="EG",
            logo_url=None,  # No logo SVGs yet — frontend uses initials fallback
            **institution_data,
        )
        session.add(inst)


async def seed_institutions(session) -> None:
    """Insert predefined financial institutions (banks, BNPL, digital wallets). Idempotent."""
    for bank in BANKS:
        await _upsert_institution(session, bank, "bank")

    for provider in BNPL_PROVIDERS:
        await _upsert_institution(session, provider, "bnpl")

    for provider in DIGITAL_WALLET_PROVIDERS:
        await _upsert_institution(session, provider, "digital_wallet_provider")

    await session.flush()


async def seed_system_categories(session) -> None:
    """Insert system categories and mark existing ones as system."""
    for cat_data in SYSTEM_CATEGORIES:
        existing = await session.execute(
            select(Category).where(Category.name_en == cat_data["name_en"])
        )
        if existing.scalar_one_or_none() is None:
            cat = Category(**cat_data)
            session.add(cat)

    # Mark existing Transfer and Uncategorized as system
    await session.execute(
        update(Category)
        .where(Category.name_en.in_(EXISTING_SYSTEM_CATEGORY_NAMES))
        .values(is_system=True)
    )
    await session.flush()


async def main() -> None:
    async with async_session_factory() as session:
        async with session.begin():
            await seed_institutions(session)
            await seed_system_categories(session)

    await engine.dispose()
    print("Seeds complete.")


if __name__ == "__main__":
    asyncio.run(main())
