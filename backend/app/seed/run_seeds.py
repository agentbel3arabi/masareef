"""Run seed data insertion for financial institutions and system categories."""

import asyncio

from sqlalchemy import select, update

from app.database import async_session_factory, engine
from app.models.category import Category
from app.models.financial_institution import FinancialInstitution
from app.seed.institutions import BANKS, BNPL_PROVIDERS, DIGITAL_WALLET_PROVIDERS
from app.seed.system_categories import EXISTING_SYSTEM_CATEGORY_NAMES, SYSTEM_CATEGORIES


async def seed_institutions(session) -> None:
    """Insert predefined financial institutions (banks, BNPL, digital wallets)."""
    for bank in BANKS:
        inst = FinancialInstitution(
            type="bank",
            is_predefined=True,
            country="EG",
            logo_url=f"/institutions/{bank['slug']}.svg",
            **bank,
        )
        session.add(inst)

    for provider in BNPL_PROVIDERS:
        inst = FinancialInstitution(
            type="bnpl",
            is_predefined=True,
            country="EG",
            logo_url=f"/institutions/{provider['slug']}.svg",
            **provider,
        )
        session.add(inst)

    for provider in DIGITAL_WALLET_PROVIDERS:
        inst = FinancialInstitution(
            type="digital_wallet_provider",
            is_predefined=True,
            country="EG",
            logo_url=f"/institutions/{provider['slug']}.svg",
            **provider,
        )
        session.add(inst)

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
