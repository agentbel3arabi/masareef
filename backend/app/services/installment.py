from __future__ import annotations

import uuid
from datetime import date
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.debt import Debt
from app.models.enums import AccountType
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
    months_elapsed = (ref.year - plan.start_month.year) * 12 + (ref.month - plan.start_month.month)
    months_paid = max(0, min(months_elapsed, plan.total_months))
    remaining_months = plan.total_months - months_paid
    remaining_minor = plan.total_amount_minor - (months_paid * plan.monthly_amount_minor)
    remaining_minor = max(0, remaining_minor)

    stored = plan.status.value if hasattr(plan.status, "value") else plan.status
    if stored == "completed" or months_elapsed >= plan.total_months:
        effective_status = "completed"
        remaining_minor = 0
        remaining_months = 0
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

    # Validate linked_account_id if provided
    if data.linked_account_id is not None:
        linked = await session.get(Account, data.linked_account_id)
        if not linked or not linked.is_active or linked.household_id != household_id:
            raise ValueError("ACCOUNT_NOT_FOUND")

    start_month = data.start_month.replace(day=1)

    # Default payment_day_of_month from start_date if not provided
    payment_day = data.payment_day_of_month
    if payment_day is None:
        payment_day = min(data.start_month.day, 28)

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
        annual_rate_bps=data.annual_rate_bps,
        payment_day_of_month=payment_day,
        notes=data.notes,
    )
    session.add(plan)
    await session.flush()
    return plan


async def list_installments(
    session: AsyncSession,
    household_id: uuid.UUID,
    installment_type: str | None = None,
    status_filter: str | None = None,
    source_account_id: int | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[InstallmentPlan], int]:
    """List installment plans with optional filters.

    When status_filter is set, all plans are loaded and filtered in Python
    because effective status is computed. Otherwise DB-level pagination is used.
    """
    query = select(InstallmentPlan).where(
        InstallmentPlan.household_id == household_id,
        InstallmentPlan.is_active.is_(True),
    )
    if installment_type:
        query = query.where(InstallmentPlan.type == installment_type)
    if source_account_id is not None:
        query = query.where(InstallmentPlan.source_account_id == source_account_id)

    query = query.order_by(InstallmentPlan.created_at.desc())

    if status_filter:
        # Must load all to compute status in Python
        result = await session.execute(query)
        all_plans = list(result.scalars().all())
        all_plans = [
            p for p in all_plans if compute_installment_status(p)["status"] == status_filter
        ]
        total = len(all_plans)
        start = (page - 1) * page_size
        page_plans = all_plans[start : start + page_size]
    else:
        # DB-level pagination
        count_query = select(func.count()).select_from(query.subquery())
        total = (await session.execute(count_query)).scalar_one()
        offset = (page - 1) * page_size
        paginated = query.offset(offset).limit(page_size)
        result = await session.execute(paginated)
        page_plans = list(result.scalars().all())

    return page_plans, total


async def get_installment(
    session: AsyncSession,
    household_id: uuid.UUID,
    plan_id: int,
) -> InstallmentPlan | None:
    """Get a single installment plan by ID, scoped to household."""
    query = select(InstallmentPlan).where(
        InstallmentPlan.id == plan_id,
        InstallmentPlan.household_id == household_id,
        InstallmentPlan.is_active.is_(True),
    )
    result = await session.execute(query)
    return result.scalar_one_or_none()


async def update_installment(
    session: AsyncSession,
    plan: InstallmentPlan,
    data: InstallmentUpdate,
) -> InstallmentPlan:
    """Update mutable fields of an installment plan."""
    updates = data.model_dump(exclude_unset=True)

    if "linked_account_id" in updates and updates["linked_account_id"] is not None:
        acct = await session.get(Account, updates["linked_account_id"])
        if not acct or acct.household_id != plan.household_id or not acct.is_active:
            raise ValueError("ACCOUNT_NOT_FOUND")

    for field, value in updates.items():
        setattr(plan, field, value)
    await session.flush()
    return plan


async def soft_delete_installment(
    session: AsyncSession,
    plan: InstallmentPlan,
) -> None:
    """Soft-delete an installment plan."""
    plan.is_active = False
    await session.flush()


async def complete_installment(
    session: AsyncSession,
    plan: InstallmentPlan,
) -> InstallmentPlan:
    """Manually mark an installment plan as completed (early payoff)."""
    plan.status = "completed"
    await session.flush()
    return plan


