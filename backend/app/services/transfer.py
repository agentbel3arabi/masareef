"""Transfer business logic. No HTTP awareness."""

import datetime
import uuid
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction
from app.schemas.transfer import TransferCreate


async def create_transfer(
    session: AsyncSession,
    household_id: uuid.UUID,
    data: TransferCreate,
) -> dict[str, Any]:
    """Create an atomic two-leg transfer (debit + credit) between accounts.

    Returns a dict with transfer_id, both transaction ids, and amounts.
    Raises ValueError for invalid input.
    """
    if data.from_account_id == data.to_account_id:
        raise ValueError("Source and destination accounts must be different")

    # Load both accounts
    from_acct = await session.get(Account, data.from_account_id)
    if from_acct is None or not from_acct.is_active:
        raise ValueError(f"Source account {data.from_account_id} not found")

    to_acct = await session.get(Account, data.to_account_id)
    if to_acct is None or not to_acct.is_active:
        raise ValueError(f"Destination account {data.to_account_id} not found")

    # Verify household ownership
    if from_acct.household_id != household_id:
        raise ValueError(f"Source account {data.from_account_id} not found")
    if to_acct.household_id != household_id:
        raise ValueError(f"Destination account {data.to_account_id} not found")

    source_amount = abs(data.amount_minor)

    # Compute target amount — pure integer arithmetic, no float intermediates
    if data.fx_rate_minor_units is not None:
        if from_acct.currency == to_acct.currency:
            raise ValueError("FX rate must not be provided for same-currency transfers")
        # Round-half-up: add half the divisor before integer division
        target_amount = (source_amount * data.fx_rate_minor_units + 5000) // 10000
    elif from_acct.currency != to_acct.currency:
        raise ValueError("FX rate required for cross-currency transfer")
    else:
        target_amount = source_amount

    # Try to find the predefined "Transfer" category
    cat_q = select(Category).where(
        Category.name_en == "Transfer",
        Category.is_predefined.is_(True),
        Category.is_active.is_(True),
    )
    cat_result = await session.execute(cat_q)
    transfer_cat = cat_result.scalar_one_or_none()
    cat_id = transfer_cat.id if transfer_cat is not None else None

    # Generate shared transfer_id
    transfer_id = uuid.uuid4()

    # Debit leg (from account)
    debit_desc = data.description or f"Transfer to {to_acct.name}"
    debit = Transaction(
        household_id=household_id,
        account_id=data.from_account_id,
        date=data.date,
        description=debit_desc,
        amount_minor=-abs(source_amount),
        currency=from_acct.currency,
        type="debit",
        category_id=cat_id,
        transfer_id=transfer_id,
        fx_rate_minor_units=data.fx_rate_minor_units,
        applies_to_balance=False,
        notes=data.notes,
    )
    session.add(debit)

    # Credit leg (to account)
    credit_desc = data.description or f"Transfer from {from_acct.name}"
    credit = Transaction(
        household_id=household_id,
        account_id=data.to_account_id,
        date=data.date,
        description=credit_desc,
        amount_minor=abs(target_amount),
        currency=to_acct.currency,
        type="credit",
        category_id=cat_id,
        transfer_id=transfer_id,
        fx_rate_minor_units=data.fx_rate_minor_units,
        applies_to_balance=False,
        notes=data.notes,
    )
    session.add(credit)

    # Update balances directly (applies_to_balance=False avoids double-counting)
    from_acct.balance_minor -= abs(source_amount)
    to_acct.balance_minor += abs(target_amount)

    await session.flush()

    return {
        "transfer_id": transfer_id,
        "debit_transaction_id": debit.id,
        "credit_transaction_id": credit.id,
        "source_amount": source_amount,
        "target_amount": target_amount,
    }


async def delete_transfer(
    session: AsyncSession,
    household_id: uuid.UUID,
    transfer_id: uuid.UUID,
) -> None:
    """Soft-delete both legs of a transfer and restore account balances.

    Raises ValueError if not found.
    """
    q = select(Transaction).where(
        Transaction.transfer_id == transfer_id,
        Transaction.household_id == household_id,
        Transaction.is_active.is_(True),
    )
    result = await session.execute(q)
    legs = list(result.scalars().all())

    if not legs:
        raise ValueError("Transfer not found")

    for leg in legs:
        account = await session.get(Account, leg.account_id)
        if account is not None:
            tx_type = leg.type
            type_str = tx_type.value if hasattr(tx_type, "value") else tx_type
            if type_str == "debit":
                account.balance_minor += abs(int(leg.amount_minor))
            elif type_str == "credit":
                account.balance_minor -= abs(int(leg.amount_minor))
        leg.is_active = False

    await session.flush()


async def list_transfers(
    session: AsyncSession,
    household_id: uuid.UUID,
    *,
    account_id: int | None = None,
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[dict[str, Any]], int]:
    """List transfers (debit legs only) using a JOIN. Returns (items, total_count)."""
    # Aliases for the JOIN
    credit_leg = aliased(Transaction, name="credit_leg")
    from_acct = aliased(Account, name="from_acct")
    to_acct = aliased(Account, name="to_acct")

    base_filters = [
        Transaction.household_id == household_id,
        Transaction.is_active.is_(True),
        Transaction.type == "debit",
        Transaction.transfer_id.is_not(None),
    ]
    if account_id is not None:
        base_filters.append(Transaction.account_id == account_id)
    if date_from is not None:
        base_filters.append(Transaction.date >= date_from)
    if date_to is not None:
        base_filters.append(Transaction.date <= date_to)

    # Count query (debit legs only)
    count_q = select(func.count(Transaction.id)).where(*base_filters)
    total: int = (await session.execute(count_q)).scalar_one()

    if total == 0:
        return [], 0

    # Single JOIN query: debit leg + credit leg + both accounts
    fetch_q = (
        select(Transaction, credit_leg, from_acct, to_acct)
        .join(
            credit_leg,
            and_(
                credit_leg.transfer_id == Transaction.transfer_id,
                credit_leg.type == "credit",
                credit_leg.is_active.is_(True),
                credit_leg.household_id == household_id,
            ),
            isouter=True,
        )
        .join(from_acct, from_acct.id == Transaction.account_id, isouter=True)
        .join(to_acct, to_acct.id == credit_leg.account_id, isouter=True)
        .where(*base_filters)
        .order_by(Transaction.date.desc(), Transaction.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await session.execute(fetch_q)).all()

    def _acct_dict(a: Account | None) -> dict | None:
        if a is None:
            return None
        return {
            "id": a.id,
            "name": a.name,
            "currency": a.currency,
            "type": a.type.value if hasattr(a.type, "value") else a.type,
            "institution_id": a.institution_id,
        }

    items: list[dict[str, Any]] = []
    for debit, credit, fa, ta in rows:
        items.append(
            {
                "transfer_id": debit.transfer_id,
                "date": debit.date,
                "description": debit.description,
                "from_account": _acct_dict(fa),
                "to_account": _acct_dict(ta),
                "source_amount": abs(int(debit.amount_minor)),
                "target_amount": abs(int(credit.amount_minor)) if credit else 0,
                "fx_rate_minor_units": debit.fx_rate_minor_units,
            }
        )

    return items, total
