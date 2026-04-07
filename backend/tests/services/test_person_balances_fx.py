"""Integration tests: person balances with FX conversion to base currency."""

import datetime as dt

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Debt,
    ExchangeRate,
    Household,
    HouseholdMember,
    Person,
)
from app.models.enums import DebtType, HouseholdRole
from app.services.fx import convert_to_base, get_latest_rates
from app.services.person import compute_person_balances, compute_persons_balances_bulk
from tests.conftest import TEST_HOUSEHOLD_ID, TEST_USER_ID


async def _seed_household(session: AsyncSession, base_currency: str = "EGP") -> None:
    session.add(
        Household(
            id=TEST_HOUSEHOLD_ID,
            name="Test HH",
            base_currency=base_currency,
        )
    )
    session.add(
        HouseholdMember(
            household_id=TEST_HOUSEHOLD_ID,
            user_id=TEST_USER_ID,
            role=HouseholdRole.ADMIN,
            display_name="Tester",
        )
    )
    await session.flush()


async def _seed_person(session: AsyncSession) -> int:
    person = Person(
        household_id=TEST_HOUSEHOLD_ID,
        name="Ahmed",
    )
    session.add(person)
    await session.flush()
    return person.id


async def _seed_rates(session: AsyncSession) -> None:
    today = dt.date.today()
    session.add(
        ExchangeRate(
            date=today,
            from_currency="USD",
            to_currency="EGP",
            rate_scaled=485000,
            source="test",
        )
    )
    session.add(
        ExchangeRate(
            date=today,
            from_currency="USD",
            to_currency="GBP",
            rate_scaled=7900,
            source="test",
        )
    )
    await session.flush()


@pytest.mark.asyncio
async def test_single_currency_same_as_base(db_session: AsyncSession) -> None:
    """EGP balance with EGP base → total equals the balance, no FX needed."""
    await _seed_household(db_session, "EGP")
    person_id = await _seed_person(db_session)
    db_session.add(
        Debt(
            household_id=TEST_HOUSEHOLD_ID,
            type=DebtType.PERSONAL_LENT,
            name="Test",
            person_id=person_id,
            principal_minor=50_000,
            currency="EGP",
            annual_rate_bps=0,
            tenure_months=0,
            monthly_payment_minor=0,
            start_date=dt.date.today(),
        )
    )
    await db_session.flush()

    result = await compute_person_balances(db_session, TEST_HOUSEHOLD_ID, person_id)
    assert result.total_base_minor == 50_000
    assert result.base_currency == "EGP"
    assert result.fx_warnings == []


@pytest.mark.asyncio
async def test_multi_currency_converts_to_base(db_session: AsyncSession) -> None:
    """GBP + EGP balances converted to EGP base."""
    await _seed_household(db_session, "EGP")
    await _seed_rates(db_session)
    person_id = await _seed_person(db_session)

    # Lent 100.00 EGP
    db_session.add(
        Debt(
            household_id=TEST_HOUSEHOLD_ID,
            type=DebtType.PERSONAL_LENT,
            name="EGP debt",
            person_id=person_id,
            principal_minor=10_000,
            currency="EGP",
            annual_rate_bps=0,
            tenure_months=0,
            monthly_payment_minor=0,
            start_date=dt.date.today(),
        )
    )
    # Lent 100.00 GBP
    db_session.add(
        Debt(
            household_id=TEST_HOUSEHOLD_ID,
            type=DebtType.PERSONAL_LENT,
            name="GBP debt",
            person_id=person_id,
            principal_minor=10_000,
            currency="GBP",
            annual_rate_bps=0,
            tenure_months=0,
            monthly_payment_minor=0,
            start_date=dt.date.today(),
        )
    )
    await db_session.flush()

    result = await compute_person_balances(db_session, TEST_HOUSEHOLD_ID, person_id)

    # GBP→USD: 10_000 * 10_000 / 7_900 = 12_658
    # USD→EGP: 12_658 * 485_000 / 10_000 = 613_913
    gbp_in_egp = 10_000 * 10_000 // 7_900 * 485_000 // 10_000
    assert result.total_base_minor == 10_000 + gbp_in_egp
    assert result.base_currency == "EGP"
    assert result.fx_warnings == []


