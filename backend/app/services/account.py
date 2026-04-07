"""Account business logic. No HTTP awareness."""

import uuid
from datetime import date as date_type
from datetime import datetime

from sqlalchemy import and_, case, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.enums import AccountType
from app.models.household import Household
from app.models.transaction import Transaction
from app.schemas.account import (
    AccountCreate,
    AccountUpdate,
    InstitutionEmbed,
    MonthlyStats,
)


def get_balance_cutoff_date(account: Account) -> date_type | None:
    """Return date before which transactions don't affect balance.

    Returns account.opened_at (last_reconciliation_date support deferred).
    """
    return account.opened_at


# ---------------------------------------------------------------------------
# Institution validation
# ---------------------------------------------------------------------------

ACCOUNT_TYPE_TO_INSTITUTION_TYPE = {
    "bank_account": "bank",
    "credit_card": "bank",
    "financing_app": "bnpl",
    "digital_wallet": "digital_wallet_provider",
}
INSTITUTION_RECOMMENDED_TYPES = {"bank_account", "credit_card", "financing_app"}


async def validate_institution(
    session: AsyncSession,
    household_id: uuid.UUID,
    account_type: str,
    institution_id: int | None,
) -> list[dict]:
    """Validate institution assignment for the given account type.

    Returns a list of warning dicts. Raises ValueError for hard errors only
    (e.g. type mismatch, institution not found, cash wallet with institution).
    """
    warnings: list[dict] = []
    if account_type == "cash_wallet":
        if institution_id is not None:
            raise ValueError("Cash wallets cannot have an institution")
        return warnings
    if account_type in INSTITUTION_RECOMMENDED_TYPES and institution_id is None:
        warnings.append(
            {
                "code": "INSTITUTION_RECOMMENDED",
                "message": f"Institution is recommended for {account_type}",
            }
        )
        return warnings
    if institution_id is not None:
        from app.services.financial_institution import get_institution_by_id

        institution = await get_institution_by_id(session, household_id, institution_id)
        if institution is None:
            raise ValueError("Institution not found")
        expected_type = ACCOUNT_TYPE_TO_INSTITUTION_TYPE.get(account_type)
        inst_type = (
            institution.type.value if hasattr(institution.type, "value") else institution.type
        )
        if expected_type and inst_type != expected_type:
            raise ValueError(
                f"Institution type mismatch: expected {expected_type}, got {inst_type}"
            )
    return warnings


# ---------------------------------------------------------------------------
# IBAN helpers
# ---------------------------------------------------------------------------


def normalize_iban(iban: str) -> str:
    """Normalize IBAN by removing spaces and uppercasing."""
    from stdnum import iban as iban_mod

    return iban_mod.compact(iban).upper()


def validate_iban(iban: str) -> bool:
    """Validate IBAN format using python-stdnum."""
    from stdnum import iban as iban_mod

    try:
        iban_mod.validate(iban)
        return True
    except Exception:
        return False


async def check_iban_duplicate(
    session: AsyncSession,
    household_id: uuid.UUID,
    iban: str,
    exclude_account_id: int | None = None,
) -> list[dict]:
    """Check if IBAN is already in use. Returns list of warning dicts."""
    normalized = normalize_iban(iban)
    stmt = select(Account).where(
        and_(
            Account.household_id == household_id,
            Account.iban == normalized,
            Account.is_active.is_(True),
        )
    )
    if exclude_account_id:
        stmt = stmt.where(Account.id != exclude_account_id)
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        last4 = normalized[-4:]
        return [
            {
                "code": "DUPLICATE_IBAN",
                "message": f"Another account already uses IBAN ···{last4}",
            }
        ]
    return []