async def get_financing_apps_summary(
    session: AsyncSession,
    household_id: uuid.UUID,
) -> dict[str, Any]:
    """Compute per-app utilization and cross-app totals for financing apps."""
    # 1. Get all financing_app accounts
    acct_query = select(Account).where(
        Account.household_id == household_id,
        Account.is_active.is_(True),
        Account.type == AccountType.FINANCING_APP,
    )
    acct_result = await session.execute(acct_query)
    accounts = list(acct_result.scalars().all())

    if not accounts:
        return {
            "apps": [],
            "totals": {
                "total_limit_minor": 0,
                "total_used_minor": 0,
                "total_available_minor": 0,
                "total_monthly_minor": 0,
                "total_remaining_minor": 0,
            },
        }

    # 2. Get all active installment plans for these accounts in one query
    acct_ids = [a.id for a in accounts]
    plan_query = select(InstallmentPlan).where(
        InstallmentPlan.household_id == household_id,
        InstallmentPlan.is_active.is_(True),
        InstallmentPlan.source_account_id.in_(acct_ids),
    )
    plan_result = await session.execute(plan_query)
    all_plans = list(plan_result.scalars().all())

    # Group plans by source_account_id
    plans_by_account: dict[int, list[InstallmentPlan]] = {}
    for p in all_plans:
        acct_id = p.source_account_id
        if acct_id is not None:
            plans_by_account.setdefault(acct_id, []).append(p)

    apps = []
    total_limit = 0
    total_used = 0
    total_available = 0
    total_monthly = 0
    total_remaining = 0

    for acct in accounts:
        acct_plans = plans_by_account.get(acct.id, [])
        active_plans = [
            p for p in acct_plans if compute_installment_status(p)["status"] == "active"
        ]

        monthly_commitment = sum(p.monthly_amount_minor for p in active_plans)
        remaining = sum(compute_installment_status(p)["remaining_minor"] for p in active_plans)

        credit_limit = acct.credit_limit or 0
        balance = acct.balance_minor or 0
        used = max(-balance, 0)  # only count negative balance as utilization
        available = max(credit_limit + balance, 0)

        utilization = (used / credit_limit * 100) if credit_limit > 0 else 0.0

        apps.append(
            {
                "account_id": acct.id,
                "name": acct.name,
                "name_ar": None,
                "credit_limit_minor": credit_limit,
                "balance_minor": balance,
                "available_minor": available,
                "utilization_percent": round(utilization, 1),
                "active_plans_count": len(active_plans),
                "monthly_commitment_minor": monthly_commitment,
            }
        )

        total_limit += credit_limit
        total_used += used
        total_available += available
        total_monthly += monthly_commitment
        total_remaining += remaining

    return {
        "apps": apps,
        "totals": {
            "total_limit_minor": total_limit,
            "total_used_minor": total_used,
            "total_available_minor": total_available,
            "total_monthly_minor": total_monthly,
            "total_remaining_minor": total_remaining,
        },
    }


async def get_account_obligations(
    session: AsyncSession,
    household_id: uuid.UUID,
    account_id: int,
) -> dict[str, list[dict[str, Any]]]:
    """Return debts and installments linked to a specific account."""
    # Debts linked via linked_account_id
    debt_query = select(Debt).where(
        Debt.household_id == household_id,
        Debt.is_active.is_(True),
        Debt.linked_account_id == account_id,
    )
    debt_result = await session.execute(debt_query)
    debts = list(debt_result.scalars().all())

    # Installments linked via source_account_id
    plan_query = select(InstallmentPlan).where(
        InstallmentPlan.household_id == household_id,
        InstallmentPlan.is_active.is_(True),
        InstallmentPlan.source_account_id == account_id,
    )
    plan_result = await session.execute(plan_query)
    plans = list(plan_result.scalars().all())

    debt_items = []
    for d in debts:
        debt_type = d.type.value if hasattr(d.type, "value") else str(d.type)  # type: ignore[union-attr]
        debt_status = d.status.value if hasattr(d.status, "value") else str(d.status)  # type: ignore[union-attr]
        debt_items.append(
            {
                "id": d.id,
                "type": debt_type,
                "name": d.name,
                "monthly_payment_minor": d.monthly_payment_minor,
                # simplified; exact remaining needs payment sum calculation
                "remaining_minor": d.principal_minor,
                "status": debt_status,
            }
        )

    installment_items = []
    for p in plans:
        computed = compute_installment_status(p)
        plan_type = p.type.value if hasattr(p.type, "value") else str(p.type)  # type: ignore[union-attr]
        installment_items.append(
            {
                "id": p.id,
                "type": plan_type,
                "name": p.name,
                "merchant_name": p.merchant_name,
                "monthly_amount_minor": p.monthly_amount_minor,
                "remaining_minor": computed["remaining_minor"],
                "remaining_months": computed["remaining_months"],
                "status": computed["status"],
            }
        )

    return {"debts": debt_items, "installments": installment_items}
