from datetime import date

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.debt import Debt
from app.models.debt_payment import DebtPayment
from app.models.enums import DebtStatus, DebtType
from app.models.person import Person
from app.services.person import compute_person_balances
from tests.conftest import TEST_HOUSEHOLD_ID


@pytest.mark.asyncio
async def test_single_currency_lent_no_payments(db_session: AsyncSession):
    """Person owes us 500k EGP, no payments made."""
    person = Person(household_id=TEST_HOUSEHOLD_ID, name="Ahmed")
    db_session.add(person)
    await db_session.flush()

    debt = Debt(
        household_id=TEST_HOUSEHOLD_ID,
        type=DebtType.PERSONAL_LENT,
        person_id=person.id,
        name="Lent to Ahmed",
        principal_minor=500000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=1,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=500000,
        status=DebtStatus.ACTIVE,
    )
    db_session.add(debt)
    await db_session.commit()

    balances = await compute_person_balances(db_session, TEST_HOUSEHOLD_ID, person.id)
    assert len(balances.by_currency) == 1
    assert balances.by_currency["EGP"] == 500000  # they owe us 500k


@pytest.mark.asyncio
async def test_lent_minus_borrowed_net(db_session: AsyncSession):
    """Lent 500k, borrowed 200k in EGP → net = +300k (they owe us)."""
    person = Person(household_id=TEST_HOUSEHOLD_ID, name="Sara")
    db_session.add(person)
    await db_session.flush()

    lent = Debt(
        household_id=TEST_HOUSEHOLD_ID,
        type=DebtType.PERSONAL_LENT,
        person_id=person.id,
        name="Lent to Sara",
        principal_minor=500000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=1,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=500000,
        status=DebtStatus.ACTIVE,
    )
    borrowed = Debt(
        household_id=TEST_HOUSEHOLD_ID,
        type=DebtType.PERSONAL_BORROWED,
        person_id=person.id,
        name="Borrowed from Sara",
        principal_minor=200000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=1,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=200000,
        status=DebtStatus.ACTIVE,
    )
    db_session.add_all([lent, borrowed])
    await db_session.commit()

    balances = await compute_person_balances(db_session, TEST_HOUSEHOLD_ID, person.id)
    assert balances.by_currency["EGP"] == 300000


@pytest.mark.asyncio
async def test_partial_payments_reduce_balance(db_session: AsyncSession):
    """Lent 600k, they paid 200k → net = +400k."""
    person = Person(household_id=TEST_HOUSEHOLD_ID, name="Khaled")
    db_session.add(person)
    await db_session.flush()

    debt = Debt(
        household_id=TEST_HOUSEHOLD_ID,
        type=DebtType.PERSONAL_LENT,
        person_id=person.id,
        name="Lent to Khaled",
        principal_minor=600000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=6,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=100000,
        status=DebtStatus.ACTIVE,
    )
    db_session.add(debt)
    await db_session.flush()

    payment = DebtPayment(
        debt_id=debt.id,
        date=date(2024, 2, 1),
        amount_minor=200000,
        principal_minor=200000,
        interest_minor=0,
    )
    db_session.add(payment)
    await db_session.commit()

    balances = await compute_person_balances(db_session, TEST_HOUSEHOLD_ID, person.id)
    assert balances.by_currency["EGP"] == 400000


@pytest.mark.asyncio
async def test_multi_currency_balances(db_session: AsyncSession):
    """Lent 500k EGP + 1000 USD → separate currency entries."""
    person = Person(household_id=TEST_HOUSEHOLD_ID, name="Multi")
    db_session.add(person)
    await db_session.flush()

    debt_egp = Debt(
        household_id=TEST_HOUSEHOLD_ID,
        type=DebtType.PERSONAL_LENT,
        person_id=person.id,
        name="EGP loan",
        principal_minor=500000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=1,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=500000,
        status=DebtStatus.ACTIVE,
    )
    debt_usd = Debt(
        household_id=TEST_HOUSEHOLD_ID,
        type=DebtType.PERSONAL_LENT,
        person_id=person.id,
        name="USD loan",
        principal_minor=100000,
        currency="USD",
        annual_rate_bps=0,
        tenure_months=1,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=100000,
        status=DebtStatus.ACTIVE,
    )
    db_session.add_all([debt_egp, debt_usd])
    await db_session.commit()

    balances = await compute_person_balances(db_session, TEST_HOUSEHOLD_ID, person.id)
    assert balances.by_currency["EGP"] == 500000
    assert balances.by_currency["USD"] == 100000


@pytest.mark.asyncio
async def test_paid_off_debts_excluded(db_session: AsyncSession):
    """Paid-off debts (is_active=True, status=paid_off) should still be counted."""
    person = Person(household_id=TEST_HOUSEHOLD_ID, name="Paid Off")
    db_session.add(person)
    await db_session.flush()

    debt = Debt(
        household_id=TEST_HOUSEHOLD_ID,
        type=DebtType.PERSONAL_LENT,
        person_id=person.id,
        name="Paid off loan",
        principal_minor=500000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=1,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=500000,
        status=DebtStatus.ACTIVE,
    )
    db_session.add(debt)
    await db_session.flush()

    # Record full payment
    payment = DebtPayment(
        debt_id=debt.id,
        date=date(2024, 2, 1),
        amount_minor=500000,
        principal_minor=500000,
        interest_minor=0,
    )
    db_session.add(payment)
    debt.status = DebtStatus.PAID_OFF
    await db_session.commit()

    balances = await compute_person_balances(db_session, TEST_HOUSEHOLD_ID, person.id)
    # Lent 500k, paid 500k → net = 0
    assert balances.by_currency.get("EGP", 0) == 0


@pytest.mark.asyncio
async def test_soft_deleted_debts_excluded(db_session: AsyncSession):
    """Soft-deleted debts should NOT count toward balances."""
    person = Person(household_id=TEST_HOUSEHOLD_ID, name="Deleted")
    db_session.add(person)
    await db_session.flush()

    debt = Debt(
        household_id=TEST_HOUSEHOLD_ID,
        type=DebtType.PERSONAL_LENT,
        person_id=person.id,
        name="Deleted loan",
        principal_minor=500000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=1,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=500000,
        status=DebtStatus.ACTIVE,
        is_active=False,
    )
    db_session.add(debt)
    await db_session.commit()

    balances = await compute_person_balances(db_session, TEST_HOUSEHOLD_ID, person.id)
    assert balances.by_currency.get("EGP", 0) == 0
