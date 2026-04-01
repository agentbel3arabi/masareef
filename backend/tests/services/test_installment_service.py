from datetime import date

import pytest

from app.services.installment import compute_installment_status


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