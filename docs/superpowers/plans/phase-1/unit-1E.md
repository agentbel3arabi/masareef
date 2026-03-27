# Unit 1E: Transaction & Transfer APIs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Transaction CRUD router (create, read, update, delete, search, filter, split, bulk ops) and Transfer router (create, delete, list) — the most complex backend endpoints in Phase 1.

**Architecture:** Transactions use signed `amount_minor` (negative=debit, positive=credit). Transfers create two linked transactions atomically with balance updates. Splits allocate portions across categories. All queries include `household_id` + `is_active` filtering.

**Tech Stack:** FastAPI, SQLAlchemy async, Pydantic v2

**Required reading:** `CLAUDE.md` (money rules, soft delete), `03-features/transactions.md`, `03-features/transfers.md`

---

## File Structure

```
backend/app/
├── services/
│   ├── transaction.py       # NEW: Transaction CRUD + search + bulk
│   └── transfer.py          # NEW: Atomic two-leg transfer logic
├── routers/
│   ├── transactions.py      # NEW: 8 endpoints
│   └── transfers.py         # NEW: 3 endpoints
backend/tests/
├── services/
│   └── test_transfer_service.py
├── routers/
│   ├── test_transactions.py
│   └── test_transfers.py
```

---

### Task 1: Transaction Service

**Files:**
- Create: `backend/app/services/transaction.py`

- [ ] **Step 1: Write the service**

