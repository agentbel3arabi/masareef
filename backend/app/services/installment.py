from __future__ import annotations

import uuid
from datetime import date
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.debt import Debt
from app.models.installment_plan import InstallmentPlan
from app.schemas.installment import InstallmentCreate, InstallmentUpdate


def compute_installment_status(
    plan: Any,
    as_of: date | None = None,
) -> dict[str, Any]:
    """Compute derived fields for an installment plan.

    Pure function — no DB access. Works with ORM objects or any object
    with the required attributes.
    """
    ref = as_of or date.today()
    months_elapsed = (ref.year - plan.start_month.year) * 12 + (
        ref.month - plan.start_month.month
    )
    months_paid = max(0, min(months_elapsed, plan.total_months))
    remaining_months = plan.total_months - months_paid
    remaining_minor = plan.total_amount_minor - (months_paid * plan.monthly_amount_minor)
    remaining_minor = max(0, remaining_minor)

    stored = plan.status.value if hasattr(plan.status, "value") else plan.status
    if stored == "completed" or months_elapsed >= plan.total_months:
        effective_status = "completed"
    else:
        effective_status = "active"

    return {
        "months_paid": months_paid,
        "remaining_months": remaining_months,
        "remaining_minor": remaining_minor,
        "status": effective_status,
    }