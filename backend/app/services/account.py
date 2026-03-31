"""Account business logic. No HTTP awareness."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.household import Household
from app.models.transaction import Transaction
from app.schemas.account import AccountCreate, AccountUpdate


async def list_accounts(
    session: AsyncSession,
    household_id: uuid.UUID,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Account], int]:
    """List active accounts with pagination. Returns (accounts, total_count)."""
    # Count
    count_q = select(func.count(Account.id)).where(
        Account.household_id == household_id,
        Account.is_active.is_(True),
    )
    total = (await session.execute(count_q)).scalar_one()

    # Fetch
    q = (
        select(Account)
        .where(Account.household_id == household_id, Account.is_active.is_(True))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .order_by(Account.id)
    )
    result = await session.execute(q)
    return list(result.scalars().all()), total


async def get_account(
    session: AsyncSession,
    household_id: uuid.UUID,
    account_id: int,
) -> Account | None:
    """Get a single active account by ID within household."""
    q = select(Account).where(
        Account.id == account_id,
        Account.household_id == household_id,
        Account.is_active.is_(True),
    )
    result = await session.execute(q)
    return result.scalar_one_or_none()


async def create_account(
    session: AsyncSession,
    household_id: uuid.UUID,
    data: AccountCreate,
) -> Account:
    """Create a new account."""
    account = Account(
        household_id=household_id,
        name=data.name,
        type=data.type,
        currency=data.currency,
        balance_minor=data.initial_balance,
        institution=data.institution,
        credit_limit=data.credit_limit,
        billing_cycle_day=data.billing_cycle_day,
        payment_due_day=data.payment_due_day,
        opened_at=data.opened_at,
    )
    session.add(account)
    await session.flush()
    return account


async def update_account(
    session: AsyncSession,
    account: Account,
    data: AccountUpdate,
) -> Account:
    """Update account fields. Currency and type are immutable."""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)
    await session.flush()
    return account


async def soft_delete_account(
    session: AsyncSession,
    account: Account,
) -> None:
    """Soft delete an account."""
    account.is_active = False
    await session.flush()


async def compute_displayed_balance(
    session: AsyncSession,
    account: Account,
) -> int:
    """Compute displayed balance: seed + sum of active transactions.

    See also: balance.py:compute_displayed_balance (pure Python variant for testing).
    """
    q = select(func.coalesce(func.sum(Transaction.amount_minor), 0)).where(
        Transaction.account_id == account.id,
        Transaction.household_id == account.household_id,
        Transaction.is_active.is_(True),
        Transaction.applies_to_balance.is_(True),
    )
    if account.opened_at:
        q = q.where(Transaction.date >= account.opened_at)

    tx_sum = (await session.execute(q)).scalar_one()
    return account.balance_minor + tx_sum


async def compute_net_worth(
    session: AsyncSession,
    household_id: uuid.UUID,
) -> dict:
    """Compute net worth across all active accounts."""
    accounts, _ = await list_accounts(session, household_id, page=1, page_size=1000)

    by_currency: dict[str, int] = {}
    for acct in accounts:
        bal = await compute_displayed_balance(session, acct)
        by_currency[acct.currency] = by_currency.get(acct.currency, 0) + bal

    # Fetch household base currency
    hh = await session.get(Household, household_id)
    base_currency = hh.base_currency if hh else "EGP"

    # Total in base currency — same-currency accounts only for now.
    # Cross-currency aggregation requires exchange rates (Phase 5).
    total_base_minor = by_currency.get(base_currency, 0)

    return {
        "by_currency": by_currency,
        "total_base_minor": total_base_minor,
        "base_currency": base_currency,
        "account_count": len(accounts),
    }


async def reconcile_account(
    session: AsyncSession,
    account: Account,
    actual_balance: int,
    notes: str | None = None,  # TODO: persist to reconciliation history table when created
) -> int:
    """Reconcile: adjust seed balance so displayed_balance = actual_balance.

    Returns the discrepancy (actual - computed).
    """
    displayed = await compute_displayed_balance(session, account)
    discrepancy = actual_balance - displayed
    account.balance_minor += discrepancy
    await session.flush()
    return discrepancy