@pytest.mark.asyncio
async def test_missing_rate_adds_warning(db_session: AsyncSession) -> None:
    """Currency with no exchange rate is skipped and reported as warning."""
    await _seed_household(db_session, "EGP")
    person_id = await _seed_person(db_session)

    # Lent 100.00 JPY — no JPY rate seeded
    db_session.add(
        Debt(
            household_id=TEST_HOUSEHOLD_ID,
            type=DebtType.PERSONAL_LENT,
            name="JPY debt",
            person_id=person_id,
            principal_minor=10_000,
            currency="JPY",
            annual_rate_bps=0,
            tenure_months=0,
            monthly_payment_minor=0,
            start_date=dt.date.today(),
        )
    )
    await db_session.flush()

    result = await compute_person_balances(db_session, TEST_HOUSEHOLD_ID, person_id)
    assert result.total_base_minor == 0
    assert "JPY" in result.fx_warnings


@pytest.mark.asyncio
async def test_convert_to_base_with_prefetched_rates(db_session: AsyncSession) -> None:
    """convert_to_base with explicit rates param returns same result as DB fetch."""
    await _seed_household(db_session, "EGP")
    await _seed_rates(db_session)

    balances = {"GBP": 10_000, "EGP": 5_000}

    # Without pre-fetched rates (DB fetch)
    result_db = await convert_to_base(db_session, balances, "EGP")

    # With pre-fetched rates
    rates = await get_latest_rates(db_session, {"GBP", "EGP"})
    result_prefetched = await convert_to_base(db_session, balances, "EGP", rates=rates)

    assert result_prefetched.total_base_minor == result_db.total_base_minor
    assert result_prefetched.fx_warnings == result_db.fx_warnings


@pytest.mark.asyncio
async def test_convert_to_base_rates_none_falls_back(db_session: AsyncSession) -> None:
    """convert_to_base with rates=None still works (backward compat)."""
    await _seed_household(db_session, "EGP")
    await _seed_rates(db_session)

    balances = {"GBP": 10_000}
    result = await convert_to_base(db_session, balances, "EGP", rates=None)
    # Should compute via DB — GBP→USD→EGP
    expected = 10_000 * 10_000 // 7_900 * 485_000 // 10_000
    assert result.total_base_minor == expected


@pytest.mark.asyncio
async def test_bulk_balances_uses_batch_fx(db_session: AsyncSession) -> None:
    """compute_persons_balances_bulk with mixed currencies works correctly."""
    await _seed_household(db_session, "EGP")
    await _seed_rates(db_session)

    # Create 3 persons with different currency debts
    persons = []
    for name, currency in [("Ali", "EGP"), ("Sara", "GBP"), ("Mona", "EGP")]:
        p = Person(household_id=TEST_HOUSEHOLD_ID, name=name)
        db_session.add(p)
        await db_session.flush()
        persons.append((p.id, currency))

        db_session.add(
            Debt(
                household_id=TEST_HOUSEHOLD_ID,
                type=DebtType.PERSONAL_LENT,
                name=f"{name} debt",
                person_id=p.id,
                principal_minor=10_000,
                currency=currency,
                annual_rate_bps=0,
                tenure_months=0,
                monthly_payment_minor=0,
                start_date=dt.date.today(),
            )
        )
    await db_session.flush()

    person_ids = [pid for pid, _ in persons]
    results = await compute_persons_balances_bulk(db_session, TEST_HOUSEHOLD_ID, person_ids)

    # Ali: 10_000 EGP (same as base)
    assert results[persons[0][0]].total_base_minor == 10_000
    # Sara: 10_000 GBP converted to EGP
    gbp_in_egp = 10_000 * 10_000 // 7_900 * 485_000 // 10_000
    assert results[persons[1][0]].total_base_minor == gbp_in_egp
    # Mona: 10_000 EGP (same as base)
    assert results[persons[2][0]].total_base_minor == 10_000
