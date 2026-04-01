from datetime import date
import uuid

import pytest

from app.models.account import Account
from app.models.enums import AccountType
from app.models.installment_plan import InstallmentPlan
from app.schemas.installment import InstallmentCreate
from app.services.installment import compute_installment_status, create_installment


class FakePlan:
    """Lightweight stand-in for InstallmentPlan ORM object."""

    def __init__(self, *, start_month, total_months, total_amount_minor, monthly_amount_minor, status="active"):
        self.start_month = start_month
        self.total_months = total_months
        self.total_amount_minor = total_amount_minor
        self.monthly_amount_minor = monthly_amount_minor
        self.status = status


class TestComputeInstallmentStatus:
    def test_active_mid_tenure(self):
        plan = FakePlan(
            start_month=date(2024, 1, 1),
            total_months=12,
            total_amount_minor=5400000,
            monthly_amount_minor=450000,
        )
        result = compute_installment_status(plan, as_of=date(2024, 7, 15))
        assert result["months_paid"] == 6
        assert result["remaining_months"] == 6
        assert result["remaining_minor"] == 5400000 - 6 * 450000  # 2700000
        assert result["status"] == "active"

    def test_auto_completed_past_tenure(self):
        plan = FakePlan(
            start_month=date(2023, 1, 1),
            total_months=12,
            total_amount_minor=5400000,
            monthly_amount_minor=450000,
        )
        result = compute_installment_status(plan, as_of=date(2024, 6, 1))
        assert result["months_paid"] == 12
        assert result["remaining_months"] == 0
        assert result["remaining_minor"] == 0
        assert result["status"] == "completed"

    def test_manually_completed_overrides(self):
        plan = FakePlan(
            start_month=date(2024, 1, 1),
            total_months=12,
            total_amount_minor=5400000,
            monthly_amount_minor=450000,
            status="completed",
        )
        result = compute_installment_status(plan, as_of=date(2024, 4, 1))
        assert result["status"] == "completed"
        # months_paid still reflects elapsed time, not stored status
        assert result["months_paid"] == 3

    def test_future_start_month_zero_paid(self):
        plan = FakePlan(
            start_month=date(2025, 1, 1),
            total_months=12,
            total_amount_minor=5400000,
            monthly_amount_minor=450000,
        )
        result = compute_installment_status(plan, as_of=date(2024, 6, 1))
        assert result["months_paid"] == 0
        assert result["remaining_months"] == 12
        assert result["remaining_minor"] == 5400000
        assert result["status"] == "active"


TEST_HOUSEHOLD_ID = uuid.uuid4()


def _cc_create_data(**overrides):
    payload = {
        "type": "credit_card",
        "name": "iPhone 16 Pro",
        "merchant_name": "B.TECH",
        "source_account_id": None,  # will be set per test
        "total_amount_minor": 5400000,
        "monthly_amount_minor": 450000,
        "total_months": 12,
        "start_month": date(2024, 6, 1),
        "currency": "EGP",
    }
    payload.update(overrides)
    return InstallmentCreate(**payload)


async def _seed_account(session, *, account_type="credit_card", household_id=None, credit_limit=10000000):
    """Create and flush a test account."""
    acct = Account(
        household_id=household_id or TEST_HOUSEHOLD_ID,
        name="Test Account",
        type=account_type,
        currency="EGP",
        balance_minor=0,
        credit_limit=credit_limit,
    )
    session.add(acct)
    await session.flush()
    return acct


@pytest.mark.asyncio
class TestCreateInstallment:
    async def test_create_cc_with_valid_account(self, db_session):
        acct = await _seed_account(db_session, account_type="credit_card")
        data = _cc_create_data(source_account_id=acct.id)
        plan = await create_installment(db_session, TEST_HOUSEHOLD_ID, data)
        assert plan.id is not None
        assert plan.type == "credit_card"
        assert plan.source_account_id == acct.id
        assert plan.start_month == date(2024, 6, 1)

    async def test_cc_with_non_credit_card_account_raises(self, db_session):
        acct = await _seed_account(db_session, account_type="bank_account")
        data = _cc_create_data(source_account_id=acct.id)
        with pytest.raises(ValueError, match="INVALID_ACCOUNT_TYPE"):
            await create_installment(db_session, TEST_HOUSEHOLD_ID, data)

    async def test_financing_app_without_source_raises(self, db_session):
        data = InstallmentCreate(
            type="financing_app",
            name="Air Conditioner",
            total_amount_minor=1500000,
            monthly_amount_minor=125000,
            total_months=12,
            start_month=date(2024, 6, 1),
            currency="EGP",
        )
        with pytest.raises(ValueError, match="SOURCE_ACCOUNT_REQUIRED"):
            await create_installment(db_session, TEST_HOUSEHOLD_ID, data)

    async def test_store_without_source_ok(self, db_session):
        data = InstallmentCreate(
            type="store",
            name="Washing Machine",
            merchant_name="B.TECH",
            total_amount_minor=1200000,
            monthly_amount_minor=100000,
            total_months=12,
            start_month=date(2024, 6, 1),
            currency="EGP",
        )
        plan = await create_installment(db_session, TEST_HOUSEHOLD_ID, data)
        assert plan.source_account_id is None
        assert plan.type == "store"

    async def test_store_with_non_cc_source_raises(self, db_session):
        acct = await _seed_account(db_session, account_type="bank_account")
        data = InstallmentCreate(
            type="store",
            name="Fridge",
            merchant_name="B.TECH",
            source_account_id=acct.id,
            total_amount_minor=800000,
            monthly_amount_minor=133334,
            total_months=6,
            start_month=date(2024, 6, 1),
            currency="EGP",
        )
        with pytest.raises(ValueError, match="INVALID_ACCOUNT_TYPE"):
            await create_installment(db_session, TEST_HOUSEHOLD_ID, data)

    async def test_start_month_normalized_to_day_1(self, db_session):
        acct = await _seed_account(db_session, account_type="credit_card")
        data = _cc_create_data(source_account_id=acct.id, start_month=date(2024, 6, 15))
        plan = await create_installment(db_session, TEST_HOUSEHOLD_ID, data)
        assert plan.start_month == date(2024, 6, 1)