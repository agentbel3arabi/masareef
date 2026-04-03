"""Amortization engine — pure computation, no DB, no HTTP awareness."""

from datetime import date
from decimal import ROUND_CEILING, Decimal
from typing import Any

from dateutil.relativedelta import relativedelta

FREQUENCY_MONTHS: dict[str, int] = {
    "monthly": 1,
    "quarterly": 3,
    "semi_annual": 6,
    "annual": 12,
}


def compute_periodic_payment(
    principal_minor: int,
    annual_rate_bps: int,
    tenure_months: int,
    frequency_months: int = 1,
) -> int:
    """Compute fixed periodic payment via PMT formula.

    Args:
        principal_minor: Loan principal in minor currency units.
        annual_rate_bps: Annual interest rate in basis points (1450 = 14.5%).
        tenure_months: Total loan tenure in months.
        frequency_months: Months between payments (1=monthly, 3=quarterly, etc.).

    Returns:
        Periodic payment in minor units, rounded up (ceiling).
    """
    if principal_minor <= 0:
        raise ValueError("principal_minor must be positive")

    num_periods = tenure_months // frequency_months
    if num_periods <= 0:
        raise ValueError("num_periods must be positive (tenure_months / frequency_months)")

    if annual_rate_bps == 0:
        return (principal_minor + num_periods - 1) // num_periods

    period_rate = Decimal(annual_rate_bps) * Decimal(frequency_months) / Decimal(10_000 * 12)
    factor = (Decimal(1) + period_rate) ** num_periods
    payment = Decimal(principal_minor) * (period_rate * factor) / (factor - Decimal(1))
    return int(payment.to_integral_value(rounding=ROUND_CEILING))


def compute_monthly_payment(principal_minor: int, annual_rate_bps: int, tenure_months: int) -> int:
    """Compute fixed monthly payment via PMT formula.

    Backward-compatible wrapper around compute_periodic_payment.

    Args:
        principal_minor: Loan principal in minor currency units.
        annual_rate_bps: Annual interest rate in basis points (1450 = 14.5%).
        tenure_months: Number of monthly payments.

    Returns:
        Monthly payment in minor units, rounded up (ceiling).
    """
    return compute_periodic_payment(principal_minor, annual_rate_bps, tenure_months, frequency_months=1)


def generate_schedule(
    principal_minor: int,
    annual_rate_bps: int,
    tenure_months: int,
    start_date: date,
    payments: list[Any],
    frequency_months: int = 1,
    payment_day_of_month: int | None = None,
) -> list[dict[str, Any]]:
    """Generate full amortization schedule with payment statuses.

    Args:
        principal_minor: Loan principal in minor currency units.
        annual_rate_bps: Annual interest rate in basis points.
        tenure_months: Total loan tenure in months.
        start_date: Loan start date (first payment is 1 period after).
        payments: List of DebtPayment objects (or dicts with 'date' and 'amount_minor').
        frequency_months: Months between payments (1=monthly, 3=quarterly, etc.).
        payment_day_of_month: Override day of month for payment dates (capped at 28).

    Returns:
        List of schedule row dicts, one per period.
    """
    num_periods = tenure_months // frequency_months
    periodic_payment = compute_periodic_payment(
        principal_minor, annual_rate_bps, tenure_months, frequency_months
    )
    if annual_rate_bps > 0:
        period_rate = Decimal(annual_rate_bps) * Decimal(frequency_months) / Decimal(10_000 * 12)
    else:
        period_rate = Decimal(0)

    # Clamp payment day override
    day_override = min(payment_day_of_month, 28) if payment_day_of_month is not None else None

    # Index payments by approximate period for status lookup
    payment_dates = set()
    for p in payments:
        p_date = p.date if hasattr(p, "date") else p["date"]
        payment_dates.add(p_date)

    schedule: list[dict[str, Any]] = []
    remaining = principal_minor
    today = date.today()

    for i in range(num_periods):
        payment_date = start_date + relativedelta(months=(i + 1) * frequency_months)
        if day_override is not None:
            payment_date = payment_date.replace(day=day_override)

        if annual_rate_bps == 0:
            interest = 0
            if i == num_periods - 1:
                # Final payment absorbs remainder
                principal_portion = remaining
            else:
                principal_portion = (principal_minor + num_periods - 1) // num_periods
        else:
            raw_interest = Decimal(remaining) * period_rate
            interest = int(raw_interest.to_integral_value(rounding=ROUND_CEILING))
            if i == num_periods - 1:
                # Final payment absorbs rounding error
                principal_portion = remaining
                interest = periodic_payment - remaining if periodic_payment > remaining else interest
            else:
                principal_portion = periodic_payment - interest

        # Cap principal_portion to remaining balance before subtracting
        if remaining <= 0:
            principal_portion = 0
        elif principal_portion > remaining:
            principal_portion = remaining
        remaining -= principal_portion
        remaining = max(remaining, 0)

        # Determine status
        has_payment = any(
            _dates_match_period(pd, payment_date, frequency_months) for pd in payment_dates
        )
        if has_payment:
            status = "paid"
        elif payment_date <= today:
            status = "overdue"
        else:
            status = "upcoming"

        schedule.append(
            {
                "payment_number": i + 1,
                "date": payment_date,
                "payment_minor": principal_portion + interest,
                "principal_minor": principal_portion,
                "interest_minor": interest,
                "remaining_minor": max(remaining, 0),
                "status": status,
            }
        )

    return schedule


def _dates_match_period(d1: date, d2: date, frequency_months: int = 1) -> bool:
    """Check if two dates fall within the same payment period.

    For monthly frequency, matches by year-month.
    For non-monthly, checks if the dates are within frequency_months of each other.
    """
    if frequency_months == 1:
        return d1.year == d2.year and d1.month == d2.month
    month_diff = (d1.year - d2.year) * 12 + (d1.month - d2.month)
    return abs(month_diff) < frequency_months
