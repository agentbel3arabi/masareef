"""Tests for FX conversion helper."""
import datetime as dt
import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ExchangeRate, Household, HouseholdMember
from app.models.enums import HouseholdRole
from app.services.fx import convert_to_base, get_latest_rates

TEST_HOUSEHOLD_ID = uuid.uuid4()
TEST_USER_ID = uuid.uuid4()


async def _seed_household(session: AsyncSession, base_currency: str = "EGP") -> None:
    """Seed a household + member with the given base_currency."""
    household = Household(
        id=TEST_HOUSEHOLD_ID,
        name="Test Household",
        base_currency=base_currency,
    )
    session.add(household)
    member = HouseholdMember(
        household_id=TEST_HOUSEHOLD_ID,
        user_id=TEST_USER_ID,
        role=HouseholdRole.ADMIN,
        display_name="Tester",
    )
    session.add(member)
    await session.flush()


async def _seed_rates(session: AsyncSession) -> None:
    """Seed exchange rates: USD→EGP=48.50, USD→GBP=0.79, USD→KWD=0.307."""
    today = dt.date.today()
    rates = [
        ExchangeRate(
            date=today,
            from_currency="USD",
            to_currency="EGP",
            rate_scaled=485000,  # 48.50
            source="test",
        ),
        ExchangeRate(
            date=today,
            from_currency="USD",
            to_currency="GBP",
            rate_scaled=7900,  # 0.79
            source="test",
        ),
        ExchangeRate(
            date=today,
            from_currency="USD",
            to_currency="KWD",
            rate_scaled=3070,  # 0.307
            source="test",
        ),
    ]
    session.add_all(rates)
    await session.flush()


@pytest.mark.asyncio
async def test_get_latest_rates_returns_most_recent(db_session: AsyncSession) -> None:
    """get_latest_rates returns the most recent rate per currency pair."""
    today = dt.date.today()
    yesterday = today - dt.timedelta(days=1)
    # Old rate
    db_session.add(
        ExchangeRate(
            date=yesterday,
            from_currency="USD",
            to_currency="EGP",
            rate_scaled=480000,
            source="test",
        )
    )
    # New rate
    db_session.add(
        ExchangeRate(
            date=today,
            from_currency="USD",
            to_currency="EGP",
            rate_scaled=485000,
            source="test",
        )
    )
    await db_session.flush()

    rates = await get_latest_rates(db_session, currencies={"EGP"})
    assert rates["EGP"] == 485000


@pytest.mark.asyncio
async def test_get_latest_rates_missing_currency(db_session: AsyncSession) -> None:
    """get_latest_rates omits currencies with no rate row."""
    rates = await get_latest_rates(db_session, currencies={"EGP", "JPY"})
    assert "EGP" not in rates
    assert "JPY" not in rates


@pytest.mark.asyncio
async def test_convert_same_currency(db_session: AsyncSession) -> None:
    """Converting to the same currency returns the amount unchanged."""
    result = await convert_to_base(
        session=db_session,
        balances={"EGP": 100_000},
        base_currency="EGP",
    )
    assert result.total_base_minor == 100_000
    assert result.fx_warnings == []


@pytest.mark.asyncio
async def test_convert_egp_to_egp_base(db_session: AsyncSession) -> None:
    """When base is EGP and balance is EGP, total equals the balance."""
    await _seed_rates(db_session)
    result = await convert_to_base(
        session=db_session,
        balances={"EGP": 500_000},
        base_currency="EGP",
    )
    assert result.total_base_minor == 500_000
    assert result.fx_warnings == []


@pytest.mark.asyncio
async def test_convert_gbp_to_egp_base(db_session: AsyncSession) -> None:
    """Convert GBP balance to EGP base via USD hub.

    GBP→USD: 10_000 (100.00 GBP) * 10_000 / 7_900 = 12_658 (≈126.58 USD minor)
    USD→EGP: 12_658 * 485_000 / 10_000 = 613_913 (≈6,139.13 EGP)
    """
    await _seed_rates(db_session)
    result = await convert_to_base(
        session=db_session,
        balances={"GBP": 10_000},
        base_currency="EGP",
    )
    expected = 10_000 * 10_000 // 7_900 * 485_000 // 10_000
    assert result.total_base_minor == expected
    assert result.fx_warnings == []


@pytest.mark.asyncio
async def test_convert_usd_to_egp_base(db_session: AsyncSession) -> None:
    """Convert USD balance to EGP base (single hop)."""
    await _seed_rates(db_session)
    result = await convert_to_base(
        session=db_session,
        balances={"USD": 10_000},
        base_currency="EGP",
    )
    assert result.total_base_minor == 485_000
    assert result.fx_warnings == []


@pytest.mark.asyncio
async def test_convert_multi_currency(db_session: AsyncSession) -> None:
    """Multiple currencies are summed after conversion."""
    await _seed_rates(db_session)
    result = await convert_to_base(
        session=db_session,
        balances={"EGP": 100_000, "USD": 10_000},
        base_currency="EGP",
    )
    assert result.total_base_minor == 100_000 + 485_000
    assert result.fx_warnings == []


@pytest.mark.asyncio
async def test_convert_missing_rate_adds_warning(db_session: AsyncSession) -> None:
    """Currencies without exchange rates are skipped and added to fx_warnings."""
    await _seed_rates(db_session)
    result = await convert_to_base(
        session=db_session,
        balances={"JPY": 500_000},
        base_currency="EGP",
    )
    assert result.total_base_minor == 0
    assert "JPY" in result.fx_warnings


@pytest.mark.asyncio
async def test_convert_to_usd_base(db_session: AsyncSession) -> None:
    """When base is USD, EGP→USD is a single hop."""
    await _seed_rates(db_session)
    result = await convert_to_base(
        session=db_session,
        balances={"EGP": 485_000},
        base_currency="USD",
    )
    assert result.total_base_minor == 10_000
    assert result.fx_warnings == []


@pytest.mark.asyncio
async def test_convert_negative_balance(db_session: AsyncSession) -> None:
    """Negative balances (you owe them) convert correctly."""
    await _seed_rates(db_session)
    result = await convert_to_base(
        session=db_session,
        balances={"USD": -10_000},
        base_currency="EGP",
    )
    assert result.total_base_minor == -485_000
    assert result.fx_warnings == []


@pytest.mark.asyncio
async def test_convert_empty_balances(db_session: AsyncSession) -> None:
    """Empty balances dict returns zero."""
    result = await convert_to_base(
        session=db_session,
        balances={},
        base_currency="EGP",
    )
    assert result.total_base_minor == 0
    assert result.fx_warnings == []