Create `backend/app/services/transaction.py`:
```python
"""Transaction business logic."""

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.transaction import Transaction, TransactionSplit
from app.schemas.transaction import TransactionCreate, TransactionUpdate, SplitItem
from app.services.balance import compute_balance_delta


async def create_transaction(
    session: AsyncSession,
    household_id: uuid.UUID,
    data: TransactionCreate,
) -> Transaction:
    """Create a transaction and update account balance."""
    signed_amount = compute_balance_delta(data.amount_minor, data.type)

    tx = Transaction(
        household_id=household_id,
        account_id=data.account_id,
        date=data.date,
        description=data.description,
        amount_minor=signed_amount,
        currency=data.currency,
        type=data.type,
        category_id=data.category_id,
        notes=data.notes,
        gam3eya_id=data.gam3eya_id,
        asset_id=data.asset_id,
    )
    session.add(tx)

    # Update account balance
    account = await session.get(Account, data.account_id)
    if account:
        account.balance_minor += signed_amount

    await session.flush()
    return tx


async def update_transaction(
    session: AsyncSession,
    tx: Transaction,
    data: TransactionUpdate,
) -> Transaction:
    """Update transaction: reverse old delta, apply new."""
    old_amount = tx.amount_minor

    update_data = data.model_dump(exclude_unset=True)

    # If amount or type changed, recompute signed amount
    new_amount_minor = update_data.get("amount_minor")
    new_type = update_data.get("type", tx.type)

    if new_amount_minor is not None:
        signed = compute_balance_delta(new_amount_minor, new_type)
        update_data["amount_minor"] = signed
        if "type" in update_data:
            del update_data["type"]  # Already applied via signed amount
        update_data["type"] = new_type

    for field, value in update_data.items():
        setattr(tx, field, value)

    new_amount = tx.amount_minor

    # Adjust balance: reverse old, apply new
    if tx.applies_to_balance:
        account = await session.get(Account, tx.account_id)
        if account:
            account.balance_minor += (new_amount - old_amount)

    await session.flush()
    return tx


async def soft_delete_transaction(
    session: AsyncSession,
    tx: Transaction,
) -> None:
    """Soft delete transaction, reverse balance, soft delete splits."""
    tx.is_active = False

    if tx.applies_to_balance:
        account = await session.get(Account, tx.account_id)
        if account:
            account.balance_minor -= tx.amount_minor

    # Soft delete splits if any
    splits_q = select(TransactionSplit).where(TransactionSplit.transaction_id == tx.id)
    result = await session.execute(splits_q)
    for split in result.scalars().all():
        await session.delete(split)

    await session.flush()


async def list_transactions(
    session: AsyncSession,
    household_id: uuid.UUID,
    account_id: int | None = None,
    q_search: str | None = None,
    tx_type: str | None = None,
    category_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    amount_min: int | None = None,
    amount_max: int | None = None,
    has_category: bool | None = None,
    asset_id: int | None = None,
    sort: str = "-date",
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Transaction], int]:
    """List transactions with filtering and pagination."""
    base_where = [
        Transaction.household_id == household_id,
        Transaction.is_active == True,  # noqa: E712
    ]

    if account_id is not None:
        base_where.append(Transaction.account_id == account_id)
    if tx_type:
        base_where.append(Transaction.type == tx_type)
    if category_id is not None:
        base_where.append(Transaction.category_id == category_id)
    if date_from:
        base_where.append(Transaction.date >= date_from)
    if date_to:
        base_where.append(Transaction.date <= date_to)
    if amount_min is not None:
        base_where.append(Transaction.amount_minor >= amount_min)
    if amount_max is not None:
        base_where.append(Transaction.amount_minor <= amount_max)
    if has_category is True:
        base_where.append(Transaction.category_id.isnot(None))
    elif has_category is False:
        base_where.append(Transaction.category_id.is_(None))
    if asset_id is not None:
        base_where.append(Transaction.asset_id == asset_id)
    if q_search:
        pattern = f"%{q_search}%"
        base_where.append(
            or_(
                Transaction.description.ilike(pattern),
                Transaction.notes.ilike(pattern),
            )
        )

    # Count
    count_q = select(func.count(Transaction.id)).where(*base_where)
    total = (await session.execute(count_q)).scalar_one()

    # Sort
    if sort == "-date":
        order = Transaction.date.desc()
    elif sort == "date":
        order = Transaction.date.asc()
    elif sort == "-amount":
        order = Transaction.amount_minor.desc()
    elif sort == "amount":
        order = Transaction.amount_minor.asc()
    else:
        order = Transaction.date.desc()

    q = (
        select(Transaction)
        .where(*base_where)
        .order_by(order, Transaction.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await session.execute(q)
    return list(result.scalars().all()), total


async def get_transaction(
    session: AsyncSession,
    household_id: uuid.UUID,
    transaction_id: int,
) -> Transaction | None:
    q = select(Transaction).where(
        Transaction.id == transaction_id,
        Transaction.household_id == household_id,
        Transaction.is_active == True,  # noqa: E712
    )
    result = await session.execute(q)
    return result.scalar_one_or_none()


async def create_splits(
    session: AsyncSession,
    transaction_id: int,
    splits: list[SplitItem],
) -> list[TransactionSplit]:
    """Replace splits for a transaction."""
    # Delete existing splits
    existing = await session.execute(
        select(TransactionSplit).where(TransactionSplit.transaction_id == transaction_id)
    )
    for s in existing.scalars().all():
        await session.delete(s)

    # Create new splits
    new_splits = []
    for item in splits:
        split = TransactionSplit(
            transaction_id=transaction_id,
            category_id=item.category_id,
            amount_minor=item.amount_minor,
            notes=item.notes,
        )
        session.add(split)
        new_splits.append(split)

    await session.flush()
    return new_splits


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


async def bulk_categorize(
    session: AsyncSession,
    household_id: uuid.UUID,
    ids: list[int],
    category_id: int,
) -> int:
    """Bulk categorize transactions. Returns count updated."""
    count = 0
    for tx_id in ids:
        tx = await get_transaction(session, household_id, tx_id)
        if tx:
            tx.category_id = category_id
            count += 1
    await session.flush()
    return count
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/transaction.py
git commit -m "feat(backend): add transaction service with CRUD, search, splits, bulk ops"
```

---

### Task 2: Transaction Router with Tests