# ---------------------------------------------------------------------------
# Core CRUD
# ---------------------------------------------------------------------------


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
    """Create a new account. If opening_balance != 0, creates an Opening Balance transaction."""
    iban_value = normalize_iban(data.iban) if data.iban else data.iban
    account = Account(
        household_id=household_id,
        name=data.name,
        name_ar=data.name_ar,
        type=data.type,
        currency=data.currency,
        balance_minor=0,
        institution_id=data.institution_id,
        iban=iban_value,
        account_number=data.account_number,
        account_tier=data.account_tier,
        branch=data.branch,
        credit_limit=data.credit_limit,
        billing_cycle_day=data.billing_cycle_day,
        payment_due_day=data.payment_due_day,
        opened_at=data.opened_at,
    )
    session.add(account)
    await session.flush()

    # Create Opening Balance transaction if needed
    opening_balance = data.opening_balance
    if opening_balance != 0:
        from app.models.category import Category

        credit_types = {AccountType.CREDIT_CARD, AccountType.FINANCING_APP}
        amount = -opening_balance if data.type in credit_types else opening_balance

        ob_stmt = select(Category).where(
            and_(Category.name_en == "Opening Balance", Category.is_system.is_(True))
        )
        ob_category = (await session.execute(ob_stmt)).scalar_one_or_none()
        if ob_category is None:
            # System categories not yet seeded — fall back to balance_minor
            account.balance_minor = amount
            await session.flush()
            return account
        ob_date = data.opened_at or date_type.today()
        tx_type = "credit" if amount >= 0 else "debit"

        ob_tx = Transaction(
            household_id=household_id,
            account_id=account.id,
            date=ob_date,
            description="Opening balance",
            amount_minor=amount,
            currency=data.currency,
            type=tx_type,
            category_id=ob_category.id,
            applies_to_balance=True,
        )
        session.add(ob_tx)
        await session.flush()

    return account


async def update_account(
    session: AsyncSession,
    account: Account,
    data: AccountUpdate,
) -> Account:
    """Update account fields. Currency and type are immutable."""
    update_data = data.model_dump(exclude_unset=True)
    if "iban" in update_data and update_data["iban"]:
        update_data["iban"] = normalize_iban(update_data["iban"])
    for field, value in update_data.items():
        setattr(account, field, value)
    await session.flush()
    return account


async def soft_delete_account(
    session: AsyncSession,
    account: Account,
) -> None:
    """Soft delete an account and all its transactions (including splits)."""
    from app.models.transaction import Transaction, TransactionSplit

    # Soft-delete all transactions belonging to this account
    tx_ids_stmt = select(Transaction.id).where(
        Transaction.account_id == account.id,
        Transaction.is_active == True,  # noqa: E712
    )
    tx_ids = (await session.execute(tx_ids_stmt)).scalars().all()

    if tx_ids:
        # Soft-delete splits first
        await session.execute(
            update(TransactionSplit)
            .where(
                TransactionSplit.transaction_id.in_(tx_ids),
                TransactionSplit.is_active == True,  # noqa: E712
            )
            .values(is_active=False)
        )
        # Soft-delete transactions
        await session.execute(
            update(Transaction)
            .where(
                Transaction.id.in_(tx_ids),
            )
            .values(is_active=False)
        )

    account.is_active = False
    await session.flush()


# ---------------------------------------------------------------------------
# Balance computation
# ---------------------------------------------------------------------------


async def compute_displayed_balance(
    session: AsyncSession,
    account: Account,
) -> int:
    """Balance = balance_minor (seed/transfer adjustments) + SUM of active transactions.

    NOTE: balance_minor is still used by the transfer service and as a fallback
    when system categories are not yet seeded. Once transfers are migrated to
    use applies_to_balance=True, balance_minor can be removed from this calc.
    """
    cutoff_date = get_balance_cutoff_date(account)
    filters = [
        Transaction.account_id == account.id,
        Transaction.household_id == account.household_id,
        Transaction.is_active.is_(True),
        Transaction.applies_to_balance.is_(True),
    ]
    if cutoff_date is not None:
        filters.append(Transaction.date >= cutoff_date)

    stmt = select(func.coalesce(func.sum(Transaction.amount_minor), 0)).where(and_(*filters))
    result = await session.execute(stmt)
    tx_sum = result.scalar_one()
    return account.balance_minor + tx_sum


