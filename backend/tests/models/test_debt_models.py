"""Tests for Phase 3 model instantiation and attribute defaults."""

import uuid
from datetime import date

import pytest

from app.models.debt import Debt
from app.models.debt_payment import DebtPayment
from app.models.installment_plan import InstallmentPlan
from app.models.p2p_debt_split import P2PDebtSplit
from app.models.person import Person


def test_person_model_instantiation():
    p = Person(
        household_id=uuid.uuid4(),
        name="Ahmed Ali",
        name_ar="أحمد علي",
        relationship="family",
    )
    assert p.name == "Ahmed Ali"
    assert p.name_ar == "أحمد علي"
    # is_active default only applies after flush/commit, not at instantiation


def test_debt_model_instantiation():
    d = Debt(
        household_id=uuid.uuid4(),
        type="bank_loan",
        name="Car Loan",
        institution="CIB",
        principal_minor=50000000,
        currency="EGP",
        annual_rate_bps=1450,
        tenure_months=60,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=1180000,
        status="active",
    )
    assert d.principal_minor == 50000000
    assert d.status == "active"
    # is_active default only applies after flush/commit, not at instantiation


def test_debt_payment_model_instantiation():
    dp = DebtPayment(
        debt_id=1,
        date=date(2024, 2, 1),
        amount_minor=1180000,
        principal_minor=580000,
        interest_minor=600000,
    )
    assert dp.amount_minor == 1180000
    assert dp.principal_minor == 580000


def test_p2p_debt_split_model_instantiation():
    s = P2PDebtSplit(
        debt_id=1,
        amount_minor=500000,
        due_date=date(2024, 3, 1),
        paid=False,
    )
    assert s.amount_minor == 500000
    assert s.paid is False


def test_installment_plan_model_instantiation():
    ip = InstallmentPlan(
        household_id=uuid.uuid4(),
        type="credit_card",
        name="iPhone 16 Pro",
        total_amount_minor=5400000,
        monthly_amount_minor=450000,
        total_months=12,
        start_month=date(2024, 1, 1),
        currency="EGP",
        status="active",
    )
    assert ip.total_amount_minor == 5400000
    assert ip.status == "active"
    # is_active default only applies after flush/commit, not at instantiation


@pytest.mark.asyncio
async def test_person_persists_to_db(db_session):
    """Verify Person model can be stored and retrieved."""
    p = Person(
        household_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        name="Test Person",
    )
    db_session.add(p)
    await db_session.flush()
    assert p.id is not None
    assert p.is_active is True  # Default applied after flush


@pytest.mark.asyncio
async def test_debt_persists_to_db(db_session):
    """Verify Debt model can be stored and retrieved."""
    d = Debt(
        household_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        type="bank_loan",
        name="Test Loan",
        principal_minor=1000000,
        currency="EGP",
        annual_rate_bps=0,
        tenure_months=12,
        start_date=date(2024, 1, 1),
        monthly_payment_minor=83334,
        status="active",
    )
    db_session.add(d)
    await db_session.flush()
    assert d.id is not None
    assert d.is_active is True  # Default applied after flush


@pytest.mark.asyncio
async def test_installment_plan_persists_to_db(db_session):
    """Verify InstallmentPlan model can be stored and retrieved."""
    ip = InstallmentPlan(
        household_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        type="credit_card",
        name="Test Plan",
        total_amount_minor=1000000,
        monthly_amount_minor=100000,
        total_months=10,
        start_month=date(2024, 1, 1),
        currency="EGP",
        status="active",
    )
    db_session.add(ip)
    await db_session.flush()
    assert ip.id is not None
    assert ip.is_active is True  # Default applied after flush
