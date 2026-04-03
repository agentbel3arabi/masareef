"""Unit tests for the amortization engine — pure computation, no DB."""

import math
from datetime import date

from app.services.amortization import (
    compute_monthly_payment,
    compute_periodic_payment,
    generate_schedule,
)


class TestComputeMonthlyPayment:
    def test_standard_loan(self):
        """500,000 EGP at 14.5% over 60 months → ~11,773 EGP/month."""
        result = compute_monthly_payment(
            principal_minor=50000000,
            annual_rate_bps=1450,
            tenure_months=60,
        )
        # PMT at 14.5% annual = 1.2083% monthly, 60 months
        # Expected ~1,177,300 minor units. ceil rounds up.
        assert result > 0
        assert 1170000 <= result <= 1185000

    def test_zero_interest_loan(self):
        """0% interest: equal division."""
        result = compute_monthly_payment(
            principal_minor=1200000,
            annual_rate_bps=0,
            tenure_months=12,
        )
        assert result == 100000  # 1,200,000 / 12 = 100,000

    def test_zero_interest_with_remainder(self):
        """0% interest with non-even division rounds up."""
        result = compute_monthly_payment(
            principal_minor=1000000,
            annual_rate_bps=0,
            tenure_months=3,
        )
        # 1,000,000 / 3 = 333,333.33... → ceil = 333,334
        assert result == math.ceil(1000000 / 3)

    def test_one_month_tenure(self):
        """Single payment: monthly payment = principal (0% rate)."""
        result = compute_monthly_payment(
            principal_minor=5000000,
            annual_rate_bps=0,
            tenure_months=1,
        )
        assert result == 5000000

    def test_high_rate(self):
        """25% annual rate — result should be significantly higher."""
        result = compute_monthly_payment(
            principal_minor=10000000,
            annual_rate_bps=2500,
            tenure_months=24,
        )
        assert result > 10000000 // 24  # higher than 0% division


class TestComputePeriodicPayment:
    def test_monthly_same_as_old(self):
        """Monthly frequency should produce the same result as compute_monthly_payment."""
        monthly = compute_monthly_payment(50000000, 1450, 60)
        periodic = compute_periodic_payment(50000000, 1450, 60, frequency_months=1)
        assert monthly == periodic

    def test_quarterly_zero_rate(self):
        """Quarterly 0%: 12 months / 3 = 4 payments."""
        result = compute_periodic_payment(1200000, 0, 12, frequency_months=3)
        assert result == 300000  # 1,200,000 / 4 = 300,000

    def test_semi_annual_with_interest(self):
        """Semi-annual with interest produces a valid positive payment."""
        result = compute_periodic_payment(10000000, 1000, 24, frequency_months=6)
        # 24 months / 6 = 4 periods, 10% annual rate
        assert result > 0
        # Must be more than simple 0% division (2,500,000)
        assert result > 10000000 // 4

    def test_annual_zero_rate(self):
        """Annual 0%: 36 months / 12 = 3 payments."""
        result = compute_periodic_payment(3000000, 0, 36, frequency_months=12)
        assert result == 1000000  # 3,000,000 / 3 = 1,000,000

    def test_annual_with_interest(self):
        """Annual with interest: 36 months / 12 = 3 annual payments."""
        result = compute_periodic_payment(10000000, 500, 36, frequency_months=12)
        # 5% annual rate, 3 annual periods
        assert result > 10000000 // 3

    def test_invalid_num_periods(self):
        """tenure_months < frequency_months should raise ValueError."""
        import pytest

        with pytest.raises(ValueError, match="must be divisible by"):
            compute_periodic_payment(1000000, 0, 2, frequency_months=3)

    def test_invalid_principal(self):
        """Zero or negative principal should raise ValueError."""
        import pytest

        with pytest.raises(ValueError, match="principal_minor must be positive"):
            compute_periodic_payment(0, 0, 12, frequency_months=1)