**Files:**
- Create: `backend/app/routers/transactions.py`
- Test: `backend/tests/routers/test_transactions.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/routers/test_transactions.py`:
```python
import pytest


async def _create_account(client) -> int:
    resp = await client.post("/api/v1/accounts", json={
        "name": "Test", "type": "bank_account", "currency": "EGP", "initial_balance": 1000000,
    })
    return resp.json()["data"]["id"]


@pytest.mark.asyncio
async def test_create_transaction_debit(client):
    acct_id = await _create_account(client)
    resp = await client.post("/api/v1/transactions", json={
        "account_id": acct_id, "date": "2026-03-20",
        "description": "Groceries", "amount_minor": 50000,
        "type": "debit", "currency": "EGP",
    })
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["amount_minor"] == -50000  # Stored as negative


@pytest.mark.asyncio
async def test_create_transaction_updates_balance(client):
    acct_id = await _create_account(client)
    await client.post("/api/v1/transactions", json={
        "account_id": acct_id, "date": "2026-03-20",
        "amount_minor": 50000, "type": "debit", "currency": "EGP",
    })
    acct_resp = await client.get(f"/api/v1/accounts/{acct_id}")
    # Seed was 1000000, debit of 50000 → balance = 950000
    assert acct_resp.json()["data"]["balance_minor"] == 950000


@pytest.mark.asyncio
async def test_delete_transaction_reverses_balance(client):
    acct_id = await _create_account(client)
    create_resp = await client.post("/api/v1/transactions", json={
        "account_id": acct_id, "date": "2026-03-20",
        "amount_minor": 50000, "type": "debit", "currency": "EGP",
    })
    tx_id = create_resp.json()["data"]["id"]
    await client.delete(f"/api/v1/transactions/{tx_id}")
    acct_resp = await client.get(f"/api/v1/accounts/{acct_id}")
    assert acct_resp.json()["data"]["balance_minor"] == 1000000  # Restored


@pytest.mark.asyncio
async def test_list_transactions_with_filters(client):
    acct_id = await _create_account(client)
    await client.post("/api/v1/transactions", json={
        "account_id": acct_id, "date": "2026-03-20",
        "description": "Carrefour", "amount_minor": 50000,
        "type": "debit", "currency": "EGP",
    })
    resp = await client.get(f"/api/v1/transactions?account_id={acct_id}&q=Carrefour")
    assert resp.status_code == 200
    assert resp.json()["meta"]["total"] >= 1


@pytest.mark.asyncio
async def test_split_transaction(client):
    acct_id = await _create_account(client)
    create_resp = await client.post("/api/v1/transactions", json={
        "account_id": acct_id, "date": "2026-03-20",
        "amount_minor": 100000, "type": "debit", "currency": "EGP",
    })
    tx_id = create_resp.json()["data"]["id"]
    split_resp = await client.post(f"/api/v1/transactions/{tx_id}/split", json={
        "splits": [
            {"category_id": 1, "amount_minor": 60000},
            {"category_id": 2, "amount_minor": 40000},
        ]
    })
    assert split_resp.status_code == 200


@pytest.mark.asyncio
async def test_split_validation_sum_mismatch(client):
    acct_id = await _create_account(client)
    create_resp = await client.post("/api/v1/transactions", json={
        "account_id": acct_id, "date": "2026-03-20",
        "amount_minor": 100000, "type": "debit", "currency": "EGP",
    })
    tx_id = create_resp.json()["data"]["id"]
    split_resp = await client.post(f"/api/v1/transactions/{tx_id}/split", json={
        "splits": [
            {"category_id": 1, "amount_minor": 60000},
            {"category_id": 2, "amount_minor": 30000},  # Sum=90000 != 100000
        ]
    })
    assert split_resp.status_code == 400


@pytest.mark.asyncio
async def test_bulk_delete(client):
    acct_id = await _create_account(client)
    ids = []
    for i in range(3):
        resp = await client.post("/api/v1/transactions", json={
            "account_id": acct_id, "date": "2026-03-20",
            "amount_minor": 10000, "type": "debit", "currency": "EGP",
        })
        ids.append(resp.json()["data"]["id"])
    bulk_resp = await client.post("/api/v1/transactions/bulk/delete", json={"ids": ids})
    assert bulk_resp.status_code == 200
    assert bulk_resp.json()["data"]["deleted"] == 3
```

