from datetime import date
import uuid

import pytest

from app.models.account import Account
from app.models.enums import AccountType
from app.models.installment_plan import InstallmentPlan
from app.schemas.installment import InstallmentCreate
from app.services.installment import (
    complete_installment,
    compute_installment_status,
    create_installment,
    get_installment,
    list_installments,
    soft_delete_installment,
    update_installment,
)
from app.schemas.installment import InstallmentUpdate


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


async def _create_test_plan(session, *, plan_type="credit_card", household_id=None, source_account_id=None, **kwargs):
    """Seed an installment plan directly via ORM for test isolation."""
    hid = household_id or TEST_HOUSEHOLD_ID
    plan = InstallmentPlan(
        household_id=hid,
        type=plan_type,
        name=kwargs.get("name", "Test Plan"),
        merchant_name=kwargs.get("merchant_name"),
        source_account_id=source_account_id,
        total_amount_minor=kwargs.get("total_amount_minor", 5400000),
        monthly_amount_minor=kwargs.get("monthly_amount_minor", 450000),
        total_months=kwargs.get("total_months", 12),
        start_month=kwargs.get("start_month", date(2024, 1, 1)),
        currency=kwargs.get("currency", "EGP"),
    )
    session.add(plan)
    await session.flush()
    return plan


@pytest.mark.asyncio
class TestListInstallments:
    async def test_list_returns_all_active(self, db_session):
        await _create_test_plan(db_session, name="Plan A")
        await _create_test_plan(db_session, name="Plan B")
        plans, total = await list_installments(db_session, TEST_HOUSEHOLD_ID)
        assert total == 2
        assert len(plans) == 2

    async def test_list_filters_by_type(self, db_session):
        await _create_test_plan(db_session, plan_type="credit_card", name="CC Plan")
        await _create_test_plan(db_session, plan_type="store", name="Store Plan")
        plans, total = await list_installments(
            db_session, TEST_HOUSEHOLD_ID, installment_type="store"
        )
        assert total == 1
        assert plans[0].name == "Store Plan"


@pytest.mark.asyncio
class TestGetInstallment:
    async def test_get_existing(self, db_session):
        plan = await _create_test_plan(db_session)
        found = await get_installment(db_session, TEST_HOUSEHOLD_ID, plan.id)
        assert found is not None
        assert found.id == plan.id

    async def test_get_nonexistent_returns_none(self, db_session):
        found = await get_installment(db_session, TEST_HOUSEHOLD_ID, 99999)
        assert found is None


@pytest.mark.asyncio
class TestUpdateInstallment:
    async def test_update_name(self, db_session):
        plan = await _create_test_plan(db_session, name="Old Name")
        updated = await update_installment(
            db_session, plan, InstallmentUpdate(name="New Name")
        )
        assert updated.name == "New Name"


@pytest.mark.asyncio
class TestSoftDelete:
    async def test_soft_delete_sets_inactive(self, db_session):
        plan = await _create_test_plan(db_session)
        await soft_delete_installment(db_session, plan)
        assert plan.is_active is False


@pytest.mark.asyncio
class TestComplete:
    async def test_complete_sets_status(self, db_session):
        plan = await _create_test_plan(db_session)
        completed = await complete_installment(db_session, plan)
        assert completed.status == "completed"