async def compute_displayed_balances_batch(
    session: AsyncSession,
    accounts: list[Account],
) -> dict[int, int]:
    """Batch compute displayed balances for all accounts in one query.

    Handles per-account cutoff dates (e.g. opened_at) via grouped queries.
    Returns dict mapping account.id -> displayed balance in minor units.
    """
    if not accounts:
        return {}

    # Group accounts by cutoff date
    cutoffs: dict[date_type | None, list[int]] = {}
    for acct in accounts:
        cutoff = get_balance_cutoff_date(acct)
        cutoffs.setdefault(cutoff, []).append(acct.id)

    # Build one query per cutoff group (usually 1-2 groups: None + one date)
    tx_sums: dict[int, int] = {}
    for cutoff_date, ids in cutoffs.items():
        conditions = [
            Transaction.account_id.in_(ids),
            Transaction.is_active.is_(True),
            Transaction.applies_to_balance.is_(True),
        ]
        if cutoff_date is not None:
            conditions.append(Transaction.date >= cutoff_date)

        stmt = (
            select(
                Transaction.account_id,
                func.coalesce(func.sum(Transaction.amount_minor), 0).label("tx_sum"),
            )
            .where(and_(*conditions))
            .group_by(Transaction.account_id)
        )
        result = await session.execute(stmt)
        for row in result:
            tx_sums[row.account_id] = int(row.tx_sum)

    return {a.id: a.balance_minor + tx_sums.get(a.id, 0) for a in accounts}


async def compute_net_worth(
    session: AsyncSession,
    household_id: uuid.UUID,
) -> dict:
    """Compute net worth across all active accounts. Uses a single bulk query."""
    accounts, _ = await list_accounts(session, household_id, page=1, page_size=1000)

    # Single aggregate query for all accounts — balance is purely transaction-based now
    acct_ids = [a.id for a in accounts]
    tx_sums: dict[int, int] = {}
    if acct_ids:
        rows = await session.execute(
            select(
                Transaction.account_id,
                func.coalesce(func.sum(Transaction.amount_minor), 0).label("tx_sum"),
            )
            .where(
                Transaction.household_id == household_id,
                Transaction.is_active.is_(True),
                Transaction.applies_to_balance.is_(True),
                Transaction.account_id.in_(acct_ids),
            )
            .group_by(Transaction.account_id)
        )
        tx_sums = {row.account_id: int(row.tx_sum) for row in rows}

    by_currency: dict[str, int] = {}
    for acct in accounts:
        bal = acct.balance_minor + tx_sums.get(acct.id, 0)
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


# ---------------------------------------------------------------------------
# Reconciliation
# ---------------------------------------------------------------------------


async def reconcile_account(
    session: AsyncSession,
    household_id: uuid.UUID,
    account: Account,
    actual_balance: int,
    reconciliation_date: date_type | None = None,
    notes: str | None = None,
) -> dict:
    """Reconcile: create a Reconciliation Adjustment transaction + record.

    Returns dict with status, adjustment, and IDs.
    """
    from app.models.category import Category
    from app.models.reconciliation_record import ReconciliationRecord

    recon_date = reconciliation_date or date_type.today()
    displayed = await compute_displayed_balance(session, account)
    adjustment = actual_balance - displayed

    if adjustment == 0:
        return {"status": "balanced", "adjustment": 0}

    ra_stmt = select(Category).where(
        and_(Category.name_en == "Reconciliation Adjustment", Category.is_system.is_(True))
    )
    ra_category = (await session.execute(ra_stmt)).scalar_one_or_none()
    if ra_category is None:
        # System categories not yet seeded — fall back to direct balance_minor adjustment
        account.balance_minor += adjustment
        await session.flush()
        return {"status": "adjusted", "adjustment": adjustment}

    tx_type = "credit" if adjustment >= 0 else "debit"

    tx = Transaction(
        household_id=household_id,
        account_id=account.id,
        date=recon_date,
        description="Reconciliation adjustment",
        amount_minor=adjustment,
        currency=account.currency,
        type=tx_type,
        category_id=ra_category.id,
        applies_to_balance=True,
    )
    session.add(tx)
    await session.flush()

    record = ReconciliationRecord(
        household_id=household_id,
        account_id=account.id,
        transaction_id=tx.id,
        expected_balance_minor=displayed,
        actual_balance_minor=actual_balance,
        adjustment_minor=adjustment,
        reconciliation_date=recon_date,
        notes=notes,
    )
    session.add(record)
    await session.flush()

    return {
        "status": "adjusted",
        "adjustment": adjustment,
        "transaction_id": tx.id,
        "reconciliation_record_id": record.id,
    }


