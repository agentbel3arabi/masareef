"""Transaction business logic. No HTTP awareness."""

import datetime
import uuid
from typing import Any

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction, TransactionSplit
from app.schemas.transaction import SplitItem, TransactionCreate, TransactionUpdate
from app.services.balance import compute_balance_delta

# ---------------------------------------------------------------------------
# Core CRUD
# ---------------------------------------------------------------------------


async def create_transaction(
    session: AsyncSession,
    household_id: uuid.UUID,
    data: TransactionCreate,
) -> Transaction:
    """Create a transaction, compute signed amount, update account balance."""
    # Validate account exists, is active, and belongs to this household.
    account = await session.get(Account, data.account_id)
    if account is None or not account.is_active or account.household_id != household_id:
        raise ValueError(f"Account {data.account_id} not found")

    if data.category_id is not None:
        await validate_category_access(session, data.category_id, household_id)

    signed = compute_balance_delta(data.amount_minor, data.type)

    tx = Transaction(
        household_id=household_id,
        account_id=data.account_id,
        date=data.date,
        description=data.description,
        amount_minor=signed,
        currency=account.currency,
        type=data.type,
        category_id=data.category_id,
        notes=data.notes,
        gam3eya_id=data.gam3eya_id,
        asset_id=data.asset_id,
        applies_to_balance=True,
    )
    session.add(tx)
    await session.flush()
    return tx


async def get_transaction(
    session: AsyncSession,
    household_id: uuid.UUID,
    transaction_id: int,
) -> Transaction | None:
    """Return a single active transaction scoped to household, or None."""
    q = select(Transaction).where(
        Transaction.id == transaction_id,
        Transaction.household_id == household_id,
        Transaction.is_active.is_(True),
    )
    result = await session.execute(q)
    return result.scalar_one_or_none()


async def update_transaction(
    session: AsyncSession,
    tx: Transaction,
    data: TransactionUpdate,
) -> Transaction:
    """Update transaction fields. Balance is computed from seed + all transactions."""
    old_signed = int(tx.amount_minor)
    update_fields = data.model_dump(exclude_unset=True)

    category_id = update_fields.get("category_id")
    if category_id is not None:
        await validate_category_access(session, category_id, tx.household_id)

    # Determine new signed amount before mutating the model.
    new_amount_minor: int | None = update_fields.get("amount_minor")
    new_type: str | None = update_fields.get("type")

    if new_amount_minor is not None or new_type is not None:
        # Recompute signed value from the resolved amount + type.
        resolved_amount = new_amount_minor if new_amount_minor is not None else abs(old_signed)
        # TransactionType is a StrEnum — str() yields the plain value ("debit"/"credit").
        resolved_type = new_type if new_type is not None else str(tx.type)
        new_signed = compute_balance_delta(resolved_amount, resolved_type)
        update_fields["amount_minor"] = new_signed
        # "type" stays in update_fields so the model column is also updated.
    else:
        new_signed = old_signed

    # Apply all field updates to the ORM object.
    for field, value in update_fields.items():
        setattr(tx, field, value)

    await session.flush()
    return tx


async def soft_delete_transaction(
    session: AsyncSession,
    tx: Transaction,
) -> None:
    """Soft-delete a transaction, reverse its balance contribution, hard-delete splits."""
    # Hard-delete splits first (TransactionSplit has no is_active column).
    await session.execute(delete(TransactionSplit).where(TransactionSplit.transaction_id == tx.id))

    tx.is_active = False
    await session.flush()


# ---------------------------------------------------------------------------
# List / search
# ---------------------------------------------------------------------------

_SORT_MAP: dict[str, Any] = {
    "-date": (Transaction.date.desc(), Transaction.id.desc()),
    "date": (Transaction.date.asc(), Transaction.id.desc()),
    "-amount": (Transaction.amount_minor.desc(), Transaction.id.desc()),
    "amount": (Transaction.amount_minor.asc(), Transaction.id.desc()),
}
_DEFAULT_SORT = _SORT_MAP["-date"]


