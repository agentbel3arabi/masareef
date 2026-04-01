"""Unit tests for the amortization engine — pure computation, no DB."""

import math
from datetime import date

from app.services.amortization import compute_monthly_payment, generate_schedule


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