# ---------------------------------------------------------------------------
# List accounts with stats (batch queries for router)
# ---------------------------------------------------------------------------


async def list_accounts_with_stats(
    session: AsyncSession,
    household_id: uuid.UUID,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[dict], int]:
    """List accounts with balance, last tx date, monthly stats, and institution.

    Performs all batch queries in the service layer so the router stays thin.
    Returns (list of account response dicts, total count).
    """
    accounts, total = await list_accounts(session, household_id, page, page_size)

    acct_ids = [a.id for a in accounts]

    # Batch fetch last transaction date per account
    last_tx_map: dict[int, date_type] = {}
    if acct_ids:
        last_tx_stmt = (
            select(
                Transaction.account_id,
                func.max(Transaction.date).label("last_date"),
            )
            .where(
                Transaction.household_id == household_id,
                Transaction.is_active.is_(True),
                Transaction.account_id.in_(acct_ids),
            )
            .group_by(Transaction.account_id)
        )
        last_tx_result = await session.execute(last_tx_stmt)
        last_tx_map = {row.account_id: row.last_date for row in last_tx_result}

    # Batch fetch current month stats per account
    month_stats_map: dict[int, MonthlyStats] = {}
    if acct_ids:
        month_start = date_type.today().replace(day=1)
        month_stats_stmt = (
            select(
                Transaction.account_id,
                func.sum(
                    case(
                        (Transaction.amount_minor > 0, Transaction.amount_minor),
                        else_=0,
                    )
                ).label("income"),
                func.sum(
                    case(
                        (Transaction.amount_minor < 0, func.abs(Transaction.amount_minor)),
                        else_=0,
                    )
                ).label("expense"),
                func.count().label("tx_count"),
            )
            .where(
                Transaction.household_id == household_id,
                Transaction.is_active.is_(True),
                Transaction.account_id.in_(acct_ids),
                Transaction.date >= month_start,
                Transaction.applies_to_balance.is_(True),
            )
            .group_by(Transaction.account_id)
        )
        month_result = await session.execute(month_stats_stmt)
        for row in month_result:
            month_stats_map[row.account_id] = MonthlyStats(
                month_income_minor=int(row.income or 0),
                month_expense_minor=int(row.expense or 0),
                month_transaction_count=int(row.tx_count or 0),
            )

    # Batch preload institutions to avoid N+1 queries
    institution_map: dict[int, InstitutionEmbed] = {}
    inst_ids = {a.institution_id for a in accounts if a.institution_id is not None}
    if inst_ids:
        from app.models.financial_institution import FinancialInstitution

        inst_stmt = select(FinancialInstitution).where(FinancialInstitution.id.in_(inst_ids))
        inst_result = await session.execute(inst_stmt)
        for inst in inst_result.scalars():
            institution_map[inst.id] = InstitutionEmbed.model_validate(inst)

    # Batch balance computation
    balance_map = await compute_displayed_balances_batch(session, accounts)

    items = []
    for acct in accounts:
        displayed = balance_map.get(acct.id, 0)
        inst_embed = institution_map.get(acct.institution_id) if acct.institution_id else None
        item = _build_account_dict(
            acct,
            displayed,
            last_transaction_date=last_tx_map.get(acct.id),
            monthly_stats=month_stats_map.get(acct.id),
            institution_embed=inst_embed,
        )
        items.append(item)

    return items, total