- [ ] **Step 2: Write transactions router**

Create `backend/app/routers/transactions.py`:
```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.schemas.common import PaginationMeta, SuccessResponse
from app.schemas.transaction import (
    BulkCategorizeRequest,
    BulkDeleteRequest,
    CategorizeRequest,
    SplitRequest,
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)
from app.services import transaction as tx_service

router = APIRouter(prefix="/api/v1/transactions", tags=["transactions"])


@router.get("")
async def list_transactions(
    account_id: int | None = None,
    q: str | None = None,
    type: str | None = None,
    category_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    amount_min: int | None = None,
    amount_max: int | None = None,
    has_category: bool | None = None,
    asset_id: int | None = None,
    sort: str = "-date",
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    txs, total = await tx_service.list_transactions(
        session, household_id,
        account_id=account_id, q_search=q, tx_type=type,
        category_id=category_id, date_from=date_from, date_to=date_to,
        amount_min=amount_min, amount_max=amount_max,
        has_category=has_category, asset_id=asset_id,
        sort=sort, page=page, page_size=page_size,
    )
    items = [
        TransactionResponse(
            id=tx.id, account_id=tx.account_id, date=tx.date,
            description=tx.description or "", amount_minor=tx.amount_minor,
            currency=tx.currency, type=tx.type.value if hasattr(tx.type, "value") else tx.type,
            is_split=len(tx.splits) > 0 if hasattr(tx, "splits") and tx.splits else False,
            transfer_id=tx.transfer_id, asset_id=tx.asset_id,
            ai_categorized=tx.ai_categorized, ai_confidence=tx.ai_confidence,
            notes=tx.notes,
        ).model_dump()
        for tx in txs
    ]
    return SuccessResponse(
        data=items,
        meta=PaginationMeta(total=total, page=page, page_size=page_size),
    )


@router.get("/{transaction_id}")
async def get_transaction(
    transaction_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    tx = await tx_service.get_transaction(session, household_id, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    resp = TransactionResponse(
        id=tx.id, account_id=tx.account_id, date=tx.date,
        description=tx.description or "", amount_minor=tx.amount_minor,
        currency=tx.currency, type=tx.type.value if hasattr(tx.type, "value") else tx.type,
        transfer_id=tx.transfer_id, asset_id=tx.asset_id,
        ai_categorized=tx.ai_categorized, ai_confidence=tx.ai_confidence,
        notes=tx.notes,
    )
    return SuccessResponse(data=resp.model_dump())


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_transaction(
    data: TransactionCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    tx = await tx_service.create_transaction(session, household_id, data)
    resp = TransactionResponse(
        id=tx.id, account_id=tx.account_id, date=tx.date,
        description=tx.description or "", amount_minor=tx.amount_minor,
        currency=tx.currency, type=tx.type.value if hasattr(tx.type, "value") else tx.type,
        transfer_id=tx.transfer_id, asset_id=tx.asset_id,
        ai_categorized=tx.ai_categorized, ai_confidence=tx.ai_confidence,
        notes=tx.notes,
    )
    return SuccessResponse(data=resp.model_dump())


@router.put("/{transaction_id}")
async def update_transaction(
    transaction_id: int,
    data: TransactionUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    tx = await tx_service.get_transaction(session, household_id, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    tx = await tx_service.update_transaction(session, tx, data)
    resp = TransactionResponse(
        id=tx.id, account_id=tx.account_id, date=tx.date,
        description=tx.description or "", amount_minor=tx.amount_minor,
        currency=tx.currency, type=tx.type.value if hasattr(tx.type, "value") else tx.type,
        notes=tx.notes,
    )
    return SuccessResponse(data=resp.model_dump())


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    tx = await tx_service.get_transaction(session, household_id, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    await tx_service.soft_delete_transaction(session, tx)


@router.post("/{transaction_id}/split")
async def split_transaction(
    transaction_id: int,
    data: SplitRequest,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    tx = await tx_service.get_transaction(session, household_id, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    split_sum = sum(s.amount_minor for s in data.splits)
    if split_sum != abs(tx.amount_minor):
        raise HTTPException(
            status_code=400,
            detail=f"Split sum ({split_sum}) must equal transaction amount ({abs(tx.amount_minor)})",
        )

    await tx_service.create_splits(session, transaction_id, data.splits)
    return SuccessResponse(data={"ok": True})


@router.post("/{transaction_id}/categorize")
async def categorize_transaction(
    transaction_id: int,
    data: CategorizeRequest,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    tx = await tx_service.get_transaction(session, household_id, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    tx.category_id = data.category_id
    await session.flush()
    return SuccessResponse(data={"ok": True})


@router.post("/bulk/delete")
async def bulk_delete_transactions(
    data: BulkDeleteRequest,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    count = await tx_service.bulk_delete(session, household_id, data.ids)
    return SuccessResponse(data={"deleted": count})


@router.post("/bulk/categorize")
async def bulk_categorize_transactions(
    data: BulkCategorizeRequest,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    count = await tx_service.bulk_categorize(session, household_id, data.ids, data.category_id)
    return SuccessResponse(data={"categorized": count})
```

