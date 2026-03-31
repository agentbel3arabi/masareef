"""Duplicate transaction detection for import pipeline.

Strategy: load all existing transaction hashes for the account in one query (O(N)),
then check each parsed row in O(1). Total: one DB round trip per import session.
"""

import datetime
import hashlib
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction
from app.schemas.import_ import ParsedRow


def _make_hash(account_id: int, date: datetime.date, amount_minor: int, description: str) -> str:
    """Create a stable dedup hash for (account, date, amount, description)."""
    key = f"{account_id}|{date.isoformat()}|{amount_minor}|{description.lower().strip()}"
    return hashlib.sha256(key.encode()).hexdigest()


async def load_existing_hashes(
    session: AsyncSession,
    account_id: int,
    household_id: uuid.UUID | None = None,
) -> set[str]:
    """Load all transaction dedup hashes for an account in one query."""
    conditions = [
        Transaction.account_id == account_id,
        Transaction.is_active.is_(True),
    ]
    if household_id is not None:
        conditions.append(Transaction.household_id == household_id)
    result = await session.execute(
        select(Transaction.date, Transaction.amount_minor, Transaction.description).where(
            *conditions
        )
    )
    return {
        _make_hash(account_id, row.date, row.amount_minor, row.description or "")
        for row in result.all()
    }


def is_duplicate(
    account_id: int,
    date: datetime.date,
    amount_minor: int,
    description: str,
    existing_hashes: set[str],
) -> bool:
    """Check if a transaction already exists in the hash set."""
    return _make_hash(account_id, date, amount_minor, description) in existing_hashes


def mark_duplicates(
    rows: list[ParsedRow],
    account_id: int,
    existing_hashes: set[str],
) -> list[ParsedRow]:
    """Mark rows as 'duplicate' and deselect them. Mutates and returns rows."""
    for row in rows:
        if row.status != "valid":
            continue
        if row.date is not None and row.amount_minor is not None:
            if is_duplicate(
                account_id, row.date, row.amount_minor, row.description, existing_hashes
            ):
                row.status = "duplicate"
                row.selected = False
    return rows