async def get_account_detail(
    session: AsyncSession,
    household_id: uuid.UUID,
    account_id: int,
) -> dict | None:
    """Get a single account with full detail and balance.

    Returns None if account not found.
    """
    account = await get_account(session, household_id, account_id)
    if not account:
        return None
    displayed = await compute_displayed_balance(session, account)

    # Fetch institution if linked
    inst_embed: InstitutionEmbed | None = None
    if account.institution_id is not None:
        from app.services.financial_institution import get_institution_by_id

        inst = await get_institution_by_id(session, household_id, account.institution_id)
        if inst:
            inst_embed = InstitutionEmbed.model_validate(inst)

    return _build_account_dict(account, displayed, detail=True, institution_embed=inst_embed)


def _build_account_dict(
    account: Account,
    displayed_balance: int,
    last_transaction_date: "date_type | None" = None,
    monthly_stats: "MonthlyStats | None" = None,
    *,
    detail: bool = False,
    institution_embed: "InstitutionEmbed | None" = None,
) -> dict:
    """Build account response dict. Pure function, no DB access."""
    from app.schemas.account import AccountDetailResponse, AccountResponse

    iban_last4 = account.iban[-4:] if account.iban else None

    # SQLite stores enum values as plain strings; PostgreSQL returns AccountType enum instances
    acct_type = account.type
    type_str = acct_type.value if hasattr(acct_type, "value") else acct_type

    base_data = {
        "id": account.id,
        "name": account.name,
        "name_ar": account.name_ar,
        "type": type_str,
        "currency": account.currency,
        "displayed_balance_minor": displayed_balance,
        "institution": institution_embed,
        "iban_last4": iban_last4,
        "account_tier": account.account_tier,
        "credit_limit": account.credit_limit,
        "billing_cycle_day": account.billing_cycle_day,
        "payment_due_day": account.payment_due_day,
        "opened_at": account.opened_at,
        "is_active": account.is_active,
        "last_transaction_date": last_transaction_date,
        "monthly_stats": monthly_stats,
    }

    if detail:
        resp = AccountDetailResponse(
            **base_data,
            iban=account.iban,
            account_number=account.account_number,
            branch=account.branch,
        )
    else:
        resp = AccountResponse(**base_data)

    return resp.model_dump()


# ---------------------------------------------------------------------------
# Balance history
# ---------------------------------------------------------------------------


async def get_balance_history(
    session: AsyncSession,
    household_id: uuid.UUID,
    account_id: int,
    period: str = "month",
) -> dict:
    """Compute balance change over the current period for an account.

    Returns current balance, period-start balance, change amount, and direction.
    """
    account = await get_account(session, household_id, account_id)
    if account is None:
        return None  # type: ignore[return-value]

    today = datetime.now().date()
    if period == "year":
        period_start = today.replace(month=1, day=1)
    elif period == "quarter":
        q_start_month = ((today.month - 1) // 3) * 3 + 1
        period_start = today.replace(month=q_start_month, day=1)
    else:  # "month" (default)
        period_start = today.replace(day=1)

    displayed = await compute_displayed_balance(session, account)

    # Sum of transactions in the current period
    period_sum_q = select(func.coalesce(func.sum(Transaction.amount_minor), 0)).where(
        Transaction.account_id == account_id,
        Transaction.household_id == household_id,
        Transaction.is_active.is_(True),
        Transaction.applies_to_balance.is_(True),
        Transaction.date >= period_start,
        Transaction.date <= today,
    )
    period_sum: int = (await session.execute(period_sum_q)).scalar_one()

    period_start_balance = displayed - period_sum
    change = displayed - period_start_balance  # == period_sum

    if change > 0:
        change_direction = "up"
    elif change < 0:
        change_direction = "down"
    else:
        change_direction = "unchanged"

    return {
        "account_id": account_id,
        "current_balance": displayed,
        "period_start_balance": period_start_balance,
        "change": change,
        "change_direction": change_direction,
        "period": period,
        "period_start": period_start.isoformat(),
        "period_end": today.isoformat(),
    }