- [ ] **Step 3: Register router in main.py**

Add to `backend/app/main.py`:
```python
from app.routers import transactions

app.include_router(transactions.router)
```

- [ ] **Step 4: Run tests**

```bash
uv run pytest tests/routers/test_transactions.py -v
```

Expected: 8 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/transaction.py backend/app/routers/transactions.py backend/tests/routers/test_transactions.py backend/app/main.py
git commit -m "feat(transactions): add Transaction CRUD router with search, splits, bulk ops"
```

---

### Task 3: Transfer Service and Router

**Files:**
- Create: `backend/app/services/transfer.py`
- Create: `backend/app/routers/transfers.py`
- Test: `backend/tests/routers/test_transfers.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/routers/test_transfers.py`:
```python
import pytest


async def _create_accounts(client) -> tuple[int, int]:
    r1 = await client.post("/api/v1/accounts", json={
        "name": "Bank", "type": "bank_account", "currency": "EGP", "initial_balance": 1000000,
    })
    r2 = await client.post("/api/v1/accounts", json={
        "name": "Cash", "type": "cash_wallet", "currency": "EGP", "initial_balance": 0,
    })
    return r1.json()["data"]["id"], r2.json()["data"]["id"]


@pytest.mark.asyncio
async def test_create_same_currency_transfer(client):
    from_id, to_id = await _create_accounts(client)
    resp = await client.post("/api/v1/transfers", json={
        "from_account_id": from_id, "to_account_id": to_id,
        "amount_minor": 500000, "date": "2026-03-20",
    })
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["source_amount"] == 500000
    assert data["target_amount"] == 500000


@pytest.mark.asyncio
async def test_transfer_updates_both_balances(client):
    from_id, to_id = await _create_accounts(client)
    await client.post("/api/v1/transfers", json={
        "from_account_id": from_id, "to_account_id": to_id,
        "amount_minor": 500000, "date": "2026-03-20",
    })
    from_acct = await client.get(f"/api/v1/accounts/{from_id}")
    to_acct = await client.get(f"/api/v1/accounts/{to_id}")
    assert from_acct.json()["data"]["balance_minor"] == 500000   # 1M - 500K
    assert to_acct.json()["data"]["balance_minor"] == 500000     # 0 + 500K