class TestGenerateSchedule:
    def test_schedule_length_matches_tenure(self):
        schedule = generate_schedule(
            principal_minor=1200000,
            annual_rate_bps=0,
            tenure_months=12,
            start_date=date(2024, 1, 1),
            payments=[],
        )
        assert len(schedule) == 12

    def test_zero_rate_schedule_sums_to_principal(self):
        """All principal portions sum to original principal."""
        schedule = generate_schedule(
            principal_minor=1200000,
            annual_rate_bps=0,
            tenure_months=12,
            start_date=date(2024, 1, 1),
            payments=[],
        )
        total_principal = sum(row["principal_minor"] for row in schedule)
        assert total_principal == 1200000

    def test_zero_rate_no_interest(self):
        """0% rate means interest portion is always 0."""
        schedule = generate_schedule(
            principal_minor=1200000,
            annual_rate_bps=0,
            tenure_months=12,
            start_date=date(2024, 1, 1),
            payments=[],
        )
        for row in schedule:
            assert row["interest_minor"] == 0

    def test_schedule_remaining_decreases(self):
        """Remaining balance decreases monotonically."""
        schedule = generate_schedule(
            principal_minor=50000000,
            annual_rate_bps=1450,
            tenure_months=60,
            start_date=date(2024, 1, 1),
            payments=[],
        )
        for i in range(1, len(schedule)):
            assert schedule[i]["remaining_minor"] < schedule[i - 1]["remaining_minor"]

    def test_final_remaining_is_zero(self):
        """After all payments, remaining balance is exactly 0."""
        schedule = generate_schedule(
            principal_minor=50000000,
            annual_rate_bps=1450,
            tenure_months=60,
            start_date=date(2024, 1, 1),
            payments=[],
        )
        assert schedule[-1]["remaining_minor"] == 0

    def test_schedule_dates_are_monthly(self):
        """Dates increment monthly from start_date."""
        schedule = generate_schedule(
            principal_minor=600000,
            annual_rate_bps=0,
            tenure_months=6,
            start_date=date(2024, 1, 1),
            payments=[],
        )
        assert schedule[0]["date"] == date(2024, 2, 1)
        assert schedule[1]["date"] == date(2024, 3, 1)
        assert schedule[5]["date"] == date(2024, 7, 1)

    def test_payment_status_unpaid(self):
        """Without any payments recorded, all rows are 'upcoming' or 'overdue'."""
        schedule = generate_schedule(
            principal_minor=600000,
            annual_rate_bps=0,
            tenure_months=3,
            start_date=date(2020, 1, 1),  # past dates
            payments=[],
        )
        for row in schedule:
            assert row["status"] in ("overdue", "upcoming")

    def test_interest_bearing_interest_decreases(self):
        """For loans with interest, interest portion decreases over time."""
        schedule = generate_schedule(
            principal_minor=50000000,
            annual_rate_bps=1450,
            tenure_months=60,
            start_date=date(2024, 1, 1),
            payments=[],
        )
        # First month has more interest than last month
        assert schedule[0]["interest_minor"] > schedule[-1]["interest_minor"]

    # --- New frequency-aware tests ---

    def test_quarterly_schedule_length(self):
        """Quarterly over 12 months = 4 rows."""
        schedule = generate_schedule(
            principal_minor=1200000,
            annual_rate_bps=0,
            tenure_months=12,
            start_date=date(2024, 1, 1),
            payments=[],
            frequency_months=3,
        )
        assert len(schedule) == 4

    def test_quarterly_dates(self):
        """Quarterly dates are 3 months apart."""
        schedule = generate_schedule(
            principal_minor=1200000,
            annual_rate_bps=0,
            tenure_months=12,
            start_date=date(2024, 1, 1),
            payments=[],
            frequency_months=3,
        )
        assert schedule[0]["date"] == date(2024, 4, 1)
        assert schedule[1]["date"] == date(2024, 7, 1)
        assert schedule[2]["date"] == date(2024, 10, 1)
        assert schedule[3]["date"] == date(2025, 1, 1)

    def test_quarterly_zero_rate_sums_to_principal(self):
        """Quarterly 0%: principal portions sum to original."""
        schedule = generate_schedule(
            principal_minor=1200000,
            annual_rate_bps=0,
            tenure_months=12,
            start_date=date(2024, 1, 1),
            payments=[],
            frequency_months=3,
        )
        total_principal = sum(row["principal_minor"] for row in schedule)
        assert total_principal == 1200000

    def test_annual_schedule_length(self):
        """Annual over 36 months = 3 rows."""
        schedule = generate_schedule(
            principal_minor=3000000,
            annual_rate_bps=0,
            tenure_months=36,
            start_date=date(2024, 1, 1),
            payments=[],
            frequency_months=12,
        )
        assert len(schedule) == 3

    def test_annual_with_interest_final_zero(self):
        """Annual with interest: final remaining is 0."""
        schedule = generate_schedule(
            principal_minor=10000000,
            annual_rate_bps=500,
            tenure_months=36,
            start_date=date(2024, 1, 1),
            payments=[],
            frequency_months=12,
        )
        assert len(schedule) == 3
        assert schedule[-1]["remaining_minor"] == 0

    def test_semi_annual_schedule_length(self):
        """Semi-annual over 24 months = 4 rows."""
        schedule = generate_schedule(
            principal_minor=2400000,
            annual_rate_bps=0,
            tenure_months=24,
            start_date=date(2024, 1, 1),
            payments=[],
            frequency_months=6,
        )
        assert len(schedule) == 4

    def test_payment_day_override(self):
        """payment_day_of_month replaces the start_date day."""
        schedule = generate_schedule(
            principal_minor=1200000,
            annual_rate_bps=0,
            tenure_months=12,
            start_date=date(2024, 1, 1),
            payments=[],
            payment_day_of_month=15,
        )
        for row in schedule:
            assert row["date"].day == 15

    def test_payment_day_override_capped_at_28(self):
        """payment_day_of_month > 28 is capped at 28."""
        schedule = generate_schedule(
            principal_minor=1200000,
            annual_rate_bps=0,
            tenure_months=12,
            start_date=date(2024, 1, 1),
            payments=[],
            payment_day_of_month=31,
        )
        for row in schedule:
            assert row["date"].day == 28

    def test_payment_day_override_with_quarterly(self):
        """payment_day_of_month works with non-monthly frequency."""
        schedule = generate_schedule(
            principal_minor=1200000,
            annual_rate_bps=0,
            tenure_months=12,
            start_date=date(2024, 1, 1),
            payments=[],
            frequency_months=3,
            payment_day_of_month=20,
        )
        assert schedule[0]["date"] == date(2024, 4, 20)
        assert schedule[1]["date"] == date(2024, 7, 20)
        assert schedule[2]["date"] == date(2024, 10, 20)
        assert schedule[3]["date"] == date(2025, 1, 20)

    def test_backward_compatible_defaults(self):
        """Without new params, behaves identically to the old API."""
        schedule_old_style = generate_schedule(
            principal_minor=50000000,
            annual_rate_bps=1450,
            tenure_months=60,
            start_date=date(2024, 1, 1),
            payments=[],
        )
        schedule_explicit = generate_schedule(
            principal_minor=50000000,
            annual_rate_bps=1450,
            tenure_months=60,
            start_date=date(2024, 1, 1),
            payments=[],
            frequency_months=1,
            payment_day_of_month=None,
        )
        assert len(schedule_old_style) == len(schedule_explicit)
        for old, new in zip(schedule_old_style, schedule_explicit):
            assert old == new