async def list_transactions(
    session: AsyncSession,
    household_id: uuid.UUID,
    *,
    account_id: int | None = None,
    q_search: str | None = None,
    tx_type: str | None = None,
    category_id: int | None = None,
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
    amount_min: int | None = None,
    amount_max: int | None = None,
    has_category: bool | None = None,
    asset_id: int | None = None,
    sort: str = "-date",
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Transaction], int]:
    """Paginated transaction list with optional filters. Returns (rows, total)."""
    base_filters = [
        Transaction.household_id == household_id,
        Transaction.is_active.is_(True),
    ]

    if account_id is not None:
        base_filters.append(Transaction.account_id == account_id)

    if q_search:
        pattern = f"%{q_search}%"
        base_filters.append(
            or_(
                Transaction.description.ilike(pattern),
                Transaction.notes.ilike(pattern),
            )
        )

    if tx_type is not None:
        base_filters.append(Transaction.type == tx_type)

    if category_id is not None:
        base_filters.append(Transaction.category_id == category_id)

    if date_from is not None:
        base_filters.append(Transaction.date >= date_from)

    if date_to is not None:
        base_filters.append(Transaction.date <= date_to)

    if amount_min is not None:
        base_filters.append(Transaction.amount_minor >= amount_min)

    if amount_max is not None:
        base_filters.append(Transaction.amount_minor <= amount_max)

    if has_category is True:
        base_filters.append(Transaction.category_id.is_not(None))
    elif has_category is False:
        base_filters.append(Transaction.category_id.is_(None))

    if asset_id is not None:
        base_filters.append(Transaction.asset_id == asset_id)

    # Count
    count_q = select(func.count(Transaction.id)).where(*base_filters)
    total: int = (await session.execute(count_q)).scalar_one()

    # Resolve sort order (2-tuple of ORDER BY clauses).
    order_clauses = _SORT_MAP.get(sort, _DEFAULT_SORT)

    fetch_q = (
        select(Transaction)
        .where(*base_filters)
        .order_by(*order_clauses)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = list((await session.execute(fetch_q)).scalars().all())
    return rows, total


# ---------------------------------------------------------------------------
# Splits
# ---------------------------------------------------------------------------


async def create_splits(
    session: AsyncSession,
    transaction_id: int,
    splits: list[SplitItem],
) -> list[TransactionSplit]:
    """Replace all splits for a transaction. Returns the new splits."""
    # Hard-delete existing splits for this transaction.
    await session.execute(
        delete(TransactionSplit).where(TransactionSplit.transaction_id == transaction_id)
    )

    new_splits: list[TransactionSplit] = []
    for item in splits:
        split = TransactionSplit(
            transaction_id=transaction_id,
            category_id=item.category_id,
            amount_minor=item.amount_minor,  # always positive per SplitItem validator
            notes=item.notes,
        )
        session.add(split)
        new_splits.append(split)

    await session.flush()
    return new_splits


# ---------------------------------------------------------------------------
# Bulk operations
# ---------------------------------------------------------------------------


async def bulk_delete(
    session: AsyncSession,
    household_id: uuid.UUID,
    ids: list[int],
) -> int:
    """Bulk soft-delete transactions. Returns count of deleted."""
    count = 0
    for tx_id in ids:
        tx = await get_transaction(session, household_id, tx_id)
        if tx:
            await soft_delete_transaction(session, tx)
            count += 1
    return count


async def validate_category_access(
    session: AsyncSession,
    category_id: int,
    household_id: uuid.UUID,
) -> None:
    """Raise ValueError if category is not accessible to household."""
    cat = await session.get(Category, category_id)
    if cat is None or not cat.is_active:
        raise ValueError(f"Category {category_id} not found")
    if not cat.is_predefined and cat.household_id != household_id:
        raise ValueError(f"Category {category_id} not found")


async def categorize_transaction(
    session: AsyncSession,
    tx: Transaction,
    category_id: int,
    household_id: uuid.UUID,
) -> None:
    """Set category on a transaction."""
    await validate_category_access(session, category_id, household_id)
    tx.category_id = category_id
    await session.flush()


async def bulk_categorize(
    session: AsyncSession,
    household_id: uuid.UUID,
    ids: list[int],
    category_id: int,
) -> int:
    """Bulk categorize transactions. Returns count updated."""
    await validate_category_access(session, category_id, household_id)
    count = 0
    for tx_id in ids:
        tx = await get_transaction(session, household_id, tx_id)
        if tx:
            tx.category_id = category_id
            count += 1
    await session.flush()
    return count
