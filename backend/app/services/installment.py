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


async def create_installment(
    session: AsyncSession,
    household_id: uuid.UUID,
    data: InstallmentCreate,
) -> InstallmentPlan:
    """Create an installment plan with account type validation."""
    if data.source_account_id is not None:
        account = await session.get(Account, data.source_account_id)
        if account is None or not account.is_active or account.household_id != household_id:
            raise ValueError("ACCOUNT_NOT_FOUND")

        acct_type = account.type.value if hasattr(account.type, "value") else account.type

        if data.type == "credit_card" and acct_type != "credit_card":
            raise ValueError("INVALID_ACCOUNT_TYPE")
        elif data.type == "financing_app" and acct_type != "financing_app":
            raise ValueError("INVALID_ACCOUNT_TYPE")
        elif data.type == "store" and acct_type != "credit_card":
            raise ValueError("INVALID_ACCOUNT_TYPE")
    else:
        if data.type in ("credit_card", "financing_app"):
            raise ValueError("SOURCE_ACCOUNT_REQUIRED")

    start_month = data.start_month.replace(day=1)

    plan = InstallmentPlan(
        household_id=household_id,
        type=data.type,
        name=data.name,
        merchant_name=data.merchant_name,
        source_account_id=data.source_account_id,
        linked_account_id=data.linked_account_id,
        total_amount_minor=data.total_amount_minor,
        monthly_amount_minor=data.monthly_amount_minor,
        total_months=data.total_months,
        start_month=start_month,
        currency=data.currency,
    )
    session.add(plan)
    await session.flush()
    return plan