@pytest.mark.asyncio
async def test_transfer_to_same_account_fails(client):
    from_id, _ = await _create_accounts(client)
    resp = await client.post("/api/v1/transfers", json={
        "from_account_id": from_id, "to_account_id": from_id,
        "amount_minor": 500000, "date": "2026-03-20",
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_delete_transfer_reverses_both_balances(client):
    from_id, to_id = await _create_accounts(client)
    create_resp = await client.post("/api/v1/transfers", json={
        "from_account_id": from_id, "to_account_id": to_id,
        "amount_minor": 500000, "date": "2026-03-20",
    })
    transfer_id = create_resp.json()["data"]["transfer_id"]
    await client.delete(f"/api/v1/transfers/{transfer_id}")
    from_acct = await client.get(f"/api/v1/accounts/{from_id}")
    to_acct = await client.get(f"/api/v1/accounts/{to_id}")
    assert from_acct.json()["data"]["balance_minor"] == 1000000  # Restored
    assert to_acct.json()["data"]["balance_minor"] == 0          # Restored


@pytest.mark.asyncio
async def test_list_transfers(client):
    from_id, to_id = await _create_accounts(client)
    await client.post("/api/v1/transfers", json={
        "from_account_id": from_id, "to_account_id": to_id,
        "amount_minor": 500000, "date": "2026-03-20",
    })
    resp = await client.get("/api/v1/transfers")
    assert resp.status_code == 200
    assert resp.json()["meta"]["total"] >= 1
```

- [ ] **Step 2: Write transfer service**

Create `backend/app/services/transfer.py`:
```python
"""Transfer service: atomic two-leg transfers between accounts."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.transaction import Transaction
from app.schemas.transfer import TransferCreate


async def create_transfer(
    session: AsyncSession,
    household_id: uuid.UUID,
    data: TransferCreate,
) -> dict:
    """Create a two-leg transfer atomically."""
    if data.from_account_id == data.to_account_id:
        raise ValueError("Cannot transfer to the same account")

    from_acct = await session.get(Account, data.from_account_id)
    to_acct = await session.get(Account, data.to_account_id)

    if not from_acct or not to_acct:
        raise ValueError("Account not found")

    # Compute target amount
    source_amount = data.amount_minor
    if data.fx_rate_minor_units:
        target_amount = round(source_amount * data.fx_rate_minor_units / 10000)
    else:
        if from_acct.currency != to_acct.currency:
            raise ValueError("FX rate required for cross-currency transfer")
        target_amount = source_amount

    transfer_id = uuid.uuid4()

    # Category for transfers (special: Transfer)
    from app.models.category import Category
    transfer_cat = await session.execute(
        select(Category).where(Category.name_en == "Transfer", Category.is_predefined == True)  # noqa: E712
    )
    transfer_category = transfer_cat.scalar_one_or_none()
    cat_id = transfer_category.id if transfer_category else None

    # Debit leg
    debit = Transaction(
        household_id=household_id,
        account_id=data.from_account_id,
        date=data.date,
        description=data.description or f"Transfer to {to_acct.name}",
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

    # Credit leg
    credit = Transaction(
        household_id=household_id,
        account_id=data.to_account_id,
        date=data.date,
        description=data.description or f"Transfer from {from_acct.name}",
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

    # Update balances directly
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
    """Delete both legs and reverse both balance updates."""
    q = select(Transaction).where(
        Transaction.transfer_id == transfer_id,
        Transaction.household_id == household_id,
    )
    result = await session.execute(q)
    legs = result.scalars().all()

    if not legs:
        raise ValueError("Transfer not found")

    for leg in legs:
        # Reverse balance (legs have applies_to_balance=False, but we updated balance directly)
        account = await session.get(Account, leg.account_id)
        if account:
            if leg.type == "debit" or (hasattr(leg.type, "value") and leg.type.value == "debit"):
                account.balance_minor += abs(leg.amount_minor)
            else:
                account.balance_minor -= abs(leg.amount_minor)
        leg.is_active = False

    await session.flush()


async def list_transfers(
    session: AsyncSession,
    household_id: uuid.UUID,
    account_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[dict], int]:
    """List transfers. Groups debit+credit legs by transfer_id."""
    from sqlalchemy import func, distinct

    base_where = [
        Transaction.household_id == household_id,
        Transaction.is_active == True,  # noqa: E712
        Transaction.transfer_id.isnot(None),
        Transaction.type == "debit",  # Only count debit legs to avoid doubles
    ]
    if account_id:
        base_where.append(
            (Transaction.account_id == account_id)
        )

    count_q = select(func.count(Transaction.id)).where(*base_where)
    total = (await session.execute(count_q)).scalar_one()

    q = (
        select(Transaction)
        .where(*base_where)
        .order_by(Transaction.date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await session.execute(q)
    debit_legs = result.scalars().all()

    transfers = []
    for debit in debit_legs:
        # Find credit leg
        credit_q = select(Transaction).where(
            Transaction.transfer_id == debit.transfer_id,
            Transaction.type == "credit",
        )
        credit_result = await session.execute(credit_q)
        credit = credit_result.scalar_one_or_none()

        from_acct = await session.get(Account, debit.account_id)
        to_acct = await session.get(Account, credit.account_id) if credit else None

        transfers.append({
            "transfer_id": str(debit.transfer_id),
            "date": str(debit.date),
            "description": debit.description or "",
            "from_account": {"id": from_acct.id, "name": from_acct.name, "currency": from_acct.currency} if from_acct else {},
            "to_account": {"id": to_acct.id, "name": to_acct.name, "currency": to_acct.currency} if to_acct else {},
            "source_amount": abs(debit.amount_minor),
            "target_amount": abs(credit.amount_minor) if credit else 0,
            "fx_rate_minor_units": debit.fx_rate_minor_units,
        })

    return transfers, total
```

- [ ] **Step 3: Write transfers router**

Create `backend/app/routers/transfers.py`:
```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.schemas.common import PaginationMeta, SuccessResponse
from app.schemas.transfer import TransferCreate
from app.services import transfer as transfer_service

router = APIRouter(prefix="/api/v1/transfers", tags=["transfers"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_transfer(
    data: TransferCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    try:
        result = await transfer_service.create_transfer(session, household_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return SuccessResponse(data={
        "transfer_id": str(result["transfer_id"]),
        "debit_transaction_id": result["debit_transaction_id"],
        "credit_transaction_id": result["credit_transaction_id"],
        "source_amount": result["source_amount"],
        "target_amount": result["target_amount"],
    })


@router.delete("/{transfer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transfer(
    transfer_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    try:
        await transfer_service.delete_transfer(session, household_id, transfer_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("")
async def list_transfers(
    account_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    transfers, total = await transfer_service.list_transfers(
        session, household_id,
        account_id=account_id, date_from=date_from, date_to=date_to,
        page=page, page_size=page_size,
    )
    return SuccessResponse(
        data=transfers,
        meta=PaginationMeta(total=total, page=page, page_size=page_size),
    )
```

- [ ] **Step 4: Register router in main.py**

Add to `backend/app/main.py`:
```python
from app.routers import transfers

app.include_router(transfers.router)
```

- [ ] **Step 5: Run tests**

```bash
uv run pytest tests/routers/test_transfers.py -v
```

Expected: 5 passed

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/transfer.py backend/app/routers/transfers.py backend/tests/routers/test_transfers.py backend/app/main.py
git commit -m "feat(transfers): add atomic two-leg transfer with cross-currency FX support"
```

---

### Task 4: Run Full Test Suite

- [ ] **Step 1: Run all tests**

```bash
uv run pytest -v
```

Expected: All pass (~80+ tests).

- [ ] **Step 2: Lint and format**

```bash
uv run ruff check . && uv run ruff format --check .
```

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "style(backend): format transaction and transfer code"
```
