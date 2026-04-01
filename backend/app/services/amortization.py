"""Amortization engine — pure computation, no DB, no HTTP awareness."""

from datetime import date
from decimal import ROUND_CEILING, Decimal
from typing import Any

from dateutil.relativedelta import relativedelta


def compute_monthly_payment(principal_minor: int, annual_rate_bps: int, tenure_months: int) -> int:
    """Compute fixed monthly payment via PMT formula.

    Args:
        principal_minor: Loan principal in minor currency units.
        annual_rate_bps: Annual interest rate in basis points (1450 = 14.5%).
        tenure_months: Number of monthly payments.

    Returns:
        Monthly payment in minor units, rounded up (ceiling).
    """
    if tenure_months <= 0:
        raise ValueError("tenure_months must be positive")
    if principal_minor <= 0:
        raise ValueError("principal_minor must be positive")

    if annual_rate_bps == 0:
        return (principal_minor + tenure_months - 1) // tenure_months

    monthly_rate = Decimal(annual_rate_bps) / Decimal(10_000 * 12)
    factor = (Decimal(1) + monthly_rate) ** tenure_months
    payment = Decimal(principal_minor) * (monthly_rate * factor) / (factor - Decimal(1))
    return int(payment.to_integral_value(rounding=ROUND_CEILING))


def generate_schedule(
    principal_minor: int,
    annual_rate_bps: int,
    tenure_months: int,
    start_date: date,
    payments: list[Any],
) -> list[dict[str, Any]]:
    """Generate full amortization schedule with payment statuses.

    Args:
        principal_minor: Loan principal in minor currency units.
        annual_rate_bps: Annual interest rate in basis points.
        tenure_months: Number of monthly payments.
        start_date: Loan start date (first payment is 1 month after).
        payments: List of DebtPayment objects (or dicts with 'date' and 'amount_minor').

    Returns:
        List of schedule row dicts, one per month.
    """
    monthly_payment = compute_monthly_payment(principal_minor, annual_rate_bps, tenure_months)
    if annual_rate_bps > 0:
        monthly_rate = Decimal(annual_rate_bps) / Decimal(10_000 * 12)
    else:
        monthly_rate = Decimal(0)

    # Index payments by approximate month for status lookup
    payment_dates = set()
    for p in payments:
        p_date = p.date if hasattr(p, "date") else p["date"]
        payment_dates.add(p_date)

    schedule: list[dict[str, Any]] = []
    remaining = principal_minor
    today = date.today()

    for i in range(tenure_months):
        payment_date = start_date + relativedelta(months=i + 1)

        if annual_rate_bps == 0:
            interest = 0
            if i == tenure_months - 1:
                # Final payment absorbs remainder
                principal_portion = remaining
            else:
                principal_portion = (principal_minor + tenure_months - 1) // tenure_months
        else:
            raw_interest = Decimal(remaining) * monthly_rate
            interest = int(raw_interest.to_integral_value(rounding=ROUND_CEILING))
            if i == tenure_months - 1:
                # Final payment absorbs rounding error
                principal_portion = remaining
                interest = monthly_payment - remaining if monthly_payment > remaining else interest
            else:
                principal_portion = monthly_payment - interest

        remaining -= principal_portion
        if remaining < 0:
            remaining = 0

        # Determine status
        has_payment = any(_dates_match_month(pd, payment_date) for pd in payment_dates)
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


def _dates_match_month(d1: date, d2: date) -> bool:
    """Check if two dates are in the same year-month."""
    return d1.year == d2.year and d1.month == d2.month
